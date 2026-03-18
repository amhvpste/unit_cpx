// Основна гра тактичної симуляції на Three.js
class AdmiralGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadow;
        
        document.getElementById('gameCanvas').appendChild(this.renderer.domElement);
        
        // Ігрові параметри
        this.gridSize = 10;
        this.cellSize = 2;
        this.grid = [];
        this.units = [];
        this.selectedUnit = null;
        this.selectedCell = null;
        
        // Стани гри
        this.currentPlayer = 1;
        this.phase = 'shop'; // 'shop', 'placement', 'battle', 'gameOver'
        this.playerMoney = { 1: 1000, 2: 1000 };
        this.playerMoves = { 1: 3, 2: 3 };
        this.placementPhase = { 1: false, 2: false };
        this.losses = { 1: 0, 2: 0 };
        this.turnNumber = 1;
        this.battleAnimations = [];
        this.isAnimatingBattles = false;
        this.purchasedUnits = { 1: [], 2: [] };
        
        // Керування камерою
        this.cameraDistance = 15;
        this.cameraAngle = 0;
        this.cameraHeight = 20;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        // Освітлення
        this.setupLighting();
                color: 0x1565C0 
            },
            artillery: { 
                name: 'Артилерія', 
                symbol: '◯', 
                strength: 3, 
                movement: 1,
                color: 0xC62828 
            },
            command: { 
                name: 'Командний центр', 
                symbol: '◇', 
                strength: 4, 
                movement: 0,
                color: 0x6A1B9A 
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.createGrid();
        this.setupEventListeners();
        this.updateUI();
        this.animate();
        
        this.addLog('Гру розпочато! Гравець 1 розміщує фішки.', 'place-log');
    }
    
    loadConfig() {
        // Завантаження конфігурації з файлу
        fetch('config.json')
            .then(response => response.json())
            .then(config => {
                this.config = config;
                this.gridSize = config.gameSettings.gridSize;
                this.playerMoney = { 
                    1: config.gameSettings.startingMoney, 
                    2: config.gameSettings.startingMoney 
                };
                console.log('Конфігурація завантажена:', config);
            })
            .catch(error => {
                console.error('Помилка завантаження конфігурації:', error);
                // Значення за замовчуванням
                this.config = {
                    unitTypes: {
                        infantry: { name: "Піхотинець", cost: 100, hitpoints: 2, strength: 2, movement: 1 },
                        armor: { name: "Танк", cost: 250, hitpoints: 4, strength: 4, movement: 1 },
                        artillery: { name: "Артилерія", cost: 200, hitpoints: 3, strength: 3, movement: 1 },
                        command: { name: "Командир", cost: 300, hitpoints: 2, strength: 2, movement: 1 }
                    },
                    gameSettings: {
                        startingMoney: 1000,
                        maxUnitCost: 300
                    }
                };
            });
    }
        
        // Параметри камери для керування мишею
        this.cameraDistance = 25;
        this.cameraAngle = 0;
        this.cameraHeight = 20;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Освітлення
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        
        // Основна поверхня з текстурою
        const groundGeometry = new THREE.PlaneGeometry(this.gridSize * this.cellSize + 2, this.gridSize * this.cellSize + 2);
        const textureLoader = new THREE.TextureLoader();
        
        // Завантаження текстури testmap1.png для локального файлу
        const imageUrl = 'testmap1.png';
        console.log('Спроба завантажити:', imageUrl);
        
        textureLoader.load(imageUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);
            
            const groundMaterial = new THREE.MeshLambertMaterial({ 
                map: texture,
                transparent: false,
                opacity: 1.0
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.15; // Опускаємо трохи нижче
            ground.receiveShadow = true;
            this.scene.add(ground);
            
            this.addLog('Карту успішно завантажено', 'place-log');
        }, (progress) => {
            console.log('Прогрес завантаження:', progress);
        }, (error) => {
            console.error('Помилка завантаження текстури:', error);
            this.addLog('Не вдалося завантажити testmap1.png', 'combat-log');
            this.addLog('Можливо потрібно запустити через веб-сервер', 'combat-log');
            
            // Створюємо просту текстуру як запасний варіант
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext('2d');
            
            // Створюємо градієнт як фон
            const gradient = context.createLinearGradient(0, 0, 512, 512);
            gradient.addColorStop(0, '#8B7355');
            gradient.addColorStop(1, '#6B5D4F');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 512, 512);
            
            // Додаємо сітку
            context.strokeStyle = '#4A3F36';
            context.lineWidth = 1;
            for (let i = 0; i <= 10; i++) {
                const pos = i * 51.2;
                context.beginPath();
                context.moveTo(pos, 0);
                context.lineTo(pos, 512);
                context.stroke();
                
                context.beginPath();
                context.moveTo(0, pos);
                context.lineTo(512, pos);
                context.stroke();
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            const groundMaterial = new THREE.MeshLambertMaterial({ 
                map: texture,
                transparent: false,
                opacity: 1.0
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.15;
            ground.receiveShadow = true;
            this.scene.add(ground);
            
            this.addLog('Створено запасну текстуру карти', 'move-log');
        });
    }
    
    createGrid() {
        // Створення тактичної сітки
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                // Клітинка сітки - максимально прозора
                const cellGeometry = new THREE.BoxGeometry(this.cellSize * 0.9, 0.05, this.cellSize * 0.9);
                const cellMaterial = new THREE.MeshLambertMaterial({ 
                    color: (x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A,
                    transparent: true,
                    opacity: 0.1
                });
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(
                    x * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
                    0,
                    z * this.cellSize - (this.gridSize - 1) * this.cellSize / 2
                );
                cell.receiveShadow = true;
                cell.userData = { x, z, type: 'cell' };
                this.scene.add(cell);
                
                this.grid[x][z] = {
                    mesh: cell,
                    unit: null,
                    x: x,
                    z: z
                };
                
                // Лінії сітки - більш видимі
                const edges = new THREE.EdgesGeometry(cellGeometry);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xFFFFFF, 
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.6
                });
                const wireframe = new THREE.LineSegments(edges, lineMaterial);
                cell.add(wireframe);
            }
        }
    }
    
    createUnit(type, player, x, z) {
        const unitType = this.unitTypes[type];
        const group = new THREE.Group();
        
        // Основна фішка - непрозора
        const baseGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 8);
        const baseMaterial = new THREE.MeshPhongMaterial({ 
            color: player === 1 ? 0x4CAF50 : 0xFF9800,
            transparent: false,
            opacity: 1.0,
            shininess: 100
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // NATO символ - непрозорий
        const symbolGeometry = this.createNATOSymbol(unitType.symbol);
        const symbolMaterial = new THREE.MeshPhongMaterial({ 
            color: unitType.color,
            transparent: false,
            opacity: 1.0,
            shininess: 50
        });
        const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
        symbol.position.y = 0.16;
        symbol.castShadow = true;
        group.add(symbol);
        
        // Направляючий індикатор - непрозорий
        const indicatorGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
        const indicatorMaterial = new THREE.MeshPhongMaterial({ 
            color: player === 1 ? 0x2E7D32 : 0xE65100,
            transparent: false,
            opacity: 1.0,
            shininess: 100
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.y = 0.4;
        indicator.rotation.x = Math.PI;
        indicator.castShadow = true;
        group.add(indicator);
        
        group.position.set(
            x * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
            0.2,
            z * this.cellSize - (this.gridSize - 1) * this.cellSize / 2
        );
        
        group.userData = {
            type: type,
            player: player,
            strength: unitType.strength,
            movement: unitType.movement,
            moved: false,
            x: x,
            z: z,
            name: unitType.name
        };
        
        this.scene.add(group);
        this.units.push(group);
        this.grid[x][z].unit = group;
        
        return group;
    }
    
    createNATOSymbol(symbol) {
        let geometry;
        
        switch(symbol) {
            case 'X': // Піхота
                geometry = new THREE.BoxGeometry(0.4, 0.05, 0.4);
                break;
            case '□': // Бронетехніка
                geometry = new THREE.BoxGeometry(0.5, 0.05, 0.3);
                break;
            case '◯': // Артилерія
                geometry = new THREE.TorusGeometry(0.25, 0.05, 8, 16);
                break;
            case '◇': // Командний центр
                geometry = new THREE.OctahedronGeometry(0.2);
                break;
            default:
                geometry = new THREE.SphereGeometry(0.2, 8, 8);
        }
        
        return geometry;
    }
    
    setupEventListeners() {
        // Мишка - тільки для взаємодії з фішками
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        });
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            this.onMouseDown(event);
        });
        
        this.renderer.domElement.addEventListener('mouseup', (event) => {
            this.onMouseUp(event);
        });
        
        this.renderer.domElement.addEventListener('wheel', (event) => {
            this.onMouseWheel(event);
        });
        
        this.renderer.domElement.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });
        
        // Запобігання контекстному меню при натисканні колеса
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Кнопки керування грою
        document.getElementById('endTurnBtn').addEventListener('click', () => {
            this.endTurn();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Вікно
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Рух камери тільки при натиснутому колесі
        if (this.isDragging) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;
            
            this.cameraAngle += deltaX * 0.01;
            this.cameraHeight = Math.max(5, Math.min(40, this.cameraHeight - deltaY * 0.1));
            
            this.updateCameraPosition();
            
            this.previousMousePosition = { x: event.clientX, y: event.clientY };
            return; // Не обробляємо підсвічування при русі камери
        }
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Завжди скидаємо попереднє підсвічування при русі миші
        if (this.selectedCell) {
            const isSelectedUnitCell = this.selectedUnit && 
                this.selectedCell.userData.x === this.selectedUnit.userData.x && 
                this.selectedCell.userData.z === this.selectedUnit.userData.z;
            
            if (!isSelectedUnitCell) {
                this.selectedCell.material.color.setHex((this.selectedCell.userData.x + this.selectedCell.userData.z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
                this.selectedCell.material.opacity = 0.1;
                this.selectedCell = null;
            }
        }
        
        // НЕ скидаємо підсвітку можливих ходів якщо є вибрана фішка
        if (!this.selectedUnit) {
            this.clearMovementHighlights();
        }
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // Пошук клітинки або фішки
            let targetObject = object;
            while (targetObject.parent && !targetObject.userData.type && !targetObject.userData.player) {
                targetObject = targetObject.parent;
            }
            
            if (targetObject.userData.type === 'cell') {
                // Підсвічування тільки в фазі розміщення
                if (this.phase === 'placement') {
                    this.selectedCell = targetObject;
                    targetObject.material.color.setHex(0xFFD700); // Яскраво-золотий колір
                    targetObject.material.opacity = 0.4; // Більш яскраве підсвічування
                }
            } else if (targetObject.userData.player) {
                // Якщо наводимо на фішку, підсвітити її клітинку
                const unitX = targetObject.userData.x;
                const unitZ = targetObject.userData.z;
                const cell = this.grid[unitX][unitZ].mesh;
                
                if (cell) {
                    this.selectedCell = cell;
                    cell.material.color.setHex(0xFF6B35); // Яскраво-помаранчевий
                    cell.material.opacity = 0.5; // Ще яскравіше для фішки
                }
                
                // Показати можливі ходи для фішки поточного гравця
                if (targetObject.userData.player === this.currentPlayer && !targetObject.userData.moved) {
                    this.showMovementHighlights(targetObject);
                }
                
                // Показати інформацію про фішку
                this.showUnitInfo(targetObject);
            }
        } else {
            // Якщо нічого не наведено, скидаємо попереднє підсвічування
            if (this.selectedCell) {
                const isSelectedUnitCell = this.selectedUnit && 
                    this.selectedCell.userData.x === this.selectedUnit.userData.x && 
                    this.selectedCell.userData.z === this.selectedUnit.userData.z;
                
                if (!isSelectedUnitCell) {
                    this.selectedCell.material.color.setHex((this.selectedCell.userData.x + this.selectedCell.userData.z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
                    this.selectedCell.material.opacity = 0.1;
                    this.selectedCell = null;
                }
            }
            
            // Скидаємо інформацію про фішку
            this.hideUnitInfo();
            
            // Якщо нічого не наведено, скидаємо підсвітку ходів
            if (this.selectedUnit) {
                this.showMovementHighlights(this.selectedUnit); // Відновлюємо зелені клітинки
            }
        }
    }
    
    showUnitInfo(unit) {
        const unitType = unit.userData.type;
        const unitConfig = this.config.unitTypes[unitType];
        const isOwnUnit = unit.userData.player === this.currentPlayer;
        
        let infoText = `
            <div style="background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 5px; 
                        border: 2px solid ${isOwnUnit ? '#4CAF50' : '#ff6b6b'}; 
                        position: absolute; top: 10px; left: 50%; transform: translateX(-50%); 
                        z-index: 1000; min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: ${isOwnUnit ? '#4CAF50' : '#ff6b6b'};">
                    ${unitConfig.name} ${isOwnUnit ? '(Ваша)' : '(Ворожа)'}
                </h4>
                <div><strong>Гравець:</strong> ${unit.userData.player}</div>
                <div><strong>Ціна:</strong> ${unitConfig.cost} монет</div>
                <div><strong>Хітпоінти:</strong> ${unitConfig.hitpoints}</div>
                <div><strong>Сила:</strong> ${unitConfig.strength}</div>
                <div><strong>Швидкість:</strong> ${unitConfig.movement} клітинок</div>
                <div><strong>Опис:</strong> ${unitConfig.description}</div>
                ${isOwnUnit && unit.userData.moved ? '<div style="color: #ff9800;"><strong>Статус:</strong> Уже ходив</div>' : ''}
            </div>
        `;
        
        // Створюємо або оновлюємо елемент інформації
        let infoElement = document.getElementById('unitInfoTooltip');
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'unitInfoTooltip';
            document.body.appendChild(infoElement);
        }
        
        infoElement.innerHTML = infoText;
        infoElement.style.display = 'block';
    }
    
    hideUnitInfo() {
        const infoElement = document.getElementById('unitInfoTooltip');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }
    
    onMouseDown(event) {
        if (event.button === 1) { // Середня кнопка (колесо)
            event.preventDefault();
            this.isDragging = true;
            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }
    
    onMouseUp(event) {
        if (event.button === 1) { // Середня кнопка (колесо)
            this.isDragging = false;
        }
    }
    
    onMouseWheel(event) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 1 : -1;
        
        // Змінюємо FOV для наближення камери, а не відстань
        const currentFOV = this.camera.fov;
        const newFOV = Math.max(30, Math.min(90, currentFOV + delta * 5));
        this.camera.fov = newFOV;
        this.camera.updateProjectionMatrix();
        
        this.addLog(`Зум: ${Math.round(newFOV)}°`, 'move-log');
    }
    
    showMovementHighlights(unit) {
        const x = unit.userData.x;
        const z = unit.userData.z;
        
        // Показати можливі ходи на 1 клітинку навколо
        const neighbors = [
            { dx: -1, dz: 0 }, { dx: 1, dz: 0 },
            { dx: 0, dz: -1 }, { dx: 0, dz: 1 }
        ];
        
        neighbors.forEach(({ dx, dz }) => {
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx >= 0 && nx < this.gridSize && nz >= 0 && nz < this.gridSize) {
                const cell = this.grid[nx][nz].mesh;
                
                // Перевіряємо чи клітинка вільна або там ворожа фішка
                if (!this.grid[nx][nz].unit || this.grid[nx][nz].unit.userData.player !== unit.userData.player) {
                    cell.material.color.setHex(0x00FF00); // Зелений для можливих ходів
                    cell.material.opacity = 0.3;
                }
            }
        });
    }
    
    clearMovementHighlights() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const cell = this.grid[x][z].mesh;
                // Скидаємо тільки зелені підсвічування ходів
                if (cell.material.color.getHex() === 0x00FF00) {
                    cell.material.color.setHex((x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
                    cell.material.opacity = 0.1;
                }
            }
        }
    }
    
    onMouseClick(event) {
        // Ігноруємо кліки при русі камери
        if (this.isDragging) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // Пошук клітинки або фішки
            let targetObject = object;
            while (targetObject.parent && !targetObject.userData.type && !targetObject.userData.player) {
                targetObject = targetObject.parent;
            }
            
            const userData = targetObject.userData;
            
            if (userData.type === 'cell') {
                this.handleCellClick(userData.x, userData.z);
            } else if (userData.player) {
                // Шукаємо батьківський group для фішки
                let unitGroup = targetObject;
                while (unitGroup.parent && !unitGroup.userData.strength) {
                    unitGroup = unitGroup.parent;
                }
                this.handleUnitClick(unitGroup);
            }
        } else {
            // Якщо клікнули в пусте місце - знімаємо вибір
            if (this.selectedUnit) {
                this.selectedUnit.children[0].material.emissive = new THREE.Color(0x000000);
                this.selectedUnit = null;
                this.clearMovementHighlights();
                this.addLog('Вибір фішки знято', 'move-log');
            }
        }
    }
    
    handleCellClick(x, z) {
        if (this.phase === 'placement') {
            this.placeUnit(x, z);
        } else if (this.phase === 'battle' && this.selectedUnit) {
            // Перевіряємо чи це дозволена клітинка для руху
            const unitX = this.selectedUnit.userData.x;
            const unitZ = this.selectedUnit.userData.z;
            const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
            
            if (distance <= 1) {
                this.moveUnit(this.selectedUnit, x, z);
            } else {
                this.addLog('Занадто далеко! Можна рухатися тільки на 1 клітинку.', 'combat-log');
            }
        } else if (this.phase === 'battle' && !this.selectedUnit) {
            this.addLog('Спочатку виберіть фішку для руху', 'combat-log');
        }
    }
    
    handleUnitClick(unit) {
        if (this.phase === 'battle' && unit.userData.player === this.currentPlayer && !unit.userData.moved) {
            // Якщо клікаємо на вже вибрану фішку - знімаємо вибір
            if (this.selectedUnit === unit) {
                unit.children[0].material.emissive = new THREE.Color(0x000000);
                this.selectedUnit = null;
                this.clearMovementHighlights();
                this.addLog('Вибір фішки знято', 'move-log');
                return;
            }
            
            // Скидаємо попередній вибір
            if (this.selectedUnit) {
                this.selectedUnit.children[0].material.emissive = new THREE.Color(0x000000);
            }
            
            // Виділяємо нову фішку
            this.selectedUnit = unit;
            unit.children[0].material.emissive = new THREE.Color(0x444444);
            
            this.addLog(`Вибрано: ${unit.userData.name}. Можливість руху: ${unit.userData.movement}`, 'move-log');
            
            // Показуємо можливі ходи
            this.showMovementHighlights(unit);
        } else if (this.phase === 'battle' && unit.userData.player === this.currentPlayer && unit.userData.moved) {
            this.addLog('Ця фішка вже рухалася в цьому ході!', 'combat-log');
        } else if (this.phase === 'battle' && unit.userData.player !== this.currentPlayer) {
            this.addLog('Ця фішка належить іншому гравцю!', 'combat-log');
        }
    }
    
    placeUnit(x, z) {
        if (this.phase !== 'placement') return;
        
        // Перевірка чи клітинка вільна
        if (this.grid[x][z].unit !== null) {
            this.addLog('Клітинка зайнята!', 'combat-log');
            return;
        }
        
        // Перевірка чи це зона розміщення для поточного гравця
        const validPlacement = this.currentPlayer === 1 ? z < 2 : z >= this.gridSize - 2;
        if (!validPlacement) {
            this.addLog('Розміщення дозволено тільки у вашій зоні!', 'combat-log');
            return;
        }
        
        // Перевірка чи є куплена фішка для розміщення
        const unplacedUnit = this.purchasedUnits[this.currentPlayer].find(u => !u.placed);
        if (!unplacedUnit) {
            this.addLog('Спочатку купіть фішку в магазині!', 'combat-log');
            return;
        }
        
        // Створення фішки
        const unit = this.createUnit(unplacedUnit.type, x, z, this.currentPlayer);
        
        // Оновлення сітки
        this.grid[x][z].unit = unit;
        this.units.push(unit);
        // Скидання вибору типу фішки
        this.selectedUnitType = null;
        
        // Перевірка завершення фази розміщення
        const totalUnits = this.availableUnits[this.currentPlayer].reduce((sum, u) => sum + u.count, 0);
        if (totalUnits === 0) {
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Гравець ${this.currentPlayer} завершив розміщення фішок. Можна завершити хід.`, 'place-log');
        }
        
        this.updateUI();
    }
    
    moveUnit(unit, targetX, targetZ) {
        const startX = unit.userData.x;
        const startZ = unit.userData.z;
        
        // Перевірка можливості руху - тільки на 1 клітинку
        const distance = Math.abs(targetX - startX) + Math.abs(targetZ - startZ);
        if (distance > 1) {
            this.addLog('Можна рухатися тільки на 1 клітинку!', 'combat-log');
            return;
        }
        
        if (unit.userData.moved) {
            this.addLog('Ця фішка вже рухалася в цьому ході!', 'combat-log');
            return;
        }
        
        // Перевірка чи клітинка вільна
        if (this.grid[targetX][targetZ].unit !== null) {
            const targetUnit = this.grid[targetX][targetZ].unit;
            
            if (targetUnit.userData.player === unit.userData.player) {
                this.addLog('Неможливо переміститися на фішку свого гравця!', 'combat-log');
                return;
            }
            
            // Бій!
            this.combat(unit, targetUnit, targetX, targetZ);
        } else {
            // Простий рух
            this.grid[startX][startZ].unit = null;
            unit.position.set(
                targetX * this.cellSize - (this.gridSize - 1) * this.cellSize / 2,
                0.2,
                targetZ * this.cellSize - (this.gridSize - 1) * this.cellSize / 2
            );
            unit.userData.x = targetX;
            unit.userData.z = targetZ;
            unit.userData.moved = true;
            this.grid[targetX][targetZ].unit = unit;
            
            this.addLog(`${unit.userData.name} перемістився на (${targetX}, ${targetZ})`, 'move-log');
        }
        
        // Скидання виділення
        unit.children[0].material.emissive = new THREE.Color(0x000000);
        this.selectedUnit = null;
        this.clearMovementHighlights();
        
        this.updateUI();
    }
    
    startBattleAnimations() {
        if (this.isAnimatingBattles) return;
        
        this.isAnimatingBattles = true;
        document.getElementById('endTurnBtn').disabled = true;
        this.addLog('Аналіз бойових зіткнень...', 'combat-log');
        
        // Знаходимо всі бої
        this.battleAnimations = [];
        const battles = [];
        
        this.units.forEach(unit => {
            const x = unit.userData.x;
            const z = unit.userData.z;
            
            // Перевірка сусідніх клітинок
            const neighbors = [
                { dx: -1, dz: 0 }, { dx: 1, dz: 0 },
                { dx: 0, dz: -1 }, { dx: 0, dz: 1 }
            ];
            
            neighbors.forEach(({ dx, dz }) => {
                const nx = x + dx;
                const nz = z + dz;
                
                if (nx >= 0 && nx < this.gridSize && nz >= 0 && nz < this.gridSize) {
                    const neighbor = this.grid[nx][nz].unit;
                    if (neighbor && neighbor.userData.player !== unit.userData.player) {
                        // Перевірка чи цей бій вже оброблено
                        const battleKey = `${Math.min(x, nx)}_${Math.min(z, nz)}_${Math.max(x, nx)}_${Math.max(z, nz)}`;
                        if (!battles.includes(battleKey)) {
                            battles.push(battleKey);
                            
                            // Визначаємо переможця
                            const strength1 = unit.userData.strength;
                            const strength2 = neighbor.userData.strength;
                            
                            let winner, loser;
                            if (strength1 > strength2) {
                                winner = unit;
                                loser = neighbor;
                            } else if (strength2 > strength1) {
                                winner = neighbor;
                                loser = unit;
                            } else {
                                // Нічия - обидва програють
                                loser = unit;
                                winner = neighbor; // Для анімації покажемо обидва
                            }
                            
                            this.battleAnimations.push({
                                unit1: unit,
                                unit2: neighbor,
                                winner: winner,
                                loser: loser,
                                strength1: strength1,
                                strength2: strength2,
                                isDraw: strength1 === strength2
                            });
                        }
                    }
                }
            });
        });
        
        if (this.battleAnimations.length === 0) {
            this.addLog('Бойових зіткнень немає', 'move-log');
            this.finishBattleAnimations();
        } else {
            this.addLog(`Знайдено ${this.battleAnimations.length} бойових зіткнень`, 'combat-log');
            this.animateNextBattle();
        }
    }
    
    animateNextBattle() {
        if (this.battleAnimations.length === 0) {
            this.finishBattleAnimations();
            return;
        }
        
        const battle = this.battleAnimations.shift();
        this.addLog(`Бій: ${battle.unit1.userData.name}(${battle.strength1}) проти ${battle.unit2.userData.name}(${battle.strength2})`, 'combat-log');
        
        // Створюємо вибух над фігурками
        this.createExplosion(battle.unit1);
        this.createExplosion(battle.unit2);
        
        // Затримка перед видаленням фішок
        setTimeout(() => {
            if (battle.isDraw) {
                // Нічия - видаляємо обидві
                this.addLog('Обидві фішки знищено в бою!', 'combat-log');
                this.losses[battle.unit1.userData.player]++;
                this.losses[battle.unit2.userData.player]++;
                this.removeUnit(battle.unit1);
                this.removeUnit(battle.unit2);
            } else {
                // Є переможець
                this.addLog(`${battle.winner.userData.name} переміг! ${battle.loser.userData.name} знищено.`, 'combat-log');
                this.losses[battle.loser.userData.player]++;
                this.removeUnit(battle.loser);
            }
            
            this.updateUI();
            this.checkVictory();
            
            // Анімація наступного бою
            setTimeout(() => {
                this.animateNextBattle();
            }, 500);
        }, 1500);
    }
    
    createExplosion(unit) {
        // Створюємо сферу вибуху
        const explosionGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF4500,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        
        // Позиція вибуху над фігуркою
        explosion.position.copy(unit.position);
        explosion.position.y += 1;
        
        this.scene.add(explosion);
        
        // Анімація вибуху
        let scale = 0.5;
        let opacity = 0.8;
        
        const animateExplosion = () => {
            scale += 0.1;
            opacity -= 0.05;
            
            explosion.scale.set(scale, scale, scale);
            explosion.material.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(explosion);
            }
        };
        
        animateExplosion();
    }
    
    finishBattleAnimations() {
        this.isAnimatingBattles = false;
        this.addLog('Бойові дії завершено', 'move-log');
        
        // Перевірка перемоги
        this.checkVictory();
        
        // Якщо гра не закінчена, продовжуємо
        if (this.phase === 'battle') {
            // Скидання рухів для всіх фішок поточного гравця
            this.units.filter(u => u.userData.player === this.currentPlayer).forEach(unit => {
                unit.userData.moved = false;
            });
            
            // Перехід ходу
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            
            // Збільшення номера ходу коли гравець 1 починає новий раунд
            if (this.currentPlayer === 1) {
                this.turnNumber++;
                this.addLog(`Раунд ${this.turnNumber} починається`, 'move-log');
            }
            
            this.selectedUnit = null;
            this.addLog(`Хід переходить до Гравця ${this.currentPlayer}`, 'move-log');
        }
        
        document.getElementById('endTurnBtn').disabled = false;
        this.updateUI();
    }
    
    resolveBattle(unit1, unit2) {
        const strength1 = unit1.userData.strength;
        const strength2 = unit2.userData.strength;
        
        this.addLog(`Бій: ${unit1.userData.name}(${strength1}) проти ${unit2.userData.name}(${strength2})`, 'combat-log');
        
        if (strength1 > strength2) {
            this.addLog(`${unit1.userData.name} переміг! ${unit2.userData.name} знищено.`, 'combat-log');
            this.losses[unit2.userData.player]++;
            this.removeUnit(unit2);
        } else if (strength2 > strength1) {
            this.addLog(`${unit2.userData.name} переміг! ${unit1.userData.name} знищено.`, 'combat-log');
            this.losses[unit1.userData.player]++;
            this.removeUnit(unit1);
        } else {
            this.addLog('Обидві фішки знищено в бою!', 'combat-log');
            this.losses[unit1.userData.player]++;
            this.losses[unit2.userData.player]++;
            this.removeUnit(unit1);
            this.removeUnit(unit2);
        }
        
        this.updateUI();
        this.checkVictory();
    }
    
    removeUnit(unit) {
        const index = this.units.indexOf(unit);
        if (index > -1) {
            this.units.splice(index, 1);
        }
        
        this.grid[unit.userData.x][unit.userData.z].unit = null;
        this.scene.remove(unit);
    }
    
    endTurn() {
        if (this.phase === 'shop') {
            // Перехід до фази розміщення
            this.startPlacement();
        } else if (this.phase === 'placement') {
            // Завершення розміщення для поточного гравця
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Гравець ${this.currentPlayer} завершив розміщення фішок. Можна завершити хід.`, 'place-log');
            
            // Перевіряємо чи обидва гравці завершили розміщення
            if (this.placementPhase[1] === false && this.placementPhase[2] === false) {
                this.phase = 'battle';
                this.addLog('Розміщення завершено! Починається фаза битви.', 'place-log');
            }
            
            // Перехід ходу до наступного гравця
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        } else if (this.phase === 'battle') {
            // Завершення ходу в фазі битви
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.addLog(`Гравець ${this.currentPlayer === 1 ? 2 : 1} завершив хід.`, 'move-log');
            
            // Перевіряємо чи обидва гравці завершили хід
            const player1Units = this.units.filter(u => u.userData.player === 1);
            const player2Units = this.units.filter(u => u.userData.player === 2);
            
            // Скидаємо рух для всіх фішок нового гравця
            player1Units.forEach(unit => {
                unit.userData.moved = false;
            });
            
            // Якщо обидва гравці завершили хід, запускаємо анімацію боїв
            if (this.allUnitsMoved()) {
                this.startBattleAnimations();
            }
        }
        
        this.updateUI();
    }
    
    checkVictory() {
        const player1Units = this.units.filter(u => u.userData.player === 1).length;
        const player2Units = this.units.filter(u => u.userData.player === 2).length;
        
        if (player1Units === 0) {
            this.phase = 'gameOver';
            this.addLog('🎉 Гравець 2 переміг! Усі фішки гравця 1 знищено!', 'combat-log');
            this.updateUI();
        } else if (player2Units === 0) {
            this.phase = 'gameOver';
            this.addLog('🎉 Гравець 1 переміг! Усі фішки гравця 2 знищено!', 'combat-log');
            this.updateUI();
        }
    }
    
    resetGame() {
        // Видалення всіх фішок
        this.units.forEach(unit => {
            this.scene.remove(unit);
        });
        this.units = [];
        
        // Очищення сітки
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                this.grid[x][z].unit = null;
            }
        }
        
        // Скидання станів гри
        this.currentPlayer = 1;
        this.phase = 'placement';
        this.playerMoves = { 1: 3, 2: 3 };
        this.placementPhase = { 1: true, 2: false };
        this.losses = { 1: 0, 2: 0 };
        this.turnNumber = 1;
        this.selectedUnit = null;
        this.battleAnimations = [];
        this.isAnimatingBattles = false;
        
        // Скидання доступних фішок
        this.availableUnits = {
            1: [
                { type: 'infantry', count: 2 },
                { type: 'armor', count: 1 },
                { type: 'artillery', count: 1 },
                { type: 'command', count: 1 }
            ],
            2: [
                { type: 'infantry', count: 2 },
                { type: 'armor', count: 1 },
                { type: 'artillery', count: 1 },
                { type: 'command', count: 1 }
            ]
        };
        
        // Очищення журналу
        document.getElementById('logContent').innerHTML = '';
        
        this.addLog('Гру скинуто. Починаємо нову гру!', 'place-log');
        this.updateUI();
        this.updateAvailableUnitsUI();
    }
    
    updateUI() {
        // Оновлення інформації про гравців
        const player1Units = this.units.filter(u => u.userData.player === 1).length;
        const player2Units = this.units.filter(u => u.userData.player === 2).length;
        
        document.getElementById('player1Units').textContent = player1Units;
        document.getElementById('player2Units').textContent = player2Units;
        document.getElementById('player1Moves').textContent = this.playerMoves[1];
        document.getElementById('player2Moves').textContent = this.playerMoves[2];
        document.getElementById('player1Losses').textContent = `Втрати: ${this.losses[1]}`;
        document.getElementById('player2Losses').textContent = `Втрати: ${this.losses[2]}`;
        
        // Оновлення грошей
        document.getElementById('player1Money').textContent = `${this.playerMoney[1]} монет`;
        document.getElementById('player2Money').textContent = `${this.playerMoney[2]} монет`;
        
        // Показуємо/ховаємо панелі залежно від фази
        if (this.phase === 'shop') {
            document.getElementById('player1Info').style.display = 'none';
            document.getElementById('player2Info').style.display = 'none';
            document.getElementById('unitShop').style.display = 'block';
            document.getElementById('centerInfo').style.display = 'none';
        } else if (this.phase === 'placement') {
            document.getElementById('player1Info').style.display = 'block';
            document.getElementById('player2Info').style.display = 'block';
            document.getElementById('unitShop').style.display = 'none';
            document.getElementById('centerInfo').style.display = 'block';
        } else if (this.phase === 'battle') {
            document.getElementById('player1Info').style.display = 'block';
            document.getElementById('player2Info').style.display = 'block';
            document.getElementById('unitShop').style.display = 'none';
            document.getElementById('centerInfo').style.display = 'block';
        } else {
            document.getElementById('player1Info').style.display = 'block';
            document.getElementById('player2Info').style.display = 'block';
            document.getElementById('unitShop').style.display = 'none';
            document.getElementById('centerInfo').style.display = 'block';
        }
        
        // Оновлення активного гравця (тільки візуальне підсвічування)
        if (this.phase !== 'shop') {
            document.getElementById('player1Info').classList.toggle('active-player', this.currentPlayer === 1);
            document.getElementById('player2Info').classList.toggle('active-player', this.currentPlayer === 2);
        }
        
        // Оновлення стану гри
        const phaseText = this.phase === 'shop' ? 'Магазин' : 
                         this.phase === 'placement' ? 'Розміщення фішок' : 
                         this.phase === 'battle' ? 'Битва' : 
                         this.phase === 'gameOver' ? 'Гру завершено' : 'Невідомий стан';
        document.getElementById('currentPhase').textContent = phaseText;
        
        // Оновлення центрової інформації про хід
        const currentTurnElement = document.getElementById('currentTurn');
        if (this.phase === 'gameOver') {
            currentTurnElement.textContent = 'Гру завершено!';
            currentTurnElement.style.color = '#ff6b6b';
        } else if (this.phase === 'shop') {
            currentTurnElement.textContent = `Гравець ${this.currentPlayer} купує фішки`;
            currentTurnElement.style.color = this.currentPlayer === 1 ? '#4CAF50' : '#FF9800';
        } else {
            currentTurnElement.textContent = `Ваш хід - Гравець ${this.currentPlayer}`;
            currentTurnElement.style.color = this.currentPlayer === 1 ? '#4CAF50' : '#FF9800';
        }
        document.getElementById('turnCount').textContent = `Хід №${this.turnNumber}`;
        
        // Оновлення магазину фішок
        this.updateShopUI();
        
        // Оновлення доступних фішок
        this.updateAvailableUnitsUI();
        
        // Оновлення кольорів кнопок
        this.updateButtonColors();
        
        // Кнопки - активні тільки в правильний час
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (this.phase === 'shop') {
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'Почати розміщення';
        } else if (this.phase === 'placement') {
            // В фазі розміщення кнопка активна тільки для поточного гравця
            endTurnBtn.disabled = !this.placementPhase[this.currentPlayer];
            endTurnBtn.textContent = 'Завершити розміщення';
        } else if (this.phase === 'battle') {
            // В фазі битви кнопка завжди активна
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'Завершити хід';
        } else if (this.phase === 'gameOver') {
            // В фазі завершення гри неактивна
            endTurnBtn.disabled = true;
            endTurnBtn.textContent = 'Гру завершено';
        } else {
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'Завершити хід';
        }
        
        // Відновлюємо підсвітку якщо є вибрана фішка
        if (this.selectedUnit) {
            const cell = this.grid[this.selectedUnit.userData.x][this.selectedUnit.userData.z].mesh;
            cell.material.color.setHex(0xFF6B35);
            cell.material.opacity = 0.5;
            this.showMovementHighlights(this.selectedUnit);
        }
    }
    
    updateShopUI() {
        if (!this.config || this.phase !== 'placement') {
            document.getElementById('shopContent').innerHTML = '';
            return;
        }
        
        const currentMoney = this.playerMoney[this.currentPlayer];
        const shopContent = document.getElementById('shopContent');
        
        let shopHTML = '';
        
        for (const [unitType, unitConfig] of Object.entries(this.config.unitTypes)) {
            const canAfford = currentMoney >= unitConfig.cost;
            const disabledClass = canAfford ? '' : 'disabled';
            
            shopHTML += `
                <div class="shop-item ${disabledClass}" onclick="game.purchaseUnit('${unitType}')">
                    <h5>${unitConfig.name}</h5>
                    <div class="details">
                        <div>Ціна: <span class="${canAfford ? 'cost' : 'cant-afford'}">${unitConfig.cost} монет</span></div>
                        <div>Хітпоінти: ${unitConfig.hitpoints}</div>
                        <div>Сила: ${unitConfig.strength}</div>
                        <div>Швидкість: ${unitConfig.movement} клітинок</div>
                        <div>${unitConfig.description}</div>
                    </div>
                </div>
            `;
        }
        
        shopContent.innerHTML = shopHTML;
    }
    
    purchaseUnit(unitType) {
        if (this.phase !== 'shop') return;
        
        const unitConfig = this.config.unitTypes[unitType];
        const currentMoney = this.playerMoney[this.currentPlayer];
        
        if (currentMoney < unitConfig.cost) {
            this.addLog('Недостатньо грошей для покупки цієї фішки!', 'combat-log');
            return;
        }
        
        // Віднімаємо гроші
        this.playerMoney[this.currentPlayer] -= unitConfig.cost;
        
        // Додаємо фішку до списку куплених
        this.purchasedUnits[this.currentPlayer].push({
            type: unitType,
            config: unitConfig,
            placed: false
        });
        
        this.addLog(`Куплено: ${unitConfig.name} за ${unitConfig.cost} монет`, 'place-log');
        this.updateUI();
    }
    
    startPlacement() {
        if (this.purchasedUnits[this.currentPlayer].length === 0) {
            this.addLog('Спочатку купіть хоча б одну фішку!', 'combat-log');
            return;
        }
        
        this.phase = 'placement';
        this.placementPhase[this.currentPlayer] = true;
        this.addLog(`Гравець ${this.currentPlayer} починає розміщення фішок`, 'place-log');
        this.updateUI();
    }
    
    updateButtonColors() {
        const endTurnBtn = document.getElementById('endTurnBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        // Кольори кнопок в залежності від гравця
        endTurnBtn.className = this.currentPlayer === 1 ? 'player1-btn' : 'player2-btn';
        resetBtn.className = 'neutral-btn';
    }
    
    updateAvailableUnitsUI() {
        const unitsContainer = document.getElementById('availableUnits');
        if (!unitsContainer) {
            this.createAvailableUnitsUI();
            return;
        }
        
        unitsContainer.innerHTML = '';
        
        if (this.phase === 'placement') {
            const title = document.createElement('h4');
            title.textContent = 'Доступні фішки:';
            title.style.margin = '10px 0 5px 0';
            unitsContainer.appendChild(title);
            
            this.availableUnits[this.currentPlayer].forEach(unitInfo => {
                const unitType = this.unitTypes[unitInfo.type];
                const button = document.createElement('button');
                button.textContent = `${unitType.name} (${unitInfo.count})`;
                button.disabled = unitInfo.count <= 0;
                button.className = this.currentPlayer === 1 ? 'player1-btn' : 'player2-btn';
                button.onclick = () => this.selectUnitType(unitInfo.type);
                
                if (this.selectedUnitType === unitInfo.type) {
                    button.style.opacity = '0.8';
                }
                
                unitsContainer.appendChild(button);
            });
        }
    }
    
    createAvailableUnitsUI() {
        const ui = document.getElementById('ui');
        const unitsContainer = document.createElement('div');
        unitsContainer.id = 'availableUnits';
        unitsContainer.style.marginTop = '10px';
        ui.appendChild(unitsContainer);
        this.updateAvailableUnitsUI();
    }
    
    selectUnitType(type) {
        this.selectedUnitType = type;
        this.updateAvailableUnitsUI();
        this.addLog(`Вибрано тип фішки: ${this.unitTypes[type].name}`, 'place-log');
    }
    
    addLog(message, className = '') {
        const logContent = document.getElementById('logContent');
        const entry = document.createElement('div');
        entry.className = `log-entry ${className}`;
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    // Функції керування камерою
    zoomCamera(direction) {
        this.cameraDistance = Math.max(10, Math.min(50, this.cameraDistance + direction * 5));
        this.updateCameraPosition();
        this.addLog(`Зум: ${this.cameraDistance}`, 'move-log');
    }
    
    rotateCamera(direction) {
        this.cameraAngle += direction * Math.PI / 8; // 22.5 градусів
        this.updateCameraPosition();
        this.addLog(`Поворот камери`, 'move-log');
    }
    
    resetCamera() {
        this.cameraDistance = 25;
        this.cameraAngle = 0;
        this.cameraHeight = 20;
        this.updateCameraPosition();
        this.addLog('Камеру скинуто', 'move-log');
    }
    
    updateCameraPosition() {
        const x = Math.cos(this.cameraAngle) * this.cameraDistance;
        const z = Math.sin(this.cameraAngle) * this.cameraDistance;
        
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, 0, 0);
    }
}

// Запуск гри
window.addEventListener('DOMContentLoaded', () => {
    new AdmiralGame();
});

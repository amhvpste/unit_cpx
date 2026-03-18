// Основна гра тактичної симуляції на Three.js
class AdmiralGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x718ea1);
        this.scene.fog = new THREE.FogExp2(0x7f9eb1, 0.03);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadow;
        this.renderer.setClearColor(0x000000, 0);
        
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
        this.battleEffects = [];
        this.isAnimatingBattles = false;
        this.purchasedUnits = { 1: [], 2: [] };
        this.movementAnimations = [];
        
        // Керування камерою
        this.cameraDistance = 15;
        this.cameraAngle = 0;
        this.cameraHeight = 20;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        // Події
        this.setupEventListeners();
        
        // Завантаження конфігурації
        this.loadConfig();
        
        // Освітлення
        this.setupLighting();
        
        // Створення сітки
        this.createGrid();
        
        // Створення поверхні
        this.createGround();
        
        // Камера
        this.updateCameraPosition();
        
        // UI
        this.updateUI();
        
        // Початок анімації
        this.animate();
    }
    
    loadConfig() {
        // Завантаження конфігурації з файлу
        const configRequest = fetch('config.json');
        configRequest.then((response) => response.json()).then((config) => {
                this.config = config;
                this.gridSize = config.gameSettings.gridSize;
                this.playerMoney = { 
                    1: config.gameSettings.startingMoney, 
                    2: config.gameSettings.startingMoney 
                };
                console.log('Конфігурація завантажена:', config);
                // Оновлюємо UI після завантаження конфігурації
                this.updateUI();
            }).catch((error) => {
                console.error('Помилка завантаження конфігурації:', error);
                // Значення за замовчуванням
                this.config = {
                    unitTypes: {
                        infantry: { name: "Піхотинець", cost: 100, hitpoints: 2, strength: 2, movement: 1, model: 'cube', description: 'Базова піхота' },
                        armor: { name: "Танк", cost: 250, hitpoints: 4, strength: 4, movement: 1, model: 'pyramid', description: 'Важка бронетехніка' },
                        artillery: { name: "Артилерія", cost: 200, hitpoints: 3, strength: 3, movement: 1, model: 'cylinder', description: 'Дальнобійна підтримка' },
                        command: { name: "Командир", cost: 300, hitpoints: 2, strength: 2, movement: 1, model: 'octahedron', description: 'Командний підрозділ' }
                    },
                    gameSettings: {
                        startingMoney: 1000,
                        maxUnitCost: 300
                    }
                };
                // Оновлюємо UI з конфігурацією за замовчуванням
                this.updateUI();
            });
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xdcebf5, 0.72);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xf3f8fb, 0.92);
        directionalLight.position.set(10, 20, 8);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0x8bb3ca, 0.28);
        fillLight.position.set(-12, 10, -6);
        this.scene.add(fillLight);
    }
    
    createGround() {
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
            context.lineWidth = 2;
            for (let i = 0; i <= 10; i++) {
                const pos = (i / 10) * 512;
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
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            const groundMaterial = new THREE.MeshLambertMaterial({ 
                map: texture,
                transparent: false,
                opacity: 1.0
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.x = this.getBoardCenterOffset();
            ground.position.z = this.getBoardCenterOffset();
            ground.position.y = -0.15;
            ground.receiveShadow = true;
            this.scene.add(ground);
        });
    }
    
    createGrid() {
        // Створення сітки
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                const cellGeometry = new THREE.BoxGeometry(this.cellSize, 0.1, this.cellSize);
                const cellMaterial = new THREE.MeshLambertMaterial({
                    color: (x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A,
                    transparent: true,
                    opacity: 0.1
                });
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(this.toWorldCoord(x), 0, this.toWorldCoord(z));
                cell.receiveShadow = true;
                cell.userData = { type: 'cell', x: x, z: z };
                
                this.scene.add(cell);
                this.grid[x][z] = { mesh: cell, unit: null };
            }
        }
        
        // Створення ліній сітки
        const gridHelper = new THREE.GridHelper(this.gridSize * this.cellSize, this.gridSize);
        gridHelper.position.x = this.getBoardCenterOffset();
        gridHelper.position.z = this.getBoardCenterOffset();
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);
    }
    
    setupEventListeners() {
        // Події миші
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.renderer.domElement.addEventListener('wheel', (event) => this.onMouseWheel(event));
        this.renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
        
        // Події вікна
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Кнопки керування грою
        document.getElementById('endTurnBtn').addEventListener('click', () => {
            this.endTurn();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
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
        const fov = this.camera.fov + event.deltaY * 0.05;
        this.camera.fov = Math.max(30, Math.min(90, fov));
        this.camera.updateProjectionMatrix();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onMouseClick(event) {
        if (this.isAnimatingBattles) return;
        
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
            const maxDistance = this.config.unitTypes[this.selectedUnit.userData.type].movement;
            
            if (distance <= maxDistance && this.grid[x][z].unit === null) {
                this.moveUnit(this.selectedUnit, x, z);
            } else if (distance > maxDistance) {
                this.addLog('Занадто далеко для цієї фішки!', 'combat-log');
            } else if (this.grid[x][z].unit !== null) {
                this.addLog('Клітинка зайнята!', 'combat-log');
            }
        }
    }
    
    handleUnitClick(unit) {
        if (this.phase === 'placement') {
            this.addLog('Неможливо вибрати фішку під час розміщення!', 'combat-log');
            return;
        }
        
        if (this.phase === 'battle' && unit.userData.player === this.currentPlayer && !unit.userData.moved) {
            this.selectUnit(unit);
        } else if (this.phase === 'battle' && unit.userData.player === this.currentPlayer && unit.userData.moved) {
            this.addLog('Ця фішка вже рухалася в цьому ході!', 'combat-log');
        } else if (this.phase === 'battle' && unit.userData.player !== this.currentPlayer) {
            this.addLog('Ця фішка належить іншому гравцю!', 'combat-log');
        }
    }
    
    selectUnit(unit) {
        // Скидаємо попередній вибір
        this.clearMovementHighlights();
        this.selectedUnit = unit;
        
        // Підсвічуємо клітинку фішки
        const cell = this.grid[unit.userData.x][unit.userData.z].mesh;
        cell.material.color.setHex(0xFF6B35);
        cell.material.opacity = 0.5;
        
        // Показуємо можливі ходи
        this.showMovementHighlights(unit);
        
        this.addLog(`Вибрано: ${this.config.unitTypes[unit.userData.type].name}`, 'move-log');
    }
    
    showMovementHighlights(unit) {
        this.clearMovementHighlights();
        
        const unitX = unit.userData.x;
        const unitZ = unit.userData.z;
        const maxDistance = this.config.unitTypes[unit.userData.type].movement;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
                if (distance <= maxDistance && this.grid[x][z].unit === null) {
                    const cell = this.grid[x][z].mesh;
                    cell.material.color.setHex(0x00FF00);
                    cell.material.opacity = 0.3;
                }
            }
        }
    }
    
    clearMovementHighlights() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const cell = this.grid[x][z].mesh;
                if (cell.material.color.getHex() === 0x00FF00) {
                    cell.material.color.setHex((x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
                    cell.material.opacity = 0.1;
                }
            }
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
        const validPlacement = true;
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
        
        // Маркуємо фішку як розміщену
        unplacedUnit.placed = true;
        
        this.addLog(`Гравець ${this.currentPlayer} розмістив ${unplacedUnit.config.name} на (${x}, ${z})`, 'place-log');
        
        this.updateUI();
    }
    
    createUnit(type, x, z, player) {
        const unitConfig = this.config.unitTypes[type];
        let geometry;
        
        switch (unitConfig.model) {
            case 'cube':
                geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(0.8, 1.6, 4);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.6, 0.6, 1.2);
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(0.8);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.6);
                break;
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(0.8);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        }
        
        const material = new THREE.MeshLambertMaterial({
            color: player === 1 ? 0x2E7D32 : 0xD32F2F
        });
        
        const unit = new THREE.Mesh(geometry, material);
        unit.position.set(this.toWorldCoord(x), 0.4, this.toWorldCoord(z));
        unit.castShadow = true;
        unit.receiveShadow = true;
        unit.userData = {
            type: type,
            player: player,
            x: x,
            z: z,
            moved: false,
            hitpoints: unitConfig.hitpoints,
            maxHitpoints: unitConfig.hitpoints,
            strength: unitConfig.strength
        };
        
        this.scene.add(unit);
        return unit;
    }
    
    moveUnit(unit, targetX, targetZ) {
        const oldX = unit.userData.x;
        const oldZ = unit.userData.z;
        
        // Оновлення сітки
        this.grid[oldX][oldZ].unit = null;
        this.grid[targetX][targetZ].unit = unit;
        
        // Оновлення позиції фішки
        unit.position.set(this.toWorldCoord(targetX), 0.4, this.toWorldCoord(targetZ));
        unit.userData.x = targetX;
        unit.userData.z = targetZ;
        unit.userData.moved = true;
        
        // Перевірка на бій
        const targetUnit = this.grid[targetX][targetZ].unit;
        if (targetUnit && targetUnit !== unit) {
            this.startBattle(unit, targetUnit);
        }
        
        this.clearMovementHighlights();
        this.selectUnit(unit);
    }
    
    startBattle(attacker, defender) {
        this.battleAnimations.push({
            attacker: attacker,
            defender: defender,
            startTime: Date.now()
        });
    }
    
    animateBattles() {
        if (this.battleAnimations.length === 0) {
            this.isAnimatingBattles = false;
            document.getElementById('endTurnBtn').disabled = false;
            this.updateUI();
            return;
        }
        
        const battle = this.battleAnimations[0];
        const elapsed = Date.now() - battle.startTime;
        
        if (elapsed > 1000) { // 1 секунда на бій
            this.resolveBattle(battle);
            this.battleAnimations.shift();
        }
        
        requestAnimationFrame(() => this.animateBattles());
    }
    
    resolveBattle(battle) {
        const attacker = battle.attacker;
        const defender = battle.defender;
        
        const attackerPower = attacker.userData.strength;
        const defenderPower = defender.userData.strength;
        
        let winner, loser;
        if (attackerPower > defenderPower) {
            winner = attacker;
            loser = defender;
        } else if (defenderPower > attackerPower) {
            winner = defender;
            loser = attacker;
        } else {
            // Нічия
            winner = null;
            loser = null;
        }
        
        if (winner && loser) {
            // Віднімаємо хітпоінти
            loser.userData.hitpoints -= winner.userData.strength;
            
            if (loser.userData.hitpoints <= 0) {
                // Видаляємо фішку
                this.removeUnit(loser);
                this.losses[loser.userData.player]++;
            } else {
                // Пошкоджуємо фішку
                loser.userData.hitpoints = Math.max(1, loser.userData.hitpoints);
            }
            
            this.addLog(`${winner.userData.player === 1 ? 'Гравець 1' : 'Гравець 2'} переміг у бою!`, 'combat-log');
        } else {
            this.addLog('Бій завершився внічию!', 'combat-log');
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
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Player ${this.currentPlayer} finished placement.`, 'place-log');

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.phase = 'shop';
                this.addLog('Player 2 now buys units.', 'place-log');
            } else {
                this.phase = 'battle';
                this.currentPlayer = 1;
                this.units.forEach((unit) => {
                    unit.userData.moved = false;
                });
                this.addLog('Placement is over. Battle begins.', 'place-log');
            }

            this.updateUI();
            return;
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
            const finishedPlayer = this.currentPlayer;
            this.addLog(`Player ${finishedPlayer} finished the turn.`, 'move-log');
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.units
                .filter((unit) => unit.userData.player === this.currentPlayer)
                .forEach((unit) => {
                    unit.userData.moved = false;
                });
            this.updateUI();
            return;
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
    
    startPlacement() {
        const unplacedUnits = this.purchasedUnits[this.currentPlayer].filter((unit) => !unit.placed);
        if (unplacedUnits.length === 0) {
            this.addLog('Buy at least one unit before placement.', 'combat-log');
            return;
        }

        this.phase = 'placement';
        this.placementPhase[this.currentPlayer] = true;
        this.addLog(`Player ${this.currentPlayer} starts placement. Left to place: ${unplacedUnits.length}`, 'place-log');
        this.updateUI();
        return;
        if (this.purchasedUnits[this.currentPlayer].length === 0) {
            this.addLog('Спочатку купіть хоча б одну фішку!', 'combat-log');
            return;
        }
        
        this.phase = 'placement';
        this.placementPhase[this.currentPlayer] = true;
        this.addLog(`Гравець ${this.currentPlayer} починає розміщення фішок`, 'place-log');
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
        this.phase = 'shop';
        this.playerMoney = { 1: 1000, 2: 1000 };
        this.playerMoves = { 1: 3, 2: 3 };
        this.placementPhase = { 1: false, 2: false };
        this.losses = { 1: 0, 2: 0 };
        this.turnNumber = 1;
        this.battleAnimations = [];
        this.isAnimatingBattles = false;
        this.purchasedUnits = { 1: [], 2: [] };
        this.selectedUnit = null;
        this.selectedCell = null;
        
        // Очищення журналу
        document.getElementById('logContent').innerHTML = '';
        
        this.addLog('Гру скинуто! Гравець 1 купує фішки.', 'place-log');
        this.updateUI();
    }
    
    getBoardCenterOffset() {
        return 0;
    }

    toWorldCoord(index) {
        return index * this.cellSize - ((this.gridSize - 1) * this.cellSize) / 2;
    }

    updateCameraPosition() {
        const x = Math.cos(this.cameraAngle) * this.cameraDistance;
        const z = Math.sin(this.cameraAngle) * this.cameraDistance;
        
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, 0, 0);
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
            document.getElementById('player1Info').style.display = 'block';
            document.getElementById('player2Info').style.display = 'block';
            document.getElementById('unitShop').style.display = 'block';
            document.getElementById('centerInfo').style.display = 'block';
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
        const shopCurrentPlayer = document.getElementById('shopCurrentPlayer');
        const shopMoneyInfo = document.getElementById('shopMoneyInfo');
        if (shopCurrentPlayer) {
            shopCurrentPlayer.textContent = `Гравець ${this.currentPlayer} купує фішки`;
        }
        if (shopMoneyInfo) {
            shopMoneyInfo.textContent = `Бюджет: ${this.playerMoney[this.currentPlayer]} монет`;
        }

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
            endTurnBtn.disabled = false;
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
        if (!this.config || this.phase !== 'shop') {
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
    
    updateButtonColors() {
        const endTurnBtn = document.getElementById('endTurnBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        // Кольори кнопок в залежності від гравця
        endTurnBtn.className = this.currentPlayer === 1 ? 'player1-btn' : 'player2-btn';
        resetBtn.className = 'neutral-btn';
    }
    
    updateAvailableUnitsUI() {
        // Цей метод може бути реалізований для показу доступних фішок
    }
    
    allUnitsMoved() {
        // Перевіряємо чи всі фішки поточного гравця вже ходили
        const currentPlayerUnits = this.units.filter(u => u.userData.player === this.currentPlayer);
        return currentPlayerUnits.every(unit => unit.userData.moved);
    }
    
    startBattleAnimations() {
        if (this.isAnimatingBattles) return;
        
        this.isAnimatingBattles = true;
        document.getElementById('endTurnBtn').disabled = true;
        this.addLog('Аналіз бойових зіткнень...', 'combat-log');
        
        // Знаходимо всі бої
        this.findBattles();
        
        // Запускаємо анімацію боїв
        this.animateBattles();
    }
    
    findBattles() {
        // Знаходимо всі сусідні фішки різних гравців
        for (let i = 0; i < this.units.length; i++) {
            for (let j = i + 1; j < this.units.length; j++) {
                const unit1 = this.units[i];
                const unit2 = this.units[j];
                
                if (unit1.userData.player !== unit2.userData.player) {
                    const distance = Math.abs(unit1.userData.x - unit2.userData.x) + Math.abs(unit1.userData.z - unit2.userData.z);
                    
                    if (distance === 1) { // Сусідні клітинки
                        this.startBattle(unit1, unit2);
                    }
                }
            }
        }
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(this.gridSize * this.cellSize + 2, this.gridSize * this.cellSize + 2);
        const groundX = this.getBoardCenterOffset();
        const groundZ = this.getBoardCenterOffset();
        const textureLoader = new THREE.TextureLoader();

        textureLoader.load('testmap1.png', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);

            const ground = new THREE.Mesh(
                groundGeometry,
                new THREE.MeshLambertMaterial({ map: texture, transparent: false, opacity: 1 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(groundX, -0.15, groundZ);
            ground.receiveShadow = true;
            this.scene.add(ground);
        }, undefined, () => {
            const ground = new THREE.Mesh(
                groundGeometry,
                new THREE.MeshLambertMaterial({ color: 0x7d6a55, transparent: false, opacity: 1 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(groundX, -0.15, groundZ);
            ground.receiveShadow = true;
            this.scene.add(ground);
        });
    }

    createGrid() {
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                const cellGeometry = new THREE.BoxGeometry(this.cellSize, 0.1, this.cellSize);
                const cellMaterial = new THREE.MeshLambertMaterial({
                    color: (x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A,
                    transparent: true,
                    opacity: 0.18
                });
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(this.toWorldCoord(x), 0, this.toWorldCoord(z));
                cell.receiveShadow = true;
                cell.userData = { type: 'cell', x, z };
                this.scene.add(cell);
                this.grid[x][z] = { mesh: cell, unit: null };
            }
        }

        const gridHelper = new THREE.GridHelper(this.gridSize * this.cellSize, this.gridSize, 0xd7d7d7, 0xa5a5a5);
        gridHelper.position.set(this.getBoardCenterOffset(), 0.05, this.getBoardCenterOffset());
        this.scene.add(gridHelper);
    }

    getUnitPalette(player) {
        if (player === 1) {
            return {
                base: 0x5b7f34,
                dark: 0x2f4717,
                accent: '#b7d56c',
                frame: 0xd8ccb2
            };
        }

        return {
            base: 0x7f4634,
            dark: 0x4c2419,
            accent: '#e5a578',
            frame: 0xd9c4b0
        };
    }

    createUnitSymbolTexture(type, player) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const palette = this.getUnitPalette(player);

        ctx.fillStyle = '#f8f5ea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#191919';
        ctx.lineWidth = 10;
        ctx.strokeRect(24, 46, 208, 148);

        ctx.fillStyle = palette.accent;
        ctx.fillRect(24, 24, 208, 14);
        ctx.fillRect(24, 202, 208, 18);

        const centerX = 128;
        const centerY = 120;
        const left = 54;
        const right = 202;
        const top = 66;
        const bottom = 174;

        const drawInfantry = () => {
            ctx.beginPath();
            ctx.moveTo(left, top);
            ctx.lineTo(right, bottom);
            ctx.moveTo(right, top);
            ctx.lineTo(left, bottom);
            ctx.stroke();
        };

        const drawArmor = () => {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 54, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
        };

        const drawArtillery = () => {
            ctx.fillStyle = '#191919';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
            ctx.fill();
        };

        const drawRecon = () => {
            ctx.beginPath();
            ctx.moveTo(72, 166);
            ctx.lineTo(184, 74);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(98, 96, 14, 0, Math.PI * 2);
            ctx.arc(156, 144, 14, 0, Math.PI * 2);
            ctx.stroke();
        };

        const drawCommand = () => {
            ctx.beginPath();
            ctx.moveTo(centerX, 62);
            ctx.lineTo(centerX, 178);
            ctx.lineTo(178, 150);
            ctx.moveTo(centerX, 78);
            ctx.lineTo(176, 78);
            ctx.stroke();
            ctx.fillStyle = '#191919';
            ctx.fillRect(108, 28, 40, 10);
        };

        const drawSniper = () => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
            ctx.moveTo(centerX - 56, centerY);
            ctx.lineTo(centerX + 56, centerY);
            ctx.moveTo(centerX, centerY - 56);
            ctx.lineTo(centerX, centerY + 56);
            ctx.stroke();
        };

        switch (type) {
            case 'armor':
                drawArmor();
                break;
            case 'artillery':
                drawArtillery();
                break;
            case 'command':
                drawCommand();
                break;
            case 'scout':
                drawRecon();
                break;
            case 'sniper':
                drawSniper();
                break;
            case 'infantry':
            default:
                drawInfantry();
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
    }

    createUnit(type, x, z, player) {
        const unitConfig = this.config.unitTypes[type];
        const palette = this.getUnitPalette(player);
        const symbolTexture = this.createUnitSymbolTexture(type, player);
        const unit = new THREE.Group();

        unit.position.set(this.toWorldCoord(x), 0.42, this.toWorldCoord(z));
        unit.userData = {
            isUnitRoot: true,
            type,
            player,
            x,
            z,
            moved: false,
            hitpoints: unitConfig.hitpoints,
            maxHitpoints: unitConfig.hitpoints,
            strength: unitConfig.strength
        };

        const pedestal = new THREE.Mesh(
            new THREE.BoxGeometry(1.18, 0.26, 1.18),
            new THREE.MeshPhongMaterial({
                color: palette.dark,
                shininess: 18
            })
        );
        pedestal.position.y = 0.13;
        pedestal.castShadow = true;
        pedestal.receiveShadow = true;
        unit.add(pedestal);

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.02, 0.34, 1.02),
            new THREE.MeshPhongMaterial({
                color: palette.base,
                shininess: 34
            })
        );
        body.position.y = 0.34;
        body.castShadow = true;
        body.receiveShadow = true;
        unit.add(body);

        const plateFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.08, 0.76),
            new THREE.MeshPhongMaterial({
                color: palette.frame,
                shininess: 12
            })
        );
        plateFrame.position.y = 0.57;
        plateFrame.castShadow = true;
        plateFrame.receiveShadow = true;
        unit.add(plateFrame);

        const plate = new THREE.Mesh(
            new THREE.BoxGeometry(0.84, 0.03, 0.68),
            new THREE.MeshPhongMaterial({
                color: 0xf7f2e3,
                map: symbolTexture,
                shininess: 6
            })
        );
        plate.position.y = 0.63;
        plate.castShadow = true;
        unit.add(plate);

        const frontPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.74, 0.38, 0.04),
            new THREE.MeshPhongMaterial({
                color: 0xf7f2e3,
                map: symbolTexture,
                shininess: 10
            })
        );
        frontPlate.position.set(0, 0.48, 0.53);
        frontPlate.castShadow = true;
        unit.add(frontPlate);

        const gloss = new THREE.Mesh(
            new THREE.PlaneGeometry(0.58, 0.18),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.12
            })
        );
        gloss.position.set(0, 0.64, 0);
        gloss.rotation.x = -Math.PI / 2;
        unit.add(gloss);

        this.scene.add(unit);
        return unit;
    }

    moveUnit(unit, targetX, targetZ) {
        const oldX = unit.userData.x;
        const oldZ = unit.userData.z;

        this.grid[oldX][oldZ].unit = null;
        this.grid[targetX][targetZ].unit = unit;
        this.movementAnimations = this.movementAnimations.filter((animation) => animation.unit !== unit);
        this.movementAnimations.push({
            unit,
            startX: unit.position.x,
            startY: unit.position.y,
            startZ: unit.position.z,
            endX: this.toWorldCoord(targetX),
            endY: 0.42,
            endZ: this.toWorldCoord(targetZ),
            startTime: performance.now(),
            duration: 350
        });
        unit.userData.x = targetX;
        unit.userData.z = targetZ;
        unit.userData.moved = true;

        this.deselectUnit(false);
    }

    endTurn() {
        if (this.phase === 'shop') {
            this.startPlacement();
            return;
        }

        if (this.phase === 'placement') {
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Player ${this.currentPlayer} finished placement.`, 'place-log');

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.phase = 'shop';
                this.addLog('Player 2 now buys units.', 'place-log');
            } else {
                this.phase = 'battle';
                this.currentPlayer = 1;
                this.units.forEach((unit) => {
                    unit.userData.moved = false;
                });
                this.addLog('Placement is over. Battle begins.', 'place-log');
            }

            this.updateUI();
            return;
        }

        if (this.phase === 'battle') {
            const finishedPlayer = this.currentPlayer;
            this.addLog(`Player ${finishedPlayer} finished the turn.`, 'move-log');
            if (finishedPlayer === 1) {
                this.currentPlayer = 2;
                this.units
                    .filter((unit) => unit.userData.player === 2)
                    .forEach((unit) => {
                        unit.userData.moved = false;
                    });
            } else {
                this.turnNumber += 1;
                this.currentPlayer = 1;
                this.startBattleAnimations();
            }
            this.updateUI();
        }
    }

    startPlacement() {
        const unplacedUnits = this.purchasedUnits[this.currentPlayer].filter((unit) => !unit.placed);
        if (unplacedUnits.length === 0) {
            this.addLog('Buy at least one unit before placement.', 'combat-log');
            return;
        }

        this.phase = 'placement';
        this.placementPhase[this.currentPlayer] = true;
        this.addLog(`Player ${this.currentPlayer} starts placement. Left to place: ${unplacedUnits.length}`, 'place-log');
        this.updateUI();
    }

    updateAvailableUnitsUI() {
        [1, 2].forEach((player) => {
            const container = document.getElementById(`player${player}PurchasedList`);
            if (!container) {
                return;
            }

            const units = this.purchasedUnits[player];
            if (!units || units.length === 0) {
                container.className = 'units-list-empty';
                container.textContent = 'Nothing bought yet';
                return;
            }

            container.className = '';
            container.innerHTML = units.map((unit) => {
                const status = unit.placed ? 'placed' : 'ready';
                return `<span class="unit-badge">${unit.config.name} (${status})</span>`;
            }).join('');
        });
    }

    updateMouseFromEvent(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    getCellMeshes() {
        return this.grid.flat().map((cell) => cell.mesh);
    }

    getPointerTarget() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const unitHits = this.raycaster.intersectObjects(this.units, true);
        if (unitHits.length > 0) {
            return { kind: 'unit', object: this.getUnitRoot(unitHits[0].object) };
        }

        const cellHits = this.raycaster.intersectObjects(this.getCellMeshes(), false);
        if (cellHits.length > 0) {
            return { kind: 'cell', object: cellHits[0].object };
        }

        return null;
    }

    getUnitRoot(object) {
        let current = object;
        while (current && current.parent && !current.userData.isUnitRoot) {
            current = current.parent;
        }
        return current;
    }

    resetCellAppearance(cell) {
        const x = cell.userData.x;
        const z = cell.userData.z;
        cell.material.color.setHex((x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
        cell.material.opacity = 0.18;
    }

    clearMovementHighlights() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                this.resetCellAppearance(this.grid[x][z].mesh);
            }
        }
    }

    deselectUnit(shouldLog = false) {
        this.selectedUnit = null;
        this.selectedCell = null;
        this.clearMovementHighlights();
        this.hideUnitInfo();
        if (shouldLog) {
            this.addLog('Вибір фішки знято', 'move-log');
        }
    }

    selectUnit(unit) {
        this.selectedUnit = unit;
        this.selectedCell = this.grid[unit.userData.x][unit.userData.z].mesh;
        this.showMovementHighlights(unit);
        this.addLog(`Вибрано: ${this.config.unitTypes[unit.userData.type].name}`, 'move-log');
    }

    showMovementHighlights(unit) {
        this.clearMovementHighlights();

        const originCell = this.grid[unit.userData.x][unit.userData.z].mesh;
        originCell.material.color.setHex(0xFF6B35);
        originCell.material.opacity = 0.45;

        const unitX = unit.userData.x;
        const unitZ = unit.userData.z;
        const maxDistance = this.config.unitTypes[unit.userData.type].movement;

        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
                if (distance > 0 && distance <= maxDistance && this.grid[x][z].unit === null) {
                    const cell = this.grid[x][z].mesh;
                    cell.material.color.setHex(0x52d273);
                    cell.material.opacity = 0.38;
                }
            }
        }
    }

    onMouseMove(event) {
        this.updateMouseFromEvent(event);

        if (this.isDragging) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;

            this.cameraAngle += deltaX * 0.01;
            this.cameraHeight = Math.max(5, Math.min(40, this.cameraHeight - deltaY * 0.1));
            this.updateCameraPosition();

            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    onMouseClick(event) {
        if (this.isAnimatingBattles) {
            return;
        }

        this.updateMouseFromEvent(event);
        const target = this.getPointerTarget();

        if (!target) {
            this.deselectUnit(true);
            return;
        }

        if (target.kind === 'unit') {
            this.handleUnitClick(target.object);
            return;
        }

        if (target.kind === 'cell') {
            this.handleCellClick(target.object.userData.x, target.object.userData.z);
        }
    }

    handleUnitClick(unit) {
        if (this.phase === 'placement') {
            this.addLog('Під час розміщення потрібно клікати по клітинці.', 'combat-log');
            return;
        }

        if (unit.userData.player !== this.currentPlayer) {
            this.showUnitInfo(unit);
            this.addLog('Ця фішка належить іншому гравцю!', 'combat-log');
            return;
        }

        if (unit.userData.moved) {
            this.addLog('Ця фішка вже рухалась у цьому раунді.', 'combat-log');
            return;
        }

        if (this.selectedUnit === unit) {
            this.deselectUnit(true);
            return;
        }

        this.selectUnit(unit);
    }

    handleCellClick(x, z) {
        if (this.phase === 'placement') {
            this.placeUnit(x, z);
            return;
        }

        if (this.phase !== 'battle' || !this.selectedUnit) {
            return;
        }

        const unitX = this.selectedUnit.userData.x;
        const unitZ = this.selectedUnit.userData.z;
        const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
        const maxDistance = this.config.unitTypes[this.selectedUnit.userData.type].movement;

        if (distance === 0) {
            this.deselectUnit(true);
            return;
        }

        if (distance > maxDistance) {
            this.addLog('Занадто далеко для цієї фішки!', 'combat-log');
            return;
        }

        if (this.grid[x][z].unit !== null) {
            this.addLog('Клітинка зайнята!', 'combat-log');
            return;
        }

        this.moveUnit(this.selectedUnit, x, z);
    }

    startBattleAnimations() {
        if (this.isAnimatingBattles) {
            return;
        }

        this.isAnimatingBattles = true;
        this.selectedUnit = null;
        this.selectedCell = null;
        this.clearMovementHighlights();
        document.getElementById('endTurnBtn').disabled = true;
        this.addLog('Аналіз бойових зіткнень...', 'combat-log');
        this.findBattles();
        this.animateBattles();
    }

    animateBattles() {
        if (this.battleAnimations.length === 0) {
            this.isAnimatingBattles = false;
            this.currentPlayer = 1;
            this.units.forEach((unit) => {
                unit.userData.moved = false;
            });
            document.getElementById('endTurnBtn').disabled = false;
            this.updateUI();
            return;
        }

        const battle = this.battleAnimations[0];
        const elapsed = Date.now() - battle.startTime;

        if (!battle.effectStarted) {
            battle.effectStarted = true;
            this.createExplosionAt(battle.attacker.position.clone(), 0xff7b54);
            this.createExplosionAt(battle.defender.position.clone(), 0xffc857);
        }

        if (elapsed > 900) {
            this.resolveBattle(battle);
            this.battleAnimations.shift();
        }

        requestAnimationFrame(() => this.animateBattles());
    }

    resolveBattle(battle) {
        const attacker = battle.attacker;
        const defender = battle.defender;
        if (!this.units.includes(attacker) || !this.units.includes(defender)) {
            return;
        }

        const attackerPower = attacker.userData.strength;
        const defenderPower = defender.userData.strength;

        if (attackerPower === defenderPower) {
            this.removeUnit(attacker);
            this.removeUnit(defender);
            this.losses[attacker.userData.player] += 1;
            this.losses[defender.userData.player] += 1;
            this.addLog('Бій завершився внічию: обидві фішки знищено.', 'combat-log');
            this.checkVictory();
            return;
        }

        const winner = attackerPower > defenderPower ? attacker : defender;
        const loser = winner === attacker ? defender : attacker;

        loser.userData.hitpoints -= winner.userData.strength;
        if (loser.userData.hitpoints <= 0) {
            this.removeUnit(loser);
            this.losses[loser.userData.player] += 1;
        }

        this.addLog(`${winner.userData.player === 1 ? 'Гравець 1' : 'Гравець 2'} переміг у бою!`, 'combat-log');
        this.checkVictory();
    }

    removeUnit(unit) {
        if (this.selectedUnit === unit) {
            this.selectedUnit = null;
            this.selectedCell = null;
        }

        const index = this.units.indexOf(unit);
        if (index > -1) {
            this.units.splice(index, 1);
        }

        if (this.grid[unit.userData.x] && this.grid[unit.userData.x][unit.userData.z]) {
            this.grid[unit.userData.x][unit.userData.z].unit = null;
        }
        this.scene.remove(unit);
        this.clearMovementHighlights();
    }

    createExplosionAt(position, color) {
        const geometry = new THREE.SphereGeometry(0.35, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.85
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 0.6;
        this.scene.add(mesh);
        this.battleEffects.push({
            mesh,
            startTime: performance.now(),
            duration: 420
        });
    }

    addLog(message, type = 'info-log') {
        const logContent = document.getElementById('logContent');
        const logEntry = document.createElement('div');
        logEntry.className = type;
        logEntry.textContent = message;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.movementAnimations.length > 0) {
            const now = performance.now();
            this.movementAnimations = this.movementAnimations.filter((animation) => {
                const progress = Math.min(1, (now - animation.startTime) / animation.duration);
                const eased = 1 - Math.pow(1 - progress, 3);
                animation.unit.position.set(
                    animation.startX + (animation.endX - animation.startX) * eased,
                    animation.startY + (animation.endY - animation.startY) * eased + Math.sin(progress * Math.PI) * 0.15,
                    animation.startZ + (animation.endZ - animation.startZ) * eased
                );
                return progress < 1;
            });
        }
        if (this.battleEffects.length > 0) {
            const now = performance.now();
            this.battleEffects = this.battleEffects.filter((effect) => {
                const progress = Math.min(1, (now - effect.startTime) / effect.duration);
                effect.mesh.scale.setScalar(1 + progress * 2.2);
                effect.mesh.material.opacity = 0.85 * (1 - progress);
                if (progress >= 1) {
                    this.scene.remove(effect.mesh);
                    return false;
                }
                return true;
            });
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск гри
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new AdmiralGame();
});

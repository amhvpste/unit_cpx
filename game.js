// Основна гра тактичної симуляції на Three.js
const BUILD_VERSION = 'air-2026.03.19-02';

class AdmiralGame {
    constructor() {
        this.buildVersion = BUILD_VERSION;
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
        document.title = `UNITS CPX ${this.buildVersion}`;
        
        // Ігрові параметри
        this.gridSize = 10;
        this.cellSize = 2;
        this.grid = [];
        this.airGrid = [];
        this.units = [];
        this.airUnits = [];
        this.selectedUnit = null;
        this.selectedCell = null;
        this.activeLayer = 'ground';
        this.airLayerHeight = 2.35;
        this.gridHelpers = {};
        this.unitIdCounter = 1;
        this.fogAnimations = [];
        
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
        this.cameraDistance = 17;
        this.cameraAngle = -0.6;
        this.cameraHeight = 14;
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
        const configRequest = fetch(`config.json?v=${this.buildVersion}`, { cache: 'no-store' });
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

        const toggleLayerBtn = document.getElementById('toggleLayerBtn');
        if (toggleLayerBtn) {
            toggleLayerBtn.addEventListener('click', () => {
                this.toggleActiveLayer();
            });
        }
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

        const unplacedUnit = this.getNextPlacementUnit();
        const domain = unplacedUnit ? this.getDomainForType(unplacedUnit.type) : 'ground';
        const grid = this.getGridByLayer(domain);
        
        // Перевірка чи клітинка вільна
        if (grid[x][z].unit !== null) {
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
        if (!unplacedUnit) {
            this.addLog('Спочатку купіть фішку в магазині!', 'combat-log');
            return;
        }
        
        // Створення фішки
        const unit = this.createUnit(unplacedUnit.type, x, z, this.currentPlayer);
        
        // Оновлення сітки
        grid[x][z].unit = unit;
        this.getUnitsByLayer(domain).push(unit);
        
        // Маркуємо фішку як розміщену
        unplacedUnit.placed = true;
        
        const layerLabel = domain === 'air' ? 'повітряному' : 'земному';
        this.addLog(`Гравець ${this.currentPlayer} розмістив ${unplacedUnit.config.name} на (${x}, ${z}) у ${layerLabel} шарі`, 'place-log');

        this.refreshLayerVisualState();
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
    
    startBattle(attacker, defender, mode = 'melee') {
        this.battleAnimations.push({
            attacker: attacker,
            defender: defender,
            mode,
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
                [...this.units, ...this.airUnits].forEach((unit) => {
                    unit.userData.moved = false;
                });
                this.activeLayer = 'ground';
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
        const allUnits = [...this.units, ...this.airUnits];
        const player1Units = allUnits.filter(u => u.userData.player === 1).length;
        const player2Units = allUnits.filter(u => u.userData.player === 2).length;
        
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
        [...this.units, ...this.airUnits].forEach(unit => {
            this.scene.remove(unit);
        });
        this.units = [];
        this.airUnits = [];
        
        // Очищення сітки
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                this.grid[x][z].unit = null;
                this.airGrid[x][z].unit = null;
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
        this.activeLayer = 'ground';
        
        // Очищення журналу
        document.getElementById('logContent').innerHTML = '';
        this.refreshLayerVisualState();
        
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
        this.updateUnitPlacards();
    }
    
    showUnitInfo(unit) {
        if (this.phase === 'battle' && unit.userData.player !== this.currentPlayer && !this.isCellVisibleToPlayer(unit.userData.x, unit.userData.z)) {
            this.hideUnitInfo();
            return;
        }

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
        const allUnits = [...this.units, ...this.airUnits];
        const player1Units = allUnits.filter(u => u.userData.player === 1).length;
        const player2Units = allUnits.filter(u => u.userData.player === 2).length;
        
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
        const buildVersionLabel = document.getElementById('buildVersionLabel');
        if (buildVersionLabel) {
            buildVersionLabel.textContent = this.buildVersion;
        }
        const activeLayerLabel = document.getElementById('activeLayerLabel');
        if (activeLayerLabel) {
            activeLayerLabel.textContent = this.getLayerLabel(this.getInteractionLayer());
        }
        
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
        const toggleLayerBtn = document.getElementById('toggleLayerBtn');
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
        
        if (toggleLayerBtn) {
            toggleLayerBtn.style.display = this.phase === 'battle' ? 'block' : 'none';
            toggleLayerBtn.textContent = this.getLayerButtonLabel();
            toggleLayerBtn.disabled = this.phase !== 'battle';
        }

        this.refreshLayerVisualState();
        this.applyFogOfWar();

        // Відновлюємо підсвітку якщо є вибрана фішка
        if (this.selectedUnit) {
            const selectedGrid = this.getGridByLayer(this.selectedUnit.userData.domain);
            const cell = selectedGrid[this.selectedUnit.userData.x][this.selectedUnit.userData.z].mesh;
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
        const scheduledBattles = new Set();
        const scheduleBattle = (attacker, defender, mode = 'melee') => {
            if (!attacker || !defender) {
                return;
            }

            const key = mode === 'melee'
                ? `${mode}:${[attacker.userData.id, defender.userData.id].sort((a, b) => a - b).join(':')}`
                : `${mode}:${attacker.userData.id}:${defender.userData.id}`;

            if (scheduledBattles.has(key)) {
                return;
            }

            scheduledBattles.add(key);
            this.startBattle(attacker, defender, mode);
        };

        this.airUnits
            .filter((unit) => unit.userData.type === 'droneKamikaze')
            .forEach((drone) => {
                const groundTarget = this.grid[drone.userData.x]?.[drone.userData.z]?.unit;
                if (groundTarget && groundTarget.userData.player !== drone.userData.player) {
                    scheduleBattle(drone, groundTarget, 'kamikazeStrike');
                }
            });

        this.getAllUnits()
            .filter((unit) => unit.userData.type === 'artillery' || unit.userData.type === 'sniper')
            .forEach((unit) => {
                const range = this.getAttackRange(unit.userData.type);
                const target = this.getNearestEnemyTarget(unit, range, unit.userData.domain);
                if (target) {
                    scheduleBattle(unit, target, 'rangedStrike');
                }
            });
        // Знаходимо всі сусідні фішки різних гравців
        for (let i = 0; i < this.units.length; i++) {
            for (let j = i + 1; j < this.units.length; j++) {
                const unit1 = this.units[i];
                const unit2 = this.units[j];
                
                if (unit1.userData.player !== unit2.userData.player) {
                    if (unit1.userData.type === 'artillery' || unit1.userData.type === 'sniper' || unit2.userData.type === 'artillery' || unit2.userData.type === 'sniper') {
                        continue;
                    }
                    const distance = Math.abs(unit1.userData.x - unit2.userData.x) + Math.abs(unit1.userData.z - unit2.userData.z);
                    
                    if (distance === 1) { // Сусідні клітинки
                        scheduleBattle(unit1, unit2, 'melee');
                    }
                }
            }
        }

        for (let i = 0; i < this.airUnits.length; i++) {
            for (let j = i + 1; j < this.airUnits.length; j++) {
                const unit1 = this.airUnits[i];
                const unit2 = this.airUnits[j];

                if (unit1.userData.player !== unit2.userData.player) {
                    if (unit1.userData.type === 'artillery' || unit1.userData.type === 'sniper' || unit2.userData.type === 'artillery' || unit2.userData.type === 'sniper') {
                        continue;
                    }
                    const distance = Math.abs(unit1.userData.x - unit2.userData.x) + Math.abs(unit1.userData.z - unit2.userData.z);

                    if (distance === 1) {
                        scheduleBattle(unit1, unit2, 'melee');
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
        this.grid = this.createGridLayer('ground');
        this.airGrid = this.createGridLayer('air');
        this.refreshLayerVisualState();
    }

    createFogOverlay(layer, x, z, y) {
        const fogHeight = layer === 'air' ? 1.1 : 1.7;
        const fog = new THREE.Mesh(
            new THREE.BoxGeometry(this.cellSize * 0.92, fogHeight, this.cellSize * 0.92),
            new THREE.MeshPhongMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false,
                color: layer === 'air' ? 0x9fb8c6 : 0x899197,
                emissive: layer === 'air' ? 0x243743 : 0x2f3438,
                shininess: 6
            })
        );

        const markerCanvas = document.createElement('canvas');
        markerCanvas.width = 128;
        markerCanvas.height = 128;
        const markerCtx = markerCanvas.getContext('2d');
        markerCtx.clearRect(0, 0, 128, 128);
        markerCtx.fillStyle = layer === 'air' ? 'rgba(196, 239, 255, 0.98)' : 'rgba(255, 248, 230, 0.98)';
        markerCtx.strokeStyle = 'rgba(40, 46, 52, 0.98)';
        markerCtx.lineWidth = 10;
        markerCtx.font = 'bold 92px Arial';
        markerCtx.textAlign = 'center';
        markerCtx.textBaseline = 'middle';
        markerCtx.strokeText('?', 64, 68);
        markerCtx.fillText('?', 64, 68);
        const markerTexture = new THREE.CanvasTexture(markerCanvas);

        const marker = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: markerTexture,
                transparent: true,
                opacity: 0,
                depthWrite: false
            })
        );
        marker.scale.set(0.74, 0.74, 0.74);
        marker.position.set(0, fogHeight * 0.18, 0);
        fog.add(marker);

        fog.position.set(this.toWorldCoord(x), y + fogHeight / 2 + 0.08, this.toWorldCoord(z));
        fog.visible = false;
        fog.userData.marker = marker;
        fog.userData.baseOpacity = layer === 'air' ? 0.22 : 0.28;
        fog.userData.markerOpacity = layer === 'air' ? 0.72 : 0.78;
        this.scene.add(fog);

        this.fogAnimations.push({
            mesh: fog,
            baseY: fog.position.y,
            phase: (x + z) * 0.6,
            baseOpacity: fog.userData.baseOpacity
        });

        return fog;
    }

    createGridLayer(layer) {
        const grid = [];
        const isAir = layer === 'air';
        const y = isAir ? this.airLayerHeight : 0;
        const evenColor = isAir ? 0x4b768b : 0x4A5F4A;
        const oddColor = isAir ? 0x5a8ea6 : 0x5A6F5A;
        const helperColors = isAir ? [0x9fd8f1, 0x75b8d6] : [0xd7d7d7, 0xa5a5a5];

        for (let x = 0; x < this.gridSize; x++) {
            grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                const cellGeometry = new THREE.BoxGeometry(this.cellSize, 0.08, this.cellSize);
                const cellMaterial = new THREE.MeshLambertMaterial({
                    color: (x + z) % 2 === 0 ? evenColor : oddColor,
                    transparent: true,
                    opacity: isAir ? 0.12 : 0.18
                });
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(this.toWorldCoord(x), y, this.toWorldCoord(z));
                cell.receiveShadow = !isAir;
                cell.userData = { type: 'cell', x, z, layer };
                const fog = this.createFogOverlay(layer, x, z, y);
                this.scene.add(cell);
                grid[x][z] = { mesh: cell, fog, unit: null };
            }
        }

        const gridHelper = new THREE.GridHelper(this.gridSize * this.cellSize, this.gridSize, helperColors[0], helperColors[1]);
        gridHelper.position.set(this.getBoardCenterOffset(), y + 0.05, this.getBoardCenterOffset());
        this.scene.add(gridHelper);
        this.gridHelpers[layer] = gridHelper;

        return grid;
    }

    getDomainForType(type) {
        return this.config?.unitTypes?.[type]?.domain || 'ground';
    }

    getGridByLayer(layer = 'ground') {
        return layer === 'air' ? this.airGrid : this.grid;
    }

    getUnitsByLayer(layer = 'ground') {
        return layer === 'air' ? this.airUnits : this.units;
    }

    getLayerLabel(layer = this.activeLayer) {
        return layer === 'air' ? 'повітряний' : 'земний';
    }

    getLayerButtonLabel(layer = this.activeLayer) {
        return layer === 'air' ? 'Шар: повітря' : 'Шар: земля';
    }

    getNextPlacementUnit() {
        return this.purchasedUnits[this.currentPlayer].find((unit) => !unit.placed) || null;
    }

    getAllUnits() {
        return [...this.units, ...this.airUnits];
    }

    getVisionRange(unit) {
        if (!unit) {
            return 0;
        }

        if (unit.userData.type === 'scout' || unit.userData.type.startsWith('drone')) {
            return 3;
        }

        return 1;
    }

    getVisibleCells(player = this.currentPlayer) {
        const visible = new Set();
        const ownUnits = this.getAllUnits().filter((unit) => unit.userData.player === player);

        ownUnits.forEach((unit) => {
            const visionRange = this.getVisionRange(unit);
            for (let x = 0; x < this.gridSize; x++) {
                for (let z = 0; z < this.gridSize; z++) {
                    const distance = Math.abs(x - unit.userData.x) + Math.abs(z - unit.userData.z);
                    if (distance <= visionRange) {
                        visible.add(`${x}:${z}`);
                    }
                }
            }
        });

        return visible;
    }

    isCellVisibleToPlayer(x, z, player = this.currentPlayer) {
        if (this.phase !== 'battle') {
            return true;
        }

        return this.getVisibleCells(player).has(`${x}:${z}`);
    }

    applyFogOfWar() {
        const visibleCells = this.getVisibleCells(this.currentPlayer);

        this.getAllUnits().forEach((unit) => {
            const isOwnUnit = unit.userData.player === this.currentPlayer;
            const isVisible = isOwnUnit || this.phase !== 'battle' || visibleCells.has(`${unit.userData.x}:${unit.userData.z}`);
            unit.visible = isVisible;
        });

        ['ground', 'air'].forEach((layer) => {
            const grid = this.getGridByLayer(layer);
            for (let x = 0; x < this.gridSize; x++) {
                for (let z = 0; z < this.gridSize; z++) {
                    const fog = grid[x][z].fog;
                    if (!fog) {
                        continue;
                    }

                    const shouldShow = this.phase === 'battle'
                        && layer === this.activeLayer
                        && !visibleCells.has(`${x}:${z}`);

                    fog.visible = shouldShow;
                    fog.material.opacity = shouldShow ? fog.userData.baseOpacity : 0;
                    if (fog.userData.marker) {
                        fog.userData.marker.material.opacity = shouldShow ? fog.userData.markerOpacity : 0;
                    }
                }
            }
        });
    }

    getAttackRange(type) {
        if (type === 'artillery') {
            return 3;
        }

        if (type === 'sniper') {
            return 2;
        }

        return 1;
    }

    getNearestEnemyTarget(attacker, maxRange, targetDomain = attacker.userData.domain) {
        const enemyUnits = this.getUnitsByLayer(targetDomain)
            .filter((unit) => unit.userData.player !== attacker.userData.player);

        let bestTarget = null;
        let bestDistance = Infinity;

        enemyUnits.forEach((unit) => {
            const distance = Math.abs(unit.userData.x - attacker.userData.x) + Math.abs(unit.userData.z - attacker.userData.z);
            if (distance === 0 || distance > maxRange) {
                return;
            }

            if (distance < bestDistance) {
                bestDistance = distance;
                bestTarget = unit;
            }
        });

        return bestTarget;
    }

    getInteractionLayer() {
        if (this.phase === 'placement') {
            const nextUnit = this.getNextPlacementUnit();
            return nextUnit ? this.getDomainForType(nextUnit.type) : this.activeLayer;
        }

        return this.activeLayer;
    }

    toggleActiveLayer() {
        if (this.phase !== 'battle') {
            return;
        }

        this.activeLayer = this.activeLayer === 'ground' ? 'air' : 'ground';
        if (this.selectedUnit && this.selectedUnit.userData.domain !== this.activeLayer) {
            this.deselectUnit(false);
        }
        this.addLog(`Активний шар: ${this.getLayerLabel()}.`, 'move-log');
        this.refreshLayerVisualState();
        this.updateUI();
    }

    refreshLayerVisualState() {
        ['ground', 'air'].forEach((layer) => {
            const grid = this.getGridByLayer(layer);
            if (!grid || grid.length === 0) {
                return;
            }

            for (let x = 0; x < this.gridSize; x++) {
                for (let z = 0; z < this.gridSize; z++) {
                    this.resetCellAppearance(grid[x][z].mesh);
                }
            }

            if (this.gridHelpers[layer]) {
                if (this.phase === 'placement') {
                    this.gridHelpers[layer].visible = this.getInteractionLayer() === layer;
                } else if (this.phase === 'battle') {
                    this.gridHelpers[layer].visible = this.activeLayer === layer;
                } else {
                    this.gridHelpers[layer].visible = layer === 'ground';
                }
            }
        });
    }

    getUnitPalette(player) {
        if (player === 1) {
            return {
                base: 0x5b7f34,
                dark: 0x2f4717,
                accent: '#b7d56c',
                frame: 0xd8ccb2,
                metal: 0x626d57
            };
        }

        return {
            base: 0x7f4634,
            dark: 0x4c2419,
            accent: '#e5a578',
            frame: 0xd9c4b0,
            metal: 0x6f6259
        };
    }

    getUnitSymbolProfile(type) {
        const profiles = {
            infantry: { branch: 'infantry', echelon: 'III', frame: 'line', accent: '#6d8f3c' },
            armor: { branch: 'armor', echelon: 'II', frame: 'armor', accent: '#927348' },
            artillery: { branch: 'artillery', echelon: '|', frame: 'support', accent: '#8d5a45' },
            command: { branch: 'command', echelon: 'X', frame: 'command', accent: '#556b8d' },
            scout: { branch: 'recon', echelon: '..', frame: 'recon', accent: '#558060' },
            sniper: { branch: 'sniper', echelon: '.', frame: 'precision', accent: '#7b5a72' },
            droneScout: { branch: 'recon', echelon: '..', frame: 'recon', accent: '#4b8db2' },
            droneKamikaze: { branch: 'sniper', echelon: '.', frame: 'precision', accent: '#b26a4b' }
        };

        return profiles[type] || profiles.infantry;
    }

    drawUnitFrame(ctx, frame) {
        ctx.beginPath();

        switch (frame) {
            case 'armor':
                ctx.moveTo(34, 58);
                ctx.lineTo(222, 58);
                ctx.lineTo(230, 102);
                ctx.lineTo(230, 176);
                ctx.lineTo(26, 176);
                ctx.lineTo(26, 102);
                ctx.closePath();
                break;
            case 'support':
                ctx.moveTo(42, 58);
                ctx.lineTo(214, 58);
                ctx.lineTo(230, 82);
                ctx.lineTo(230, 176);
                ctx.lineTo(26, 176);
                ctx.lineTo(26, 82);
                ctx.closePath();
                break;
            case 'recon':
                ctx.moveTo(44, 58);
                ctx.lineTo(212, 58);
                ctx.lineTo(230, 86);
                ctx.lineTo(212, 176);
                ctx.lineTo(44, 176);
                ctx.lineTo(26, 86);
                ctx.closePath();
                break;
            case 'command':
                ctx.moveTo(26, 58);
                ctx.lineTo(230, 58);
                ctx.lineTo(230, 176);
                ctx.lineTo(144, 176);
                ctx.lineTo(128, 196);
                ctx.lineTo(112, 176);
                ctx.lineTo(26, 176);
                ctx.closePath();
                break;
            case 'precision':
                ctx.moveTo(34, 58);
                ctx.lineTo(222, 58);
                ctx.lineTo(230, 176);
                ctx.lineTo(26, 176);
                ctx.closePath();
                break;
            case 'line':
            default:
                ctx.rect(26, 58, 204, 118);
                break;
        }

        ctx.stroke();
    }

    drawUnitEchelon(ctx, echelon) {
        ctx.save();
        ctx.translate(128, 34);
        ctx.strokeStyle = '#141414';
        ctx.fillStyle = '#141414';
        ctx.lineWidth = 8;

        if (echelon.includes('|')) {
            const count = echelon.length;
            for (let i = 0; i < count; i++) {
                const x = (i - (count - 1) / 2) * 18;
                ctx.beginPath();
                ctx.moveTo(x, -10);
                ctx.lineTo(x, 10);
                ctx.stroke();
            }
        } else if (echelon.includes('I')) {
            const count = echelon.length;
            for (let i = 0; i < count; i++) {
                const x = (i - (count - 1) / 2) * 18;
                ctx.beginPath();
                ctx.moveTo(x, -10);
                ctx.lineTo(x, 10);
                ctx.stroke();
            }
        } else if (echelon.includes('.')) {
            const count = echelon.length;
            for (let i = 0; i < count; i++) {
                const x = (i - (count - 1) / 2) * 18;
                ctx.beginPath();
                ctx.arc(x, 0, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (echelon === 'X') {
            ctx.beginPath();
            ctx.moveTo(-12, -10);
            ctx.lineTo(12, 10);
            ctx.moveTo(12, -10);
            ctx.lineTo(-12, 10);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawUnitBranchSymbol(ctx, branch) {
        const centerX = 128;
        const centerY = 118;
        const left = 56;
        const right = 200;
        const top = 76;
        const bottom = 160;

        switch (branch) {
            case 'armor':
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, 52, 28, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'artillery':
                ctx.fillStyle = '#171717';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'command':
                ctx.beginPath();
                ctx.moveTo(centerX, 70);
                ctx.lineTo(centerX, 164);
                ctx.lineTo(176, 142);
                ctx.moveTo(centerX, 84);
                ctx.lineTo(176, 84);
                ctx.stroke();
                break;
            case 'recon':
                ctx.beginPath();
                ctx.moveTo(72, 152);
                ctx.lineTo(184, 84);
                ctx.stroke();
                break;
            case 'sniper':
                ctx.beginPath();
                ctx.arc(centerX, centerY, 34, 0, Math.PI * 2);
                ctx.moveTo(centerX - 50, centerY);
                ctx.lineTo(centerX + 50, centerY);
                ctx.moveTo(centerX, centerY - 50);
                ctx.lineTo(centerX, centerY + 50);
                ctx.stroke();
                break;
            case 'infantry':
            default:
                ctx.beginPath();
                ctx.moveTo(left, top);
                ctx.lineTo(right, bottom);
                ctx.moveTo(right, top);
                ctx.lineTo(left, bottom);
                ctx.stroke();
                break;
        }
    }

    createUnitSymbolTexture(type, player) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const palette = this.getUnitPalette(player);
        const profile = this.getUnitSymbolProfile(type);

        ctx.fillStyle = '#f8f5ea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 9;

        ctx.fillStyle = profile.accent;
        ctx.fillRect(38, 214, 180, 12);

        this.drawUnitEchelon(ctx, profile.echelon);
        this.drawUnitFrame(ctx, profile.frame);
        this.drawUnitBranchSymbol(ctx, profile.branch);

        ctx.fillStyle = palette.accent;
        ctx.fillRect(38, 214, 116, 12);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
    }

    createUnitPlacard(type, player) {
        const placard = new THREE.Group();
        const palette = this.getUnitPalette(player);
        const symbolTexture = this.createUnitSymbolTexture(type, player);

        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.04, 0.8, 10),
            new THREE.MeshPhongMaterial({ color: palette.metal, shininess: 20 })
        );
        post.position.y = 0.4;
        post.castShadow = true;
        placard.add(post);

        const boardFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.58, 0.08),
            new THREE.MeshPhongMaterial({ color: palette.frame, shininess: 12 })
        );
        boardFrame.position.y = 0.88;
        boardFrame.castShadow = true;
        boardFrame.receiveShadow = true;
        placard.add(boardFrame);

        const boardMaterial = new THREE.MeshPhongMaterial({
            color: 0xf8f5ea,
            map: symbolTexture,
            shininess: 8
        });

        const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.48), boardMaterial);
        boardFace.position.set(0, 0.88, 0.045);
        placard.add(boardFace);

        const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.48), boardMaterial.clone());
        boardBack.position.set(0, 0.88, -0.045);
        boardBack.rotation.y = Math.PI;
        placard.add(boardBack);

        placard.userData.isPlacard = true;

        return placard;
    }

    createUnitMiniature(type, player) {
        const miniature = new THREE.Group();
        const palette = this.getUnitPalette(player);
        const baseMaterial = new THREE.MeshPhongMaterial({ color: palette.base, shininess: 30 });
        const darkMaterial = new THREE.MeshPhongMaterial({ color: palette.dark, shininess: 18 });
        const metalMaterial = new THREE.MeshPhongMaterial({ color: palette.metal, shininess: 32 });

        switch (type) {
            case 'armor': {
                const hull = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.46), baseMaterial);
                hull.position.y = 0.21;
                const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 18), darkMaterial);
                turret.rotation.x = Math.PI / 2;
                turret.position.set(0, 0.37, 0.02);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.52, 10), metalMaterial);
                barrel.rotation.z = Math.PI / 2;
                barrel.position.set(0.38, 0.37, 0.02);
                miniature.add(hull, turret, barrel);
                break;
            }
            case 'artillery': {
                const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.32), baseMaterial);
                carriage.position.y = 0.18;
                const shield = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.04), darkMaterial);
                shield.position.set(-0.04, 0.32, 0);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 10), metalMaterial);
                barrel.rotation.z = -Math.PI / 2.7;
                barrel.position.set(0.18, 0.4, 0);
                miniature.add(carriage, shield, barrel);
                break;
            }
            case 'command': {
                const table = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 14), baseMaterial);
                table.position.y = 0.16;
                const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), metalMaterial);
                mast.position.set(0.04, 0.52, 0);
                const flag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.02), darkMaterial);
                flag.position.set(0.16, 0.72, 0);
                miniature.add(table, mast, flag);
                break;
            }
            case 'scout': {
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), baseMaterial);
                body.position.y = 0.16;
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.22), darkMaterial);
                cabin.position.set(-0.04, 0.29, 0);
                const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), metalMaterial);
                sensor.position.set(0.14, 0.34, 0);
                miniature.add(body, cabin, sensor);
                break;
            }
            case 'sniper': {
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.16), baseMaterial);
                body.position.set(-0.05, 0.16, 0);
                body.rotation.z = -0.24;
                const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.66, 10), metalMaterial);
                rifle.rotation.z = Math.PI / 2;
                rifle.position.set(0.17, 0.24, 0);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), darkMaterial);
                head.position.set(-0.18, 0.24, 0);
                miniature.add(body, rifle, head);
                break;
            }
            case 'droneScout': {
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.2), baseMaterial);
                body.position.y = 0.26;
                const wing = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.03, 0.12), darkMaterial);
                wing.position.y = 0.28;
                const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.03), metalMaterial);
                tail.position.set(-0.2, 0.34, 0);
                const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), metalMaterial);
                sensor.position.set(0.18, 0.23, 0);
                miniature.add(body, wing, tail, sensor);
                break;
            }
            case 'droneKamikaze': {
                const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.56, 12), baseMaterial);
                fuselage.rotation.z = Math.PI / 2;
                fuselage.position.set(0.02, 0.28, 0);
                const wing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.58), darkMaterial);
                wing.position.set(0, 0.29, 0);
                const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), metalMaterial);
                tail.position.set(-0.2, 0.36, 0);
                const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), metalMaterial);
                nose.rotation.z = -Math.PI / 2;
                nose.position.set(0.33, 0.28, 0);
                miniature.add(fuselage, wing, tail, nose);
                break;
            }
            case 'infantry':
            default: {
                const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 12), baseMaterial);
                torso.position.y = 0.24;
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), darkMaterial);
                head.position.y = 0.46;
                const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 10), metalMaterial);
                rifle.rotation.z = -0.85;
                rifle.position.set(0.13, 0.26, 0);
                miniature.add(torso, head, rifle);
                break;
            }
        }

        miniature.children.forEach((mesh) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });

        return miniature;
    }

    createUnit(type, x, z, player) {
        const unitConfig = this.config.unitTypes[type];
        const palette = this.getUnitPalette(player);
        const unit = new THREE.Group();
        const domain = this.getDomainForType(type);
        const baseY = domain === 'air' ? this.airLayerHeight + 0.42 : 0.42;

        unit.position.set(this.toWorldCoord(x), baseY, this.toWorldCoord(z));
        unit.userData = {
            isUnitRoot: true,
            id: this.unitIdCounter++,
            type,
            player,
            domain,
            x,
            z,
            moved: false,
            hitpoints: unitConfig.hitpoints,
            maxHitpoints: unitConfig.hitpoints,
            strength: unitConfig.strength
        };

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.48, 0.18, 24),
            new THREE.MeshPhongMaterial({
                color: palette.dark,
                shininess: 20
            })
        );
        base.position.y = 0.09;
        base.castShadow = true;
        base.receiveShadow = true;
        if (domain === 'air') {
            base.scale.set(0.86, 0.8, 0.86);
        }
        unit.add(base);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.045, 12, 32),
            new THREE.MeshPhongMaterial({
                color: palette.accent,
                shininess: 24
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.18;
        ring.castShadow = true;
        if (domain === 'air') {
            ring.material.color.set(0x8cd4f5);
        }
        unit.add(ring);

        if (domain === 'air') {
            const beamLength = Math.max(0.2, baseY - 0.1);
            const beam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, beamLength, 10),
                new THREE.MeshBasicMaterial({
                    color: 0xa7e6ff,
                    transparent: true,
                    opacity: 0.26,
                    depthWrite: false
                })
            );
            beam.position.y = -(beamLength * 0.5);
            unit.add(beam);

            const footprint = new THREE.Mesh(
                new THREE.RingGeometry(0.52, 0.68, 24),
                new THREE.MeshBasicMaterial({
                    color: 0xa7e6ff,
                    transparent: true,
                    opacity: 0.42,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            footprint.rotation.x = -Math.PI / 2;
            footprint.position.y = -baseY + 0.045;
            unit.add(footprint);

            const footprintBox = new THREE.Mesh(
                new THREE.PlaneGeometry(this.cellSize * 0.8, this.cellSize * 0.8),
                new THREE.MeshBasicMaterial({
                    color: 0x9edfff,
                    transparent: true,
                    opacity: 0.12,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            footprintBox.rotation.x = -Math.PI / 2;
            footprintBox.position.y = -baseY + 0.03;
            unit.add(footprintBox);
        }

        const miniature = this.createUnitMiniature(type, player);
        miniature.position.set(-0.04, 0.18, 0);
        unit.add(miniature);

        const placard = this.createUnitPlacard(type, player);
        placard.position.set(0.23, 0.14, -0.18);
        unit.add(placard);
        unit.userData.placard = placard;

        this.scene.add(unit);
        this.updatePlacardFacing(placard);
        return unit;
    }

    updatePlacardFacing(placard) {
        if (!placard || !placard.parent) {
            return;
        }

        const cameraPosition = this.camera.position.clone();
        placard.parent.worldToLocal(cameraPosition);
        placard.lookAt(cameraPosition);
    }

    updateUnitPlacards() {
        [...this.units, ...this.airUnits].forEach((unit) => {
            this.updatePlacardFacing(unit.userData.placard);
        });
    }

    moveUnit(unit, targetX, targetZ) {
        const domain = unit.userData.domain || 'ground';
        const grid = this.getGridByLayer(domain);
        const oldX = unit.userData.x;
        const oldZ = unit.userData.z;

        grid[oldX][oldZ].unit = null;
        grid[targetX][targetZ].unit = unit;
        this.movementAnimations = this.movementAnimations.filter((animation) => animation.unit !== unit);
        this.movementAnimations.push({
            unit,
            startX: unit.position.x,
            startY: unit.position.y,
            startZ: unit.position.z,
            endX: this.toWorldCoord(targetX),
            endY: domain === 'air' ? this.airLayerHeight + 0.42 : 0.42,
            endZ: this.toWorldCoord(targetZ),
            startTime: performance.now(),
            duration: 350
        });
        unit.userData.x = targetX;
        unit.userData.z = targetZ;
        unit.userData.moved = true;

        if (unit.userData.type === 'droneKamikaze' && domain === 'air') {
            const groundTarget = this.grid[targetX]?.[targetZ]?.unit;
            if (groundTarget && groundTarget.userData.player !== unit.userData.player) {
                this.resolveImmediateKamikazeStrike(unit, groundTarget);
                return;
            }
        }

        this.deselectUnit(false);
        this.updateUI();
    }

    resolveImmediateKamikazeStrike(drone, target) {
        this.createExplosionAt(drone.position.clone(), 0xff8c5a);
        this.createExplosionAt(target.position.clone(), 0xffd166);
        this.removeUnit(drone);
        this.removeUnit(target);
        this.losses[drone.userData.player] += 1;
        this.losses[target.userData.player] += 1;
        this.addLog('БПЛА-камікадзе одразу уразив ціль під собою.', 'combat-log');
        this.deselectUnit(false);
        this.checkVictory();
        this.updateUI();
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
                [...this.units, ...this.airUnits].forEach((unit) => {
                    unit.userData.moved = false;
                });
                this.activeLayer = 'ground';
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
                [...this.units, ...this.airUnits]
                    .filter((unit) => unit.userData.player === 2)
                    .forEach((unit) => {
                        unit.userData.moved = false;
                    });
            } else {
                this.turnNumber += 1;
                this.currentPlayer = 1;
                [...this.units, ...this.airUnits]
                    .filter((unit) => unit.userData.player === 1)
                    .forEach((unit) => {
                        unit.userData.moved = false;
                    });
                this.activeLayer = 'ground';
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
        this.activeLayer = this.getDomainForType(unplacedUnits[0].type);
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
                const layer = this.getDomainForType(unit.type) === 'air' ? 'air' : 'ground';
                return `<span class="unit-badge">${unit.config.name} [${layer}] (${status})</span>`;
            }).join('');
        });
    }

    updateMouseFromEvent(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    getCellMeshes() {
        return this.getGridByLayer(this.getInteractionLayer()).flat().map((cell) => cell.mesh);
    }

    getPointerTarget() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.phase === 'battle') {
            const unitHits = this.raycaster.intersectObjects(this.getUnitsByLayer(this.activeLayer), true);
            if (unitHits.length > 0) {
                return { kind: 'unit', object: this.getUnitRoot(unitHits[0].object) };
            }
        }

        const cellHits = this.raycaster.intersectObjects(this.getCellMeshes(), false);
        if (cellHits.length > 0) {
            const cell = cellHits[0].object;
            const interactionLayer = this.getInteractionLayer();
            if (cell.userData.layer === interactionLayer) {
                return { kind: 'cell', object: cell };
            }
        }

        if (this.phase === 'placement') {
            return null;
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
        const isAir = cell.userData.layer === 'air';
        const grid = this.getGridByLayer(cell.userData.layer);
        const fog = grid[x][z].fog;
        const baseColor = (x + z) % 2 === 0
            ? (isAir ? 0x4b768b : 0x4A5F4A)
            : (isAir ? 0x5a8ea6 : 0x5A6F5A);

        cell.material.color.setHex(baseColor);
        if (this.phase === 'placement') {
            cell.material.opacity = this.getInteractionLayer() === cell.userData.layer ? 0.28 : 0.08;
            if (fog) {
                fog.visible = false;
                fog.material.opacity = 0;
                if (fog.userData.marker) {
                    fog.userData.marker.material.opacity = 0;
                }
            }
            return;
        }

        if (this.phase === 'battle') {
            const isVisible = this.isCellVisibleToPlayer(x, z);
            if (!isVisible) {
                const isActiveLayer = cell.userData.layer === this.activeLayer;
                cell.material.opacity = isActiveLayer ? (isAir ? 0.07 : 0.09) : 0.015;
                if (fog) {
                    fog.visible = isActiveLayer;
                    fog.material.opacity = isActiveLayer ? fog.userData.baseOpacity : 0;
                    if (fog.userData.marker) {
                        fog.userData.marker.material.opacity = isActiveLayer ? fog.userData.markerOpacity : 0;
                    }
                }
                return;
            }

            cell.material.opacity = this.activeLayer === cell.userData.layer
                ? (isAir ? 0.2 : 0.18)
                : 0.06;
            if (fog) {
                fog.visible = false;
                fog.material.opacity = 0;
                if (fog.userData.marker) {
                    fog.userData.marker.material.opacity = 0;
                }
            }
            return;
        }

        cell.material.opacity = isAir ? 0.12 : 0.18;
        if (fog) {
            fog.visible = false;
            fog.material.opacity = 0;
            if (fog.userData.marker) {
                fog.userData.marker.material.opacity = 0;
            }
        }
    }

    clearMovementHighlights() {
        ['ground', 'air'].forEach((layer) => {
            const grid = this.getGridByLayer(layer);
            for (let x = 0; x < this.gridSize; x++) {
                for (let z = 0; z < this.gridSize; z++) {
                    this.resetCellAppearance(grid[x][z].mesh);
                }
            }
        });
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
        const grid = this.getGridByLayer(unit.userData.domain);
        this.selectedCell = grid[unit.userData.x][unit.userData.z].mesh;
        this.showMovementHighlights(unit);
        this.addLog(`Вибрано: ${this.config.unitTypes[unit.userData.type].name}`, 'move-log');
    }

    showMovementHighlights(unit) {
        this.clearMovementHighlights();

        const grid = this.getGridByLayer(unit.userData.domain);
        const originCell = grid[unit.userData.x][unit.userData.z].mesh;
        originCell.material.color.setHex(0xFF6B35);
        originCell.material.opacity = 0.45;

        const unitX = unit.userData.x;
        const unitZ = unit.userData.z;
        const maxDistance = this.config.unitTypes[unit.userData.type].movement;

        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
                if (distance > 0 && distance <= maxDistance && grid[x][z].unit === null) {
                    const cell = grid[x][z].mesh;
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
        const grid = this.getGridByLayer(this.selectedUnit.userData.domain);

        if (distance === 0) {
            this.deselectUnit(true);
            return;
        }

        if (distance > maxDistance) {
            this.addLog('Занадто далеко для цієї фішки!', 'combat-log');
            return;
        }

        if (grid[x][z].unit !== null) {
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
            [...this.units, ...this.airUnits].forEach((unit) => {
                unit.userData.moved = false;
            });
            this.activeLayer = 'ground';
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
        const attackerCollection = this.getUnitsByLayer(attacker.userData.domain);
        const defenderCollection = this.getUnitsByLayer(defender.userData.domain);
        if (!attackerCollection.includes(attacker) || !defenderCollection.includes(defender)) {
            return;
        }

        const attackerPower = attacker.userData.strength;
        const defenderPower = defender.userData.strength;
        const mode = battle.mode || 'melee';

        if (mode === 'kamikazeStrike') {
            this.removeUnit(attacker);
            this.removeUnit(defender);
            this.losses[attacker.userData.player] += 1;
            this.losses[defender.userData.player] += 1;
            this.addLog('БПЛА-камікадзе знищив ціль під собою.', 'combat-log');
            this.checkVictory();
            return;
        }

        if (mode === 'rangedStrike') {
            defender.userData.hitpoints -= attackerPower;
            this.addLog(`${this.config.unitTypes[attacker.userData.type].name} атакує ціль на дистанції.`, 'combat-log');
            if (defender.userData.hitpoints <= 0) {
                this.removeUnit(defender);
                this.losses[defender.userData.player] += 1;
            }
            this.checkVictory();
            return;
        }

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

        const unitCollection = this.getUnitsByLayer(unit.userData.domain);
        const index = unitCollection.indexOf(unit);
        if (index > -1) {
            unitCollection.splice(index, 1);
        }

        const grid = this.getGridByLayer(unit.userData.domain);
        if (grid[unit.userData.x] && grid[unit.userData.x][unit.userData.z]) {
            grid[unit.userData.x][unit.userData.z].unit = null;
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
        this.updateUnitPlacards();
        if (this.phase === 'battle') {
            this.applyFogOfWar();
        }
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
        if (this.fogAnimations.length > 0) {
            const t = performance.now() * 0.001;
            this.fogAnimations.forEach((fog) => {
                if (!fog.mesh.parent) {
                    return;
                }

                fog.mesh.position.y = fog.baseY + Math.sin(t + fog.phase) * 0.03;
                fog.mesh.material.opacity = fog.mesh.visible
                    ? fog.mesh.material.opacity * 0.96 + fog.baseOpacity * 0.04
                    : 0;
                if (fog.mesh.userData.marker) {
                    const markerBaseOpacity = fog.mesh.userData.markerOpacity || 0.75;
                    fog.mesh.userData.marker.material.opacity = fog.mesh.visible
                        ? fog.mesh.userData.marker.material.opacity * 0.9 + markerBaseOpacity * 0.1
                        : 0;
                }
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

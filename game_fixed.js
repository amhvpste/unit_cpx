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
        
        // Події
        this.setupEventListeners();
        
        // Завантаження конфігурації
        this.loadConfig();
        
        // Освітлення
        this.setupLighting();
        
        // Створення сітки
        this.createGrid();
        
        // Камера
        this.updateCameraPosition();
        
        // UI
        this.updateUI();
        
        // Початок анімації
        this.animate();
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
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
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
                cell.position.set(x * this.cellSize, 0, z * this.cellSize);
                cell.receiveShadow = true;
                cell.userData = { type: 'cell', x: x, z: z };
                
                this.scene.add(cell);
                this.grid[x][z] = { mesh: cell, unit: null };
            }
        }
        
        // Створення ліній сітки
        const gridHelper = new THREE.GridHelper(this.gridSize * this.cellSize, this.cellSize);
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
            
            if (targetObject.userData.type === 'cell') {
                const x = targetObject.userData.x;
                const z = targetObject.userData.z;
                this.handleCellClick(x, z);
            } else if (targetObject.userData.player) {
                this.handleUnitClick(targetObject);
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
        unit.position.set(x * this.cellSize, 0.4, z * this.cellSize);
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
    
    moveUnit(unit, newX, newZ) {
        const oldX = unit.userData.x;
        const oldZ = unit.userData.z;
        
        // Оновлення сітки
        this.grid[oldX][oldZ].unit = null;
        this.grid[newX][newZ].unit = unit;
        
        // Оновлення позиції фішки
        unit.position.set(newX * this.cellSize, 0.4, newZ * this.cellSize);
        unit.userData.x = newX;
        unit.userData.z = newZ;
        unit.userData.moved = true;
        
        // Перевірка на бій
        const targetUnit = this.grid[newX][newZ].unit;
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
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск гри
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new AdmiralGame();
});

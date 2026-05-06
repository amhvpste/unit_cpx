// Основна гра тактичної симуляції на Three.js
class AdmiralGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x718ea1);
        this.scene.fog = null;
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadow;
        this.renderer.setClearColor(0x000000, 0);
        
        document.getElementById('gameCanvas').appendChild(this.renderer.domElement);
        
        // Ігрові параметри
        this.gridSize = 100;
        this.cellSize = 1;
        this.grid = [];
        this.occupiedCells = new Map();
        this.cellPickPlane = null;
        this.groundMesh = null;
        this.terrainFrameMeshes = [];
        this.mapHeightData = null;
        this.mapHeightSize = 128;
        this.terrainHeightScale = 1.65;
        this.cellHighlightMeshes = [];
        this.orderTaskMarkerMeshes = [];
        this.units = [];
        this.selectedUnit = null;
        this.selectedCell = null;
        
        // Стани гри
        this.currentPlayer = 1;
        this.phase = 'order'; // 'order', 'placement', 'battle', 'gameOver'
        this.playerMoney = { 1: 1000, 2: 1000 };
        this.playerMoves = { 1: 3, 2: 3 };
        this.placementPhase = { 1: false, 2: false };
        this.losses = { 1: 0, 2: 0 };
        this.turnNumber = 1;
        this.battleAnimations = [];
        this.battleEffects = [];
        this.isAnimatingBattles = false;
        this.purchasedUnits = { 1: [], 2: [] };
        this.sessionOrder = {
            environment: {
                terrain: 'urban edge',
                weather: 'clear',
                light: 'day'
            },
            mission: {
                1: 'Seize the assigned line',
                2: 'Hold the assigned area'
            },
            commandMode: 'local-hotseat',
            activeTaskSide: 1,
            activeTaskTag: 'seize',
            tasks: []
        };

        this.orderTaskTags = {
            seize: { label: 'Захопити', color: 0x4caf50 },
            hold: { label: 'Утримати', color: 0xff9800 },
            defend: { label: 'Обороняти', color: 0x2196f3 },
            recon: { label: 'Розвідати', color: 0x9cdbff }
        };
        this.stlLoader = null;
        this.gltfLoader = null;
        this.stlModelCache = {};
        this.gltfModelCache = {};
        this.unitPreviewCache = {};
        this.unitPreviewLoading = new Set();
        this.referenceModelUnitsLoaded = false;
        this.referenceModelUnitsLoading = false;
        this.referenceTaskModels = [];
        this.referenceTerrainModels = [];
        this.unitModelPaths = {
            infantry: 'references/W79861_DA_Набір_знаків_APP_6_140_наказ_для_нанесення_тактичних_обставин/1734504_W79861_app6_updated/02 Союзна зброя/58-1-strilets.stl',
            armor: 'references/W79861_DA_Набір_знаків_APP_6_140_наказ_для_нанесення_тактичних_обставин/1734504_W79861_app6_updated/03 Союзна техніка/66-1-tank.stl',
            artillery: 'references/W79861_DA_Набір_знаків_APP_6_140_наказ_для_нанесення_тактичних_обставин/1734504_W79861_app6_updated/01 Союзні підрозділи/25-1-samokhidna-artyleriiska-batareia.stl',
            command: 'references/W79861_DA_Набір_знаків_APP_6_140_наказ_для_нанесення_тактичних_обставин/1734504_W79861_app6_updated/01 Союзні підрозділи/51-1-ksp-mekhanizovanoho-vzvodu.stl',
            scout: 'references/W79861_DA_Набір_знаків_APP_6_140_наказ_для_нанесення_тактичних_обставин/1734504_W79861_app6_updated/01 Союзні підрозділи/7-1-rozviduvalne-viddilennia.stl',
            sniper: null
        };
        this.unitModelPaths = {
            infantry: null,
            armor: null,
            artillery: null,
            command: null,
            scout: null,
            sniper: null
        };
        this.movementAnimations = [];
        
        // Керування камерою
        this.cameraDistance = 80;
        this.cameraAngle = 0;
        this.cameraHeight = 110;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.mapPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
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
    
    loadReferenceModelUnits() {
        if (this.referenceModelUnitsLoaded || this.referenceModelUnitsLoading || !this.config) return;

        this.referenceModelUnitsLoading = true;
        fetch('/api/reference-models')
            .then((response) => response.ok ? response.json() : [])
            .then((models) => {
                const unitModels = models.filter((model) => this.isReferenceUnitModel(model));
                this.referenceTaskModels = models.filter((model) => this.isReferenceTaskModel(model));
                this.referenceTerrainModels = models.filter((model) => this.isReferenceTerrainModel(model));
                this.bindBaseUnitModelPaths(unitModels);
                const baseModelPaths = new Set(Object.values(this.unitModelPaths).filter(Boolean));

                unitModels.forEach((model, index) => {
                    if (baseModelPaths.has(model.path)) return;
                    const unitType = `ref_${index}_${this.slugifyModelName(model.name)}`;
                    if (this.config.unitTypes[unitType]) return;

                    this.config.unitTypes[unitType] = this.createReferenceUnitConfig(model);
                    this.unitModelPaths[unitType] = model.path;
                });

                this.referenceModelUnitsLoaded = true;
                this.referenceModelUnitsLoading = false;
                this.addLog(`STL: ${unitModels.length} юнітів, ${this.referenceTaskModels.length} знаків задач, ${this.referenceTerrainModels.length} об'єктів місцевості`, 'place-log');
                this.updateUI();
            })
            .catch(() => {
                this.referenceModelUnitsLoading = false;
                this.addLog('STL-каталог недоступний, використовується базовий набір моделей', 'combat-log');
            });
    }

    bindBaseUnitModelPaths(unitModels) {
        const matchByName = (pattern) => {
            const model = unitModels.find((candidate) => pattern.test(candidate.name.toLowerCase()));
            return model ? model.path : null;
        };
        const matchById = (id) => {
            const model = unitModels.find((candidate) => candidate.id === id);
            return model ? model.path : null;
        };
        const matchExactName = (names) => {
            const normalizedNames = names.map((name) => name.toLowerCase());
            for (const name of normalizedNames) {
                const model = unitModels.find((candidate) => candidate.name.toLowerCase() === name);
                if (model) return model.path;
            }
            return null;
        };

        this.unitModelPaths.infantry = matchById('infantry-standing')
            || matchExactName(['Soltat_stoiachi.glb', 'Soldat_na_kolintsi.glb', 'Soldat_lezhachi.glb'])
            || matchByName(/58-1-strilets|pikhotne-viddilennia|infantry/);
        this.unitModelPaths.armor = matchById('tank')
            || matchExactName(['Tank.glb'])
            || matchByName(/66-1-tank|tank\.(stl|glb)/);
        this.unitModelPaths.artillery = matchById('himars')
            || matchExactName(['Himars_1.glb', 'M777_A.glb', 'Grad.glb'])
            || matchByName(/25-1-samokhidna-artyleriiska-batareia|artyleri|m777|grad|himars/);
        this.unitModelPaths.command = matchById('signalman')
            || matchExactName(['Zviazkivets.glb'])
            || matchByName(/51-1-ksp-mekhanizovanoho-vzvodu|ksp|kp_/);
        this.unitModelPaths.scout = matchById('bpla-operators')
            || matchExactName(['BPLA_operators.glb', 'mavik.glb'])
            || matchByName(/7-1-rozviduvalne-viddilennia|rozvid|bpla|uav/);
        this.unitModelPaths.sniper = matchById('sniper')
            || matchExactName(['snajperPr.glb', 'snajperr.glb'])
            || matchByName(/snajper|sniper/);
    }

    isReferenceUnitModel(model) {
        if (model.role) return model.role === 'unit';

        const key = `${model.name} ${model.category} ${model.path}`.toLowerCase();
        if (/\/arrows\//.test(key) || /08 .*arrows/.test(key)) return false;
        if (/nastup|ataka|napriam|rubizh|styk|perednii|zasidka|rozvidka boiem|vohnevyi|planuvalnyy/.test(key)) return false;
        if (/minne|zahorod|drotiane|transhey|blindazh|orientyr|vysota|sposterezhnii|plashka/.test(key)) return false;
        return /\/machinery\/|\/soldiers\/|\/0[1-6] [^/]+\//.test(key);
    }

    isReferenceTaskModel(model) {
        if (model.role) return model.role === 'task';

        const key = `${model.name} ${model.category} ${model.path}`.toLowerCase();
        return /\/arrows\//.test(key)
            || /08 .*arrows/.test(key)
            || /nastup|ataka|napriam|rubizh|styk|perednii|zasidka|rozvidka boiem|vohnevyi|planuvalnyy/.test(key);
    }

    isReferenceTerrainModel(model) {
        if (model.role) return model.role === 'terrain';

        const key = `${model.name} ${model.category} ${model.path}`.toLowerCase();
        return /\/buildings\/|\/environment\//.test(key)
            || /minne|zahorod|drotiane|transhey|blindazh|orientyr|vysota|sposterezhnii|plashka/.test(key);
    }

    slugifyModelName(name) {
        return name
            .replace(/\.[^.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 42) || 'model';
    }

    humanizeModelName(name) {
        return name
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    createReferenceUnitConfig(model) {
        const key = `${model.name} ${model.category} ${model.path}`.toLowerCase();
        const config = {
            name: this.humanizeModelName(model.name),
            cost: 0,
            hitpoints: 2,
            strength: 2,
            movement: 1,
            model: /\.glb$/i.test(model.path) ? 'glb' : 'stl',
            description: `${/\.glb$/i.test(model.path) ? 'GLB' : 'STL'}: ${model.category}`,
            referencePath: model.path,
            referenceCategory: model.category
        };

        if (/tank|танк/.test(key)) {
            Object.assign(config, { hitpoints: 6, strength: 6, movement: 2, description: 'Танк / броньована ударна одиниця' });
        } else if (/bmp|btr|брон|mechaniz|mekhaniz|механ/.test(key)) {
            Object.assign(config, { hitpoints: 4, strength: 4, movement: 2, description: 'Механізований підрозділ / бронегрупа' });
        } else if (/samokhidna|artyleri|artyl|dyvizion|battery|batareia|арт/.test(key)) {
            Object.assign(config, { hitpoints: 3, strength: 6, movement: 1, description: 'Артилерія / вогнева підтримка' });
        } else if (/minomet|mortar|міном/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 4, movement: 1, description: 'Мінометний підрозділ' });
        } else if (/bpla|uav|drone|бпла|rozvid|розвід/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 1, movement: 3, description: 'Розвідка / спостереження' });
        } else if (/ksp|kp_|command|komand|команд/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 1, movement: 1, description: 'КСП / командний пункт' });
        } else if (/ptrk|птрк|protytank/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 5, movement: 1, description: 'Протитанковий засіб' });
        } else if (/kulemet|machine gun|кулем/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 3, movement: 1, description: 'Кулеметний розрахунок' });
        } else if (/sniper|снайп/.test(key)) {
            Object.assign(config, { hitpoints: 1, strength: 4, movement: 1, description: 'Снайпер / точкова вогнева дія' });
        } else if (/strilets|pihot|pikhot|infantry|піх|стріл/.test(key)) {
            Object.assign(config, { hitpoints: 2, strength: 2, movement: 1, description: 'Піхота / стрілецький підрозділ' });
        } else if (/mine|minne|tm-62|wire|barbed|blindazh|okop|trench|rubizh|arrow|napriam|ataka|загород|рубіж|стріл/.test(key)) {
            Object.assign(config, { hitpoints: 1, strength: 0, movement: 0, description: 'Інженерний / тактичний маркер місцевості' });
        }

        return config;
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
                    opacity: this.getGridBaseOpacity()
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
            this.cameraHeight = Math.max(2, Math.min(180, this.cameraHeight - deltaY * 0.25));
            
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
        const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
        this.cameraDistance = Math.max(3, Math.min(160, this.cameraDistance * zoomFactor));
        this.cameraHeight = Math.max(2, Math.min(180, this.cameraHeight * zoomFactor));
        this.updateCameraPosition();
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
        if (this.getGridCell(x, z).unit !== null) {
            this.addLog('Клітинка зайнята!', 'combat-log');
            return;
        }
        
        // Перевірка чи це зона розміщення для поточного гравця
        const validPlacement = true;
        if (!validPlacement) {
            this.addLog('Розміщення дозволено тільки у вашій зоні!', 'combat-log');
            return;
        }
        
        // Перевірка чи є підрозділ зі складу бойового наказу для розміщення
        const unplacedUnit = this.purchasedUnits[this.currentPlayer].find(u => !u.placed);
        if (!unplacedUnit) {
            this.addLog('Спочатку додайте підрозділ до складу бойового наказу.', 'combat-log');
            return;
        }
        
        // Створення фішки
        const unit = this.createUnit(unplacedUnit.type, x, z, this.currentPlayer);
        
        // Оновлення сітки
        this.getGridCell(x, z).unit = unit;
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
        this.getGridCell(oldX, oldZ).unit = null;
        this.getGridCell(targetX, targetZ).unit = unit;
        
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
        if (this.phase === 'order') {
            // Перехід до фази розміщення
            this.startPlacement();
        } else if (this.phase === 'placement') {
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Player ${this.currentPlayer} finished placement.`, 'place-log');

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.phase = 'placement';
                this.placementPhase[2] = true;
                this.addLog('Player 2 starts placement from the approved battle order.', 'place-log');
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
            this.addLog('Define at least one unit in the battle order before placement.', 'combat-log');
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
        this.occupiedCells.clear();
        this.clearMovementHighlights();
        this.orderTaskMarkerMeshes.forEach((mesh) => this.scene.remove(mesh));
        this.orderTaskMarkerMeshes = [];
        
        // Скидання станів гри
        this.currentPlayer = 1;
        this.phase = 'order';
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
        
        this.addLog('Сесію скинуто. Сформуйте бойовий наказ і склад сторін.', 'place-log');
        this.updateUI();
    }
    
    getBoardCenterOffset() {
        return 0;
    }

    getGridBaseOpacity() {
        return this.gridSize >= 80 ? 0.035 : 0.18;
    }

    cellKey(x, z) {
        return `${x}:${z}`;
    }

    getGridCell(x, z) {
        const key = this.cellKey(x, z);
        if (!this.occupiedCells.has(key)) {
            this.occupiedCells.set(key, { mesh: null, unit: null });
        }
        return this.occupiedCells.get(key);
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
        if (this.config && !this.referenceModelUnitsLoaded && !this.referenceModelUnitsLoading) {
            this.loadReferenceModelUnits();
        }

        // Оновлення інформації про гравців
        const player1Units = this.units.filter(u => u.userData.player === 1).length;
        const player2Units = this.units.filter(u => u.userData.player === 2).length;
        
        document.getElementById('player1Units').textContent = player1Units;
        document.getElementById('player2Units').textContent = player2Units;
        document.getElementById('player1Moves').textContent = this.playerMoves[1];
        document.getElementById('player2Moves').textContent = this.playerMoves[2];
        document.getElementById('player1Losses').textContent = `Втрати: ${this.losses[1]}`;
        document.getElementById('player2Losses').textContent = `Втрати: ${this.losses[2]}`;
        
        // Оновлення ресурсного стану сторін
        document.getElementById('player1Money').textContent = 'базовий';
        document.getElementById('player2Money').textContent = 'базовий';
        
        // Показуємо/ховаємо панелі залежно від фази
        if (this.phase === 'order') {
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
        if (this.phase !== 'order') {
            document.getElementById('player1Info').classList.toggle('active-player', this.currentPlayer === 1);
            document.getElementById('player2Info').classList.toggle('active-player', this.currentPlayer === 2);
        }
        
        // Оновлення стану гри
        const phaseText = this.phase === 'order' ? 'Бойовий наказ' : 
                         this.phase === 'placement' ? 'Розміщення фішок' : 
                         this.phase === 'battle' ? 'Битва' : 
                         this.phase === 'gameOver' ? 'Гру завершено' : 'Невідомий стан';
        document.getElementById('currentPhase').textContent = phaseText;
        
        // Оновлення центрової інформації про хід
        const currentTurnElement = document.getElementById('currentTurn');
        if (this.phase === 'gameOver') {
            currentTurnElement.textContent = 'Гру завершено!';
            currentTurnElement.style.color = '#ff6b6b';
        } else if (this.phase === 'order') {
            currentTurnElement.textContent = 'Налаштування сесії: бойовий наказ';
            currentTurnElement.style.color = this.currentPlayer === 1 ? '#4CAF50' : '#FF9800';
        } else {
            currentTurnElement.textContent = `Ваш хід - Гравець ${this.currentPlayer}`;
            currentTurnElement.style.color = this.currentPlayer === 1 ? '#4CAF50' : '#FF9800';
        }
        document.getElementById('turnCount').textContent = `Хід №${this.turnNumber}`;
        
        // Оновлення панелі бойового наказу
        const shopCurrentPlayer = document.getElementById('shopCurrentPlayer');
        const shopMoneyInfo = document.getElementById('shopMoneyInfo');

        if (this.phase === 'order') {
            document.getElementById('currentPhase').textContent = 'Бойовий наказ';
            currentTurnElement.textContent = 'Налаштування сесії: бойовий наказ';
            currentTurnElement.style.color = '#FFD700';
            if (shopCurrentPlayer) {
                shopCurrentPlayer.textContent = 'Локальний прототип: гравці працюють по черзі з одного акаунту';
            }
            if (shopMoneyInfo) {
                shopMoneyInfo.textContent = 'Сформуйте склад сторін і затвердьте наказ перед розміщенням';
            }
        }

        this.updateShopUI();
        
        // Оновлення доступних фішок
        this.updateAvailableUnitsUI();
        
        // Оновлення кольорів кнопок
        this.updateButtonColors();
        
        // Кнопки - активні тільки в правильний час
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (this.phase === 'order') {
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'Затвердити наказ і перейти до розміщення';
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
        if (this.phase === 'order') {
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'Затвердити наказ і перейти до розміщення';
        }

        if (this.selectedUnit) {
            this.showMovementHighlights(this.selectedUnit);
        }
    }
    
    updateShopUI() {
        const shopContent = document.getElementById('shopContent');
        if (!this.config || this.phase !== 'order') {
            shopContent.innerHTML = '';
            return;
        }

        const sideButtons = [1, 2].map((side) => {
            const activeClass = this.sessionOrder.activeTaskSide === side ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setOrderTaskSide(${side})">Сторона ${side}</button>`;
        }).join('');
        const tagButtons = Object.entries(this.orderTaskTags).map(([tag, config]) => {
            const activeClass = this.sessionOrder.activeTaskTag === tag ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setOrderTaskTag('${tag}')">${config.label}</button>`;
        }).join('');
        const taskList = this.sessionOrder.tasks.length === 0
            ? '<div class="units-list-empty">Оберіть тег завдання і клікніть клітинки на карті</div>'
            : this.sessionOrder.tasks.map((task, index) => `
                <span class="unit-badge">${index + 1}. Сторона ${task.side}: ${this.orderTaskTags[task.tag].label}: (${task.x}, ${task.z})</span>
            `).join('');
        const unitCards = Object.entries(this.config.unitTypes).map(([unitType, unitConfig]) => {
            const modelMeta = this.getUnitModelMeta(unitType, unitConfig);
            return `
            <div class="shop-item">
                <h5>${unitConfig.name}</h5>
                <div class="details">
                    <div class="unit-model-panel">
                        <div class="unit-model-preview" data-unit-type="${this.escapeHtml(unitType)}">${/\.glb$/i.test(modelMeta.path) ? 'GLB' : (/\.stl$/i.test(modelMeta.path) ? 'STL' : 'N/A')}</div>
                        <div class="unit-model-meta">
                            <div class="unit-model-name" title="${this.escapeHtml(modelMeta.name)}">${this.escapeHtml(modelMeta.name)}</div>
                            <div>${this.escapeHtml(modelMeta.category)}</div>
                            <div class="unit-model-path" title="${this.escapeHtml(modelMeta.path)}">${this.escapeHtml(modelMeta.path)}</div>
                        </div>
                    </div>
                    <div>Живучість: ${unitConfig.hitpoints}</div>
                    <div>Вогнева потужність: ${unitConfig.strength}</div>
                    <div>Маневреність: ${unitConfig.movement} кл.</div>
                    <div>${unitConfig.description}</div>
                    <div class="order-actions">
                        <button class="player1-btn" onclick="event.stopPropagation(); game.assignUnitToOrder('${unitType}', 1)">Сторона 1</button>
                        <button class="player2-btn" onclick="event.stopPropagation(); game.assignUnitToOrder('${unitType}', 2)">Сторона 2</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        shopContent.innerHTML = `
            <div class="shop-item order-planner">
                <h5>Завдання на карті</h5>
                <div class="details">
                    <div>1. Оберіть сторону і тег завдання</div>
                    <div>2. Клікніть область / клітинку на карті</div>
                    <div>3. Задача буде прив'язана до координати для вибраної сторони</div>
                    <div class="order-tags">${sideButtons}</div>
                    <div class="order-tags">${tagButtons}</div>
                    <div class="units-list">
                        <div class="units-list-title">Прив'язані задачі</div>
                        <div>${taskList}</div>
                    </div>
                </div>
            </div>
            ${unitCards}
        `;
        this.setupUnitCardPreviews();
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getUnitModelMeta(unitType, unitConfig) {
        const path = this.unitModelPaths[unitType] || unitConfig.referencePath || '';
        if (!path) {
            return {
                name: 'Немає STL',
                category: 'fallback / без моделі',
                path: 'опис поки не привʼязаний до файлу'
            };
        }

        const parts = path.split('/');
        return {
            name: parts[parts.length - 1] || path,
            category: unitConfig.referenceCategory || parts[Math.max(0, parts.length - 2)] || 'STL',
            path
        };
    }

    setupUnitCardPreviews() {
        const previews = Array.from(document.querySelectorAll('.unit-model-preview'));
        previews.slice(0, 6).forEach((element) => this.renderUnitCardPreview(element));
        previews.forEach((element) => {
            element.addEventListener('mouseenter', () => this.renderUnitCardPreview(element), { once: true });
        });
    }

    renderUnitCardPreview(element) {
        const unitType = element.dataset.unitType;
        const modelPath = this.unitModelPaths[unitType];
        if (!modelPath || element.dataset.rendered === '1' || this.unitPreviewLoading.has(modelPath)) {
            return;
        }

        if (this.unitPreviewCache[modelPath]) {
            element.innerHTML = `<img alt="model preview" src="${this.unitPreviewCache[modelPath]}">`;
            element.dataset.rendered = '1';
            return;
        }

        this.unitPreviewLoading.add(modelPath);
        element.textContent = 'loading';
        const finish = (object) => {
            try {
                const dataUrl = this.createUnitPreviewImage(object, 0x9be16f);
                this.unitPreviewCache[modelPath] = dataUrl;
                element.innerHTML = `<img alt="model preview" src="${dataUrl}">`;
                element.dataset.rendered = '1';
            } catch (error) {
                element.textContent = 'preview error';
            } finally {
                this.unitPreviewLoading.delete(modelPath);
            }
        };

        this.loadModelObject(
            modelPath,
            (object) => finish(object),
            () => {
                element.textContent = 'no preview';
                this.unitPreviewLoading.delete(modelPath);
            }
        );
    }

    createUnitPreviewImage(object, color) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1f3038);
        const camera = new THREE.PerspectiveCamera(32, 132 / 96, 0.01, 100);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
        renderer.setSize(264, 192, false);
        renderer.setPixelRatio(1);

        const preview = this.prepareLoadedModelForDisplay(object, color, 1.82, 1.45, true);
        preview.rotation.y -= Math.PI / 5;
        scene.add(preview);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x33424a, 0.92));
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(2, 3, 4);
        scene.add(keyLight);

        camera.position.set(2.2, 1.6, 2.6);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        renderer.dispose();
        if (renderer.forceContextLoss) {
            renderer.forceContextLoss();
        }
        if (renderer.domElement && renderer.domElement.remove) {
            renderer.domElement.remove();
        }
        return dataUrl;
    }

    ensureModelLoader(modelPath) {
        if (/\.glb$/i.test(modelPath)) {
            if (!this.gltfLoader && window.THREE && THREE.GLTFLoader) {
                this.gltfLoader = new THREE.GLTFLoader();
            }
            return this.gltfLoader;
        }

        if (!this.stlLoader && window.THREE && THREE.STLLoader) {
            this.stlLoader = new THREE.STLLoader();
        }
        return this.stlLoader;
    }

    loadModelObject(modelPath, onLoad, onError) {
        const isGlb = /\.glb$/i.test(modelPath);
        const cache = isGlb ? this.gltfModelCache : this.stlModelCache;
        const cached = cache[modelPath];

        if (cached) {
            onLoad(isGlb ? this.cloneModelObject(cached) : cached.clone());
            return;
        }

        const loader = this.ensureModelLoader(modelPath);
        if (!loader) {
            onError();
            return;
        }

        loader.load(
            encodeURI(modelPath),
            (asset) => {
                const object = isGlb ? asset.scene : asset;
                cache[modelPath] = object;
                onLoad(isGlb ? this.cloneModelObject(object) : object.clone());
            },
            undefined,
            onError
        );
    }

    cloneModelObject(object) {
        return object.clone(true);
    }

    prepareLoadedModelForDisplay(object, color, maxFootprint = 0.78, maxHeight = 0.82, centerY = false) {
        let displayObject;
        if (object.isBufferGeometry) {
            object.computeBoundingBox();
            object.computeVertexNormals();
            displayObject = new THREE.Mesh(
                object,
                new THREE.MeshPhongMaterial({
                    color,
                    emissive: 0x143014,
                    emissiveIntensity: 0.08,
                    shininess: 42,
                    specular: 0x1f1f1f
                })
            );
            return this.fitStlMeshToCell(displayObject, maxFootprint, maxHeight, centerY);
        }

        displayObject = object;
        displayObject.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshPhongMaterial({
                color,
                emissive: 0x143014,
                emissiveIntensity: 0.08,
                shininess: 42,
                specular: 0x1f1f1f
            });
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.geometry) {
                child.geometry.computeVertexNormals();
            }
        });
        this.fitObjectToCell(displayObject, maxFootprint, maxHeight, centerY);
        return displayObject;
    }

    fitObjectToCell(object, maxFootprint = 0.78, maxHeight = 0.82, centerY = false) {
        object.updateMatrixWorld(true);

        let box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const footprint = Math.max(size.x, size.z) || 1;
        const height = size.y || 1;
        object.scale.multiplyScalar(Math.min(maxFootprint / footprint, maxHeight / height));
        object.updateMatrixWorld(true);

        box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.x -= center.x;
        object.position.z -= center.z;
        object.position.y += centerY ? -center.y : 0.01 - box.min.y;
        object.updateMatrixWorld(true);
        return object;
    }

    fitStlMeshToCell(mesh, maxFootprint = 0.78, maxHeight = 0.82, centerY = false) {
        mesh.rotation.x = -Math.PI / 2;
        mesh.updateMatrixWorld(true);

        let box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const footprint = Math.max(size.x, size.z) || 1;
        const height = size.y || 1;
        mesh.scale.setScalar(Math.min(maxFootprint / footprint, maxHeight / height));
        mesh.updateMatrixWorld(true);

        box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        mesh.position.x -= center.x;
        mesh.position.z -= center.z;
        mesh.position.y += centerY ? -center.y : 0.01 - box.min.y;
        mesh.updateMatrixWorld(true);
        return mesh;
    }

    setOrderTaskTag(tag) {
        if (!this.orderTaskTags[tag]) return;
        this.sessionOrder.activeTaskTag = tag;
        this.addLog(`Активний тег завдання: ${this.orderTaskTags[tag].label}`, 'place-log');
        this.updateUI();
    }

    setOrderTaskSide(side) {
        if (![1, 2].includes(side)) return;
        this.sessionOrder.activeTaskSide = side;
        this.addLog(`Задачі призначаються для сторони ${side}`, 'place-log');
        this.updateUI();
    }

    addOrderTaskAtCell(x, z) {
        if (this.phase !== 'order') return;

        const tag = this.sessionOrder.activeTaskTag;
        const side = this.sessionOrder.activeTaskSide;
        const taskConfig = this.orderTaskTags[tag];
        const existingTask = this.sessionOrder.tasks.find((task) => task.x === x && task.z === z && task.side === side);
        if (existingTask) {
            existingTask.tag = tag;
        } else {
            this.sessionOrder.tasks.push({ side, tag, x, z });
        }

        this.renderOrderTaskMarkers();
        this.addLog(`Сторона ${side}: ${taskConfig.label} прив'язано до (${x}, ${z})`, 'place-log');
        this.updateUI();
    }

    renderOrderTaskMarkers() {
        this.orderTaskMarkerMeshes.forEach((mesh) => this.scene.remove(mesh));
        this.orderTaskMarkerMeshes = [];

        this.sessionOrder.tasks.forEach((task) => {
            const color = this.getUnitPalette(task.side).base;
            const marker = this.addCellHighlight(task.x, task.z, color, 0.48, 5, false);
            marker.userData.orderTask = task;
            this.orderTaskMarkerMeshes.push(marker);
        });
    }
    
    assignUnitToOrder(unitType, player) {
        if (this.phase !== 'order') return;

        const unitConfig = this.config.unitTypes[unitType];
        this.purchasedUnits[player].push({
            type: unitType,
            config: unitConfig,
            placed: false
        });

        this.addLog(`Сторона ${player}: додано ${unitConfig.name} до складу бойового наказу`, 'place-log');
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
        const groundWidth = this.gridSize * this.cellSize + 2;
        const groundDepth = this.gridSize * this.cellSize + 2;
        const groundX = this.getBoardCenterOffset();
        const groundZ = this.getBoardCenterOffset();
        const textureLoader = new THREE.TextureLoader();

        this.createTerrainFrame(groundWidth, groundDepth);

        textureLoader.load('testmap1.png', (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.repeat.set(1, 1);
            texture.needsUpdate = true;
            this.buildMapHeightData(texture.image);

            const ground = new THREE.Mesh(
                this.createReliefGeometry(groundWidth, groundDepth),
                new THREE.MeshLambertMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: false,
                    opacity: 1,
                    emissive: 0x111816,
                    emissiveIntensity: 0.12
                })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(groundX, 0, groundZ);
            ground.receiveShadow = true;
            ground.renderOrder = 0;
            this.groundMesh = ground;
            this.scene.add(ground);
            this.reseatMapObjects();
            console.log('Map texture loaded:', texture.image?.width, texture.image?.height);
        }, undefined, () => {
            const ground = new THREE.Mesh(
                this.createReliefGeometry(groundWidth, groundDepth),
                new THREE.MeshLambertMaterial({
                    color: 0x62785f,
                    side: THREE.DoubleSide,
                    transparent: false,
                    opacity: 1
                })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(groundX, 0, groundZ);
            ground.receiveShadow = true;
            ground.renderOrder = 0;
            this.groundMesh = ground;
            this.scene.add(ground);
            this.reseatMapObjects();
            console.error('Map texture failed: testmap1.png');
        });
    }

    createReliefGeometry(width, depth) {
        const segments = Math.min(240, Math.max(120, this.gridSize * 2));
        const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
        const positions = geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const worldZ = -positions.getY(i);
            positions.setZ(i, this.getTerrainHeightAtWorld(x, worldZ));
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    }

    createTerrainFrame(width, depth) {
        this.terrainFrameMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        this.terrainFrameMeshes = [];

        const material = new THREE.MeshLambertMaterial({
            color: 0x8a5d35,
            emissive: 0x1f1208,
            emissiveIntensity: 0.08
        });
        const borderHeight = 1.7;
        const borderThickness = 1.1;
        const y = borderHeight / 2 - 0.22;
        const longGeometry = new THREE.BoxGeometry(width + borderThickness * 2, borderHeight, borderThickness);
        const shortGeometry = new THREE.BoxGeometry(borderThickness, borderHeight, depth);

        [
            { geometry: longGeometry, x: 0, z: -depth / 2 - borderThickness / 2 },
            { geometry: longGeometry, x: 0, z: depth / 2 + borderThickness / 2 },
            { geometry: shortGeometry, x: -width / 2 - borderThickness / 2, z: 0 },
            { geometry: shortGeometry, x: width / 2 + borderThickness / 2, z: 0 }
        ].forEach((part) => {
            const mesh = new THREE.Mesh(part.geometry, material);
            mesh.position.set(part.x, y, part.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.renderOrder = -1;
            this.scene.add(mesh);
            this.terrainFrameMeshes.push(mesh);
        });

        const baseGeometry = new THREE.BoxGeometry(width + borderThickness * 2, 0.35, depth + borderThickness * 2);
        const base = new THREE.Mesh(baseGeometry, new THREE.MeshLambertMaterial({ color: 0x5c3b22 }));
        base.position.set(0, -0.34, 0);
        base.receiveShadow = true;
        base.renderOrder = -2;
        this.scene.add(base);
        this.terrainFrameMeshes.push(base);
    }

    buildMapHeightData(image) {
        const size = this.mapHeightSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;
        let height = new Float32Array(size * size);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const saturation = max === 0 ? 0 : (max - min) / max;
                const brightness = (r + g + b) / 3;

                const brownContour = r > 105 && r > g + 8 && g > b + 2 && saturation > 0.14 ? 1 : 0;
                const blackContour = brightness < 95 && saturation < 0.38 ? 0.55 : 0;
                const greenReliefTint = g > r + 6 && g > b + 2 ? 0.12 : 0;
                const waterLow = b > r + 18 && b > g + 8 ? -0.55 : 0;
                const urbanLow = brightness < 150 && Math.abs(r - g) < 14 && Math.abs(g - b) < 18 ? -0.10 : 0;

                height[y * size + x] = brownContour + blackContour + greenReliefTint + waterLow + urbanLow;
            }
        }

        height = this.blurHeightData(height, size, 7);
        height = this.normalizeHeightData(height);
        height = this.blurHeightData(height, size, 3);
        this.mapHeightData = height;
    }

    blurHeightData(source, size, passes) {
        let current = source;
        for (let pass = 0; pass < passes; pass++) {
            const next = new Float32Array(size * size);
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let total = 0;
                    let weight = 0;
                    for (let oy = -1; oy <= 1; oy++) {
                        for (let ox = -1; ox <= 1; ox++) {
                            const sx = Math.max(0, Math.min(size - 1, x + ox));
                            const sy = Math.max(0, Math.min(size - 1, y + oy));
                            const w = ox === 0 && oy === 0 ? 4 : (ox === 0 || oy === 0 ? 2 : 1);
                            total += current[sy * size + sx] * w;
                            weight += w;
                        }
                    }
                    next[y * size + x] = total / weight;
                }
            }
            current = next;
        }
        return current;
    }

    normalizeHeightData(source) {
        const sorted = Array.from(source).sort((a, b) => a - b);
        const low = sorted[Math.floor(sorted.length * 0.08)] ?? 0;
        const high = sorted[Math.floor(sorted.length * 0.94)] ?? 1;
        const range = Math.max(high - low, 0.0001);
        const normalized = new Float32Array(source.length);

        for (let i = 0; i < source.length; i++) {
            const value = Math.max(0, Math.min(1, (source[i] - low) / range));
            normalized[i] = Math.pow(value, 1.35);
        }

        return normalized;
    }

    getTerrainHeightAtWorld(worldX, worldZ) {
        if (!this.mapHeightData) {
            return 0;
        }

        const boardSize = this.gridSize * this.cellSize + 2;
        const u = Math.max(0, Math.min(1, (worldX / boardSize) + 0.5));
        const v = Math.max(0, Math.min(1, 0.5 - (worldZ / boardSize)));
        const size = this.mapHeightSize;
        const px = u * (size - 1);
        const py = v * (size - 1);
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const x1 = Math.min(size - 1, x0 + 1);
        const y1 = Math.min(size - 1, y0 + 1);
        const tx = px - x0;
        const ty = py - y0;
        const h00 = this.mapHeightData[y0 * size + x0];
        const h10 = this.mapHeightData[y0 * size + x1];
        const h01 = this.mapHeightData[y1 * size + x0];
        const h11 = this.mapHeightData[y1 * size + x1];
        const hx0 = h00 * (1 - tx) + h10 * tx;
        const hx1 = h01 * (1 - tx) + h11 * tx;
        return (hx0 * (1 - ty) + hx1 * ty) * this.terrainHeightScale;
    }

    getSurfaceYAtCell(x, z) {
        return this.getTerrainHeightAtWorld(this.toWorldCoord(x), this.toWorldCoord(z)) + 0.03;
    }

    reseatMapObjects() {
        this.units.forEach((unit) => {
            unit.position.y = this.getSurfaceYAtCell(unit.userData.x, unit.userData.z);
        });
        this.renderOrderTaskMarkers();
        if (this.selectedUnit) {
            this.showMovementHighlights(this.selectedUnit);
        }
    }

    createGrid() {
        this.grid = [];
        this.occupiedCells.clear();

        const boardSize = this.gridSize * this.cellSize;
        this.cellPickPlane = null;

        const gridHelper = new THREE.GridHelper(boardSize, this.gridSize, 0x1f3a45, 0x355866);
        gridHelper.position.set(this.getBoardCenterOffset(), 0.04, this.getBoardCenterOffset());
        const gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
        gridMaterials.forEach((material) => {
            material.transparent = true;
            material.opacity = 0.42;
            material.depthWrite = false;
            material.depthTest = false;
        });
        gridHelper.renderOrder = 3;
        this.scene.add(gridHelper);
    }

    getUnitPalette(player) {
        if (player === 1) {
            return {
                base: 0x4caf50,
                dark: 0x1f4d25,
                accent: '#b7f2a1',
                frame: 0x9be16f,
                model: 0x6fd15f,
                marker: 0xd7ffd0
            };
        }

        return {
            base: 0xff9800,
            dark: 0x7a3b00,
            accent: '#ffd08a',
            frame: 0xffb347,
            model: 0xffa21a,
            marker: 0xfff0c8
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

    attachReferenceModel(unit, type, player) {
        if (!window.THREE || !this.unitModelPaths[type]) {
            return;
        }

        const modelPath = this.unitModelPaths[type];
        const palette = this.getUnitPalette(player);
        const addModel = (object) => {
            const model = this.prepareLoadedModelForDisplay(object, palette.model, 0.76, 0.82, false);
            model.traverse((child) => {
                if (!child.isMesh) return;
                if (child.material && child.material.emissive) {
                    child.material.emissive.setHex(palette.dark);
                }
            });
            model.castShadow = true;
            model.receiveShadow = true;
            model.userData.isReferenceModel = true;
            unit.add(model);
        };

        this.loadModelObject(
            modelPath,
            (object) => {
                addModel(object);
                this.addLog(`Model loaded: ${type}`, 'place-log');
            },
            () => {
                this.addLog(`Model failed, using symbol fallback: ${type}`, 'combat-log');
            }
        );
    }

    createUnit(type, x, z, player) {
        const unitConfig = this.config.unitTypes[type];
        const palette = this.getUnitPalette(player);
        const unit = new THREE.Group();

        unit.position.set(this.toWorldCoord(x), this.getSurfaceYAtCell(x, z), this.toWorldCoord(z));
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

        this.attachReferenceModel(unit, type, player);

        this.scene.add(unit);
        return unit;
    }

    moveUnit(unit, targetX, targetZ) {
        const oldX = unit.userData.x;
        const oldZ = unit.userData.z;

        this.getGridCell(oldX, oldZ).unit = null;
        this.getGridCell(targetX, targetZ).unit = unit;
        this.movementAnimations = this.movementAnimations.filter((animation) => animation.unit !== unit);
        this.movementAnimations.push({
            unit,
            startX: unit.position.x,
            startY: unit.position.y,
            startZ: unit.position.z,
            endX: this.toWorldCoord(targetX),
            endY: this.getSurfaceYAtCell(targetX, targetZ),
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
        if (this.phase === 'order') {
            this.currentPlayer = 1;
            this.startPlacement();
            return;
        }

        if (this.phase === 'placement') {
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Player ${this.currentPlayer} finished placement.`, 'place-log');

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.phase = 'placement';
                this.placementPhase[2] = true;
                this.addLog('Player 2 starts placement from the approved battle order.', 'place-log');
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
            this.addLog('Define at least one unit in the battle order before placement.', 'combat-log');
            return;
        }

        this.phase = 'placement';
        this.placementPhase[this.currentPlayer] = true;
        this.addLog(`Player ${this.currentPlayer} starts placement from the approved order. Left to place: ${unplacedUnits.length}`, 'place-log');
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
                container.textContent = 'Склад ще не визначено';
                return;
            }

            container.className = '';
            container.innerHTML = units.map((unit) => {
                const status = unit.placed ? 'розміщено' : 'готовий';
                return `<span class="unit-badge">${unit.config.name} (${status})</span>`;
            }).join('');
        });
    }

    updateMouseFromEvent(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    getCellMeshes() {
        return [];
    }

    getPointerTarget() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const unitHits = this.raycaster.intersectObjects(this.units, true);
        if (unitHits.length > 0) {
            return { kind: 'unit', object: this.getUnitRoot(unitHits[0].object) };
        }

        const point = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.mapPlane, point)) {
            const coords = this.worldPointToCell(point);
            if (coords) {
                return {
                    kind: 'cell',
                    object: {
                        userData: {
                            type: 'cell',
                            x: coords.x,
                            z: coords.z
                        }
                    }
                };
            }
        }

        if (this.groundMesh) {
            const groundHits = this.raycaster.intersectObject(this.groundMesh, false);
            if (groundHits.length > 0) {
                const coords = this.worldPointToCell(groundHits[0].point);
                if (!coords) return null;
                return {
                    kind: 'cell',
                    object: {
                        userData: {
                            type: 'cell',
                            x: coords.x,
                            z: coords.z
                        }
                    }
                };
            }
        }

        return null;
    }

    worldPointToCell(point) {
        const half = (this.gridSize * this.cellSize) / 2;
        const x = Math.floor((point.x + half) / this.cellSize);
        const z = Math.floor((point.z + half) / this.cellSize);
        if (x < 0 || z < 0 || x >= this.gridSize || z >= this.gridSize) {
            return null;
        }
        return { x, z };
    }

    getUnitRoot(object) {
        let current = object;
        while (current && current.parent && !current.userData.isUnitRoot) {
            current = current.parent;
        }
        return current;
    }

    resetCellAppearance(cell) {
        if (!cell) return;
        const x = cell.userData.x;
        const z = cell.userData.z;
        cell.material.color.setHex((x + z) % 2 === 0 ? 0x4A5F4A : 0x5A6F5A);
        cell.material.opacity = this.getGridBaseOpacity();
    }

    clearMovementHighlights() {
        this.cellHighlightMeshes.forEach((mesh) => this.scene.remove(mesh));
        this.cellHighlightMeshes = [];
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
        this.selectedCell = null;
        this.showMovementHighlights(unit);
        this.addLog(`Вибрано: ${this.config.unitTypes[unit.userData.type].name}`, 'move-log');
    }

    showMovementHighlights(unit) {
        this.clearMovementHighlights();

        this.addCellHighlight(unit.userData.x, unit.userData.z, 0xff6b35, 0.45, 0.9);

        const unitX = unit.userData.x;
        const unitZ = unit.userData.z;
        const maxDistance = this.config.unitTypes[unit.userData.type].movement;

        const fromX = Math.max(0, unitX - maxDistance);
        const toX = Math.min(this.gridSize - 1, unitX + maxDistance);
        const fromZ = Math.max(0, unitZ - maxDistance);
        const toZ = Math.min(this.gridSize - 1, unitZ + maxDistance);

        for (let x = fromX; x <= toX; x++) {
            for (let z = fromZ; z <= toZ; z++) {
                const distance = Math.abs(x - unitX) + Math.abs(z - unitZ);
                if (distance > 0 && distance <= maxDistance && this.getGridCell(x, z).unit === null) {
                    this.addCellHighlight(x, z, 0x52d273, 0.38, 0.72);
                }
            }
        }
    }

    addCellHighlight(x, z, color, opacity, sizeMultiplier = 1, trackAsMovement = true) {
        const markerSize = Math.max(this.cellSize * sizeMultiplier, 0.18);
        const geometry = new THREE.PlaneGeometry(markerSize, markerSize);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(this.toWorldCoord(x), this.getSurfaceYAtCell(x, z) + 0.025, this.toWorldCoord(z));
        this.scene.add(mesh);
        if (trackAsMovement) {
            this.cellHighlightMeshes.push(mesh);
        }
        return mesh;
    }

    onMouseMove(event) {
        this.updateMouseFromEvent(event);

        if (this.isDragging) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;

            this.cameraAngle += deltaX * 0.01;
            this.cameraHeight = Math.max(2, Math.min(180, this.cameraHeight - deltaY * 0.25));
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
        if (this.phase === 'order') {
            this.addOrderTaskAtCell(x, z);
            return;
        }

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

        if (this.getGridCell(x, z).unit !== null) {
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

        this.getGridCell(unit.userData.x, unit.userData.z).unit = null;
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

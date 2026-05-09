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
        this.inspectedUnit = null;
        this.selectedCell = null;
        this.gridHelper = null;
        this.mapLayers = {
            grid: true,
            tasks: true,
            support: false,
            comms: false,
            fog: false
        };
        
        // Стани гри
        this.currentPlayer = 1;
        this.sessionViewRole = 1;
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
            situation: {
                areaOfInterest: null,
                executionArea: null,
                objects: [],
                enemyInfoPercentBySide: { 1: 50, 2: 50 }
            },
            orbat: { 1: [], 2: [] },
            tasks: [],
            endState: [],
            support: {
                1: { ammo: 'норма', fuel: 'норма', medevac: 'базово', repair: 'обмежено', comms: 'стійкий', reserve: 'немає' },
                2: { ammo: 'норма', fuel: 'норма', medevac: 'базово', repair: 'обмежено', comms: 'стійкий', reserve: 'немає' }
            },
            readiness: {},
            ui: {
                activeTab: 'situation',
                activeRole: 'instructor',
                activeSide: 1,
                activeTaskTag: 'seize',
                activeGeometry: 'point',
                activeSituationTool: 'areaOfInterest',
                activeEndStateTag: 'areaControlled',
                draftTask: null
            },
            readinessByRole: {
                1: false,
                2: false,
                instructor: false
            }
        };

        this.orderRoles = {
            1: { label: 'Сторона 1', shortLabel: 'С1', color: '#4CAF50' },
            2: { label: 'Сторона 2', shortLabel: 'С2', color: '#FF9800' },
            instructor: { label: 'Інструктор', shortLabel: 'ІНСТР', color: '#FFD700' }
        };

        this.orderTabs = [
            { key: 'situation', label: 'Обстановка' },
            { key: 'orbat', label: 'ORBAT' },
            { key: 'tasks', label: 'Завдання' },
            { key: 'endState', label: 'Кінцевий стан' },
            { key: 'support', label: 'Забезпечення' },
            { key: 'scenario', label: 'Сценарій' },
            { key: 'intelligence', label: 'Інформація' },
            { key: 'control', label: 'Контроль' }
        ];

        this.orderGeometryTypes = {
            point: { label: 'Точка' },
            line: { label: 'Лінія' },
            area: { label: 'Район' }
        };

        this.orderTaskTags = {
            seize: { label: 'Захопити', color: 0x4caf50, geometry: 'area' },
            hold: { label: 'Утримати', color: 0xff9800, geometry: 'area' },
            defend: { label: 'Обороняти', color: 0x2196f3, geometry: 'area' },
            recon: { label: 'Розвідати', color: 0x9cdbff, geometry: 'area' },
            move: { label: 'Рух маршрутом', color: 0xffffff, geometry: 'line' },
            block: { label: 'Блокувати', color: 0xfb7185, geometry: 'line' },
            cover: { label: 'Прикрити', color: 0xfacc15, geometry: 'area' },
            securePassage: { label: 'Забезпечити прохід', color: 0x7dd3fc, geometry: 'point' },
            route: { label: 'Маршрут', color: 0xffffff, geometry: 'line' },
            boundary: { label: 'Рубіж', color: 0xffd700, geometry: 'line' },
            fireLine: { label: 'Вогневий рубіж', color: 0xff4d4d, geometry: 'line' },
            passage: { label: 'Прохід', color: 0x7dd3fc, geometry: 'point' },
            observation: { label: 'СП/НП', color: 0xbae6fd, geometry: 'point' },
            commandPost: { label: 'КП/КСП', color: 0xfacc15, geometry: 'point' },
            medevac: { label: 'Мед/евак', color: 0xf8fafc, geometry: 'point' },
            supply: { label: 'Постачання', color: 0xc084fc, geometry: 'point' },
            danger: { label: 'Небезпечна зона', color: 0xfb7185, geometry: 'area' }
        };
        this.endStateTags = {
            areaControlled: { label: 'Район під контролем', color: 0x4caf50 },
            lineHeld: { label: 'Рубіж утримано', color: 0xffd700 },
            routeOpen: { label: 'Маршрут відкрито', color: 0xffffff },
            enemyBlocked: { label: 'Противника заблоковано', color: 0xfb7185 },
            reconDone: { label: 'Розвідку завершено', color: 0x9cdbff },
            unitPreserved: { label: 'Підрозділ збережено', color: 0xa7f3d0 },
            supplyMaintained: { label: 'Постачання збережено', color: 0xc084fc }
        };
        this.supportFields = {
            ammo: { label: 'БК', options: ['низько', 'норма', 'посилено'] },
            fuel: { label: 'Паливо', options: ['низько', 'норма', 'посилено'] },
            medevac: { label: 'Медична евакуація', options: ['немає', 'базово', 'посилено'] },
            repair: { label: 'Ремонт', options: ['немає', 'обмежено', 'повний'] },
            comms: { label: 'Зв’язок', options: ['нестійкий', 'стійкий', 'резервований'] },
            reserve: { label: 'Резерв', options: ['немає', 'малий', 'виділений'] }
        };
        this.orderReadinessGroups = {
            combatLoad: {
                title: 'Бойова викладка',
                items: ['БК', 'гранати', 'вода', 'сухпай', 'ніж / мультитул']
            },
            protection: {
                title: 'Індивідуальний захист',
                items: ['бронежилет', 'плити', 'шолом', 'окуляри', 'рукавиці']
            },
            medical: {
                title: 'Медицина',
                items: ['аптечка', 'турнікети', 'бандаж', 'евакуаційна карта']
            },
            observation: {
                title: 'Спостереження',
                items: ['бінокль', 'тепловізор', 'ПНБ', 'далекомір']
            },
            navComms: {
                title: 'Навігація та зв’язок',
                items: ['радіостанція', 'частоти', 'позивні', 'карта', 'компас / GPS']
            },
            camouflage: {
                title: 'Маскування',
                items: ['сітка', 'стрічка', 'плащ', 'запасні шкарпетки']
            },
            support: {
                title: 'Пункти забезпечення',
                items: ['боєприпаси', 'паливо', 'ремонт', 'укриття', 'медпункт']
            }
        };
        this.stlLoader = null;
        this.gltfLoader = null;
        this.stlModelCache = {};
        this.gltfModelCache = {};
        this.unitPreviewCache = {};
        this.unitPreviewLoading = new Set();
        this.unitEditorSelectedType = null;
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
                this.addLog(`APP-6/NATO: ${unitModels.length} юнітів, ${this.referenceTaskModels.length} знаків задач, ${this.referenceTerrainModels.length} об'єктів місцевості`, 'place-log');
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
        this.sessionOrder.orbat[this.currentPlayer] = this.purchasedUnits[this.currentPlayer].map((orderUnit) => ({
            type: orderUnit.type,
            name: orderUnit.config.name,
            placed: orderUnit.placed
        }));
        
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
        this.sessionViewRole = 1;
        this.phase = 'order';
        this.playerMoney = { 1: 1000, 2: 1000 };
        this.playerMoves = { 1: 3, 2: 3 };
        this.placementPhase = { 1: false, 2: false };
        this.losses = { 1: 0, 2: 0 };
        this.turnNumber = 1;
        this.battleAnimations = [];
        this.isAnimatingBattles = false;
        this.purchasedUnits = { 1: [], 2: [] };
        this.sessionOrder.situation.areaOfInterest = null;
        this.sessionOrder.situation.executionArea = null;
        this.sessionOrder.situation.objects = [];
        this.sessionOrder.tasks = [];
        this.sessionOrder.endState = [];
        this.sessionOrder.orbat = { 1: [], 2: [] };
        this.sessionOrder.readiness = {};
        this.sessionOrder.ui.activeTab = 'situation';
        this.sessionOrder.ui.activeRole = 'instructor';
        this.sessionOrder.ui.activeSide = 1;
        this.sessionOrder.ui.draftTask = null;
        this.sessionOrder.readinessByRole = { 1: false, 2: false, instructor: false };
        this.renderOrderTaskMarkers();
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
        this.inspectedUnit = unit;
        this.updateUnitDetailPanel();
    }
    
    hideUnitInfo() {
        this.inspectedUnit = null;
        this.updateUnitDetailPanel();
    }

    updateUnitDetailPanel() {
        const panels = [document.getElementById('unitDetailPanel'), document.getElementById('unitDetailPanelLeft')].filter(Boolean);
        if (panels.length === 0) return;

        if (!this.inspectedUnit || !this.config) {
            const emptyHtml = `
                <h4 class="unit-detail-title">Юніт не вибрано</h4>
                <div class="unit-info">Оберіть підрозділ на карті, щоб бачити його стан.</div>
            `;
            panels.forEach((panel) => {
                panel.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                panel.innerHTML = emptyHtml;
            });
            return;
        }

        const unit = this.inspectedUnit;
        const unitConfig = this.config.unitTypes[unit.userData.type];
        const palette = this.getUnitPalette(unit.userData.player);
        const relation = unit.userData.player === this.currentPlayer ? 'поточна сторона' : 'інша сторона';
        const detailHtml = `
            <h4 class="unit-detail-title" style="color:${palette.accent}">${this.escapeHtml(unitConfig.name)}</h4>
            <div class="unit-info"><strong>Сторона:</strong> ${unit.userData.player} (${relation})</div>
            <div class="unit-info"><strong>Клітинка:</strong> (${unit.userData.x}, ${unit.userData.z})</div>
            <div class="unit-info"><strong>Живучість:</strong> ${unitConfig.hitpoints}</div>
            <div class="unit-info"><strong>Вогнева потужність:</strong> ${unitConfig.strength}</div>
            <div class="unit-info"><strong>Маневреність:</strong> ${unitConfig.movement} кл.</div>
            <div class="unit-info"><strong>Статус:</strong> ${unit.userData.moved ? 'хід використано' : 'готовий до дії'}</div>
            <div class="unit-info">${this.escapeHtml(unitConfig.description)}</div>
        `;
        panels.forEach((panel) => {
            panel.style.borderColor = unit.userData.player === 1 ? '#4CAF50' : '#FF9800';
            panel.innerHTML = detailHtml;
        });
    }

    setSessionViewRole(role) {
        const normalizedRole = role === '1' || role === 1 ? 1 : (role === '2' || role === 2 ? 2 : 'instructor');
        this.sessionViewRole = normalizedRole;
        this.updateUI();
    }

    updateSessionRoleSwitch() {
        const container = document.getElementById('sessionRoleSwitch');
        if (!container) return;

        if (this.phase === 'order') {
            container.innerHTML = '';
            return;
        }

        const roles = [
            { key: 1, label: 'Сторона 1' },
            { key: 2, label: 'Сторона 2' },
            { key: 'instructor', label: 'Інструктор' }
        ];
        container.innerHTML = roles.map((role) => {
            const activeClass = String(this.sessionViewRole) === String(role.key) ? ' active' : '';
            return `<button class="session-role-btn${activeClass}" onclick="game.setSessionViewRole('${role.key}')">${role.label}</button>`;
        }).join('');
    }

    updateMapLayerControls() {
        const wrapper = document.getElementById('mapLayerControls');
        const container = document.getElementById('mapLayerButtons');
        if (!wrapper || !container) return;

        wrapper.style.display = this.phase === 'order' ? 'none' : 'block';
        if (this.phase === 'order') {
            container.innerHTML = '';
            return;
        }

        const layers = [
            { key: 'grid', label: 'Сітка' },
            { key: 'tasks', label: 'Завдання' },
            { key: 'support', label: 'Забезпечення' },
            { key: 'comms', label: 'Зв’язок' },
            { key: 'fog', label: 'Туман війни' }
        ];

        container.innerHTML = layers.map((layer) => {
            const activeClass = this.mapLayers[layer.key] ? ' active' : '';
            return `<button class="map-layer-btn${activeClass}" onclick="game.toggleMapLayer('${layer.key}')">${this.mapLayers[layer.key] ? '✓' : '○'} ${layer.label}</button>`;
        }).join('');
    }

    toggleMapLayer(layer) {
        if (!Object.prototype.hasOwnProperty.call(this.mapLayers, layer)) return;
        this.mapLayers[layer] = !this.mapLayers[layer];
        this.applyMapLayerVisibility(layer);
        this.updateMapLayerControls();
        const labels = {
            grid: 'сітка',
            tasks: 'завдання',
            support: 'забезпечення',
            comms: 'зв’язок',
            fog: 'туман війни'
        };
        this.addLog(`Шар "${labels[layer] || layer}": ${this.mapLayers[layer] ? 'показано' : 'приховано'}`, 'place-log');
    }

    applyMapLayerVisibility(layer = null) {
        if (!layer || layer === 'grid') {
            if (this.gridHelper) {
                this.gridHelper.visible = this.mapLayers.grid;
            }
        }

        if (!layer || layer === 'tasks') {
            this.renderOrderTaskMarkers();
        }

        if (!layer || layer === 'fog') {
            this.scene.fog = this.mapLayers.fog ? new THREE.FogExp2(0x718ea1, 0.018) : null;
        }
    }

    updatePlayPanels() {
        const player1Panel = document.getElementById('player1Info');
        const player2Panel = document.getElementById('player2Info');
        const unitDetailRight = document.getElementById('unitDetailPanel');
        const unitDetailLeft = document.getElementById('unitDetailPanelLeft');
        const ui = document.getElementById('ui');
        const ui2 = document.getElementById('ui2');
        if (!player1Panel || !player2Panel || !unitDetailRight || !unitDetailLeft || !ui || !ui2) return;

        const isOrder = this.phase === 'order';
        const isInstructor = this.sessionViewRole === 'instructor';
        const activeSide = this.sessionViewRole === 2 ? 2 : 1;

        ui.style.display = 'block';
        ui2.style.display = 'block';
        player1Panel.style.display = 'block';
        player2Panel.style.display = 'none';
        unitDetailRight.classList.remove('active');
        unitDetailLeft.classList.remove('active');

        if (isOrder) {
            player1Panel.innerHTML = this.renderSidePanel(1);
            player2Panel.innerHTML = this.renderSidePanel(2);
            player2Panel.style.display = 'block';
            player1Panel.className = 'player-info player1';
            player2Panel.className = 'player-info player2';
        } else if (isInstructor) {
            player1Panel.innerHTML = this.renderInstructorSessionPanel();
            player1Panel.className = 'player-info active-player';
            player1Panel.style.borderColor = '#FFD700';
        } else {
            player1Panel.innerHTML = this.renderSidePanel(activeSide, `Сторона ${activeSide}`);
            player1Panel.className = `player-info player${activeSide} active-player`;
            player1Panel.style.borderColor = activeSide === 1 ? '#4CAF50' : '#FF9800';
            unitDetailRight.classList.add('active');
        }

        if (isOrder) {
            player1Panel.classList.toggle('active-player', false);
            player2Panel.classList.toggle('active-player', false);
            player1Panel.style.borderColor = '';
            player2Panel.style.borderColor = '';
        }
    }

    renderSidePanel(side, title = `Гравець ${side}`) {
        return `
            <h4 style="margin: 0 0 5px 0;">${title}</h4>
            <div class="unit-info">Ресурс штабу: <span id="player${side}Money">базовий</span></div>
            <div class="unit-info">Підрозділів на карті: <span id="player${side}Units">${this.units.filter((unit) => unit.userData.player === side).length}</span></div>
            <div class="unit-info">Рухів: <span id="player${side}Moves">${this.playerMoves[side]}</span></div>
            <div class="loss-info" id="player${side}Losses">Втрати: ${this.losses[side]}</div>
            <div class="units-list">
                <div class="units-list-title">Склад / ORBAT</div>
                <div id="player${side}PurchasedList" class="units-list-empty">Склад ще не визначено</div>
            </div>
        `;
    }

    renderInstructorSessionPanel() {
        const taskCount = this.sessionOrder.tasks.length;
        const endStateCount = this.sessionOrder.endState.length;
        const rows = [1, 2].map((side) => {
            const units = this.units.filter((unit) => unit.userData.player === side);
            const ready = this.sessionOrder.readinessByRole[side] ? 'наказ готовий' : 'наказ не готовий';
            return `
                <div class="order-field">
                    <strong>Сторона ${side}</strong><br>
                    ${ready}<br>
                    На карті: ${units.length}<br>
                    Втрати: ${this.losses[side]}<br>
                    Рухів: ${this.playerMoves[side]}
                </div>
            `;
        }).join('');

        return `
            <h4 style="margin: 0 0 5px 0; color: #FFD700;">Інструктор</h4>
            <div class="unit-info">Огляд сесії без туману війни</div>
            <div class="unit-info">Поточний хід: Сторона ${this.currentPlayer}</div>
            <div class="unit-info">Номер ходу: ${this.turnNumber}</div>
            <div class="unit-info">Завдань: ${taskCount}; кінцевих станів: ${endStateCount}</div>
            <div class="order-grid-two" style="grid-template-columns: 1fr; margin-top: 8px;">${rows}</div>
        `;
    }
    
    updateUI() {
        if (this.config && !this.referenceModelUnitsLoaded && !this.referenceModelUnitsLoading) {
            this.loadReferenceModelUnits();
        }

        // Оновлення інформації про гравців
        const player1Units = this.units.filter(u => u.userData.player === 1).length;
        const player2Units = this.units.filter(u => u.userData.player === 2).length;
        
        const setText = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };

        setText('player1Units', player1Units);
        setText('player2Units', player2Units);
        setText('player1Moves', this.playerMoves[1]);
        setText('player2Moves', this.playerMoves[2]);
        setText('player1Losses', `Втрати: ${this.losses[1]}`);
        setText('player2Losses', `Втрати: ${this.losses[2]}`);
        
        // Оновлення ресурсного стану сторін
        setText('player1Money', 'базовий');
        setText('player2Money', 'базовий');
        
        document.getElementById('unitShop').style.display = this.phase === 'order' ? 'block' : 'none';
        document.getElementById('centerInfo').style.display = 'block';
        this.updateSessionRoleSwitch();
        this.updateMapLayerControls();
        this.updateUnitDetailPanel();
        this.updatePlayPanels();
        
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
                const activeRole = this.orderRoles[this.sessionOrder.ui.activeRole];
                shopCurrentPlayer.textContent = `Локальний прототип: активна роль - ${activeRole ? activeRole.label : 'Інструктор'}`;
            }
            if (shopMoneyInfo) {
                shopMoneyInfo.textContent = 'Сторони налаштовують свої блоки і натискають "Готовий"; інструктор стартує гру.';
            }
        }

        this.updateShopUI();
        this.updateOrderRoleHeader();
        this.updateOrderSummaryHeader();
        
        // Оновлення доступних фішок
        this.updateAvailableUnitsUI();
        
        // Оновлення кольорів кнопок
        this.updateButtonColors();
        
        // Кнопки - активні тільки в правильний час
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (this.phase === 'order') {
            endTurnBtn.disabled = false;
            if (this.sessionOrder.ui.activeRole === 'instructor') {
                endTurnBtn.textContent = 'Стартувати гру';
                endTurnBtn.disabled = !(this.sessionOrder.readinessByRole[1] && this.sessionOrder.readinessByRole[2]);
            } else {
                const role = this.sessionOrder.ui.activeRole;
                endTurnBtn.textContent = this.sessionOrder.readinessByRole[role] ? `Сторона ${role}: готово` : `Сторона ${role}: готовий`;
            }
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
            if (this.sessionOrder.ui.activeRole === 'instructor') {
                endTurnBtn.textContent = 'Стартувати гру';
                endTurnBtn.disabled = !(this.sessionOrder.readinessByRole[1] && this.sessionOrder.readinessByRole[2]);
            } else {
                const role = this.sessionOrder.ui.activeRole;
                endTurnBtn.textContent = this.sessionOrder.readinessByRole[role] ? `Сторона ${role}: готово` : `Сторона ${role}: готовий`;
            }
        }

        if (this.selectedUnit) {
            this.showMovementHighlights(this.selectedUnit);
        }
    }

    updateOrderRoleHeader() {
        const roleSwitch = document.getElementById('orderRoleSwitch');
        const readyStatus = document.getElementById('orderReadyStatus');
        if (!roleSwitch || !readyStatus) return;

        roleSwitch.innerHTML = Object.entries(this.orderRoles).map(([role, config]) => {
            const activeClass = String(this.sessionOrder.ui.activeRole) === String(role) ? ' active' : '';
            const readyMark = role !== 'instructor' && this.sessionOrder.readinessByRole[role] ? ' ✓' : '';
            return `<button class="order-role-btn${activeClass}" onclick="game.setOrderRole('${role}')">${config.label}${readyMark}</button>`;
        }).join('');

        const p1 = this.sessionOrder.readinessByRole[1] ? 'С1 готова' : 'С1 не готова';
        const p2 = this.sessionOrder.readinessByRole[2] ? 'С2 готова' : 'С2 не готова';
        const activeRole = this.orderRoles[this.sessionOrder.ui.activeRole];
        readyStatus.textContent = `${activeRole ? activeRole.label : 'Інструктор'} | ${p1}; ${p2}`;
    }

    getVisibleOrderTabs() {
        if (this.isInstructorRole()) {
            return [
                { key: 'situation', label: 'Обстановка' },
                { key: 'scenario', label: 'Сценарій' },
                { key: 'intelligence', label: 'Інформація' },
                { key: 'control', label: 'Контроль' },
                { key: 'unitEditor', label: 'Юніти' }
            ];
        }

        return [
            { key: 'orbat', label: 'ORBAT' },
            { key: 'tasks', label: 'Завдання' },
            { key: 'endState', label: 'Кінцевий стан' },
            { key: 'support', label: 'Забезпечення' }
        ];
    }

    ensureActiveOrderTab() {
        const visibleTabs = this.getVisibleOrderTabs();
        if (!visibleTabs.some((tab) => tab.key === this.sessionOrder.ui.activeTab)) {
            this.sessionOrder.ui.activeTab = visibleTabs[0].key;
        }
        return visibleTabs;
    }
    
    updateOrderSummaryHeader() {
        const situationSummary = document.getElementById('orderSituationSummary');
        const tasksSummary = document.getElementById('orderTasksSummary');
        const supportSummary = document.getElementById('orderSupportSummary');
        const commandSummary = document.getElementById('orderCommandSummary');
        if (!situationSummary || !tasksSummary || !supportSummary || !commandSummary) return;

        const situation = this.sessionOrder.situation;
        const activeTab = this.getVisibleOrderTabs().find((tab) => tab.key === this.sessionOrder.ui.activeTab);
        const activeRole = this.orderRoles[this.sessionOrder.ui.activeRole];
        situationSummary.textContent = `ЗІ: ${this.formatOrderPoint(situation.areaOfInterest)}; РВЗ: ${this.formatOrderPoint(situation.executionArea)}`;
        tasksSummary.textContent = `Задач: ${this.sessionOrder.tasks.length}; кінцевих станів: ${this.sessionOrder.endState.length}`;
        supportSummary.textContent = `С1 БК: ${this.sessionOrder.support[1].ammo}; С2 БК: ${this.sessionOrder.support[2].ammo}`;
        commandSummary.textContent = `${activeRole ? activeRole.label : 'Інструктор'}; вкладка: ${activeTab ? activeTab.label : 'Обстановка'}`;
    }

    updateShopUI() {
        const shopContent = document.getElementById('shopContent');
        if (!this.config || this.phase !== 'order') {
            shopContent.innerHTML = '';
            return;
        }

        const visibleTabs = this.ensureActiveOrderTab();
        const activeTab = this.sessionOrder.ui.activeTab;
        const tabButtons = visibleTabs.map((tab) => {
            const activeClass = activeTab === tab.key ? ' active' : '';
            return `<button class="order-tab${activeClass}" onclick="game.setOrderTab('${tab.key}')">${tab.label}</button>`;
        }).join('');
        const tabRenderers = {
            situation: () => this.renderSituationTab(),
            scenario: () => this.renderInstructorScenarioTab(),
            intelligence: () => this.renderInstructorIntelligenceTab(),
            control: () => this.renderInstructorControlTab(),
            unitEditor: () => this.renderUnitEditorTab(),
            orbat: () => this.renderOrbatTab(),
            tasks: () => this.renderTasksTab(),
            endState: () => this.renderEndStateTab(),
            support: () => this.renderSupportTab()
        };

        shopContent.innerHTML = `
            <div class="order-tabs">${tabButtons}</div>
            ${tabRenderers[activeTab] ? tabRenderers[activeTab]() : this.renderSituationTab()}
        `;
        this.setupUnitCardPreviews();
    }

    renderSideButtons() {
        return [1, 2].map((side) => {
            const activeClass = this.sessionOrder.ui.activeSide === side ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setOrderTaskSide(${side})">Сторона ${side}</button>`;
        }).join('');
    }

    renderSituationTab() {
        const situation = this.sessionOrder.situation;
        const instructorMode = this.isInstructorRole();
        const toolButtons = [
            { key: 'areaOfInterest', label: 'Зона інтересу' },
            { key: 'executionArea', label: 'Район виконання' }
        ].map((tool) => {
            const activeClass = this.sessionOrder.ui.activeSituationTool === tool.key ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setSituationTool('${tool.key}')">${tool.label}</button>`;
        }).join('');
        const objectList = situation.objects.length === 0
            ? '<div class="units-list-empty">Об’єкти району ще не задані</div>'
            : situation.objects.map((object, index) => `<span class="unit-badge">${index + 1}. ${this.escapeHtml(object.label)} (${object.x}, ${object.z})</span>`).join('');

        return `
            <div class="shop-item order-planner">
                <h5>Обстановка</h5>
                <div class="details">
                    <div class="order-note">${instructorMode ? 'Клік по мапі в цій вкладці задає зону інтересу або район виконання.' : 'Сторони переглядають обстановку. Зону інтересу, район виконання і обсяг даних про противника задає інструктор.'}</div>
                    ${instructorMode ? `<div class="order-tags">${toolButtons}</div>` : ''}
                    <div class="order-grid-two">
                        <div class="order-field"><strong>Зона інтересу</strong><br>${this.formatOrderPoint(situation.areaOfInterest)}</div>
                        <div class="order-field"><strong>Район виконання</strong><br>${this.formatOrderPoint(situation.executionArea)}</div>
                    </div>
                    <div class="units-list">
                        <div class="units-list-title">Об’єкти району виконання</div>
                        <div>${objectList}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderInstructorScenarioTab() {
        const sideSummaries = [1, 2].map((side) => {
            const units = this.purchasedUnits[side] || [];
            const taskCount = this.sessionOrder.tasks.filter((task) => task.side === side).length;
            const endStateCount = this.sessionOrder.endState.filter((item) => item.side === side).length;
            return `
                <div class="order-field">
                    <strong>Сторона ${side}</strong><br>
                    ORBAT: ${units.length}<br>
                    Завдань: ${taskCount}<br>
                    Кінцевих станів: ${endStateCount}
                </div>
            `;
        }).join('');

        return `
            <div class="shop-item order-planner">
                <h5>Сценарій інструктора</h5>
                <div class="details">
                    <div class="order-note">Інструктор задає рамку заняття і контролює повноту наказів. Війська виставляють тільки сторони.</div>
                    <div class="order-grid-two">
                        <div class="order-field"><strong>Зона інтересу</strong><br>${this.formatOrderPoint(this.sessionOrder.situation.areaOfInterest)}</div>
                        <div class="order-field"><strong>Район виконання</strong><br>${this.formatOrderPoint(this.sessionOrder.situation.executionArea)}</div>
                    </div>
                    <div class="order-grid-two">${sideSummaries}</div>
                </div>
            </div>
        `;
    }

    renderInstructorIntelligenceTab() {
        const enemyInfo = this.sessionOrder.situation.enemyInfoPercentBySide;
        const ranges = [1, 2].map((side) => `
            <label class="order-field">
                <strong>Інформація про противника для сторони ${side}</strong><br>
                <input class="order-range" type="range" min="0" max="100" value="${enemyInfo[side]}" oninput="game.setEnemyInfoPercent(${side}, this.value)">
                <span>${enemyInfo[side]}%</span>
            </label>
        `).join('');

        return `
            <div class="shop-item order-planner">
                <h5>Інформація про противника</h5>
                <div class="details">
                    <div class="order-note">Це інструкторський шар: різним сторонам можна дати різний обсяг відомостей про противника.</div>
                    <div class="order-grid-two">${ranges}</div>
                </div>
            </div>
        `;
    }

    renderInstructorControlTab() {
        const readiness = this.sessionOrder.readinessByRole;
        const rows = [1, 2].map((side) => {
            const units = this.purchasedUnits[side] || [];
            const placedUnits = units.filter((unit) => unit.placed).length;
            return `
                <div class="order-field">
                    <strong>Сторона ${side}</strong><br>
                    Статус наказу: ${readiness[side] ? 'готово' : 'не готово'}<br>
                    Підрозділів: ${units.length}<br>
                    Розміщено: ${placedUnits}
                </div>
            `;
        }).join('');
        const canStart = readiness[1] && readiness[2];

        return `
            <div class="shop-item order-planner">
                <h5>Контроль готовності</h5>
                <div class="details">
                    <div class="order-note">${canStart ? 'Обидві сторони готові. Інструктор може стартувати гру нижньою кнопкою.' : 'Старт гри відкривається після готовності обох сторін.'}</div>
                    <div class="order-grid-two">${rows}</div>
                </div>
            </div>
        `;
    }

    renderUnitEditorTab() {
        const unitEntries = Object.entries(this.config.unitTypes);
        if (unitEntries.length === 0) {
            return '<div class="shop-item order-planner"><h5>Редактор юнітів</h5><div class="details">Юнітів ще немає.</div></div>';
        }

        if (!this.unitEditorSelectedType || !this.config.unitTypes[this.unitEditorSelectedType]) {
            this.unitEditorSelectedType = unitEntries[0][0];
        }

        const selectedType = this.unitEditorSelectedType;
        const selectedConfig = this.config.unitTypes[selectedType];
        const symbolKinds = [
            ['infantry', 'Піхота'],
            ['armor', 'Бронетехніка'],
            ['artillery', 'Артилерія'],
            ['command', 'Командування'],
            ['scout', 'Розвідка'],
            ['sniper', 'Снайпер'],
            ['antitank', 'ПТРК'],
            ['mortar', 'Міномет'],
            ['medical', 'Медичний'],
            ['vehicle', 'Транспорт'],
            ['support', 'Забезпечення']
        ];

        const unitButtons = unitEntries.map(([unitType, unitConfig]) => {
            const activeClass = unitType === selectedType ? ' active' : '';
            return `<button class="order-check${activeClass}" onclick="game.setUnitEditorSelectedType('${this.escapeAttribute(unitType)}')">${this.escapeHtml(unitConfig.name)}</button>`;
        }).join('');

        const symbolOptions = symbolKinds.map(([value, label]) => {
            const selected = this.getUnitSymbolKind(selectedType, selectedConfig) === value ? ' selected' : '';
            return `<option value="${value}"${selected}>${label}</option>`;
        }).join('');

        const currentImage = selectedConfig.imageDataUrl
            ? `<img alt="Unit custom preview" src="${this.escapeHtml(selectedConfig.imageDataUrl)}">`
            : `<img alt="Unit symbol preview" src="${this.createUnitSymbolDataUrl(selectedType, 1, selectedConfig)}">`;

        return `
            <div class="shop-item order-planner">
                <h5>Редактор юнітів</h5>
                <div class="details">
                    <div class="order-note">Редагування діє в межах поточної сесії прототипу. Збереження в файл/бекенд винесено наступним кроком.</div>
                    <div class="order-actions">
                        <button class="neutral-btn" onclick="event.stopPropagation(); game.addCustomUnit()">Додати нового юніта</button>
                    </div>
                    <div class="order-grid-two">
                        <div class="order-check-group">
                            <div class="order-check-title">Наявні юніти</div>
                            <div class="order-tags">${unitButtons}</div>
                        </div>
                        <div class="order-check-group">
                            <div class="order-check-title">Картка / символ</div>
                            <div class="unit-model-preview" style="width: 160px; height: 116px;">${currentImage}</div>
                        </div>
                    </div>
                    <div class="order-grid-two">
                        ${this.renderUnitEditorTextField(selectedType, 'name', 'Назва', selectedConfig.name)}
                        ${this.renderUnitEditorNumberField(selectedType, 'cost', 'Вартість', selectedConfig.cost)}
                        ${this.renderUnitEditorNumberField(selectedType, 'hitpoints', 'Живучість', selectedConfig.hitpoints)}
                        ${this.renderUnitEditorNumberField(selectedType, 'strength', 'Вогнева потужність', selectedConfig.strength)}
                        ${this.renderUnitEditorNumberField(selectedType, 'movement', 'Маневреність', selectedConfig.movement)}
                        <label class="order-field">
                            <strong>Тип символу</strong><br>
                            <select onchange="game.updateUnitConfigField('${this.escapeAttribute(selectedType)}', 'symbolKind', this.value)">
                                ${symbolOptions}
                            </select>
                        </label>
                        ${this.renderUnitEditorTextField(selectedType, 'symbolLabel', 'Підпис на символі', selectedConfig.symbolLabel || this.getUnitSymbolLabel(selectedType, selectedConfig))}
                        ${this.renderUnitEditorTextField(selectedType, 'model', 'Модель / тип', selectedConfig.model)}
                    </div>
                    <label class="order-field">
                        <strong>Опис</strong><br>
                        <textarea rows="3" onchange="game.updateUnitConfigField('${this.escapeAttribute(selectedType)}', 'description', this.value)">${this.escapeHtml(selectedConfig.description || '')}</textarea>
                    </label>
                    <div class="order-grid-two">
                        <label class="order-field">
                            <strong>Картинка картки</strong><br>
                            <input type="file" accept="image/*" onchange="game.handleUnitImageUpload('${this.escapeAttribute(selectedType)}', this)">
                        </label>
                        ${this.renderUnitEditorTextField(selectedType, 'imageDataUrl', 'URL / data URL картинки', selectedConfig.imageDataUrl || '')}
                    </div>
                </div>
            </div>
        `;
    }

    renderUnitEditorTextField(unitType, field, label, value = '') {
        return `
            <label class="order-field">
                <strong>${label}</strong><br>
                <input type="text" value="${this.escapeHtml(value || '')}" onchange="game.updateUnitConfigField('${this.escapeAttribute(unitType)}', '${field}', this.value)">
            </label>
        `;
    }

    renderUnitEditorNumberField(unitType, field, label, value = 0) {
        return `
            <label class="order-field">
                <strong>${label}</strong><br>
                <input type="number" min="0" step="1" value="${Number(value) || 0}" onchange="game.updateUnitConfigField('${this.escapeAttribute(unitType)}', '${field}', this.value)">
            </label>
        `;
    }

    renderOrbatTab() {
        const unitCards = Object.entries(this.config.unitTypes).map(([unitType, unitConfig]) => this.renderOrbatUnitCard(unitType, unitConfig)).join('');
        const visibleSides = this.isInstructorRole() ? [1, 2] : [this.getActiveOrderSide()];
        const sideSummaries = visibleSides.map((side) => {
            const units = this.purchasedUnits[side] || [];
            return `
                <div class="order-field">
                    <strong>Сторона ${side}</strong><br>
                    Підрозділів у наказі: ${units.length}<br>
                    Не розміщено: ${units.filter((unit) => !unit.placed).length}
                </div>
            `;
        }).join('');

        return `
            <div class="shop-item order-planner">
                <h5>ORBAT / склад бойових засобів</h5>
                <div class="details">
                    <div class="order-note">${this.isInstructorRole() ? 'Інструктор переглядає склад обох сторін. Додавання підрозділів виконується в ролі конкретної сторони.' : `Формується склад сторони ${this.getActiveOrderSide()} перед розміщенням на мапі.`}</div>
                    <div class="order-grid-two">${sideSummaries}</div>
                </div>
            </div>
            ${unitCards}
        `;
    }

    renderOrbatUnitCard(unitType, unitConfig) {
        const symbolKind = this.getUnitSymbolKind(unitType, unitConfig);
        const symbolLabel = this.getUnitSymbolLabel(unitType, unitConfig);
        const activeSide = this.getActiveOrderSide();
        const addButtons = this.isInstructorRole()
            ? '<div class="order-note">Перемкніться на сторону зверху, щоб додавати підрозділи до її ORBAT.</div>'
            : `<button class="${activeSide === 1 ? 'player1-btn' : 'player2-btn'}" onclick="event.stopPropagation(); game.assignUnitToOrder('${unitType}', ${activeSide})">Додати до сторони ${activeSide}</button>`;
        return `
            <div class="shop-item">
                <h5>${unitConfig.name}</h5>
                <div class="details">
                    <div class="unit-model-panel">
                        <div class="unit-model-preview" data-unit-type="${this.escapeHtml(unitType)}">APP-6</div>
                        <div class="unit-model-meta">
                            <div class="unit-model-name" title="NATO / APP-6">${this.escapeHtml(symbolLabel)}</div>
                            <div>${this.escapeHtml(symbolKind)}</div>
                            <div class="unit-model-path">умовний знак підрозділу</div>
                        </div>
                    </div>
                    <div>Живучість: ${unitConfig.hitpoints}</div>
                    <div>Вогнева потужність: ${unitConfig.strength}</div>
                    <div>Маневреність: ${unitConfig.movement} кл.</div>
                    <div>${unitConfig.description}</div>
                    <div class="order-actions">
                        ${addButtons}
                    </div>
                </div>
            </div>
        `;
    }

    renderTasksTab() {
        const activeSide = this.sessionOrder.ui.activeSide;
        const draftTask = this.sessionOrder.ui.draftTask;
        const roleNotice = this.isInstructorRole()
            ? 'Інструктор бачить задачі, але бойові задачі сторін задаються в ролі Сторона 1 або Сторона 2.'
            : `Зараз налаштовується сторона ${activeSide}.`;
        const tagButtons = Object.entries(this.orderTaskTags).map(([tag, config]) => {
            const activeClass = this.sessionOrder.ui.activeTaskTag === tag ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setOrderTaskTag('${tag}')">${config.label}</button>`;
        }).join('');
        const geometryButtons = Object.entries(this.orderGeometryTypes).map(([geometry, config]) => {
            const activeClass = this.sessionOrder.ui.activeGeometry === geometry ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setOrderGeometry('${geometry}')">${config.label}</button>`;
        }).join('');
        const taskList = this.sessionOrder.tasks.length === 0
            ? '<div class="units-list-empty">Оберіть сторону, дію, геометрію і клікніть на мапі</div>'
            : this.sessionOrder.tasks.map((task, index) => `
                <span class="unit-badge">${index + 1}. Сторона ${task.side}: ${this.orderTaskTags[task.tag].label}, ${this.orderGeometryTypes[task.geometry].label}: ${this.formatTaskCells(task)}</span>
            `).join('');
        const draftText = draftTask && draftTask.cells.length > 0
            ? `Чернетка завдання ${this.sessionOrder.tasks.length + 1}: ${this.orderTaskTags[draftTask.tag].label}, ${this.orderGeometryTypes[draftTask.geometry].label}: ${this.formatTaskCells(draftTask)}`
            : 'Клікніть по карті, щоб задати точку / лінію / район поточного завдання.';
        const saveDisabled = !draftTask || draftTask.cells.length === 0 ? ' disabled' : '';

        return `
            <div class="shop-item order-planner">
                <h5>Завдання</h5>
                <div class="details">
                    <div class="order-note">Кліки по карті збирають геометрію одного поточного завдання. Новий номер створюється тільки після кнопки "Зберегти завдання".</div>
                    <div class="order-note">${roleNotice}</div>
                    <div class="units-list-title">Дія</div>
                    <div class="order-tags">${tagButtons}</div>
                    <div class="units-list-title">Геометрія</div>
                    <div class="order-tags">${geometryButtons}</div>
                    <div class="order-field">
                        <strong>Поточне завдання</strong><br>
                        ${draftText}
                        <div class="order-actions">
                            <button class="${activeSide === 1 ? 'player1-btn' : 'player2-btn'}"${saveDisabled} onclick="event.stopPropagation(); game.saveCurrentOrderTask()">Зберегти завдання</button>
                            <button class="neutral-btn" onclick="event.stopPropagation(); game.clearCurrentOrderTask()">Очистити чернетку</button>
                        </div>
                    </div>
                    <div class="units-list">
                        <div class="units-list-title">Прив’язані задачі</div>
                        <div>${taskList}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEndStateTab() {
        const activeSide = this.sessionOrder.ui.activeSide;
        const roleNotice = this.isInstructorRole()
            ? 'Інструктор переглядає кінцеві стани. Для редагування сторони перемкніться у глобальному перемикачі зверху.'
            : `Зараз налаштовується кінцевий стан сторони ${activeSide}.`;
        const tagButtons = Object.entries(this.endStateTags).map(([tag, config]) => {
            const activeClass = this.sessionOrder.ui.activeEndStateTag === tag ? ' active' : '';
            return `<button class="order-tag${activeClass}" onclick="game.setEndStateTag('${tag}')">${config.label}</button>`;
        }).join('');
        const endStateList = this.sessionOrder.endState.length === 0
            ? '<div class="units-list-empty">Оберіть тег кінцевого стану і клікніть на мапі</div>'
            : this.sessionOrder.endState.map((item, index) => `
                <span class="unit-badge">${index + 1}. Сторона ${item.side}: ${this.endStateTags[item.tag].label}: (${item.x}, ${item.z})</span>
            `).join('');

        return `
            <div class="shop-item order-planner">
                <h5>Кінцевий стан</h5>
                <div class="details">
                    <div class="order-note">Це майбутні умови успіху сценарію: що має бути правдою після виконання наказу.</div>
                    <div class="order-note">${roleNotice}</div>
                    <div class="units-list-title">Стан</div>
                    <div class="order-tags">${tagButtons}</div>
                    <div class="units-list">
                        <div class="units-list-title">Прив’язані стани</div>
                        <div>${endStateList}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSupportTab() {
        const readinessSections = this.renderReadinessSections();
        const visibleSides = this.isInstructorRole() ? [1, 2] : [this.getActiveOrderSide()];
        const supportTables = visibleSides.map((side) => this.renderSupportSide(side)).join('');
        return `
            <div class="shop-item order-planner">
                <h5>Забезпечення</h5>
                <div class="details">
                    <div class="order-note">${this.isInstructorRole() ? 'Інструктор бачить забезпечення обох сторін і може коригувати сценарні обмеження.' : `Сторона ${this.getActiveOrderSide()} перевіряє власне забезпечення і готовність.`}</div>
                    <div class="order-support-grid">${supportTables}</div>
                </div>
            </div>
            <div class="shop-item order-planner">
                <h5>Готовність / PCC</h5>
                <div class="details">
                    <div class="order-check-grid">${readinessSections}</div>
                </div>
            </div>
        `;
    }

    renderSupportSide(side) {
        const support = this.sessionOrder.support[side];
        const rows = Object.entries(this.supportFields).map(([field, config]) => {
            const options = config.options.map((option) => {
                const activeClass = support[field] === option ? ' active' : '';
                return `<button class="order-check${activeClass}" onclick="event.stopPropagation(); game.setSupportValue(${side}, '${field}', '${this.escapeAttribute(option)}')">${this.escapeHtml(option)}</button>`;
            }).join('');
            return `
                <div class="support-row">
                    <div class="support-label">${this.escapeHtml(config.label)}</div>
                    <div class="order-tags">${options}</div>
                </div>
            `;
        }).join('');
        return `
            <div class="order-check-group">
                <div class="order-check-title">Сторона ${side}</div>
                ${rows}
            </div>
        `;
    }

    formatOrderPoint(point) {
        return point ? `клітинка (${point.x}, ${point.z})` : 'не задано';
    }

    formatTaskCells(task) {
        const cells = task.cells || [{ x: task.x, z: task.z }];
        return cells.map((cell) => `(${cell.x}, ${cell.z})`).join(' - ');
    }

    renderReadinessSections() {
        return Object.entries(this.orderReadinessGroups).map(([groupKey, group]) => {
            const selected = this.sessionOrder.readiness[groupKey] || [];
            const items = group.items.map((item) => {
                const isActive = selected.includes(item);
                const activeClass = isActive ? ' active' : '';
                return `<button class="order-check${activeClass}" onclick="event.stopPropagation(); game.toggleOrderReadiness('${groupKey}', '${this.escapeAttribute(item)}')">${this.escapeHtml(item)}</button>`;
            }).join('');
            return `
                <div class="order-check-group">
                    <div class="order-check-title">${this.escapeHtml(group.title)}</div>
                    <div class="order-tags">${items}</div>
                </div>
            `;
        }).join('');
    }

    escapeAttribute(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, ' ');
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
        previews.forEach((element) => this.renderUnitCardPreview(element));
    }

    renderUnitCardPreview(element) {
        const unitType = element.dataset.unitType;
        const unitConfig = this.config && this.config.unitTypes ? this.config.unitTypes[unitType] : null;
        if (!unitType || element.dataset.rendered === '1') {
            return;
        }

        if (unitConfig && unitConfig.imageDataUrl) {
            element.innerHTML = `<img alt="Unit custom preview" src="${this.escapeHtml(unitConfig.imageDataUrl)}">`;
            element.dataset.rendered = '1';
            return;
        }

        const cacheKey = `symbol:${unitType}:${this.getUnitSymbolKind(unitType, unitConfig)}:${this.getUnitSymbolLabel(unitType, unitConfig)}`;
        if (this.unitPreviewCache[cacheKey]) {
            element.innerHTML = `<img alt="NATO symbol preview" src="${this.unitPreviewCache[cacheKey]}">`;
            element.dataset.rendered = '1';
            return;
        }

        const dataUrl = this.createUnitSymbolDataUrl(unitType, 1, unitConfig);
        this.unitPreviewCache[cacheKey] = dataUrl;
        element.innerHTML = `<img alt="NATO symbol preview" src="${dataUrl}">`;
        element.dataset.rendered = '1';
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
        this.sessionOrder.ui.activeTaskTag = tag;
        this.sessionOrder.ui.activeGeometry = this.orderTaskTags[tag].geometry || this.sessionOrder.ui.activeGeometry;
        if (this.sessionOrder.ui.draftTask) {
            this.sessionOrder.ui.draftTask.tag = tag;
            this.sessionOrder.ui.draftTask.geometry = this.sessionOrder.ui.activeGeometry;
            this.sessionOrder.ui.draftTask.generatedText = this.generateTaskText(
                this.sessionOrder.ui.draftTask.side,
                this.sessionOrder.ui.draftTask.tag,
                this.sessionOrder.ui.draftTask.geometry,
                this.sessionOrder.ui.draftTask.cells || []
            );
            this.renderOrderTaskMarkers();
        }
        this.addLog(`Активний тег завдання: ${this.orderTaskTags[tag].label}`, 'place-log');
        this.updateUI();
    }

    setOrderTaskSide(side) {
        if (![1, 2].includes(side)) return;
        this.sessionOrder.ui.activeSide = side;
        this.addLog(`Задачі призначаються для сторони ${side}`, 'place-log');
        this.updateUI();
    }

    setOrderRole(role) {
        const normalizedRole = role === '1' || role === 1 ? 1 : (role === '2' || role === 2 ? 2 : 'instructor');
        if (!this.orderRoles[normalizedRole]) return;
        this.sessionOrder.ui.activeRole = normalizedRole;
        if (normalizedRole === 1 || normalizedRole === 2) {
            this.sessionOrder.ui.activeSide = normalizedRole;
        }
        this.ensureActiveOrderTab();
        this.addLog(`Активна роль налаштування: ${this.orderRoles[normalizedRole].label}`, 'place-log');
        this.updateUI();
    }

    getActiveOrderSide() {
        return this.sessionOrder.ui.activeRole === 2 ? 2 : 1;
    }

    isInstructorRole() {
        return this.sessionOrder.ui.activeRole === 'instructor';
    }

    markOrderRoleDirty(role = this.sessionOrder.ui.activeRole) {
        if (role === 1 || role === 2 || role === 'instructor') {
            this.sessionOrder.readinessByRole[role] = false;
        }
    }

    setOrderTab(tab) {
        if (!this.getVisibleOrderTabs().some((item) => item.key === tab)) return;
        this.sessionOrder.ui.activeTab = tab;
        this.updateUI();
    }

    setUnitEditorSelectedType(unitType) {
        if (!this.config.unitTypes[unitType]) return;
        this.unitEditorSelectedType = unitType;
        this.updateUI();
    }

    updateUnitConfigField(unitType, field, value) {
        const unitConfig = this.config.unitTypes[unitType];
        if (!unitConfig) return;

        const numericFields = new Set(['cost', 'hitpoints', 'strength', 'movement']);
        unitConfig[field] = numericFields.has(field) ? Math.max(0, Number(value) || 0) : String(value ?? '');
        if (field === 'imageDataUrl' && !unitConfig.imageDataUrl.trim()) {
            delete unitConfig.imageDataUrl;
        }
        this.unitPreviewCache = {};
        this.refreshPurchasedUnitConfigs(unitType);
        this.markOrderRoleDirty('instructor');
        this.updateUI();
    }

    addCustomUnit() {
        const id = `custom_${Date.now()}`;
        this.config.unitTypes[id] = {
            name: 'Новий юніт',
            cost: 100,
            hitpoints: 2,
            strength: 2,
            movement: 1,
            description: 'Опис нового підрозділу',
            model: 'custom',
            symbolKind: 'infantry',
            symbolLabel: 'Н'
        };
        this.unitModelPaths[id] = null;
        this.unitEditorSelectedType = id;
        this.unitPreviewCache = {};
        this.markOrderRoleDirty('instructor');
        this.updateUI();
    }

    handleUnitImageUpload(unitType, input) {
        const file = input && input.files ? input.files[0] : null;
        if (!file || !this.config.unitTypes[unitType]) return;

        const reader = new FileReader();
        reader.onload = () => {
            this.config.unitTypes[unitType].imageDataUrl = String(reader.result || '');
            this.unitPreviewCache = {};
            this.markOrderRoleDirty('instructor');
            this.updateUI();
        };
        reader.readAsDataURL(file);
    }

    refreshPurchasedUnitConfigs(unitType) {
        [1, 2].forEach((side) => {
            (this.purchasedUnits[side] || []).forEach((unit) => {
                if (unit.type === unitType) {
                    unit.config = this.config.unitTypes[unitType];
                }
            });
            this.sessionOrder.orbat[side] = (this.purchasedUnits[side] || []).map((unit) => ({
                type: unit.type,
                name: unit.config.name,
                placed: unit.placed
            }));
        });
    }

    setOrderGeometry(geometry) {
        if (!this.orderGeometryTypes[geometry]) return;
        this.sessionOrder.ui.activeGeometry = geometry;
        if (this.sessionOrder.ui.draftTask) {
            this.sessionOrder.ui.draftTask.geometry = geometry;
            this.sessionOrder.ui.draftTask.generatedText = this.generateTaskText(
                this.sessionOrder.ui.draftTask.side,
                this.sessionOrder.ui.draftTask.tag,
                this.sessionOrder.ui.draftTask.geometry,
                this.sessionOrder.ui.draftTask.cells || []
            );
            this.renderOrderTaskMarkers();
        }
        this.updateUI();
    }

    setSituationTool(tool) {
        if (!['areaOfInterest', 'executionArea'].includes(tool)) return;
        this.sessionOrder.ui.activeSituationTool = tool;
        this.updateUI();
    }

    setEnemyInfoPercent(side, value) {
        const percent = Math.max(0, Math.min(100, Number(value) || 0));
        this.sessionOrder.situation.enemyInfoPercentBySide[side] = percent;
        this.markOrderRoleDirty('instructor');
        this.updateUI();
    }

    setEndStateTag(tag) {
        if (!this.endStateTags[tag]) return;
        this.sessionOrder.ui.activeEndStateTag = tag;
        this.updateUI();
    }

    setSupportValue(side, field, value) {
        if (!this.supportFields[field] || !this.sessionOrder.support[side]) return;
        this.sessionOrder.support[side][field] = value;
        this.markOrderRoleDirty(side);
        this.updateUI();
    }

    toggleOrderReadiness(groupKey, item) {
        if (!this.orderReadinessGroups[groupKey]) return;
        if (!this.sessionOrder.readiness[groupKey]) {
            this.sessionOrder.readiness[groupKey] = [];
        }

        const selected = this.sessionOrder.readiness[groupKey];
        const itemIndex = selected.indexOf(item);
        if (itemIndex >= 0) {
            selected.splice(itemIndex, 1);
        } else {
            selected.push(item);
        }

        this.markOrderRoleDirty();
        this.updateUI();
    }

    addOrderTaskAtCell(x, z) {
        if (this.phase !== 'order') return;

        if (this.sessionOrder.ui.activeTab === 'situation') {
            if (!this.isInstructorRole()) {
                this.addLog('Обстановку на карті задає інструктор.', 'place-log');
                return;
            }
            const tool = this.sessionOrder.ui.activeSituationTool;
            this.sessionOrder.situation[tool] = { x, z };
            this.markOrderRoleDirty('instructor');
            this.renderOrderTaskMarkers();
            this.addLog(`${tool === 'areaOfInterest' ? 'Зону інтересу' : 'Район виконання'} задано: (${x}, ${z})`, 'place-log');
            this.updateUI();
            return;
        }

        if (this.sessionOrder.ui.activeTab === 'endState') {
            if (this.isInstructorRole()) {
                this.addLog('Кінцевий стан сторони редагується в ролі Сторона 1 або Сторона 2.', 'place-log');
                return;
            }
            const side = this.getActiveOrderSide();
            const tag = this.sessionOrder.ui.activeEndStateTag;
            const existing = this.sessionOrder.endState.find((item) => item.x === x && item.z === z && item.side === side);
            if (existing) {
                existing.tag = tag;
            } else {
                this.sessionOrder.endState.push({ id: `end-${Date.now()}-${this.sessionOrder.endState.length}`, side, tag, x, z });
            }
            this.markOrderRoleDirty(side);
            this.renderOrderTaskMarkers();
            this.addLog(`Сторона ${side}: кінцевий стан "${this.endStateTags[tag].label}" прив'язано до (${x}, ${z})`, 'place-log');
            this.updateUI();
            return;
        }

        const tag = this.sessionOrder.ui.activeTaskTag;
        if (this.isInstructorRole()) {
            this.addLog('Бойові задачі сторін редагуються в ролі Сторона 1 або Сторона 2.', 'place-log');
            return;
        }
        const side = this.getActiveOrderSide();
        const geometry = this.sessionOrder.ui.activeGeometry;
        const taskConfig = this.orderTaskTags[tag];
        let draftTask = this.sessionOrder.ui.draftTask;
        if (!draftTask || draftTask.side !== side) {
            draftTask = {
                side,
                tag,
                geometry,
                cells: []
            };
            this.sessionOrder.ui.draftTask = draftTask;
        }
        draftTask.tag = tag;
        draftTask.geometry = geometry;

        if (geometry === 'point') {
            draftTask.cells = [{ x, z }];
        } else {
            const exists = draftTask.cells.some((cell) => cell.x === x && cell.z === z);
            if (!exists) {
                draftTask.cells.push({ x, z });
            }
        }
        draftTask.x = draftTask.cells[0].x;
        draftTask.z = draftTask.cells[0].z;
        draftTask.generatedText = this.generateTaskText(side, tag, geometry, draftTask.cells);

        this.markOrderRoleDirty(side);
        this.renderOrderTaskMarkers();
        this.addLog(`Сторона ${side}: додано точку до чернетки "${taskConfig.label}" (${x}, ${z})`, 'place-log');
        this.updateUI();
    }

    saveCurrentOrderTask() {
        const draftTask = this.sessionOrder.ui.draftTask;
        if (!draftTask || !draftTask.cells || draftTask.cells.length === 0) {
            this.addLog('Немає чернетки завдання для збереження.', 'place-log');
            return;
        }

        const side = draftTask.side;
        const savedCells = draftTask.cells.map((cell) => ({ x: cell.x, z: cell.z }));
        const savedTask = {
            id: `task-${Date.now()}-${this.sessionOrder.tasks.length}`,
            side,
            tag: draftTask.tag,
            geometry: draftTask.geometry,
            cells: savedCells,
            x: savedCells[0].x,
            z: savedCells[0].z,
            objectId: null,
            generatedText: this.generateTaskText(side, draftTask.tag, draftTask.geometry, savedCells)
        };
        this.sessionOrder.tasks.push(savedTask);
        this.sessionOrder.ui.draftTask = null;
        this.markOrderRoleDirty(side);
        this.renderOrderTaskMarkers();
        this.addLog(`Сторона ${side}: збережено завдання ${this.sessionOrder.tasks.length}`, 'place-log');
        this.updateUI();
    }

    clearCurrentOrderTask() {
        this.sessionOrder.ui.draftTask = null;
        this.renderOrderTaskMarkers();
        this.updateUI();
    }

    generateTaskText(side, tag, geometry, cells) {
        const tagLabel = this.orderTaskTags[tag] ? this.orderTaskTags[tag].label : tag;
        const geometryLabel = this.orderGeometryTypes[geometry] ? this.orderGeometryTypes[geometry].label.toLowerCase() : geometry;
        const cellText = cells.map((cell) => `(${cell.x}, ${cell.z})`).join(' - ');
        return `Сторона ${side}: ${tagLabel.toLowerCase()} ${geometryLabel} ${cellText}.`;
    }

    renderOrderTaskMarkers() {
        this.orderTaskMarkerMeshes.forEach((mesh) => this.scene.remove(mesh));
        this.orderTaskMarkerMeshes = [];

        const situation = this.sessionOrder.situation;
        [
            { point: situation.areaOfInterest, color: 0xffd700 },
            { point: situation.executionArea, color: 0x7dd3fc }
        ].forEach((item) => {
            if (!item.point) return;
            const marker = this.addCellHighlight(item.point.x, item.point.z, item.color, 0.36, 5, false);
            this.orderTaskMarkerMeshes.push(marker);
        });

        if (!this.mapLayers.tasks) {
            return;
        }

        this.sessionOrder.tasks.forEach((task, index) => {
            const color = (this.orderTaskTags[task.tag] && this.orderTaskTags[task.tag].color) || this.getUnitPalette(task.side).base;
            const cells = task.cells || [{ x: task.x, z: task.z }];
            cells.forEach((cell) => {
                const marker = this.addCellHighlight(cell.x, cell.z, color, 0.48, 5, false);
                marker.userData.orderTask = task;
                this.orderTaskMarkerMeshes.push(marker);
            });
            const labelCell = cells[Math.floor(cells.length / 2)] || cells[0];
            if (labelCell) {
                this.orderTaskMarkerMeshes.push(this.addMapTextLabel(labelCell.x, labelCell.z, `Завд. ${index + 1}`, color, 0.72));
            }
        });

        const draftTask = this.sessionOrder.ui.draftTask;
        if (draftTask && draftTask.cells && draftTask.cells.length > 0) {
            const color = (this.orderTaskTags[draftTask.tag] && this.orderTaskTags[draftTask.tag].color) || this.getUnitPalette(draftTask.side).base;
            draftTask.cells.forEach((cell) => {
                const marker = this.addCellHighlight(cell.x, cell.z, color, 0.32, 4.3, false);
                marker.userData.draftTask = draftTask;
                this.orderTaskMarkerMeshes.push(marker);
            });
            const labelCell = draftTask.cells[Math.floor(draftTask.cells.length / 2)] || draftTask.cells[0];
            this.orderTaskMarkerMeshes.push(this.addMapTextLabel(labelCell.x, labelCell.z, `Чернетка ${this.sessionOrder.tasks.length + 1}`, color, 0.72));
        }

        this.sessionOrder.endState.forEach((item, index) => {
            const color = (this.endStateTags[item.tag] && this.endStateTags[item.tag].color) || this.getUnitPalette(item.side).base;
            const marker = this.addCellHighlight(item.x, item.z, color, 0.62, 6, false);
            marker.userData.endState = item;
            this.orderTaskMarkerMeshes.push(marker);
            this.orderTaskMarkerMeshes.push(this.addMapTextLabel(item.x, item.z, `КС ${index + 1}`, color, 1.0));
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
        this.sessionOrder.orbat[player] = this.purchasedUnits[player].map((unit) => ({
            type: unit.type,
            name: unit.config.name,
            placed: unit.placed
        }));
        this.markOrderRoleDirty(player);

        this.addLog(`Сторона ${player}: додано ${unitConfig.name} до складу бойового наказу`, 'place-log');
        this.updateUI();
    }

    updateButtonColors() {
        const endTurnBtn = document.getElementById('endTurnBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        // Кольори кнопок в залежності від гравця
        if (this.phase === 'order') {
            endTurnBtn.className = this.sessionOrder.ui.activeRole === 2 ? 'player2-btn' : (this.sessionOrder.ui.activeRole === 1 ? 'player1-btn' : 'neutral-btn');
        } else {
            endTurnBtn.className = this.currentPlayer === 1 ? 'player1-btn' : 'player2-btn';
        }
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
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
        }

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
        gridHelper.visible = this.mapLayers.grid;
        this.gridHelper = gridHelper;
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

    getUnitSymbolKind(type, unitConfig = null) {
        const config = unitConfig || (this.config && this.config.unitTypes ? this.config.unitTypes[type] : null) || {};
        if (config.symbolKind) return config.symbolKind;
        const key = `${type} ${config.name || ''} ${config.description || ''} ${config.referencePath || ''}`.toLowerCase();

        if (/armor|tank|btr|bmp|брон|танк|бтр|бмп/.test(key)) return 'armor';
        if (/artillery|himars|grad|m777|arty|арт|град|гармат|гаубиц/.test(key)) return 'artillery';
        if (/command|signal|ksp|зв'яз|зв’яз|команд|ксп/.test(key)) return 'command';
        if (/recon|bpla|mavic|drone|розвід|бпла|квадро/.test(key)) return 'scout';
        if (/sniper|снайпер/.test(key)) return 'sniper';
        if (/antitank|javelin|rpg|ptrk|птрк|гранатомет/.test(key)) return 'antitank';
        if (/mortar|міномет|minomet/.test(key)) return 'mortar';
        if (/medic|медик|evac|евак/.test(key)) return 'medical';
        if (/vehicle|pickup|пікап|машин|transport/.test(key)) return 'vehicle';
        if (/support|кулемет|machinegun|kulemet/.test(key)) return 'support';
        return 'infantry';
    }

    getUnitSymbolLabel(type, unitConfig = null) {
        const config = unitConfig || (this.config && this.config.unitTypes ? this.config.unitTypes[type] : null) || {};
        if (config.symbolLabel) return config.symbolLabel;
        const kind = this.getUnitSymbolKind(type, config);
        const labels = {
            infantry: 'ПХ',
            armor: 'ТНК',
            artillery: 'АРТ',
            command: 'КСП',
            scout: 'РЗВ',
            sniper: 'СНП',
            antitank: 'ПТРК',
            mortar: 'МІН',
            medical: 'МЕД',
            vehicle: 'ТР',
            support: 'ПІД'
        };
        return labels[kind] || (config.name || type).slice(0, 4).toUpperCase();
    }

    createUnitSymbolTexture(type, player, unitConfig = null) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const palette = this.getUnitPalette(player);
        const symbolKind = this.getUnitSymbolKind(type, unitConfig);
        const symbolLabel = this.getUnitSymbolLabel(type, unitConfig);

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

        const drawAntitank = () => {
            drawInfantry();
            ctx.beginPath();
            ctx.moveTo(78, 178);
            ctx.lineTo(128, 92);
            ctx.lineTo(178, 178);
            ctx.stroke();
        };

        const drawMortar = () => {
            drawArtillery();
            ctx.beginPath();
            ctx.moveTo(86, 158);
            ctx.quadraticCurveTo(128, 70, 170, 158);
            ctx.stroke();
        };

        const drawMedical = () => {
            drawInfantry();
            ctx.fillStyle = '#191919';
            ctx.fillRect(116, 86, 24, 72);
            ctx.fillRect(92, 110, 72, 24);
        };

        const drawVehicle = () => {
            ctx.beginPath();
            ctx.rect(72, 94, 112, 54);
            ctx.moveTo(88, 158);
            ctx.lineTo(168, 158);
            ctx.stroke();
        };

        const drawSupport = () => {
            drawInfantry();
            ctx.beginPath();
            ctx.moveTo(78, 154);
            ctx.lineTo(178, 86);
            ctx.stroke();
        };

        switch (symbolKind) {
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
            case 'antitank':
                drawAntitank();
                break;
            case 'mortar':
                drawMortar();
                break;
            case 'medical':
                drawMedical();
                break;
            case 'vehicle':
                drawVehicle();
                break;
            case 'support':
                drawSupport();
                break;
            case 'infantry':
            default:
                drawInfantry();
                break;
        }

        ctx.fillStyle = '#191919';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbolLabel, centerX, 214);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
    }

    createUnitSymbolDataUrl(type, player, unitConfig = null) {
        const texture = this.createUnitSymbolTexture(type, player, unitConfig);
        const dataUrl = texture.image.toDataURL('image/png');
        texture.dispose();
        return dataUrl;
    }

    createNatoSymbolToken(type, player, unitConfig = null) {
        const palette = this.getUnitPalette(player);
        const group = new THREE.Group();

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.46, 32),
            new THREE.MeshBasicMaterial({
                color: palette.dark,
                transparent: true,
                opacity: 0.18,
                depthWrite: false
            })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.018;
        group.add(shadow);

        const symbol = new THREE.Mesh(
            new THREE.PlaneGeometry(0.86, 0.86),
            new THREE.MeshBasicMaterial({
                map: this.createUnitSymbolTexture(type, player, unitConfig),
                transparent: false,
                side: THREE.DoubleSide
            })
        );
        symbol.rotation.x = -Math.PI / 2;
        symbol.position.y = 0.05;
        symbol.renderOrder = 8;
        symbol.userData.isNatoSymbol = true;
        group.add(symbol);

        return group;
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

        const symbolToken = this.createNatoSymbolToken(type, player, unitConfig);
        symbolToken.userData.isReferenceModel = true;
        unit.add(symbolToken);

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
            const role = this.sessionOrder.ui.activeRole;
            if (role === 1 || role === 2) {
                this.sessionOrder.readinessByRole[role] = true;
                this.addLog(`Сторона ${role} позначила бойовий наказ як готовий.`, 'place-log');
                this.updateUI();
                return;
            }

            if (!(this.sessionOrder.readinessByRole[1] && this.sessionOrder.readinessByRole[2])) {
                this.addLog('Інструктор може стартувати гру після готовності сторони 1 і сторони 2.', 'combat-log');
                this.updateUI();
                return;
            }

            this.sessionOrder.readinessByRole.instructor = true;
            this.currentPlayer = 1;
            this.sessionViewRole = 1;
            this.addLog('Інструктор стартує гру. Починається розміщення сторони 1.', 'place-log');
            this.startPlacement();
            return;
        }

        if (this.phase === 'placement') {
            this.placementPhase[this.currentPlayer] = false;
            this.addLog(`Player ${this.currentPlayer} finished placement.`, 'place-log');

            if (this.currentPlayer === 1) {
                this.currentPlayer = 2;
                this.sessionViewRole = 2;
                this.phase = 'placement';
                this.placementPhase[2] = true;
                this.addLog('Player 2 starts placement from the approved battle order.', 'place-log');
            } else {
                this.phase = 'battle';
                this.currentPlayer = 1;
                this.sessionViewRole = 1;
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
                this.sessionViewRole = 2;
                this.units
                    .filter((unit) => unit.userData.player === 2)
                    .forEach((unit) => {
                        unit.userData.moved = false;
                    });
            } else {
                this.turnNumber += 1;
                this.currentPlayer = 1;
                this.sessionViewRole = 1;
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

        if (this.groundMesh) {
            const groundHits = this.raycaster.intersectObject(this.groundMesh, false);
            if (groundHits.length > 0) {
                const coords = this.worldPointToCell(groundHits[0].point);
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
                return null;
            }
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

        return null;
    }

    worldPointToCell(point) {
        const half = (this.gridSize * this.cellSize) / 2;
        const epsilon = 1e-6;
        const x = Math.floor((point.x + half + epsilon) / this.cellSize);
        const z = Math.floor((point.z + half + epsilon) / this.cellSize);
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
        this.showUnitInfo(unit);
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

    addMapTextLabel(x, z, text, color, yOffset = 0.75) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        const cssColor = `#${new THREE.Color(color).getHexString()}`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(10, 24, 30, 0.82)';
        ctx.strokeStyle = cssColor;
        ctx.lineWidth = 5;
        this.roundRect(ctx, 10, 16, 236, 64, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f7fbff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 49);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.6, 0.95, 1);
        sprite.position.set(this.toWorldCoord(x), this.getSurfaceYAtCell(x, z) + yOffset, this.toWorldCoord(z));
        sprite.renderOrder = 20;
        this.scene.add(sprite);
        return sprite;
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
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

        if (this.sessionViewRole === 'instructor') {
            this.showUnitInfo(unit);
            this.addLog(`Інструктор переглядає: ${this.config.unitTypes[unit.userData.type].name}`, 'move-log');
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
            this.sessionViewRole = 1;
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

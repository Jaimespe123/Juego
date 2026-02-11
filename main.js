// 🎮 CAR VS ZOMBIES - MÓDULO PRINCIPAL
// Punto de entrada de la aplicación

import { CONFIG, ZOMBIE_TYPES, POWERUP_TYPES, ACHIEVEMENTS } from './config.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';

console.log('🚀 Iniciando Car vs Zombies ULTRA (Modular)...');

// ========== GESTIÓN DE ESTADO ==========
const gameState = {
  hasSlowMo: false,
  hasFreezeEffect: false,
  hasDoubleCoins: false,
  poisonDamageTimer: 0,
  poisonActive: false,
  startTime: 0,
  running: false,
  paused: false,
  score: 0,
  hp: 100,
  maxHp: 100,
  lastSpawn: 0,
  lastTime: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  kills: 0,
  wave: 1,
  zombiesKilledThisWave: 0,
  powerups: new Map(),
  hasShield: false,
  hasTurbo: false,
  hasMagnet: false,
  hasWeapon: false,
};

const carState = {
  velocity: null,
  angularVelocity: 0,
  nitro: 100,
  maxNitro: 100,
  wheelAngle: 0,
  targetWheelAngle: 0,
  driftAmount: 0,
  suspensionPhase: 0,
  suspensionY: 0,
};

const dayNightCycle = {
  enabled: true,
  time: 0,
  speed: 0.00005,
};

const sessionStats = {
  totalKills: 0,
  maxCombo: 0,
  maxSpeed: 0,
  survivalTime: 0,
  maxWave: 0,
  nitroUses: 0,
  damageTaken: 0,
  noDamageRun: true,
};

// ========== INICIALIZACIÓN ==========
const storage = new StorageManager();
const ui = new UIManager(storage);

// Variables Three.js (se inicializarán en initThree)
let scene, camera, renderer, car, zombies = [], powerups = [];
let composer, clock;

// ========== UTILIDADES ==========
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ========== AUDIO ==========
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const audioNodes = {
  master: null,
  engine: null,
  sfx: null,
  music: null,
  engineOsc: null,
  engineNoise: null
};

function initAudio() {
  try {
    if (audioCtx) return;
    audioCtx = new AudioContext();
    audioNodes.master = audioCtx.createGain();
    audioNodes.engine = audioCtx.createGain();
    audioNodes.sfx = audioCtx.createGain();
    audioNodes.music = audioCtx.createGain();
    audioNodes.master.connect(audioCtx.destination);
    audioNodes.engine.connect(audioNodes.master);
    audioNodes.sfx.connect(audioNodes.master);
    audioNodes.music.connect(audioNodes.master);
    updateAudioGains();
  } catch (e) {
    console.warn('Audio no disponible:', e);
  }
}

function updateAudioGains() {
  if (!audioCtx) return;
  const masterVol = ui.elements.volMaster?.value || 0.8;
  const engineVol = ui.elements.volEngine?.value || 0.8;
  const sfxVol = ui.elements.volSfx?.value || 0.9;
  
  audioNodes.master.gain.value = masterVol;
  audioNodes.engine.gain.value = engineVol * 0.3;
  audioNodes.sfx.gain.value = sfxVol;
}

function playSFX(frequency, duration = 100, type = 'sine') {
  if (!audioCtx || !audioNodes.sfx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioNodes.sfx);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
  } catch (e) {
    console.warn('Error reproduciendo SFX:', e);
  }
}

// ========== THREE.JS INIT ==========
function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0e14, 60, 240);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(6, 8, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  ui.elements.container.appendChild(renderer.domElement);

  // Luces
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;
  const d = 100;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Crear mundo (carretera, árboles, etc.)
  createWorld();
  createCar();

  clock = new THREE.Clock();
}

function createWorld() {
  // Carretera
  const roadGeometry = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
  const roadMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a,
    roughness: 0.8,
    metalness: 0.2 
  });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  // Líneas de carretera
  const lineGeometry = new THREE.PlaneGeometry(0.3, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  
  for (let i = -1; i <= 1; i += 2) {
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(i * (CONFIG.ROAD_WIDTH / 3), 0.01, 0);
    scene.add(line);
  }

  // Terreno lateral
  for (let side of [-1, 1]) {
    const terrainGeometry = new THREE.PlaneGeometry(50, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
    const terrainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3a1a,
      roughness: 0.9 
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(side * (CONFIG.ROAD_WIDTH / 2 + 25), -0.1, 0);
    terrain.receiveShadow = true;
    scene.add(terrain);
  }
}

function createCar() {
  const carGroup = new THREE.Group();
  
  // Cuerpo del coche
  const bodyGeometry = new THREE.BoxGeometry(1.6, 0.8, 3.2);
  const selectedColor = storage.playerData.selectedColor || 0;
  const colorHex = CONFIG.SHOP_COLORS?.[selectedColor]?.hex || 0x1f7ad2;
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: colorHex,
    roughness: 0.3,
    metalness: 0.7 
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.8;
  body.castShadow = true;
  carGroup.add(body);

  // Cabina
  const cabinGeometry = new THREE.BoxGeometry(1.4, 0.6, 1.6);
  const cabinMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.2,
    metalness: 0.8 
  });
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Ruedas
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    roughness: 0.9 
  });
  
  const wheelPositions = [
    [-0.9, 0.4, 1.2],
    [0.9, 0.4, 1.2],
    [-0.9, 0.4, -1.2],
    [0.9, 0.4, -1.2]
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.castShadow = true;
    carGroup.add(wheel);
  });

  car = carGroup;
  car.position.set(0, 0, 0);
  scene.add(car);

  // Inicializar velocidad
  carState.velocity = new THREE.Vector3(0, 0, 0);
}

// ========== CONTROL DEL JUEGO ==========
const keys = {};
let mouseX = 0, mouseY = 0;

function setupControls() {
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'n' && gameState.running) {
      useNitro();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Botones UI
  if (ui.elements.startBtn) {
    ui.elements.startBtn.addEventListener('click', startGame);
  }
  if (ui.elements.playAgain) {
    ui.elements.playAgain.addEventListener('click', () => {
      ui.hideGameOver();
      startGame();
    });
  }
  if (ui.elements.toMenu) {
    ui.elements.toMenu.addEventListener('click', () => {
      ui.hideGameOver();
      ui.showMenu();
    });
  }
  if (ui.elements.btnOpenMenu) {
    ui.elements.btnOpenMenu.addEventListener('click', () => {
      if (gameState.running) {
        gameState.paused = true;
      }
      ui.showMenu();
    });
  }
  if (ui.elements.btnRestart) {
    ui.elements.btnRestart.addEventListener('click', resetGame);
  }
}

function useNitro() {
  if (carState.nitro >= 20) {
    gameState.hasTurbo = true;
    carState.nitro = Math.max(0, carState.nitro - 20);
    playSFX(800, 500, 'square');
    ui.showInGameMessage('🔥 NITRO!', 800);
    setTimeout(() => gameState.hasTurbo = false, 2000);
    sessionStats.nitroUses++;
  }
}

// ========== LOOP PRINCIPAL ==========
function animate(now) {
  requestAnimationFrame(animate);
  
  if (!gameState.running || gameState.paused) {
    renderer.render(scene, camera);
    return;
  }

  const delta = Math.min((now - gameState.lastTime) / 1000, 0.1);
  gameState.lastTime = now;

  updateCar(delta);
  updateCamera();
  updateZombies(delta);
  updatePowerups(delta);
  
  ui.updateHUD(gameState, carState);
  
  renderer.render(scene, camera);
}

function updateCar(delta) {
  if (!car || !carState.velocity) return;

  // Aceleración
  let accel = 0;
  if (keys['w'] || keys['arrowup']) accel = CONFIG.ACCELERATION;
  if (keys['s'] || keys['arrowdown']) accel = -CONFIG.BRAKE_FORCE;

  // Turbo
  if (gameState.hasTurbo) accel *= 1.8;

  // Dirección con ratón
  const sensitivity = ui.elements.mouseSensitivity?.value || 1;
  carState.targetWheelAngle = -mouseX * 0.5 * sensitivity;
  carState.wheelAngle = lerp(carState.wheelAngle, carState.targetWheelAngle, 0.15);

  // Física de movimiento
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
  const accelVec = forward.multiplyScalar(accel);
  carState.velocity.add(accelVec);

  // Fricción
  carState.velocity.multiplyScalar(CONFIG.FRICTION);

  // Limitar velocidad
  const speed = carState.velocity.length();
  const maxSpeed = CONFIG.MAX_SPEED * (gameState.hasTurbo ? 1.5 : 1);
  if (speed > maxSpeed) {
    carState.velocity.normalize().multiplyScalar(maxSpeed);
  }

  // Rotación
  if (speed > 0.05) {
    const turnAmount = carState.wheelAngle * CONFIG.TURN_SPEED * (speed / CONFIG.MAX_SPEED);
    car.rotation.y += turnAmount;
  }

  // Actualizar posición
  car.position.add(carState.velocity);

  // Mantener en carretera
  car.position.x = clamp(car.position.x, -CONFIG.ROAD_WIDTH / 2 + 1, CONFIG.ROAD_WIDTH / 2 - 1);

  // Recarga de nitro
  carState.nitro = Math.min(carState.maxNitro, carState.nitro + delta * 5);
}

function updateCamera() {
  if (!car || !camera) return;
  
  const idealOffset = new THREE.Vector3(0, 8, 12);
  idealOffset.applyQuaternion(car.quaternion);
  const idealPosition = car.position.clone().add(idealOffset);
  
  camera.position.lerp(idealPosition, 0.1);
  
  const lookAtTarget = car.position.clone();
  lookAtTarget.y += 1;
  camera.lookAt(lookAtTarget);
}

function updateZombies(delta) {
  // Placeholder - implementar lógica de zombies
}

function updatePowerups(delta) {
  // Placeholder - implementar lógica de power-ups
}

// ========== CONTROL DE JUEGO ==========
function startGame() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  ui.hideMenu();
  ui.hideBackgroundCanvas();
  ui.showHUD();

  resetGame();
  gameState.running = true;
  gameState.paused = false;
  gameState.startTime = performance.now();
  
  if (ui.elements.btnRestart) ui.elements.btnRestart.style.display = 'block';
  
  ui.showInGameMessage('¡Comienza el juego!', 2000);
}

function resetGame() {
  gameState.score = 0;
  gameState.hp = gameState.maxHp;
  gameState.wave = 1;
  gameState.kills = 0;
  gameState.combo = 0;
  gameState.zombiesKilledThisWave = 0;
  carState.nitro = 100;
  
  if (car) {
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    carState.velocity.set(0, 0, 0);
  }

  // Limpiar zombies y power-ups
  zombies.forEach(z => scene.remove(z));
  zombies = [];
  powerups.forEach(p => scene.remove(p));
  powerups = [];

  sessionStats.totalKills = 0;
  sessionStats.maxCombo = 0;
  sessionStats.noDamageRun = true;
}

function gameOver() {
  gameState.running = false;
  
  const coinsEarned = Math.floor(gameState.score / 10);
  storage.addCoins(coinsEarned);
  storage.updateStats({
    score: gameState.score,
    kills: gameState.kills,
  });

  ui.showGameOver({
    score: gameState.score,
    coins: coinsEarned,
    kills: gameState.kills,
    maxCombo: gameState.maxCombo,
  });

  if (ui.elements.btnRestart) ui.elements.btnRestart.style.display = 'none';
}

// ========== INICIALIZACIÓN ==========
try {
  initThree();
  setupControls();
  ui.hideHUD();
  ui.updateMenuStats();
  gameState.lastTime = performance.now();
  animate(gameState.lastTime);
  ui.showInGameMessage('🎮 ¡Bienvenido! Usa WASD + Ratón. Shift = Drift', 4000);
  
  // Exponer al global para debugging
  window.cvz = { scene, car, zombies, powerups, startGame, resetGame, storage, gameState };
  
  console.log('✅ Juego ULTRA inicializado (Modular)');
} catch (e) {
  console.error('❌ Error fatal:', e);
  alert('Error: ' + e.message);
}

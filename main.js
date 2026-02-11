// 🎮 CAR VS ZOMBIES - MÓDULO PRINCIPAL
// Punto de entrada de la aplicación

import { CONFIG, ZOMBIE_TYPES, POWERUP_TYPES, ACHIEVEMENTS, UPGRADES } from './config.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';

console.log('🚀 Iniciando Car vs Zombies ULTRA (Modular)...');

// ========== GESTIÓN DE ESTADO ==========
const gameState = {
  hasSlowMo: false,
  hasFreezeEffect: false,
  hasDoubleCoins: false,
  poisonDamageTimer: 0,
  poisonTickTimer: 0,
  poisonActive: false,
  startTime: 0,
  running: false,
  paused: false,
  score: 0,
  hp: 100,
  maxHp: 100,
  lastSpawn: 0,
  nextPowerupSpawnAt: 0,
  lastTime: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  kills: 0,
  wave: 1,
  zombiesKilledThisWave: 0,
  killsRequiredThisWave: 10,
  powerups: new Map(),
  hasShield: false,
  hasTurbo: false,
  hasMagnet: false,
  hasWeapon: false,
  damageCooldown: 0,
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
  speedMultiplier: 1,
  nitroRegenMultiplier: 1,
  coinMultiplier: 1,
  controlMode: 'hybrid',
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
let scene, camera, renderer, car;
let zombies = [];
let powerups = [];
let minimapCtx = null;
let fpsSmoothed = 60;
let audioUpdateBound = false;
let ambientLight, dirLight, hemiLight;
let skyDome, stars = [];
let environmentTime = 0;

// ========== UTILIDADES ==========
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getUpgradeValue(upgradeId, fallback) {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  const level = storage.getUpgradeLevel(upgradeId);
  if (!upgrade || level <= 0) return fallback;
  const lastLevel = upgrade.levels[Math.min(level - 1, upgrade.levels.length - 1)];
  return lastLevel?.value ?? fallback;
}

function applyPersistentBonuses() {
  gameState.maxHp = getUpgradeValue('health', 100);
  carState.speedMultiplier = getUpgradeValue('speed', 1);
  carState.nitroRegenMultiplier = getUpgradeValue('nitro', 1);
  carState.coinMultiplier = getUpgradeValue('coins', 1);
  gameState.hp = Math.min(gameState.hp, gameState.maxHp);
}

function unlockAchievementIfNeeded(id, condition) {
  if (!condition) return;
  const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === id);
  if (!achievement) return;

  const unlockedNow = storage.unlockAchievement(id, achievement);
  if (unlockedNow) {
    storage.addCoins(achievement.reward);
    ui.showInGameMessage(`🏆 Logro: ${achievement.name} (+${achievement.reward} 💰)`, 3000);
  }
}

// ========== AUDIO ==========
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const audioNodes = {
  master: null,
  engine: null,
  sfx: null,
  music: null,
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

function bindAudioUIEvents() {
  if (audioUpdateBound) return;
  const sliders = [ui.elements.volMaster, ui.elements.volEngine, ui.elements.volSfx].filter(Boolean);
  sliders.forEach(slider => slider.addEventListener('input', updateAudioGains));
  audioUpdateBound = true;
}

function updateAudioGains() {
  if (!audioCtx) return;
  const masterVol = parseFloat(ui.elements.volMaster?.value ?? '0.8');
  const engineVol = parseFloat(ui.elements.volEngine?.value ?? '0.8');
  const sfxVol = parseFloat(ui.elements.volSfx?.value ?? '0.9');

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
  scene.fog = new THREE.Fog(0x0a0e14, 60, 300);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(6, 8, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  ui.elements.container.appendChild(renderer.domElement);

  ambientLight = new THREE.AmbientLight(0x405060, 0.55);
  scene.add(ambientLight);

  hemiLight = new THREE.HemisphereLight(0x7eb8ff, 0x1a301a, 0.35);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(12, 24, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;
  const d = 120;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  createWorld();
  createEnvironmentFX();
  createCar();

  const minimap = document.getElementById('minimap');
  minimapCtx = minimap?.getContext('2d') || null;
}

function createWorld() {
  const roadGeometry = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.8,
    metalness: 0.2,
  });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  const lineGeometry = new THREE.PlaneGeometry(0.3, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  for (let i = -1; i <= 1; i += 2) {
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(i * (CONFIG.ROAD_WIDTH / 3), 0.01, 0);
    scene.add(line);
  }

  for (const side of [-1, 1]) {
    const terrainGeometry = new THREE.PlaneGeometry(50, CONFIG.CHUNK_LENGTH * CONFIG.NUM_CHUNKS);
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      roughness: 0.95,
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(side * (CONFIG.ROAD_WIDTH / 2 + 25), -0.1, 0);
    terrain.receiveShadow = true;
    scene.add(terrain);
  }
}


function createEnvironmentFX() {
  const skyGeo = new THREE.SphereGeometry(240, 24, 24);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x0d1b2a, side: THREE.BackSide });
  skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const starGeo = new THREE.SphereGeometry(0.18, 6, 6);
  const starMat = new THREE.MeshBasicMaterial({ color: 0x9bc7ff, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 120; i++) {
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(rand(-180, 180), rand(20, 120), rand(-180, 180));
    stars.push(star);
    scene.add(star);
  }

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2a8 });
  for (let z = -360; z <= 360; z += 30) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 8), lampMat);
      pole.position.set(side * (CONFIG.ROAD_WIDTH / 2 + 1.2), 2, z + rand(-2, 2));
      scene.add(pole);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), bulbMat);
      bulb.position.set(pole.position.x, 4.1, pole.position.z);
      scene.add(bulb);
    }
  }
}

function createCar() {
  const carGroup = new THREE.Group();

  const bodyGeometry = new THREE.BoxGeometry(1.6, 0.8, 3.2);
  const selectedColor = storage.playerData.selectedColor || 0;
  const colorHex = CONFIG.SHOP_COLORS?.[selectedColor]?.hex || 0x1f7ad2;
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.7,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.8;
  body.castShadow = true;
  body.name = 'carBody';
  carGroup.add(body);

  const cabinGeometry = new THREE.BoxGeometry(1.4, 0.6, 1.6);
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.2,
    metalness: 0.8,
  });
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  carGroup.add(cabin);

  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wheelPositions = [
    [-0.9, 0.4, 1.2],
    [0.9, 0.4, 1.2],
    [-0.9, 0.4, -1.2],
    [0.9, 0.4, -1.2],
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

  carState.velocity = new THREE.Vector3(0, 0, 0);
}

function updateCarColor() {
  if (!car) return;
  const body = car.getObjectByName('carBody');
  if (!body?.material) return;

  const selectedColor = storage.playerData.selectedColor || 0;
  const colorHex = CONFIG.SHOP_COLORS?.[selectedColor]?.hex || 0x1f7ad2;
  body.material.color.setHex(colorHex);
}

// ========== ZOMBIES ==========
function pickZombieType() {
  const wave = gameState.wave;
  const table = [
    ['NORMAL', 45],
    ['FAST', wave > 1 ? 20 : 8],
    ['TANK', wave > 2 ? 12 : 0],
    ['EXPLOSIVE', wave > 3 ? 10 : 0],
    ['POISON', wave > 4 ? 10 : 0],
    ['INVISIBLE', wave > 5 ? 8 : 0],
    ['GIANT', wave > 6 ? 6 : 0],
  ];

  const total = table.reduce((acc, [, w]) => acc + w, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of table) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'NORMAL';
}

function createZombie(typeKey = 'NORMAL') {
  const type = ZOMBIE_TYPES[typeKey] || ZOMBIE_TYPES.NORMAL;
  const radius = 0.45 * type.size;

  const geom = new THREE.CapsuleGeometry(radius, 1.1 * type.size, 6, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: type.color,
    transparent: Boolean(type.invisible),
    opacity: type.invisible ? 0.45 : 1,
    roughness: 0.8,
    metalness: 0.15,
  });

  const zombie = new THREE.Mesh(geom, mat);
  zombie.castShadow = true;
  zombie.position.set(
    rand(-CONFIG.ROAD_WIDTH / 2 + 1, CONFIG.ROAD_WIDTH / 2 - 1),
    radius,
    car.position.z - rand(45, 95),
  );

  zombie.userData = {
    kind: 'zombie',
    typeKey,
    radius,
    health: Math.ceil(type.health + gameState.wave * 0.15),
    speed: CONFIG.ZOMBIE_BASE_SPEED * type.speed * (1 + gameState.wave * 0.03),
    damage: type.damage,
    points: type.points,
    coins: type.coins,
    poison: Boolean(type.poison),
    explosive: Boolean(type.explosive),
    dead: false,
  };

  scene.add(zombie);
  zombies.push(zombie);
}

function removeZombie(zombie) {
  scene.remove(zombie);
  zombie.geometry?.dispose?.();
  zombie.material?.dispose?.();
}

function onZombieKilled(zombie) {
  if (zombie.userData.dead) return;
  zombie.userData.dead = true;

  const basePoints = zombie.userData.points;
  const comboMul = 1 + Math.min(gameState.combo, 30) * 0.03;
  gameState.score += Math.round(basePoints * comboMul);

  gameState.combo += 1;
  gameState.comboTimer = 2.5;
  gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);

  const coins = Math.max(1, Math.round(zombie.userData.coins * carState.coinMultiplier * (gameState.hasDoubleCoins ? 2 : 1)));
  storage.addCoins(coins);

  gameState.kills += 1;
  gameState.zombiesKilledThisWave += 1;
  sessionStats.totalKills += 1;

  if (zombie.userData.explosive) {
    const splashDamage = 6;
    zombies.forEach(other => {
      if (other === zombie || other.userData.dead) return;
      if (distance2D(other.position, zombie.position) < 4) {
        other.userData.health -= splashDamage;
      }
    });
  }

  if (gameState.zombiesKilledThisWave >= gameState.killsRequiredThisWave) {
    gameState.wave += 1;
    gameState.zombiesKilledThisWave = 0;
    gameState.killsRequiredThisWave = 8 + gameState.wave * 4;
    ui.showInGameMessage(`🌊 Oleada ${gameState.wave}`, 1800);
  }

  unlockAchievementIfNeeded('first_blood', gameState.kills >= 1);
  unlockAchievementIfNeeded('combo_master', gameState.maxCombo >= 20);
  unlockAchievementIfNeeded('wave_warrior', gameState.wave >= 10);
  unlockAchievementIfNeeded('zombie_slayer', storage.playerData.totalKills + gameState.kills >= 500);

  playSFX(220 + Math.random() * 160, 90, 'triangle');
}

function damagePlayer(amount, source = 'hit') {
  if (gameState.hasShield || gameState.damageCooldown > 0) return;

  gameState.hp -= amount;
  gameState.damageCooldown = 0.8;
  sessionStats.damageTaken += amount;
  sessionStats.noDamageRun = false;

  if (source === 'poison') {
    playSFX(140, 120, 'sawtooth');
  } else {
    playSFX(90, 180, 'square');
  }

  if (gameState.hp <= 0) {
    gameState.hp = 0;
    gameOver();
  }
}

function updateZombies(delta, now) {
  const baseSpawn = Math.max(260, CONFIG.SPAWN_DELAY_BASE - gameState.wave * 70);
  const spawnDelay = gameState.hasFreezeEffect ? baseSpawn * 1.2 : baseSpawn;

  if (now - gameState.lastSpawn > spawnDelay && zombies.length < 45) {
    const amount = gameState.wave >= 4 && Math.random() < 0.25 ? 2 : 1;
    for (let i = 0; i < amount; i++) {
      createZombie(pickZombieType());
    }
    gameState.lastSpawn = now;
  }

  const speed = carState.velocity.length();

  for (let i = zombies.length - 1; i >= 0; i--) {
    const zombie = zombies[i];
    if (!zombie) continue;

    if (zombie.userData.health <= 0) {
      onZombieKilled(zombie);
      removeZombie(zombie);
      zombies.splice(i, 1);
      continue;
    }

    const toCar = new THREE.Vector3(car.position.x - zombie.position.x, 0, car.position.z - zombie.position.z);
    const dist = Math.max(0.001, toCar.length());

    if (!gameState.hasFreezeEffect) {
      toCar.normalize();
      const speedMul = gameState.hasSlowMo ? 0.45 : 1;
      zombie.position.addScaledVector(toCar, zombie.userData.speed * delta * speedMul);
    }

    const hitDistance = zombie.userData.radius + 1.2;
    if (dist < hitDistance) {
      if (speed > 0.19 || gameState.hasWeapon) {
        zombie.userData.health -= speed > 0.35 ? 999 : 2;
      } else {
        damagePlayer(zombie.userData.damage * 0.1);
        if (zombie.userData.poison) {
          gameState.poisonActive = true;
          gameState.poisonDamageTimer = 4;
          gameState.poisonTickTimer = 0.45;
        }
      }
    }

    if (zombie.position.distanceTo(car.position) > 140) {
      removeZombie(zombie);
      zombies.splice(i, 1);
    }
  }
}

// ========== POWERUPS ==========
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);

function createPowerup(typeKey) {
  const type = POWERUP_TYPES[typeKey];
  if (!type) return;

  const geom = new THREE.OctahedronGeometry(0.45, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: type.color,
    emissive: type.color,
    emissiveIntensity: 0.4,
    metalness: 0.2,
    roughness: 0.3,
  });

  const item = new THREE.Mesh(geom, mat);
  item.position.set(
    rand(-CONFIG.ROAD_WIDTH / 2 + 1.4, CONFIG.ROAD_WIDTH / 2 - 1.4),
    1,
    car.position.z - rand(30, 80),
  );

  item.userData = {
    kind: 'powerup',
    typeKey,
    bobOffset: Math.random() * Math.PI * 2,
  };

  scene.add(item);
  powerups.push(item);
}

function clearPowerupFlags() {
  gameState.hasSlowMo = false;
  gameState.hasFreezeEffect = false;
  gameState.hasDoubleCoins = false;
  gameState.hasShield = false;
  gameState.hasTurbo = false;
  gameState.hasMagnet = false;
  gameState.hasWeapon = false;
  gameState.powerups.clear();
}

function applyPowerup(typeKey, now) {
  const powerup = POWERUP_TYPES[typeKey];
  if (!powerup) return;

  switch (powerup.effect) {
    case 'heal':
      gameState.hp = Math.min(gameState.maxHp, gameState.hp + 30);
      ui.showInGameMessage('❤️ +30 vida', 1500);
      break;
    default: {
      const endAt = now + powerup.duration;
      gameState.powerups.set(powerup.effect, { endAt });

      if (powerup.effect === 'shield') gameState.hasShield = true;
      if (powerup.effect === 'turbo') gameState.hasTurbo = true;
      if (powerup.effect === 'magnet') gameState.hasMagnet = true;
      if (powerup.effect === 'weapon') gameState.hasWeapon = true;
      if (powerup.effect === 'slowmo') gameState.hasSlowMo = true;
      if (powerup.effect === 'freeze') gameState.hasFreezeEffect = true;
      if (powerup.effect === 'doublecoins') gameState.hasDoubleCoins = true;

      ui.showActivePowerup(powerup, powerup.duration);
      ui.showInGameMessage(`${powerup.icon} ${powerup.name}`, 1400);
      break;
    }
  }

  playSFX(650, 150, 'sine');
}

function updatePowerups(delta, now) {
  if (now > gameState.nextPowerupSpawnAt && powerups.length < 3) {
    if (Math.random() < 0.7) {
      const key = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
      createPowerup(key);
    }
    gameState.nextPowerupSpawnAt = now + rand(6500, 12000);
  }

  const magnetRadius = gameState.hasMagnet ? 12 : 0;

  for (let i = powerups.length - 1; i >= 0; i--) {
    const item = powerups[i];
    if (!item) continue;

    item.rotation.y += delta * 2.2;
    item.position.y = 1 + Math.sin(now * 0.003 + item.userData.bobOffset) * 0.2;

    const dist = distance2D(item.position, car.position);
    if (magnetRadius > 0 && dist < magnetRadius) {
      const dir = new THREE.Vector3(car.position.x - item.position.x, 0, car.position.z - item.position.z).normalize();
      item.position.addScaledVector(dir, delta * 9);
    }

    if (dist < 1.8) {
      applyPowerup(item.userData.typeKey, now);
      scene.remove(item);
      item.geometry?.dispose?.();
      item.material?.dispose?.();
      powerups.splice(i, 1);
      continue;
    }

    if (item.position.distanceTo(car.position) > 130) {
      scene.remove(item);
      item.geometry?.dispose?.();
      item.material?.dispose?.();
      powerups.splice(i, 1);
    }
  }

  for (const [effect, data] of gameState.powerups.entries()) {
    const powerupType = Object.values(POWERUP_TYPES).find(p => p.effect === effect);
    const totalDuration = powerupType?.duration || 1;
    const remaining = clamp((data.endAt - now) / totalDuration, 0, 1);
    ui.updatePowerupTimer(effect, remaining);

    if (now >= data.endAt) {
      gameState.powerups.delete(effect);
      if (effect === 'shield') gameState.hasShield = false;
      if (effect === 'turbo') gameState.hasTurbo = false;
      if (effect === 'magnet') gameState.hasMagnet = false;
      if (effect === 'weapon') gameState.hasWeapon = false;
      if (effect === 'slowmo') gameState.hasSlowMo = false;
      if (effect === 'freeze') gameState.hasFreezeEffect = false;
      if (effect === 'doublecoins') gameState.hasDoubleCoins = false;
    }
  }
}

// ========== CONTROLES ==========
const keys = {};
let mouseX = 0;

function setupControls() {
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (key === 'n' && gameState.running) useNitro();
    if (key === 'c') {
      carState.controlMode = carState.controlMode === 'hybrid' ? 'keyboard' : 'hybrid';
      ui.showInGameMessage(`🕹️ Control: ${carState.controlMode === 'hybrid' ? 'Híbrido' : 'Teclado'}`, 1400);
    }
    if (key === 'escape') {
      if (gameState.running && !gameState.paused) {
        gameState.paused = true;
        ui.showMenu();
      } else if (gameState.running && gameState.paused) {
        ui.hideMenu();
        ui.showHUD();
        gameState.paused = false;
      }
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

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
      gameState.running = false;
      gameState.paused = false;
      ui.showMenu();
    });
  }
  if (ui.elements.btnOpenMenu) {
    ui.elements.btnOpenMenu.addEventListener('click', () => {
      if (gameState.running) gameState.paused = true;
      ui.showMenu();
    });
  }
  if (ui.elements.btnRestart) {
    ui.elements.btnRestart.addEventListener('click', resetGame);
  }
}

function useNitro() {
  if (carState.nitro < 20) return;
  gameState.hasTurbo = true;
  carState.nitro = Math.max(0, carState.nitro - 20);
  playSFX(800, 500, 'square');
  ui.showInGameMessage('🔥 NITRO!', 800);
  setTimeout(() => {
    if (!gameState.powerups.has('turbo')) gameState.hasTurbo = false;
  }, 1200);
  sessionStats.nitroUses += 1;
}

// ========== LOOP PRINCIPAL ==========
function animate(now) {
  requestAnimationFrame(animate);

  const delta = Math.min((now - gameState.lastTime) / 1000, 0.1);
  gameState.lastTime = now;

  fpsSmoothed = lerp(fpsSmoothed, 1 / Math.max(0.0001, delta), 0.08);
  ui.updateFPS(fpsSmoothed);

  if (!gameState.running || gameState.paused) {
    renderer.render(scene, camera);
    return;
  }

  if (gameState.damageCooldown > 0) {
    gameState.damageCooldown = Math.max(0, gameState.damageCooldown - delta);
  }

  if (gameState.poisonActive) {
    gameState.poisonDamageTimer -= delta;
    gameState.poisonTickTimer -= delta;

    if (gameState.poisonDamageTimer <= 0) {
      gameState.poisonActive = false;
    } else if (gameState.poisonTickTimer <= 0) {
      damagePlayer(2, 'poison');
      gameState.poisonTickTimer = 0.45;
    }
  }

  updateCar(delta);
  updateEnvironment(delta);
  updateCamera();
  updateZombies(delta, now);
  updatePowerups(delta, now);
  updateMinimap();

  if (gameState.comboTimer > 0) {
    gameState.comboTimer -= delta;
  } else {
    gameState.combo = Math.max(0, gameState.combo - delta * 6);
    if (gameState.combo < 1) gameState.combo = 0;
  }

  sessionStats.maxCombo = Math.max(sessionStats.maxCombo, gameState.maxCombo);
  sessionStats.maxWave = Math.max(sessionStats.maxWave, gameState.wave);
  sessionStats.survivalTime = (now - gameState.startTime) / 1000;

  unlockAchievementIfNeeded('survivor', sessionStats.survivalTime >= 180);
  unlockAchievementIfNeeded('nitro_addict', storage.playerData.gamesPlayed * 0 + sessionStats.nitroUses >= 50);
  unlockAchievementIfNeeded('millionaire', storage.playerData.totalCoins >= 1000);
  unlockAchievementIfNeeded('perfect_driver', sessionStats.noDamageRun && sessionStats.survivalTime >= 120);

  ui.updateHUD(gameState, carState);
  renderer.render(scene, camera);
}

function updateCar(delta) {
  if (!car || !carState.velocity) return;

  let accel = 0;
  if (keys.w || keys.arrowup) accel = CONFIG.ACCELERATION;
  if (keys.s || keys.arrowdown) accel = -CONFIG.BRAKE_FORCE;

  if (gameState.hasTurbo) accel *= 1.8;

  const sensitivity = parseFloat(ui.elements.mouseSensitivity?.value ?? '1');
  const keyboardSteer = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0);
  const mouseSteer = -mouseX * 0.52 * sensitivity;

  if (carState.controlMode === 'keyboard') {
    carState.targetWheelAngle = keyboardSteer * 0.5;
  } else {
    carState.targetWheelAngle = clamp(mouseSteer + keyboardSteer * 0.3, -0.6, 0.6);
  }
  carState.wheelAngle = lerp(carState.wheelAngle, carState.targetWheelAngle, 0.16);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
  const accelVec = forward.multiplyScalar(accel);
  carState.velocity.add(accelVec);
  const friction = keys[' '] ? 0.93 : CONFIG.FRICTION;
  carState.velocity.multiplyScalar(friction);

  const speed = carState.velocity.length();
  const maxSpeed = CONFIG.MAX_SPEED * carState.speedMultiplier * (gameState.hasTurbo ? 1.45 : 1);
  if (speed > maxSpeed) {
    carState.velocity.normalize().multiplyScalar(maxSpeed);
  }

  if (speed > 0.03) {
    const turnAmount = carState.wheelAngle * CONFIG.TURN_SPEED * (speed / maxSpeed);
    car.rotation.y += turnAmount;
  }

  car.position.add(carState.velocity);
  car.position.x = clamp(car.position.x, -CONFIG.ROAD_WIDTH / 2 + 1, CONFIG.ROAD_WIDTH / 2 - 1);

  carState.nitro = Math.min(carState.maxNitro, carState.nitro + delta * 5 * carState.nitroRegenMultiplier);
  sessionStats.maxSpeed = Math.max(sessionStats.maxSpeed, speed * 200);
  unlockAchievementIfNeeded('speed_demon', sessionStats.maxSpeed >= 150);
}


function updateEnvironment(delta) {
  environmentTime += delta;
  const t = (Math.sin(environmentTime * 0.1) + 1) * 0.5;

  if (skyDome) {
    const skyColor = new THREE.Color().lerpColors(new THREE.Color(0x060b14), new THREE.Color(0x416a99), t);
    skyDome.material.color.copy(skyColor);
  }

  if (scene?.fog) {
    scene.fog.color = new THREE.Color().lerpColors(new THREE.Color(0x060a10), new THREE.Color(0x385069), t);
  }

  if (ambientLight) ambientLight.intensity = 0.35 + t * 0.35;
  if (hemiLight) hemiLight.intensity = 0.22 + t * 0.35;
  if (dirLight) {
    dirLight.intensity = 0.3 + t * 1.1;
    dirLight.position.x = 12 + Math.sin(environmentTime * 0.15) * 8;
    dirLight.position.z = 8 + Math.cos(environmentTime * 0.15) * 6;
  }

  const starOpacity = 1 - t;
  stars.forEach((star, idx) => {
    star.visible = starOpacity > 0.15;
    star.position.y += Math.sin(environmentTime * 0.8 + idx) * 0.001;
    if (star.material) star.material.opacity = starOpacity;
  });
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

function updateMinimap() {
  if (!minimapCtx || !car) return;

  const canvas = minimapCtx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const scale = 2.4;

  minimapCtx.fillStyle = 'rgba(10, 14, 20, 0.92)';
  minimapCtx.fillRect(0, 0, w, h);

  minimapCtx.strokeStyle = '#22d463';
  minimapCtx.lineWidth = 1;
  minimapCtx.strokeRect(2, 2, w - 4, h - 4);

  const centerX = w / 2;
  const centerY = h / 2;

  minimapCtx.fillStyle = '#4aa3ff';
  minimapCtx.beginPath();
  minimapCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  zombies.forEach(zombie => {
    const relX = (zombie.position.x - car.position.x) * scale;
    const relZ = (zombie.position.z - car.position.z) * scale;
    const x = centerX + relX;
    const y = centerY + relZ;
    if (x < 0 || x > w || y < 0 || y > h) return;
    minimapCtx.fillStyle = '#ff5555';
    minimapCtx.fillRect(x - 2, y - 2, 4, 4);
  });

  powerups.forEach(item => {
    const relX = (item.position.x - car.position.x) * scale;
    const relZ = (item.position.z - car.position.z) * scale;
    const x = centerX + relX;
    const y = centerY + relZ;
    if (x < 0 || x > w || y < 0 || y > h) return;
    minimapCtx.fillStyle = '#ffdd00';
    minimapCtx.fillRect(x - 2, y - 2, 4, 4);
  });
}

// ========== CONTROL DE JUEGO ==========
function startGame() {
  if (!audioCtx) initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();

  applyPersistentBonuses();
  updateCarColor();

  ui.hideMenu();
  ui.hideBackgroundCanvas();
  ui.showHUD();

  resetGame();
  gameState.running = true;
  gameState.paused = false;
  gameState.startTime = performance.now();

  if (ui.elements.btnRestart) ui.elements.btnRestart.style.display = 'block';
  ui.showInGameMessage('¡Comienza el juego! Elimina zombies y sobrevive', 2200);
}

function resetGame() {
  applyPersistentBonuses();

  gameState.score = 0;
  gameState.hp = gameState.maxHp;
  gameState.wave = 1;
  gameState.kills = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.zombiesKilledThisWave = 0;
  gameState.killsRequiredThisWave = 10;
  gameState.lastSpawn = performance.now();
  gameState.nextPowerupSpawnAt = performance.now() + 3500;
  gameState.poisonActive = false;
  gameState.poisonDamageTimer = 0;
  gameState.poisonTickTimer = 0;
  gameState.damageCooldown = 0;
  clearPowerupFlags();

  carState.nitro = 100;

  if (car) {
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    carState.velocity.set(0, 0, 0);
  }

  zombies.forEach(removeZombie);
  zombies = [];

  powerups.forEach(item => {
    scene.remove(item);
    item.geometry?.dispose?.();
    item.material?.dispose?.();
  });
  powerups = [];

  sessionStats.totalKills = 0;
  sessionStats.maxCombo = 0;
  sessionStats.maxSpeed = 0;
  sessionStats.survivalTime = 0;
  sessionStats.maxWave = 0;
  sessionStats.nitroUses = 0;
  sessionStats.damageTaken = 0;
  sessionStats.noDamageRun = true;
}

function gameOver() {
  gameState.running = false;

  const coinsEarned = Math.floor(gameState.score / 10);
  storage.addCoins(coinsEarned);
  storage.updateStats({
    score: Math.floor(gameState.score),
    kills: gameState.kills,
  });

  ui.updateMenuStats();
  ui.showGameOver({
    score: Math.floor(gameState.score),
    coins: coinsEarned,
    kills: gameState.kills,
    maxCombo: Math.floor(gameState.maxCombo),
  });

  if (ui.elements.btnRestart) ui.elements.btnRestart.style.display = 'none';
}

// ========== INICIALIZACIÓN ==========
try {
  applyPersistentBonuses();
  initThree();
  setupControls();
  bindAudioUIEvents();

  ui.hideHUD();
  ui.updateMenuStats();
  gameState.lastTime = performance.now();
  animate(gameState.lastTime);

  ui.showInGameMessage('🎮 ¡Bienvenido! WASD/Flechas + Ratón. C cambia control, Espacio derrape, N nitro.', 5200);

  window.cvz = { scene, car, zombies, powerups, startGame, resetGame, storage, gameState };
  console.log('✅ Juego ULTRA inicializado (Modular)');
} catch (e) {
  console.error('❌ Error fatal:', e);
  alert('Error: ' + e.message);
}

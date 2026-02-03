// 🎮 CAR VS ZOMBIES - VERSIÓN ULTRA MEJORADA 🎮
// Con power-ups, armas, mejores gráficos, tipos de zombies, combos, y más

(function(){
  'use strict';

  console.log('🚀 Iniciando Car vs Zombies ULTRA...');

  // ========== CONFIGURACIÓN ==========
  const CONFIG = {
    ROAD_WIDTH: 18,
    ROAD_LENGTH: 150,
    MAX_SPEED: 0.48,
    ACCELERATION: 0.016,
    BRAKE_FORCE: 0.028,
    FRICTION: 0.96,
    TURN_SPEED: 0.024,
    COLLISION_DIST: 1.88,
    DRIFT_THRESHOLD: 0.35,
    MAX_DUST_PARTICLES: 120,
    ZOMBIE_BASE_SPEED: 0.23,
    MAX_ZOMBIES_BASE: 25,
    SPAWN_DELAY_BASE: 1200,
    DIFFICULTY_SCALE: 100,
  };

  // ========== TIPOS DE ZOMBIES ==========
  const ZOMBIE_TYPES = {
    NORMAL: {
      name: 'Normal',
      color: 0x2d5a2d,
      speed: 1.0,
      health: 1,
      damage: 12,
      points: 10,
      coins: 1,
      size: 1.0
    },
    FAST: {
      name: 'Rápido',
      color: 0xff6600,
      speed: 1.8,
      health: 1,
      damage: 8,
      points: 20,
      coins: 2,
      size: 0.8
    },
    TANK: {
      name: 'Tanque',
      color: 0x8b0000,
      speed: 0.6,
      health: 3,
      damage: 25,
      points: 50,
      coins: 5,
      size: 1.5
    },
    EXPLOSIVE: {
      name: 'Explosivo',
      color: 0xffff00,
      speed: 1.2,
      health: 1,
      damage: 30,
      points: 40,
      coins: 3,
      size: 1.1,
      explosive: true
    }
  };

  // ========== POWER-UPS ==========
  const POWERUP_TYPES = {
    HEALTH: {
      name: 'Vida',
      color: 0x00ff00,
      icon: '❤️',
      duration: 0,
      effect: 'heal'
    },
    SHIELD: {
      name: 'Escudo',
      color: 0x00ffff,
      icon: '🛡️',
      duration: 8000,
      effect: 'shield'
    },
    TURBO: {
      name: 'Turbo',
      color: 0xff6600,
      icon: '⚡',
      duration: 6000,
      effect: 'turbo'
    },
    MAGNET: {
      name: 'Imán',
      color: 0xffdd00,
      icon: '🧲',
      duration: 10000,
      effect: 'magnet'
    },
    WEAPON: {
      name: 'Arma',
      color: 0xff0000,
      icon: '🔫',
      duration: 15000,
      effect: 'weapon'
    }
  };

  // ========== TIENDA EXPANDIDA ==========
  const SHOP_COLORS = [
    { name: 'Azul Clásico', hex: 0x1f7ad2, price: 0, unlocked: true },
    { name: 'Rojo Deportivo', hex: 0xff0000, price: 500 },
    { name: 'Verde Neón', hex: 0x00ff00, price: 500 },
    { name: 'Amarillo Eléctrico', hex: 0xffff00, price: 500 },
    { name: 'Púrpura Oscuro', hex: 0x7700ff, price: 750 },
    { name: 'Naranja Fuego', hex: 0xff6600, price: 750 },
    { name: 'Cian Gélido', hex: 0x00ffff, price: 750 },
    { name: 'Rosa Neón', hex: 0xff0099, price: 1000 },
    { name: 'Oro Puro', hex: 0xffdd00, price: 1000 },
    { name: 'Plata Metálica', hex: 0xcccccc, price: 800 },
    { name: 'Negro Profundo', hex: 0x111111, price: 600 },
    { name: 'Blanco Nieve', hex: 0xffffff, price: 600 },
  ];

  const SHOP_UPGRADES = {
    maxHealth: { name: 'Vida Máxima', baseCost: 300, level: 0, maxLevel: 5, bonus: 20 },
    speed: { name: 'Velocidad', baseCost: 400, level: 0, maxLevel: 5, bonus: 0.05 },
    armor: { name: 'Armadura', baseCost: 500, level: 0, maxLevel: 5, bonus: 0.1 },
    coinMultiplier: { name: 'Multiplicador Monedas', baseCost: 600, level: 0, maxLevel: 3, bonus: 0.5 }
  };

  // ========== SISTEMA DE MISIONES ==========
  const DAILY_MISSIONS = {
    easy: [
      { id: 'e1', desc: 'Mata 50 zombies', reward: 100, check: () => playerData.totalKills >= 50 },
      { id: 'e2', desc: 'Alcanza oleada 5', reward: 150, check: () => gameState.wave >= 5 },
      { id: 'e3', desc: 'Consigue combo x10', reward: 120, check: () => gameState.maxCombo >= 10 }
    ],
    medium: [
      { id: 'm1', desc: 'Sobrevive 10 oleadas', reward: 300, check: () => gameState.wave >= 10 },
      { id: 'm2', desc: 'Mata 5 zombies tanque', reward: 250, check: () => gameState.tanksKilled >= 5 },
      { id: 'm3', desc: 'Consigue 5000 puntos', reward: 200, check: () => gameState.score >= 5000 }
    ],
    hard: [
      { id: 'h1', desc: 'Combo x30', reward: 500, check: () => gameState.maxCombo >= 30 },
      { id: 'h2', desc: 'Sobrevive 15 oleadas', reward: 600, check: () => gameState.wave >= 15 },
      { id: 'h3', desc: 'Mata 200 zombies', reward: 400, check: () => playerData.totalKills >= 200 }
    ]
  };

  const STORAGE_KEY = 'carVsZombies_playerData';

  // ========== ESTADO DEL JUEGO ==========
  const gameState = {
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
    tanksKilled: 0,
    // Nuevas variables
    timeOfDay: 0, // 0 = día, 1 = noche
    lastFPSUpdate: 0,
    frameCount: 0,
    fps: 60,
  };

  const carState = {
    velocity: null,
    angularVelocity: 0,
    nitro: 100,
    maxNitro: 100,
  };

  let playerData = {
    totalCoins: 0,
    ownedColors: [0],
    currentColorIndex: 0,
    mouseSensitivity: 1,
    bestScore: 0,
    totalKills: 0,
    gamesPlayed: 0,
    upgrades: JSON.parse(JSON.stringify(SHOP_UPGRADES)),
    completedMissions: [],
    highScores: [],
  };

  // ========== GESTIÓN DE DATOS ==========
  function loadPlayerData(){
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved) {
        const loaded = JSON.parse(saved);
        playerData = { ...playerData, ...loaded };
        // Asegurar que upgrades existe
        if(!playerData.upgrades) {
          playerData.upgrades = JSON.parse(JSON.stringify(SHOP_UPGRADES));
        }
      }
      if(mouseSensitivity) {
        mouseSensitivity.value = playerData.mouseSensitivity || 1;
        updateMouseSensitivityDisplay();
      }
      applyUpgrades();
    } catch(e){ 
      console.warn('Error cargando datos:', e); 
    }
  }

  function savePlayerData(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
    } catch(e){ 
      console.warn('Error guardando datos:', e); 
    }
  }

  function applyUpgrades(){
    const u = playerData.upgrades;
    gameState.maxHp = 100 + (u.maxHealth.level * u.maxHealth.bonus);
    CONFIG.MAX_SPEED = 0.48 + (u.speed.level * u.speed.bonus);
  }

  // ========== UTILIDADES ==========
  function logErr(e){ 
    console.error(e); 
    inGameMessage('Error: ' + (e?.message || e)); 
  }

  function clamp(val, min, max){ 
    return Math.max(min, Math.min(max, val)); 
  }

  function lerp(a, b, t){
    return a + (b - a) * t;
  }

  // ========== DOM REFERENCES ==========
  const elements = {
    container: document.getElementById('container'),
    overlayMenu: document.getElementById('overlayMenu'),
    overlayShop: document.getElementById('overlayShop'),
    overlayGameOver: document.getElementById('overlayGameOver'),
    startBtn: document.getElementById('startBtn'),
    playAgain: document.getElementById('playAgain'),
    toMenu: document.getElementById('toMenu'),
    btnOpenMenu: document.getElementById('btnOpenMenu'),
    btnSettings: document.getElementById('btnSettings'),
    btnRestart: document.getElementById('btnRestart'),
    openSettings: document.getElementById('openSettings'),
    openShop: document.getElementById('openShop'),
    backFromShop: document.getElementById('backFromShop'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettings: document.getElementById('closeSettings'),
    scoreEl: document.getElementById('score'),
    hpEl: document.getElementById('hp'),
    speedEl: document.getElementById('speed'),
    coinsEl: document.getElementById('coins'),
    comboEl: document.getElementById('combo'),
    waveEl: document.getElementById('wave'),
    nitroBar: document.getElementById('nitroBar'),
    volMaster: document.getElementById('volMaster'),
    volEngine: document.getElementById('volEngine'),
    volSfx: document.getElementById('volSfx'),
    volMasterVal: document.getElementById('volMasterVal'),
    volEngineVal: document.getElementById('volEngineVal'),
    volSfxVal: document.getElementById('volSfxVal'),
    mouseSensitivity: document.getElementById('mouseSensitivity'),
    mouseSensitivityVal: document.getElementById('mouseSensitivityVal'),
    inGameMsg: document.getElementById('inGameMsg'),
    shopCoinsDisplay: document.getElementById('shopCoinsDisplay'),
    shopGrid: document.getElementById('shopGrid'),
    upgradesGrid: document.getElementById('upgradesGrid'),
    goTitle: document.getElementById('goTitle'),
    goScore: document.getElementById('goScore'),
    goCoins: document.getElementById('goCoins'),
    goKills: document.getElementById('goKills'),
    goMaxCombo: document.getElementById('goMaxCombo'),
    powerupContainer: document.getElementById('powerupContainer'),
  };

  const { 
    overlayMenu, overlayShop, overlayGameOver, 
    scoreEl, hpEl, speedEl, coinsEl,
    volMaster, volEngine, volSfx,
    mouseSensitivity,
  } = elements;

  function inGameMessage(text, ms=2000){
    if(!elements.inGameMsg) return;
    elements.inGameMsg.innerText = text;
    elements.inGameMsg.style.display = 'block';
    elements.inGameMsg.style.animation = 'none';
    setTimeout(() => {
      elements.inGameMsg.style.animation = 'slideInDown 0.3s ease';
    }, 10);
    setTimeout(() => elements.inGameMsg.style.display = 'none', ms);
  }

  // ========== SISTEMA DE AUDIO ==========
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  const audioNodes = {
    master: null,
    engine: null,
    sfx: null,
    music: null,
    engineOsc: null,
    engineNoise: null,
  };

  function initAudio(){
    try {
      if(audioCtx) return;
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
      
      audioNodes.engineOsc = audioCtx.createOscillator();
      audioNodes.engineOsc.type = 'sawtooth';
      audioNodes.engineOsc.frequency.value = 80;
      
      const engineFilter = audioCtx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 1200;
      
      audioNodes.engineOsc.connect(engineFilter);
      engineFilter.connect(audioNodes.engine);
      audioNodes.engineOsc.start();
      
      const bufferSize = audioCtx.sampleRate * 1;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for(let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.14;
      }
      
      audioNodes.engineNoise = audioCtx.createBufferSource();
      audioNodes.engineNoise.buffer = noiseBuffer;
      audioNodes.engineNoise.loop = true;
      audioNodes.engineNoise.connect(audioNodes.engine);
      audioNodes.engineNoise.start();
      
      console.log('✅ Audio inicializado');
    } catch(e){ 
      console.warn('⚠️ Error audio:', e); 
    }
  }

  function updateAudioGains(){
    if(!audioCtx) return;
    audioNodes.master.gain.value = parseFloat(volMaster.value);
    audioNodes.engine.gain.value = parseFloat(volEngine.value);
    audioNodes.sfx.gain.value = parseFloat(volSfx.value);
  }

  function playSound(freq, duration = 0.1, type = 'sine', vol = 0.3){
    if(!audioCtx || !audioNodes.sfx) return;
    try {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(audioNodes.sfx);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e){}
  }

  function playCollisionSfx(){
    playSound(80 + Math.random() * 60, 0.15, 'sawtooth', 0.35);
  }

  function playPowerupSfx(){
    playSound(600, 0.3, 'sine', 0.4);
    setTimeout(() => playSound(800, 0.2, 'sine', 0.3), 100);
  }

  function playExplosionSfx(){
    playSound(50, 0.4, 'sawtooth', 0.5);
  }

  function playShootSfx(){
    playSound(200, 0.05, 'square', 0.25);
  }

  // ========== CONFIGURACIÓN DE CONTROLES ==========
  volMaster.addEventListener('input', e => {
    elements.volMasterVal.innerText = Math.round(e.target.value * 100) + '%';
    updateAudioGains();
  });
  
  volEngine.addEventListener('input', e => {
    elements.volEngineVal.innerText = Math.round(e.target.value * 100) + '%';
    updateAudioGains();
  });
  
  volSfx.addEventListener('input', e => {
    elements.volSfxVal.innerText = Math.round(e.target.value * 100) + '%';
    updateAudioGains();
  });

  function updateMouseSensitivityDisplay(){
    elements.mouseSensitivityVal.innerText = Math.round(mouseSensitivity.value * 100) + '%';
  }

  mouseSensitivity.addEventListener('input', e => {
    playerData.mouseSensitivity = parseFloat(e.target.value);
    updateMouseSensitivityDisplay();
    savePlayerData();
  });

  // ========== EVENTOS DE UI ==========
  elements.btnSettings.addEventListener('click', () => {
    elements.settingsPanel.style.display = 
      elements.settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  elements.openSettings.addEventListener('click', () => {
    elements.settingsPanel.style.display = 'block';
  });

  elements.closeSettings.addEventListener('click', () => {
    elements.settingsPanel.style.display = 'none';
  });

  elements.startBtn.addEventListener('click', () => {
    console.log('▶️ Iniciando juego');
    try {
      startGame();
    } catch(e) {
      console.error('❌ Error:', e);
      alert('Error: ' + e.message);
    }
  });
  
  elements.playAgain.addEventListener('click', startGame);
  
  elements.toMenu.addEventListener('click', () => {
    overlayGameOver.style.display = 'none';
    overlayMenu.style.display = 'block';
  });

  elements.btnOpenMenu.addEventListener('click', () => {
    if(gameState.running) {
      gameState.paused = !gameState.paused;
      overlayMenu.style.display = gameState.paused ? 'block' : 'none';
    }
  });

  elements.btnRestart.addEventListener('click', () => {
    resetGame();
    gameState.running = true;
    gameState.paused = false;
  });

  // ========== SISTEMA DE TIENDA ==========
  function renderShop(){
    elements.shopGrid.innerHTML = '';
    
    SHOP_COLORS.forEach((color, idx) => {
      const isOwned = playerData.ownedColors.includes(idx);
      const isCurrent = playerData.currentColorIndex === idx;
      
      const card = document.createElement('div');
      card.className = 'color-card';
      card.style.backgroundColor = '#' + color.hex.toString(16).padStart(6, '0');
      
      if(isCurrent) card.classList.add('current');
      if(isOwned) card.classList.add('owned');
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'color-name';
      nameDiv.textContent = color.name;
      
      const priceDiv = document.createElement('div');
      priceDiv.className = 'color-price';
      
      if(isOwned){
        priceDiv.textContent = isCurrent ? '✓ Equipado' : '✓ Tuyo';
      } else {
        priceDiv.textContent = `💰 ${color.price}`;
      }
      
      card.appendChild(nameDiv);
      card.appendChild(priceDiv);
      
      card.addEventListener('click', () => handleColorClick(idx, color, isOwned));
      
      elements.shopGrid.appendChild(card);
    });

    // Renderizar mejoras
    if(elements.upgradesGrid) {
      elements.upgradesGrid.innerHTML = '';
      
      Object.entries(playerData.upgrades).forEach(([key, upgrade]) => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        
        const cost = upgrade.baseCost * Math.pow(1.5, upgrade.level);
        const isMaxed = upgrade.level >= upgrade.maxLevel;
        
        card.innerHTML = `
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-level">Nivel ${upgrade.level}/${upgrade.maxLevel}</div>
          <div class="upgrade-price">${isMaxed ? '✓ MÁXIMO' : '💰 ' + Math.floor(cost)}</div>
        `;
        
        if(!isMaxed) {
          card.style.cursor = 'pointer';
          card.addEventListener('click', () => handleUpgradeClick(key, upgrade, cost));
        } else {
          card.classList.add('maxed');
        }
        
        elements.upgradesGrid.appendChild(card);
      });
    }

    updateShopCoinsDisplay();
  }

  function handleColorClick(idx, color, isOwned){
    if(isOwned){
      playerData.currentColorIndex = idx;
      if(car) updateCarColor(idx);
      savePlayerData();
      renderShop();
      inGameMessage('¡Color equipado! 🎨');
    } else {
      if(playerData.totalCoins >= color.price){
        playerData.totalCoins -= color.price;
        playerData.ownedColors.push(idx);
        playerData.currentColorIndex = idx;
        if(car) updateCarColor(idx);
        savePlayerData();
        renderShop();
        inGameMessage(`¡Comprado: ${color.name}! 🎉`);
      } else {
        inGameMessage(`Necesitas ${color.price - playerData.totalCoins} monedas más 💸`);
      }
    }
  }

  function handleUpgradeClick(key, upgrade, cost){
    if(playerData.totalCoins >= cost){
      playerData.totalCoins -= cost;
      playerData.upgrades[key].level++;
      savePlayerData();
      applyUpgrades();
      renderShop();
      inGameMessage(`¡${upgrade.name} mejorado! ⬆️`);
      playPowerupSfx();
    } else {
      inGameMessage(`Necesitas ${Math.floor(cost - playerData.totalCoins)} monedas más 💸`);
    }
  }

  function updateShopCoinsDisplay(){
    if(elements.shopCoinsDisplay) {
      elements.shopCoinsDisplay.textContent = playerData.totalCoins;
    }
  }

  function updateCarColor(colorIndex){
    if(!car) return;
    const color = SHOP_COLORS[colorIndex];
    car.traverse(child => {
      if(child.isMesh && child.material && child.geometry?.type === 'BoxGeometry'){
        if(Math.abs(child.position.y - 0.6) < 0.1){
          child.material.color.setHex(color.hex);
        }
      }
    });
  }

  elements.openShop.addEventListener('click', () => {
    overlayMenu.style.display = 'none';
    overlayShop.style.display = 'block';
    renderShop();
  });

  elements.backFromShop.addEventListener('click', () => {
    overlayShop.style.display = 'none';
    overlayMenu.style.display = 'block';
  });

  // Información de zombies
  elements.openZombieInfo = document.getElementById('openZombieInfo');
  elements.overlayZombieInfo = document.getElementById('overlayZombieInfo');
  elements.backFromZombieInfo = document.getElementById('backFromZombieInfo');

  if(elements.openZombieInfo) {
    elements.openZombieInfo.addEventListener('click', () => {
      overlayMenu.style.display = 'none';
      elements.overlayZombieInfo.style.display = 'block';
    });
  }

  if(elements.backFromZombieInfo) {
    elements.backFromZombieInfo.addEventListener('click', () => {
      elements.overlayZombieInfo.style.display = 'none';
      overlayMenu.style.display = 'block';
    });
  }

  // Cargar datos del jugador
  loadPlayerData();

  // ========== MEJORA 1: CONTADOR DE FPS ==========
  function updateFPS(now){
    gameState.frameCount++;
    if(now - gameState.lastFPSUpdate > 1000){
      gameState.fps = Math.round(gameState.frameCount * 1000 / (now - gameState.lastFPSUpdate));
      gameState.frameCount = 0;
      gameState.lastFPSUpdate = now;
      
      const fpsEl = document.getElementById('fps');
      if(fpsEl){
        fpsEl.textContent = gameState.fps;
        fpsEl.style.color = gameState.fps < 30 ? '#ff4d4f' : gameState.fps < 50 ? '#ffaa00' : '#1db954';
      }
    }
  }

  // ========== MEJORA 2: MINI-MAPA ==========
  function initMinimap(){
    minimapCanvas = document.getElementById('minimap');
    if(minimapCanvas){
      minimapCtx = minimapCanvas.getContext('2d');
      console.log('✅ Mini-mapa inicializado');
    }
  }

  function drawMinimap(){
    if(!minimapCtx || !car) return;
    
    const ctx = minimapCtx;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 1.5;
    
    // Limpiar
    ctx.clearRect(0, 0, w, h);
    
    // Fondo con gradiente
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gradient.addColorStop(0, 'rgba(26, 42, 54, 0.95)');
    gradient.addColorStop(1, 'rgba(10, 14, 20, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Grid
    ctx.strokeStyle = 'rgba(29, 185, 84, 0.2)';
    ctx.lineWidth = 1;
    for(let i = 0; i < w; i += 20){
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
    
    // Carretera
    ctx.fillStyle = 'rgba(58, 58, 58, 0.6)';
    ctx.fillRect(w/2 - 15, 0, 30, h);
    
    // Zombies (puntos rojos)
    zombies.forEach(z => {
      const dx = (z.position.x - car.position.x) * scale;
      const dz = (z.position.z - car.position.z) * scale;
      
      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;
        
        // Color según tipo
        let color = '#ff0000';
        if(z.userData.type.name === 'Rápido') color = '#ff6600';
        if(z.userData.type.name === 'Tanque') color = '#8b0000';
        if(z.userData.type.name === 'Explosivo') color = '#ffff00';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Power-ups (puntos brillantes)
    powerups.forEach(p => {
      const dx = (p.position.x - car.position.x) * scale;
      const dz = (p.position.z - car.position.z) * scale;
      
      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;
        
        ctx.fillStyle = '#' + p.userData.type.color.toString(16).padStart(6, '0');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    
    // Coche (centro - triángulo apuntando arriba)
    ctx.fillStyle = '#1db954';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#1db954';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(w/2, h/2 - 8);
    ctx.lineTo(w/2 - 6, h/2 + 6);
    ctx.lineTo(w/2 + 6, h/2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Borde del mini-mapa
    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  // ========== MEJORA 3: TABLA DE CLASIFICACIÓN ==========
  function saveHighScore(){
    if(!playerData.highScores) playerData.highScores = [];
    
    const entry = {
      score: Math.floor(gameState.score),
      kills: gameState.kills,
      wave: gameState.wave,
      maxCombo: gameState.maxCombo,
      date: new Date().toLocaleDateString('es-ES')
    };
    
    playerData.highScores.push(entry);
    playerData.highScores.sort((a, b) => b.score - a.score);
    playerData.highScores = playerData.highScores.slice(0, 10); // Top 10
    
    savePlayerData();
  }

  function showLeaderboard(){
    const content = document.getElementById('leaderboardContent');
    if(!content) return;
    
    if(!playerData.highScores || playerData.highScores.length === 0){
      content.innerHTML = `
        <div class="leaderboard-empty">
          <p style="font-size: 48px; margin-bottom: 16px;">🏆</p>
          <p>¡Aún no hay puntuaciones!</p>
          <p style="margin-top: 8px; font-size: 13px;">Juega para aparecer en la tabla</p>
        </div>
      `;
      return;
    }
    
    const currentScore = Math.floor(gameState.score);
    
    content.innerHTML = playerData.highScores.map((entry, i) => {
      const isCurrentGame = entry.score === currentScore && i === 0;
      let rankClass = '';
      let medal = '';
      
      if(i === 0){ rankClass = 'gold'; medal = '🥇'; }
      else if(i === 1){ rankClass = 'silver'; medal = '🥈'; }
      else if(i === 2){ rankClass = 'bronze'; medal = '🥉'; }
      
      return `
        <div class="leaderboard-entry ${isCurrentGame ? 'current-player' : ''}">
          <div class="rank ${rankClass}">${medal || '#' + (i + 1)}</div>
          <div class="player-info">
            <div class="score">${entry.score.toLocaleString()} pts</div>
            <div class="details">
              💀 ${entry.kills} kills • 
              🌊 Oleada ${entry.wave} • 
              🔥 Combo x${entry.maxCombo}
            </div>
          </div>
          <div class="date">${entry.date}</div>
        </div>
      `;
    }).join('');
  }

  // Eventos del leaderboard
  elements.openLeaderboard = document.getElementById('openLeaderboard');
  elements.overlayLeaderboard = document.getElementById('overlayLeaderboard');
  elements.backFromLeaderboard = document.getElementById('backFromLeaderboard');

  if(elements.openLeaderboard) {
    elements.openLeaderboard.addEventListener('click', () => {
      overlayMenu.style.display = 'none';
      elements.overlayLeaderboard.style.display = 'block';
      showLeaderboard();
    });
  }

  if(elements.backFromLeaderboard) {
    elements.backFromLeaderboard.addEventListener('click', () => {
      elements.overlayLeaderboard.style.display = 'none';
      overlayMenu.style.display = 'block';
    });
  }

  // ========== MEJORA 4: ESTRELLAS (MODO NOCHE) ==========
  function createStars(){
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    const starVertices = [];
    for(let i = 0; i < 2000; i++){
      const x = (Math.random() - 0.5) * 600;
      const y = Math.random() * 150 + 50;
      const z = (Math.random() - 0.5) * 600;
      starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    
    stars = new THREE.Points(starGeometry, starMaterial);
    stars.visible = false; // Oculto por defecto (es de día)
    scene.add(stars);
    
    console.log('✨ Sistema de estrellas creado');
  }

  // ========== MEJORA 5: CICLO DÍA/NOCHE ==========
  function updateDayNightCycle(time){
    // Ciclo completo cada 2 minutos (120 segundos)
    const cycleTime = (time / 120000) % 1;
    gameState.timeOfDay = cycleTime;
    
    let skyColor, fogColor, sunIntensity, ambientIntensity;
    
    if(cycleTime < 0.4){ // DÍA (0-48s)
      skyColor = new THREE.Color(0x87ceeb);
      fogColor = new THREE.Color(0x87ceeb);
      sunIntensity = 2.2;
      ambientIntensity = 0.6;
      if(stars) stars.visible = false;
    } else if(cycleTime < 0.5){ // ATARDECER (48-60s)
      const t = (cycleTime - 0.4) / 0.1;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb),
        new THREE.Color(0xff6347),
        t
      );
      fogColor = new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb),
        new THREE.Color(0x4a2c2c),
        t
      );
      sunIntensity = 2.2 - t * 1.4;
      ambientIntensity = 0.6 - t * 0.35;
      if(stars) stars.visible = t > 0.5;
    } else if(cycleTime < 0.9){ // NOCHE (60-108s)
      skyColor = new THREE.Color(0x0a0e14);
      fogColor = new THREE.Color(0x0a0e14);
      sunIntensity = 0.4;
      ambientIntensity = 0.25;
      if(stars) stars.visible = true;
    } else { // AMANECER (108-120s)
      const t = (cycleTime - 0.9) / 0.1;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x0a0e14),
        new THREE.Color(0x87ceeb),
        t
      );
      fogColor = new THREE.Color().lerpColors(
        new THREE.Color(0x0a0e14),
        new THREE.Color(0x87ceeb),
        t
      );
      sunIntensity = 0.4 + t * 1.8;
      ambientIntensity = 0.25 + t * 0.35;
      if(stars) stars.visible = t < 0.5;
    }
    
    if(scene){
      scene.background = skyColor;
      scene.fog.color = fogColor;
    }
    
    if(sun){
      sun.intensity = sunIntensity;
    }
    
    const ambientLight = scene.children.find(c => c.type === 'AmbientLight');
    if(ambientLight){
      ambientLight.intensity = ambientIntensity;
    }
  }

  // ========== MEJORA 6: LÍNEAS DE VELOCIDAD ==========
  function createSpeedLines(){
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    
    const positions = [];
    for(let i = 0; i < 50; i++){
      const x = (Math.random() - 0.5) * 40;
      const y = Math.random() * 8 + 1;
      const z = Math.random() * 50 - 25;
      positions.push(x, y, z);
      positions.push(x, y, z - 3);
    }
    
    lineGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    
    speedLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    car.add(speedLines); // Añadir al coche para que se mueva con él
    
    console.log('⚡ Líneas de velocidad creadas');
  }

  function updateSpeedLines(){
    if(!speedLines || !carState.velocity) return;
    
    const speed = carState.velocity.length();
    const opacity = Math.min(speed / CONFIG.MAX_SPEED * 0.6, 0.6);
    speedLines.material.opacity = opacity;
  }

  // ========== MEJORA 7: MÚSICA DE FONDO ==========
  function playBackgroundMusic(){
    if(!audioCtx || musicOscillators.length > 0) return;
    
    try {
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.08;
      musicGain.connect(audioNodes.master);
      
      // Bajo constante
      const bass = audioCtx.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = 110; // A2
      
      const bassGain = audioCtx.createGain();
      bassGain.gain.value = 0.15;
      bass.connect(bassGain);
      bassGain.connect(musicGain);
      bass.start();
      
      musicOscillators.push({ osc: bass, gain: bassGain });
      
      // Melodía que cambia cada 500ms
      setInterval(() => {
        if(!gameState.running) return;
        
        const notes = [220, 247, 262, 294, 330, 349, 392]; // A3 a G4
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const melody = audioCtx.createOscillator();
        melody.frequency.value = freq;
        melody.type = 'square';
        
        const melGain = audioCtx.createGain();
        melGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        melGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        
        melody.connect(melGain);
        melGain.connect(musicGain);
        melody.start();
        melody.stop(audioCtx.currentTime + 0.4);
      }, 500);
      
      console.log('🎵 Música de fondo iniciada');
    } catch(e){
      console.warn('⚠️ Error al iniciar música:', e);
    }
  }

  function stopBackgroundMusic(){
    musicOscillators.forEach(m => {
      try {
        m.osc.stop();
      } catch(e){}
    });
    musicOscillators = [];
  }

  // ========== MEJORA 8: SISTEMA DE MISIONES ==========
  function checkMissions(){
    if(!gameState.running) return;
    
    Object.values(DAILY_MISSIONS).flat().forEach(mission => {
      if(mission.check() && !playerData.completedMissions.includes(mission.id)){
        playerData.completedMissions.push(mission.id);
        playerData.totalCoins += mission.reward;
        inGameMessage(`¡Misión Completada! +${mission.reward} 💰`, 3000);
        playPowerupSfx();
        savePlayerData();
      }
    });
  }

  // ========== MEJORA 9: EFECTO DE PANTALLA AL DAÑO ==========
  function showDamageEffect(){
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(
        circle,
        transparent 30%,
        rgba(255,0,0,0.4)
      );
      pointer-events: none;
      z-index: 100;
      animation: flashDamage 0.3s ease-out;
    `;
    
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
    }, 300);
  }

  // Agregar animación CSS si no existe
  if(!document.getElementById('damageFlashStyle')){
    const style = document.createElement('style');
    style.id = 'damageFlashStyle';
    style.textContent = `
      @keyframes flashDamage {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ========== MEJORA 10: MOTION BLUR (Simulado con velocidad) ==========
  function updateMotionBlur(){
    if(!composer) return;
    
    // El bloom ya da un efecto similar
    // Aumentamos la intensidad del bloom cuando hay turbo
    const bloomPass = composer.passes.find(p => p.constructor.name === 'UnrealBloomPass');
    if(bloomPass && (gameState.hasTurbo || keys['n'])){
      bloomPass.strength = 1.2;
    } else if(bloomPass){
      bloomPass.strength = 0.8;
    }
  }

  // ========== THREE.JS ==========
  let renderer, scene, camera, composer;
  let car, sun, sunMesh;
  let zombies = [];
  let powerups = [];
  let bullets = [];
  let particles = [];
  let decorations = [];
  
  // Nuevas características
  let stars = null;
  let minimapCanvas = null;
  let minimapCtx = null;
  let speedLines = null;
  let musicOscillators = [];

  function initThree(){
    try {
      console.log('🎨 Inicializando THREE.js...');
      
      if(typeof THREE === 'undefined') {
        throw new Error('THREE.js no cargado');
      }
      
      carState.velocity = new THREE.Vector3();
      
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: 'high-performance' 
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      elements.container.insertBefore(renderer.domElement, elements.container.firstChild);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f1419);
      scene.fog = new THREE.FogExp2(0x0f1419, 0.008);

      camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        600
      );
      camera.position.set(0, 8, 20);

      // ILUMINACIÓN MEJORADA
      const ambientLight = new THREE.AmbientLight(0x404858, 0.6);
      scene.add(ambientLight);

      // Luz direccional (sol/luna)
      sun = new THREE.DirectionalLight(0xffe8cc, 2.2);
      sun.position.set(120, 60, -50);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -40;
      sun.shadow.camera.right = 40;
      sun.shadow.camera.top = 40;
      sun.shadow.camera.bottom = -40;
      sun.shadow.camera.near = 0.1;
      sun.shadow.camera.far = 250;
      sun.shadow.bias = -0.0005;
      scene.add(sun);

      // Luz del sol visual
      const sunGeom = new THREE.SphereGeometry(5, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ 
        color: 0xffeeaa, 
        fog: false 
      });
      sunMesh = new THREE.Mesh(sunGeom, sunMat);
      sunMesh.position.copy(sun.position);
      scene.add(sunMesh);

      // Luces adicionales para ambiente
      const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.4);
      scene.add(hemisphereLight);

      // Post-processing
      try {
        composer = new THREE.EffectComposer(renderer);
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.8, 0.5, 0.85
        );
        composer.addPass(bloomPass);
      } catch(e){
        console.warn('⚠️ Post-processing no disponible');
      }

      createRoad();
      createCar();
      createDecorations();
      initDustSystem();
      initParticleSystem();
      
      // Inicializar nuevas características
      createStars();
      createSpeedLines();
      initMinimap();

      window.addEventListener('resize', onWindowResize, false);
      
      console.log('✅ THREE.js inicializado con todas las mejoras');
    } catch(e){ 
      logErr(e);
      throw e;
    }
  }

  function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if(composer) composer.setSize(window.innerWidth, window.innerHeight);
  }

  function createRoad(){
    console.log('🛣️ Creando sistema de carretera infinita...');
    
    // SISTEMA DE CARRETERA INFINITA CON SEGMENTOS
    // Crear múltiples segmentos que se reciclan
    const segmentLength = 200;
    const numSegments = 3;
    
    for(let i = 0; i < numSegments; i++){
      const roadSegment = createRoadSegment();
      roadSegment.position.z = i * segmentLength - segmentLength;
      scene.add(roadSegment);
      roadSegment.userData.isRoad = true;
      decorations.push(roadSegment);
    }
    
    console.log('✅ Carretera infinita creada');
  }

  function createRoadSegment(){
    const group = new THREE.Group();
    const segmentLength = 200;
    
    // Textura de la carretera
    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQpJREFUeNrs2zEKwjAYQOHYm3gGb+AtvIE38AaexBt4E+/gDRqhUChSaZr8X+B7UFBo+0jSNgkAAAAAAAAAAAAAAAAAwBddi6J45Pv+LMuyybIsOyzL8kGSdV1XSimdSimd/bru63NV1VeS3Nf3PM/z0WpZlu00Ta9lWZ49z/N5mqaPtm17/Rfgcrfb3YZhOFqWdV7X9bbdbk/jOB4ty7o0TfPjAK7rHobhqCzLu+u6p3Vd72VZPizLehmG4WgYhqNlWee2bX+xhud53l3XPdV1fXNd96Truu663smyrHPbtscBXJblUxTFQ9/3Zy3LOuu67kFRFI+yLJ/6vj9pmubHWwAAAAAAAAAAAAAAAAAA+BcBBgAVXBgZwNsRAAAAAElFTkSuQmCC'
    );
    roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(4, segmentLength / 20);
    
    // Carretera principal
    const roadGeom = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, segmentLength);
    const roadMat = new THREE.MeshStandardMaterial({ 
      map: roadTexture, 
      roughness: 0.9, 
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // Bordes izquierdo y derecho
    const sideGeom = new THREE.PlaneGeometry(8, segmentLength);
    const sideMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a2a28, 
      roughness: 0.95,
      side: THREE.DoubleSide
    });
    
    const leftSide = new THREE.Mesh(sideGeom, sideMat);
    leftSide.rotation.x = -Math.PI / 2;
    leftSide.position.set(-(CONFIG.ROAD_WIDTH / 2 + 4), 0, 0);
    leftSide.receiveShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeom, sideMat.clone());
    rightSide.rotation.x = -Math.PI / 2;
    rightSide.position.set(CONFIG.ROAD_WIDTH / 2 + 4, 0, 0);
    rightSide.receiveShadow = true;
    group.add(rightSide);

    // Añadir líneas blancas en el centro
    const lineGeom = new THREE.PlaneGeometry(0.3, 4);
    const lineMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    
    for(let z = -segmentLength/2; z < segmentLength/2; z += 10){
      const line = new THREE.Mesh(lineGeom, lineMat.clone());
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, z);
      group.add(line);
    }
    
    return group;
  }

  function createCar(){
    car = new THREE.Group();
    
    // Chasis mejorado
    const bodyGeom = new THREE.BoxGeometry(1.6, 0.8, 2.8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: SHOP_COLORS[playerData.currentColorIndex].hex, 
      roughness: 0.25, 
      metalness: 0.8,
      emissive: SHOP_COLORS[playerData.currentColorIndex].hex,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Cabina
    const cabinGeom = new THREE.BoxGeometry(1.4, 0.6, 1.4);
    const cabinMat = new THREE.MeshStandardMaterial({ 
      color: 0x0a0a0a, 
      roughness: 0.3, 
      metalness: 0.7 
    });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 1.2, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Parabrisas
    const windshieldGeom = new THREE.BoxGeometry(1.35, 0.5, 0.1);
    const windshieldMat = new THREE.MeshStandardMaterial({ 
      color: 0x2277aa, 
      roughness: 0.1, 
      metalness: 0.9,
      transparent: true,
      opacity: 0.6
    });
    const windshield = new THREE.Mesh(windshieldGeom, windshieldMat);
    windshield.position.set(0, 1.3, -0.9);
    car.add(windshield);

    // Luces delanteras
    const lightGeom = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const lightMat = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      emissive: 0xffff00,
      emissiveIntensity: 0.8
    });
    
    const leftLight = new THREE.Mesh(lightGeom, lightMat);
    leftLight.position.set(-0.6, 0.5, 1.5);
    car.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeom, lightMat.clone());
    rightLight.position.set(0.6, 0.5, 1.5);
    car.add(rightLight);

    // Ruedas mejoradas
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111, 
      roughness: 0.7,
      metalness: 0.3
    });
    
    const wheelPositions = [
      [-0.9, 0.35, 1.1],
      [0.9, 0.35, 1.1],
      [-0.9, 0.35, -1.1],
      [0.9, 0.35, -1.1],
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat.clone());
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      car.add(wheel);
    });

    car.position.set(0, 0.75, 15);
    scene.add(car);
  }

  function createDecorations(){
    // Sistema simplificado - Solo montañas al fondo, sin decoraciones que desaparecen
    console.log('🏔️ Creando entorno simple...');
    
    // Plano de fondo grande (tierra/césped infinito)
    const groundGeom = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a2a1a,
      roughness: 1
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    ground.userData.isPermanent = true; // No se mueve
    
    // Montañas de fondo (estáticas)
    for(let i = 0; i < 8; i++){
      const mountainGroup = createMountain();
      const angle = (i / 8) * Math.PI * 2;
      const radius = 200;
      mountainGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      scene.add(mountainGroup);
      mountainGroup.userData.isPermanent = true;
    }
    
    console.log('✅ Entorno creado');
  }

  function createMountain(){
    const group = new THREE.Group();
    
    const height = 20 + Math.random() * 30;
    const width = 30 + Math.random() * 20;
    
    const geom = new THREE.ConeGeometry(width, height, 4);
    const mat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color().setHSL(0.3, 0.3, 0.2 + Math.random() * 0.2),
      roughness: 0.9
    });
    const mountain = new THREE.Mesh(geom, mat);
    mountain.position.y = height / 2;
    mountain.rotation.y = Math.random() * Math.PI;
    group.add(mountain);
    
    return group;
  }

  function spawnZombie(){
    const types = Object.values(ZOMBIE_TYPES);
    const weights = [0.5, 0.25, 0.15, 0.1]; // Probabilidades
    const rand = Math.random();
    let type;
    
    if(rand < weights[0]) type = ZOMBIE_TYPES.NORMAL;
    else if(rand < weights[0] + weights[1]) type = ZOMBIE_TYPES.FAST;
    else if(rand < weights[0] + weights[1] + weights[2]) type = ZOMBIE_TYPES.TANK;
    else type = ZOMBIE_TYPES.EXPLOSIVE;

    const zombie = new THREE.Group();
    
    const bodyGeom = new THREE.BoxGeometry(0.6 * type.size, 1.2 * type.size, 0.4 * type.size);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: type.color, 
      roughness: 0.8,
      emissive: type.explosive ? type.color : 0x000000,
      emissiveIntensity: type.explosive ? 0.3 : 0
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6 * type.size;
    body.castShadow = true;
    zombie.add(body);

    const headGeom = new THREE.BoxGeometry(0.4 * type.size, 0.4 * type.size, 0.4 * type.size);
    const headMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(type.color).multiplyScalar(1.2), 
      roughness: 0.7 
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.4 * type.size;
    head.castShadow = true;
    zombie.add(head);

    const side = Math.random() < 0.5 ? -1 : 1;
    const xPos = side * (CONFIG.ROAD_WIDTH / 2 - 1.5 + Math.random() * 2);
    const zPos = car.position.z - 45 - Math.random() * 35;
    
    zombie.position.set(xPos, 0, zPos);
    zombie.userData = {
      type: type,
      speed: CONFIG.ZOMBIE_BASE_SPEED * type.speed,
      health: type.health,
      maxHealth: type.health,
      wobble: Math.random() * 1000,
      hitCooldown: 0,
    };
    
    scene.add(zombie);
    zombies.push(zombie);
  }

  function spawnPowerup(){
    const types = Object.values(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];

    const powerup = new THREE.Group();
    
    const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ 
      color: type.color,
      emissive: type.color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    const cube = new THREE.Mesh(geom, mat);
    cube.position.y = 1;
    cube.castShadow = true;
    powerup.add(cube);

    const xPos = (Math.random() - 0.5) * (CONFIG.ROAD_WIDTH - 4);
    const zPos = car.position.z - 30 - Math.random() * 20;
    
    powerup.position.set(xPos, 0, zPos);
    powerup.userData = { type: type };
    
    scene.add(powerup);
    powerups.push(powerup);
  }

  // ========== SISTEMA DE PARTÍCULAS ==========
  let dustGeom, dustMat, dustMesh;
  let dustPositions, dustVel, dustLifetimes;
  const maxDust = CONFIG.MAX_DUST_PARTICLES;

  function initDustSystem(){
    dustPositions = new Float32Array(maxDust * 3);
    dustVel = new Float32Array(maxDust * 3);
    dustLifetimes = new Float32Array(maxDust);
    
    for(let i = 0; i < maxDust * 3; i++) {
      dustPositions[i] = 99999;
    }

    dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeom.setAttribute('aLifetime', new THREE.BufferAttribute(dustLifetimes, 1));

    dustMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aLifetime;
        varying float vLifetime;
        void main(){
          vLifetime = aLifetime;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 18.0 * (aLifetime / 0.8);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying float vLifetime;
        void main(){
          float alpha = vLifetime / 0.8;
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if(dist > 0.5) discard;
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(0.7, 0.7, 0.7, alpha * edgeFade * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    dustMesh = new THREE.Points(dustGeom, dustMat);
    scene.add(dustMesh);
  }

  function spawnDust(pos, count = 8){
    for(let i = 0; i < count; i++){
      let idx = -1;
      for(let j = 0; j < maxDust; j++){
        if(dustLifetimes[j] <= 0){
          idx = j;
          break;
        }
      }
      if(idx === -1) break;

      const pi = idx * 3;
      dustPositions[pi] = pos.x + (Math.random() - 0.5) * 1.5;
      dustPositions[pi + 1] = pos.y + Math.random() * 0.4;
      dustPositions[pi + 2] = pos.z + (Math.random() - 0.5) * 1.5;
      
      dustVel[pi] = (Math.random() - 0.5) * 3;
      dustVel[pi + 1] = Math.random() * 0.8;
      dustVel[pi + 2] = (Math.random() - 0.5) * 3;
      
      dustLifetimes[idx] = 0.9;
    }
    
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.aLifetime.needsUpdate = true;
  }

  function initParticleSystem(){
    // Sistema para explosiones y efectos especiales
  }

  function spawnExplosion(pos){
    playExplosionSfx();
    
    for(let i = 0; i < 15; i++){
      const geom = new THREE.SphereGeometry(0.2, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.1, 1, 0.5)
      });
      const particle = new THREE.Mesh(geom, mat);
      particle.position.copy(pos);
      
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6,
        (Math.random() - 0.5) * 8
      );
      
      particle.userData = {
        velocity: vel,
        life: 1.0,
        gravity: -15
      };
      
      scene.add(particle);
      particles.push(particle);
    }

    cameraShake(0.2, 300);
  }

  // ========== CONTROLES ==========
  const keys = {};
  let mouseX = 0, mouseY = 0, mouseActive = false;

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
    
    // Nitro con N
    if(e.key.toLowerCase() === 'n' && gameState.running && carState.nitro > 0){
      gameState.hasTurbo = true;
    }
    
    // Disparar con Click o E
    if(e.key.toLowerCase() === 'e' && gameState.hasWeapon && gameState.running){
      shootBullet();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    if(e.key.toLowerCase() === 'n'){
      gameState.hasTurbo = false;
    }
  });

  window.addEventListener('mousemove', e => {
    if(gameState.running && !gameState.paused){
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      mouseActive = true;
    }
  });

  window.addEventListener('click', () => {
    if(!gameState.running && !audioCtx) initAudio();
    if(gameState.hasWeapon && gameState.running && !gameState.paused){
      shootBullet();
    }
  });

  function shootBullet(){
    if(!car) return;
    
    playShootSfx();
    
    const bullet = new THREE.Group();
    const geom = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1
    });
    const sphere = new THREE.Mesh(geom, mat);
    bullet.add(sphere);
    
    bullet.position.copy(car.position);
    bullet.position.y = 1;
    
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
    bullet.userData = {
      velocity: dir.multiplyScalar(1.5),
      life: 2.0
    };
    
    scene.add(bullet);
    bullets.push(bullet);
  }

  // ========== FÍSICA DEL COCHE ==========
  function updateCarPhysics(dt){
    if(!car || !carState.velocity || gameState.paused) return;

    const forward = keys['w'] || keys['arrowup'];
    const backward = keys['s'] || keys['arrowdown'];
    const left = keys['a'] || keys['arrowleft'];
    const right = keys['d'] || keys['arrowright'];
    const brake = keys[' '];
    const handbrake = keys['shift'];
    const nitro = keys['n'] && carState.nitro > 0;

    let turnAmt = 0;
    if(left) turnAmt += 1;
    if(right) turnAmt -= 1;

    if(mouseActive && Math.abs(mouseX) > 0.05){
      turnAmt += mouseX * playerData.mouseSensitivity;
    }

    turnAmt = clamp(turnAmt, -1, 1);

    let accel = CONFIG.ACCELERATION;
    let maxSpeed = CONFIG.MAX_SPEED;
    
    if(nitro || gameState.hasTurbo){
      accel *= 1.8;
      maxSpeed *= 1.5;
      if(nitro) carState.nitro = Math.max(0, carState.nitro - dt * 30);
    } else {
      carState.nitro = Math.min(carState.maxNitro, carState.nitro + dt * 10);
    }

    if(forward) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
      carState.velocity.addScaledVector(dir, accel);
    }
    if(backward) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
      carState.velocity.addScaledVector(dir, -CONFIG.BRAKE_FORCE);
    }

    if(brake || handbrake) {
      carState.velocity.multiplyScalar(handbrake ? 0.90 : 0.94);
    }

    carState.velocity.multiplyScalar(CONFIG.FRICTION);

    const speed = carState.velocity.length();
    const clamped = clamp(speed, -maxSpeed, maxSpeed);
    
    if(Math.abs(turnAmt) > 0.01 && clamped > 0.02){
      car.rotation.y += turnAmt * CONFIG.TURN_SPEED * (clamped / maxSpeed);
    }

    const disp = carState.velocity.clone().multiplyScalar(dt * 60);
    car.position.add(disp);

    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -turnAmt * 0.3, 0.08);

    car.traverse(child => { 
      if(child.geometry?.type === 'CylinderGeometry') {
        child.rotation.x += speed * 0.12;
      }
    });

    if(audioCtx && audioNodes.engineOsc){
      const baseFreq = 70;
      const rpm = 300 + (Math.abs(clamped) / maxSpeed) * 1600;
      audioNodes.engineOsc.frequency.setTargetAtTime(
        baseFreq + rpm * 0.02, 
        audioCtx.currentTime, 
        0.05
      );
    }

    speedEl.textContent = Math.round(clamped * 60) + ' km/h';

    if(handbrake || (brake && Math.abs(clamped) > maxSpeed * CONFIG.DRIFT_THRESHOLD)){
      const carWorld = new THREE.Vector3();
      car.getWorldPosition(carWorld);
      spawnDust(carWorld, 6 + Math.round(Math.abs(clamped) * 5));
    }

    if(nitro || gameState.hasTurbo){
      const carWorld = new THREE.Vector3();
      car.getWorldPosition(carWorld);
      spawnDust(carWorld, 3);
    }

    const roadHalfWidth = CONFIG.ROAD_WIDTH / 2;
    const roadMargin = 1.2;
    const minX = -roadHalfWidth + roadMargin;
    const maxX = roadHalfWidth - roadMargin;
    
    if(car.position.x < minX){
      car.position.x = minX;
      carState.velocity.x *= -0.2;
      cameraShake(0.06, 180);
      playCollisionSfx();
    }
    if(car.position.x > maxX){
      car.position.x = maxX;
      carState.velocity.x *= -0.2;
      cameraShake(0.06, 180);
      playCollisionSfx();
    }
  }

  // ========== LÓGICA DE ZOMBIES ==========
  function checkZombies(dt, speedMult = 1){
    const carPos = new THREE.Vector3();
    car.getWorldPosition(carPos);
    
    for(let i = zombies.length - 1; i >= 0; i--){
      const z = zombies[i];
      const zPos = new THREE.Vector3();
      z.getWorldPosition(zPos);
      const dist = zPos.distanceTo(carPos);
      
      if(dist > 2){
        const dir = new THREE.Vector3().subVectors(carPos, zPos).normalize();
        const wobble = Math.sin((performance.now() + z.userData.wobble) / 300) * 0.23;
        
        z.position.x += (dir.x + wobble * 0.02) * z.userData.speed * speedMult * dt * 40;
        z.position.z += dir.z * z.userData.speed * speedMult * dt * 40;
      }

      z.traverse(child => { 
        if(child.geometry?.type === 'BoxGeometry') {
          child.rotation.x = Math.sin((performance.now() + z.userData.wobble) / 200) * 0.15;
        }
      });

      // Rotación del cubo de power-up
      z.rotation.y += dt * 2;

      if(dist < CONFIG.COLLISION_DIST){
        const now = performance.now();
        if(!z.userData.hitCooldown || now - z.userData.hitCooldown > 1000){
          z.userData.hitCooldown = now;
          
          if(!gameState.hasShield){
            const dmg = z.userData.type.damage * (1 - (playerData.upgrades.armor.level * 0.1));
            gameState.hp -= dmg;
            gameState.combo = 0;
            gameState.comboTimer = 0;
            gameState.score = Math.max(0, gameState.score - 6);
            playCollisionSfx();
            cameraShake(0.12, 220);
            showDamageEffect(); // Efecto visual de pantalla roja
            inGameMessage(`-${Math.floor(dmg)} HP`, 800);
          } else {
            playPowerupSfx();
            inGameMessage('¡Escudo! 🛡️', 800);
          }
          
          z.position.z -= 5;
          
          if(z.userData.type.explosive){
            spawnExplosion(zPos);
            killZombie(z, i);
          }
        }
      }

      if(z.position.z > car.position.z + 12){
        scene.remove(z);
        zombies.splice(i, 1);
        gameState.combo++;
        if(gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
        addScore(z.userData.type.points * getComboMultiplier());
        addCoins(z.userData.type.coins);
        gameState.kills++;
        gameState.zombiesKilledThisWave++;
      }
    }
  }

  function killZombie(zombie, index){
    gameState.combo++;
    gameState.comboTimer = 0;
    if(gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    
    // Contador especial para zombies tanque (para misiones)
    if(zombie.userData.type.name === 'Tanque'){
      gameState.tanksKilled++;
    }
    
    // Sonido de combo
    if(gameState.combo % 5 === 0){
      playComboSfx();
      inGameMessage(`¡Combo x${gameState.combo}! 🔥`, 1200);
    }
    
    addScore(zombie.userData.type.points * getComboMultiplier());
    addCoins(zombie.userData.type.coins);
    gameState.kills++;
    gameState.zombiesKilledThisWave++;
    
    scene.remove(zombie);
    zombies.splice(index, 1);
  }

  function getComboMultiplier(){
    if(gameState.combo < 5) return 1;
    if(gameState.combo < 10) return 1.5;
    if(gameState.combo < 20) return 2;
    return 3;
  }

  function addScore(points){
    gameState.score += points;
  }

  function addCoins(coins){
    const mult = 1 + (playerData.upgrades.coinMultiplier.level * 0.5);
    playerData.totalCoins += Math.floor(coins * mult);
  }

  // ========== POWER-UPS ==========
  function checkPowerups(dt){
    const carPos = new THREE.Vector3();
    car.getWorldPosition(carPos);
    
    for(let i = powerups.length - 1; i >= 0; i--){
      const p = powerups[i];
      const pPos = new THREE.Vector3();
      p.getWorldPosition(pPos);
      const dist = pPos.distanceTo(carPos);
      
      // Efecto imán
      if(gameState.hasMagnet && dist < 8){
        const dir = new THREE.Vector3().subVectors(carPos, pPos).normalize();
        p.position.add(dir.multiplyScalar(dt * 10));
      }
      
      // Rotación
      p.rotation.y += dt * 3;
      p.children[0].position.y = 1 + Math.sin(performance.now() / 300) * 0.3;
      
      if(dist < 1.5){
        activatePowerup(p.userData.type);
        scene.remove(p);
        powerups.splice(i, 1);
      }
      
      if(p.position.z > car.position.z + 15){
        scene.remove(p);
        powerups.splice(i, 1);
      }
    }
  }

  function activatePowerup(type){
    playPowerupSfx();
    
    switch(type.effect){
      case 'heal':
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 30);
        inGameMessage('¡+30 HP! ❤️', 1500);
        break;
      case 'shield':
        gameState.hasShield = true;
        gameState.powerups.set('shield', Date.now() + type.duration);
        inGameMessage('¡Escudo activado! 🛡️', 1500);
        updatePowerupIcons();
        break;
      case 'turbo':
        gameState.powerups.set('turbo', Date.now() + type.duration);
        inGameMessage('¡Turbo activado! ⚡', 1500);
        updatePowerupIcons();
        break;
      case 'magnet':
        gameState.hasMagnet = true;
        gameState.powerups.set('magnet', Date.now() + type.duration);
        inGameMessage('¡Imán activado! 🧲', 1500);
        updatePowerupIcons();
        break;
      case 'weapon':
        gameState.hasWeapon = true;
        gameState.powerups.set('weapon', Date.now() + type.duration);
        inGameMessage('¡Arma activada! 🔫 (Click/E para disparar)', 2000);
        updatePowerupIcons();
        break;
    }
  }

  function updatePowerups(dt){
    const now = Date.now();
    
    for(const [key, expiry] of gameState.powerups.entries()){
      if(now > expiry){
        gameState.powerups.delete(key);
        
        switch(key){
          case 'shield':
            gameState.hasShield = false;
            inGameMessage('Escudo desactivado', 1000);
            break;
          case 'turbo':
            // El turbo se controla por tecla N
            break;
          case 'magnet':
            gameState.hasMagnet = false;
            inGameMessage('Imán desactivado', 1000);
            break;
          case 'weapon':
            gameState.hasWeapon = false;
            inGameMessage('Arma desactivada', 1000);
            break;
        }
        
        updatePowerupIcons();
      }
    }
  }

  function updatePowerupIcons(){
    if(!elements.powerupContainer) return;
    
    elements.powerupContainer.innerHTML = '';
    
    for(const [key, expiry] of gameState.powerups.entries()){
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      const icon = document.createElement('div');
      icon.className = 'powerup-icon';
      
      let emoji = '';
      switch(key){
        case 'shield': emoji = '🛡️'; break;
        case 'turbo': emoji = '⚡'; break;
        case 'magnet': emoji = '🧲'; break;
        case 'weapon': emoji = '🔫'; break;
      }
      
      icon.innerHTML = `${emoji}<br><span style="font-size:10px">${remaining}s</span>`;
      elements.powerupContainer.appendChild(icon);
    }
  }

  // ========== BALAS ==========
  function updateBullets(dt){
    for(let i = bullets.length - 1; i >= 0; i--){
      const b = bullets[i];
      b.position.add(b.userData.velocity.clone().multiplyScalar(dt * 60));
      b.userData.life -= dt;
      
      if(b.userData.life <= 0){
        scene.remove(b);
        bullets.splice(i, 1);
        continue;
      }
      
      // Comprobar colisión con zombies
      const bPos = new THREE.Vector3();
      b.getWorldPosition(bPos);
      
      for(let j = zombies.length - 1; j >= 0; j--){
        const z = zombies[j];
        const zPos = new THREE.Vector3();
        z.getWorldPosition(zPos);
        
        if(bPos.distanceTo(zPos) < 1.5){
          z.userData.health--;
          
          if(z.userData.health <= 0){
            spawnExplosion(zPos);
            killZombie(z, j);
          } else {
            playCollisionSfx();
          }
          
          scene.remove(b);
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // ========== PARTÍCULAS ==========
  function updateParticles(dt){
    for(let i = particles.length - 1; i >= 0; i--){
      const p = particles[i];
      p.userData.velocity.y += p.userData.gravity * dt;
      p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
      p.userData.life -= dt;
      
      p.material.opacity = p.userData.life;
      
      if(p.userData.life <= 0 || p.position.y < 0){
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
  }

  // ========== EFECTOS DE CÁMARA ==========
  let camShake = { decay: 0, intensity: 0 };
  
  function cameraShake(intensity, dur){ 
    camShake.intensity = intensity; 
    camShake.decay = dur; 
  }

  // ========== LOOP PRINCIPAL ==========
  function animate(now){
    requestAnimationFrame(animate);
    
    const dt = Math.min(0.06, (now - gameState.lastTime) / 1000);
    gameState.lastTime = now;

    // Actualizar FPS
    updateFPS(now);
    
    // Actualizar ciclo día/noche
    updateDayNightCycle(now);
    
    // Actualizar motion blur
    updateMotionBlur();
    
    // Actualizar líneas de velocidad
    updateSpeedLines();

    // Actualizar partículas de polvo
    for(let i = 0; i < maxDust; i++){
      if(dustLifetimes[i] > 0){
        dustLifetimes[i] -= dt;
        const pi = i * 3;
        
        dustPositions[pi] += dustVel[pi] * dt * 6;
        dustPositions[pi + 1] += dustVel[pi + 1] * dt * 6;
        dustPositions[pi + 2] += dustVel[pi + 2] * dt * 6;
        
        if(dustLifetimes[i] <= 0){
          dustPositions[pi] = dustPositions[pi + 1] = dustPositions[pi + 2] = 99999;
          dustVel[pi] = dustVel[pi + 1] = dustVel[pi + 2] = 0;
        }
      }
    }
    
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.aLifetime.needsUpdate = true;

    if(gameState.running && !gameState.paused){
      // DIFICULTAD PROGRESIVA BASADA EN OLEADAS
      const wave = gameState.wave;
      
      // Oleada 1: MUY FÁCIL (3-5 zombies, spawn lento)
      // Oleada 2-3: Fácil (5-8 zombies)
      // Oleada 4-6: Normal (8-12 zombies)
      // Oleada 7-10: Difícil (12-18 zombies)
      // Oleada 10+: Muy Difícil (18-30+ zombies)
      
      let spawnDelay, maxZombies, zombieSpeedMultiplier;
      
      if(wave === 1) {
        // Oleada 1: TUTORIAL - Muy fácil
        spawnDelay = 3000; // 3 segundos entre zombies
        maxZombies = 3;    // Máximo 3 zombies a la vez
        zombieSpeedMultiplier = 0.7; // Zombies lentos
      } else if(wave === 2) {
        spawnDelay = 2500;
        maxZombies = 5;
        zombieSpeedMultiplier = 0.8;
      } else if(wave === 3) {
        spawnDelay = 2000;
        maxZombies = 7;
        zombieSpeedMultiplier = 0.9;
      } else if(wave <= 5) {
        spawnDelay = 1600;
        maxZombies = 8 + (wave - 3) * 2;
        zombieSpeedMultiplier = 1.0;
      } else if(wave <= 10) {
        spawnDelay = Math.max(800, 1400 - (wave - 5) * 100);
        maxZombies = 12 + (wave - 5) * 1.5;
        zombieSpeedMultiplier = 1.0 + ((wave - 5) * 0.08);
      } else {
        // Oleada 10+: Máxima dificultad
        spawnDelay = Math.max(500, 800 - (wave - 10) * 30);
        maxZombies = Math.min(35, 18 + (wave - 10) * 1.2);
        zombieSpeedMultiplier = 1.4 + ((wave - 10) * 0.05);
      }

      // Spawn zombies
      if(now - gameState.lastSpawn > spawnDelay){
        if(zombies.length < maxZombies) spawnZombie();
        gameState.lastSpawn = now;
      }

      // Spawn power-ups ocasionalmente
      if(Math.random() < 0.0008 && powerups.length < 3){
        spawnPowerup();
      }

      updateCarPhysics(dt);
      checkZombies(dt, zombieSpeedMultiplier);
      checkPowerups(dt);
      updateBullets(dt);
      updateParticles(dt);
      updatePowerups(dt);
      
      gameState.score += 0.025 * carState.velocity.length() * dt * 100;
      
      // Combo timer
      if(gameState.combo > 0){
        gameState.comboTimer += dt;
        if(gameState.comboTimer > 3){
          gameState.combo = 0;
          gameState.comboTimer = 0;
        }
      }

      // Oleadas
      if(gameState.zombiesKilledThisWave >= 20){
        gameState.wave++;
        gameState.zombiesKilledThisWave = 0;
        inGameMessage(`¡Oleada ${gameState.wave}! 🌊`, 2000);
        playPowerupSfx();
      }
      
      // Verificar misiones
      checkMissions();

      if(gameState.hp <= 0){
        gameState.running = false;
        showGameOver();
      }
    }
    
    // Dibujar mini-mapa
    drawMinimap();

    // Sol
    if(sunMesh && sun) {
      const t = performance.now() * 0.00015;
      sun.position.x = 120 * Math.cos(t);
      sun.position.y = 60 + 12 * Math.sin(t * 0.9);
      sun.position.z = -50 + 15 * Math.sin(t * 0.5);
      sunMesh.position.copy(sun.position);
    }

    // Cámara suave
    const desiredPos = new THREE.Vector3()
      .copy(car.position)
      .add(new THREE.Vector3(0, 7, 13).applyQuaternion(car.quaternion));
    
    camera.position.lerp(desiredPos, 0.12);
    
    const lookAt = new THREE.Vector3()
      .copy(car.position)
      .add(new THREE.Vector3(0, 1.5, -5).applyQuaternion(car.quaternion));

    if(camShake.decay > 0){
      const s = camShake.intensity * (camShake.decay / 300);
      camera.position.x += (Math.random() * 2 - 1) * s;
      camera.position.y += (Math.random() * 2 - 1) * s;
      camShake.decay -= dt * 1000;
    }
    
    camera.lookAt(lookAt);

    // Actualizar HUD
    scoreEl.textContent = Math.floor(gameState.score);
    hpEl.textContent = Math.max(0, Math.floor(gameState.hp));
    
    if(elements.comboEl) {
      if(gameState.combo > 1){
        elements.comboEl.textContent = `x${gameState.combo}`;
        elements.comboEl.style.display = 'block';
      } else {
        elements.comboEl.style.display = 'none';
      }
    }
    
    if(elements.waveEl) {
      elements.waveEl.textContent = `Oleada ${gameState.wave}`;
    }
    
    if(elements.nitroBar) {
      elements.nitroBar.style.width = (carState.nitro / carState.maxNitro * 100) + '%';
    }
    
    const coinsEarned = Math.floor(gameState.score / 100);
    coinsEl.textContent = playerData.totalCoins + coinsEarned;

    // Mover SOLO segmentos de carretera (no montañas ni ground)
    decorations.forEach(deco => {
      // Solo mover si es un segmento de carretera (no permanente)
      if(!deco.userData.isPermanent && deco.userData.isRoad){
        if(deco.position.z > car.position.z + 100){
          deco.position.z -= 600; // 3 segmentos * 200
        }
      }
    });

    try {
      if(composer) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }
    } catch(e){ 
      logErr(e); 
    }
  }

  // ========== CONTROL DE JUEGO ==========
  function resetGame(){
    zombies.forEach(z => scene.remove(z));
    zombies.length = 0;
    
    powerups.forEach(p => scene.remove(p));
    powerups.length = 0;
    
    bullets.forEach(b => scene.remove(b));
    bullets.length = 0;
    
    particles.forEach(p => scene.remove(p));
    particles.length = 0;

    gameState.score = 0;
    gameState.hp = gameState.maxHp;
    gameState.combo = 0;
    gameState.comboTimer = 0;
    gameState.maxCombo = 0;
    gameState.kills = 0;
    gameState.wave = 1;
    gameState.zombiesKilledThisWave = 0;
    gameState.tanksKilled = 0;
    gameState.lastSpawn = performance.now();
    gameState.powerups.clear();
    gameState.hasShield = false;
    gameState.hasTurbo = false;
    gameState.hasMagnet = false;
    gameState.hasWeapon = false;

    carState.nitro = carState.maxNitro;
    
    if(!carState.velocity) carState.velocity = new THREE.Vector3();
    carState.velocity.set(0, 0, 0);
    car.position.set(0, 0.75, 15);
    car.rotation.set(0, 0, 0);

    for(let i = 0; i < maxDust; i++){
      dustPositions[i * 3] = dustPositions[i * 3 + 1] = dustPositions[i * 3 + 2] = 99999;
      dustLifetimes[i] = 0;
    }
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.aLifetime.needsUpdate = true;

    elements.btnRestart.style.display = 'inline-block';
    scoreEl.textContent = '0';
    hpEl.textContent = gameState.maxHp;
    speedEl.textContent = '0 km/h';
    
    if(elements.powerupContainer) elements.powerupContainer.innerHTML = '';
  }

  function startGame(){
    if(!scene) {
      alert('Error: Escena no inicializada. Recarga la página.');
      return;
    }
    
    if(!car) {
      alert('Error: Coche no inicializado. Recarga la página.');
      return;
    }
    
    resetGame();
    gameState.running = true;
    gameState.paused = false;
    
    overlayMenu.style.display = 'none';
    overlayShop.style.display = 'none';
    overlayGameOver.style.display = 'none';
    if(elements.overlayLeaderboard) elements.overlayLeaderboard.style.display = 'none';
    if(elements.overlayZombieInfo) elements.overlayZombieInfo.style.display = 'none';
    
    if(!audioCtx) initAudio();
    updateAudioGains();
    
    // Iniciar música de fondo
    playBackgroundMusic();
    
    gameState.lastTime = performance.now();
    gameState.lastFPSUpdate = performance.now();
    gameState.frameCount = 0;
    mouseActive = false;
    
    playerData.gamesPlayed++;
    savePlayerData();
    
    console.log('✅ Juego iniciado con todas las mejoras');
  }

  function showGameOver(){
    const coinsGained = Math.floor(gameState.score / 100);
    playerData.totalCoins += coinsGained;
    playerData.totalKills += gameState.kills;
    
    // Guardar en tabla de clasificación
    saveHighScore();
    
    // Detener música
    stopBackgroundMusic();
    
    if(gameState.score > playerData.bestScore){
      playerData.bestScore = gameState.score;
      elements.goTitle.textContent = '🏆 ¡Nuevo Récord!';
    } else {
      elements.goTitle.textContent = 'Game Over';
    }
    
    savePlayerData();
    
    elements.goScore.textContent = Math.floor(gameState.score);
    elements.goCoins.textContent = coinsGained;
    if(elements.goKills) elements.goKills.textContent = gameState.kills;
    if(elements.goMaxCombo) elements.goMaxCombo.textContent = `x${gameState.maxCombo}`;
    
    overlayGameOver.style.display = 'block';
    overlayMenu.style.display = 'none';
    overlayShop.style.display = 'none';
    if(elements.overlayLeaderboard) elements.overlayLeaderboard.style.display = 'none';
    if(elements.overlayZombieInfo) elements.overlayZombieInfo.style.display = 'none';
    elements.btnRestart.style.display = 'none';
  }

  // ========== INTRO CINEMÁTICA ==========
  (function showIntroPan(){
    const start = performance.now();
    const dur = 1400;
    
    function pan(now){
      if(!camera) {
        requestAnimationFrame(pan);
        return;
      }
      
      const p = Math.min(1, (now - start) / dur);
      const ease = (1 - Math.cos(p * Math.PI)) / 2;
      
      camera.position.set(
        0 + ease * 6,
        8 + ease * 1,
        -20 + ease * 28
      );
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      
      if(p < 1) requestAnimationFrame(pan);
    }
    
    requestAnimationFrame(pan);
  })();

  // ========== INICIALIZACIÓN ==========
  try {
    initThree();
    gameState.lastTime = performance.now();
    animate(gameState.lastTime);

    inGameMessage('¡Bienvenido! 🎮 Abre la tienda para mejoras', 4000);

    window.cvz = { 
      scene, 
      car, 
      zombies, 
      powerups,
      startGame, 
      resetGame, 
      playerData,
      gameState,
    };
    
    console.log('✅ Juego ULTRA inicializado');
  } catch(e) {
    console.error('❌ Error fatal:', e);
    alert('Error: ' + e.message);
  }

})();
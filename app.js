// 🎮 CAR VS ZOMBIES - VERSIÓN ULTRA MEJORADA 🎮
// Con física de drifting real, mundo infinito y mejoras de jugabilidad

(function(){
  'use strict';

  console.log('🚀 Iniciando Car vs Zombies ULTRA...');

  // ========== CONFIGURACIÓN ==========
  const BASE_CONFIG = {
    ROAD_WIDTH: 18,
    MAX_SPEED: 0.48,
    ACCELERATION: 0.018,
    BRAKE_FORCE: 0.03,
    FRICTION: 0.975,
    LATERAL_FRICTION: 0.88,       // fricción lateral (menor = más drifting)
    TURN_SPEED: 0.028,
    MAX_NITRO: 100,
    COLLISION_DIST: 1.88,
    DRIFT_THRESHOLD: 0.25,
    MAX_DUST_PARTICLES: 160,
    ZOMBIE_BASE_SPEED: 0.23,
    SPAWN_DELAY_BASE: 1200,
    // Mundo infinito
    CHUNK_LENGTH: 200,
    NUM_CHUNKS: 4,
    TREE_ROWS: 3,               // filas de árboles por lado
    TREE_SPACING: 12,
    LAMP_SPACING: 25,
  };

  const CONFIG = { ...BASE_CONFIG };

  const MODES = {
    classic: {
      name: 'Clásico',
      scoreMultiplier: 1,
      timeLimit: null,
      spawnRate: 1,
      damageMultiplier: 1,
      powerupRate: 1,
    },
    timeAttack: {
      name: 'Contrarreloj',
      scoreMultiplier: 1.3,
      timeLimit: 120,
      spawnRate: 1.2,
      damageMultiplier: 1,
      powerupRate: 1,
    },
    survival: {
      name: 'Supervivencia',
      scoreMultiplier: 1.1,
      timeLimit: null,
      spawnRate: 1.4,
      damageMultiplier: 1.35,
      powerupRate: 0.6,
    },
  };

  // ========== TIPOS DE ZOMBIES ==========
  const ZOMBIE_TYPES = {
    NORMAL:    { name:'Normal',    color:0x2d5a2d, speed:1.0,  health:1, damage:12, points:10, coins:1, size:1.0 },
    FAST:      { name:'Rápido',   color:0xff6600, speed:1.8,  health:1, damage:8,  points:20, coins:2, size:0.8 },
    TANK:      { name:'Tanque',   color:0x8b0000, speed:0.6,  health:3, damage:25, points:50, coins:5, size:1.5 },
    EXPLOSIVE: { name:'Explosivo',color:0xffff00, speed:1.2,  health:1, damage:30, points:40, coins:3, size:1.1, explosive:true },
  };

  // ========== POWER-UPS ==========
  const POWERUP_TYPES = {
    HEALTH: { name:'Vida',  color:0x00ff00, icon:'❤️',  duration:0,     effect:'heal' },
    SHIELD: { name:'Escudo',color:0x00ffff, icon:'🛡️',  duration:8000,  effect:'shield' },
    TURBO:  { name:'Turbo', color:0xff6600, icon:'⚡',  duration:6000,  effect:'turbo' },
    MAGNET: { name:'Imán',  color:0xffdd00, icon:'🧲',  duration:10000, effect:'magnet' },
    WEAPON: { name:'Arma',  color:0xff0000, icon:'🔫',  duration:15000, effect:'weapon' },
  };

  // ========== TIENDA ==========
  const SHOP_COLORS = [
    { name:'Azul Clásico',      hex:0x1f7ad2, price:0,    unlocked:true },
    { name:'Rojo Deportivo',    hex:0xff0000, price:500  },
    { name:'Verde Neón',        hex:0x00ff00, price:500  },
    { name:'Amarillo Eléctrico',hex:0xffff00, price:500  },
    { name:'Púrpura Oscuro',    hex:0x7700ff, price:750  },
    { name:'Naranja Fuego',     hex:0xff6600, price:750  },
    { name:'Cian Gélido',       hex:0x00ffff, price:750  },
    { name:'Rosa Neón',         hex:0xff0099, price:1000 },
    { name:'Oro Puro',          hex:0xffdd00, price:1000 },
    { name:'Plata Metálica',    hex:0xcccccc, price:800  },
    { name:'Negro Profundo',    hex:0x111111, price:600  },
    { name:'Blanco Nieve',      hex:0xffffff, price:600  },
  ];

  const SHOP_UPGRADES = {
    maxHealth:      { name:'Vida Máxima',           baseCost:300, level:0, maxLevel:5, bonus:20,  desc:'+20 HP por nivel' },
    speed:          { name:'Velocidad',             baseCost:400, level:0, maxLevel:5, bonus:0.05, desc:'+5% velocidad máx.' },
    handling:       { name:'Maniobrabilidad',       baseCost:350, level:0, maxLevel:5, bonus:0.07, desc:'+7% giro y grip' },
    nitroTank:      { name:'Nitro Máximo',          baseCost:320, level:0, maxLevel:5, bonus:12,  desc:'+12 nitro por nivel' },
    nitroRegen:     { name:'Recarga Nitro',         baseCost:380, level:0, maxLevel:5, bonus:0.12, desc:'Recarga más rápida' },
    armor:          { name:'Armadura',              baseCost:500, level:0, maxLevel:5, bonus:0.1, desc:'-10% daño recibido' },
    coinMultiplier: { name:'Multiplicador Monedas', baseCost:600, level:0, maxLevel:3, bonus:0.5, desc:'+50% monedas' },
    powerupDuration:{ name:'Duración Power-Ups',    baseCost:420, level:0, maxLevel:4, bonus:0.12, desc:'+12% duración' },
    magnetRange:    { name:'Alcance Imán',          baseCost:360, level:0, maxLevel:4, bonus:1.5, desc:'+1.5m de alcance' },
    shieldDuration: { name:'Escudo Extendido',      baseCost:450, level:0, maxLevel:4, bonus:1.5, desc:'+1.5s de escudo' },
    weaponDuration: { name:'Munición Extra',        baseCost:480, level:0, maxLevel:4, bonus:2, desc:'+2s de arma' },
  };

  const STORAGE_KEY = 'carVsZombies_playerData';

  // ========== ESTADO DEL JUEGO ==========
  const gameState = {
    running:false, paused:false,
    score:0, hp:100, maxHp:100,
    lastSpawn:0, lastTime:0,
    combo:0, comboTimer:0, maxCombo:0,
    kills:0, wave:1, zombiesKilledThisWave:0,
    powerups: new Map(),
    hasShield:false, hasTurbo:false, hasMagnet:false, hasWeapon:false,
    mode: 'classic',
    timeRemaining: null,
    powerupDurationMult: 1,
    magnetRange: 10,
    shieldDurationBonus: 0,
    weaponDurationBonus: 0,
  };

  // Estado del coche con física real
  const carState = {
    velocity: null,            // Vector3 velocidad en mundo
    angularVelocity: 0,
    nitro: 100,
    maxNitro: 100,
    // Física mejorada
    wheelAngle: 0,             // ángulo actual de las ruedas delanteras
    targetWheelAngle: 0,       // ángulo objetivo
    steerInput: 0,             // entrada suavizada de dirección
    driftAmount: 0,            // cantidad de drift activo (0-1)
    suspensionPhase: 0,        // fase de rebote de suspensión
    suspensionY: 0,            // desplazamiento vertical por suspensión
  };

  let playerData = {
    totalCoins:0, ownedColors:[0], currentColorIndex:0,
    mouseSensitivity:1, bestScore:0, totalKills:0, gamesPlayed:0,
    selectedMode:'classic',
    upgrades: JSON.parse(JSON.stringify(SHOP_UPGRADES)),
  };

  // ========== GESTIÓN DE DATOS ==========
  function loadPlayerData(){
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved){
        const loaded = JSON.parse(saved);
        playerData = { ...playerData, ...loaded };
        if(!playerData.upgrades) playerData.upgrades = JSON.parse(JSON.stringify(SHOP_UPGRADES));
        Object.keys(SHOP_UPGRADES).forEach(key=>{
          if(!playerData.upgrades[key]){
            playerData.upgrades[key] = JSON.parse(JSON.stringify(SHOP_UPGRADES[key]));
          }
        });
      }
      if(mouseSensitivity) {
        mouseSensitivity.value = playerData.mouseSensitivity || 1;
        updateMouseSensitivityDisplay();
      }
      if(playerData.selectedMode && MODES[playerData.selectedMode]){
        gameState.mode = playerData.selectedMode;
      }
      applyUpgrades();
      updateModeUI();
    } catch(e){ console.warn('Error cargando datos:', e); }
  }

  function savePlayerData(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData)); }
    catch(e){ console.warn('Error guardando datos:', e); }
  }

  function applyUpgrades(){
    const upgrades = playerData.upgrades || {};
    const getUpgrade = (key) => upgrades[key] || { level: 0, bonus: 0 };
    const maxHealth = getUpgrade('maxHealth');
    const speed = getUpgrade('speed');
    const handling = getUpgrade('handling');
    const nitroTank = getUpgrade('nitroTank');
    const powerupDuration = getUpgrade('powerupDuration');
    const magnetRange = getUpgrade('magnetRange');
    const shieldDuration = getUpgrade('shieldDuration');
    const weaponDuration = getUpgrade('weaponDuration');

    gameState.maxHp = 100 + (maxHealth.level * maxHealth.bonus);
    CONFIG.MAX_SPEED = BASE_CONFIG.MAX_SPEED + (speed.level * speed.bonus);
    CONFIG.TURN_SPEED = BASE_CONFIG.TURN_SPEED * (1 + handling.level * handling.bonus);
    CONFIG.LATERAL_FRICTION = clamp(
      BASE_CONFIG.LATERAL_FRICTION + (handling.level * 0.01),
      0.82,
      0.95
    );
    carState.maxNitro = BASE_CONFIG.MAX_NITRO + (nitroTank.level * nitroTank.bonus);
    carState.nitro = Math.min(carState.nitro, carState.maxNitro);
    gameState.powerupDurationMult = 1 + (powerupDuration.level * powerupDuration.bonus);
    gameState.magnetRange = 10 + (magnetRange.level * magnetRange.bonus);
    gameState.shieldDurationBonus = shieldDuration.level * shieldDuration.bonus;
    gameState.weaponDurationBonus = weaponDuration.level * weaponDuration.bonus;
  }

  // ========== UTILIDADES ==========
  function logErr(e){ console.error(e); inGameMessage('Error: '+(e?.message||e)); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }

  // ========== DOM ==========
  const elements = {
    container:          document.getElementById('container'),
    overlayMenu:        document.getElementById('overlayMenu'),
    overlayShop:        document.getElementById('overlayShop'),
    overlayGameOver:    document.getElementById('overlayGameOver'),
    startBtn:           document.getElementById('startBtn'),
    playAgain:          document.getElementById('playAgain'),
    toMenu:             document.getElementById('toMenu'),
    btnOpenMenu:        document.getElementById('btnOpenMenu'),
    btnSettings:        document.getElementById('btnSettings'),
    btnRestart:         document.getElementById('btnRestart'),
    openSettings:       document.getElementById('openSettings'),
    openShop:           document.getElementById('openShop'),
    backFromShop:       document.getElementById('backFromShop'),
    settingsPanel:      document.getElementById('settingsPanel'),
    closeSettings:      document.getElementById('closeSettings'),
    scoreEl:            document.getElementById('score'),
    hpEl:               document.getElementById('hp'),
    speedEl:            document.getElementById('speed'),
    coinsEl:            document.getElementById('coins'),
    comboEl:            document.getElementById('combo'),
    waveEl:             document.getElementById('wave'),
    modeDisplay:        document.getElementById('modeDisplay'),
    timeDisplay:        document.getElementById('timeDisplay'),
    nitroBar:           document.getElementById('nitroBar'),
    volMaster:          document.getElementById('volMaster'),
    volEngine:          document.getElementById('volEngine'),
    volSfx:             document.getElementById('volSfx'),
    volMasterVal:       document.getElementById('volMasterVal'),
    volEngineVal:       document.getElementById('volEngineVal'),
    volSfxVal:          document.getElementById('volSfxVal'),
    mouseSensitivity:   document.getElementById('mouseSensitivity'),
    mouseSensitivityVal:document.getElementById('mouseSensitivityVal'),
    inGameMsg:          document.getElementById('inGameMsg'),
    shopCoinsDisplay:   document.getElementById('shopCoinsDisplay'),
    shopGrid:           document.getElementById('shopGrid'),
    upgradesGrid:       document.getElementById('upgradesGrid'),
    goTitle:            document.getElementById('goTitle'),
    goScore:            document.getElementById('goScore'),
    goCoins:            document.getElementById('goCoins'),
    goKills:            document.getElementById('goKills'),
    goMaxCombo:         document.getElementById('goMaxCombo'),
    powerupContainer:   document.getElementById('powerupContainer'),
    modeCards:          document.querySelectorAll('.mode-card'),
  };

  const { overlayMenu, overlayShop, overlayGameOver,
          scoreEl, hpEl, speedEl, coinsEl,
          volMaster, volEngine, volSfx, mouseSensitivity } = elements;

  function inGameMessage(text, ms=2000){
    if(!elements.inGameMsg) return;
    elements.inGameMsg.innerText = text;
    elements.inGameMsg.style.display = 'block';
    elements.inGameMsg.style.animation = 'none';
    setTimeout(()=>{ elements.inGameMsg.style.animation = 'slideInDown 0.3s ease'; },10);
    setTimeout(()=> elements.inGameMsg.style.display='none', ms);
  }

  // ========== AUDIO ==========
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  const audioNodes = { master:null, engine:null, sfx:null, music:null, engineOsc:null, engineNoise:null };

  function initAudio(){
    try {
      if(audioCtx) return;
      audioCtx = new AudioContext();
      audioNodes.master  = audioCtx.createGain();
      audioNodes.engine  = audioCtx.createGain();
      audioNodes.sfx     = audioCtx.createGain();
      audioNodes.music   = audioCtx.createGain();
      audioNodes.master.connect(audioCtx.destination);
      audioNodes.engine.connect(audioNodes.master);
      audioNodes.sfx.connect(audioNodes.master);
      audioNodes.music.connect(audioNodes.master);
      updateAudioGains();

      // Motor
      audioNodes.engineOsc = audioCtx.createOscillator();
      audioNodes.engineOsc.type = 'sawtooth';
      audioNodes.engineOsc.frequency.value = 80;
      const engineFilter = audioCtx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 1200;
      audioNodes.engineOsc.connect(engineFilter);
      engineFilter.connect(audioNodes.engine);
      audioNodes.engineOsc.start();

      // Ruido motor
      const bufferSize = audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for(let i=0;i<bufferSize;i++) data[i]=(Math.random()*2-1)*0.14;
      audioNodes.engineNoise = audioCtx.createBufferSource();
      audioNodes.engineNoise.buffer = noiseBuffer;
      audioNodes.engineNoise.loop = true;
      audioNodes.engineNoise.connect(audioNodes.engine);
      audioNodes.engineNoise.start();

      console.log('✅ Audio inicializado');
    } catch(e){ console.warn('⚠️ Error audio:', e); }
  }

  function updateAudioGains(){
    if(!audioCtx) return;
    audioNodes.master.gain.value = parseFloat(volMaster.value);
    audioNodes.engine.gain.value = parseFloat(volEngine.value);
    audioNodes.sfx.gain.value    = parseFloat(volSfx.value);
  }

  function playSound(freq, dur=0.1, type='sine', vol=0.3){
    if(!audioCtx||!audioNodes.sfx) return;
    try {
      const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
      osc.type=type; osc.frequency.value=freq;
      osc.connect(g); g.connect(audioNodes.sfx);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
      osc.start(); osc.stop(audioCtx.currentTime+dur);
    } catch(e){}
  }

  function playCollisionSfx(){ playSound(80+Math.random()*60, 0.15, 'sawtooth', 0.35); }
  function playPowerupSfx(){ playSound(600,0.3,'sine',0.4); setTimeout(()=>playSound(800,0.2,'sine',0.3),100); }
  function playExplosionSfx(){ playSound(50,0.4,'sawtooth',0.5); }
  function playShootSfx(){ playSound(200,0.05,'square',0.25); }
  function playDriftSfx(){
    // Chirp de neumático en drift
    if(!audioCtx||!audioNodes.sfx) return;
    try {
      const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
      osc.type='sawtooth'; osc.frequency.value=180;
      osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime+0.15);
      osc.connect(g); g.connect(audioNodes.sfx);
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.18);
      osc.start(); osc.stop(audioCtx.currentTime+0.2);
    } catch(e){}
  }

  // ========== CONTROLES DE AUDIO UI ==========
  volMaster.addEventListener('input', e=>{ elements.volMasterVal.innerText=Math.round(e.target.value*100)+'%'; updateAudioGains(); });
  volEngine.addEventListener('input', e=>{ elements.volEngineVal.innerText=Math.round(e.target.value*100)+'%'; updateAudioGains(); });
  volSfx.addEventListener('input',   e=>{ elements.volSfxVal.innerText=Math.round(e.target.value*100)+'%';   updateAudioGains(); });

  function updateMouseSensitivityDisplay(){ elements.mouseSensitivityVal.innerText=Math.round(mouseSensitivity.value*100)+'%'; }
  mouseSensitivity.addEventListener('input', e=>{
    playerData.mouseSensitivity=parseFloat(e.target.value);
    updateMouseSensitivityDisplay(); savePlayerData();
  });

  // ========== EVENTOS UI ==========
  elements.btnSettings.addEventListener('click', ()=>{
    elements.settingsPanel.style.display = elements.settingsPanel.style.display==='block'?'none':'block';
  });
  elements.openSettings.addEventListener('click', ()=>{ elements.settingsPanel.style.display='block'; });
  elements.closeSettings.addEventListener('click', ()=>{ elements.settingsPanel.style.display='none'; });

  elements.startBtn.addEventListener('click', ()=>{
    try { startGame(); } catch(e){ console.error('❌ Error:', e); alert('Error: '+e.message); }
  });
  elements.playAgain.addEventListener('click', startGame);
  elements.toMenu.addEventListener('click', ()=>{ overlayGameOver.style.display='none'; overlayMenu.style.display='block'; });

  elements.btnOpenMenu.addEventListener('click', ()=>{
    if(gameState.running){
      gameState.paused = !gameState.paused;
      overlayMenu.style.display = gameState.paused?'block':'none';
    }
  });

  elements.btnRestart.addEventListener('click', ()=>{ resetGame(); gameState.running=true; gameState.paused=false; });

  function formatTime(seconds){
    if(seconds === null) return '∞';
    const clamped = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  }

  function updateModeUI(){
    const mode = MODES[gameState.mode] || MODES.classic;
    if(elements.modeDisplay) elements.modeDisplay.textContent = mode.name;
    if(elements.timeDisplay){
      const displayTime = gameState.timeRemaining ?? mode.timeLimit;
      elements.timeDisplay.textContent = formatTime(displayTime);
    }
    if(elements.modeCards){
      elements.modeCards.forEach(card=>{
        const selected = card.dataset.mode === gameState.mode;
        card.classList.toggle('selected', selected);
      });
    }
  }

  function setGameMode(modeKey){
    if(!MODES[modeKey]) return;
    gameState.mode = modeKey;
    playerData.selectedMode = modeKey;
    updateModeUI();
    savePlayerData();
  }

  if(elements.modeCards){
    elements.modeCards.forEach(card=>{
      card.addEventListener('click', ()=> setGameMode(card.dataset.mode));
    });
  }

  // ========== TIENDA ==========
  function renderShop(){
    elements.shopGrid.innerHTML='';
    SHOP_COLORS.forEach((color,idx)=>{
      const isOwned=playerData.ownedColors.includes(idx);
      const isCurrent=playerData.currentColorIndex===idx;
      const card=document.createElement('div');
      card.className='color-card';
      card.style.backgroundColor='#'+color.hex.toString(16).padStart(6,'0');
      if(isCurrent) card.classList.add('current');
      if(isOwned) card.classList.add('owned');
      const nameDiv=document.createElement('div'); nameDiv.className='color-name'; nameDiv.textContent=color.name;
      const priceDiv=document.createElement('div'); priceDiv.className='color-price';
      priceDiv.textContent = isOwned ? (isCurrent?'✓ Equipado':'✓ Tuyo') : `💰 ${color.price}`;
      card.appendChild(nameDiv); card.appendChild(priceDiv);
      card.addEventListener('click', ()=> handleColorClick(idx, color, isOwned));
      elements.shopGrid.appendChild(card);
    });
    if(elements.upgradesGrid){
      elements.upgradesGrid.innerHTML='';
      Object.entries(playerData.upgrades).forEach(([key,upgrade])=>{
        const card=document.createElement('div'); card.className='upgrade-card';
        const cost=upgrade.baseCost*Math.pow(1.5,upgrade.level);
        const isMaxed=upgrade.level>=upgrade.maxLevel;
        card.innerHTML=`
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-level">Nivel ${upgrade.level}/${upgrade.maxLevel}</div>
          <div class="upgrade-desc">${upgrade.desc || ''}</div>
          <div class="upgrade-price">${isMaxed?'✓ MÁXIMO':'💰 '+Math.floor(cost)}</div>
        `;
        if(!isMaxed){ card.style.cursor='pointer'; card.addEventListener('click',()=>handleUpgradeClick(key,upgrade,cost)); }
        else card.classList.add('maxed');
        elements.upgradesGrid.appendChild(card);
      });
    }
    updateShopCoinsDisplay();
  }

  function handleColorClick(idx, color, isOwned){
    if(isOwned){ playerData.currentColorIndex=idx; if(car) updateCarColor(idx); savePlayerData(); renderShop(); inGameMessage('¡Color equipado! 🎨'); }
    else if(playerData.totalCoins>=color.price){ playerData.totalCoins-=color.price; playerData.ownedColors.push(idx); playerData.currentColorIndex=idx; if(car) updateCarColor(idx); savePlayerData(); renderShop(); inGameMessage(`¡Comprado: ${color.name}! 🎉`); }
    else inGameMessage(`Necesitas ${color.price-playerData.totalCoins} monedas más 💸`);
  }

  function handleUpgradeClick(key, upgrade, cost){
    if(playerData.totalCoins>=cost){ playerData.totalCoins-=cost; playerData.upgrades[key].level++; savePlayerData(); applyUpgrades(); renderShop(); inGameMessage(`¡${upgrade.name} mejorado! ⬆️`); playPowerupSfx(); }
    else inGameMessage(`Necesitas ${Math.floor(cost-playerData.totalCoins)} monedas más 💸`);
  }

  function updateShopCoinsDisplay(){ if(elements.shopCoinsDisplay) elements.shopCoinsDisplay.textContent=playerData.totalCoins; }

  function updateCarColor(colorIndex){
    if(!car) return;
    const color=SHOP_COLORS[colorIndex];
    car.traverse(child=>{
      if(child.isMesh && child.userData.isCarBody){
        child.material.color.setHex(color.hex);
        child.material.emissive.setHex(color.hex);
      }
    });
  }

  elements.openShop.addEventListener('click', ()=>{ overlayMenu.style.display='none'; overlayShop.style.display='block'; renderShop(); });
  elements.backFromShop.addEventListener('click', ()=>{ overlayShop.style.display='none'; overlayMenu.style.display='block'; });

  // Información de zombies
  elements.openZombieInfo = document.getElementById('openZombieInfo');
  elements.overlayZombieInfo = document.getElementById('overlayZombieInfo');
  elements.backFromZombieInfo = document.getElementById('backFromZombieInfo');
  if(elements.openZombieInfo) elements.openZombieInfo.addEventListener('click', ()=>{ overlayMenu.style.display='none'; elements.overlayZombieInfo.style.display='block'; });
  if(elements.backFromZombieInfo) elements.backFromZombieInfo.addEventListener('click', ()=>{ elements.overlayZombieInfo.style.display='none'; overlayMenu.style.display='block'; });

  loadPlayerData();

  // ========== THREE.JS GLOBALS ==========
  let renderer, scene, camera, composer;
  let car, sun, sunMesh;
  let zombies=[], powerups=[], bullets=[], particles=[], decorations=[];

  // Mundo infinito: arrays de chunks
  let worldChunks = [];   // segmentos de carretera + bordes
  let envChunks  = [];    // árboles, postes, edificios a los lados
  let groundChunks = [];  // segmentos de suelo verde
  let mountainRing = []; // montañas que se mueven con parallax
  let clouds = [];
  let skyDome = null;

  // Ruedas delanteras (referencia para girarlas)
  let frontWheels = [];

  // ========== INIT THREE ==========
  function initThree(){
    try {
      console.log('🎨 Inicializando THREE.js...');
      if(typeof THREE === 'undefined') throw new Error('THREE.js no cargado');

      carState.velocity = new THREE.Vector3();

      renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      elements.container.insertBefore(renderer.domElement, elements.container.firstChild);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.006);

      skyDome = createSkyDome();
      scene.add(skyDome);

      camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 600);
      camera.position.set(0,8,20);

      // ILUMINACIÓN
      const ambientLight = new THREE.AmbientLight(0x606878, 0.7);
      scene.add(ambientLight);

      sun = new THREE.DirectionalLight(0xffe8cc, 2.0);
      sun.position.set(100, 80, 60);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left=-60; sun.shadow.camera.right=60;
      sun.shadow.camera.top=60; sun.shadow.camera.bottom=-60;
      sun.shadow.camera.near=0.1; sun.shadow.camera.far=300;
      sun.shadow.bias = -0.0005;
      scene.add(sun);

      const sunGeom = new THREE.SphereGeometry(6, 16, 16);
      const sunMat  = new THREE.MeshBasicMaterial({ color:0xffeeaa, fog:false });
      sunMesh = new THREE.Mesh(sunGeom, sunMat);
      sunMesh.position.copy(sun.position);
      scene.add(sunMesh);

      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.5);
      scene.add(hemiLight);

      // Post-processing
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 0.85));
      } catch(e){ console.warn('⚠️ Post-processing no disponible'); }

      // CONSTRUIR MUNDO
      buildInfiniteWorld();
      createCar();
      initDustSystem();

      window.addEventListener('resize', onWindowResize, false);
      console.log('✅ THREE.js inicializado – Mundo infinito activo');
    } catch(e){ logErr(e); throw e; }
  }

  function onWindowResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if(composer) composer.setSize(window.innerWidth, window.innerHeight);
  }

  // ========== MUNDO INFINITO ==========
  // Materiales compartidos (se crean una vez)
  let matRoad, matSide, matLine, matGround, matTree, matTrunk, matLampPost, matLampLight, matBuilding;
  let matRock, matBush, matBillboard, matCloud;

  function initWorldMaterials(){
    // Carretera asfalto oscuro
    matRoad = new THREE.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.95, metalness:0.05 });
    // Bordes verdes
    matSide = new THREE.MeshStandardMaterial({ color:0x1a3a1a, roughness:1.0 });
    // Línea blanca centro
    matLine = new THREE.MeshBasicMaterial({ color:0xeeeeee });
    // Suelo verde más claro
    matGround = new THREE.MeshStandardMaterial({ color:0x2d5a2d, roughness:1.0 });
    // Árboles
    matTree  = new THREE.MeshStandardMaterial({ color:0x1a6b1a, roughness:0.9 });
    matTrunk = new THREE.MeshStandardMaterial({ color:0x5c3d2e, roughness:0.95 });
    // Postes de luz
    matLampPost  = new THREE.MeshStandardMaterial({ color:0x444444, roughness:0.7, metalness:0.5 });
    matLampLight = new THREE.MeshBasicMaterial({ color:0xffeeaa });
    // Edificios
    matBuilding  = new THREE.MeshStandardMaterial({ color:0x3a3a4a, roughness:0.8 });
    // Rocas y arbustos
    matRock = new THREE.MeshStandardMaterial({ color:0x4b4b50, roughness:0.9 });
    matBush = new THREE.MeshStandardMaterial({ color:0x1f5f2b, roughness:0.95 });
    matBillboard = new THREE.MeshStandardMaterial({ color:0x222831, roughness:0.6, metalness:0.2 });
    matCloud = new THREE.MeshLambertMaterial({ color:0xffffff, transparent:true, opacity:0.85, depthWrite:false });
  }

  function buildInfiniteWorld(){
    initWorldMaterials();

    const CL = CONFIG.CHUNK_LENGTH;
    const NC = CONFIG.NUM_CHUNKS;

    // Crear chunks de carretera
    for(let i=0; i<NC; i++){
      const chunk = createRoadChunk();
      chunk.position.z = -i * CL;   // delante del coche (z negativo = delante)
      scene.add(chunk);
      worldChunks.push(chunk);
    }

    // Crear chunks de entorno lateral (árboles, postes, edificios)
    for(let i=0; i<NC; i++){
      const chunk = createEnvChunk();
      chunk.position.z = -i * CL;
      scene.add(chunk);
      envChunks.push(chunk);
    }

    // Crear chunks de suelo (más ancho que la carretera)
    for(let i=0; i<NC; i++){
      const chunk = createGroundChunk();
      chunk.position.z = -i * CL;
      scene.add(chunk);
      groundChunks.push(chunk);
    }

    // Crear anillo de montañas (parallax, mucho más lejos)
    for(let i=0; i<12; i++){
      const m = createMountain();
      const angle = (i/12)*Math.PI*2;
      m.position.set(Math.cos(angle)*350, 0, Math.sin(angle)*350);
      scene.add(m);
      mountainRing.push(m);
    }

    // Crear nubes decorativas
    for(let i=0; i<18; i++){
      const cloud = createCloud();
      cloud.position.set(
        (Math.random()-0.5)*260,
        35 + Math.random()*25,
        (Math.random()-0.5)*260
      );
      scene.add(cloud);
      clouds.push(cloud);
    }

    console.log('🌍 Mundo infinito construido');
  }

  // --- Chunk de carretera (asfalto + bordes + líneas centrales) ---
  function createRoadChunk(){
    const g = new THREE.Group();
    const L = CONFIG.CHUNK_LENGTH;
    const W = CONFIG.ROAD_WIDTH;

    // Asfalto
    const road = new THREE.Mesh(new THREE.PlaneGeometry(W, L), matRoad);
    road.rotation.x = -Math.PI/2; road.receiveShadow=true;
    g.add(road);

    // Borde izquierdo
    const sL = new THREE.Mesh(new THREE.PlaneGeometry(6, L), matSide);
    sL.rotation.x=-Math.PI/2; sL.position.set(-(W/2+3),0.01,0); sL.receiveShadow=true;
    g.add(sL);
    // Borde derecho
    const sR = new THREE.Mesh(new THREE.PlaneGeometry(6, L), matSide);
    sR.rotation.x=-Math.PI/2; sR.position.set(W/2+3,0.01,0); sR.receiveShadow=true;
    g.add(sR);

    // Líneas centrales discontinuas
    for(let z=-L/2; z<L/2; z+=10){
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 4), matLine);
      line.rotation.x=-Math.PI/2; line.position.set(0, 0.02, z);
      g.add(line);
    }

    return g;
  }

  // --- Chunk de suelo verde ancho ---
  function createGroundChunk(){
    const L = CONFIG.CHUNK_LENGTH;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(120, L), matGround);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.y = -0.02;
    mesh.receiveShadow = true;
    return mesh;
  }

  // --- Chunk de entorno: árboles + postes + edificios ---
  function createEnvChunk(){
    const g = new THREE.Group();
    const L = CONFIG.CHUNK_LENGTH;
    const W = CONFIG.ROAD_WIDTH;
    const halfW = W/2 + 3; // borde incluido

    // --- ÁRBOLES: 2 filas por lado ---
    const treeSpacing = CONFIG.TREE_SPACING;
    const treeOffsets = [halfW+4, halfW+14]; // distancia desde centro
    const sides = [-1, 1];

    sides.forEach(side=>{
      treeOffsets.forEach(offset=>{
        for(let z=-L/2+treeSpacing/2; z<L/2; z+=treeSpacing){
          // Añadir algo de variación
          const jitter = (Math.random()-0.5)*3;
          const tree = createTree();
          tree.position.set(side*(offset+jitter), 0, z+(Math.random()-0.5)*4);
          // Escala aleatoria
          const s = 0.7+Math.random()*0.6;
          tree.scale.set(s,s,s);
          g.add(tree);
        }
      });
    });

    // --- POSTES DE LUZ: uno por lado cada LAMP_SPACING ---
    const lampSpacing = CONFIG.LAMP_SPACING;
    sides.forEach(side=>{
      for(let z=-L/2+lampSpacing/2; z<L/2; z+=lampSpacing){
        const lamp = createLampPost();
        lamp.position.set(side*(halfW+1), 0, z);
        g.add(lamp);
      }
    });

    // --- EDIFICIOS: uno por lado cada 60 unidades, más lejos ---
    sides.forEach(side=>{
      for(let z=-L/2+30; z<L/2; z+=60){
        const bldg = createBuilding();
        bldg.position.set(side*(halfW+22), 0, z+(Math.random()-0.5)*15);
        g.add(bldg);
      }
    });

    // --- Rocas y arbustos cercanos ---
    sides.forEach(side=>{
      for(let z=-L/2+10; z<L/2; z+=18){
        if(Math.random()<0.55){
          const rock = createRock();
          rock.position.set(side*(halfW+6+Math.random()*3), 0, z+(Math.random()-0.5)*6);
          g.add(rock);
        }
        if(Math.random()<0.4){
          const bush = createBush();
          bush.position.set(side*(halfW+8+Math.random()*4), 0, z+(Math.random()-0.5)*6);
          g.add(bush);
        }
      }
    });

    // --- Carteles ocasionales ---
    sides.forEach(side=>{
      for(let z=-L/2+40; z<L/2; z+=90){
        if(Math.random()<0.35){
          const sign = createBillboard();
          sign.position.set(side*(halfW+16), 0, z+(Math.random()-0.5)*10);
          g.add(sign);
        }
      }
    });

    return g;
  }

  // --- Árbol individual ---
  function createTree(){
    const g = new THREE.Group();
    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.25, 1.2, 6),
      matTrunk
    );
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    g.add(trunk);
    // Copa (2 conos superpuestos)
    const mat1 = matTree.clone();
    mat1.color.setHSL(0.28+Math.random()*0.08, 0.6+Math.random()*0.3, 0.2+Math.random()*0.15);
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), mat1);
    cone1.position.y = 2.0; cone1.castShadow=true;
    g.add(cone1);
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 7), mat1);
    cone2.position.y = 3.1; cone2.castShadow=true;
    g.add(cone2);
    return g;
  }

  // --- Poste de luz ---
  function createLampPost(){
    const g = new THREE.Group();
    // Poste vertical
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), matLampPost);
    post.position.y = 2.5; post.castShadow=true;
    g.add(post);
    // Brazo horizontal
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), matLampPost);
    arm.rotation.z = Math.PI/2;
    arm.position.set(0.6, 5, 0);
    g.add(arm);
    // Bombilla
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), matLampLight);
    bulb.position.set(1.1, 4.9, 0);
    g.add(bulb);
    // Luz puntual pequeña
    const light = new THREE.PointLight(0xffeeaa, 0.4, 18);
    light.position.set(1.1, 4.9, 0);
    g.add(light);
    return g;
  }

  // --- Edificio simple ---
  function createBuilding(){
    const g = new THREE.Group();
    const w = 6 + Math.random()*6;
    const h = 5 + Math.random()*12;
    const d = 5 + Math.random()*4;
    const mat = matBuilding.clone();
    mat.color.setHSL(0.55+Math.random()*0.08, 0.15, 0.18+Math.random()*0.12);

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    bldg.position.y = h/2;
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    g.add(bldg);

    // Ventanas (pequeños cubes brillantes)
    const winMat = new THREE.MeshBasicMaterial({ color:0xffeecc });
    const winW = 0.7, winH = 0.9, winD = 0.05;
    const cols = Math.floor(w/1.8);
    const rows = Math.floor(h/2);
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        if(Math.random()<0.55){ // 55% de ventanas encendidas
          const win = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, winD), winMat);
          win.position.set(
            -w/2 + 1.2 + c*(w/(cols)),
            1.2 + r*2,
            d/2+0.03
          );
          g.add(win);
        }
      }
    }
    return g;
  }

  // --- Rocas decorativas ---
  function createRock(){
    const g = new THREE.Group();
    const w = 0.8 + Math.random()*1.6;
    const h = 0.4 + Math.random()*0.9;
    const d = 0.6 + Math.random()*1.2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), matRock);
    rock.scale.set(w, h, d);
    rock.position.y = h * 0.5;
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
    return g;
  }

  // --- Arbustos ---
  function createBush(){
    const bush = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 7), matBush);
    bush.scale.set(1 + Math.random()*0.6, 0.7 + Math.random()*0.4, 1 + Math.random()*0.6);
    bush.castShadow = true;
    bush.receiveShadow = true;
    bush.position.y = 0.6;
    return bush;
  }

  // --- Cartel publicitario ---
  function createBillboard(){
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 0.4), matBillboard);
    base.position.y = 1.8;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), matBillboard);
    pole.position.y = 1.4;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2, 0.2), matBillboard.clone());
    panel.position.y = 3;
    panel.material.color.setHSL(0.08 + Math.random()*0.08, 0.2, 0.25);
    g.add(base, pole, panel);
    return g;
  }

  // --- Montaña (horizonte) ---
  function createMountain(){
    const g = new THREE.Group();
    const h = 25+Math.random()*40;
    const w = 40+Math.random()*30;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.3+Math.random()*0.05, 0.25, 0.18+Math.random()*0.12),
      roughness:0.95
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
    cone.position.y = h/2;
    cone.rotation.y = Math.random()*Math.PI;
    cone.castShadow=true;
    g.add(cone);
    return g;
  }

  // --- Cúpula de cielo con gradiente ---
  function createSkyDome(){
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0b1420');
    grad.addColorStop(0.4, '#3b7aa5');
    grad.addColorStop(1, '#8fd3ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 32), mat);
    dome.position.set(0, 50, 0);
    return dome;
  }

  // --- Nube simple ---
  function createCloud(){
    const g = new THREE.Group();
    const puffCount = 3 + Math.floor(Math.random()*3);
    for(let i=0;i<puffCount;i++){
      const puff = new THREE.Mesh(new THREE.SphereGeometry(3+Math.random()*2.5, 8, 8), matCloud);
      puff.position.set((Math.random()-0.5)*6, Math.random()*2, (Math.random()-0.5)*6);
      g.add(puff);
    }
    g.scale.setScalar(0.6 + Math.random()*0.7);
    g.userData.speed = 0.2 + Math.random()*0.3;
    return g;
  }

  // ========== COCHE (mejorado con suspensión visual) ==========
  function createCar(){
    car = new THREE.Group();
    frontWheels = [];

    const carColor = SHOP_COLORS[playerData.currentColorIndex].hex;

    // Chasis
    const bodyMat = new THREE.MeshStandardMaterial({
      color:carColor, roughness:0.25, metalness:0.8,
      emissive:carColor, emissiveIntensity:0.12
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2.8), bodyMat);
    body.position.y = 0.6;
    body.castShadow=true; body.receiveShadow=true;
    body.userData.isCarBody = true;
    car.add(body);

    // Cabina
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.6, 1.4),
      new THREE.MeshStandardMaterial({ color:0x0a0a0a, roughness:0.3, metalness:0.7 })
    );
    cabin.position.set(0, 1.2, -0.2); cabin.castShadow=true;
    car.add(cabin);

    // Parabrisas
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.5, 0.1),
      new THREE.MeshStandardMaterial({ color:0x2277aa, roughness:0.1, metalness:0.9, transparent:true, opacity:0.6 })
    );
    windshield.position.set(0, 1.3, -0.9);
    car.add(windshield);

    // Luces delanteras
    const lightMat = new THREE.MeshStandardMaterial({ color:0xffff00, emissive:0xffff00, emissiveIntensity:0.8 });
    const lL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), lightMat);
    lL.position.set(-0.6, 0.5, 1.5); car.add(lL);
    const lR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), lightMat.clone());
    lR.position.set(0.6, 0.5, 1.5); car.add(lR);

    // Luces traseras (rojas)
    const rearLightMat = new THREE.MeshStandardMaterial({ color:0xff0000, emissive:0xff0000, emissiveIntensity:0.6 });
    const rL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.08), rearLightMat);
    rL.position.set(-0.6, 0.55, -1.45); car.add(rL);
    const rR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.08), rearLightMat.clone());
    rR.position.set(0.6, 0.55, -1.45); car.add(rR);

    // Ruedas
    const wheelMat = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.7, metalness:0.3 });
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);

    const wheelDefs = [
      { pos:[-0.9, 0.35, 1.1],  front:true  },
      { pos:[ 0.9, 0.35, 1.1],  front:true  },
      { pos:[-0.9, 0.35,-1.1],  front:false },
      { pos:[ 0.9, 0.35,-1.1],  front:false },
    ];

    wheelDefs.forEach(def=>{
      const wheel = new THREE.Mesh(wheelGeom, wheelMat.clone());
      wheel.rotation.z = Math.PI/2;
      wheel.position.set(...def.pos);
      wheel.castShadow=true;
      wheel.userData.isWheel=true;
      wheel.userData.isFront=def.front;
      car.add(wheel);
      if(def.front) frontWheels.push(wheel);
    });

    car.position.set(0, 0.75, 15);
    scene.add(car);
  }

  // ========== SPAWN ZOMBIES / POWERUPS ==========
  function spawnZombie(){
    const rand = Math.random();
    let type;
    if(rand<0.5) type=ZOMBIE_TYPES.NORMAL;
    else if(rand<0.75) type=ZOMBIE_TYPES.FAST;
    else if(rand<0.9) type=ZOMBIE_TYPES.TANK;
    else type=ZOMBIE_TYPES.EXPLOSIVE;

    const zombie = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color:type.color, roughness:0.8,
      emissive: type.explosive ? type.color : 0x000000,
      emissiveIntensity: type.explosive ? 0.3 : 0
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6*type.size, 1.2*type.size, 0.4*type.size), bodyMat);
    body.position.y = 0.6*type.size; body.castShadow=true;
    zombie.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(type.color).multiplyScalar(1.2), roughness:0.7 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4*type.size, 0.4*type.size, 0.4*type.size), headMat);
    head.position.y = 1.4*type.size; head.castShadow=true;
    zombie.add(head);

    // Brazos
    const armMat = bodyMat.clone();
    const armGeom = new THREE.BoxGeometry(0.15*type.size, 0.7*type.size, 0.15*type.size);
    const armL = new THREE.Mesh(armGeom, armMat);
    armL.position.set(-0.38*type.size, 0.75*type.size, 0);
    zombie.add(armL);
    const armR = new THREE.Mesh(armGeom, armMat.clone());
    armR.position.set(0.38*type.size, 0.75*type.size, 0);
    zombie.add(armR);

    const side = Math.random()<0.5 ? -1 : 1;
    const xPos = side*(CONFIG.ROAD_WIDTH/2-1.5+Math.random()*2);
    const zPos = car.position.z - 50 - Math.random()*30;

    zombie.position.set(xPos, 0, zPos);
    zombie.userData = { type, speed:CONFIG.ZOMBIE_BASE_SPEED*type.speed, health:type.health, maxHealth:type.health, wobble:Math.random()*1000, hitCooldown:0 };
    scene.add(zombie);
    zombies.push(zombie);
  }

  function spawnPowerup(){
    const types = Object.values(POWERUP_TYPES);
    const type = types[Math.floor(Math.random()*types.length)];
    const powerup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color:type.color, emissive:type.color, emissiveIntensity:0.5, roughness:0.2, metalness:0.8 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), mat);
    cube.position.y=1; cube.castShadow=true;
    powerup.add(cube);
    // Marco brillante
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.82,0.82,0.82));
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color:0xffffff }));
    wireframe.position.y=1;
    powerup.add(wireframe);

    powerup.position.set((Math.random()-0.5)*(CONFIG.ROAD_WIDTH-4), 0, car.position.z-35-Math.random()*20);
    powerup.userData = { type };
    scene.add(powerup);
    powerups.push(powerup);
  }

  // ========== PARTÍCULAS DE POLVO ==========
  let dustGeom, dustMat, dustMesh;
  let dustPositions, dustVel, dustLifetimes;
  const maxDust = CONFIG.MAX_DUST_PARTICLES;

  function initDustSystem(){
    dustPositions = new Float32Array(maxDust*3);
    dustVel = new Float32Array(maxDust*3);
    dustLifetimes = new Float32Array(maxDust);
    for(let i=0;i<maxDust*3;i++) dustPositions[i]=99999;

    dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions,3));
    dustGeom.setAttribute('aLifetime', new THREE.BufferAttribute(dustLifetimes,1));

    dustMat = new THREE.ShaderMaterial({
      uniforms:{},
      vertexShader:`
        attribute float aLifetime;
        varying float vLifetime;
        void main(){
          vLifetime = aLifetime;
          vec4 mvPos = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = 20.0*(aLifetime/0.8);
          gl_Position = projectionMatrix*mvPos;
        }`,
      fragmentShader:`
        varying float vLifetime;
        void main(){
          float alpha = vLifetime/0.8;
          vec2 c = gl_PointCoord-vec2(0.5);
          float d = length(c);
          if(d>0.5) discard;
          float f = 1.0 - smoothstep(0.3,0.5,d);
          gl_FragColor = vec4(0.75,0.75,0.7, alpha*f*0.65);
        }`,
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
    });

    dustMesh = new THREE.Points(dustGeom, dustMat);
    scene.add(dustMesh);
  }

  function spawnDust(pos, count=8){
    for(let i=0;i<count;i++){
      let idx=-1;
      for(let j=0;j<maxDust;j++){ if(dustLifetimes[j]<=0){ idx=j; break; } }
      if(idx===-1) break;
      const pi=idx*3;
      dustPositions[pi]=pos.x+(Math.random()-0.5)*1.8;
      dustPositions[pi+1]=pos.y+Math.random()*0.5;
      dustPositions[pi+2]=pos.z+(Math.random()-0.5)*1.8;
      dustVel[pi]=(Math.random()-0.5)*4;
      dustVel[pi+1]=Math.random()*0.6;
      dustVel[pi+2]=(Math.random()-0.5)*4;
      dustLifetimes[idx]=0.9;
    }
    dustGeom.attributes.position.needsUpdate=true;
    dustGeom.attributes.aLifetime.needsUpdate=true;
  }

  function spawnExplosion(pos){
    playExplosionSfx();
    for(let i=0;i<18;i++){
      const mat = new THREE.MeshBasicMaterial({ color:new THREE.Color().setHSL(0.04+Math.random()*0.1,1,0.5) });
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.22,6,6), mat);
      p.position.copy(pos);
      p.userData = { velocity:new THREE.Vector3((Math.random()-0.5)*9, Math.random()*7, (Math.random()-0.5)*9), life:1.0, gravity:-18 };
      scene.add(p); particles.push(p);
    }
    cameraShake(0.22, 300);
  }

  // ========== CONTROLES ==========
  const keys={};
  let mouseX=0, mouseY=0, mouseActive=false;
  let lastDriftSound=0;

  window.addEventListener('keydown', e=>{
    keys[e.key.toLowerCase()]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if(e.key.toLowerCase()==='e' && gameState.hasWeapon && gameState.running) shootBullet();
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

  window.addEventListener('mousemove', e=>{
    if(gameState.running && !gameState.paused){
      mouseX=(e.clientX/window.innerWidth)*2-1;
      mouseY=(e.clientY/window.innerHeight)*2-1;
      mouseActive=true;
    }
  });

  window.addEventListener('click', ()=>{
    if(!gameState.running && !audioCtx) initAudio();
    if(gameState.hasWeapon && gameState.running && !gameState.paused) shootBullet();
  });

  // Touch controls (móvil)
  let touchStartX=0;
  window.addEventListener('touchstart', e=>{
    if(e.touches.length===1) touchStartX=e.touches[0].clientX;
  }, {passive:true});
  window.addEventListener('touchmove', e=>{
    if(gameState.running && !gameState.paused && e.touches.length===1){
      mouseX=(e.touches[0].clientX/window.innerWidth)*2-1;
      mouseActive=true;
      keys['w']=true; // siempre acelerar en móvil
    }
    e.preventDefault();
  }, {passive:false});
  window.addEventListener('touchend', ()=>{ keys['w']=false; mouseActive=false; });

  function shootBullet(){
    if(!car) return;
    playShootSfx();
    const bullet = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color:0xffff00, emissive:0xffff00, emissiveIntensity:1 });
    bullet.add(new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), mat));
    bullet.position.copy(car.position); bullet.position.y=1;
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(car.quaternion);
    bullet.userData = { velocity:dir.multiplyScalar(1.6), life:2.0 };
    scene.add(bullet); bullets.push(bullet);
  }

  // ========== FÍSICA DEL COCHE (mejorada con drifting real) ==========
  function updateCarPhysics(dt){
    if(!car || !carState.velocity || gameState.paused) return;

    const forward  = keys['w'] || keys['arrowup'];
    const backward = keys['s'] || keys['arrowdown'];
    const left     = keys['a'] || keys['arrowleft'];
    const right    = keys['d'] || keys['arrowright'];
    const brake    = keys[' '];
    const handbrake= keys['shift'];
    const nitro    = keys['n'] && carState.nitro>0;

    // --- Entrada de dirección ---
    let steerInput = 0;
    if(left)  steerInput += 1;
    if(right) steerInput -= 1;
    if(mouseActive && Math.abs(mouseX)>0.05) steerInput += mouseX * playerData.mouseSensitivity;
    steerInput = clamp(steerInput, -1, 1);

    // Suavizado de entrada de dirección para mayor estabilidad
    const steerSmoothing = 1 - Math.pow(0.001, dt * 60);
    carState.steerInput = lerp(carState.steerInput, steerInput, steerSmoothing);

    // Ángulo máximo de las ruedas (se reduce a alta velocidad para estabilidad)
    const speed = carState.velocity.length();
    const speedNorm = clamp(speed / CONFIG.MAX_SPEED, 0, 1);
    const maxSteer = Math.PI/6 * (1 - speedNorm*0.45); // se reduce hasta 55% a máx velocidad

    carState.targetWheelAngle = carState.steerInput * maxSteer;
    // Suavizar giro de ruedas
    carState.wheelAngle = lerp(carState.wheelAngle, carState.targetWheelAngle, dt*8);

    // --- Aceleración / frenado ---
    let accel = CONFIG.ACCELERATION;
    let maxSpeed = CONFIG.MAX_SPEED;

    if(nitro || gameState.hasTurbo){
      accel *= 2.0;
      maxSpeed *= 1.55;
      if(nitro) carState.nitro = Math.max(0, carState.nitro - dt*28);
    } else {
      const regenBoost = 1 + (playerData.upgrades.nitroRegen.level * playerData.upgrades.nitroRegen.bonus);
      carState.nitro = Math.min(carState.maxNitro, carState.nitro + dt*8*regenBoost);
    }

    // Vector de dirección del coche
    const carDir = new THREE.Vector3(0,0,-1).applyQuaternion(car.quaternion);

    if(forward){
      carState.velocity.addScaledVector(carDir, accel);
    }
    if(backward){
      carState.velocity.addScaledVector(carDir, -CONFIG.BRAKE_FORCE*0.7);
    }

    // --- Fricción diferencial: frontal vs lateral ---
    // Proyectar velocidad en ejes del coche
    const velDot = carState.velocity.dot(carDir); // componente frontal
    const velForward = carDir.clone().multiplyScalar(velDot);
    const velLateral = carState.velocity.clone().sub(velForward);
    const lateralSpeed = velLateral.length();

    // Calcular drift
    const isDrifting = handbrake || (lateralSpeed > 0.05 && speed > 0.08);
    carState.driftAmount = lerp(carState.driftAmount, isDrifting ? 1 : 0, dt*6);

    // Fricción lateral (más fricción = menos drift)
    let latFric = CONFIG.LATERAL_FRICTION;
    if(handbrake) latFric = 0.72;   // freno de mano: menos fricción lateral = drift
    else if(brake) latFric = 0.80;

    // Fricción frontal normal
    let frontFric = CONFIG.FRICTION;
    if(brake) frontFric = 0.92;
    if(handbrake) frontFric = 0.88;

    // Aplicar fricción separada
    const velFrontFriced = velForward.multiplyScalar(Math.pow(frontFric, dt*60));
    const velLatFriced   = velLateral.multiplyScalar(Math.pow(latFric, dt*60));

    // Tracción extra a alta velocidad para mantener control
    const tractionAssist = clamp(1 - speedNorm * 0.25, 0.72, 1);
    carState.velocity.copy(velFrontFriced).add(velLatFriced.multiplyScalar(tractionAssist));

    // Limitar velocidad máxima
    if(carState.velocity.length() > maxSpeed){
      carState.velocity.setLength(maxSpeed);
    }

    // --- Giro (yaw) basado en ángulo de ruedas y velocidad ---
    const turnRate = (carState.wheelAngle / (Math.PI/6)) * CONFIG.TURN_SPEED;
    if(speed > 0.015){
      // El giro es proporcional a la velocidad frontal
      const turnSign = velDot >= 0 ? 1 : -1;
      car.rotation.y += turnRate * turnSign * (speed / maxSpeed) * dt * 60;
    }

    // --- Desplazamiento ---
    car.position.addScaledVector(carState.velocity, dt*60);

    // --- Inclinación visual del coche ---
    // Roll en curvas (inclinación lateral)
    const targetRoll = -carState.steerInput * 0.18 * speedNorm;
    car.rotation.z = lerp(car.rotation.z, targetRoll, dt*7);

    // Pitch al acelerar/frenar
    let targetPitch = 0;
    if(forward && speed<maxSpeed*0.9)  targetPitch = 0.06;  // acelerar: parte trasera baja
    if(backward || brake) targetPitch = -0.04;              // frenar: parte delantera baja
    car.rotation.x = lerp(car.rotation.x, targetPitch, dt*5);

    // --- Suspensión visual (rebote en el eje Y) ---
    carState.suspensionPhase += dt*12;
    const bumpAmp = 0.012 * (1 + speed*2);  // más rebote a alta velocidad
    carState.suspensionY = Math.sin(carState.suspensionPhase)*bumpAmp;
    car.position.y = 0.75 + carState.suspensionY;

    // --- Rotación de ruedas ---
    car.traverse(child=>{
      if(child.userData.isWheel){
        // Rotación de avance
        child.rotation.x += speed * 0.15 * (velDot>=0?1:-1);
        // Giro de ruedas delanteras
        if(child.userData.isFront){
          child.rotation.y = carState.wheelAngle;
        }
      }
    });

    // --- Audio del motor ---
    if(audioCtx && audioNodes.engineOsc){
      const rpm = 300 + speedNorm*1800;
      audioNodes.engineOsc.frequency.setTargetAtTime(70+rpm*0.02, audioCtx.currentTime, 0.05);
    }

    // --- HUD velocidad ---
    speedEl.textContent = Math.round(speed*60)+' km/h';

    // --- Polvo por frenado / drift ---
    const now = performance.now();
    if(handbrake || (brake && speed>maxSpeed*0.2)){
      const carWorld = car.position.clone();
      spawnDust(carWorld, 7+Math.round(speed*8));
      // Sonido de drift
      if(now - lastDriftSound > 200){ playDriftSfx(); lastDriftSound=now; }
    }
    if(nitro || gameState.hasTurbo){
      spawnDust(car.position.clone(), 4);
    }

    // --- Límites laterales de la carretera ---
    const roadMargin = 1.2;
    const minX = -(CONFIG.ROAD_WIDTH/2)+roadMargin;
    const maxX =  (CONFIG.ROAD_WIDTH/2)-roadMargin;
    if(car.position.x < minX){ car.position.x=minX; carState.velocity.x*=-0.25; cameraShake(0.07,180); playCollisionSfx(); }
    if(car.position.x > maxX){ car.position.x=maxX; carState.velocity.x*=-0.25; cameraShake(0.07,180); playCollisionSfx(); }
  }

  // ========== ZOMBIES ==========
  function checkZombies(dt, speedMult=1){
    const carPos = car.position.clone();

    for(let i=zombies.length-1; i>=0; i--){
      const z = zombies[i];
      const zPos = z.position.clone();
      const dist = zPos.distanceTo(carPos);

      // Movimiento hacia el coche
      if(dist > 2){
        const dir = new THREE.Vector3().subVectors(carPos, zPos).normalize();
        const wobble = Math.sin((performance.now()+z.userData.wobble)/300)*0.22;
        z.position.x += (dir.x + wobble*0.025) * z.userData.speed * speedMult * dt * 42;
        z.position.z += dir.z * z.userData.speed * speedMult * dt * 42;
      }

      // Animación de caminar (brazos y cuerpo)
      const walkCycle = Math.sin((performance.now()+z.userData.wobble)/180);
      z.traverse(child=>{
        if(child.geometry?.type==='BoxGeometry'){
          // Rebote del cuerpo
          if(Math.abs(child.position.y - 0.6*z.userData.type.size)<0.05){
            child.position.y = 0.6*z.userData.type.size + Math.abs(walkCycle)*0.06;
          }
        }
      });
      // Brazos oscilan
      const arms = z.children.filter(c=>c.position.x!==0 && c.geometry?.type==='BoxGeometry' && c.position.y>0.5);
      if(arms.length>=2){
        arms[0].rotation.x = walkCycle*0.4;
        arms[1].rotation.x = -walkCycle*0.4;
      }

      // Rotar zombie hacia el coche
      z.rotation.y = Math.atan2(carPos.x-zPos.x, carPos.z-zPos.z);

      // Colisión con coche
      if(dist < CONFIG.COLLISION_DIST){
        const now=performance.now();
        if(!z.userData.hitCooldown || now-z.userData.hitCooldown>1000){
          z.userData.hitCooldown = now;
          if(!gameState.hasShield){
            const mode = MODES[gameState.mode] || MODES.classic;
            const dmg = z.userData.type.damage*(1-(playerData.upgrades.armor.level*0.1))*mode.damageMultiplier;
            gameState.hp -= dmg;
            gameState.combo=0; gameState.comboTimer=0;
            gameState.score = Math.max(0, gameState.score-6);
            playCollisionSfx();
            cameraShake(0.14, 250);
            inGameMessage(`-${Math.floor(dmg)} HP 💔`, 800);
            // Flash rojo pantalla
            showDamageFlash();
          } else {
            playPowerupSfx();
            inGameMessage('¡Escudo! 🛡️', 800);
          }
          z.position.z -= 5;
          if(z.userData.type.explosive){ spawnExplosion(zPos); killZombie(z,i); }
        }
      }

      // Zombie pasado por el coche (kill por detrás)
      if(z.position.z > car.position.z+14){
        killZombie(z,i);
      }
    }
  }

  function killZombie(zombie, index){
    gameState.combo++;
    gameState.comboTimer=0;
    if(gameState.combo>gameState.maxCombo) gameState.maxCombo=gameState.combo;

    if(gameState.combo>=5 && gameState.combo%5===0){
      inGameMessage(`🔥 ¡Combo x${gameState.combo}!`, 1200);
      playPowerupSfx();
    }

    addScore(zombie.userData.type.points * getComboMultiplier());
    addCoins(zombie.userData.type.coins);
    gameState.kills++;
    gameState.zombiesKilledThisWave++;

    // Partículas de muerte
    spawnDust(zombie.position.clone(), 10);

    scene.remove(zombie);
    zombies.splice(index,1);
  }

  function getComboMultiplier(){
    if(gameState.combo<5) return 1;
    if(gameState.combo<10) return 1.5;
    if(gameState.combo<20) return 2;
    return 3;
  }

  function addScore(pts){
    const mode = MODES[gameState.mode] || MODES.classic;
    gameState.score += pts * mode.scoreMultiplier;
  }
  function addCoins(coins){
    const mult=1+(playerData.upgrades.coinMultiplier.level*0.5);
    playerData.totalCoins+=Math.floor(coins*mult);
  }

  // ========== POWER-UPS ==========
  function checkPowerups(dt){
    const carPos = car.position.clone();
    for(let i=powerups.length-1; i>=0; i--){
      const p=powerups[i];
      const pPos=p.position.clone();
      const dist=pPos.distanceTo(carPos);

      if(gameState.hasMagnet && dist<gameState.magnetRange){
        const dir=new THREE.Vector3().subVectors(carPos,pPos).normalize();
        p.position.add(dir.multiplyScalar(dt*12));
      }

      p.rotation.y+=dt*4;
      p.children[0].position.y=1+Math.sin(performance.now()/250)*0.35;
      if(p.children[1]) p.children[1].position.y=p.children[0].position.y;

      if(dist<1.6){ activatePowerup(p.userData.type); scene.remove(p); powerups.splice(i,1); continue; }
      if(p.position.z>car.position.z+18){ scene.remove(p); powerups.splice(i,1); }
    }
  }

  function activatePowerup(type){
    playPowerupSfx();
    switch(type.effect){
      case 'heal':
        gameState.hp=Math.min(gameState.maxHp, gameState.hp+30);
        inGameMessage('¡+30 HP! ❤️', 1500); break;
      case 'shield':
        gameState.hasShield=true;
        gameState.powerups.set('shield', Date.now() + (type.duration + gameState.shieldDurationBonus * 1000) * gameState.powerupDurationMult);
        inGameMessage('¡Escudo activado! 🛡️', 1500); updatePowerupIcons(); break;
      case 'turbo':
        gameState.powerups.set('turbo', Date.now()+type.duration*gameState.powerupDurationMult);
        inGameMessage('¡Turbo activado! ⚡', 1500); updatePowerupIcons(); break;
      case 'magnet':
        gameState.hasMagnet=true;
        gameState.powerups.set('magnet', Date.now()+type.duration*gameState.powerupDurationMult);
        inGameMessage('¡Imán activado! 🧲', 1500); updatePowerupIcons(); break;
      case 'weapon':
        gameState.hasWeapon=true;
        gameState.powerups.set('weapon', Date.now() + (type.duration + gameState.weaponDurationBonus * 1000) * gameState.powerupDurationMult);
        inGameMessage('¡Arma activada! 🔫 (Click/E)', 2000); updatePowerupIcons(); break;
    }
  }

  function updatePowerups(dt){
    const now=Date.now();
    for(const [key,expiry] of gameState.powerups.entries()){
      if(now>expiry){
        gameState.powerups.delete(key);
        switch(key){
          case 'shield': gameState.hasShield=false; inGameMessage('Escudo desactivado',1000); break;
          case 'magnet': gameState.hasMagnet=false; inGameMessage('Imán desactivado',1000); break;
          case 'weapon': gameState.hasWeapon=false; inGameMessage('Arma desactivada',1000); break;
        }
        updatePowerupIcons();
      }
    }
  }

  function updatePowerupIcons(){
    if(!elements.powerupContainer) return;
    elements.powerupContainer.innerHTML='';
    for(const [key,expiry] of gameState.powerups.entries()){
      const rem=Math.ceil((expiry-Date.now())/1000);
      const icon=document.createElement('div'); icon.className='powerup-icon';
      const emojis={shield:'🛡️',turbo:'⚡',magnet:'🧲',weapon:'🔫'};
      icon.innerHTML=`${emojis[key]||''}<br><span style="font-size:10px">${rem}s</span>`;
      elements.powerupContainer.appendChild(icon);
    }
  }

  // ========== BALAS ==========
  function updateBullets(dt){
    for(let i=bullets.length-1; i>=0; i--){
      const b=bullets[i];
      b.position.add(b.userData.velocity.clone().multiplyScalar(dt*60));
      b.userData.life-=dt;
      if(b.userData.life<=0){ scene.remove(b); bullets.splice(i,1); continue; }

      for(let j=zombies.length-1; j>=0; j--){
        if(b.position.distanceTo(zombies[j].position)<1.6){
          zombies[j].userData.health--;
          if(zombies[j].userData.health<=0){ spawnExplosion(zombies[j].position.clone()); killZombie(zombies[j],j); }
          else playCollisionSfx();
          scene.remove(b); bullets.splice(i,1); break;
        }
      }
    }
  }

  // ========== PARTÍCULAS ==========
  function updateParticles(dt){
    for(let i=particles.length-1; i>=0; i--){
      const p=particles[i];
      p.userData.velocity.y+=p.userData.gravity*dt;
      p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
      p.userData.life-=dt;
      p.material.opacity=p.userData.life;
      if(p.userData.life<=0||p.position.y<-1){ scene.remove(p); particles.splice(i,1); }
    }
  }

  // ========== CÁMARA ==========
  let camShake={decay:0, intensity:0};
  function cameraShake(intensity,dur){ camShake.intensity=intensity; camShake.decay=dur; }

  // ========== FLASH DE DAÑO ==========
  function showDamageFlash(){
    const flash=document.createElement('div');
    flash.style.cssText='position:fixed;inset:0;background:radial-gradient(circle,transparent 25%,rgba(255,0,0,0.45));pointer-events:none;z-index:100;animation:flashDmg 0.3s ease-out forwards;';
    document.body.appendChild(flash);
    setTimeout(()=>flash.remove(),320);
  }
  // Inyectar animación CSS una vez
  if(!document.getElementById('_dmgFlashStyle')){
    const s=document.createElement('style'); s.id='_dmgFlashStyle';
    s.textContent='@keyframes flashDmg{0%{opacity:1}100%{opacity:0}}';
    document.head.appendChild(s);
  }

  // ========== RECICLAJE DEL MUNDO INFINITO ==========
  function recycleWorld(){
    if(!car) return;
    const carZ = car.position.z;
    const CL  = CONFIG.CHUNK_LENGTH;
    const totalLen = CL * CONFIG.NUM_CHUNKS;

    // Carretera
    worldChunks.forEach(chunk=>{
      if(chunk.position.z > carZ + CL*1.5){
        // Mover al frente
        chunk.position.z -= totalLen;
      }
    });
    // Entorno lateral
    envChunks.forEach(chunk=>{
      if(chunk.position.z > carZ + CL*1.5){
        chunk.position.z -= totalLen;
      }
    });
    // Suelo
    groundChunks.forEach(chunk=>{
      if(chunk.position.z > carZ + CL*1.5){
        chunk.position.z -= totalLen;
      }
    });
    // Montañas: parallax (se mueven con el coche pero más lento)
    mountainRing.forEach(m=>{
      if(m.position.z > carZ + 400){
        m.position.z -= 700;
      }
      if(m.position.z < carZ - 400){
        m.position.z += 700;
      }
    });
  }

  // ========== LOOP PRINCIPAL ==========
  function animate(now){
    requestAnimationFrame(animate);
    const dt = Math.min(0.055, (now-gameState.lastTime)/1000);
    gameState.lastTime = now;

    // Polvo
    for(let i=0;i<maxDust;i++){
      if(dustLifetimes[i]>0){
        dustLifetimes[i]-=dt;
        const pi=i*3;
        dustPositions[pi]+=dustVel[pi]*dt*6;
        dustPositions[pi+1]+=dustVel[pi+1]*dt*6;
        dustPositions[pi+2]+=dustVel[pi+2]*dt*6;
        if(dustLifetimes[i]<=0){ dustPositions[pi]=dustPositions[pi+1]=dustPositions[pi+2]=99999; dustVel[pi]=dustVel[pi+1]=dustVel[pi+2]=0; }
      }
    }
    dustGeom.attributes.position.needsUpdate=true;
    dustGeom.attributes.aLifetime.needsUpdate=true;

    if(gameState.running && !gameState.paused){
      // --- DIFICULTAD PROGRESIVA ---
      const wave=gameState.wave;
      let spawnDelay, maxZombies, zombieSpeedMult;

      if(wave===1){       spawnDelay=3000; maxZombies=3;  zombieSpeedMult=0.7; }
      else if(wave===2){  spawnDelay=2500; maxZombies=5;  zombieSpeedMult=0.8; }
      else if(wave===3){  spawnDelay=2000; maxZombies=7;  zombieSpeedMult=0.9; }
      else if(wave<=5){   spawnDelay=1600; maxZombies=8+(wave-3)*2; zombieSpeedMult=1.0; }
      else if(wave<=10){  spawnDelay=Math.max(800,1400-(wave-5)*100); maxZombies=12+(wave-5)*1.5; zombieSpeedMult=1.0+(wave-5)*0.08; }
      else {              spawnDelay=Math.max(500,800-(wave-10)*30);  maxZombies=Math.min(35,18+(wave-10)*1.2); zombieSpeedMult=1.4+(wave-10)*0.05; }

      const mode = MODES[gameState.mode] || MODES.classic;
      spawnDelay = spawnDelay / mode.spawnRate;

      if(now-gameState.lastSpawn>spawnDelay){
        if(zombies.length<maxZombies) spawnZombie();
        gameState.lastSpawn=now;
      }

      // Power-ups
      if(Math.random()<0.0009*mode.powerupRate && powerups.length<3) spawnPowerup();

      // Updates
      updateCarPhysics(dt);
      checkZombies(dt, zombieSpeedMult);
      checkPowerups(dt);
      updateBullets(dt);
      updateParticles(dt);
      updatePowerups(dt);

      // Puntos por sobrevivir
      gameState.score += 0.03 * carState.velocity.length() * dt * 100;

      // Combo timer
      if(gameState.combo>0){
        gameState.comboTimer+=dt;
        if(gameState.comboTimer>3){ gameState.combo=0; gameState.comboTimer=0; }
      }

      // Temporizador por modo
      if(mode.timeLimit){
        if(gameState.timeRemaining === null) gameState.timeRemaining = mode.timeLimit;
        gameState.timeRemaining -= dt;
        if(gameState.timeRemaining <= 0){
          gameState.timeRemaining = 0;
          gameState.running = false;
          showGameOver();
        }
      }

      // Oleadas
      if(gameState.zombiesKilledThisWave>=20){
        gameState.wave++;
        gameState.zombiesKilledThisWave=0;
        inGameMessage(`🌊 ¡Oleada ${gameState.wave}!`, 2000);
        playPowerupSfx();
      }

      if(gameState.hp<=0){ gameState.running=false; showGameOver(); }

      // Reciclar mundo infinito
      recycleWorld();
    }

    // Sol (se mueve suavemente)
    if(sunMesh && sun){
      const t=performance.now()*0.00012;
      sun.position.set(100*Math.cos(t), 80+10*Math.sin(t*0.7), 60+20*Math.sin(t*0.4));
      sunMesh.position.copy(sun.position);
    }

    // Nubes en movimiento lento
    if(clouds.length){
      clouds.forEach(cloud=>{
        cloud.position.x += cloud.userData.speed * dt * 4;
        if(cloud.position.x > 140) cloud.position.x = -140;
      });
    }

    // Cámara
    if(car){
      const speed = carState.velocity ? carState.velocity.length() : 0;
      // FOV dinámico: se abre a alta velocidad
      camera.fov = lerp(camera.fov, 65 + speed*35, dt*3);
      camera.updateProjectionMatrix();

      // Posición cámara: se aleja un poco a alta velocidad
      const camDist = 13 + speed*8;
      const desiredPos = car.position.clone().add(
        new THREE.Vector3(0, 7, camDist).applyQuaternion(car.quaternion)
      );
      camera.position.lerp(desiredPos, 0.1);

      const lookAt = car.position.clone().add(
        new THREE.Vector3(0, 1.5, -6).applyQuaternion(car.quaternion)
      );

      if(camShake.decay>0){
        const s=camShake.intensity*(camShake.decay/300);
        camera.position.x+=(Math.random()*2-1)*s;
        camera.position.y+=(Math.random()*2-1)*s;
        camShake.decay-=dt*1000;
      }
      camera.lookAt(lookAt);
      if(skyDome){
        skyDome.position.x = car.position.x;
        skyDome.position.z = car.position.z;
      }
    }

    // HUD
    scoreEl.textContent = Math.floor(gameState.score);
    hpEl.textContent    = Math.max(0, Math.floor(gameState.hp));
    if(elements.comboEl){
      if(gameState.combo>1){ elements.comboEl.textContent=`x${gameState.combo}`; elements.comboEl.style.display='block'; }
      else elements.comboEl.style.display='none';
    }
    if(elements.waveEl) elements.waveEl.textContent=`Oleada ${gameState.wave}`;
    if(elements.timeDisplay){
      const mode = MODES[gameState.mode] || MODES.classic;
      const displayTime = gameState.timeRemaining ?? mode.timeLimit;
      elements.timeDisplay.textContent = formatTime(displayTime);
    }
    if(elements.nitroBar) elements.nitroBar.style.width=(carState.nitro/carState.maxNitro*100)+'%';
    coinsEl.textContent = playerData.totalCoins + Math.floor(gameState.score/100);

    // Render
    try { if(composer) composer.render(dt); else renderer.render(scene,camera); }
    catch(e){ logErr(e); }
  }

  // ========== CONTROL DE JUEGO ==========
  function resetGame(){
    zombies.forEach(z=>scene.remove(z)); zombies.length=0;
    powerups.forEach(p=>scene.remove(p)); powerups.length=0;
    bullets.forEach(b=>scene.remove(b)); bullets.length=0;
    particles.forEach(p=>scene.remove(p)); particles.length=0;

    gameState.score=0; gameState.hp=gameState.maxHp;
    gameState.combo=0; gameState.comboTimer=0; gameState.maxCombo=0;
    gameState.kills=0; gameState.wave=1; gameState.zombiesKilledThisWave=0;
    gameState.lastSpawn=performance.now();
    gameState.powerups.clear();
    gameState.hasShield=false; gameState.hasTurbo=false; gameState.hasMagnet=false; gameState.hasWeapon=false;
    const mode = MODES[gameState.mode] || MODES.classic;
    gameState.timeRemaining = mode.timeLimit;

    carState.nitro=carState.maxNitro;
    if(!carState.velocity) carState.velocity=new THREE.Vector3();
    carState.velocity.set(0,0,0);
    carState.wheelAngle=0; carState.targetWheelAngle=0;
    carState.driftAmount=0; carState.suspensionPhase=0;

    car.position.set(0, 0.75, 15);
    car.rotation.set(0, 0, 0);

    for(let i=0;i<maxDust;i++){ dustPositions[i*3]=dustPositions[i*3+1]=dustPositions[i*3+2]=99999; dustLifetimes[i]=0; }
    dustGeom.attributes.position.needsUpdate=true;
    dustGeom.attributes.aLifetime.needsUpdate=true;

    elements.btnRestart.style.display='inline-block';
    scoreEl.textContent='0'; hpEl.textContent=gameState.maxHp; speedEl.textContent='0 km/h';
    if(elements.powerupContainer) elements.powerupContainer.innerHTML='';
  }

  function startGame(){
    if(!scene||!car){ alert('Error: Escena no inicializada. Recarga la página.'); return; }
    resetGame();
    gameState.running=true; gameState.paused=false;
    overlayMenu.style.display='none'; overlayShop.style.display='none'; overlayGameOver.style.display='none';
    if(!audioCtx) initAudio();
    updateAudioGains();
    updateModeUI();
    gameState.lastTime=performance.now();
    mouseActive=false;
    playerData.gamesPlayed++; savePlayerData();
  }

  function showGameOver(){
    const coinsGained=Math.floor(gameState.score/100);
    playerData.totalCoins+=coinsGained;
    playerData.totalKills+=gameState.kills;
    elements.goTitle.textContent = gameState.score>playerData.bestScore ? '🏆 ¡Nuevo Récord!' : 'Game Over';
    if(gameState.score>playerData.bestScore) playerData.bestScore=gameState.score;
    savePlayerData();
    elements.goScore.textContent=Math.floor(gameState.score);
    elements.goCoins.textContent=coinsGained;
    if(elements.goKills) elements.goKills.textContent=gameState.kills;
    if(elements.goMaxCombo) elements.goMaxCombo.textContent=`x${gameState.maxCombo}`;
    overlayGameOver.style.display='block';
    overlayMenu.style.display='none'; overlayShop.style.display='none';
    elements.btnRestart.style.display='none';
  }

  // ========== INTRO ==========
  (function showIntroPan(){
    const start=performance.now(), dur=1400;
    function pan(now){
      if(!camera){ requestAnimationFrame(pan); return; }
      const p=Math.min(1,(now-start)/dur);
      const ease=(1-Math.cos(p*Math.PI))/2;
      camera.position.set(ease*6, 8+ease, -20+ease*28);
      camera.lookAt(new THREE.Vector3(0,0,0));
      if(p<1) requestAnimationFrame(pan);
    }
    requestAnimationFrame(pan);
  })();

  // ========== INIT ==========
  try {
    initThree();
    gameState.lastTime=performance.now();
    animate(gameState.lastTime);
    inGameMessage('🎮 ¡Bienvenido! Usa WASD + Ratón. Shift = Drift', 4000);
    window.cvz={scene,car,zombies,powerups,startGame,resetGame,playerData,gameState};
    console.log('✅ Juego ULTRA inicializado con mundo infinito y física mejorada');
  } catch(e){
    console.error('❌ Error fatal:', e);
    alert('Error: '+e.message);
  }

})();

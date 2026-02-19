// 🎮 CAR VS ZOMBIES - VERSIÓN ULTRA MEJORADA 🎮
// Con física de drifting real, mundo infinito y mejoras de jugabilidad

(function() {
  'use strict';

  console.log('🚀 Iniciando Car vs Zombies ULTRA...');

  // ========== CONFIGURACIÓN ==========
  const CONFIG = {
    ROAD_WIDTH: 18,
    MAX_SPEED: 0.48,
    ACCELERATION: 0.018,
    BRAKE_FORCE: 0.03,
    FRICTION: 0.982,
    LATERAL_FRICTION: 0.92,       // fricción lateral (más alta = coche más estable)
    TURN_SPEED: 0.031,
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
    maxHealth:      { name:'Vida Máxima',           baseCost:300, level:0, maxLevel:5, bonus:20  },
    speed:          { name:'Velocidad',             baseCost:400, level:0, maxLevel:5, bonus:0.05},
    armor:          { name:'Armadura',              baseCost:500, level:0, maxLevel:5, bonus:0.1 },
    coinMultiplier: { name:'Multiplicador Monedas', baseCost:600, level:0, maxLevel:3, bonus:0.5 },
  };

  const STORAGE_KEY = 'carVsZombies_playerData';
  const ACHIEVEMENTS = [
    { id:'score_1000', label:'🔥 Rompe-Records', desc:'Alcanza 1000 puntos en una partida', check:(run)=>run.score>=1000 },
    { id:'kills_200', label:'🧟 Cazador', desc:'Acumula 200 kills totales', check:(_,data)=> (data.totalKills||0)>=200 },
    { id:'wave_8', label:'🌊 Superviviente', desc:'Llega a la oleada 8', check:(run)=>run.wave>=8 },
    { id:'games_20', label:'🎮 Veterano', desc:'Juega 20 partidas', check:(_,data)=> (data.gamesPlayed||0)>=20 },
  ];

  // ========== ESTADO DEL JUEGO ==========
  const gameState = {
    running:false, paused:false,
    score:0, hp:100, maxHp:100,
    lastSpawn:0, lastTime:0,
    combo:0, comboTimer:0, maxCombo:0,
    kills:0, wave:1, zombiesKilledThisWave:0,
    mission:null,
    powerups: new Map(),
    hasShield:false, hasTurbo:false, hasMagnet:false, hasWeapon:false,
    waveConfig:null,
    waveEvent:null,
    eventRollWave:0,
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
    driftAmount: 0,            // cantidad de drift activo (0-1)
    suspensionPhase: 0,        // fase de rebote de suspensión
    suspensionY: 0,            // desplazamiento vertical por suspensión
  };

  let playerData = {
    totalCoins:0, ownedColors:[0], currentColorIndex:0,
    bestScore:0, totalKills:0, gamesPlayed:0,
    leaderboard: [],
    leaderboardSort: 'score',
    achievements: [],
    nightLightBoost: 1.2,
    steeringMode: 'normal',
    dailyMission: null,
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
        if(!Array.isArray(playerData.leaderboard)) playerData.leaderboard = [];
        if(!Array.isArray(playerData.achievements)) playerData.achievements = [];
        if(!playerData.leaderboardSort) playerData.leaderboardSort = 'score';
        if(typeof playerData.nightLightBoost !== 'number') playerData.nightLightBoost = 1.2;
        if(!playerData.steeringMode) playerData.steeringMode = 'normal';
      }
      if(elements.steeringMode) elements.steeringMode.value = playerData.steeringMode || 'normal';
      ensureDailyMission();
      if(elements.nightLightBoost) {
        elements.nightLightBoost.value = playerData.nightLightBoost || 1.2;
        updateNightLightBoostDisplay();
      }
      applyUpgrades();
    } catch(e){ console.warn('Error cargando datos:', e); }
  }

  function savePlayerData(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData)); }
    catch(e){ console.warn('Error guardando datos:', e); }
  }

  function applyUpgrades(){
    const u = playerData.upgrades;
    gameState.maxHp = 100 + (u.maxHealth.level * u.maxHealth.bonus);
    CONFIG.MAX_SPEED = 0.48 + (u.speed.level * u.speed.bonus);
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
    missionEl:          document.getElementById('mission'),
    nitroBar:           document.getElementById('nitroBar'),
    volMaster:          document.getElementById('volMaster'),
    volEngine:          document.getElementById('volEngine'),
    volSfx:             document.getElementById('volSfx'),
    volMasterVal:       document.getElementById('volMasterVal'),
    volEngineVal:       document.getElementById('volEngineVal'),
    volSfxVal:          document.getElementById('volSfxVal'),
    steeringMode:       document.getElementById('steeringMode'),
    openTutorial:       document.getElementById('openTutorial'),
    overlayTutorial:    document.getElementById('overlayTutorial'),
    startTutorialRun:   document.getElementById('startTutorialRun'),
    nextTutorialStep:   document.getElementById('nextTutorialStep'),
    backFromTutorial:   document.getElementById('backFromTutorial'),
    tutorialStepTitle:  document.getElementById('tutorialStepTitle'),
    tutorialStepText:   document.getElementById('tutorialStepText'),
    dailyMissionText:   document.getElementById('dailyMissionText'),
    claimDailyMission:  document.getElementById('claimDailyMission'),
    nightLightBoost:    document.getElementById('nightLightBoost'),
    nightLightBoostVal: document.getElementById('nightLightBoostVal'),
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
    leaderboardContent:  document.getElementById('leaderboardContent'),
    leaderboardSummary:  document.getElementById('leaderboardSummary'),
    leaderboardAchievements: document.getElementById('leaderboardAchievements'),
    clearLeaderboard:    document.getElementById('clearLeaderboard'),
    sortByScore:        document.getElementById('sortByScore'),
    sortByKills:        document.getElementById('sortByKills'),
    sortByWave:         document.getElementById('sortByWave'),
  };

  const { overlayMenu, overlayShop, overlayGameOver,
          scoreEl, hpEl, speedEl, coinsEl,
          volMaster, volEngine, volSfx } = elements;

  function inGameMessage(text, ms=2000){
    if(!elements.inGameMsg) return;
    elements.inGameMsg.innerText = text;
    elements.inGameMsg.style.display = 'block';
    elements.inGameMsg.style.animation = 'none';
    setTimeout(()=>{ elements.inGameMsg.style.animation = 'slideInDown 0.3s ease'; },10);
    setTimeout(()=> elements.inGameMsg.style.display='none', ms);
  }

  // ✨ MENSAJES GRANDES Y ESPECTACULARES
  let bigMessageTimeout = null;
  let lastBigMessageCombo = 0;
  
  function showBigMessage(text, color = '#ff6600'){
    // Evitar spam de mensajes del mismo combo
    const currentCombo = gameState.combo;
    if(currentCombo === lastBigMessageCombo) return;
    lastBigMessageCombo = currentCombo;
    
    // Crear o actualizar el elemento de mensaje grande
    let bigMsg = document.getElementById('bigComboMessage');
    if(!bigMsg){
      bigMsg = document.createElement('div');
      bigMsg.id = 'bigComboMessage';
      bigMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        z-index: 100;
        font-size: 48px;
        font-weight: 900;
        text-align: center;
        color: white;
        text-shadow: 
          0 0 20px ${color},
          0 0 40px ${color},
          0 0 60px ${color},
          4px 4px 10px rgba(0,0,0,0.8);
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 3px;
      `;
      document.body.appendChild(bigMsg);
    }
    
    bigMsg.textContent = text;
    bigMsg.style.textShadow = `
      0 0 20px ${color},
      0 0 40px ${color},
      0 0 60px ${color},
      4px 4px 10px rgba(0,0,0,0.8)
    `;
    
    // Animación de entrada
    bigMsg.style.animation = 'none';
    setTimeout(() => {
      bigMsg.style.animation = 'bigMessagePop 1s ease-out forwards';
    }, 10);
    
    // Limpiar timeout anterior
    if(bigMessageTimeout) clearTimeout(bigMessageTimeout);
    
    // Ocultar después de 1.5s
    bigMessageTimeout = setTimeout(() => {
      bigMsg.style.animation = 'bigMessageFade 0.5s ease-out forwards';
      setTimeout(() => {
        bigMsg.style.transform = 'translate(-50%, -50%) scale(0)';
      }, 500);
    }, 1500);
    
    // Sonido especial para combo
    playPowerupSfx();
  }


  const TUTORIAL_STEPS = [
    { id:'drift', title:'Paso 1: Drift', text:'Pulsa Shift mientras giras para derrapar y controlar la curva.' },
    { id:'nitro', title:'Paso 2: Nitro', text:'Pulsa N para activar nitro y ganar velocidad en recta.' },
    { id:'weapon', title:'Paso 3: Arma', text:'Pulsa E o click para disparar y eliminar un zombie.' },
  ];
  const tutorialState = { enabled:false, step:0, completed:new Set() };

  function getTodayKey(){ return new Date().toISOString().slice(0,10); }
  function ensureDailyMission(){
    const today = getTodayKey();
    if(playerData.dailyMission && playerData.dailyMission.dayKey===today) return;
    const pool = [
      { type:'kill', target:18, reward:90, label:'Elimina 18 zombies' },
      { type:'coin', target:30, reward:110, label:'Recoge 30 monedas' },
      { type:'wave', target:3, reward:130, label:'Supera 3 oleadas' },
    ];
    const pick = pool[Math.floor(Math.random()*pool.length)];
    playerData.dailyMission = { dayKey:today, ...pick, progress:0, claimed:false };
    savePlayerData();
  }

  function updateDailyMissionUI(){
    if(!elements.dailyMissionText || !elements.claimDailyMission) return;
    ensureDailyMission();
    const m = playerData.dailyMission;
    const done = m.progress >= m.target;
    elements.dailyMissionText.textContent = `${m.label} — ${m.progress}/${m.target} · Recompensa: ${m.reward} monedas`;
    elements.claimDailyMission.disabled = !done || !!m.claimed;
    elements.claimDailyMission.textContent = m.claimed ? '✅ Reclamada' : 'Reclamar recompensa';
  }

  function updateDailyMissionProgress(type, amount=1){
    ensureDailyMission();
    const m = playerData.dailyMission;
    if(!m || m.claimed || m.type!==type) return;
    m.progress = Math.min(m.target, m.progress + amount);
    if(m.progress >= m.target) inGameMessage('📅 ¡Misión diaria completada! Reclama tu recompensa en menú.', 2200);
    savePlayerData();
    updateDailyMissionUI();
  }

  function claimDailyMission(){
    const m = playerData.dailyMission;
    if(!m || m.claimed || m.progress < m.target) return;
    m.claimed = true;
    playerData.totalCoins += m.reward;
    savePlayerData();
    updateDailyMissionUI();
    updateMenuStats();
    inGameMessage(`💰 Recompensa diaria: +${m.reward} monedas`, 2200);
  }

  function updateTutorialOverlay(){
    const step = TUTORIAL_STEPS[Math.min(tutorialState.step, TUTORIAL_STEPS.length-1)];
    if(elements.tutorialStepTitle) elements.tutorialStepTitle.textContent = step.title;
    if(elements.tutorialStepText) elements.tutorialStepText.textContent = step.text;
  }

  function markTutorialStep(id){
    if(!tutorialState.enabled) return;
    const expected = TUTORIAL_STEPS[tutorialState.step];
    if(!expected || expected.id!==id) return;
    tutorialState.completed.add(id);
    tutorialState.step++;
    if(tutorialState.step >= TUTORIAL_STEPS.length){
      tutorialState.enabled = false;
      playerData.totalCoins += 60;
      savePlayerData();
      inGameMessage('🎓 Tutorial completado: +60 monedas', 2400);
      return;
    }
    if(TUTORIAL_STEPS[tutorialState.step].id==='weapon') gameState.hasWeapon = true;
    updateTutorialOverlay();
    inGameMessage(`✅ ${expected.title} completado`, 1500);
  }

  // ========== CONTROL DE UI ==========
  function showBackgroundCanvas(){
    const bgCanvas = document.getElementById('bgCanvas');
    if(bgCanvas) bgCanvas.style.display='block';
  }

  function hideBackgroundCanvas(){
    const bgCanvas = document.getElementById('bgCanvas');
    if(bgCanvas) bgCanvas.style.display='none';
  }

  function showHUD(){
    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    const topRight = document.getElementById('topRight');
    const powerupContainer = document.getElementById('powerupContainer');
    if(hud) hud.style.display='block';
    if(minimap) minimap.style.display='block';
    if(topRight) topRight.style.display='flex';
    if(powerupContainer) powerupContainer.style.display='flex';
  }

  function hideHUD(){
    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    const topRight = document.getElementById('topRight');
    const powerupContainer = document.getElementById('powerupContainer');
    if(hud) hud.style.display='none';
    if(minimap) minimap.style.display='none';
    if(topRight) topRight.style.display='none';
    if(powerupContainer) powerupContainer.style.display='none';
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
  function playPowerupSfx(){
    playSound(520,0.18,'triangle',0.26);
    setTimeout(()=>playSound(780,0.16,'triangle',0.24),70);
    setTimeout(()=>playSound(1040,0.22,'sine',0.2),140);
  }
  function playExplosionSfx(){
    playSound(80,0.24,'sawtooth',0.34);
    setTimeout(()=>playSound(46,0.36,'square',0.3),70);
  }
  function playShootSfx(){
    playSound(220,0.03,'square',0.22);
    setTimeout(()=>playSound(140,0.05,'triangle',0.18),18);
  }
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

  function updateNightLightBoostDisplay(){ if(elements.nightLightBoostVal) elements.nightLightBoostVal.innerText=Math.round(elements.nightLightBoost.value*100)+'%'; }
  if(elements.steeringMode) elements.steeringMode.addEventListener('change', e=>{
    playerData.steeringMode = e.target.value;
    savePlayerData();
    inGameMessage(`🎮 Modo de giro: ${e.target.selectedOptions[0].textContent}`, 1400);
  });
  if(elements.nightLightBoost) elements.nightLightBoost.addEventListener('input', e=>{
    playerData.nightLightBoost=parseFloat(e.target.value);
    updateNightLightBoostDisplay();
    updateLampAtmosphere();
    savePlayerData();
  });

  // ========== EVENTOS UI ==========
  elements.btnSettings.addEventListener('click', ()=>{
    elements.settingsPanel.style.display = elements.settingsPanel.style.display==='block'?'none':'block';
  });
  elements.openSettings.addEventListener('click', ()=>{ elements.settingsPanel.style.display='block'; });
  elements.closeSettings.addEventListener('click', ()=>{ elements.settingsPanel.style.display='none'; });
  if(elements.claimDailyMission) elements.claimDailyMission.addEventListener('click', claimDailyMission);
  if(elements.openTutorial) elements.openTutorial.addEventListener('click', ()=>{ overlayMenu.style.display='none'; if(elements.overlayTutorial) elements.overlayTutorial.style.display='block'; updateTutorialOverlay(); });
  if(elements.backFromTutorial) elements.backFromTutorial.addEventListener('click', ()=>{ if(elements.overlayTutorial) elements.overlayTutorial.style.display='none'; overlayMenu.style.display='block'; updateMenuStats(); });
  if(elements.nextTutorialStep) elements.nextTutorialStep.addEventListener('click', ()=>{ tutorialState.step = (tutorialState.step + 1) % TUTORIAL_STEPS.length; updateTutorialOverlay(); });
  if(elements.startTutorialRun) elements.startTutorialRun.addEventListener('click', ()=>{
    tutorialState.enabled = true; tutorialState.step = 0; tutorialState.completed.clear();
    if(elements.overlayTutorial) elements.overlayTutorial.style.display='none';
    startGame();
    inGameMessage('📘 Tutorial activo: completa los 3 pasos', 2200);
  });

  elements.startBtn.addEventListener('click', ()=>{
    try { startGame(); } catch(e){ console.error('❌ Error:', e); alert('Error: '+e.message); }
  });
  elements.playAgain.addEventListener('click', startGame);
  elements.toMenu.addEventListener('click', ()=>{ overlayGameOver.style.display='none'; overlayMenu.style.display='block'; updateMenuStats(); showBackgroundCanvas(); hideHUD(); });

  elements.btnOpenMenu.addEventListener('click', ()=>{
    if(gameState.running){
      gameState.paused = !gameState.paused;
      overlayMenu.style.display = gameState.paused?'block':'none';
      if(gameState.paused){
        showBackgroundCanvas();
        hideHUD();
        updateMenuStats();
      } else {
        hideBackgroundCanvas();
        showHUD();
      }
    }
  });

  elements.btnRestart.addEventListener('click', ()=>{ resetGame(); gameState.running=true; gameState.paused=false; });

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
        card.innerHTML=`<div class="upgrade-name">${upgrade.name}</div><div class="upgrade-level">Nivel ${upgrade.level}/${upgrade.maxLevel}</div><div class="upgrade-price">${isMaxed?'✓ MÁXIMO':'💰 '+Math.floor(cost)}</div>`;
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

  function updateMenuStats(){
    const menuBestScore = document.getElementById('menuBestScore');
    const menuCoins = document.getElementById('menuCoins');
    const menuGames = document.getElementById('menuGames');
    if(menuBestScore) menuBestScore.textContent = playerData.bestScore || 0;
    if(menuCoins) menuCoins.textContent = playerData.totalCoins || 0;
    if(menuGames) menuGames.textContent = playerData.gamesPlayed || 0;
    updateDailyMissionUI();
  }


  function renderLeaderboard(){
    if(!elements.leaderboardContent) return;

    const sortKey = playerData.leaderboardSort || 'score';
    const records = (playerData.leaderboard || [])
      .slice()
      .sort((a,b)=> (b[sortKey]||0) - (a[sortKey]||0) || (b.score||0)-(a.score||0))
      .slice(0,10);

    if(elements.sortByScore) elements.sortByScore.classList.toggle('active', sortKey==='score');
    if(elements.sortByKills) elements.sortByKills.classList.toggle('active', sortKey==='kills');
    if(elements.sortByWave) elements.sortByWave.classList.toggle('active', sortKey==='wave');

    if(elements.leaderboardSummary){
      const totalGames = playerData.gamesPlayed || records.length;
      const avgScore = records.length ? Math.floor(records.reduce((acc,r)=>acc+(r.score||0),0)/records.length) : 0;
      const bestWave = records.length ? Math.max(...records.map(r=>r.wave||1)) : 1;
      elements.leaderboardSummary.innerHTML = `
        <div class="card"><div class="label">Partidas</div><div class="value">${totalGames}</div></div>
        <div class="card"><div class="label">Score promedio</div><div class="value">${avgScore}</div></div>
        <div class="card"><div class="label">Mejor oleada</div><div class="value">${bestWave}</div></div>
      `;
    }

    if(elements.leaderboardAchievements){
      elements.leaderboardAchievements.innerHTML = ACHIEVEMENTS.map(a=>{
        const unlocked = (playerData.achievements||[]).includes(a.id);
        return `<div class="leaderboard-achievement ${unlocked ? 'unlocked' : ''}">
          <strong>${a.label}</strong><br>
          <span>${a.desc}</span>
        </div>`;
      }).join('');
    }

    if(records.length===0){
      elements.leaderboardContent.innerHTML = '<div class="leaderboard-empty">Aún no hay partidas guardadas. ¡Juega una ronda!</div>';
      return;
    }

    elements.leaderboardContent.innerHTML = records.map((entry, idx)=>{
      const rankClass = idx===0 ? 'gold' : (idx===1 ? 'silver' : (idx===2 ? 'bronze' : ''));
      const date = entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '-';
      const crown = idx===0 ? ' 👑' : '';
      return `
        <article class="leaderboard-entry ${idx===0?'current-player':''}">
          <div class="rank ${rankClass}">#${idx+1}</div>
          <div class="player-info">
            <div class="score">${entry.score||0}${crown}</div>
            <div class="details">🧟 ${entry.kills||0} kills · 🌊 Oleada ${entry.wave||1} · 🔥 x${entry.maxCombo||1}</div>
          </div>
          <div class="date">${date}</div>
        </article>
      `;
    }).join('');
  }

  function checkAchievements(run){
    const unlocked = [];
    const owned = new Set(playerData.achievements || []);
    ACHIEVEMENTS.forEach(ach=>{
      if(!owned.has(ach.id) && ach.check(run, playerData)){
        owned.add(ach.id);
        unlocked.push(ach.label);
      }
    });
    playerData.achievements = Array.from(owned);
    if(unlocked.length) inGameMessage(`🏅 Logro desbloqueado: ${unlocked[0]}`, 2200);
  }

  function saveRunToLeaderboard(){
    const record = {
      score: Math.floor(gameState.score),
      kills: gameState.kills,
      wave: gameState.wave,
      maxCombo: gameState.maxCombo,
      coins: Math.floor(gameState.score/100),
      date: Date.now()
    };

    playerData.leaderboard = Array.isArray(playerData.leaderboard) ? playerData.leaderboard : [];
    playerData.leaderboard.push(record);
    playerData.leaderboard.sort((a,b)=> (b.score||0) - (a.score||0));
    playerData.leaderboard = playerData.leaderboard.slice(0,50);
    checkAchievements(record);
  }


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
  elements.backFromShop.addEventListener('click', ()=>{ overlayShop.style.display='none'; overlayMenu.style.display='block'; updateMenuStats(); showBackgroundCanvas(); hideHUD(); });

  // Información de zombies
  elements.openZombieInfo = document.getElementById('openZombieInfo');
  elements.overlayZombieInfo = document.getElementById('overlayZombieInfo');
  elements.backFromZombieInfo = document.getElementById('backFromZombieInfo');
  if(elements.openZombieInfo) elements.openZombieInfo.addEventListener('click', ()=>{ overlayMenu.style.display='none'; elements.overlayZombieInfo.style.display='block'; });
  if(elements.backFromZombieInfo) elements.backFromZombieInfo.addEventListener('click', ()=>{ elements.overlayZombieInfo.style.display='none'; overlayMenu.style.display='block'; updateMenuStats(); showBackgroundCanvas(); hideHUD(); });

  // Leaderboard
  elements.openLeaderboard = document.getElementById('openLeaderboard');
  elements.overlayLeaderboard = document.getElementById('overlayLeaderboard');
  elements.backFromLeaderboard = document.getElementById('backFromLeaderboard');
  if(elements.openLeaderboard) elements.openLeaderboard.addEventListener('click', ()=>{
    overlayMenu.style.display='none';
    elements.overlayLeaderboard.style.display='block';
    renderLeaderboard();
  });
  if(elements.backFromLeaderboard) elements.backFromLeaderboard.addEventListener('click', ()=>{ elements.overlayLeaderboard.style.display='none'; overlayMenu.style.display='block'; updateMenuStats(); showBackgroundCanvas(); hideHUD(); });
  if(elements.clearLeaderboard) elements.clearLeaderboard.addEventListener('click', ()=>{
    playerData.leaderboard = [];
    savePlayerData();
    renderLeaderboard();
    inGameMessage('🧹 Récords limpiados', 1200);
  });
  if(elements.sortByScore) elements.sortByScore.addEventListener('click', ()=>{ playerData.leaderboardSort='score'; savePlayerData(); renderLeaderboard(); });
  if(elements.sortByKills) elements.sortByKills.addEventListener('click', ()=>{ playerData.leaderboardSort='kills'; savePlayerData(); renderLeaderboard(); });
  if(elements.sortByWave) elements.sortByWave.addEventListener('click', ()=>{ playerData.leaderboardSort='wave'; savePlayerData(); renderLeaderboard(); });

  loadPlayerData();
  updateMenuStats();

  // ========== THREE.JS GLOBALS ==========
  let renderer, scene, camera, composer;
  let car, sun, sunMesh;
  let zombies=[], powerups=[], bullets=[], particles=[], decorations=[];
  let coins=[]; // 💰 Array de monedas coleccionables
  
  // ✨ Sistema de atmósferas dinámicas
  let currentAtmosphere = 'day';
  const ATMOSPHERES = {
    day:     { name:'Día Soleado',    sky:0x87ceeb, fog:0x87ceeb, fogDensity:0.006, sunColor:0xffe8cc, sunIntensity:2.0, ambient:0x606878 },
    sunset:  { name:'Atardecer',      sky:0xff6b35, fog:0xff8c69, fogDensity:0.008, sunColor:0xff6600, sunIntensity:1.8, ambient:0x8b5a3c },
    night:   { name:'Noche Estrellada',sky:0x0a0e27, fog:0x1a1e37, fogDensity:0.012, sunColor:0x8899ff, sunIntensity:0.5, ambient:0x2a2a4a },
    fog:     { name:'Niebla Densa',   sky:0x9999aa, fog:0xaaaaaa, fogDensity:0.025, sunColor:0xcccccc, sunIntensity:0.8, ambient:0x6a6a7a },
    swamp:   { name:'Pantano Tóxico', sky:0x3a4a2a, fog:0x5a6a3a, fogDensity:0.018, sunColor:0x88aa55, sunIntensity:1.2, ambient:0x3a4a2a },
    galaxy:  { name:'Galaxia Cósmica',sky:0x1a0a3a, fog:0x2a1a4a, fogDensity:0.008, sunColor:0xaa66ff, sunIntensity:1.5, ambient:0x4a3a6a },
    storm:   { name:'Tormenta',       sky:0x2a2a3a, fog:0x3a3a4a, fogDensity:0.020, sunColor:0x6677aa, sunIntensity:0.6, ambient:0x3a3a4a },
    dawn:    { name:'Amanecer',       sky:0xffb366, fog:0xffcc99, fogDensity:0.010, sunColor:0xffaa66, sunIntensity:1.6, ambient:0xaa7755 },
  };

  // Mundo infinito: arrays de chunks
 // ✅ CORREGIDO:
 let worldChunks = [];
 let envChunks  = [];
 let groundChunks = [];
 // Montañas eliminadas (no son necesarias)

  // Ruedas delanteras (referencia para girarlas)
  let frontWheels = [];

  // ✅ Mini-mapa
  let minimapCanvas = null;
  let minimapCtx = null;
  let minimapAccumulator = 0;
  
  // ✨ Referencias de iluminación para atmósferas dinámicas
  let ambientLight = null;
  let hemiLight = null;
  let lampLights = [];
  let moonMesh = null;
  let starField = null;

  // ========== INIT THREE ==========
  function initThree(){
    try {
      console.log('🎨 Inicializando THREE.js...');
      if(typeof THREE === 'undefined') throw new Error('THREE.js no cargado');

      carState.velocity = new THREE.Vector3();

      renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:'high-performance' });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      elements.container.insertBefore(renderer.domElement, elements.container.firstChild);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.006);

      camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 600);
      camera.position.set(0,8,20);

      // ILUMINACIÓN
      ambientLight = new THREE.AmbientLight(0x606878, 0.7);
      scene.add(ambientLight);

      sun = new THREE.DirectionalLight(0xffe8cc, 2.0);
      sun.position.set(100, 80, 60);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
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

      hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.5);
      scene.add(hemiLight);

      // Post-processing
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.35, 0.9));
      } catch(e){ console.warn('⚠️ Post-processing no disponible'); }

      // CONSTRUIR MUNDO
      buildInfiniteWorld();
      createSkyDecorations();
      createCar();
      initDustSystem();
      initMinimap(); // ✅ Inicializar mini-mapa

      window.addEventListener('resize', onWindowResize, false);
      console.log('✅ THREE.js inicializado – Mundo infinito activo + Mini-mapa');
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
  let matRoad, matSide, matLine, matGround, matTree, matTrunk, matLampPost, matLampLight, matBuilding, matRock, matBillboard;

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
    // Rocas / carteles
    matRock = new THREE.MeshStandardMaterial({ color:0x4a4d52, roughness:0.95, metalness:0.05 });
    matBillboard = new THREE.MeshStandardMaterial({ color:0x1f2730, roughness:0.75, metalness:0.2 });
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

    // ❌ MONTAÑAS ELIMINADAS - Mejora visual sin pirámides

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

    // --- Carteles luminosos de carretera ---
    sides.forEach(side=>{
      for(let z=-L/2+20; z<L/2; z+=85){
        const billboard = createBillboard();
        billboard.position.set(side*(halfW+11), 0, z + (Math.random()-0.5)*8);
        billboard.rotation.y = side < 0 ? Math.PI * 0.18 : -Math.PI * 0.18;
        g.add(billboard);
      }
    });

    // --- Rocas para enriquecer el fondo ---
    for(let i=0; i<18; i++){
      const rock = createRock();
      const side = Math.random()<0.5 ? -1 : 1;
      const offset = halfW + 7 + Math.random()*20;
      rock.position.set(side*offset, 0, -L/2 + Math.random()*L);
      g.add(rock);
    }

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
    const light = new THREE.PointLight(0xffeeaa, 0.55, 24);
    light.position.set(1.1, 4.9, 0);
    light.userData.baseIntensity = 0.55;
    light.userData.baseDistance = 24;
    lampLights.push(light);
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

  function createRock(){
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8 + Math.random()*1.1, 0),
      matRock.clone()
    );
    rock.material.color.offsetHSL(0, 0, (Math.random()-0.5)*0.08);
    rock.position.y = 0.4;
    rock.scale.set(1 + Math.random()*1.5, 0.7 + Math.random()*0.9, 1 + Math.random()*1.3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  function createBillboard(){
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.8, 6), matLampPost);
    pole.position.y = 2.4;
    pole.castShadow = true;
    g.add(pole);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.1, 0.2), matBillboard.clone());
    panel.position.y = 4.4;
    panel.material.color.setHSL(0.58 + Math.random()*0.08, 0.25, 0.22 + Math.random()*0.12);
    panel.castShadow = true;
    g.add(panel);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 1.5),
      new THREE.MeshBasicMaterial({ color:0x66ccff, transparent:true, opacity:0.45, side:THREE.DoubleSide })
    );
    glow.position.set(0, 4.4, 0.12);
    g.add(glow);

    const textBars = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.25),
      new THREE.MeshBasicMaterial({ color:0xe6f7ff, transparent:true, opacity:0.8 })
    );
    textBars.position.set(0, 4.4, 0.13);
    g.add(textBars);

    return g;
  }

  // --- Montaña (horizonte) ---
  // ❌ FUNCIÓN createMountain ELIMINADA - Ya no hay pirámides/montañas

  function createSkyDecorations(){
    // Luna
    const moonGeom = new THREE.SphereGeometry(5, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color:0xdde4ff, transparent:true, opacity:0.85, fog:false });
    moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.position.set(-85, 55, -140);
    moonMesh.visible = false;
    scene.add(moonMesh);

    // Campo de estrellas
    const starCount = 420;
    const starPositions = new Float32Array(starCount * 3);
    for(let i=0; i<starCount; i++){
      const i3 = i*3;
      starPositions[i3] = (Math.random() - 0.5) * 360;
      starPositions[i3+1] = 25 + Math.random() * 120;
      starPositions[i3+2] = -220 + Math.random() * 300;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color:0xe9ecff, size:0.95, transparent:true, opacity:0.0, fog:false });
    starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);
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
    
    // ✨ AURA DE POWER-UP - Mejora visual espectacular
    createCarAura();
  }

  // ========== AURA VISUAL DEL COCHE ==========
  let carAura = null;
  
  function createCarAura(){
    if(carAura) return;
    
    // Crear un anillo brillante alrededor del coche
    const auraGeometry = new THREE.TorusGeometry(2.2, 0.15, 16, 32);
    const auraMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0,
      side: THREE.DoubleSide
    });
    
    carAura = new THREE.Mesh(auraGeometry, auraMaterial);
    carAura.rotation.x = Math.PI / 2;
    carAura.position.y = 0.3;
    carAura.visible = false;
    car.add(carAura);
  }
  
  function updateCarAura(){
    if(!carAura || !car) return;
    
    // Determinar color del aura según power-ups activos
    let auraColor = null;
    let auraIntensity = 0;
    
    if(gameState.hasShield){
      auraColor = 0x00ffff; // Cyan para escudo
      auraIntensity = 0.6;
    } else if(gameState.hasTurbo){
      auraColor = 0xff6600; // Naranja para turbo
      auraIntensity = 0.8;
    } else if(gameState.hasWeapon){
      auraColor = 0xff0000; // Rojo para arma
      auraIntensity = 0.7;
    } else if(gameState.hasMagnet){
      auraColor = 0xffdd00; // Amarillo para imán
      auraIntensity = 0.6;
    }
    
    if(auraColor !== null){
      carAura.visible = true;
      carAura.material.color.setHex(auraColor);
      
      // Animación pulsante
      const pulse = Math.sin(performance.now() * 0.008) * 0.3 + 0.7;
      carAura.material.opacity = auraIntensity * pulse;
      
      // Rotación constante
      carAura.rotation.z += 0.02;
      
      // Escala pulsante
      const scale = 1 + Math.sin(performance.now() * 0.006) * 0.1;
      carAura.scale.set(scale, scale, 1);
      
      // Efecto de brillo en el coche
      car.traverse(child => {
        if(child.isMesh && child.userData.isCarBody){
          child.material.emissiveIntensity = 0.3 + pulse * 0.2;
        }
      });
    } else {
      carAura.visible = false;
      // Restaurar brillo normal del coche
      car.traverse(child => {
        if(child.isMesh && child.userData.isCarBody){
          child.material.emissiveIntensity = 0.12;
        }
      });
    }
  }


  function getWaveConfig(wave){
    if(wave<=2) return { spawnDelay:2600, maxZombies:4+wave, zombieSpeedMult:0.78+wave*0.08, killTarget:16, coinChance:0.0035, weights:{normal:0.66, fast:0.2, tank:0.1, explosive:0.04} };
    if(wave<=5) return { spawnDelay:1800, maxZombies:8+wave, zombieSpeedMult:0.95+wave*0.04, killTarget:20, coinChance:0.004, weights:{normal:0.5, fast:0.28, tank:0.14, explosive:0.08} };
    if(wave<=10) return { spawnDelay:Math.max(900, 1500-wave*55), maxZombies:12+Math.floor(wave*1.4), zombieSpeedMult:1.08+(wave-5)*0.07, killTarget:24, coinChance:0.0045, weights:{normal:0.42, fast:0.3, tank:0.18, explosive:0.1} };
    return { spawnDelay:Math.max(550, 1000-wave*20), maxZombies:Math.min(36, 20+Math.floor(wave*1.5)), zombieSpeedMult:1.45+(wave-10)*0.05, killTarget:28, coinChance:0.0048, weights:{normal:0.35, fast:0.32, tank:0.2, explosive:0.13} };
  }

  function maybeStartWaveEvent(){
    if(gameState.wave < 3 || gameState.waveEvent) return;
    if(gameState.eventRollWave === gameState.wave) return;
    gameState.eventRollWave = gameState.wave;
    if(Math.random() > 0.45) return;
    const roll = Math.random();
    if(roll < 0.34){
      gameState.waveEvent = { type:'fast_horde', title:'⚡ Evento: Horda rápida', until: gameState.zombiesKilledThisWave + 10 };
    } else if(roll < 0.67){
      gameState.waveEvent = { type:'tank_assault', title:'🛡️ Evento: Asalto tanque', until: gameState.zombiesKilledThisWave + 8 };
    } else {
      gameState.waveEvent = { type:'coin_rush', title:'💰 Evento: Lluvia de monedas', until: gameState.zombiesKilledThisWave + 12 };
    }
    inGameMessage(gameState.waveEvent.title, 2000);
  }

  // ========== SPAWN ZOMBIES / POWERUPS ==========
  function spawnZombie(weights){
    const w = weights || {normal:0.5, fast:0.25, tank:0.15, explosive:0.1};
    const rand = Math.random();
    let type;
    if(rand<w.normal) type=ZOMBIE_TYPES.NORMAL;
    else if(rand<w.normal + w.fast) type=ZOMBIE_TYPES.FAST;
    else if(rand<w.normal + w.fast + w.tank) type=ZOMBIE_TYPES.TANK;
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

    const baseMat = new THREE.MeshStandardMaterial({
      color:type.color,
      emissive:type.color,
      emissiveIntensity:0.55,
      roughness:0.25,
      metalness:0.75
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), baseMat);
    core.position.y = 1;
    core.castShadow = true;
    powerup.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.06, 10, 24),
      new THREE.MeshBasicMaterial({ color:type.color, transparent:true, opacity:0.7 })
    );
    ring.position.y = 1;
    ring.rotation.x = Math.PI / 2;
    powerup.add(ring);

    // Formas distintivas para TURBO y ARMA
    if(type.effect === 'turbo'){
      const bolt = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.8, 4),
        new THREE.MeshStandardMaterial({ color:0xffdd55, emissive:0xffaa00, emissiveIntensity:0.85 })
      );
      bolt.position.set(0, 1.42, 0);
      bolt.rotation.z = Math.PI * 0.12;
      powerup.add(bolt);
    } else if(type.effect === 'weapon'){
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.95, 10),
        new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xff4444, emissiveIntensity:0.55 })
      );
      barrel.position.set(0, 1.2, 0);
      barrel.rotation.z = Math.PI / 2;
      powerup.add(barrel);
    }

    powerup.position.set((Math.random()-0.5)*(CONFIG.ROAD_WIDTH-4), 0, car.position.z-35-Math.random()*20);
    powerup.userData = { type, pulseOffset: Math.random() * 1000 };
    scene.add(powerup);
    powerups.push(powerup);
  }

  // 💰 ========== SPAWN MONEDAS ==========
  function spawnCoin(){
    const coin = new THREE.Group();
    
    // Crear moneda dorada brillante
    const coinGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16);
    const coinMat = new THREE.MeshStandardMaterial({ 
      color: 0xffdd00, 
      emissive: 0xffdd00, 
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const coinMesh = new THREE.Mesh(coinGeom, coinMat);
    coinMesh.rotation.x = Math.PI / 2; // Rotarla para que esté horizontal
    coinMesh.position.y = 1;
    coinMesh.castShadow = true;
    coin.add(coinMesh);
    
    // Añadir un brillo adicional
    const glowGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      transparent: true, 
      opacity: 0.4 
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 1;
    coin.add(glow);
    
    // Posición en la carretera
    coin.position.set(
      (Math.random()-0.5)*(CONFIG.ROAD_WIDTH-3), 
      0, 
      car.position.z - 30 - Math.random()*40
    );
    
    coin.userData = { 
      rotationSpeed: 0.05 + Math.random() * 0.03,
      bobSpeed: 2 + Math.random(),
      bobAmount: 0.3,
      value: 1
    };
    
    scene.add(coin);
    coins.push(coin);
  }

  function updateLampAtmosphere(){
    const isNight = currentAtmosphere === 'night' || currentAtmosphere === 'storm' || currentAtmosphere === 'galaxy';
    const isFog = currentAtmosphere === 'fog';

    lampLights = lampLights.filter(l => l && l.parent);
    lampLights.forEach(light => {
      const userBoost = clamp(playerData.nightLightBoost || 1.2, 0.8, 2);
      const boost = (isNight ? 3.4 : (isFog ? 1.8 : 0.7)) * userBoost;
      light.intensity = (light.userData.baseIntensity || 0.55) * boost;
      light.distance = (light.userData.baseDistance || 24) * (isNight ? 1.6 : 1.0);
      light.color.setHex(isNight ? 0xfff2c2 : 0xffeeaa);
    });
  }

  function updateSkyForAtmosphere(){
    if(moonMesh){
      moonMesh.visible = currentAtmosphere === 'night' || currentAtmosphere === 'galaxy';
    }
    if(starField){
      const twinkle = currentAtmosphere === 'night' ? 0.92 : (currentAtmosphere === 'galaxy' ? 0.98 : 0.05);
      starField.material.opacity = twinkle;
    }
  }

  // ✨ ========== CAMBIO DE ATMÓSFERA ==========
  function changeAtmosphere(atmosphereKey){
    if(!ATMOSPHERES[atmosphereKey]) return;
    
    const atm = ATMOSPHERES[atmosphereKey];
    currentAtmosphere = atmosphereKey;
    
    // Cambiar colores del cielo y niebla con transición suave
    scene.background = new THREE.Color(atm.sky);
    scene.fog = new THREE.FogExp2(atm.fog, atm.fogDensity);
    
    // Actualizar iluminación
    if(sun){
      sun.color.setHex(atm.sunColor);
      sun.intensity = atm.sunIntensity;
    }
    
    if(sunMesh){
      sunMesh.material.color.setHex(atm.sunColor);
    }
    
    if(ambientLight){
      ambientLight.color.setHex(atm.ambient);
    }
    
    if(hemiLight){
      hemiLight.color.setHex(atm.sky);
    }

    updateLampAtmosphere();
    updateSkyForAtmosphere();
    
    // Mensaje visual
    inGameMessage(`🌍 ${atm.name}`, 2500);
    
    console.log(`✨ Atmósfera cambiada a: ${atm.name}`);
  }
  
  // Obtener atmósfera según oleada
  function getAtmosphereForWave(wave){
    const atmospheres = Object.keys(ATMOSPHERES);
    const index = Math.min(wave - 1, atmospheres.length - 1);
    return atmospheres[index];
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

 // ✅ CORREGIDO - Opción A:
  // ========== MINI-MAPA FUNCIONAL ==========
  function initMinimap(){
    minimapCanvas = document.getElementById('minimap');
    if(minimapCanvas){
      minimapCtx = minimapCanvas.getContext('2d');
      console.log('✅ Mini-mapa inicializado (inferior izquierda)');
    }
  }

  function drawMinimap(){
    if(!minimapCtx || !car) return;

    const ctx = minimapCtx;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const scale = 2.0;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gradient.addColorStop(0, 'rgba(20, 30, 45, 0.98)');
    gradient.addColorStop(1, 'rgba(10, 14, 20, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(29, 185, 84, 0.15)';
    ctx.lineWidth = 1;
    for(let i=0; i<=w; i+=20){
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(58, 58, 58, 0.7)';
    ctx.fillRect(w/2 - 18, 0, 36, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2 - 18, 0);
    ctx.lineTo(w/2 - 18, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w/2 + 18, 0);
    ctx.lineTo(w/2 + 18, h);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w/2, 0);
    ctx.lineTo(w/2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    zombies.forEach(z => {
      const dx = (z.position.x - car.position.x) * scale;
      const dz = (z.position.z - car.position.z) * scale;

      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;

        let color = '#ff0000';
        if(z.userData.type.name === 'Rápido') color = '#ff6600';
        if(z.userData.type.name === 'Tanque') color = '#8b0000';
        if(z.userData.type.name === 'Explosivo') color = '#ffff00';

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    powerups.forEach(p => {
      const dx = (p.position.x - car.position.x) * scale;
      const dz = (p.position.z - car.position.z) * scale;

      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;

        ctx.fillStyle = '#' + p.userData.type.color.toString(16).padStart(6, '0');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 💰 Monedas en el minimapa
    coins.forEach(c => {
      const dx = (c.position.x - car.position.x) * scale;
      const dz = (c.position.z - car.position.z) * scale;

      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;

        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    bullets.forEach(b => {
      const dx = (b.position.x - car.position.x) * scale;
      const dz = (b.position.z - car.position.z) * scale;

      if(Math.abs(dx) < w/2 && Math.abs(dz) < h/2){
        const x = w/2 + dx;
        const y = h/2 + dz;

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#1db954';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#1db954';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(w/2, h/2 - 10);
    ctx.lineTo(w/2 - 7, h/2 + 8);
    ctx.lineTo(w/2 + 7, h/2 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(29, 185, 84, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w/2, h/2);
    ctx.lineTo(w/2, h/2 - 18);
    ctx.stroke();

    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    ctx.fillStyle = '#1db954';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAPA', w/2, 14);
  }

  
  function assignMission(){
    const missionType = Math.random() < 0.55 ? 'kill' : 'coin';
    if(missionType === 'kill'){
      gameState.mission = {
        type:'kill',
        target: 10 + Math.floor(gameState.wave * 1.5),
        progress:0,
        rewardCoins: 10 + gameState.wave * 3,
        rewardNitro: 25,
        completed:false
      };
    } else {
      gameState.mission = {
        type:'coin',
        target: 8 + Math.floor(gameState.wave * 1.2),
        progress:0,
        rewardCoins: 14 + gameState.wave * 3,
        rewardNitro: 30,
        completed:false
      };
    }
    updateMissionHud();
    inGameMessage(`🎯 Nueva misión: ${getMissionText()}`, 1800);
  }

  function getMissionText(){
    if(!gameState.mission) return '-';
    const m = gameState.mission;
    const label = m.type === 'kill' ? 'Elimina' : 'Recoge';
    const unit = m.type === 'kill' ? 'zombies' : 'monedas';
    const status = `${label} ${m.progress}/${m.target} ${unit}`;
    if(m.completed) return `✅ ${status}`;
    return status;
  }

  function updateMissionHud(){
    if(elements.missionEl) elements.missionEl.textContent = getMissionText();
  }

  function playMissionSfx(){
    playSound(740,0.16,'triangle',0.24);
    setTimeout(()=>playSound(980,0.16,'triangle',0.22),90);
    setTimeout(()=>playSound(1240,0.2,'sine',0.2),200);
  }

  function updateMissionProgress(type, amount=1){
    const m = gameState.mission;
    if(!m || m.completed || m.type!==type) return;

    m.progress = Math.min(m.target, m.progress + amount);
    if(m.progress >= m.target){
      m.completed = true;
      playerData.totalCoins += m.rewardCoins;
      carState.nitro = Math.min(carState.maxNitro, carState.nitro + m.rewardNitro);
      playMissionSfx();
      inGameMessage(`🏁 Misión completada: +${m.rewardCoins} monedas`, 2200);
    }

    updateMissionHud();
    updateDailyMissionProgress(type, amount);
  }

  // ========== CONTROLES ==========
  const keys={};
  let mouseX=0, mouseY=0, mouseActive=false;
  let lastDriftSound=0;
  let lastShotTime=0;
  const WEAPON_COOLDOWN_MS = 140;

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
    if(!car || !gameState.hasWeapon) return;

    const now = performance.now();
    if(now - lastShotTime < WEAPON_COOLDOWN_MS) return;
    lastShotTime = now;

    playShootSfx();
    markTutorialStep('weapon');

    const bullet = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({ color:0xfff08a, emissive:0xffdd55, emissiveIntensity:1.2 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), coreMat);
    bullet.add(core);

    const glowMat = new THREE.MeshBasicMaterial({ color:0xff6600, transparent:true, opacity:0.65 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 8), glowMat);
    bullet.add(glow);

    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(car.quaternion).normalize();
    const muzzleOffset = dir.clone().multiplyScalar(2.1);
    bullet.position.copy(car.position).add(muzzleOffset);
    bullet.position.y = 1.05;

    bullet.userData = {
      velocity: dir.multiplyScalar(2.45),
      life: 1.6,
      trailTimer: 0
    };

    scene.add(bullet);
    bullets.push(bullet);

    // Fogonazo al disparar
    spawnDust(bullet.position.clone(), 3);
  }

  function getSteeringProfile(){
    const mode = playerData.steeringMode || 'normal';
    if(mode==='soft') return { mouseFactor:0.7, response:7.2, steerBase:Math.PI/5.8, highSpeedStability:0.58 };
    if(mode==='direct') return { mouseFactor:0.92, response:12, steerBase:Math.PI/5.2, highSpeedStability:0.48 };
    return { mouseFactor:0.82, response:10, steerBase:Math.PI/5.5, highSpeedStability:0.52 };
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
    const steerProfile = getSteeringProfile();
    let steerInput = 0;
    if(left)  steerInput += 1;
    if(right) steerInput -= 1;
    if(mouseActive && Math.abs(mouseX)>0.05) steerInput += mouseX * steerProfile.mouseFactor;
    steerInput = clamp(steerInput, -1, 1);

    // Ángulo máximo de las ruedas (se reduce a alta velocidad para estabilidad)
    const speed = carState.velocity.length();
    const speedNorm = clamp(speed / CONFIG.MAX_SPEED, 0, 1);
    const maxSteer = steerProfile.steerBase * (1 - speedNorm*steerProfile.highSpeedStability); // configurable por modo

    carState.targetWheelAngle = steerInput * maxSteer;
    // Suavizar giro de ruedas
    carState.wheelAngle = lerp(carState.wheelAngle, carState.targetWheelAngle, dt*steerProfile.response);

    // --- Aceleración / frenado ---
    let accel = CONFIG.ACCELERATION;
    let maxSpeed = CONFIG.MAX_SPEED;

    if(nitro || gameState.hasTurbo){
      accel *= 2.0;
      maxSpeed *= 1.55;
      if(nitro) carState.nitro = Math.max(0, carState.nitro - dt*28);
    } else {
      carState.nitro = Math.min(carState.maxNitro, carState.nitro + dt*8);
    }

    document.body.classList.toggle('nitro-active', nitro || gameState.hasTurbo);
    if(nitro) markTutorialStep('nitro');

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
    if(isDrifting) markTutorialStep('drift');
    carState.driftAmount = lerp(carState.driftAmount, isDrifting ? 1 : 0, dt*6);

    // Fricción lateral (más fricción = menos drift)
    let latFric = CONFIG.LATERAL_FRICTION;
    if(handbrake) latFric = 0.78;   // freno de mano: sigue derrapando, pero más controlable
    else if(brake) latFric = 0.86;

    // Fricción frontal normal
    let frontFric = CONFIG.FRICTION;
    if(brake) frontFric = 0.94;
    if(handbrake) frontFric = 0.9;

    // Aplicar fricción separada
    const velFrontFriced = velForward.multiplyScalar(Math.pow(frontFric, dt*60));
    const velLatFriced   = velLateral.multiplyScalar(Math.pow(latFric, dt*60));
    carState.velocity.copy(velFrontFriced).add(velLatFriced);

    // Limitar velocidad máxima
    if(carState.velocity.length() > maxSpeed){
      carState.velocity.setLength(maxSpeed);
    }

    // --- Giro (yaw) basado en ángulo de ruedas y velocidad ---
    const turnRate = (carState.wheelAngle / steerProfile.steerBase) * CONFIG.TURN_SPEED;
    if(speed > 0.015){
      // El giro es proporcional a la velocidad frontal
      const turnSign = velDot >= 0 ? 1 : -1;
      car.rotation.y += turnRate * turnSign * (speed / maxSpeed) * dt * 60;
    }

    // --- Desplazamiento ---
    car.position.addScaledVector(carState.velocity, dt*60);

    // --- Inclinación visual del coche ---
    // Roll en curvas (inclinación lateral)
    const targetRoll = -steerInput * 0.14 * speedNorm;
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
    
    // ✨ EFECTOS DE RASTRO DE VELOCIDAD
    // Cuando el coche va muy rápido, genera un rastro visual impresionante
    if(speed > CONFIG.MAX_SPEED * 0.6){
      const speedRatio = clamp((speed - CONFIG.MAX_SPEED * 0.6) / (CONFIG.MAX_SPEED * 0.4), 0, 1);
      
      // Generar partículas de rastro con más frecuencia a mayor velocidad
      if(Math.random() < speedRatio * 0.4){
        const carWorld = car.position.clone();
        // Posición detrás del coche
        const behindOffset = new THREE.Vector3(0, 0.3, 1.5).applyQuaternion(car.quaternion);
        carWorld.add(behindOffset);
        
        // Crear partícula de rastro
        const trailColor = gameState.hasTurbo ? 0xff6600 : 0x00aaff;
        const trailMat = new THREE.MeshBasicMaterial({ 
          color: trailColor, 
          transparent: true, 
          opacity: 0.8 
        });
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6), 
          trailMat
        );
        trail.position.copy(carWorld);
        trail.position.x += (Math.random() - 0.5) * 0.8;
        trail.userData = { 
          velocity: new THREE.Vector3(0, 0, 0),
          life: 0.3 + Math.random() * 0.2, 
          gravity: 0,
          isTrail: true 
        };
        scene.add(trail);
        particles.push(trail);
      }
    }

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
            const dmg = z.userData.type.damage*(1-(playerData.upgrades.armor.level*0.1));
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
    updateMissionProgress('kill', 1);

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

  function addScore(pts){ gameState.score+=pts; }
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

      if(gameState.hasMagnet && dist<10){
        const dir=new THREE.Vector3().subVectors(carPos,pPos).normalize();
        p.position.add(dir.multiplyScalar(dt*12));
      }

      p.rotation.y+=dt*4;
      const bob = 1 + Math.sin((performance.now() + (p.userData.pulseOffset || 0))/250)*0.35;
      p.children[0].position.y = bob;
      if(p.children[1]){
        p.children[1].position.y = bob;
        p.children[1].rotation.z += dt * 3.2;
      }

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
        gameState.powerups.set('shield', Date.now()+type.duration);
        inGameMessage('¡Escudo activado! 🛡️', 1500); updatePowerupIcons(); break;
      case 'turbo':
        gameState.hasTurbo=true;
        gameState.powerups.set('turbo', Date.now()+type.duration);
        inGameMessage('¡Turbo activado! ⚡', 1500); updatePowerupIcons(); break;
      case 'magnet':
        gameState.hasMagnet=true;
        gameState.powerups.set('magnet', Date.now()+type.duration);
        inGameMessage('¡Imán activado! 🧲', 1500); updatePowerupIcons(); break;
      case 'weapon':
        gameState.hasWeapon=true;
        gameState.powerups.set('weapon', Date.now()+type.duration);
        inGameMessage('¡Arma activada! 🔫 (Click/E)', 2000); updatePowerupIcons(); break;
    }
  }

  // 💰 ========== ACTUALIZAR MONEDAS ==========
  function updateCoins(dt){
    const carPos = car.position.clone();
    const now = performance.now();
    
    for(let i=coins.length-1; i>=0; i--){
      const coin = coins[i];
      const coinPos = coin.position.clone();
      const dist = coinPos.distanceTo(carPos);
      
      // Efecto imán - atraer monedas
      if(gameState.hasMagnet && dist<12){
        const dir = new THREE.Vector3().subVectors(carPos, coinPos).normalize();
        coin.position.add(dir.multiplyScalar(dt*15));
      }
      
      // Animaciones de la moneda
      // Rotación constante
      coin.rotation.y += coin.userData.rotationSpeed;
      
      // Efecto de flotación (bobbing)
      const bobPhase = now * 0.001 * coin.userData.bobSpeed;
      coin.children[0].position.y = 1 + Math.sin(bobPhase) * coin.userData.bobAmount;
      if(coin.children[1]) coin.children[1].position.y = coin.children[0].position.y;
      
      // Colisión con el coche
      if(dist < 1.8){
        collectCoin(coin);
        scene.remove(coin);
        coins.splice(i, 1);
        continue;
      }
      
      // Eliminar monedas que quedaron atrás
      if(coin.position.z > car.position.z + 20){
        scene.remove(coin);
        coins.splice(i, 1);
      }
    }
  }
  
  function collectCoin(coin){
    const value = coin.userData.value;
    const mult = 1 + (playerData.upgrades.coinMultiplier.level * 0.5);
    const coinsEarned = Math.floor(value * mult);
    
    playerData.totalCoins += coinsEarned;
    gameState.score += 5; // Bonus de puntuación por recoger monedas
    updateMissionProgress('coin', coinsEarned);
    
    // Sonido de moneda
    playSound(800, 0.1, 'sine', 0.3);
    setTimeout(() => playSound(1000, 0.08, 'sine', 0.25), 50);
    
    // Mensaje visual
    inGameMessage(`💰 +${coinsEarned} ${coinsEarned > 1 ? 'monedas' : 'moneda'}`, 800);
    
    // Efecto de partículas doradas
    for(let i=0; i<8; i++){
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true });
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat);
      particle.position.copy(coin.position);
      particle.userData = { 
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4, 
          Math.random() * 3 + 2, 
          (Math.random() - 0.5) * 4
        ), 
        life: 0.5, 
        gravity: -10 
      };
      scene.add(particle);
      particles.push(particle);
    }
  }

  function updatePowerups(dt){
    const now=Date.now();
    let changed=false;

    for(const [key,expiry] of gameState.powerups.entries()){
      if(now>expiry){
        gameState.powerups.delete(key);
        changed=true;
        switch(key){
          case 'shield': gameState.hasShield=false; inGameMessage('Escudo desactivado',1000); break;
          case 'turbo': gameState.hasTurbo=false; document.body.classList.remove('nitro-active'); inGameMessage('Turbo finalizado',1000); break;
          case 'magnet': gameState.hasMagnet=false; inGameMessage('Imán desactivado',1000); break;
          case 'weapon': gameState.hasWeapon=false; inGameMessage('Arma desactivada',1000); break;
        }
      }
    }

    if(changed || gameState.powerups.size>0) updatePowerupIcons();
  }

  function updatePowerupIcons(){
    if(!elements.powerupContainer) return;
    elements.powerupContainer.innerHTML='';

    const emojis={shield:'🛡️',turbo:'⚡',magnet:'🧲',weapon:'🔫'};
    const labels={shield:'Escudo',turbo:'Nitro',magnet:'Imán',weapon:'Pistola'};
    const colors={shield:'#00ffff',turbo:'#ff8800',magnet:'#ffdd00',weapon:'#ff4040'};

    for(const [key,expiry] of gameState.powerups.entries()){
      const remMs = Math.max(0, expiry - Date.now());
      const rem = Math.ceil(remMs / 1000);
      const icon=document.createElement('div');
      icon.className='powerup-icon';
      icon.style.setProperty('--power-color', colors[key] || '#1db954');

      icon.innerHTML = `
        <div class="powerup-emoji">${emojis[key]||''}</div>
        <div class="powerup-name">${labels[key] || key}</div>
        <div class="powerup-time">${rem}s</div>
      `;
      elements.powerupContainer.appendChild(icon);
    }
  }

  // ========== BALAS ==========
  function updateBullets(dt){
    for(let i=bullets.length-1; i>=0; i--){
      const b=bullets[i];
      b.position.add(b.userData.velocity.clone().multiplyScalar(dt*60));
      b.userData.life-=dt;
      b.userData.trailTimer += dt;

      if(b.userData.trailTimer > 0.025){
        b.userData.trailTimer = 0;
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshBasicMaterial({ color:0xff9933, transparent:true, opacity:0.75 })
        );
        trail.position.copy(b.position);
        trail.userData = { velocity: new THREE.Vector3(), life: 0.2, gravity: 0 };
        scene.add(trail);
        particles.push(trail);
      }

      if(b.userData.life<=0){ scene.remove(b); bullets.splice(i,1); continue; }

      for(let j=zombies.length-1; j>=0; j--){
        if(b.position.distanceTo(zombies[j].position)<1.7){
          zombies[j].userData.health--;
          if(zombies[j].userData.health<=0){
            spawnExplosion(zombies[j].position.clone());
            killZombie(zombies[j],j);
          } else {
            playCollisionSfx();
          }

          spawnDust(b.position.clone(), 4);
          scene.remove(b);
          bullets.splice(i,1);
          break;
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
    // ❌ MONTAÑAS ELIMINADAS - No hay parallax de pirámides
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
      // --- DIFICULTAD PROGRESIVA + EVENTOS DE OLEADA ---
      gameState.waveConfig = getWaveConfig(gameState.wave);
      const cfg = gameState.waveConfig;
      maybeStartWaveEvent();

      let waveWeights = { ...cfg.weights };
      let coinChance = cfg.coinChance;
      if(gameState.waveEvent){
        if(gameState.waveEvent.type==='fast_horde'){ waveWeights = {normal:0.2, fast:0.62, tank:0.1, explosive:0.08}; }
        if(gameState.waveEvent.type==='tank_assault'){ waveWeights = {normal:0.2, fast:0.16, tank:0.5, explosive:0.14}; }
        if(gameState.waveEvent.type==='coin_rush') coinChance = 0.008;
        if(gameState.zombiesKilledThisWave >= gameState.waveEvent.until){
          gameState.waveEvent = null;
          inGameMessage('✅ Evento finalizado', 1200);
        }
      }

      if(now-gameState.lastSpawn>cfg.spawnDelay){
        if(zombies.length<cfg.maxZombies){
          spawnZombie(waveWeights);
          if(gameState.waveEvent && gameState.waveEvent.type==='fast_horde' && Math.random()<0.35 && zombies.length<cfg.maxZombies) spawnZombie(waveWeights);
        }
        gameState.lastSpawn=now;
      }

      // Power-ups
      if(Math.random()<0.0009 && powerups.length<3) spawnPowerup();

      // 💰 Monedas
      if(Math.random()<coinChance && coins.length<18) spawnCoin();

      // Updates
      updateCarPhysics(dt);
      checkZombies(dt, cfg.zombieSpeedMult);
      checkPowerups(dt);
      updateCoins(dt); // 💰 Actualizar monedas
      updateBullets(dt);
      updateParticles(dt);
      updatePowerups(dt);
      updateCarAura(); // ✨ Actualizar aura visual

      // Puntos por sobrevivir
      gameState.score += 0.03 * carState.velocity.length() * dt * 100;

      // Combo timer con efectos mejorados
      if(gameState.combo>0){
        gameState.comboTimer+=dt;
        if(gameState.comboTimer>3){ 
          gameState.combo=0; 
          gameState.comboTimer=0; 
        }
        
        // ✨ Mensajes espectaculares de combo
        if(gameState.combo === 5){
          showBigMessage('🔥 ¡COMBO x5!', '#ff6600');
        } else if(gameState.combo === 10){
          showBigMessage('💥 ¡COMBO x10! ¡INCREÍBLE!', '#ff0000');
        } else if(gameState.combo === 15){
          showBigMessage('⚡ ¡COMBO x15! ¡IMPARABLE!', '#ffdd00');
        } else if(gameState.combo === 20){
          showBigMessage('👑 ¡COMBO x20! ¡LEYENDA!', '#00ffff');
        }
      }

      // Oleadas con cambio de atmósfera
      if(gameState.zombiesKilledThisWave>=gameState.waveConfig.killTarget){
        gameState.wave++;
        updateDailyMissionProgress('wave', 1);
        gameState.zombiesKilledThisWave=0;
        
        // ✨ Cambiar atmósfera cada oleada
        const newAtmosphere = getAtmosphereForWave(gameState.wave);
        changeAtmosphere(newAtmosphere);
        
        assignMission();
        inGameMessage(`🌊 ¡Oleada ${gameState.wave}!`, 2000);
        playPowerupSfx();
      }

      if(gameState.hp<=0){ gameState.running=false; showGameOver(); }

      // Reciclar mundo infinito
      recycleWorld();
    }

    // Sol (se mueve suavemente)
    if(starField && car){
      starField.position.z = car.position.z - 90;
      if(starField.material){
        const base = currentAtmosphere === 'night' ? 0.9 : (currentAtmosphere === 'galaxy' ? 0.96 : 0.04);
        starField.material.opacity = clamp(base + Math.sin(performance.now()*0.003) * 0.05, 0.02, 1);
      }
    }

    if(sunMesh && sun){
      const t=performance.now()*0.00012;
      sun.position.set(100*Math.cos(t), 80+10*Math.sin(t*0.7), 60+20*Math.sin(t*0.4));
      sunMesh.position.copy(sun.position);
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
    }

    // HUD
    scoreEl.textContent = Math.floor(gameState.score);
    hpEl.textContent    = Math.max(0, Math.floor(gameState.hp));
    if(elements.comboEl){
      if(gameState.combo>1){ elements.comboEl.textContent=`x${gameState.combo}`; elements.comboEl.style.display='block'; }
      else elements.comboEl.style.display='none';
    }
    if(elements.waveEl) elements.waveEl.textContent=`Oleada ${gameState.wave}`;
    updateMissionHud();
    if(elements.nitroBar) elements.nitroBar.style.width=(carState.nitro/carState.maxNitro*100)+'%';
    coinsEl.textContent = playerData.totalCoins + Math.floor(gameState.score/100);

    // ✅ Dibujar mini-mapa con límite para reducir carga de CPU
    minimapAccumulator += dt;
    if(minimapAccumulator >= 1/30){
      drawMinimap();
      minimapAccumulator = 0;
    }

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
    coins.forEach(c=>scene.remove(c)); coins.length=0; // 💰 Limpiar monedas

    gameState.score=0; gameState.hp=gameState.maxHp;
    gameState.combo=0; gameState.comboTimer=0; gameState.maxCombo=0;
    gameState.kills=0; gameState.wave=1; gameState.zombiesKilledThisWave=0;
    gameState.waveConfig = getWaveConfig(1);
    gameState.waveEvent = null;
    gameState.eventRollWave = 0;
    gameState.lastSpawn=performance.now();
    gameState.powerups.clear();
    gameState.hasShield=false; gameState.hasTurbo=false; gameState.hasMagnet=false; gameState.hasWeapon=false;
    document.body.classList.remove('nitro-active');

    Object.keys(keys).forEach(k=> keys[k]=false);
    mouseActive=false;
    tutorialState.enabled = false;
    camShake.intensity=0; camShake.decay=0;
    const comboMsg = document.getElementById('bigComboMessage'); if(comboMsg) comboMsg.remove();
    lastBigMessageCombo = 0;

    carState.nitro=carState.maxNitro;
    lastShotTime=0;
    if(!carState.velocity) carState.velocity=new THREE.Vector3();
    carState.velocity.set(0,0,0);
    carState.wheelAngle=0; carState.targetWheelAngle=0;
    carState.driftAmount=0; carState.suspensionPhase=0;

    car.position.set(0, 0.75, 15);
    car.rotation.set(0, 0, 0);

    for(let i=0;i<maxDust;i++){ dustPositions[i*3]=dustPositions[i*3+1]=dustPositions[i*3+2]=99999; dustLifetimes[i]=0; }
    dustGeom.attributes.position.needsUpdate=true;
    dustGeom.attributes.aLifetime.needsUpdate=true;
    
    // ✨ Restablecer atmósfera a día
    changeAtmosphere('day');

    elements.btnRestart.style.display='inline-block';
    scoreEl.textContent='0'; hpEl.textContent=gameState.maxHp; speedEl.textContent='0 km/h';
    if(elements.powerupContainer) elements.powerupContainer.innerHTML='';
    assignMission();
  }

  function startGame(){
    const tutorialWasRequested = tutorialState.enabled;
    if(!scene||!car){ alert('Error: Escena no inicializada. Recarga la página.'); return; }
    if(gameState.running) return;
    showHUD();
    resetGame();
    if(tutorialWasRequested){ tutorialState.enabled = true; tutorialState.step = 0; updateTutorialOverlay(); }
    gameState.running=true; gameState.paused=false;
    overlayMenu.style.display='none'; overlayShop.style.display='none'; overlayGameOver.style.display='none';
    hideBackgroundCanvas();
    if(!audioCtx) initAudio();
    updateAudioGains();
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
    saveRunToLeaderboard();
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
    hideHUD();
    updateMenuStats();
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
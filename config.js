// 🎮 CAR VS ZOMBIES - CONFIGURACIÓN
// Todas las constantes y configuraciones del juego

export const CONFIG = {
  ROAD_WIDTH: 18,
  MAX_SPEED: 0.48,
  ACCELERATION: 0.018,
  BRAKE_FORCE: 0.03,
  FRICTION: 0.975,
  LATERAL_FRICTION: 0.88,
  TURN_SPEED: 0.028,
  COLLISION_DIST: 1.88,
  DRIFT_THRESHOLD: 0.25,
  MAX_DUST_PARTICLES: 160,
  ZOMBIE_BASE_SPEED: 0.23,
  SPAWN_DELAY_BASE: 1200,
  CHUNK_LENGTH: 200,
  NUM_CHUNKS: 4,
  TREE_ROWS: 3,
  TREE_SPACING: 12,
  LAMP_SPACING: 25,
};

export const ZOMBIE_TYPES = {
  NORMAL:    { name:"Normal",    color:0x2d5a2d, speed:1.0,  health:1, damage:12, points:10, coins:1, size:1.0, emoji:"🧟" },
  FAST:      { name:"Rápido",   color:0xff6600, speed:1.8,  health:1, damage:8,  points:20, coins:2, size:0.8, emoji:"🧟‍♂️" },
  TANK:      { name:"Tanque",   color:0x8b0000, speed:0.6,  health:3, damage:25, points:50, coins:5, size:1.5, emoji:"🧟‍♀️" },
  EXPLOSIVE: { name:"Explosivo",color:0xffff00, speed:1.2,  health:1, damage:30, points:40, coins:3, size:1.1, explosive:true, emoji:"💣" },
  POISON:    { name:"Venenoso", color:0x9d4edd, speed:1.1,  health:1, damage:8,  points:30, coins:3, size:1.0, poison:true, emoji:"☠️" },
  INVISIBLE: { name:"Invisible",color:0x7dd3fc, speed:1.3,  health:1, damage:15, points:35, coins:4, size:0.9, invisible:true, emoji:"👻" },
  GIANT:     { name:"Gigante",  color:0x4a4a4a, speed:0.4,  health:5, damage:40, points:100,coins:10,size:2.2, emoji:"🦍" },
};

export const ACHIEVEMENTS = {
  FIRST_BLOOD:   { id:'first_blood',   name:'Primera Sangre',    desc:'Mata tu primer zombie',          reward:50,   icon:'🩸' },
  COMBO_MASTER:  { id:'combo_master',  name:'Maestro del Combo', desc:'Consigue combo x20',             reward:200,  icon:'🔥' },
  SPEED_DEMON:   { id:'speed_demon',   name:'Demonio Velocidad', desc:'Alcanza 150 km/h',               reward:100,  icon:'⚡' },
  SURVIVOR:      { id:'survivor',      name:'Sobreviviente',     desc:'Sobrevive 3 minutos',            reward:300,  icon:'⏱️' },
  MILLIONAIRE:   { id:'millionaire',   name:'Millonario',        desc:'Acumula 1000 monedas totales',   reward:500,  icon:'💰' },
  WAVE_WARRIOR:  { id:'wave_warrior',  name:'Guerrero Oleadas',  desc:'Alcanza oleada 10',              reward:400,  icon:'🌊' },
  NITRO_ADDICT:  { id:'nitro_addict',  name:'Adicto al Nitro',   desc:'Usa nitro 50 veces',             reward:150,  icon:'💨' },
  SHOPPING_SPREE:{ id:'shopping_spree',name:'Comprador',         desc:'Compra 5 colores diferentes',    reward:250,  icon:'🛒' },
  ZOMBIE_SLAYER: { id:'zombie_slayer', name:'Cazador Zombies',   desc:'Mata 500 zombies en total',      reward:600,  icon:'🎯' },
  PERFECT_DRIVER:{ id:'perfect_driver',name:'Conductor Perfecto',desc:'Termina sin recibir daño',        reward:800,  icon:'👑' },
};

export const POWERUP_TYPES = {
  HEALTH:      { name:"Vida",         color:0x00ff00, icon:"❤️",  duration:0,     effect:"heal" },
  SHIELD:      { name:"Escudo",       color:0x00ffff, icon:"🛡️",  duration:8000,  effect:"shield" },
  TURBO:       { name:"Turbo",        color:0xff6600, icon:"⚡",  duration:6000,  effect:"turbo" },
  MAGNET:      { name:"Imán",         color:0xffdd00, icon:"🧲",  duration:10000, effect:"magnet" },
  WEAPON:      { name:"Arma",         color:0xff0000, icon:"🔫",  duration:15000, effect:"weapon" },
  SLOWMO:      { name:"Slow Motion",  color:0x9d4edd, icon:"⏱️",  duration:7000,  effect:"slowmo" },
  FREEZE:      { name:"Congelar",     color:0x7dd3fc, icon:"🧊",  duration:5000,  effect:"freeze" },
  DOUBLECOINS: { name:"Doble Monedas",color:0xffd700, icon:"💎",  duration:12000, effect:"doublecoins" },
};

export const SHOP_COLORS = [
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
  { name:'Negro Carbono',     hex:0x1a1a1a, price:1200 },
  { name:'Blanco Perla',      hex:0xffffff, price:1200 },
  { name:'Arcoíris',          hex:0xff00ff, price:2000 },
];

export const UPGRADES = [
  { 
    id:'health', 
    name:'Vida Máxima', 
    icon:'❤️', 
    desc:'Aumenta tu vida máxima', 
    levels:[
      {cost:200, value:120},
      {cost:400, value:140},
      {cost:800, value:160},
      {cost:1500,value:200},
    ]
  },
  { 
    id:'speed', 
    name:'Velocidad', 
    icon:'⚡', 
    desc:'Aumenta velocidad máxima', 
    levels:[
      {cost:300, value:1.1},
      {cost:600, value:1.2},
      {cost:1200,value:1.35},
      {cost:2000,value:1.5},
    ]
  },
  { 
    id:'nitro', 
    name:'Nitro', 
    icon:'💨', 
    desc:'Recarga de nitro más rápida', 
    levels:[
      {cost:250, value:1.2},
      {cost:500, value:1.4},
      {cost:1000,value:1.6},
      {cost:1800,value:2.0},
    ]
  },
  { 
    id:'coins', 
    name:'Multiplicador Monedas', 
    icon:'💰', 
    desc:'Gana más monedas', 
    levels:[
      {cost:400, value:1.25},
      {cost:800, value:1.5},
      {cost:1600,value:2.0},
    ]
  },
];

export const STORAGE_KEY = 'carVsZombies_playerData';
export const ACHIEVEMENTS_KEY = 'carVsZombies_achievements';

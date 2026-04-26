// ═══════════════════════════════════════════════════
//  Ultimate Survivor — main.js  (v4 · PixiJS)
// ═══════════════════════════════════════════════════

const GAME_W = innerWidth, GAME_H = innerHeight;

// ── Forward declarations (avoid TDZ with resize handler) ──
let txtHp, txtLvl, txtTime, txtKills, txtCoords, txtCombo, txtComboNext, txtBloodMoon;
let txtSwarmWarn, txtSwarmCountdown;
let txtSwarmTitle, txtSwarmBar, txtSwarmRemain;
let txtIntroBig, txtIntroSub, txtIntroWord, txtIntroCredit;
let txtMinimapLabel;

// ── PixiJS Application ─────────────────────────────────
async function initApp() {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x060810,
    antialias: false,
    resolution: Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2),
    autoDensity: true,
  });
  document.body.prepend(app.canvas);
  app.canvas.style.position = 'fixed';
  app.canvas.style.top = '0';
  app.canvas.style.left = '0';

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    repositionHUD();
  });

  return app;
}

function repositionHUD() {
  const W = app.renderer.width;
  const H = app.renderer.height;
  if (txtTime) { txtTime.x = W-16; txtTime.y = 30; }
  if (txtKills) { txtKills.x = W-16; txtKills.y = 48; }
  if (txtCoords) { txtCoords.y = H-16; }
  if (txtCombo) { txtCombo.x = W/2; txtCombo.y = H*0.28; }
  if (txtComboNext) { txtComboNext.x = W/2; txtComboNext.y = H*0.28+26; }
  if (txtBloodMoon) { txtBloodMoon.x = W/2; txtBloodMoon.y = H/2; }
  if (txtSwarmWarn) { txtSwarmWarn.x = W/2; txtSwarmWarn.y = 80; }
  if (txtSwarmCountdown) { txtSwarmCountdown.x = W/2; txtSwarmCountdown.y = 110; }
  if (txtSwarmTitle) { txtSwarmTitle.x = W/2; }
  if (txtSwarmRemain) { txtSwarmRemain.x = W/2; }
  if (txtIntroSub) { txtIntroSub.x = W/2; }
  if (txtIntroBig) { txtIntroBig.x = W/2; }
  if (txtIntroWord) { txtIntroWord.x = W/2; }
  if (txtIntroCredit) { txtIntroCredit.x = W/2; }
  if (txtMinimapLabel) { txtMinimapLabel.x = W-MINIMAP_SIZE-16+MINIMAP_SIZE/2; txtMinimapLabel.y = H-MINIMAP_SIZE-16+MINIMAP_SIZE+12; }
}

// ── Containers ─────────────────────────────────────────
let app, gameContainer, worldContainer, entityContainer, particleContainer, playerContainer, hudContainer, minimapContainer, introContainer;

// ── Terrain tiling sprites for biome textures ───────────
let terrainSprites = {}; // terrainSprites['forest'] = PIXI.TilingSprite

// Generate procedural textures
async function initPIXI() {
  app = await initApp();

  gameContainer = new PIXI.Container();
  worldContainer = new PIXI.Container();
  entityContainer = new PIXI.Container();
  particleContainer = new PIXI.Container();
  playerContainer = new PIXI.Container();
  hudContainer = new PIXI.Container();
  minimapContainer = new PIXI.Container();
  introContainer = new PIXI.Container();

  gameContainer.addChild(worldContainer);
  gameContainer.addChild(entityContainer);
  gameContainer.addChild(particleContainer);
  gameContainer.addChild(playerContainer);

  app.stage.addChild(gameContainer);
  app.stage.addChild(hudContainer);
  app.stage.addChild(minimapContainer);
  app.stage.addChild(introContainer);

  // Post-processing filters
  gameContainer.filterArea = app.renderer.screen;
  const gameFilters = [];
  if (typeof PIXI.filters.AdjustmentFilter !== 'undefined') {
    const adjustmentFilter = new PIXI.filters.AdjustmentFilter({
      contrast: 1.15,
      saturation: 1.25,
      brightness: 1.05,
    });
    gameFilters.push(adjustmentFilter);
  }
  if (!IS_MOBILE && typeof PIXI.filters.CRTFilter !== 'undefined') {
    const crtFilter = new PIXI.filters.CRTFilter({
      vignetting: 0.35,
      vignettingAlpha: 0.6,
      vignettingBlur: 0.4,
      lineContrast: 0.12,
      lineWidth: 1,
      verticalLine: false,
      noise: 0.06,
      noiseSize: 1,
      curvature: 0,
      curvatureX: 0,
      curvatureY: 0,
    });
    gameFilters.push(crtFilter);
  }
  gameContainer.filters = gameFilters;

  await SpriteGen.generateAll(app);
  initSound();
  initDisplay();
  initTouch();
  initCharSelect();
  showCharSelect();
}


// ── Game state ──────────────────────────────────────────
let selectedClass = null;

// ── Input ──────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) e.preventDefault(); if(e.key==='p'||e.key==='P'||e.key==='Escape') togglePause(); });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// ── Touch joystick ─────────────────────────────────────
const touchJoystick = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 };
const JOYSTICK_MAX_R = 55;
const JOYSTICK_DEAD  = 8;
let _touchCanvas = null;

function _onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (touchJoystick.active && touchJoystick.id !== -1) continue;
    if (t.clientX < window.innerWidth * 0.6) {
      touchJoystick.active = true;
      touchJoystick.id = t.identifier;
      touchJoystick.startX = t.clientX;
      touchJoystick.startY = t.clientY;
      touchJoystick.dx = 0;
      touchJoystick.dy = 0;
    }
  }
}

function _onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== touchJoystick.id) continue;
    let dx = t.clientX - touchJoystick.startX;
    let dy = t.clientY - touchJoystick.startY;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_MAX_R) { dx = dx / dist * JOYSTICK_MAX_R; dy = dy / dist * JOYSTICK_MAX_R; }
    touchJoystick.dx = dx;
    touchJoystick.dy = dy;
  }
}

function _onTouchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== touchJoystick.id) continue;
    touchJoystick.active = false;
    touchJoystick.id = -1;
    touchJoystick.dx = 0;
    touchJoystick.dy = 0;
  }
}

function initTouch() {
  _touchCanvas = document.querySelector('canvas');
  if (!_touchCanvas) return;
  _touchCanvas.addEventListener('touchstart', _onTouchStart, { passive: false });
  _touchCanvas.addEventListener('touchmove', _onTouchMove, { passive: false });
  _touchCanvas.addEventListener('touchend', _onTouchEnd, { passive: false });
  _touchCanvas.addEventListener('touchcancel', _onTouchEnd, { passive: false });
}

// ── Constants ──────────────────────────────────────────
const PLAYER_SPEED   = 200;
const BULLET_SPEED   = 440;
const BULLET_LIFE    = 2.5;
const ENEMY_BASE_SPD = 65;
const XP_PER_LEVEL   = 15;
const DAMAGE_CD      = 1.0;
const CULL_MARGIN    = 140;
const CULL_DESPAWN   = 2200;
const SWARM_INTERVAL = 60;
const SWARM_WARN     = 5;
const SWARM_DURATION = 15;
const SWARM_RATE     = 0.25;
const CHEST_DROP_CHANCE = 0.04;
const CHEST_BIG_DROP    = 0.12;
const BUFF_DURATION     = 15;
const CHEST_PICKUP_RANGE = 55;
const CHEST_MAGNET_RANGE = 120;
const MINIMAP_SIZE     = 120;
const MINIMAP_RANGE    = 1500;
const SPAWN_CAP = 4.0;
const SPAWN_CAP_SWARM = 3.0;
const RUN_DURATION     = 30*60; // 30 minuti in secondi
const MAP_BOUND        = 10000; // confine mappa (~20000x20000 area totale)
const MAX_ENEMIES      = 500;   // limite nemici = pool sprite
const ENEMY_GROW_SCALE = 1.15;  // +15% size & HP after level 5
function enemySizeScale() { return player.level >= 5 ? ENEMY_GROW_SCALE : 1; }

// ── Flocking (swarm) ───────────────────────────────────
const FLOCK_SEPARATION  = 50;   // min distance for separation (increased)
const ENEMY_PUSH_RADIUS = 60;   // enemy-enemy soft separation radius (increased from 28)
const ENEMY_PUSH_FORCE  = 2.0;  // push strength (increased from 0.6)
const FLOCK_ALIGNMENT_W = 0.08;
const FLOCK_COHESION_W  = 0.005;
const FLOCK_RADIUS      = 120;
const SWARM_SPEED_MULT  = 1.3;

// ── Classi personaggio ─────────────────────────────────
const CLASSES = [
  {
    id: 'mago_standard',
    name: 'Mago Standard',
    icon: '🧙',
    desc: 'Mago equilibrato. Parte con Spread Shot.',
    color: 0x44aaff,
    stats: { hp:10, speed:1.0, dmg:1, magnetRange:65 },
    startWeapons: [
      { type:'gun',    cd:0.55, timer:0 },
      { type:'spread', cd:1.1,  timer:0 },
    ],
  },
  {
    id: 'mago_corazzato',
    name: 'Mago Corazzato',
    icon: '🔮',
    desc: 'Mago corazzato. Più resistenza, più lento. Orbit Shield di partenza.',
    color: 0xff8833,
    stats: { hp:18, speed:0.70, dmg:2, magnetRange:50 },
    startWeapons: [
      { type:'gun',   cd:0.8,  timer:0 },
      { type:'orbit', cd:0,    timer:0 },
    ],
  },
  {
    id: 'mago_scout',
    name: 'Mago Scout',
    icon: '👁️',
    desc: 'Mago scout. Velocissimo, fragile. Fuoco rapido.',
    color: 0xcc44ff,
    stats: { hp:6, speed:1.55, dmg:1, magnetRange:110 },
    startWeapons: [
      { type:'gun', cd:0.28, timer:0 },
    ],
  },
];

// ── Camera ─────────────────────────────────────────────
let camera = { x:0, y:0, shakeX:0, shakeY:0, shakeMag:0, shakeDur:0 };

function screenShake(mag=7, dur=0.25) {
  if (mag > camera.shakeMag) { camera.shakeMag = mag; camera.shakeDur = dur; }
}

function updateCamera(dt) {
  const lerp = Math.min(1, 10*dt);
  camera.x += (player.x - app.renderer.width/2 - camera.x) * lerp;
  camera.y += (player.y - app.renderer.height/2 - camera.y) * lerp;
  if (camera.shakeDur > 0) {
    camera.shakeDur -= dt;
    const t = Math.max(0, camera.shakeDur / 0.3);
    camera.shakeX = (Math.random()*2-1) * camera.shakeMag * t;
    camera.shakeY = (Math.random()*2-1) * camera.shakeMag * t;
  } else { camera.shakeX = camera.shakeY = camera.shakeMag = 0; }
}

function applyCamera() {
  const cx = -camera.x + camera.shakeX;
  const cy = -camera.y + camera.shakeY;
  worldContainer.position.set(cx, cy);
  entityContainer.position.set(cx, cy);
  particleContainer.position.set(cx, cy);
  playerContainer.position.set(cx, cy);
}

// ── Buffs ──────────────────────────────────────────────
const BUFFS = [
  { id:'berserk',  name:'Berserk',     icon:'💀', desc:'Danno ×3 per 15s',    apply:p=>{p.bulletDmg*=3}, revert:p=>{p.bulletDmg/=3} },
  { id:'haste',    name:'Haste',       icon:'💨', desc:'Velocità ×2 per 15s',   apply:p=>{p.speed*=2},     revert:p=>{p.speed/=2} },
  { id:'regen',    name:'Regen',       icon:'💚', desc:'+2 HP/s per 15s',       apply:p=>{p._regen=true},  revert:p=>{p._regen=false} },
  { id:'magnet2',  name:'Super Magnet',icon:'🧲', desc:'Raggio XP ×4 per 15s',  apply:p=>{p.magnetRange*=4},revert:p=>{p.magnetRange/=4} },
  { id:'shield',   name:'Shield',      icon:'🛡️', desc:'Nessun danno per 8s',   apply:p=>{p._invuln=true}, revert:p=>{p._invuln=false} },
  { id:'bullet2',  name:'Bullet Storm',icon:'🔫', desc:'Cooldown ×0.3 per 15s',
    apply:  p => { p._bullet2Snapshot = p.weapons.map(w=>w.cd); p.weapons.forEach(w=>w.cd*=0.3); },
    revert: p => { if(p._bullet2Snapshot) { p.weapons.forEach((w,i)=>{ if(p._bullet2Snapshot[i]!==undefined) w.cd=p._bullet2Snapshot[i]; }); p._bullet2Snapshot=null; } }
  },
  { id:'frost',    name:'Frost Nova',  icon:'❄️', desc:'Gela nemici vicini 8s',  apply:p=>{p._frost=true},  revert:p=>{p._frost=false} },
  { id:'vampire',  name:'Vampire',     icon:'🧛', desc:'+1 HP per kill 15s',     apply:p=>{p._vampire=true},revert:p=>{p._vampire=false} },
  { id:'pierce',   name:'Pierce',      icon:'🗡️', desc:'Proiettili perforanti 12s',apply:p=>{p._pierce=true}, revert:p=>{p._pierce=false} },
  { id:'nova',     name:'Nova Pulse',  icon:'💫', desc:'Onda d\'urto ogni 2s 12s',apply:p=>{p._nova=true},  revert:p=>{p._nova=false} },
  { id:'crit',     name:'Crit Storm',  icon:'⚡', desc:'25% chance ×5 danno 15s', apply:p=>{p._crit=true},   revert:p=>{p._crit=false} },
];

// ── Combo breakpoint system ─────────────────────────────
// Combo ora REGALA buff al player invece di rendere i nemici piu' tanky.
// Ogni soglia attiva un flag; al reset del combo i flag si spengono.
const COMBO_TIERS = [
  { at: 10,  flag:'_comboFireRate', name:'+10% FIRE RATE' },
  { at: 25,  flag:'_comboMulti',    name:'+1 PROIETTILE'  },
  { at: 50,  flag:'_comboDmg',      name:'+25% DANNO'     },
  { at: 100, flag:'_comboNova',     name:'NOVA AUTO'      },
];
const COMBO_DECAY = 3.5; // secondi senza kill prima di azzerare

function applyComboTiers(p, c) {
  for (const t of COMBO_TIERS) p[t.flag] = (c >= t.at);
}
function clearComboTiers(p) {
  for (const t of COMBO_TIERS) p[t.flag] = false;
}
function nextComboTier(c) {
  for (const t of COMBO_TIERS) if (c < t.at) return t;
  return null;
}

// ── Upgrades ────────────────────────────────────────────
const UPGRADES = [
  { id:'gun_cd', name:'Rapid Fire',   icon:'🔫', desc:'Cooldown fucile −25%',          apply: p => { const w=p.weapons.find(w=>w.type==='gun'); if(w) w.cd*=0.75; }},
  { id:'spread', name:'Spread Shot',  icon:'💥', desc:'Aggiunge arma spread a 3 vie',  apply: p => { if(!p.weapons.find(w=>w.type==='spread')) p.weapons.push({type:'spread',cd:1.1,timer:0}); }},
  { id:'orbit',  name:'Orbit Shield', icon:'🌀', desc:'3 orb orbitanti DPS',           apply: p => { if(!p.weapons.find(w=>w.type==='orbit'))  p.weapons.push({type:'orbit', cd:0, timer:0});  }},
  { id:'speed',  name:'Afterburner',  icon:'⚡', desc:'Velocità +30%',                 apply: p => { p.speed*=1.3; }},
  { id:'hp_up',  name:'Vital Boost',  icon:'❤️', desc:'HP max +3 e cura completa',     apply: p => { p.maxHp+=3; p.hp=p.maxHp; }},
  { id:'magnet', name:'XP Magnet',    icon:'🧲', desc:'Raggio raccolta XP ×2',         apply: p => { p.magnetRange*=2; }},
  { id:'dmg',    name:'Incendiary',   icon:'🔥', desc:'Danno proiettili +1',           apply: p => { p.bulletDmg+=1; }},
  { id:'multi',  name:'Twin Barrel',  icon:'🎯', desc:'Proiettili per raffica +1',     apply: p => { p.multiShot+=1; }},
  { id:'whip',    name:'Whip Slash',   icon:'⚔️', desc:'Frusta melee in cono 180°',    apply: p => { if(!p.weapons.find(w=>w.type==='whip'))    p.weapons.push({type:'whip',   cd:0.7, timer:0}); }},
  { id:'missile', name:'Homing Missiles',icon:'🚀',desc:'Missile che insegue',         apply: p => { if(!p.weapons.find(w=>w.type==='missile')) p.weapons.push({type:'missile',cd:1.4, timer:0}); }},
  { id:'chain',   name:'Lightning Chain',icon:'⚡', desc:'Fulmine che salta 4 nemici',   apply: p => { if(!p.weapons.find(w=>w.type==='chain'))   p.weapons.push({type:'chain',  cd:2.2, timer:0}); }},
];

// ── Evolutions (combinazioni di upgrade) ────────────────
// Apparizione al level-up se i prerequisiti sono soddisfatti e non gia' prese.
const EVOLUTIONS = [
  {
    id:'gatling', name:'Gatling', icon:'🔱',
    desc:'Fucile trasformato in gatling: cd 0.15s',
    req: p => (p.upgradeCount.gun_cd||0) >= 2 && (p.upgradeCount.multi||0) >= 1,
    apply: p => {
      const w = p.weapons.find(w=>w.type==='gun');
      if (w) { w.cd = 0.15; }
      p.bulletDmg = Math.max(1, Math.round(p.bulletDmg * 0.7));
      p.multiShot += 1;
    }
  },
  {
    id:'shotgun_nova', name:'Shotgun Nova', icon:'🌟',
    desc:'Spread a 360° (7 proiettili)',
    req: p => p.weapons.some(w=>w.type==='spread') && (p.upgradeCount.multi||0) >= 2,
    apply: p => {
      const w = p.weapons.find(w=>w.type==='spread');
      if (w) { w.type = 'spread_nova'; w.cd = 1.3; }
    }
  },
  {
    id:'aegis', name:'Aegis Orb', icon:'🛡️',
    desc:'Orb riflettono 30% danno',
    req: p => p.weapons.some(w=>w.type==='orbit') && (p.upgradeCount.hp_up||0) >= 2,
    apply: p => { p._aegis = true; p.maxHp += 3; p.hp = p.maxHp; }
  },
  {
    id:'soul_reaper', name:'Soul Reaper', icon:'💀',
    desc:'Whip evoluto: +1 HP ogni kill in cono',
    req: p => p.weapons.some(w=>w.type==='whip'),
    apply: p => {
      const w = p.weapons.find(w=>w.type==='whip');
      if (w) { w.type = 'whip_reaper'; w.cd = 0.55; }
    }
  },
];

function getAvailableEvolutions(p) {
  return EVOLUTIONS.filter(e => !p.takenEvolutions[e.id] && e.req(p));
}

// ── Particles ──────────────────────────────────────────
let particles = [];
let lastEnemyCount = 0;

// ── FX transienti (whip arc, chain bolts) ──
// { type:'whip'|'chain', ...params, life, maxLife }
let fxEffects = [];

// ── Damage numbers ──
let damageNumbers = [];
const DAMAGE_TEXT_POOL = 30;
let damageTexts = [];

// ── Ambient particles per bioma ──
let ambientParticles = [];
const AMBIENT_PARTICLE_COUNT = 40;

// ── Enemy death FX maps ──
const ENEMY_DEATH_FX = {
  orc:    { count:14, color:0xff4400, shape:0, bigCount:24, bigColor:0xff6600, bigShape:1 },
  plant:  { count:12, color:0x44ff44, shape:3, bigCount:20, bigColor:0x66ff66, bigShape:1 },
  slime:  { count:10, color:0x66dd66, shape:2, bigCount:18, bigColor:0x88ff88, bigShape:2 },
  vamp:   { count:14, color:0xcc44ff, shape:0, bigCount:24, bigColor:0xdd66ff, bigShape:1 },
};
const BIOME_DEATH_BURST = {
  forest: { color:0x44cc44, count:6, shape:0 },
  desert: { color:0xcc8833, count:6, shape:3 },
  ice:    { color:0xaaddff, count:6, shape:1 },
  swamp:  { color:0x66cc66, count:6, shape:2, ringExpand:true },
};
const BIOME_MINIMAP_COLORS = {
  forest: 0x22aa44,
  desert: 0xcc8833,
  ice:    0x66aadd,
  swamp:  0x448844,
};

// ── In-place array compaction (avoids .filter() allocation) ──
// Optional onRemove callback for cleanup (e.g. returning items to pool)
function compactInPlace(arr, fn, onRemove) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (fn(arr[i], i)) {
      arr[w++] = arr[i];
    } else if (onRemove) {
      onRemove(arr[i]);
    }
  }
  arr.length = w;
  return arr;
}

// ── Object pools for particles and bullets ──
const PARTICLE_POOL_SIZE = 500;
const BULLET_POOL_SIZE = 100;
const _particlePool = [];
const _bulletPool = [];

function initPools() {
  _particlePool.length = PARTICLE_POOL_SIZE;
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    _particlePool[i] = { x:0, y:0, vx:0, vy:0, life:0, maxLife:0.9, r:2, color:0, shape:0, blendAdd:0, startR:0, rotation:0, _active:false };
  }
  _bulletPool.length = BULLET_POOL_SIZE;
  for (let i = 0; i < BULLET_POOL_SIZE; i++) {
    _bulletPool[i] = { x:0, y:0, vx:0, vy:0, life:0, dmg:0, radius:4, pierced:null, _active:false, homing:false, _trailColor:0, _trailType:0 };
  }
}

function _acquireParticle() {
  for (let i = 0; i < _particlePool.length; i++) {
    if (!_particlePool[i]._active) { _particlePool[i]._active = true; return _particlePool[i]; }
  }
  return { x:0, y:0, vx:0, vy:0, life:0, maxLife:0.9, r:2, color:0, _active:true };
}

function _acquireBullet() {
  for (let i = 0; i < _bulletPool.length; i++) {
    if (!_bulletPool[i]._active) { _bulletPool[i]._active = true; return _bulletPool[i]; }
  }
  return { x:0, y:0, vx:0, vy:0, life:0, dmg:0, radius:4, pierced:null, _active:true };
}

function _releaseBullet(b) {
  b._active = false;
  b.pierced = null;
  b.homing = false;
  b._trailType = 0;
  b._hitBoss = false;
}

function _releaseParticle(p) {
  p._active = false;
}

function spawnParticles(wx, wy, color, count=8) {
  const c = parseInt(color.slice(1), 16);
  for (let i=0; i<count; i++) {
    const p = _acquireParticle();
    const a=Math.random()*Math.PI*2, s=50+Math.random()*110;
    p.x=wx; p.y=wy; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
    p.life=0.4+Math.random()*0.5; p.maxLife=0.9; p.r=2+Math.random()*3; p.color=c;
    p.shape=0; p.blendAdd=0; p.startR=0; p.rotation=0;
    particles.push(p);
  }
}

// Extended particle spawn with shape/blend/ring options
// shape: 0=circle, 1=spark(line), 2=ring, 3=debris(rect)
function spawnParticlesEx(wx, wy, color, count=8, opts={}) {
  if (particles.length > 350) return; // hard cap
  const c = typeof color === 'number' ? color : parseInt(color.slice(1), 16);
  const shape = opts.shape || 0;
  const blendAdd = opts.blendAdd ? 1 : 0;
  const speedBase = opts.speedBase || 80;
  const speedVar = opts.speedVar || 110;
  const lifeBase = opts.lifeBase || 0.4;
  const lifeVar = opts.lifeVar || 0.5;
  const actualCount = Math.min(count, Math.max(1, 400 - particles.length));
  for (let i=0; i<actualCount; i++) {
    const p = _acquireParticle();
    const a=Math.random()*Math.PI*2, s=speedBase+Math.random()*speedVar;
    p.x=wx; p.y=wy; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
    p.life=lifeBase+Math.random()*lifeVar;
    p.maxLife=p.life;
    p.r = 2 + Math.floor(Math.random()*2)*2;
    p.color=c;
    p.shape=shape;
    p.blendAdd=blendAdd;
    p.startR=opts.ringExpand ? 0 : p.r;
    p.rotation=a;
    particles.push(p);
  }
}

// ── Damage numbers ──
function spawnDamageNumber(wx, wy, amount, color='#ffffff', isCrit=false) {
  if (damageNumbers.length >= DAMAGE_TEXT_POOL) return;
  let txt = null;
  for (let i = 0; i < damageTexts.length; i++) {
    if (!damageTexts[i].visible) { txt = damageTexts[i]; break; }
  }
  if (!txt) return;
  damageNumbers.push({
    x: wx + (Math.random()-0.5)*8,
    y: wy - 5,
    vy: -60 - Math.random() * 30,
    life: 0.8 + Math.random() * 0.3,
    maxLife: 1.1,
    amount,
    color,
    isCrit,
    txt,
  });
}

function spawnAmbientParticle(biome) {
  const W = app.renderer.width;
  const H = app.renderer.height;
  const side = Math.floor(Math.random() * 4);
  let wx, wy;
  if (side === 0) { wx = camera.x + Math.random() * W; wy = camera.y - 20; }
  else if (side === 1) { wx = camera.x + W + 20; wy = camera.y + Math.random() * H; }
  else if (side === 2) { wx = camera.x + Math.random() * W; wy = camera.y + H + 20; }
  else { wx = camera.x - 20; wy = camera.y + Math.random() * H; }
  const defs = {
    forest: { color: 0xaaff44, speed: 15, size: 1.5, life: 3, alpha: 0.3 },
    desert: { color: 0xddaa44, speed: 25, size: 1, life: 2, alpha: 0.2 },
    ice:    { color: 0xccddff, speed: 12, size: 2, life: 4, alpha: 0.3 },
    swamp:  { color: 0x88dd88, speed: 8, size: 2.5, life: 3.5, alpha: 0.25 },
  };
  const def = defs[biome] || defs.forest;
  ambientParticles.push({
    x: wx, y: wy,
    vx: (Math.random()-0.5) * def.speed,
    vy: -Math.random() * def.speed * 0.5,
    life: def.life * (0.5 + Math.random() * 0.5),
    maxLife: def.life,
    r: def.size * (0.5 + Math.random()),
    color: def.color,
    alpha: def.alpha,
    wobblePhase: Math.random() * Math.PI * 2,
  });
}

// ── State ───────────────────────────────────────────────
let player, bullets, enemies, xpGems, state, lastTime, gameTime, totalKills, combo, comboTimer;
let _paused = false;
let _loopScheduled = false;
let _frameNowMs = 0;
let _frostedEnemies = new Set();
function togglePause() {
  if (state !== 'playing' && state !== 'paused') return;
  if (state === 'paused') {
    state = 'playing'; _paused = false; lastTime = null; if (!_loopScheduled) { _loopScheduled = true; requestAnimationFrame(loop); }
    if (txtPauseOverlay) txtPauseOverlay.alpha = 0;
    if (txtPauseHint) txtPauseHint.alpha = 0;
  } else {
    state = 'paused'; _paused = true;
  }
  if (typeof _updatePauseButton === 'function') _updatePauseButton();
}
function isPaused() { return _paused; }
let transition = { active: false, mode: 'in', timer: 0, duration: 0.35, nextState: '' };
let transitionGfx;
let _frameCount = 0;
let swarmTimer, swarmPhase, swarmCountdown;
let chests, activeBuffs, novaTimer;
// Eventi: Elite Hunt + Blood Moon
let eliteCheckTimer, bloodMoonNextAt, bloodMoonTimer, bloodMoonActive, bloodMoonAnnounceTimer;
let introTime, introSpawned;

// ── PixiJS display objects ──────────────────────────────
let worldGfx, xpGfx, chestGfx, bulletGfx, enemyGfx, playerGfx, particleGfx;
let hudGfx, minimapGfx, introGfx;
let orbitGfx, frostAuraGfx, novaRingGfx, shieldGfx, fxGfx, particleAddGfx, ambientGfx;
let enemySprites = [];

// ── HUD Text objects (declared at top of file) ──
let buffTexts = [];

function makeText(style, x, y, ax, ay) {
  const t = new PIXI.Text({ text: '', style });
  t.x = x; t.y = y;
  if (ax !== undefined) t.anchor.set(ax, ay);
  return t;
}

// ── Mobile detection & scale factor ─────────────────────
const IS_MOBILE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const MOBILE_FONT_SCALE = IS_MOBILE ? 1.4 : 1;
const MOBILE_BUFF_SCALE = IS_MOBILE ? 1.3 : 1;

const STYLE_SM   = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(10*MOBILE_FONT_SCALE), fill:'#ffffff' };
const STYLE_MD   = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(13*MOBILE_FONT_SCALE), fill:'#ffffffcc' };
const STYLE_XP   = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(9*MOBILE_FONT_SCALE), fill:'#ffffff' };
const STYLE_CD   = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(10*MOBILE_FONT_SCALE), fill:'#ffffff4d' };
const STYLE_COMBO = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(26*MOBILE_FONT_SCALE), fill:'#ffaa00', fontWeight:'bold' };
const STYLE_SW_W  = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(28*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_SW_CD = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(20*MOBILE_FONT_SCALE), fill:'#ff8800' };
const STYLE_SW_T  = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(18*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_SW_R  = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(13*MOBILE_FONT_SCALE), fill:'#ff8800' };
const STYLE_I_SUB = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(14*MOBILE_FONT_SCALE), fill:'#00aaff' };
const STYLE_I_BIG = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(48*MOBILE_FONT_SCALE), fill:'#ffffff', fontWeight:'bold' };
const STYLE_I_WRD = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(28*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_I_CREDIT = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(10*MOBILE_FONT_SCALE), fill:'#88aacc' };
const STYLE_MM    = { fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(9*MOBILE_FONT_SCALE), fill:'#0282ff73' };

function initDisplay() {
  worldContainer.removeChildren();
  entityContainer.removeChildren();
  particleContainer.removeChildren();
  playerContainer.removeChildren();
  hudContainer.removeChildren();
  minimapContainer.removeChildren();
  introContainer.removeChildren();

  // Create terrain tiling sprites for each biome
  const MAP_SIZE = MAP_BOUND * 2;
  const TILE_SIZE = 256;
  for (const biomeId of ['forest', 'desert', 'ice', 'swamp']) {
    const tex = SpriteGen.getTerrainTexture(biomeId);
    if (tex) {
      const tilingSprite = new PIXI.TilingSprite(tex);
      tilingSprite.x = -MAP_BOUND;
      tilingSprite.y = -MAP_BOUND;
      tilingSprite.width = MAP_SIZE;
      tilingSprite.height = MAP_SIZE;
      tilingSprite.alpha = 0;
      tilingSprite.tileScale.x = 4;
      tilingSprite.tileScale.y = 4;
      terrainSprites[biomeId] = tilingSprite;
      worldContainer.addChildAt(tilingSprite, 0);
    }
  }

  worldGfx = new PIXI.Graphics();
  worldContainer.addChild(worldGfx);

  xpGfx = new PIXI.Graphics();
  entityContainer.addChild(xpGfx);

  chestGfx = new PIXI.Graphics();
  entityContainer.addChild(chestGfx);

  bulletGfx = new PIXI.Graphics();
  entityContainer.addChild(bulletGfx);
  if (!IS_MOBILE && typeof PIXI.filters.BloomFilter !== 'undefined') {
    bulletGfx.filters = [new PIXI.filters.BloomFilter({ strength: 2, quality: 3, brightness: 1.5 })];
    bulletGfx.filterArea = app.renderer.screen;
  }

  // Enemy sprites pool
  enemySprites = [];
  for (let i = 0; i < 500; i++) {
    const spr = new PIXI.Sprite(SpriteGen.textures.enemy);
    spr.visible = false;
    spr.anchor.set(0.5);
    entityContainer.addChild(spr);
    enemySprites.push(spr);
  }

  enemyGfx = new PIXI.Graphics();
  entityContainer.addChild(enemyGfx);

  orbitGfx = new PIXI.Graphics();
  playerContainer.addChild(orbitGfx);

  playerGfx = new PIXI.Graphics();
  playerContainer.addChild(playerGfx);

  shieldGfx = new PIXI.Graphics();
  playerContainer.addChild(shieldGfx);

  frostAuraGfx = new PIXI.Graphics();
  playerContainer.addChild(frostAuraGfx);

  novaRingGfx = new PIXI.Graphics();
  playerContainer.addChild(novaRingGfx);

  particleGfx = new PIXI.Graphics();
  particleContainer.addChild(particleGfx);

  particleAddGfx = new PIXI.Graphics();
  particleAddGfx.blendMode = 'add';
  particleContainer.addChild(particleAddGfx);

  ambientGfx = new PIXI.Graphics();
  particleContainer.addChild(ambientGfx);

  fxGfx = new PIXI.Graphics();
  particleContainer.addChild(fxGfx);

  hudGfx = new PIXI.Graphics();
  hudContainer.addChild(hudGfx);

  transitionGfx = new PIXI.Graphics();
  hudContainer.addChild(transitionGfx);

  minimapGfx = new PIXI.Graphics();
  minimapContainer.addChild(minimapGfx);

  introGfx = new PIXI.Graphics();
  introContainer.addChild(introGfx);

  initBossDisplay();

  // ── HUD Text objects ──
  // Remove old texts
  hudContainer.children.filter(c => c instanceof PIXI.Text).forEach(c => hudContainer.removeChild(c));
  minimapContainer.children.filter(c => c instanceof PIXI.Text).forEach(c => minimapContainer.removeChild(c));
  introContainer.children.filter(c => c instanceof PIXI.Text).forEach(c => introContainer.removeChild(c));
  // Pre-alloca pool fisso per i buff (max 11 buff × icon + timer = 22 Text)
  buffTexts = [];
  const MAX_BUFFS = BUFFS.length;
  for (let i = 0; i < MAX_BUFFS; i++) {
    const icon = makeText({fontFamily:'sans-serif', fontSize:Math.round(20*MOBILE_BUFF_SCALE), fill:'#ffffff'}, 0, 0, 0.5, 0.5);
    const timer = makeText(STYLE_XP, 0, 0, 0.5, 0);
    icon.visible = false; timer.visible = false;
    hudContainer.addChild(icon); hudContainer.addChild(timer);
    buffTexts.push(icon, timer);
  }

  // Damage text pool (pre-allocated in particleContainer for camera-follow)
  damageTexts = [];
  for (let i = 0; i < DAMAGE_TEXT_POOL; i++) {
    const dt = new PIXI.Text({ text: '', style: { fontFamily:'"Press Start 2P", monospace', fontSize:14, fill:'#ffffff', fontWeight:'bold', stroke:{color:'#000000',width:2} }});
    dt.anchor.set(0.5);
    dt.visible = false;
    dt._lastColor = '';
    dt._lastFontSize = 0;
    particleContainer.addChild(dt);
    damageTexts.push(dt);
  }

  const W = app.renderer.width;
  const H = app.renderer.height;

  txtHp = makeText(STYLE_SM, 20, 27); hudContainer.addChild(txtHp);
  txtLvl = makeText(STYLE_XP, 20, 36); hudContainer.addChild(txtLvl);
  txtTime = makeText(STYLE_MD, W-16, 30, 1, 0); hudContainer.addChild(txtTime);
  txtKills = makeText(STYLE_MD, W-16, 48, 1, 0); hudContainer.addChild(txtKills);
  txtCoords = makeText(STYLE_CD, 16, H-16); hudContainer.addChild(txtCoords);
  txtCombo = makeText(STYLE_COMBO, W/2, H*0.28, 0.5, 0.5); hudContainer.addChild(txtCombo);
  txtComboNext = makeText(STYLE_CD, W/2, H*0.28+26, 0.5, 0); hudContainer.addChild(txtComboNext);
  txtBloodMoon = makeText({fontFamily:'"Press Start 2P", monospace', fontSize:Math.round(36*MOBILE_FONT_SCALE), fill:'#ff3355', fontWeight:'bold'}, W/2, H/2, 0.5, 0.5); hudContainer.addChild(txtBloodMoon);

  txtSwarmWarn = makeText(STYLE_SW_W, W/2, 80, 0.5, 0.5); hudContainer.addChild(txtSwarmWarn);
  txtSwarmCountdown = makeText(STYLE_SW_CD, W/2, 110, 0.5, 0.5); hudContainer.addChild(txtSwarmCountdown);
  txtSwarmTitle = makeText(STYLE_SW_T, W/2, 58, 0.5, 0.5); hudContainer.addChild(txtSwarmTitle);
  txtSwarmRemain = makeText(STYLE_SW_R, W/2, 94, 0.5, 0.5); hudContainer.addChild(txtSwarmRemain);

  txtIntroSub = makeText(STYLE_I_SUB, W/2, H/2-38, 0.5, 0.5); introContainer.addChild(txtIntroSub);
  txtIntroBig = makeText(STYLE_I_BIG, W/2, H/2, 0.5, 0.5); introContainer.addChild(txtIntroBig);
  txtIntroWord = makeText(STYLE_I_WRD, W/2, H/2+46, 0.5, 0.5); introContainer.addChild(txtIntroWord);
  txtIntroCredit = makeText(STYLE_I_CREDIT, W/2, H/2+76, 0.5, 0.5); introContainer.addChild(txtIntroCredit);

  txtMinimapLabel = makeText(STYLE_MM, W-MINIMAP_SIZE-16+MINIMAP_SIZE/2, H-MINIMAP_SIZE-16+MINIMAP_SIZE+12, 0.5, 0); minimapContainer.addChild(txtMinimapLabel);

}

function updatePlayerWeaponFlags() {
  player._hasOrbit = player.weapons.some(w => w.type === 'orbit');
}

function initGame() {
  const cls = selectedClass;
  player = {
    x:0, y:0,
    hp: cls.stats.hp, maxHp: cls.stats.hp,
    speed: PLAYER_SPEED * cls.stats.speed,
    bulletDmg: cls.stats.dmg, multiShot:1,
    magnetRange: cls.stats.magnetRange,
    xp:0, xpNext:XP_PER_LEVEL,
    level:1, damageCd:0, lastHitTime:0, angle:0,
    weapons: cls.startWeapons.map(w=>({...w})),
    _regen:false, _invuln:false, _frost:false, _vampire:false, _pierce:false, _nova:false, _crit:false,
    _boundaryWarned:false,
    upgradeCount: {},
    takenEvolutions: {},
    classColor: cls.color,
  };
  updatePlayerWeaponFlags();
  camera.x = -app.renderer.width/2;
  camera.y = -app.renderer.height/2;
  camera.shakeX=camera.shakeY=camera.shakeMag=camera.shakeDur=0;
  bullets=[]; enemies=[]; xpGems=[]; particles=[]; fxEffects=[];
  chests=[]; activeBuffs=[]; novaTimer=0; _paused=false;
  initPools();
  resetBoss();
  _cachedNearest = null;
  _frostedEnemies.clear();
  _minimapCacheKey = '';
  _minimapBioCache.length = 0;
  gameTime=0; totalKills=0; combo=0; comboTimer=0;
  swarmTimer=0; swarmPhase='idle'; swarmCountdown=0;
  eliteCheckTimer = 90;
  bloodMoonNextAt = 12*60 + Math.random()*(6*60);
  bloodMoonTimer = 0; bloodMoonActive = false; bloodMoonAnnounceTimer = 0;
  state='intro'; introTime=0; introSpawned=false; lastTime=null;
  transition.active = false;
  generateObstacles();
  injectArenaZones();
  spatialBuildObstacles(obstacles);
  document.getElementById('gameover').classList.remove('active');
  document.getElementById('levelup').classList.remove('active');
  initDisplay();
  initObstacleSprites(worldContainer);
  if (!_loopScheduled) { _loopScheduled = true; requestAnimationFrame(loop); }
}

// ── Enemy behavior selection ──────────────────────────
function pickBehavior(bDef, isElite) {
  const w = bDef.behaviorWeights || { chaser:1 };
  const roll = Math.random();
  let cum = 0;
  for (const [behav, weight] of Object.entries(w)) {
    cum += weight;
    if (roll < cum) return isElite && behav === 'chaser' && Math.random() < 0.5 ? 'charger' : behav;
  }
  return 'chaser';
}

// ── Spawn ───────────────────────────────────────────────
function spawnEnemy() {
  if (enemies.length >= MAX_ENEMIES) return;
  const W = app.renderer.width;
  const H = app.renderer.height;
  const angle = Math.random()*Math.PI*2;
  const dist  = Math.max(W, H)*0.62 + Math.random()*200;
  const wx    = player.x + Math.cos(angle)*dist;
  const wy    = player.y + Math.sin(angle)*dist;

  const biome = getDominantBiome(getBiomeWeights(wx, wy));
  const bDef  = BIOMES[biome];

  const scale = 1 + gameTime/60;
  const es = enemySizeScale();
  const hp    = Math.ceil(5*Math.pow(scale,0.85) * bDef.hpMult * es);
  const spd   = ENEMY_BASE_SPD*(1+gameTime/180) * bDef.spdMult;
  const isBig = Math.random() < (gameTime >= 60 ? 0.25 : 0.08);
  const variants = isBig ? bDef.enemyBigTypes : bDef.enemyTypes;
  const roll = Math.random();
  let cumW = 0, pickedType = variants[0].type, pickedSlime = bDef[isBig ? 'enemyBigSlime' : 'enemySlime'];
  for (const v of variants) {
    cumW += v.w;
    if (roll < cumW) { pickedType = v.type; break; }
  }

  const behavior = pickBehavior(bDef, false);

  enemies.push({
    x:wx, y:wy, hp, maxHp:hp,
    speed:isBig?spd*0.7:spd,
    radius:Math.ceil((isBig?16:8) * es), angle:0, isBig,
    biome, behavior,
    behaviorTimer: 2 + Math.random() * 2,
    behaviorActive: false,
    slimeType: pickedType === 'slime' ? pickedSlime : (isBig ? 2 : 1),
    enemyType: pickedType,
    enemyTint: bDef[isBig ? 'enemyBigTint' : 'enemyTint'],
    xpMult: bDef.xpMult,
  });
}

// Spawn di un Elite (nemico raro con HP x6 e drop chest garantito)
function spawnElite() {
  if (enemies.length >= MAX_ENEMIES) return;
  const W = app.renderer.width;
  const H = app.renderer.height;
  const angle = Math.random()*Math.PI*2;
  const dist  = Math.max(W, H)*0.62 + Math.random()*200;
  const wx    = player.x + Math.cos(angle)*dist;
  const wy    = player.y + Math.sin(angle)*dist;
  const biome = getDominantBiome(getBiomeWeights(wx, wy));
  const bDef  = BIOMES[biome];
  const scale = 1 + gameTime/60;
  const es = enemySizeScale();
  const hp    = Math.ceil(5*Math.pow(scale,0.85) * bDef.hpMult * 6 * es);
  const spd   = ENEMY_BASE_SPD*(1+gameTime/180) * bDef.spdMult * 1.2;
  const variants = bDef.enemyBigTypes;
  const roll = Math.random();
  let cumW = 0, pickedType = variants[0].type;
  for (const v of variants) { cumW += v.w; if (roll < cumW) { pickedType = v.type; break; } }
  enemies.push({
    x:wx, y:wy, hp, maxHp:hp,
    speed:spd,
    radius:Math.ceil(22 * es), angle:0, isBig:true, isElite:true,
    biome,
    slimeType: pickedType === 'slime' ? bDef.enemyBigSlime : 2,
    enemyType: pickedType,
    enemyTint: 0xffcc33,
    xpMult: bDef.xpMult * 3,
  });
  sfx('eliteSpawn');
}

let _cachedNearest = null;

function nearestEnemy() {
  let best=null, bestDSq=Infinity;
  const px=player.x, py=player.y;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dx=e.x-px, dy=e.y-py, dSq=dx*dx+dy*dy;
    if (dSq<bestDSq) { bestDSq=dSq; best=e; }
  }
  return best;
}

function fireBullet(wx, wy, angle, dmg, trailColor=0) {
  const b = _acquireBullet();
  b.x=wx; b.y=wy; b.vx=Math.cos(angle)*BULLET_SPEED; b.vy=Math.sin(angle)*BULLET_SPEED;
  b.life=BULLET_LIFE; b.dmg=dmg; b.radius=4; b.pierced=null;
  b._trailColor=trailColor; b._trailType=trailColor?1:0;
  bullets.push(b);
  // Muzzle flash (3 spark particles with ADD blend)
  for (let i=0; i<3; i++) {
    const p = _acquireParticle();
    const a = angle + (Math.random()-0.5)*0.8;
    const s = 40 + Math.random()*80;
    p.x=wx; p.y=wy;
    p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
    p.life=0.08+Math.random()*0.06; p.maxLife=p.life;
    p.r=2+Math.random()*2; p.color=0xffdd88;
    p.shape=1; p.blendAdd=1; p.startR=0; p.rotation=a;
    particles.push(p);
  }
}

function handleWeapons(dt) {
  const target = _cachedNearest;
  const aim = target ? Math.atan2(target.y-player.y, target.x-player.x) : player.angle;
  const cdMul = player._comboFireRate ? 0.9 : 1;
  const dmgMul = player._comboDmg ? 1.25 : 1;
  const extraShot = player._comboMulti ? 1 : 0;
  const eDmg = player.bulletDmg * dmgMul;
  for (const w of player.weapons) {
    w.timer -= dt;
    if (w.timer>0) continue;
    if (w.type==='gun') {
      w.timer=w.cd*cdMul;
      const shots = player.multiShot + extraShot;
      for (let i=0; i<shots; i++) {
        const sp=(i-(shots-1)/2)*0.18;
        fireBullet(player.x, player.y, aim+sp, eDmg, 0xffdc3c);
      }
      sfx('gunFire');
    }
    if (w.type==='spread') {
      w.timer=w.cd*cdMul;
      const extra = extraShot;
      for (let i=-1-extra; i<=1+extra; i++) fireBullet(player.x, player.y, aim+i*0.28, eDmg, 0xff8844);
      sfx('spreadFire');
    }
    if (w.type==='whip') {
      w.timer = w.cd*cdMul;
      fireWhip(aim, eDmg * 2, w.range || 90, false);
    }
    if (w.type==='whip_reaper') {
      w.timer = w.cd*cdMul;
      fireWhip(aim, eDmg * 2.5, w.range || 110, true);
    }
    if (w.type==='spread_nova') {
      w.timer = w.cd*cdMul;
      const N = 7;
      for (let i=0; i<N; i++) fireBullet(player.x, player.y, aim + (i - (N-1)/2)*(Math.PI*2/N), eDmg, 0xffaa22);
      sfx('spreadFire');
    }
    if (w.type==='missile') {
      w.timer = w.cd*cdMul;
      fireMissile(aim, eDmg * 3);
    }
    if (w.type==='chain') {
      w.timer = w.cd*cdMul;
      fireChain(eDmg * 1.5);
    }
  }
}

// Whip: AoE cono 180° davanti al player (usa spatial grid)
function fireWhip(aim, dmg, range, reaper) {
  const near = spatialNearby(player.x, player.y, range);
  const nLen = spatialNearbyCount();
  const coneHalf = Math.PI/2;
  for (let i = 0; i < nLen; i++) {
    const e = near[i];
    const dx = e.x - player.x, dy = e.y - player.y;
    const d2 = dx*dx + dy*dy;
    if (d2 > range*range) continue;
    const a = Math.atan2(dy, dx);
    let da = a - aim;
    while (da > Math.PI) da -= 2*Math.PI;
    while (da < -Math.PI) da += 2*Math.PI;
    if (Math.abs(da) > coneHalf) continue;
    const dmgApplied = (player._crit && Math.random()<0.25) ? dmg*5 : dmg;
    const preHp = e.hp;
    e.hp -= dmgApplied;
    spawnParticles(e.x, e.y, reaper?'#ff66aa':'#ffcc66', reaper?6:4);
    spawnDamageNumber(e.x, e.y, dmgApplied, reaper?'#ff66aa':'#ffcc66', dmgApplied > dmg);
    if (reaper && preHp > 0 && e.hp <= 0) {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    }
  }
  fxEffects.push({ type:'whip', x:player.x, y:player.y, aim, range, life:0.18, maxLife:0.18 });
  sfx(reaper ? 'whipReaper' : 'whipSwing');
}

// Missile: proiettile con homing, usa il bullet pool esistente
function fireMissile(aim, dmg) {
  const b = _acquireBullet();
  b.x = player.x; b.y = player.y;
  b.vx = Math.cos(aim) * BULLET_SPEED * 0.55;
  b.vy = Math.sin(aim) * BULLET_SPEED * 0.55;
  b.life = 4; b.dmg = dmg; b.radius = 5; b.pierced = null;
  b.homing = true; b._trailColor = 0xff5522; b._trailType = 2;
  bullets.push(b);
  sfx('missileLaunch');
}

// Lightning chain: salta fino a 4 nemici vicini
function fireChain(dmg) {
  const first = _cachedNearest;
  if (!first) return;
  const hits = [{x:player.x, y:player.y}];
  let current = first;
  let curDmg = dmg;
  const MAX_JUMPS = 4, HOP = 120;
  const visited = new Set();
  for (let j = 0; j < MAX_JUMPS && current; j++) {
    const chainDmg = (player._crit && Math.random()<0.25) ? curDmg*5 : curDmg;
    current.hp -= chainDmg;
    spawnParticles(current.x, current.y, '#88ccff', 8);
    spawnDamageNumber(current.x, current.y, chainDmg, '#88ccff', chainDmg > curDmg);
    hits.push({x:current.x, y:current.y});
    visited.add(current);
    curDmg *= 0.8;
    // prossimo target: nemico piu' vicino a "current" non ancora colpito
    let next = null, bestD = HOP*HOP;
    const near = spatialNearby(current.x, current.y, HOP);
    const nLen = spatialNearbyCount();
    for (let i = 0; i < nLen; i++) {
      const c = near[i];
      if (visited.has(c)) continue;
      const dx = c.x - current.x, dy = c.y - current.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < bestD) { bestD = d2; next = c; }
    }
    current = next;
  }
  fxEffects.push({ type:'chain', points:hits, life:0.25, maxLife:0.25 });
  sfx('chainZap');
}

// ── Update ──────────────────────────────────────────────
function update(dt) {
  gameTime += dt;
  _frameCount++;

  // ── Run timer — vittoria a 30 minuti ──
  if (gameTime >= RUN_DURATION) { triggerVictory(); return; }

  // ── Boss spawn ──
  checkBossSpawn();

  // ── Boss update ──
  updateBosses(dt);
  if (player.hp <= 0) return;

  // Music phase: boss > swarm > gameplay
  if (bosses.length > 0) setMusicPhase('boss');
  else if (swarmPhase === 'active') setMusicPhase('swarm');
  else if (_currentMusic === 'boss' || _currentMusic === 'swarm') setMusicPhase('gameplay');

  // ── Blood Moon (evento one-shot tra 12-18 min) ──
  if (!bloodMoonActive && gameTime >= bloodMoonNextAt && bloodMoonNextAt > 0) {
    bloodMoonActive = true; bloodMoonTimer = 45; bloodMoonAnnounceTimer = 2.5;
    screenShake(10, 0.5);
    sfx('bloodMoonStart');
  }
  if (bloodMoonActive) {
    bloodMoonTimer -= dt;
    if (bloodMoonAnnounceTimer > 0) bloodMoonAnnounceTimer -= dt;
    if (bloodMoonTimer <= 0) { bloodMoonActive = false; bloodMoonNextAt = -1; }
  }
  const bmMul = bloodMoonActive ? 1.8 : 1;

  // ── Elite Hunt (ogni 90s, 40% chance se non-swarm e no boss) ──
  eliteCheckTimer -= dt;
  if (eliteCheckTimer <= 0) {
    eliteCheckTimer = 90;
    if (swarmPhase === 'idle' && bosses.length === 0 && Math.random() < 0.4) {
      spawnElite();
    }
  }

  // ── Swarm event logic ──
  swarmTimer += dt;
  if (swarmPhase === 'idle') {
    const nextAt = (Math.floor(gameTime / SWARM_INTERVAL) + 1) * SWARM_INTERVAL;
    const timeTo = nextAt - gameTime;
    if (timeTo <= SWARM_WARN) { swarmPhase = 'warn'; swarmCountdown = timeTo; sfx('swarmAlarm'); }
    if (Math.random() < 0.032 * bmMul * Math.min(SPAWN_CAP, 1 + gameTime / 60)) spawnEnemy();
  } else if (swarmPhase === 'warn') {
    swarmCountdown -= dt;
    if (Math.random() < 0.02 * bmMul * Math.min(SPAWN_CAP, 1 + gameTime / 60)) spawnEnemy();
    if (swarmCountdown <= 0) {
      swarmPhase = 'active'; swarmCountdown = SWARM_DURATION;
      for (let i = 0; i < Math.min(80, 20 + Math.floor(gameTime / 30) * 5); i++) spawnEnemy();
      screenShake(14, 0.5);
      sfx('swarmStart');
    }
  } else if (swarmPhase === 'active') {
    swarmCountdown -= dt;
    if (Math.random() < SWARM_RATE * bmMul * Math.min(SPAWN_CAP_SWARM, 1 + gameTime / 120)) spawnEnemy();
    if (swarmCountdown <= 0) { swarmPhase = 'idle'; swarmTimer = 0; }
  }

  // ── Rebuild spatial grid for enemies (ogni 2 frame) ──
  if ((_frameCount & 1) === 0) spatialRebuild(enemies);

  let dx=0, dy=0;
  // Keyboard input
  if (keys['w']||keys['ArrowUp'])    dy-=1;
  if (keys['s']||keys['ArrowDown'])  dy+=1;
  if (keys['a']||keys['ArrowLeft'])  dx-=1;
  if (keys['d']||keys['ArrowRight']) dx+=1;
  // Touch joystick overrides if active
  if (touchJoystick.active) {
    const jd = Math.hypot(touchJoystick.dx, touchJoystick.dy);
    if (jd > JOYSTICK_DEAD) {
      dx = touchJoystick.dx / JOYSTICK_MAX_R;
      dy = touchJoystick.dy / JOYSTICK_MAX_R;
    }
  }
  if (dx||dy) {
    const len=Math.hypot(dx,dy);
    const tryX = player.x + (dx/len)*player.speed*dt;
    const tryY = player.y + (dy/len)*player.speed*dt;

    const { canMoveX, canMoveY } = resolvePlayerObstacles(player.x, player.y, tryX, tryY, 12);
    if (canMoveX) player.x = tryX;
    if (canMoveY) player.y = tryY;
    if (canMoveX || canMoveY) player.angle = Math.atan2(dy, dx);
  }
  // Clamp player to map boundaries
  const prevX = player.x, prevY = player.y;
  player.x = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, player.x));
  player.y = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, player.y));
  if ((player.x !== prevX || player.y !== prevY) && !player._boundaryWarned) {
    player._boundaryWarned = true;
    sfx('boundaryHit');
  }
  if (player.x === prevX && player.y === prevY) player._boundaryWarned = false;
  updateCamera(dt);
  _cachedNearest = nearestEnemy();
  handleWeapons(dt);

  // ── Bullet update + collision (using spatial grid) ──
  const screenMax = Math.max(app.renderer.width, app.renderer.height);
  for (const b of bullets) {
    if (b.homing) {
      const t = _cachedNearest;
      if (t) {
        const ang = Math.atan2(t.y-b.y, t.x-b.x);
        const sp = BULLET_SPEED * 0.55;
        b.vx = b.vx*0.88 + Math.cos(ang)*sp*0.12;
        b.vy = b.vy*0.88 + Math.sin(ang)*sp*0.12;
      }
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    // Trail particles
    if (b._trailType && Math.random() < 0.35) {
      const p = _acquireParticle();
      p.x = b.x; p.y = b.y;
      p.vx = (Math.random()-0.5) * 10;
      p.vy = (Math.random()-0.5) * 10;
      p.life = 0.12 + Math.random() * 0.1;
      p.maxLife = p.life;
      p.r = 1.5 + Math.random() * 1.5;
      p.color = b._trailColor;
      p.shape = 0;
      p.blendAdd = 1;
      p.startR = 0;
      p.rotation = 0;
      particles.push(p);
    }
  }
  compactInPlace(bullets, b => {
    if (b.life<=0) { _releaseBullet(b); return false; }
    if (b.x-player.x > screenMax || player.x-b.x > screenMax || b.y-player.y > screenMax || player.y-b.y > screenMax) { _releaseBullet(b); return false; }
    const nearEnemies = spatialNearby(b.x, b.y, b.radius + 20);
    const nearLen = spatialNearbyCount();
    for (let i = 0; i < nearLen; i++) {
      const e = nearEnemies[i];
      if (b.pierced && b.pierced.has(e)) continue;
      const bex = b.x-e.x, bey = b.y-e.y;
      const minD = e.radius+b.radius;
      if (bex*bex+bey*bey < minD*minD) {
        const dmg = (player._crit && Math.random()<0.25) ? b.dmg*5 : b.dmg;
        e.hp -= dmg;
        e.hitFlash = 0.08;
        const isCritHit = player._crit && dmg>b.dmg;
        if (isCritHit) sfx('critHit');
        spawnParticles(b.x,b.y, isCritHit ? '#ffff00' : '#ffaa00', isCritHit ? 6 : 3);
        spawnDamageNumber(e.x, e.y, dmg, player._crit && dmg>b.dmg ? '#ffff00' : '#ffaa00', dmg > b.dmg);
        if (player._pierce) {
          if (!b.pierced) b.pierced = new Set();
          b.pierced.add(e);
        } else { _releaseBullet(b); return false; }
      }
    }
    return true;
  });

  // ── Orbit shield (spatial grid) ──
  if (player._hasOrbit) {
    const orbitR=62;
    const nearE = spatialNearby(player.x, player.y, orbitR);
    const nLen = spatialNearbyCount();
    for (let i = 0; i < nLen; i++) nearE[i].hp -= player.bulletDmg*dt*3;
  }

  // ── Enemy movement (spatial grid for flocking + obstacles) ──
  const swarmActive = swarmPhase === 'active';
  const maxActiveDist = screenMax * 1.5;
  for (let ei = 0; ei < enemies.length; ei++) {
    const e = enemies[ei];
    if (e.hitFlash > 0) e.hitFlash -= dt;
    const edx=player.x-e.x, edy=player.y-e.y, moveDist=Math.hypot(edx,edy)||1;

    // Skip distant enemies (simplified update only)
    if (!e.dying && moveDist > maxActiveDist) {
      e.angle = Math.atan2(edy, edx);
      continue;
    }

    let mx=(edx/moveDist), my=(edy/moveDist);

    // Flocking (separation, alignment, cohesion) - SEMPRE attivo, non solo durante swarm
    {
      let sepX=0,sepY=0,sepN=0, aDx=0,aDy=0,aN=0, cx=0,cy=0,cN=0;
      const near = spatialNearby(e.x, e.y, FLOCK_RADIUS);
      const nLen = spatialNearbyCount();
      for (let i = 0; i < nLen; i++) {
        const o = near[i];
        if (o===e) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d > FLOCK_RADIUS) continue;

        // Separation (inverse-square)
        if (d < FLOCK_SEPARATION && d > 0) {
          const force = 1 / (d * d + 0.1);
          sepX += (e.x - o.x) * force;
          sepY += (e.y - o.y) * force;
          sepN++;
        }

        // Alignment + cohesion accumulators
        aDx += Math.cos(o.angle); aDy += Math.sin(o.angle); aN++;
        cx += o.x; cy += o.y; cN++;

        // Soft push on movement vector
        if (d < ENEMY_PUSH_RADIUS && d > 0.1) {
          const overlap = 1 - d / ENEMY_PUSH_RADIUS;
          mx += (dx / d) * overlap * ENEMY_PUSH_FORCE;
          my += (dy / d) * overlap * ENEMY_PUSH_FORCE;
        }

        // Hard collision — physically separate overlapping enemies
        const minDist = e.radius + o.radius;
        if (d < minDist && d > 0) {
          const pushOut = (minDist - d) / 2;
          const nx = dx / d, ny = dy / d;
          e.x += nx * pushOut;
          e.y += ny * pushOut;
          o.x -= nx * pushOut;
          o.y -= ny * pushOut;
        }
      }
      if (sepN>0) { mx+=sepX/sepN*1.5; my+=sepY/sepN*1.5; }
      if (aN>0) { const l=Math.hypot(aDx,aDy)||1; mx+=aDx/l*FLOCK_ALIGNMENT_W*aN; my+=aDy/l*FLOCK_ALIGNMENT_W*aN; }
      if (cN>0) { mx+=(cx/cN-e.x)*FLOCK_COHESION_W; my+=(cy/cN-e.y)*FLOCK_COHESION_W; }
    }

    // ── Behavior-specific movement overrides ──
    if (e.behavior === 'charger') {
      e.behaviorTimer -= dt;
      if (e.behaviorActive) {
        // Charging: burst toward player
        mx *= 3; my *= 3;
        if (e.behaviorTimer <= 0) {
          e.behaviorActive = false;
          e.behaviorTimer = 2.0 + Math.random() * 2.0;
        }
      } else if (e.behaviorTimer <= 0 && moveDist < 350) {
        // Start charge
        e.behaviorActive = true;
        e.behaviorTimer = 0.5 + Math.random() * 0.3;
      }
    } else if (e.behavior === 'orbiter') {
      const ORBIT_DIST = 180;
      if (moveDist < ORBIT_DIST * 0.7) {
        // Too close: flee
        mx = -mx; my = -my;
      } else if (moveDist < ORBIT_DIST * 1.3) {
        // At orbit: perpendicular force = circle
        const perpX = -my, perpY = mx;
        mx = perpX * 0.5 + mx * 0.3;
        my = perpY * 0.5 + my * 0.3;
      }
      // else too far: chase normally
    }

    if (!e._frozen) {
      const spd = e.speed * (swarmActive ? SWARM_SPEED_MULT : 1);
      const ml=Math.hypot(mx,my)||1;
      e.x+=(mx/ml)*spd*dt; e.y+=(my/ml)*spd*dt;
    }
    e.angle=Math.atan2(edy,edx);

    // Slide around obstacles (spatial grid) — skip for distant enemies
    if (moveDist < screenMax) resolveEnemyObstacles(e);

    // Check damage using CURRENT position (after movement + obstacle push)
    const dist=Math.hypot(player.x-e.x, player.y-e.y);
    if (player.damageCd<=0 && !player._invuln && dist<e.radius+12) {
      const dmgIn = e.isBig?2:1;
      player.hp-=dmgIn; player.damageCd=DAMAGE_CD;
      player.lastHitTime = _frameNowMs / 1000;
      screenShake(e.isBig?11:7, 0.25);
      spawnParticles(player.x,player.y,'#ff4444',6);
      sfx('playerHit');
      // Aegis Orb evolution: riflette 30% del danno ai nemici vicini agli orb (raggio 62)
      if (player._aegis) {
        const reflR = 62;
        const near = spatialNearby(player.x, player.y, reflR);
        const nLen = spatialNearbyCount();
        const refl = dmgIn * 0.3 * (1 + player.bulletDmg * 0.5);
        let hitCount = 0;
        for (let i = 0; i < nLen; i++) {
          near[i].hp -= refl;
          spawnParticles(near[i].x, near[i].y, '#99ccff', 3);
          hitCount++;
        }
        if (hitCount > 0) sfx('aegisReflect');
      }
      if (player.hp<=0) { triggerGameOver(); return; }
    }
  }
  if (player.damageCd>0) player.damageCd-=dt;

  // ── Enemy death/cull (compactInPlace) ──
  compactInPlace(enemies, e => {
    if (e.dying) {
      e.deathTimer -= dt;
      e.x += (e.deathVx || 0) * dt;
      e.y += (e.deathVy || 0) * dt;
      if (e.deathTimer > 0) return true;
      // Death timer expired: spawn FX and remove
      const rawType = (e.enemyType || 'slime').replace(/[0-9]/g, '');
      const fx = ENEMY_DEATH_FX[rawType] || ENEMY_DEATH_FX.slime;
      const isBig = e.isBig || false;
      const dCount = isBig ? Math.ceil(fx.bigCount * 0.6) : Math.ceil(fx.count * 0.6);
      const dColor = isBig ? fx.bigColor : fx.color;
      const dShape = isBig ? fx.bigShape : fx.shape;
      spawnParticlesEx(e.x, e.y, dColor, dCount, { shape: dShape, speedBase: 40, speedVar: 60, lifeBase: 0.5 });
      if (isBig) {
        spawnParticlesEx(e.x, e.y, dColor, 5, { shape: 2, ringExpand: true, speedBase: 60, blendAdd: true });
      }
      const biome = _framePlayerBiome || 'forest';
      const bBurst = BIOME_DEATH_BURST[biome] || BIOME_DEATH_BURST.forest;
      spawnParticlesEx(e.x, e.y, bBurst.color, bBurst.count, { shape: bBurst.shape, ringExpand: bBurst.ringExpand || false, speedBase: 40 });

      // Exploder: AoE blast on death
      if (e.behavior === 'exploder') {
        const blastR = 80;
        for (const other of enemies) {
          if (other === e || other.dying) continue;
          if (Math.hypot(other.x - e.x, other.y - e.y) < blastR) {
            other.hp -= 30;
            spawnParticles(other.x, other.y, '#ff6600', 3);
          }
        }
        if (Math.hypot(player.x - e.x, player.y - e.y) < blastR + 12 && !player._invuln) {
          player.hp -= 2;
          player.damageCd = DAMAGE_CD;
          spawnParticles(player.x, player.y, '#ff4444', 6);
        }
        screenShake(10, 0.3);
        sfx('eliteDeath');
        spawnParticlesEx(e.x, e.y, 0xff6600, 20, { shape: 2, ringExpand: true, speedBase: 80, blendAdd: true });
      }

      sfx(e.isElite ? 'eliteDeath' : (e.isBig ? 'bigEnemyDeath' : 'enemyDeath'));
      const xpBM = bloodMoonActive ? 2 : 1;
      xpGems.push({ x:e.x, y:e.y, value:Math.ceil((e.isBig?3:1) * (e.xpMult || 1) * xpBM) });
      totalKills++;
      const prevCombo = combo;
      combo++;
      comboTimer=COMBO_DECAY;
      const prevTier = COMBO_TIERS.filter(t => prevCombo >= t.at).length;
      const newTier = COMBO_TIERS.filter(t => combo >= t.at).length;
      if (newTier > prevTier) sfx('comboTierUp');
      applyComboTiers(player, combo);
      if (player._vampire) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        sfx('vampireHeal');
      }
      if (e.isBig) screenShake(e.isElite?18:13, e.isElite?0.55:0.4);
      const dropChance = e.isElite ? 1 : (e.isBig ? CHEST_BIG_DROP : CHEST_DROP_CHANCE);
      if (Math.random() < dropChance && chests.length < 5) chests.push({ x:e.x, y:e.y, bob:Math.random()*Math.PI*2 });
      if (e.isElite) {
        for (let g = 0; g < 3; g++) xpGems.push({ x:e.x + (Math.random()-0.5)*30, y:e.y + (Math.random()-0.5)*30, value:Math.ceil(8*xpBM) });
      }
      return false;
    }
    if (e.hp>0) return Math.hypot(e.x-player.x,e.y-player.y)<CULL_DESPAWN;
    // Start death animation
    e.dying = true;
    e.deathTimer = 0.25;
    e.deathVx = (Math.random() - 0.5) * 60;
    e.deathVy = (Math.random() - 0.5) * 60;
    e.deathSpin = (Math.random() - 0.5) * 15;
    return true;
  });

  if (comboTimer>0) {
    comboTimer-=dt;
    if (comboTimer<=0) {
      if (combo > 0) sfx('comboBreak');
      combo=0;
      clearComboTiers(player);
    }
  }

  // ── XP gems (compactInPlace) ──
  compactInPlace(xpGems, g => {
    const d=Math.hypot(g.x-player.x,g.y-player.y);
    if (d<player.magnetRange) {
      if (!g.picked) {
        g.picked = true;
        g.pickupT = 0.12;
        spawnParticlesEx(g.x, g.y, 0x00ff88, 6, { shape: 0, speedBase: 20, speedVar: 40, lifeBase: 0.2 });
        sfx('xpCollect');
      }
    }
    if (g.picked) {
      g.pickupT -= dt;
      g.x += (player.x - g.x) * 10 * dt;
      g.y += (player.y - g.y) * 10 * dt;
      if (g.pickupT <= 0) { player.xp += g.value; return false; }
      return true;
    }
    if (d > 0 && d<player.magnetRange*3.5) {
      g.x+=((player.x-g.x)/d)*130*dt; g.y+=((player.y-g.y)/d)*130*dt;
    }
    return d<CULL_DESPAWN;
  });

  // ── Particles (compactInPlace) ──
  compactInPlace(particles, p => {
    if (p.life <= 0) { _releaseParticle(p); return false; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.91; p.vy*=0.91; p.life-=dt; return true;
  });

  // ── FX transienti ──
  compactInPlace(fxEffects, f => { f.life -= dt; return f.life > 0; });

  // ── Damage numbers update ──
  for (let i = 0; i < damageTexts.length; i++) damageTexts[i].visible = false;
  compactInPlace(damageNumbers, (d) => {
    d.y += d.vy * dt;
    d.vy += 120 * dt; // gravity
    d.life -= dt;
    const t = Math.max(0, d.life / d.maxLife);
    const txt = d.txt;
    txt.visible = true;
    txt.text = d.isCrit ? '💥' + Math.ceil(d.amount) : '' + Math.ceil(d.amount);
    const newColor = d.color;
    const newSize = d.isCrit ? 20 : 14;
    if (txt._lastColor !== newColor) { txt.style.fill = newColor; txt._lastColor = newColor; }
    if (txt._lastFontSize !== newSize) { txt.style.fontSize = newSize; txt._lastFontSize = newSize; }
    txt.x = d.x;
    txt.y = d.y;
    txt.alpha = t;
    return d.life > 0;
  });

  // ── Ambient particles update ──
  compactInPlace(ambientParticles, p => {
    const wobble = Math.sin(p.wobblePhase) * 10;
    p.x += (p.vx + wobble * 0.02) * dt;
    p.y += p.vy * dt;
    p.wobblePhase += dt * 1.5;
    p.life -= dt;
    return p.life > 0;
  });
  // Maintain ambient particle count based on biome
  while (ambientParticles.length < AMBIENT_PARTICLE_COUNT) {
    spawnAmbientParticle(_framePlayerBiome || 'forest');
  }

  if (player.xp>=player.xpNext) {
    player.xp-=player.xpNext; player.xpNext=Math.ceil(player.xpNext*(player.level < 4 ? 1.15 : 1.3));
    player.level++; triggerLevelUp();
  }

  // ── Chest pickup & magnet & buff tick ──
  compactInPlace(chests, ch => {
    const d = Math.hypot(ch.x - player.x, ch.y - player.y);
    if (d < CHEST_PICKUP_RANGE) { openChest(ch); spawnParticles(ch.x, ch.y, '#ffdd00', 14); return false; }
    if (d < CHEST_MAGNET_RANGE) {
      const pull = (1 - d / CHEST_MAGNET_RANGE) * 200 * dt;
      if (d > 0) {
        ch.x += (player.x - ch.x) / d * pull;
        ch.y += (player.y - ch.y) / d * pull;
      }
    }
    ch.bob += dt * 2.5;
    return d < CULL_DESPAWN;
  });

  if (player._regen) player.hp = Math.min(player.maxHp, player.hp + 2 * dt);

  // ── Frost aura (spatial grid + tracked set) ──
  let frostApplied = false;
  if (player._frost) {
    const frostR = 150;
    const nearE = spatialNearby(player.x, player.y, frostR);
    const nLen = spatialNearbyCount();
    for (let i = 0; i < nLen; i++) {
      if (!nearE[i]._frozen) frostApplied = true;
      nearE[i]._frozen = true;
      _frostedEnemies.add(nearE[i]);
    }
    // Unfreeze enemies outside range via tracked set (avoid O(500) scan)
    const toRemove = [];
    for (const e of _frostedEnemies) {
      const ddx = e.x - player.x, ddy = e.y - player.y;
      if (ddx*ddx + ddy*ddy >= frostR*frostR || e.hp <= 0) toRemove.push(e);
    }
    for (const e of toRemove) { e._frozen = false; _frostedEnemies.delete(e); }
  } else {
    for (const e of _frostedEnemies) { e._frozen = false; }
    _frostedEnemies.clear();
  }
  if (frostApplied) sfx('frostBite');

  // ── Nova pulse (spatial grid) ──
  if (player._nova || player._comboNova) {
    novaTimer += dt;
    if (novaTimer >= 2) {
      novaTimer -= 2;
      const novaR = 110;
      const nearE = spatialNearby(player.x, player.y, novaR);
      const nLen = spatialNearbyCount();
      for (let i = 0; i < nLen; i++) nearE[i].hp -= player.bulletDmg * 2;
      spawnParticles(player.x, player.y, '#cc88ff', 20);
      screenShake(4, 0.15);
      sfx('novaPulse');
    }
  } else { novaTimer = 0; }

  // ── Buff tick (compactInPlace) ──
  compactInPlace(activeBuffs, b => { b.remaining -= dt; if (b.remaining <= 0) { b.def.revert(player); return false; } return true; });
}

// ── Level Up / Chest / Game Over ─────────────────────────
function triggerLevelUp() {
  sfx('levelUp');
  transition.active = true; transition.mode = 'in'; transition.timer = 0; transition.nextState = 'levelup';
  document.getElementById('overlay-title').textContent = '⬆ Level Up!';
  const pool = [...UPGRADES].sort(()=>Math.random()-0.5).slice(0,3);

  // Sostituisci una card con evolution (se disponibile, 60% chance)
  const evos = getAvailableEvolutions(player);
  if (evos.length > 0 && Math.random() < 0.6) {
    const evo = evos[Math.floor(Math.random()*evos.length)];
    pool[Math.floor(Math.random()*pool.length)] = { ...evo, _isEvo:true };
  }

  const container=document.getElementById('cards');
  container.innerHTML='';
  for (const upg of pool) {
    const div=document.createElement('div'); div.className='card';
    if (upg._isEvo) {
      div.className = 'card card-evolution';
    }
    div.innerHTML=`<div class="icon">${upg.icon}</div><div class="name">${upg.name}</div><div class="desc">${upg.desc}</div>`;
    div.addEventListener('click',()=>{
      upg.apply(player);
      updatePlayerWeaponFlags();
      if (upg._isEvo) {
        player.takenEvolutions[upg.id] = true;
        sfx('evolution');
      } else {
        player.upgradeCount[upg.id] = (player.upgradeCount[upg.id]||0) + 1;
        sfx('cardSelect');
      }
      document.getElementById('levelup').classList.remove('active');
      state='playing'; lastTime=null; if (!_loopScheduled) { _loopScheduled = true; requestAnimationFrame(loop); }
    });
    container.appendChild(div);
  }
}

function openChest(ch) {
  sfx('chestOpen');
  transition.active = true; transition.mode = 'in'; transition.timer = 0; transition.nextState = 'chest';
  const pool = [...BUFFS].sort(() => Math.random() - 0.5).slice(0, 3);
  const container = document.getElementById('cards');
  container.innerHTML = '';
  // Aggiorna il titolo dell'overlay
  document.getElementById('overlay-title').textContent = '📦 Forziere!';
  for (const buff of pool) {
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `<div class="icon">${buff.icon}</div><div class="name">${buff.name}</div><div class="desc">${buff.desc}</div>`;
    div.addEventListener('click', () => {
      const dur = ({shield:8,frost:8,pierce:12,nova:12})[buff.id] || BUFF_DURATION;
      // Se buff gia' attivo, revert del vecchio e riapplica (evita stack multiplicativo)
      const existing = activeBuffs.findIndex(b => b.def.id === buff.id);
      if (existing !== -1) {
        activeBuffs[existing].def.revert(player);
        activeBuffs.splice(existing, 1);
      }
      buff.apply(player);
      updatePlayerWeaponFlags();
      sfx('buffAcquired');
      activeBuffs.push({ def: buff, remaining: dur });
      document.getElementById('levelup').classList.remove('active');
      state = 'playing'; lastTime = null; if (!_loopScheduled) { _loopScheduled = true; requestAnimationFrame(loop); }
    });
    container.appendChild(div);
  }
  document.getElementById('levelup').classList.add('active');
}

function _buildResultsScreen(isVictory) {
  const min = Math.floor(gameTime/60), sec = Math.floor(gameTime%60).toString().padStart(2,'0');
  document.getElementById('go-title').textContent   = isVictory ? '🏆 VITTORIA!' : 'GAME OVER';
  document.getElementById('go-title').style.color   = isVictory ? '#ffd700' : '#ff4444';
  document.getElementById('go-title').style.textShadow = isVictory ? '0 0 30px #ffd700' : '0 0 30px #f44';
  document.getElementById('go-stats').textContent   =
    `${selectedClass.icon} ${selectedClass.name}  •  Livello ${player.level}  •  ${min}:${sec}`;
  document.getElementById('go-details').innerHTML   = `
    <div class="go-stat"><strong>${totalKills}</strong> nemici eliminati</div>
    <div class="go-stat"><strong>${player.level}</strong> livello raggiunto</div>
    <div class="go-stat"><strong>${min}:${sec}</strong> tempo sopravvissuto</div>
  `;
  document.getElementById('gameover').classList.add('active');
}

function triggerGameOver() {
  sfx('gameOver'); setMusicPhase('gameover');
  _buildResultsScreen(false);
  transition.active = true; transition.mode = 'in'; transition.timer = 0; transition.nextState = 'gameover';
}

function triggerVictory() {
  sfx('victory'); setMusicPhase('victory');
  _buildResultsScreen(true);
  transition.active = true; transition.mode = 'in'; transition.timer = 0; transition.nextState = 'gameover';
}

// ── Character select ──────────────────────────────────────
function showCharSelect() {
  document.getElementById('gameover').classList.remove('active');
  document.getElementById('charselect').classList.add('active');
  setMusicPhase('menu');
}

function initCharSelect() {
  const container = document.getElementById('char-cards');
  container.innerHTML = '';
  for (const cls of CLASSES) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="class-icon">${cls.icon}</div>
      <div class="name">${cls.name}</div>
      <div class="desc">${cls.desc}</div>
      <div class="stat">❤️ HP: <span>${cls.stats.hp}</span></div>
      <div class="stat">⚡ Velocità: <span>${Math.round(cls.stats.speed*100)}%</span></div>
      <div class="stat">🔥 Danno: <span>${cls.stats.dmg}</span></div>
    `;
    div.addEventListener('click', () => {
      selectedClass = cls;
      document.getElementById('charselect').classList.remove('active');
      initGame();
    });
    container.appendChild(div);
  }
  document.getElementById('charselect').classList.add('active');
}

// ── World background ─────────────────────────────────────

// Cached per-frame biome weights for the player position
let _framePlayerWeights = null;
let _framePlayerBiome = 'forest';

function drawWorld() {
  // Compute player biome weights once per frame
  _framePlayerWeights = getBiomeWeights(player.x, player.y);
  _framePlayerBiome = getDominantBiome(_framePlayerWeights);

  // Dynamic background color based on biome
  const bgColor = blendColor(_framePlayerWeights, 'canvasColor');
  app.renderer.background.color = bgColor;

  // Update terrain sprite alphas based on biome weights
  const TILE_SIZE = 256;
  for (const biomeId of ['forest', 'desert', 'ice', 'swamp']) {
    const sprite = terrainSprites[biomeId];
    if (sprite) {
      sprite.alpha = _framePlayerWeights[biomeId];
      // Sync tile position with camera for seamless scrolling
      sprite.tilePosition.x = camera.x % TILE_SIZE;
      sprite.tilePosition.y = camera.y % TILE_SIZE;
    }
  }

  const W = app.renderer.width;
  const H = app.renderer.height;
  const g = worldGfx;
  g.clear();

  const CELL=160;
  const startWX=Math.floor(camera.x/CELL)*CELL, startWY=Math.floor(camera.y/CELL)*CELL;
  const endWX=startWX+W+CELL*2, endWY=startWY+H+CELL*2;
  g.setStrokeStyle({width:1, color:blendColor(_framePlayerWeights,'gridColor'), alpha:blendAlpha(_framePlayerWeights,'gridAlpha')});
  for (let wx=startWX; wx<=endWX; wx+=CELL) { g.moveTo(wx,startWY); g.lineTo(wx,endWY); }
  for (let wy=startWY; wy<=endWY; wy+=CELL) { g.moveTo(startWX,wy); g.lineTo(endWX,wy); }
  g.stroke();

  const BIG=CELL*5;
  const startBWX=Math.floor(camera.x/BIG)*BIG, startBWY=Math.floor(camera.y/BIG)*BIG;
  const endBWX=startBWX+W+BIG*2, endBWY=startBWY+H+BIG*2;
  g.setStrokeStyle({width:0.8, color:blendColor(_framePlayerWeights,'bigGridColor'), alpha:blendAlpha(_framePlayerWeights,'bigGridAlpha')});
  for (let wx=startBWX; wx<=endBWX; wx+=BIG) { g.moveTo(wx,startBWY); g.lineTo(wx,endBWY); }
  for (let wy=startBWY; wy<=endBWY; wy+=BIG) { g.moveTo(startBWX,wy); g.lineTo(endBWX,wy); }
  g.stroke();

  // Per-cell biome decorations
  const cxS=Math.floor(camera.x/CELL)-1, cyS=Math.floor(camera.y/CELL)-1;
  const cxE=cxS+Math.ceil(W/CELL)+2, cyE=cyS+Math.ceil(H/CELL)+2;
  for (let cx=cxS; cx<=cxE; cx++) {
    for (let cy=cyS; cy<=cyE; cy++) {
      const h=cellHash(cx,cy);
      if (h%8!==0) continue;
      const wx=cx*CELL+(h>>4)%CELL, wy=cy*CELL+(h>>12)%CELL;
      const alpha=0.05+(h%6)*0.012;
      const type=h%4;
      const decoBiome = getDominantBiomeAt(wx, wy);
      drawBiomeDecoration(g, type, wx, wy, alpha, decoBiome);
    }
  }

  // Map boundary rectangle
  g.rect(-MAP_BOUND, -MAP_BOUND, MAP_BOUND*2, MAP_BOUND*2).stroke({width:3, color:0xff3333, alpha:0.25});

  // Arena zone ground indicators
  for (const zone of ARENA_ZONES) {
    const dzx = zone.cx - camera.x - app.renderer.width/2;
    const dzy = zone.cy - camera.y - app.renderer.height/2;
    if (Math.hypot(dzx, dzy) > zone.clearRadius + Math.max(app.renderer.width, app.renderer.height)) continue;
    if (zone.id === 'colosseum') {
      g.circle(zone.cx, zone.cy, 300).stroke({width:2, color:0xddaa66, alpha:0.12});
      g.circle(zone.cx, zone.cy, 300).stroke({width:1, color:0xffcc88, alpha:0.06});
    } else if (zone.id === 'canyon') {
      g.rect(zone.cx - 400, zone.cy - 110, 800, 220).fill({color:0x88aacc, alpha:0.03});
    }
  }
}

// ── Render all entities ──────────────────────────────────
function drawEntities(dt) {
  const g = xpGfx; g.clear();
  for (const gem of xpGems) {
    if (gem.picked) continue;
    g.circle(gem.x, gem.y, 4).fill({color:0x00ff88});
  }

  const cg = chestGfx; cg.clear();
  for (const ch of chests) {
    const bobY = Math.sin(ch.bob) * 4;
    cg.rect(ch.x-12, ch.y-8+bobY, 24, 16).fill({color:0xb7410e});
    cg.rect(ch.x-12, ch.y-8+bobY, 24, 4).fill({color:0xffdd00});
    cg.rect(ch.x-2, ch.y-4+bobY, 4, 8).fill({color:0xffdd00});
    cg.rect(ch.x-6, ch.y-1+bobY, 12, 2).fill({color:0xffdd00});
  }

  const bg = bulletGfx; bg.clear();
  const isPierce = player._pierce;
  for (const b of bullets) {
    const bc = b._trailColor || (isPierce ? 0x00ff8c : 0xffdc3c);
    const ba = Math.min(1, b.life/0.3);
    // Glow halo
    bg.circle(b.x, b.y, b.radius * 3).fill({color: bc, alpha: ba * 0.1});
    // Core
    bg.circle(b.x, b.y, b.radius).fill({color: bc, alpha: ba});
  }

  // Clear HP bar graphics
  enemyGfx.clear();

  // Hide only previously visible enemy sprites
  for (let i = 0; i < lastEnemyCount; i++) enemySprites[i].visible = false;

  // Animation time for slime walk cycle
  const animTime = _frameNowMs / 1000;

  // Screen bounds for culling
  const screenLeft = camera.x - CULL_MARGIN;
  const screenRight = camera.x + app.renderer.width + CULL_MARGIN;
  const screenTop = camera.y - CULL_MARGIN;
  const screenBottom = camera.y + app.renderer.height + CULL_MARGIN;

  // Draw enemies using sprite pool
  for (let i = 0; i < enemies.length && i < enemySprites.length; i++) {
    const e = enemies[i];
    const spr = enemySprites[i];

    // Culling: skip off-screen enemies (dying enemies still draw for animation)
    if (!e.dying && (e.x < screenLeft || e.x > screenRight || e.y < screenTop || e.y > screenBottom)) {
      spr.visible = false;
      continue;
    }

    const hpF = e.hp / e.maxHp;
    spr.visible = true;
    const enemyType = e.enemyType || 'slime';
    const useNewSprite = enemyType !== 'slime' && SpriteGen.enemyFrames[enemyType];

    if (useNewSprite) {
      const tex = SpriteGen.getEnemyFrame(enemyType, e.angle, animTime);
      if (spr.texture !== tex) spr.texture = tex;
      spr.scale.set((e.isBig ? 2.0 : 1.3) * enemySizeScale());
      spr.rotation = 0;
    } else {
      const slimeType = e.slimeType || (e.isBig ? 2 : 1);
      const hasSlimeFrames = SpriteGen.slimeFrames && Object.keys(SpriteGen.slimeFrames).length > 0;
      if (hasSlimeFrames) {
        const tex = SpriteGen.getSlimeFrame(slimeType, e.angle, animTime);
        if (spr.texture !== tex) spr.texture = tex;
        spr.scale.set((e.isBig ? 2.0 : 1.3) * enemySizeScale());
        spr.rotation = 0;
      } else {
        const tex = e.isBig ? SpriteGen.textures.enemyBig : SpriteGen.textures.enemy;
        if (spr.texture !== tex) spr.texture = tex;
        spr.scale.set(1);
        spr.rotation = e.angle;
      }
    }
    spr.x = e.x;
    spr.y = e.y;
    spr.tint = e.hitFlash > 0 ? 0xffffff : (e._frozen ? 0x66ccdd : (e.enemyTint || 0xffffff));

    if (e.dying) {
      const t = e.deathTimer / 0.25;
      spr.alpha = Math.max(0, t);
      const baseScale = (e.isBig ? 2.0 : 1.3) * enemySizeScale();
      spr.scale.set(baseScale * (1 + (1 - t) * 0.4));
      spr.rotation += (e.deathSpin || 0) * dt;
    } else {
      spr.alpha = 1;
    }

    // HP bar (drawn with graphics)
    if (!e.dying && e.maxHp > 1) {
      const bw = e.radius * 2.8;
      enemyGfx.rect(e.x - bw / 2, e.y - e.radius - 8, bw, 3).fill({ color: 0x333333 });
      enemyGfx.rect(e.x - bw / 2, e.y - e.radius - 8, bw * hpF, 3).fill({ color: e.isBig ? 0xff8800 : 0xff4333 });
    }
  }
  lastEnemyCount = enemies.length;
}
function drawPlayer() {
  const g = playerGfx; g.clear();
  const gc = player.classColor || 0x44aaff;
  const blink = !player._invuln && player.damageCd > 0 && Math.floor(player.damageCd*10)%2===0;
  if (!blink) {
    const now = _frameNowMs / 1000;
    const da = player.angle;
    const dx = Math.cos(da), dy = Math.sin(da);
    const px = player.x, py = player.y;

    // Ground shadow
    g.circle(px + 2, py + 4, 16).fill({color:0x000000, alpha:0.18});

    // ── Aura particles (class-colored, orbiting) ──
    for (let i = 0; i < 5; i++) {
      const a = now * 1.2 + i * (Math.PI * 2 / 5);
      const r = 20 + Math.sin(now * 2 + i) * 3;
      g.circle(px + Math.cos(a) * r, py + Math.sin(a) * r, 1.5).fill({color:gc, alpha:0.25 + Math.sin(now * 3 + i) * 0.1});
    }

    // ── Mantello (cape flowing behind player) ──
    const capeAngle = da + Math.PI; // behind player
    const capeSway = Math.sin(now * 3) * 0.15;
    const capeLen = 18;
    const capeW = 10;
    const cx0 = px + Math.cos(capeAngle) * 8;
    const cy0 = py + Math.sin(capeAngle) * 8;
    const cx1 = px + Math.cos(capeAngle + 0.3 + capeSway) * capeLen;
    const cy1 = py + Math.sin(capeAngle + 0.3 + capeSway) * capeLen;
    const cx2 = px + Math.cos(capeAngle - 0.3 + capeSway) * capeLen;
    const cy2 = py + Math.sin(capeAngle - 0.3 + capeSway) * capeLen;
    const cx3 = px + Math.cos(capeAngle) * (capeLen - 3);
    const cy3 = py + Math.sin(capeAngle) * (capeLen - 3);
    g.moveTo(cx0 + Math.cos(capeAngle - 0.5) * capeW, cy0 + Math.sin(capeAngle - 0.5) * capeW);
    g.lineTo(cx1, cy1);
    g.lineTo(cx3, cy3);
    g.lineTo(cx2, cy2);
    g.lineTo(cx0 + Math.cos(capeAngle + 0.5) * capeW, cy0 + Math.sin(capeAngle + 0.5) * capeW);
    g.closePath();
    g.fill({color:gc, alpha:0.35});

    // ── Robe body ──
    g.circle(px, py, 11).fill({color:gc});

    // Robe bottom edge (wider hem)
    g.moveTo(px + Math.cos(da + Math.PI + 0.6) * 12, py + Math.sin(da + Math.PI + 0.6) * 12);
    g.lineTo(px + Math.cos(da + Math.PI) * 14, py + Math.sin(da + Math.PI) * 14);
    g.lineTo(px + Math.cos(da + Math.PI - 0.6) * 12, py + Math.sin(da + Math.PI - 0.6) * 12);
    g.closePath();
    g.fill({color:gc, alpha:0.7});

    // ── Hood (pointed hat) ──
    const hoodTipX = px + dx * 20;
    const hoodTipY = py + dy * 20;
    const hoodBaseL = { x: px + Math.cos(da - 0.8) * 8, y: py + Math.sin(da - 0.8) * 8 };
    const hoodBaseR = { x: px + Math.cos(da + 0.8) * 8, y: py + Math.sin(da + 0.8) * 8 };
    g.moveTo(hoodBaseL.x, hoodBaseL.y);
    g.lineTo(hoodTipX, hoodTipY);
    g.lineTo(hoodBaseR.x, hoodBaseR.y);
    g.closePath();
    g.fill({color:gc, alpha:0.85});

    // Hood highlight
    g.moveTo(hoodBaseL.x, hoodBaseL.y);
    g.lineTo(hoodTipX + Math.cos(da + 1.5) * 2, hoodTipY + Math.sin(da + 1.5) * 2);
    g.lineTo(px + Math.cos(da - 0.2) * 10, py + Math.sin(da - 0.2) * 10);
    g.closePath();
    g.fill({color:0xffffff, alpha:0.12});

    // ── Face (glowing eyes) ──
    const eyeOff = 4;
    const eyeS = 2;
    g.circle(px + dx * eyeOff + Math.cos(da + 0.5) * 3, py + dy * eyeOff + Math.sin(da + 0.5) * 3, eyeS).fill({color:0xffffff, alpha:0.9});
    g.circle(px + dx * eyeOff + Math.cos(da - 0.5) * 3, py + dy * eyeOff + Math.sin(da - 0.5) * 3, eyeS).fill({color:0xffffff, alpha:0.9});

    // ── Staff (pointing in move direction) ──
    const staffLen = 22;
    const staffTipX = px + dx * (14 + staffLen);
    const staffTipY = py + dy * (14 + staffLen);
    const staffBaseX = px + dx * 14 + Math.cos(da + 1.7) * 5;
    const staffBaseY = py + dy * 14 + Math.sin(da + 1.7) * 5;
    // Shaft
    g.moveTo(staffBaseX, staffBaseY);
    g.lineTo(staffTipX, staffTipY);
    g.stroke({width:2.5, color:0x8b6914});
    // Orb at tip
    g.circle(staffTipX, staffTipY, 3.5).fill({color:gc, alpha:0.9});
    g.circle(staffTipX, staffTipY, 5).fill({color:gc, alpha:0.2});
    // Orb glow pulse
    const orbPulse = 0.15 + Math.sin(now * 4) * 0.08;
    g.circle(staffTipX, staffTipY, 8).fill({color:gc, alpha:orbPulse});

    // ── Class-specific visuals ──
    if (gc === 0x44aaff) { // Mago Standard: crosshair ring
      g.circle(px, py, 16).stroke({width:1, color:0x44aaff, alpha:0.15});
    } else if (gc === 0xff8833) { // Mago Corazzato: double ring
      g.circle(px, py, 17).stroke({width:2, color:0xff8833, alpha:0.12});
      g.circle(px, py, 14).stroke({width:1.5, color:0xff8833, alpha:0.08});
    } else if (gc === 0xcc44ff) { // Mago Scout: ghostly wisps
      for (let i=0; i<4; i++) {
        const a = now*1.5 + i*1.57;
        g.circle(px+Math.cos(a)*20, py+Math.sin(a)*20, 2).fill({color:0xcc44ff, alpha:0.2 + Math.sin(now*2+i)*0.08});
      }
    }
  }

  // Shield aura
  const sg = shieldGfx; sg.clear();
  if (player._invuln) {
    const pulse = 0.3 + Math.sin(_frameNowMs/150)*0.2;
    sg.circle(player.x, player.y, 22).stroke({width:2, color:0x66ccff, alpha:pulse});
  }

  // Orbit shield
  const og = orbitGfx; og.clear();
  if (player._hasOrbit) {
    const t = _frameNowMs/1000;
    og.circle(player.x, player.y, 62).stroke({width:2, color:gc, alpha:0.32});
    for (let i=0; i<3; i++) {
      const a = t*2.2 + (i*Math.PI*2)/3;
      og.circle(player.x+Math.cos(a)*62, player.y+Math.sin(a)*62, 5).fill({color:gc});
    }
  }

  // Frost aura
  const fg = frostAuraGfx; fg.clear();
  if (player._frost) {
    const t = _frameNowMs/1000;
    const pulse = 0.15+Math.sin(t*3)*0.1;
    fg.circle(player.x, player.y, 150).stroke({width:2, color:0x88ccff, alpha:pulse});
    for (let i=0; i<6; i++) {
      const a = t*1.2 + i*Math.PI/3;
      fg.circle(player.x+Math.cos(a)*140, player.y+Math.sin(a)*140, 3).fill({color:0x8cd2ff, alpha:0.5});
    }
  }

  // Nova ring
  const ng = novaRingGfx; ng.clear();
  if (player._nova) {
    const nt = novaTimer / 2;
    const nr = 10 + nt * 100;
    ng.circle(player.x, player.y, nr).stroke({width:2, color:0xc88cff, alpha:0.5*(1-nt)});
  }
}

// ── Draw particles ───────────────────────────────────────
function px(v) { return Math.round(v); }

function drawParticles() {
  const gn = particleGfx; gn.clear();
  const ga = particleAddGfx; ga.clear();
  const W = app.renderer.width;
  const H = app.renderer.height;
  for (const p of particles) {
    // Screen culling
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const alpha = p.life / p.maxLife;
    const r = p.r * alpha;
    const g = p.blendAdd ? ga : gn;
    if (p.shape === 0) { // chunky pixel block
      const sz = Math.max(2, px(r * 2));
      g.rect(px(p.x - sz/2), px(p.y - sz/2), sz, sz).fill({color:p.color, alpha});
    } else if (p.shape === 1) { // spark (thick rect)
      const len = Math.max(4, px(r * 3));
      const thick = Math.max(2, px(r * 0.8));
      const cx = px(p.x - Math.cos(p.rotation)*len*0.5);
      const cy = px(p.y - Math.sin(p.rotation)*len*0.5);
      g.rect(cx, cy, len, thick).fill({color: p.color, alpha});
    } else if (p.shape === 2) { // ring (expanding)
      const ringR = px(p.startR + r * 1.5);
      g.circle(px(p.x), px(p.y), ringR).stroke({width: px(Math.max(1, 1.5 * alpha)), color: p.color, alpha});
    } else if (p.shape === 3) { // debris (small rect)
      const d = px(Math.max(2, r));
      g.rect(px(p.x - d/2), px(p.y - d/2), d, d).fill({color:p.color, alpha});
    }
  }
}

// ── Draw transient FX (whip arc, chain bolts) ───────────
function drawFX() {
  const g = fxGfx; g.clear();
  for (const fx of fxEffects) {
    const t = fx.life / fx.maxLife;
    if (fx.type === 'whip') {
      const r = fx.range * (1 - t*0.15);
      // Outer glow
      g.arc(fx.x, fx.y, r, fx.aim - Math.PI/2, fx.aim + Math.PI/2)
        .stroke({width:10, color:0xffddaa, alpha:0.15*t});
      // Motion blur lines (3 radial lines trailing)
      for (let blur = -0.3; blur <= 0.3; blur += 0.3) {
        g.arc(fx.x, fx.y, r, fx.aim - Math.PI/2 + blur, fx.aim - Math.PI/2 + blur + 0.2)
          .stroke({width:3, color:0xffcc66, alpha:0.2*t});
      }
      // Main arc
      g.arc(fx.x, fx.y, r, fx.aim - Math.PI/2, fx.aim + Math.PI/2)
        .stroke({width:6, color:0xffddaa, alpha:0.7*t});
      // Inner bright core
      g.arc(fx.x, fx.y, r*0.7, fx.aim - Math.PI/2, fx.aim + Math.PI/2)
        .stroke({width:3, color:0xffffff, alpha:0.5*t});
    } else if (fx.type === 'chain') {
      const pts = fx.points;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i-1], b = pts[i];
        const seed = (a.x * 73856093 ^ a.y * 19349663) % 1000;
        // Zigzag segments
        const segments = 5;
        const prevX = a.x, prevY = a.y;
        for (let s = 1; s <= segments; s++) {
          const frac = s / segments;
          const bx = a.x + (b.x - a.x) * frac;
          const by = a.y + (b.y - a.y) * frac;
          const zig = (seed + s * 137) % 30 - 15;
          const zx = bx + zig * (1 - frac * 0.5);
          const zy = by - zig * (1 - frac * 0.5) * 0.5;
          const lineX = s === 1 ? a.x : a.x + (b.x - a.x) * ((s-1) / segments) + ((seed + (s-1) * 137) % 30 - 15) * (1 - (s-1)/segments * 0.5);
          const lineY = s === 1 ? a.y : a.y + (b.y - a.y) * ((s-1) / segments) - ((seed + (s-1) * 137) % 30 - 15) * (1 - (s-1)/segments * 0.5) * 0.5;
          g.moveTo(lineX, lineY).lineTo(zx, zy)
            .stroke({width:3, color:0xaaddff, alpha:0.9*t});
          g.moveTo(lineX, lineY).lineTo(zx, zy)
            .stroke({width:1, color:0xffffff, alpha:1*t});
        }
        // Spark at hit point
        g.circle(b.x, b.y, 5 * t).fill({color:0xccddff, alpha:0.8*t});
        g.circle(b.x, b.y, 10 * t).fill({color:0xaaddff, alpha:0.2*t});
      }
    }
  }
}

// ── Draw ambient particles ────────────────────────────
function drawAmbientParticles() {
  const g = ambientGfx; g.clear();
  const W = app.renderer.width;
  const H = app.renderer.height;
  for (const p of ambientParticles) {
    // Screen culling
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const t = Math.max(0, p.life / p.maxLife);
    g.circle(p.x, p.y, p.r * (0.5 + t * 0.5)).fill({color: p.color, alpha: p.alpha * t});
  }
}

function updateTransition(dt) {
  if (!transition.active) return;
  transition.timer += dt;
  if (transition.mode === 'in' && transition.timer >= transition.duration) {
    transition.mode = 'out';
    transition.timer = 0;
    state = transition.nextState;
    if (state === 'levelup') document.getElementById('levelup').classList.add('active');
    else if (state === 'gameover') document.getElementById('gameover').classList.add('active');
  } else if (transition.mode === 'out' && transition.timer >= transition.duration) {
    transition.active = false;
  }
}

function drawTransition() {
  if (!transition.active) return;
  const W = app.renderer.width;
  const H = app.renderer.height;
  const t = Math.min(1, transition.timer / transition.duration);
  const alpha = transition.mode === 'in' ? t : (1 - t);
  if (alpha <= 0) return;
  const g = transitionGfx;
  g.clear();
  const lineH = 3;
  const gap = 3;
  for (let y = 0; y < H; y += lineH + gap) {
    g.rect(0, y, W, lineH).fill({color: 0x000000, alpha});
  }
}

function stepWidth(fullW, pct, segW=4) {
  return Math.floor((fullW * pct) / segW) * segW;
}

function drawHUD() {
  const W = app.renderer.width;
  const H = app.renderer.height;
  const g = hudGfx; g.clear();

  // Hide pause overlay when not paused
  if (!_paused) {
    if (txtPauseOverlay) txtPauseOverlay.alpha = 0;
    if (txtPauseHint) txtPauseHint.alpha = 0;
  }

  // Overlay Blood Moon (tint rosso a copertura)
  if (bloodMoonActive) {
    const pulse = 0.12 + Math.sin(_frameNowMs/350)*0.04;
    g.rect(0, 0, W, H).fill({color:0xaa0022, alpha: pulse});
    // Blood Moon edge bars
    const bmInt = 0.8 + Math.sin(_frameNowMs/250)*0.2;
    g.rect(0, 0, W, H*0.1).fill({color:0x660011, alpha:0.2*bmInt});
    g.rect(0, H-H*0.1, W, H*0.1).fill({color:0x660011, alpha:0.2*bmInt});
  }
  if (bloodMoonAnnounceTimer > 0) {
    txtBloodMoon.visible = true;
    txtBloodMoon.alpha = Math.min(1, bloodMoonAnnounceTimer/2.5);
    txtBloodMoon.text = '🌑 BLOOD MOON 🌑';
  } else {
    txtBloodMoon.visible = false;
  }

  // ── Screen effects ──

  // Damage flash overlay
  const hitElapsed = _frameNowMs/1000 - (player.lastHitTime || 0);
  if (hitElapsed < 0.2) {
    const flashInt = 1 - hitElapsed / 0.2;
    g.rect(0, 0, W, H).fill({color:0xff0000, alpha:0.2*flashInt});
  }

  // Low-HP vignette
  if (player.hp / player.maxHp < 0.30 && player.hp > 0) {
    const intensity = 1 - (player.hp / player.maxHp) / 0.30;
    const pulse = 0.3 + Math.sin(_frameNowMs/300)*0.15;
    const barW = W * 0.12 * intensity;
    const barH = H * 0.12 * intensity;
    g.rect(0, 0, W, barH).fill({color:0xff0000, alpha:0.15*pulse*intensity});
    g.rect(0, H-barH, W, barH).fill({color:0xff0000, alpha:0.15*pulse*intensity});
    g.rect(0, 0, barW, H).fill({color:0xff0000, alpha:0.15*pulse*intensity});
    g.rect(W-barW, 0, barW, H).fill({color:0xff0000, alpha:0.15*pulse*intensity});
  }

  // Biome atmosphere overlay
  const biomeAtmo = {
    forest: { color: 0x004422, alpha: 0.04 },
    desert: { color: 0x442200, alpha: 0.06 },
    ice:    { color: 0x224466, alpha: 0.05 },
    swamp:  { color: 0x223311, alpha: 0.07 },
  }[_framePlayerBiome];
  if (biomeAtmo) {
    g.rect(0, 0, W, H).fill({color: biomeAtmo.color, alpha: biomeAtmo.alpha});
  }

  const pad=16, hpW=IS_MOBILE?240:180, hpH=IS_MOBILE?18:14, hpPct=player.hp/player.maxHp;
  const hpCol = hpPct>0.5 ? 0x44ff44 : hpPct>0.25 ? 0xffaa00 : 0xff4444;

  // HP bar (stepped pixel blocks)
  g.rect(pad,pad,hpW,hpH).fill({color:0x111111, alpha:0.7});
  g.rect(pad,pad,hpW,hpH).stroke({width:1, color:0xffffff, alpha:0.15});
  const hpFill = stepWidth(hpW, hpPct, 4);
  g.rect(pad,pad,hpFill,hpH).fill({color:hpCol, alpha:1});
  // Top highlight (lighter stripe)
  g.rect(pad,pad,hpFill,hpH*0.4).fill({color:0xffffff, alpha:0.12});
  // XP bar with two-tone fill
  const xpY=pad+hpH+6;
  const xpPct = player.xp/player.xpNext;
  g.rect(pad,xpY,hpW,8).fill({color:0x111111, alpha:0.7});
  const xpFill = stepWidth(hpW, xpPct, 4);
  g.rect(pad,xpY,xpFill,8).fill({color:0x006688, alpha:1});
  g.rect(pad,xpY,xpFill,8*0.5).fill({color:0x00ccff, alpha:0.5});
  // Moving shine on XP bar
  const shineX = (_frameNowMs/2000 % 1) * hpW;
  g.rect(pad + shineX - 8, xpY, 16, 8).fill({color:0xffffff, alpha:0.15 * (1 - Math.abs(shineX/hpW - 0.5) * 2)});
  g.rect(pad,xpY,hpW,8).stroke({width:1, color:0xffffff, alpha:0.12});

  // Cooldown bar per ogni arma (sotto la barra XP)
  const WEAP_COLORS = {
    gun:0xffcc33, spread:0xff8844, orbit:0x66ccff,
    whip:0xffddaa, whip_reaper:0xff66aa,
    missile:0xff5522, chain:0xaaddff, spread_nova:0xffaa22,
  };
  const cdBarY = xpY + 12;
  const cdBarH = 4;
  const cdBarGap = 2;
  let cdX = pad;
  const cdW = Math.max(20, Math.floor((hpW - (player.weapons.length-1)*cdBarGap) / Math.max(1,player.weapons.length)));
  for (const w of player.weapons) {
    const cdMax = w.cd || 1;
    const ready = cdMax === 0 ? 1 : Math.max(0, Math.min(1, 1 - (w.timer / cdMax)));
    g.rect(cdX, cdBarY, cdW, cdBarH).fill({color:0x000000, alpha:0.5});
    g.rect(cdX, cdBarY, stepWidth(cdW, ready, 2), cdBarH).fill({color: WEAP_COLORS[w.type] || 0xffffff, alpha:0.95});
    cdX += cdW + cdBarGap;
  }
  // Text updates
  txtHp.text = `HP  ${player.hp} / ${player.maxHp}`;
  txtLvl.text = `LVL ${player.level}`;
  const min=Math.floor(gameTime/60), sec=Math.floor(gameTime%60).toString().padStart(2,'0');
  txtTime.text = `${min}:${sec}`;
  txtKills.text = `\u2620 ${totalKills}`;
  const biomeName = BIOMES[_framePlayerBiome].name;
  txtCoords.text = `${biomeName}  ${Math.round(player.x)}, ${Math.round(player.y)}`;
  txtCoords.y = H-16;

  // Run timer — barra in alto al centro
  const runPct = Math.min(1, gameTime / RUN_DURATION);
  const runRemain = Math.max(0, RUN_DURATION - gameTime);
  const rMin = Math.floor(runRemain/60), rSec = Math.floor(runRemain%60).toString().padStart(2,'0');
  const rtW = 160, rtH = 4, rtX = (W-rtW)/2, rtY = 8;
  g.rect(rtX-1, rtY-1, rtW+2, rtH+2).fill({color:0x111111, alpha:0.7});
  g.rect(rtX, rtY, stepWidth(rtW, runPct, 4), rtH).fill({color:runPct > 0.8 ? 0xffd700 : 0x0099ff, alpha:0.9});
  // Glowing dot at the end of the run bar
  const dotX = rtX + rtW * runPct;
  g.circle(dotX, rtY + rtH/2, 4).fill({color:runPct > 0.8 ? 0xffd700 : 0x44ccff, alpha:0.5});
  g.circle(dotX, rtY + rtH/2, 2).fill({color:0xffffff, alpha:0.8});
  txtTime.text = `${rMin}:${rSec}`;
  txtTime.x = W/2; txtTime.anchor.set(0.5, 0);
  if (combo>=3 && comboTimer>0) {
    txtCombo.visible = true;
    txtCombo.alpha = Math.min(1, comboTimer);
    txtCombo.text = `\u00d7${combo}  COMBO!`;
    txtCombo._lastFontSize = txtCombo._lastFontSize || 26;
    const newComboSize = 26 + Math.min(combo, 20);
    if (txtCombo._lastFontSize !== newComboSize) { txtCombo.style.fontSize = newComboSize; txtCombo._lastFontSize = newComboSize; }
    const nt = nextComboTier(combo);
    if (nt) {
      txtComboNext.visible = true;
      txtComboNext.alpha = Math.min(1, comboTimer);
      txtComboNext.text = `\u2192 ${nt.at}x  ${nt.name}`;
    } else {
      txtComboNext.visible = true;
      txtComboNext.alpha = Math.min(1, comboTimer);
      txtComboNext.text = `MAX TIER`;
    }
  } else {
    txtCombo.visible = false;
    txtComboNext.visible = false;
  }

  // Swarm HUD
  if (swarmPhase === 'warn') {
    const pulse = 0.6 + Math.sin(_frameNowMs/120)*0.4;
    txtSwarmWarn.visible = true;
    txtSwarmCountdown.visible = true;
    txtSwarmTitle.visible = false;
    txtSwarmRemain.visible = false;
    txtSwarmWarn.alpha = pulse;
    txtSwarmCountdown.alpha = pulse;
    txtSwarmWarn.text = '\u26a0 SWARM INCOMING \u26a0';
    txtSwarmCountdown.text = Math.ceil(swarmCountdown) + 's';
  } else if (swarmPhase === 'active') {
    const pct = Math.max(0, swarmCountdown / SWARM_DURATION);
    const barW=240, barH=10;
    const bx=(W-barW)/2, by=68;
    g.rect(bx-2,by-2,barW+4,barH+4).fill({color:0x000000, alpha:0.6});
    g.rect(bx,by,stepWidth(barW, pct, 4),barH).fill({color:0xff8800, alpha:1});

    const pulse2 = 0.7 + Math.sin(_frameNowMs/150)*0.3;
    txtSwarmWarn.visible = false;
    txtSwarmCountdown.visible = false;
    txtSwarmTitle.visible = true;
    txtSwarmRemain.visible = true;
    txtSwarmTitle.alpha = pulse2;
    txtSwarmRemain.alpha = pulse2;
    txtSwarmTitle.text = '\u2620 SWARM \u2014 SURVIVE! \u2620';
    txtSwarmRemain.text = Math.ceil(swarmCountdown) + 's remaining';
  } else {
    txtSwarmWarn.visible = false;
    txtSwarmCountdown.visible = false;
    txtSwarmTitle.visible = false;
    txtSwarmRemain.visible = false;
  }

  // Red pulsing border during swarm
  if (swarmPhase === 'active') {
    const pulse = 0.3 + Math.sin(_frameNowMs / 200) * 0.2;
    g.rect(0, 0, W, H).stroke({width: 4, color: 0xff4400, alpha: pulse});
  }

  // Buff icons — espandi pool se necessario
  if (activeBuffs.length > 0) {
    const bw=46*MOBILE_BUFF_SCALE, bh=46*MOBILE_BUFF_SCALE, gap=8;
    const bx0=(W - activeBuffs.length*(bw+gap)+gap)/2;
    const by0=H-bh-pad-18;
    for (let i=0; i<activeBuffs.length; i++) {
      const b = activeBuffs[i];
      const bx = bx0+i*(bw+gap);
      const maxDur = ({shield:8,frost:8,pierce:12,nova:12})[b.def.id] || BUFF_DURATION;
      const pct = b.remaining / maxDur;
      g.rect(bx,by0,bw,bh).fill({color:0x000000, alpha:0.55});
      // Softer corners via smaller rounded overlay
      g.rect(bx+1,by0+1,bw-2,bh-2).stroke({width:1.5, color:pct>0.3 ? 0x00aaff : 0xff4444, alpha:1});
      // Inner countdown fill (from bottom, softer)
      g.rect(bx+2, by0+bh-bh*pct-2, bw-4, bh*pct).fill({color:pct>0.3 ? 0x0088cc : 0xcc3333, alpha:0.35});
      buffTexts[i*2].text = b.def.icon;
      buffTexts[i*2].x = bx+bw/2; buffTexts[i*2].y = by0+28;
      buffTexts[i*2].visible = true;
      buffTexts[i*2+1].text = Math.ceil(b.remaining)+'s';
      buffTexts[i*2+1].x = bx+bw/2; buffTexts[i*2+1].y = by0+42;
      buffTexts[i*2+1].visible = true;
    }
  }
  // Nascondi slot inutilizzati
  for (let i=activeBuffs.length*2; i<buffTexts.length; i++) buffTexts[i].visible = false;

  // ── Touch joystick ──
  if (touchJoystick.active) {
    const jx = touchJoystick.startX;
    const jy = touchJoystick.startY;
    // Outer ring (base)
    g.circle(jx, jy, JOYSTICK_MAX_R).stroke({ width: 2.5, color: 0xffffff, alpha: 0.25 });
    g.circle(jx, jy, JOYSTICK_MAX_R).fill({ color: 0xffffff, alpha: 0.06 });
    // Inner thumb
    const thumbX = jx + touchJoystick.dx;
    const thumbY = jy + touchJoystick.dy;
    g.circle(thumbX, thumbY, 22).fill({ color: 0xffffff, alpha: 0.35 });
  }
  drawTransition();
}

// ── Minimap cache ──────────────────────────────────────────
let _minimapCacheKey = '';
const _minimapBioCache = [];

// ── Minimap ───────────────────────────────────────────────
function drawMinimap() {
  const W = app.renderer.width;
  const H = app.renderer.height;
  const SIZE=MINIMAP_SIZE, RANGE=MINIMAP_RANGE;
  const mx=W-SIZE-16, my=H-SIZE-16;
  const cx=mx+SIZE/2, cy=my+SIZE/2, rad=SIZE/2;

  const g = minimapGfx; g.clear();

  // Background circle
  g.circle(cx,cy,rad).fill({color:0x000410, alpha:0.65});
  g.circle(cx,cy,rad).stroke({width:1, color:0x0282ff, alpha:0.22});
  // Grid rings
  g.setStrokeStyle({width:0.5, color:0x028cff, alpha:0.12});
  for (let r=rad*0.33; r<rad; r+=rad*0.33) { g.circle(cx,cy,r).stroke(); }
  g.moveTo(cx-rad,cy); g.lineTo(cx+rad,cy);
  g.moveTo(cx,cy-rad); g.lineTo(cx,cy+rad);
  g.stroke();

  // Sweep
  const sw=(_frameNowMs/2000)*Math.PI*2;
  g.moveTo(cx,cy); g.arc(cx,cy,rad,sw-0.7,sw); g.closePath(); g.fill({color:0x00c864, alpha:0.07});

  // Terrain grid (8x8 biome sample dots) with cache
  const GRID = 8;
  const cellSz = (RANGE * 2) / GRID;
  const pxCell = Math.floor(player.x / cellSz);
  const pyCell = Math.floor(player.y / cellSz);
  const cacheKey = pxCell + ',' + pyCell;
  if (cacheKey !== _minimapCacheKey) {
    _minimapCacheKey = cacheKey;
    _minimapBioCache.length = 0;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const wx = player.x - RANGE + gx * cellSz + cellSz * 0.5;
        const wy = player.y - RANGE + gy * cellSz + cellSz * 0.5;
        const bio = getDominantBiome(getBiomeWeights(wx, wy));
        _minimapBioCache.push(BIOME_MINIMAP_COLORS[bio] || 0x22aa44);
      }
    }
  }
  let ci = 0;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const col = _minimapBioCache[ci++];
      const wx = player.x - RANGE + gx * cellSz + cellSz * 0.5;
      const wy = player.y - RANGE + gy * cellSz + cellSz * 0.5;
      const dx = (wx - player.x) / RANGE * rad;
      const dy = (wy - player.y) / RANGE * rad;
      if (Math.hypot(dx, dy) > rad) continue;
      g.circle(cx + dx, cy + dy, 0.8).fill({color: col, alpha: 0.2});
    }
  }

  // Entities
  for (const gem of xpGems) {
    const dx=(gem.x-player.x)/RANGE*rad, dy=(gem.y-player.y)/RANGE*rad;
    if (Math.hypot(dx,dy)>rad) continue;
    g.circle(cx+dx,cy+dy,1.5).fill({color:0x00ff88});
  }
  for (const e of enemies) {
    const dx=(e.x-player.x)/RANGE*rad, dy=(e.y-player.y)/RANGE*rad;
    if (Math.hypot(dx,dy)>rad) continue;
    g.circle(cx+dx,cy+dy,e.isBig?3:2).fill({color:e.isBig ? 0xff8800 : 0xff4444});
  }
  for (const ch of chests) {
    const dx=(ch.x-player.x)/RANGE*rad, dy=(ch.y-player.y)/RANGE*rad;
    if (Math.hypot(dx,dy)>rad) continue;
    g.circle(cx+dx,cy+dy,3).fill({color:0xffdd00});
  }
  // Boss
  drawBossOnMinimap(g, cx, cy, rad, player.x, player.y, RANGE);

  // Arena zone indicators
  for (const zone of ARENA_ZONES) {
    const dx = (zone.cx - player.x) / RANGE * rad;
    const dy = (zone.cy - player.y) / RANGE * rad;
    if (Math.hypot(dx, dy) > rad * 1.5) continue;
    const sz = Math.max(3, zone.clearRadius / RANGE * rad);
    if (zone.id === 'colosseum') {
      g.circle(cx + dx, cy + dy, sz).stroke({width:0.5, color:0xddaa66, alpha:0.35});
    } else {
      g.rect(cx + dx - sz, cy + dy - 1.5, sz * 2, 3).fill({color:0x88aacc, alpha:0.2});
    }
  }

  // Player dot
  g.circle(cx,cy,4).fill({color:player.classColor||0x44aaff});
  g.circle(cx+Math.cos(player.angle)*7,cy+Math.sin(player.angle)*7,2).fill({color:0xffffff});

  // Label
  txtMinimapLabel.text = getBossMinimapLabel() || (swarmPhase==='active' ? 'SWARM!' : 'RADAR');
  txtMinimapLabel.x = W-MINIMAP_SIZE-16+MINIMAP_SIZE/2;
  txtMinimapLabel.y = H-MINIMAP_SIZE-16+MINIMAP_SIZE+12;
}

// ── Intro ─────────────────────────────────────────────────
const INTRO_DURATION = 3.2;

function updateIntro(dt) {
  introTime += dt;

  if (introTime > 0.6 && !introSpawned) {
    introSpawned = true;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 350 + Math.random() * 100;
      enemies.push({
        x: player.x + Math.cos(angle) * dist,
        y: player.y + Math.sin(angle) * dist,
        hp: 3, maxHp: 3, speed: 30, radius: 8, angle: 0, isBig: false,
        slimeType: 1, enemyType: 'slime',
      });
    }
  }

  for (const e of enemies) {
    const edx = player.x - e.x, edy = player.y - e.y, dist = Math.hypot(edx, edy) || 1;
    e.x += (edx / dist) * e.speed * dt;
    e.y += (edy / dist) * e.speed * dt;
    e.angle = Math.atan2(edy, edx);
  }

  updateCamera(dt);
}

function drawIntro() {
  const g = introGfx; g.clear();

  // Zoom: 1.8x → 1.0x over 2s
  const zoomT = Math.min(1, introTime / 2.0);
  const zoom = 1 + (1 - zoomT) * 0.8;

  // Draw world and entities into intro container
  introContainer.scale.set(zoom);
  introContainer.position.set(app.renderer.width/2, app.renderer.height/2);
  introContainer.pivot.set(app.renderer.width/2, app.renderer.height/2);

  // Draw enemies (fade in from 0.6s)
  const eAlpha = Math.min(1, Math.max(0, (introTime - 0.6) / 0.8));
  for (const e of enemies) {
    g.circle(e.x, e.y, e.radius).fill({color:0xdd3322, alpha:eAlpha});
    g.circle(e.x+Math.cos(e.angle)*3.5, e.y+Math.sin(e.angle)*3.5, 2.5).fill({color:0xffffff, alpha:eAlpha});
  }

  // Player
  const pAlpha = Math.min(1, introTime / 0.5);
  g.circle(player.x, player.y, 12).fill({color:player.classColor||0x44aaff, alpha:pAlpha});
  g.circle(player.x, player.y, 3).fill({color:0xffffff, alpha:pAlpha});

  // Vignette overlay
  const W = app.renderer.width;
  const H = app.renderer.height;

  const textT = Math.max(0, (introTime - 0.8) / 1.5);
  if (textT > 0) {
    const vigAlpha = Math.min(0.6, introTime * 0.25);
    g.rect(0, 0, app.renderer.width, app.renderer.height).fill({color:0x000000, alpha:vigAlpha});

    // Intro texts
    txtIntroSub.alpha = Math.min(1, textT);
    txtIntroSub.text = 'ULTIMATE';
    txtIntroSub.x = W/2; txtIntroSub.y = H/2-38;

    txtIntroBig.alpha = Math.min(1, textT);
    txtIntroBig.text = 'SURVIVOR';
    txtIntroBig.x = W/2; txtIntroBig.y = H/2;

    const subT = Math.max(0, (introTime - 2.0) / 0.8);
    if (subT > 0) {
      txtIntroWord.alpha = Math.min(1, subT);
      txtIntroWord.text = 'SOPRAVVIVI';
      txtIntroWord.x = W/2; txtIntroWord.y = H/2+46;
    } else {
      txtIntroWord.alpha = 0;
    }

    const creditT = Math.max(0, (introTime - 2.4) / 0.8);
    if (creditT > 0) {
      txtIntroCredit.alpha = Math.min(0.6, creditT);
      txtIntroCredit.text = 'di Lantern Maurizio';
      txtIntroCredit.x = W/2; txtIntroCredit.y = H/2+76;
    } else {
      txtIntroCredit.alpha = 0;
    }
  } else {
    txtIntroSub.alpha = 0;
    txtIntroBig.alpha = 0;
    txtIntroWord.alpha = 0;
    txtIntroCredit.alpha = 0;
  }

  // Fade-out
  if (introTime > INTRO_DURATION - 0.3) {
    const fadeOut = (introTime - (INTRO_DURATION - 0.3)) / 0.3;
    g.rect(0,0,app.renderer.width,app.renderer.height).fill({color:0x060810, alpha:fadeOut});
    txtIntroSub.alpha = Math.max(0, 1-fadeOut);
    txtIntroBig.alpha = Math.max(0, 1-fadeOut);
    txtIntroWord.alpha = Math.max(0, 1-fadeOut);
    txtIntroCredit.alpha = Math.max(0, 1-fadeOut);
  }
}

// ── Pause overlay ─────────────────────────────────────────
function drawPauseOverlay() {
  const g = hudGfx;
  const W = app.renderer.width;
  const H = app.renderer.height;
  g.rect(0, 0, W, H).fill({color:0x000000, alpha:0.55});
  if (!txtPauseOverlay) {
    txtPauseOverlay = makeText({fontFamily:'"Press Start 2P", monospace', fontSize:28, fill:'#ffffff', fontWeight:'bold'}, 0, 0, 0.5, 0.5);
    hudContainer.addChild(txtPauseOverlay);
  }
  txtPauseOverlay.text = '⏸ PAUSA';
  txtPauseOverlay.x = W / 2;
  txtPauseOverlay.y = H / 2 - 10;
  txtPauseOverlay.alpha = 1;
  if (!txtPauseHint) {
    txtPauseHint = makeText({fontFamily:'"Press Start 2P", monospace', fontSize:10, fill:'#88aacc'}, 0, 0, 0.5, 0.5);
    hudContainer.addChild(txtPauseHint);
  }
  txtPauseHint.text = 'P / ESC / ⏸ per riprendere';
  txtPauseHint.x = W / 2;
  txtPauseHint.y = H / 2 + 30;
  txtPauseHint.alpha = 0.7;
}
let txtPauseOverlay, txtPauseHint;

// ── Game loop ────────────────────────────────────────────
function loop(ts) {
  _loopScheduled = false;
  _frameNowMs = ts;
  if (lastTime === null) lastTime = ts;
  const dt = Math.max(0, Math.min((ts - lastTime) / 1000, 0.05));
  lastTime = ts;

  updateTransition(dt);

  if (state === 'intro') {
    updateIntro(dt);
    // Render intro
    drawWorld();
    drawEntities(dt);
    drawPlayer();
    drawParticles();
    drawFX();
    drawAmbientParticles();
    drawIntro();
    applyCamera();
    introContainer.visible = true;
    if (introTime >= INTRO_DURATION) {
      state = 'playing';
      setMusicPhase('gameplay');
      enemies = [];
      introContainer.visible = false;
      introGfx.clear();
      lastTime = null;
    }
    _loopScheduled = true; requestAnimationFrame(loop);
    return;
  }

  if (state === 'gameover' || state === 'levelup' || state === 'chest' || state === 'paused') {
    if ((_frameCount & 1) === 0) drawWorld();
    drawEntities(dt);
    drawBoss();
    drawPlayer();
    drawParticles();
    drawFX();
    drawAmbientParticles();
    drawHUD();
    drawMinimap();
    applyCamera();
    introContainer.visible = false;
    if (state === 'paused') drawPauseOverlay();
    _loopScheduled = true; requestAnimationFrame(loop);
    return;
  }

  update(dt);

  // Render
  if ((_frameCount & 1) === 0) drawWorld();
  drawEntities(dt);
  drawBoss();
  drawPlayer();
  drawParticles();
  drawFX();
  drawAmbientParticles();
  drawHUD();
  drawMinimap();
  applyCamera();
  introContainer.visible = false;

  _loopScheduled = true; requestAnimationFrame(loop);
}

// Avvia inizializzazione dopo che tutto è definito
initPIXI();
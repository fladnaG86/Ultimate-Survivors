// ═══════════════════════════════════════════════════
//  Ultimate Survivor — main.js  (v4 · PixiJS)
// ═══════════════════════════════════════════════════

const GAME_W = innerWidth, GAME_H = innerHeight;

// ── Forward declarations (avoid TDZ with resize handler) ──
let txtHp, txtLvl, txtTime, txtKills, txtCoords, txtCombo;
let txtSwarmWarn, txtSwarmCountdown;
let txtSwarmTitle, txtSwarmBar, txtSwarmRemain;
let txtIntroBig, txtIntroSub, txtIntroWord;
let txtMinimapLabel;

// ── PixiJS Application ─────────────────────────────────
async function initApp() {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x060810,
    antialias: true,
    resolution: 1,
    autoDensity: false,
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
  if (txtSwarmWarn) { txtSwarmWarn.x = W/2; txtSwarmWarn.y = 80; }
  if (txtSwarmCountdown) { txtSwarmCountdown.x = W/2; txtSwarmCountdown.y = 110; }
  if (txtSwarmTitle) { txtSwarmTitle.x = W/2; }
  if (txtSwarmRemain) { txtSwarmRemain.x = W/2; }
  if (txtIntroSub) { txtIntroSub.x = W/2; }
  if (txtIntroBig) { txtIntroBig.x = W/2; }
  if (txtIntroWord) { txtIntroWord.x = W/2; }
  if (txtMinimapLabel) { txtMinimapLabel.x = W-MINIMAP_SIZE-16+MINIMAP_SIZE/2; txtMinimapLabel.y = H-MINIMAP_SIZE-16+MINIMAP_SIZE+12; }
}

// ── Containers ─────────────────────────────────────────
let app, worldContainer, entityContainer, particleContainer, playerContainer, hudContainer, minimapContainer, introContainer;

// Generate procedural textures
async function initPIXI() {
  app = await initApp();

  worldContainer = new PIXI.Container();
  entityContainer = new PIXI.Container();
  particleContainer = new PIXI.Container();
  playerContainer = new PIXI.Container();
  hudContainer = new PIXI.Container();
  minimapContainer = new PIXI.Container();
  introContainer = new PIXI.Container();

  app.stage.addChild(worldContainer);
  app.stage.addChild(entityContainer);
  app.stage.addChild(particleContainer);
  app.stage.addChild(playerContainer);
  app.stage.addChild(hudContainer);
  app.stage.addChild(minimapContainer);
  app.stage.addChild(introContainer);

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
window.addEventListener('keydown', e => { keys[e.key] = true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) e.preventDefault(); });
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
const XP_PER_LEVEL   = 25;
const DAMAGE_CD      = 1.0;
const CULL_MARGIN    = 140;
const CULL_DESPAWN   = 2200;
const SWARM_INTERVAL = 60;
const SWARM_WARN     = 5;
const SWARM_DURATION = 15;
const SWARM_RATE     = 0.25;
const CHEST_DROP_CHANCE = 0.12;
const CHEST_BIG_DROP    = 0.30;
const BUFF_DURATION     = 15;
const MINIMAP_SIZE     = 120;
const MINIMAP_RANGE    = 1500;
const RUN_DURATION     = 30*60; // 30 minuti in secondi
const MAP_BOUND        = 10000; // confine mappa (~20000x20000 area totale)
const MAX_ENEMIES      = 500;   // limite nemici = pool sprite

// ── Flocking (swarm) ───────────────────────────────────
const FLOCK_SEPARATION  = 30;
const ENEMY_PUSH_RADIUS = 28;   // enemy-enemy soft separation (always active)
const ENEMY_PUSH_FORCE  = 0.6;  // push strength
const FLOCK_ALIGNMENT_W = 0.08;
const FLOCK_COHESION_W  = 0.005;
const FLOCK_RADIUS      = 120;
const SWARM_SPEED_MULT  = 1.3;

// ── Classi personaggio ─────────────────────────────────
const CLASSES = [
  {
    id: 'soldier',
    name: 'Soldato',
    icon: '🪖',
    desc: 'Equilibrato. Parte con Spread Shot.',
    color: 0x44aaff,
    stats: { hp:10, speed:1.0, dmg:1, magnetRange:65 },
    startWeapons: [
      { type:'gun',    cd:0.55, timer:0 },
      { type:'spread', cd:1.1,  timer:0 },
    ],
  },
  {
    id: 'tank',
    name: 'Tank',
    icon: '🛡️',
    desc: 'Più HP, più lento. Orbit Shield di partenza.',
    color: 0xff8833,
    stats: { hp:18, speed:0.70, dmg:2, magnetRange:50 },
    startWeapons: [
      { type:'gun',   cd:0.8,  timer:0 },
      { type:'orbit', cd:0,    timer:0 },
    ],
  },
  {
    id: 'specter',
    name: 'Spettro',
    icon: '👻',
    desc: 'Velocissimo, fragile. Fuoco rapido.',
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
];

// ── Particles ──────────────────────────────────────────
let particles = [];
let lastEnemyCount = 0;

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
    _particlePool[i] = { x:0, y:0, vx:0, vy:0, life:0, maxLife:0.9, r:2, color:0, _active:false };
  }
  _bulletPool.length = BULLET_POOL_SIZE;
  for (let i = 0; i < BULLET_POOL_SIZE; i++) {
    _bulletPool[i] = { x:0, y:0, vx:0, vy:0, life:0, dmg:0, radius:4, pierced:null, _active:false };
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
}

function spawnParticles(wx, wy, color, count=8) {
  const c = parseInt(color.slice(1), 16);
  for (let i=0; i<count; i++) {
    const p = _acquireParticle();
    const a=Math.random()*Math.PI*2, s=50+Math.random()*110;
    p.x=wx; p.y=wy; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
    p.life=0.4+Math.random()*0.5; p.maxLife=0.9; p.r=2+Math.random()*3; p.color=c;
    particles.push(p);
  }
}

// ── State ───────────────────────────────────────────────
let player, bullets, enemies, xpGems, state, lastTime, gameTime, totalKills, combo, comboTimer;
let swarmTimer, swarmPhase, swarmCountdown;
let chests, activeBuffs, novaTimer;
let introTime, introSpawned;

// ── PixiJS display objects ──────────────────────────────
let worldGfx, xpGfx, chestGfx, bulletGfx, enemyGfx, playerGfx, particleGfx;
let hudGfx, minimapGfx, introGfx;
let orbitGfx, frostAuraGfx, novaRingGfx, shieldGfx;
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

const STYLE_SM   = { fontFamily:'Courier New', fontSize:Math.round(10*MOBILE_FONT_SCALE), fill:'#ffffff' };
const STYLE_MD   = { fontFamily:'Courier New', fontSize:Math.round(13*MOBILE_FONT_SCALE), fill:'#ffffffcc' };
const STYLE_XP   = { fontFamily:'Courier New', fontSize:Math.round(9*MOBILE_FONT_SCALE), fill:'#ffffff' };
const STYLE_CD   = { fontFamily:'Courier New', fontSize:Math.round(10*MOBILE_FONT_SCALE), fill:'#ffffff4d' };
const STYLE_COMBO = { fontFamily:'Courier New', fontSize:Math.round(26*MOBILE_FONT_SCALE), fill:'#ffaa00', fontWeight:'bold' };
const STYLE_SW_W  = { fontFamily:'Courier New', fontSize:Math.round(28*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_SW_CD = { fontFamily:'Courier New', fontSize:Math.round(20*MOBILE_FONT_SCALE), fill:'#ff8800' };
const STYLE_SW_T  = { fontFamily:'Courier New', fontSize:Math.round(18*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_SW_R  = { fontFamily:'Courier New', fontSize:Math.round(13*MOBILE_FONT_SCALE), fill:'#ff8800' };
const STYLE_I_SUB = { fontFamily:'Courier New', fontSize:Math.round(14*MOBILE_FONT_SCALE), fill:'#00aaff' };
const STYLE_I_BIG = { fontFamily:'Courier New', fontSize:Math.round(48*MOBILE_FONT_SCALE), fill:'#ffffff', fontWeight:'bold' };
const STYLE_I_WRD = { fontFamily:'Courier New', fontSize:Math.round(28*MOBILE_FONT_SCALE), fill:'#ff8800', fontWeight:'bold' };
const STYLE_MM    = { fontFamily:'Courier New', fontSize:Math.round(9*MOBILE_FONT_SCALE), fill:'#0282ff73' };

function initDisplay() {
  worldContainer.removeChildren();
  entityContainer.removeChildren();
  particleContainer.removeChildren();
  playerContainer.removeChildren();
  hudContainer.removeChildren();
  minimapContainer.removeChildren();
  introContainer.removeChildren();

  worldGfx = new PIXI.Graphics();
  worldContainer.addChild(worldGfx);

  xpGfx = new PIXI.Graphics();
  entityContainer.addChild(xpGfx);

  chestGfx = new PIXI.Graphics();
  entityContainer.addChild(chestGfx);

  bulletGfx = new PIXI.Graphics();
  entityContainer.addChild(bulletGfx);

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

  hudGfx = new PIXI.Graphics();
  hudContainer.addChild(hudGfx);

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

  const W = app.renderer.width;
  const H = app.renderer.height;

  txtHp = makeText(STYLE_SM, 20, 27); hudContainer.addChild(txtHp);
  txtLvl = makeText(STYLE_XP, 20, 36); hudContainer.addChild(txtLvl);
  txtTime = makeText(STYLE_MD, W-16, 30, 1, 0); hudContainer.addChild(txtTime);
  txtKills = makeText(STYLE_MD, W-16, 48, 1, 0); hudContainer.addChild(txtKills);
  txtCoords = makeText(STYLE_CD, 16, H-16); hudContainer.addChild(txtCoords);
  txtCombo = makeText(STYLE_COMBO, W/2, H*0.28, 0.5, 0.5); hudContainer.addChild(txtCombo);

  txtSwarmWarn = makeText(STYLE_SW_W, W/2, 80, 0.5, 0.5); hudContainer.addChild(txtSwarmWarn);
  txtSwarmCountdown = makeText(STYLE_SW_CD, W/2, 110, 0.5, 0.5); hudContainer.addChild(txtSwarmCountdown);
  txtSwarmTitle = makeText(STYLE_SW_T, W/2, 58, 0.5, 0.5); hudContainer.addChild(txtSwarmTitle);
  txtSwarmRemain = makeText(STYLE_SW_R, W/2, 94, 0.5, 0.5); hudContainer.addChild(txtSwarmRemain);

  txtIntroSub = makeText(STYLE_I_SUB, W/2, H/2-38, 0.5, 0.5); introContainer.addChild(txtIntroSub);
  txtIntroBig = makeText(STYLE_I_BIG, W/2, H/2, 0.5, 0.5); introContainer.addChild(txtIntroBig);
  txtIntroWord = makeText(STYLE_I_WRD, W/2, H/2+46, 0.5, 0.5); introContainer.addChild(txtIntroWord);

  txtMinimapLabel = makeText(STYLE_MM, W-MINIMAP_SIZE-16+MINIMAP_SIZE/2, H-MINIMAP_SIZE-16+MINIMAP_SIZE+12, 0.5, 0); minimapContainer.addChild(txtMinimapLabel);

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
    level:1, damageCd:0, angle:0,
    weapons: cls.startWeapons.map(w=>({...w})),
    _regen:false, _invuln:false, _frost:false, _vampire:false, _pierce:false, _nova:false, _crit:false,
    classColor: cls.color,
  };
  camera.x = -app.renderer.width/2;
  camera.y = -app.renderer.height/2;
  camera.shakeX=camera.shakeY=camera.shakeMag=camera.shakeDur=0;
  bullets=[]; enemies=[]; xpGems=[]; particles=[];
  chests=[]; activeBuffs=[]; novaTimer=0;
  initPools();
  resetBoss();
  gameTime=0; totalKills=0; combo=0; comboTimer=0;
  swarmTimer=0; swarmPhase='idle'; swarmCountdown=0;
  state='intro'; introTime=0; introSpawned=false; lastTime=null;
  generateObstacles();
  spatialBuildObstacles(obstacles);
  document.getElementById('gameover').classList.remove('active');
  document.getElementById('levelup').classList.remove('active');
  initDisplay();
  initObstacleSprites(worldContainer);
  requestAnimationFrame(loop);
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
  const hp    = Math.ceil(5*Math.pow(scale,0.85) * (1 + combo*0.03) * bDef.hpMult);
  const spd   = ENEMY_BASE_SPD*(1+gameTime/180) * bDef.spdMult;
  const isBig = Math.random() < (gameTime >= 60 ? 0.25 : 0.08);
  const variants = isBig ? bDef.enemyBigTypes : bDef.enemyTypes;
  const roll = Math.random();
  let cumW = 0, pickedType = variants[0].type, pickedSlime = bDef[isBig ? 'enemyBigSlime' : 'enemySlime'];
  for (const v of variants) {
    cumW += v.w;
    if (roll < cumW) { pickedType = v.type; break; }
  }

  enemies.push({
    x:wx, y:wy, hp, maxHp:hp,
    speed:isBig?spd*0.7:spd,
    radius:isBig?16:8, angle:0, isBig,
    biome,
    slimeType: pickedType === 'slime' ? pickedSlime : (isBig ? 2 : 1),
    enemyType: pickedType,
    enemyTint: bDef[isBig ? 'enemyBigTint' : 'enemyTint'],
    xpMult: bDef.xpMult,
  });
}

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

function fireBullet(wx, wy, angle, dmg) {
  const b = _acquireBullet();
  b.x=wx; b.y=wy; b.vx=Math.cos(angle)*BULLET_SPEED; b.vy=Math.sin(angle)*BULLET_SPEED;
  b.life=BULLET_LIFE; b.dmg=dmg; b.radius=4; b.pierced=null;
  bullets.push(b);
}

function handleWeapons(dt) {
  const target = nearestEnemy();
  const aim = target ? Math.atan2(target.y-player.y, target.x-player.x) : player.angle;
  for (const w of player.weapons) {
    w.timer -= dt;
    if (w.timer>0) continue;
    if (w.type==='gun') {
      w.timer=w.cd;
      for (let i=0; i<player.multiShot; i++) {
        const sp=(i-(player.multiShot-1)/2)*0.18;
        fireBullet(player.x, player.y, aim+sp, player.bulletDmg);
      }
      sfx('gunFire');
    }
    if (w.type==='spread') {
      w.timer=w.cd;
      for (let i=-1; i<=1; i++) fireBullet(player.x, player.y, aim+i*0.35, player.bulletDmg);
      sfx('spreadFire');
    }
  }
}

// ── Update ──────────────────────────────────────────────
function update(dt) {
  gameTime += dt;

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

  // ── Swarm event logic ──
  swarmTimer += dt;
  if (swarmPhase === 'idle') {
    const nextAt = (Math.floor(gameTime / SWARM_INTERVAL) + 1) * SWARM_INTERVAL;
    const timeTo = nextAt - gameTime;
    if (timeTo <= SWARM_WARN) { swarmPhase = 'warn'; swarmCountdown = timeTo; sfx('swarmAlarm'); }
    if (Math.random() < 0.032 * (1 + gameTime / 60)) spawnEnemy();
  } else if (swarmPhase === 'warn') {
    swarmCountdown -= dt;
    if (Math.random() < 0.02 * (1 + gameTime / 60)) spawnEnemy();
    if (swarmCountdown <= 0) {
      swarmPhase = 'active'; swarmCountdown = SWARM_DURATION;
      for (let i = 0; i < 20 + Math.floor(gameTime / 30) * 5; i++) spawnEnemy();
      screenShake(14, 0.5);
      sfx('swarmStart');
    }
  } else if (swarmPhase === 'active') {
    swarmCountdown -= dt;
    if (Math.random() < SWARM_RATE * (1 + gameTime / 120)) spawnEnemy();
    if (swarmCountdown <= 0) { swarmPhase = 'idle'; swarmTimer = 0; }
  }

  // ── Rebuild spatial grid for enemies ──
  spatialRebuild(enemies);

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
  player.x = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, player.x));
  player.y = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, player.y));
  updateCamera(dt);
  handleWeapons(dt);

  // ── Bullet update + collision (using spatial grid) ──
  const screenMax = Math.max(app.renderer.width, app.renderer.height);
  for (const b of bullets) { b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; }
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
        spawnParticles(b.x,b.y, player._crit && dmg>b.dmg ? '#ffff00' : '#ffaa00', player._crit && dmg>b.dmg ? 10 : 5);
        if (player._pierce) {
          if (!b.pierced) b.pierced = new Set();
          b.pierced.add(e);
        } else { _releaseBullet(b); return false; }
      }
    }
    return true;
  });

  // ── Orbit shield (spatial grid) ──
  if (player.weapons.find(w=>w.type==='orbit')) {
    const orbitR=62;
    const nearE = spatialNearby(player.x, player.y, orbitR);
    const nLen = spatialNearbyCount();
    for (let i = 0; i < nLen; i++) nearE[i].hp -= player.bulletDmg*dt*3;
  }

  // ── Enemy movement (spatial grid for flocking + obstacles) ──
  const swarmActive = swarmPhase === 'active';
  for (let ei = 0; ei < enemies.length; ei++) {
    const e = enemies[ei];
    const edx=player.x-e.x, edy=player.y-e.y, moveDist=Math.hypot(edx,edy)||1;
    let mx=(edx/moveDist), my=(edy/moveDist);

    // Flocking durante lo swarm (using spatial grid instead of O(n²))
    if (swarmActive) {
      let sepX=0,sepY=0,sepN=0, aDx=0,aDy=0,aN=0, cx=0,cy=0,cN=0;
      const flockNear = spatialNearby(e.x, e.y, FLOCK_RADIUS);
      const flockLen = spatialNearbyCount();
      for (let i = 0; i < flockLen; i++) {
        const o = flockNear[i];
        if (o===e) continue;
        const d=Math.hypot(e.x-o.x, e.y-o.y);
        if (d>FLOCK_RADIUS) continue;
        if (d<FLOCK_SEPARATION && d>0) { sepX+=(e.x-o.x)/d; sepY+=(e.y-o.y)/d; sepN++; }
        aDx+=Math.cos(o.angle); aDy+=Math.sin(o.angle); aN++;
        cx+=o.x; cy+=o.y; cN++;
      }
      if (sepN>0) { mx+=sepX/sepN*1.5; my+=sepY/sepN*1.5; }
      if (aN>0) { const l=Math.hypot(aDx,aDy)||1; mx+=aDx/l*FLOCK_ALIGNMENT_W*aN; my+=aDy/l*FLOCK_ALIGNMENT_W*aN; }
      if (cN>0) { mx+=(cx/cN-e.x)*FLOCK_COHESION_W; my+=(cy/cN-e.y)*FLOCK_COHESION_W; }
    }

    // Enemy-enemy soft push (always active, uses spatial grid)
    {
      const pushNear = spatialNearby(e.x, e.y, ENEMY_PUSH_RADIUS);
      const pushLen = spatialNearbyCount();
      for (let i = 0; i < pushLen; i++) {
        const o = pushNear[i];
        if (o === e) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d < ENEMY_PUSH_RADIUS && d > 0.1) {
          const overlap = 1 - d / ENEMY_PUSH_RADIUS;
          mx += (dx / d) * overlap * ENEMY_PUSH_FORCE;
          my += (dy / d) * overlap * ENEMY_PUSH_FORCE;
        }
      }
    }

    if (!e._frozen) {
      const spd = e.speed * (swarmActive ? SWARM_SPEED_MULT : 1);
      const ml=Math.hypot(mx,my)||1;
      e.x+=(mx/ml)*spd*dt; e.y+=(my/ml)*spd*dt;
    }
    e.angle=Math.atan2(edy,edx);

    // Slide around obstacles (spatial grid)
    resolveEnemyObstacles(e);

    // Check damage using CURRENT position (after movement + obstacle push)
    const dist=Math.hypot(player.x-e.x, player.y-e.y);
    if (player.damageCd<=0 && !player._invuln && dist<e.radius+12) {
      player.hp-=e.isBig?2:1; player.damageCd=DAMAGE_CD;
      screenShake(e.isBig?11:7, 0.25);
      spawnParticles(player.x,player.y,'#ff4444',6);
      sfx('playerHit');
      if (player.hp<=0) { triggerGameOver(); return; }
    }
  }
  if (player.damageCd>0) player.damageCd-=dt;

  // ── Enemy death/cull (compactInPlace) ──
  compactInPlace(enemies, e => {
    if (e.hp>0) return Math.hypot(e.x-player.x,e.y-player.y)<CULL_DESPAWN;
    spawnParticles(e.x,e.y,e.isBig?'#ff8800':'#ff6644',e.isBig?20:12);
    sfx(e.isBig ? 'bigEnemyDeath' : 'enemyDeath');
    xpGems.push({ x:e.x, y:e.y, value:Math.ceil((e.isBig?3:1) * (e.xpMult || 1)) });
    totalKills++; combo++; comboTimer=2.5;
    if (player._vampire) player.hp = Math.min(player.maxHp, player.hp + 1);
    if (e.isBig) screenShake(13,0.4);
    const dropChance = e.isBig ? CHEST_BIG_DROP : CHEST_DROP_CHANCE;
    if (Math.random() < dropChance && chests.length < 15) chests.push({ x:e.x, y:e.y, bob:Math.random()*Math.PI*2 });
    return false;
  });

  if (comboTimer>0) { comboTimer-=dt; if (comboTimer<=0) combo=0; }

  // ── XP gems (compactInPlace) ──
  compactInPlace(xpGems, g => {
    const d=Math.hypot(g.x-player.x,g.y-player.y);
    if (d<player.magnetRange) { player.xp+=g.value; spawnParticles(g.x,g.y,'#00ff88',3); sfx('xpCollect'); return false; }
    if (d<player.magnetRange*3.5) {
      g.x+=((player.x-g.x)/d)*130*dt; g.y+=((player.y-g.y)/d)*130*dt;
    }
    return d<CULL_DESPAWN;
  });

  // ── Particles (compactInPlace) ──
  compactInPlace(particles, p => {
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.91; p.vy*=0.91; p.life-=dt; return p.life>0;
  });

  if (player.xp>=player.xpNext) {
    player.xp-=player.xpNext; player.xpNext=Math.ceil(player.xpNext*1.3);
    player.level++; triggerLevelUp();
  }

  // ── Chest pickup & buff tick ──
  compactInPlace(chests, ch => {
    const d = Math.hypot(ch.x - player.x, ch.y - player.y);
    if (d < 22) { openChest(ch); spawnParticles(ch.x, ch.y, '#ffdd00', 14); return false; }
    ch.bob += dt * 2.5;
    return d < CULL_DESPAWN;
  });

  if (player._regen) player.hp = Math.min(player.maxHp, player.hp + 2 * dt);

  // ── Frost aura (spatial grid) ──
  if (player._frost) {
    const frostR = 150;
    const nearE = spatialNearby(player.x, player.y, frostR);
    const nLen = spatialNearbyCount();
    for (let i = 0; i < nLen; i++) nearE[i]._frozen = true;
    // Mark enemies outside the range as not frozen
    for (let i = 0; i < enemies.length; i++) {
      if (!enemies[i]._frozen) continue;
      const ddx = enemies[i].x - player.x, ddy = enemies[i].y - player.y;
      if (ddx*ddx + ddy*ddy >= frostR*frostR) enemies[i]._frozen = false;
    }
  } else {
    for (let i = 0; i < enemies.length; i++) enemies[i]._frozen = false;
  }

  // ── Nova pulse (spatial grid) ──
  if (player._nova) {
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
  state='levelup';
  sfx('levelUp');
  document.getElementById('overlay-title').textContent = '⬆ Level Up!';
  const pool=[...UPGRADES].sort(()=>Math.random()-0.5).slice(0,3);
  const container=document.getElementById('cards');
  container.innerHTML='';
  for (const upg of pool) {
    const div=document.createElement('div'); div.className='card';
    div.innerHTML=`<div class="icon">${upg.icon}</div><div class="name">${upg.name}</div><div class="desc">${upg.desc}</div>`;
    div.addEventListener('click',()=>{
      upg.apply(player);
      sfx('cardSelect');
      document.getElementById('levelup').classList.remove('active');
      state='playing'; lastTime=null; requestAnimationFrame(loop);
    });
    container.appendChild(div);
  }
  document.getElementById('levelup').classList.add('active');
}

function openChest(ch) {
  state = 'chest';
  sfx('chestOpen');
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
      buff.apply(player);
      sfx('buffAcquired');
      activeBuffs.push({ def: buff, remaining: dur });
      document.getElementById('levelup').classList.remove('active');
      state = 'playing'; lastTime = null; requestAnimationFrame(loop);
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
    <div class="go-stat"><strong>${totalKills}</strong>nemici eliminati</div>
    <div class="go-stat"><strong>${player.level}</strong>livello raggiunto</div>
    <div class="go-stat"><strong>${min}:${sec}</strong>tempo sopravvissuto</div>
  `;
  document.getElementById('gameover').classList.add('active');
}

function triggerGameOver() {
  state = 'gameover';
  sfx('gameOver'); setMusicPhase('gameover');
  _buildResultsScreen(false);
}

function triggerVictory() {
  state = 'gameover';
  sfx('victory'); setMusicPhase('victory');
  _buildResultsScreen(true);
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

  const W = app.renderer.width;
  const H = app.renderer.height;
  const g = worldGfx;
  g.clear();

  const CELL=120;
  const startWX=Math.floor(camera.x/CELL)*CELL, startWY=Math.floor(camera.y/CELL)*CELL;
  const endWX=startWX+W+CELL*2, endWY=startWY+H+CELL*2;
  g.setStrokeStyle({width:1, color:blendColor(_framePlayerWeights,'gridColor'), alpha:blendAlpha(_framePlayerWeights,'gridAlpha')});
  for (let wx=startWX; wx<=endWX; wx+=CELL) { g.moveTo(wx,startWY); g.lineTo(wx,endWY); }
  for (let wy=startWY; wy<=endWY; wy+=CELL) { g.moveTo(startWX,wy); g.lineTo(endWX,wy); }

  const BIG=CELL*5;
  const startBWX=Math.floor(camera.x/BIG)*BIG, startBWY=Math.floor(camera.y/BIG)*BIG;
  const endBWX=startBWX+W+BIG*2, endBWY=startBWY+H+BIG*2;
  g.setStrokeStyle({width:0.8, color:blendColor(_framePlayerWeights,'bigGridColor'), alpha:blendAlpha(_framePlayerWeights,'bigGridAlpha')});
  for (let wx=startBWX; wx<=endBWX; wx+=BIG) { g.moveTo(wx,startBWY); g.lineTo(wx,endBWY); }
  for (let wy=startBWY; wy<=endBWY; wy+=BIG) { g.moveTo(startBWX,wy); g.lineTo(endBWX,wy); }

  // Per-cell biome decorations
  const cxS=Math.floor(camera.x/CELL)-1, cyS=Math.floor(camera.y/CELL)-1;
  const cxE=cxS+Math.ceil(W/CELL)+2, cyE=cyS+Math.ceil(H/CELL)+2;
  for (let cx=cxS; cx<=cxE; cx++) {
    for (let cy=cyS; cy<=cyE; cy++) {
      const h=cellHash(cx,cy);
      if (h%5!==0) continue;
      const wx=cx*CELL+(h>>4)%CELL, wy=cy*CELL+(h>>12)%CELL;
      const alpha=0.05+(h%6)*0.012;
      const type=h%4;
      const decoBiome = getDominantBiomeAt(wx, wy);
      drawBiomeDecoration(g, type, wx, wy, alpha, decoBiome);
    }
  }

  // Map boundary rectangle
  g.rect(-MAP_BOUND, -MAP_BOUND, MAP_BOUND*2, MAP_BOUND*2).stroke({width:3, color:0xff3333, alpha:0.25});
}

// ── Render all entities ──────────────────────────────────
function drawEntities() {
  const g = xpGfx; g.clear();
  for (const gem of xpGems) {
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
    bg.circle(b.x, b.y, b.radius).fill({color:isPierce ? 0x00ff8c : 0xffdc3c, alpha:Math.min(1, b.life/0.3)});
  }

  // Clear HP bar graphics
  enemyGfx.clear();

  // Hide only previously visible enemy sprites
  for (let i = 0; i < lastEnemyCount; i++) enemySprites[i].visible = false;

  // Animation time for slime walk cycle
  const animTime = performance.now() / 1000;

  // Draw enemies using sprite pool
  for (let i = 0; i < enemies.length && i < enemySprites.length; i++) {
    const e = enemies[i];
    const spr = enemySprites[i];
    const hpF = e.hp / e.maxHp;

    spr.visible = true;
    const enemyType = e.enemyType || 'slime';
    const useNewSprite = enemyType !== 'slime' && SpriteGen.enemyFrames[enemyType];

    if (useNewSprite) {
      const tex = SpriteGen.getEnemyFrame(enemyType, e.angle, animTime);
      if (spr.texture !== tex) spr.texture = tex;
      spr.scale.set(e.isBig ? 2.0 : 1.3);
      spr.rotation = 0;
    } else {
      const slimeType = e.slimeType || (e.isBig ? 2 : 1);
      const hasSlimeFrames = SpriteGen.slimeFrames && Object.keys(SpriteGen.slimeFrames).length > 0;
      if (hasSlimeFrames) {
        const tex = SpriteGen.getSlimeFrame(slimeType, e.angle, animTime);
        if (spr.texture !== tex) spr.texture = tex;
        spr.scale.set(e.isBig ? 2.0 : 1.3);
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
    spr.tint = e._frozen ? 0x66ccdd : (e.enemyTint || 0xffffff);

    // HP bar (drawn with graphics)
    if (e.maxHp > 1) {
      const bw = e.radius * 2.8;
      enemyGfx.rect(e.x - bw / 2, e.y - e.radius - 8, bw, 3).fill({ color: 0x333333 });
      enemyGfx.rect(e.x - bw / 2, e.y - e.radius - 8, bw * hpF, 3).fill({ color: e.isBig ? 0xff8800 : 0xff4333 });
    }
  }
  lastEnemyCount = enemies.length;
}
function drawPlayer() {
  const g = playerGfx; g.clear();
  const blink = !player._invuln && player.damageCd > 0 && Math.floor(player.damageCd*10)%2===0;
  if (!blink) {
    g.circle(player.x, player.y, 12).fill({color:player.classColor || 0x44aaff});
    g.circle(player.x+Math.cos(player.angle)*7, player.y+Math.sin(player.angle)*7, 3).fill({color:0xffffff});
  }

  // Shield aura
  const sg = shieldGfx; sg.clear();
  if (player._invuln) {
    const pulse = 0.3 + Math.sin(performance.now()/150)*0.2;
    sg.circle(player.x, player.y, 22).stroke({width:2, color:0x66ccff, alpha:pulse});
  }

  // Orbit shield
  const og = orbitGfx; og.clear();
  if (player.weapons.find(w=>w.type==='orbit')) {
    const t = performance.now()/1000;
    og.circle(player.x, player.y, 62).stroke({width:2, color:0x44aaff, alpha:0.32});
    for (let i=0; i<3; i++) {
      const a = t*2.2 + (i*Math.PI*2)/3;
      og.circle(player.x+Math.cos(a)*62, player.y+Math.sin(a)*62, 5).fill({color:0x44aaff});
    }
  }

  // Frost aura
  const fg = frostAuraGfx; fg.clear();
  if (player._frost) {
    const t = performance.now()/1000;
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
function drawParticles() {
  const g = particleGfx; g.clear();
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    g.circle(p.x, p.y, p.r * alpha).fill({color:p.color, alpha});
  }
}

function drawHUD() {
  const W = app.renderer.width;
  const H = app.renderer.height;
  const g = hudGfx; g.clear();

  const pad=16, hpW=IS_MOBILE?240:180, hpH=IS_MOBILE?18:14, hpPct=player.hp/player.maxHp;
  const hpCol = hpPct>0.5 ? 0x44ff44 : hpPct>0.25 ? 0xffaa00 : 0xff4444;

  // HP bar
  g.rect(pad,pad,hpW,hpH).fill({color:0x000000, alpha:0.5});
  g.rect(pad,pad,hpW*hpPct,hpH).fill({color:hpCol, alpha:1});
  g.rect(pad,pad,hpW,hpH).stroke({width:1, color:0xffffff, alpha:0.12});
  // XP bar
  const xpY=pad+hpH+6;
  g.rect(pad,xpY,hpW,8).fill({color:0x000000, alpha:0.5});
  g.rect(pad,xpY,hpW*(player.xp/player.xpNext),8).fill({color:0x00aaff, alpha:1});
  g.rect(pad,xpY,hpW,8).stroke({width:1, color:0xffffff, alpha:0.12});
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
  g.rect(rtX, rtY, rtW*runPct, rtH).fill({color:runPct > 0.8 ? 0xffd700 : 0x0099ff, alpha:0.9});
  txtTime.text = `${rMin}:${rSec}`;
  txtTime.x = W/2; txtTime.anchor.set(0.5, 0);
  if (combo>=3 && comboTimer>0) {
    txtCombo.visible = true;
    txtCombo.alpha = Math.min(1, comboTimer);
    txtCombo.text = `\u00d7${combo}  COMBO!`;
    txtCombo.style.fontSize = 26 + Math.min(combo, 20);
  } else {
    txtCombo.visible = false;
  }

  // Swarm HUD
  if (swarmPhase === 'warn') {
    const pulse = 0.6 + Math.sin(performance.now()/120)*0.4;
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
    g.rect(bx,by,barW*pct,barH).fill({color:0xff8800, alpha:1});

    const pulse2 = 0.7 + Math.sin(performance.now()/150)*0.3;
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
    const pulse = 0.3 + Math.sin(performance.now() / 200) * 0.2;
    g.rect(0, 0, W, H).stroke({width: 4, color: 0xff4400, alpha: pulse});
  }

  // Buff icons — espandi pool se necessario
  if (activeBuffs.length > 0) {
    const needed = activeBuffs.length * 2;
    while (buffTexts.length < needed) {
      const icon = makeText({fontFamily:'sans-serif', fontSize:Math.round(20*MOBILE_BUFF_SCALE), fill:'#ffffff'}, 0, 0, 0.5, 0.5);
      const timer = makeText(STYLE_XP, 0, 0, 0.5, 0);
      icon.visible = false; timer.visible = false;
      hudContainer.addChild(icon); hudContainer.addChild(timer);
      buffTexts.push(icon, timer);
    }
    const bw=46*MOBILE_BUFF_SCALE, bh=46*MOBILE_BUFF_SCALE, gap=8;
    const bx0=(W - activeBuffs.length*(bw+gap)+gap)/2;
    const by0=H-bh-pad-18;
    for (let i=0; i<activeBuffs.length; i++) {
      const b = activeBuffs[i];
      const bx = bx0+i*(bw+gap);
      const maxDur = ({shield:8,frost:8,pierce:12,nova:12})[b.def.id] || BUFF_DURATION;
      const pct = b.remaining / maxDur;
      g.rect(bx,by0,bw,bh).fill({color:0x000000, alpha:0.55});
      g.rect(bx,by0,bw,bh).stroke({width:1.5, color:pct>0.3 ? 0x00aaff : 0xff4444, alpha:1});
      g.rect(bx, by0+bh-bh*pct, bw, bh*pct).fill({color:pct>0.3 ? 0x00aaff : 0xff4444, alpha:0.4});
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
}

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

  // Sweep
  const sw=(performance.now()/2000)*Math.PI*2;
  g.moveTo(cx,cy); g.arc(cx,cy,rad,sw-0.7,sw); g.closePath(); g.fill({color:0x00c864, alpha:0.07});

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

  // Player dot
  g.circle(cx,cy,4).fill({color:0x44aaff});
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
  g.circle(player.x, player.y, 12).fill({color:0x44aaff, alpha:pAlpha});
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
  } else {
    txtIntroSub.alpha = 0;
    txtIntroBig.alpha = 0;
    txtIntroWord.alpha = 0;
  }

  // Fade-out
  if (introTime > INTRO_DURATION - 0.3) {
    const fadeOut = (introTime - (INTRO_DURATION - 0.3)) / 0.3;
    g.rect(0,0,app.renderer.width,app.renderer.height).fill({color:0x060810, alpha:fadeOut});
    txtIntroSub.alpha = Math.max(0, 1-fadeOut);
    txtIntroBig.alpha = Math.max(0, 1-fadeOut);
    txtIntroWord.alpha = Math.max(0, 1-fadeOut);
  }
}

// ── Game loop ────────────────────────────────────────────
function loop(ts) {
  if (state === 'gameover' || state === 'levelup' || state === 'chest') return;
  if (lastTime === null) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (state === 'intro') {
    updateIntro(dt);
    // Render intro
    drawWorld();
    drawEntities();
    drawPlayer();
    drawParticles();
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
    requestAnimationFrame(loop);
    return;
  }

  update(dt);

  // Render
  drawWorld();
  drawEntities();
  drawBoss();
  drawPlayer();
  drawParticles();
  drawHUD();
  drawMinimap();
  applyCamera();
  introContainer.visible = false;

  requestAnimationFrame(loop);
}

// Avvia inizializzazione dopo che tutto è definito
initPIXI();
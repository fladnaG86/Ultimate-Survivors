// ═══════════════════════════════════════════════════
//  Ultimate Survivor — boss.js
// ═══════════════════════════════════════════════════

// ── Boss Constants ────────────────────────────────────
const BOSS_INTERVAL = 80;    // secondi tra un'onda boss e la successiva
const BOSS_DEFS = [
  { name:'BEHEMOTH', radius:38, color:0xcc3300, hpMult:25, spdMult:0.45, reward:20, icon:'☠',
    bodyType:'behemoth', glowColor:0xff4400, auraColor:0xff6600, deathColor:0xff4400 },
  { name:'WRAITH',   radius:28, color:0x9922cc, hpMult:18, spdMult:0.85, reward:15, icon:'👻',
    bodyType:'wraith',  glowColor:0xcc44ff, auraColor:0xaa33dd, deathColor:0xcc44ff },
  { name:'IRONCLAD', radius:44, color:0x558800, hpMult:35, spdMult:0.30, reward:25, icon:'🛡',
    bodyType:'ironclad',glowColor:0x66aa00, auraColor:0x88cc22, deathColor:0x88ff00 },
];

// ── Boss State ────────────────────────────────────────
let bosses = [];
let bossGfx;
let bossNameLabels = [];
let bossHpLabels = [];
let nextBossAt;
let bossWave = 0;
let bossIndex = 0;
let bossGlow = null;
let bossBloom = null;

// ── Boss Spawn ────────────────────────────────────────
function spawnBoss() {
  bossWave++;
  const def = BOSS_DEFS[bossIndex % BOSS_DEFS.length];
  bossIndex++;
  const W = app.renderer.width;
  const H = app.renderer.height;
  const angle = Math.random() * Math.PI * 2;
  const dist  = Math.max(W, H) * 0.35 + 60;
  const scale = 1 + gameTime/90;
  const es = enemySizeScale();
  const maxHp = Math.ceil(def.hpMult * scale * 3 * es);
  bosses.push({
    x: player.x + Math.cos(angle) * dist,
    y: player.y + Math.sin(angle) * dist,
    hp: maxHp, maxHp,
    speed: ENEMY_BASE_SPD * def.spdMult * (1 + gameTime/180),
    radius: Math.ceil(def.radius * es),
    angle: 0,
    def, reward: def.reward,
    phase: 1,
    novaTimer: 0,
    _wasEnraged: false,
  });
  screenShake(18 + bossWave * 4, 0.7 + bossWave * 0.1);
  sfx('bossSpawn');
}

// ── Boss Check Spawn ──────────────────────────────────
function checkBossSpawn() {
  if (gameTime >= nextBossAt) {
    spawnBoss();
    nextBossAt += BOSS_INTERVAL;
  }
}

// ── Boss Update ───────────────────────────────────────
function updateBosses(dt) {
  for (let bi = bosses.length - 1; bi >= 0; bi--) {
    const boss = bosses[bi];
    const bdx = player.x - boss.x, bdy = player.y - boss.y;
    const bdist = Math.hypot(bdx, bdy) || 1;
    const enraged = boss.hp / boss.maxHp < 0.30;
    const spdMult = enraged ? 1.65 : 1.0;
    boss.x += (bdx/bdist) * boss.speed * spdMult * dt;
    boss.y += (bdy/bdist) * boss.speed * spdMult * dt;
    boss.angle = Math.atan2(bdy, bdx);

    // Nova burst in fase enrage
    if (enraged) {
      if (!boss._wasEnraged) { boss._wasEnraged = true; sfx('bossEnrage'); }
      boss.novaTimer = (boss.novaTimer||0) + dt;
      if (boss.novaTimer >= 1.8) {
        boss.novaTimer = 0;
        const novaR = 130;
        for (const e of enemies)
          if (Math.hypot(e.x-boss.x, e.y-boss.y) < novaR) e.hp -= Math.ceil(player.bulletDmg * 3);
        spawnParticles(boss.x, boss.y, '#ff4400', 25);
        screenShake(6, 0.2);
        sfx('bossNova');
      }
    }

    // Danno al player
    if (player.damageCd <= 0 && !player._invuln && bdist < boss.radius + 12) {
      player.hp -= 2; player.damageCd = DAMAGE_CD;
      screenShake(14, 0.35);
      spawnParticles(player.x, player.y, '#ff4444', 8);
      sfx('playerHitBoss');
      if (player.hp <= 0) { triggerGameOver(); return; }
    }

    // Aura particles for all bosses (guarded — boss.js loaded before main.js)
    if (Math.random() < 0.05 && typeof spawnParticlesEx === 'function') {
      const aCol = boss.def.auraColor || 0xff6600;
      spawnParticlesEx(boss.x + (Math.random()-0.5)*boss.radius*1.5, boss.y + (Math.random()-0.5)*boss.radius*1.5,
        aCol, 1, { shape: 1, speedBase: 10, blendAdd: true });
    }

    // Hit da proiettili
    for (const b of bullets) {
      if (b._hitBoss) continue;
      if (Math.hypot(b.x-boss.x, b.y-boss.y) < boss.radius + b.radius) {
        const dmg = (player._crit && Math.random()<0.25) ? b.dmg*5 : b.dmg;
        boss.hp -= dmg;
        spawnParticles(b.x, b.y, '#ffaa00', 6);
        if (typeof spawnDamageNumber === 'function') spawnDamageNumber(b.x, b.y, dmg, '#ffaa00', dmg > b.dmg);
        b._hitBoss = true;
        if (!player._pierce) b.life = 0;
      }
    }

    // Boss morto
    if (boss.hp <= 0) {
      const dColor = boss.def.deathColor || 0xff8800;
      const dColorStr = '#' + dColor.toString(16).padStart(6, '0');
      spawnParticles(boss.x, boss.y, dColorStr, 45);
      // Extra burst with ADD blend (guarded)
      if (typeof spawnParticlesEx === 'function') {
        spawnParticlesEx(boss.x, boss.y, dColor, 12, { shape: 2, ringExpand: true, speedBase: 100, blendAdd: true });
      }
      screenShake(20, 0.8);
      sfx('bossDeath');
      for (let i=0; i<boss.reward; i++)
        xpGems.push({ x: boss.x + (Math.random()-0.5)*80, y: boss.y + (Math.random()-0.5)*80, value:1 });
      chests.push({ x:boss.x, y:boss.y, bob:0 });
      totalKills++;
      bosses.splice(bi, 1);
    }
  }
}

// ── Draw Boss ──────────────────────────────────────────
function drawBoss() {
  const g = bossGfx; g.clear();
  if (bosses.length === 0) {
    bossGfx.filters = [];
    for (let i = 0; i < bossNameLabels.length; i++) {
      bossNameLabels[i].visible = false;
      bossHpLabels[i].visible = false;
    }
    return;
  }

  const t = performance.now() / 1000;
  bossGfx.filters = bossBloom ? [bossGlow, bossBloom] : [bossGlow];

  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    const hpF = Math.max(0, boss.hp / boss.maxHp);
    const enraged = hpF < 0.30;
    const bType = boss.def.bodyType || 'behemoth';
    const glowCol = enraged ? 0xff2200 : boss.def.glowColor;
    bossGlow.color = glowCol;

    // Outer ring pulse
    const pulse = 0.3 + Math.sin(t * (enraged ? 8 : 3)) * 0.2;
    g.circle(boss.x, boss.y, boss.radius + 8).stroke({width:enraged ? 3 : 2, color:glowCol, alpha:pulse});

    if (bType === 'behemoth') {
      // ── Behemoth: circle with 8 rotating spikes ──
      g.circle(boss.x, boss.y, boss.radius).fill({color:boss.def.color, alpha:1});
      // Spikes rotating with boss angle
      for (let s = 0; s < 8; s++) {
        const sa = boss.angle + (s / 8) * Math.PI * 2 + t * 0.5;
        const len = enraged ? boss.radius * 0.8 : boss.radius * 0.6;
        g.moveTo(boss.x + Math.cos(sa) * boss.radius * 0.2, boss.y + Math.sin(sa) * boss.radius * 0.2);
        g.lineTo(boss.x + Math.cos(sa) * (boss.radius + len), boss.y + Math.sin(sa) * (boss.radius + len));
        g.stroke({width:4, color:enraged ? 0xff4400 : 0xff8822, alpha:0.8});
      }
      // Inner dark core
      g.circle(boss.x, boss.y, boss.radius * 0.55).fill({color:0x000000, alpha:0.35});
      // Eye
      g.circle(
        boss.x + Math.cos(boss.angle) * boss.radius * 0.45,
        boss.y + Math.sin(boss.angle) * boss.radius * 0.45,
        enraged ? 7 : 5
      ).fill({color:enraged ? 0xff2200 : 0xffffff});

    } else if (bType === 'wraith') {
      // ── Wraith: translucent body with pulsing edge + 4 wisps ──
      const wAlpha = 0.5 + Math.sin(t * 4 + i) * 0.2;
      g.circle(boss.x, boss.y, boss.radius).fill({color:boss.def.color, alpha:wAlpha});
      g.circle(boss.x, boss.y, boss.radius).stroke({width:3, color:0xdd88ff, alpha:0.4 + pulse * 0.3});
      // 4 floating wisps orbiting
      for (let w = 0; w < 4; w++) {
        const wa = t * 1.5 + (w / 4) * Math.PI * 2;
        const wDist = boss.radius * (0.7 + Math.sin(t * 2 + w) * 0.3);
        const wx = boss.x + Math.cos(wa) * wDist;
        const wy = boss.y + Math.sin(wa) * wDist;
        g.circle(wx, wy, enraged ? 6 : 4).fill({color:0xcc66ff, alpha:0.6 + pulse * 0.3});
      }
      // Core
      g.circle(boss.x, boss.y, boss.radius * 0.4).fill({color:0x220033, alpha:0.5});
      // Eyes (2 small dots)
      const eyeOff = boss.radius * 0.25;
      g.circle(boss.x + Math.cos(boss.angle) * eyeOff - 3, boss.y + Math.sin(boss.angle) * eyeOff - 2, 3).fill({color:0xff66aa, alpha:0.9});
      g.circle(boss.x + Math.cos(boss.angle) * eyeOff + 3, boss.y + Math.sin(boss.angle) * eyeOff + 2, 3).fill({color:0xff66aa, alpha:0.9});

    } else if (bType === 'ironclad') {
      // ── Ironclad: hexagon with armor lines ──
      const hexR = boss.radius;
      g.moveTo(boss.x + hexR * Math.cos(t * 0.2), boss.y + hexR * Math.sin(t * 0.2));
      for (let h = 1; h <= 6; h++) {
        const ha = t * 0.2 + (h / 6) * Math.PI * 2;
        g.lineTo(boss.x + hexR * Math.cos(ha), boss.y + hexR * Math.sin(ha));
      }
      g.closePath().fill({color:boss.def.color, alpha:1}).stroke({width:2, color:0x88cc44, alpha:0.7});
      // Armor lines (cross pattern)
      for (let l = 0; l < 3; l++) {
        const la = t * 0.1 + (l / 3) * Math.PI * 2;
        const lr = enraged ? hexR : hexR * 0.7;
        g.moveTo(boss.x + Math.cos(la) * 5, boss.y + Math.sin(la) * 5);
        g.lineTo(boss.x + Math.cos(la) * lr, boss.y + Math.sin(la) * lr);
        g.stroke({width:3, color:0xaadd66, alpha:0.5});
      }
      // Core
      g.circle(boss.x, boss.y, boss.radius * 0.35).fill({color:0x224400, alpha:0.4});
      // Eye
      g.circle(
        boss.x + Math.cos(boss.angle) * boss.radius * 0.35,
        boss.y + Math.sin(boss.angle) * boss.radius * 0.35,
        enraged ? 6 : 4
      ).fill({color:enraged ? 0xff4400 : 0x88ff44});
    }

    // ── Nova telegraph (enraged): expanding ring before explosion ──
    if (enraged && boss.novaTimer > 0) {
      const novaProgress = boss.novaTimer / 1.8;
      const telegraphR = 30 + novaProgress * 100;
      const tAlpha = 0.1 + novaProgress * 0.25;
      g.circle(boss.x, boss.y, telegraphR).stroke({width:2, color:boss.def.glowColor || 0xff4400, alpha:tAlpha * (1 - novaProgress * 0.5)});
      g.circle(boss.x, boss.y, telegraphR * 0.7).fill({color:boss.def.glowColor || 0xff4400, alpha:tAlpha * 0.3});
    }

    // HP bar above boss (world space)
    const bw = boss.radius * 4;
    const bh = 8;
    const by = boss.y - boss.radius - 16;
    g.rect(boss.x - bw/2, by, bw, bh).fill({color:0x222222});
    g.rect(boss.x - bw/2, by, Math.floor((bw * hpF) / 4) * 4, bh).fill({color:enraged ? 0xff2200 : boss.def.color});
    g.rect(boss.x - bw/2, by, bw, bh).stroke({width:1, color:0xffffff, alpha:0.3});

    // Name + HP text above bar (world space)
    if (i < bossNameLabels.length) {
      const nl = bossNameLabels[i];
      const hl = bossHpLabels[i];
      nl.visible = true; hl.visible = true;
      nl.text = `${boss.def.icon} ${boss.def.name}${enraged ? '  ENRAGE' : ''}`;
      nl.style.fill = enraged ? '#ff4400' : '#ff8800';
      nl.alpha = enraged ? (0.7 + Math.sin(t*8)*0.3) : 1;
      nl.x = boss.x; nl.y = by - 10;
      hl.text = `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`;
      hl.x = boss.x; hl.y = by + bh + 6;
    }
  }

  // Hide unused labels
  for (let i = bosses.length; i < bossNameLabels.length; i++) {
    bossNameLabels[i].visible = false;
    bossHpLabels[i].visible = false;
  }
}

// ── Draw Boss on Minimap ──────────────────────────────
function drawBossOnMinimap(g, cx, cy, rad, playerX, playerY, RANGE) {
  for (const boss of bosses) {
    const dx=(boss.x-playerX)/RANGE*rad, dy=(boss.y-playerY)/RANGE*rad;
    const inRange = Math.hypot(dx,dy) <= rad;
    const dist = Math.hypot(dx, dy) || 1;
    const dotX = inRange ? cx+dx : cx + (dx/dist)*rad*0.92;
    const dotY = inRange ? cy+dy : cy + (dy/dist)*rad*0.92;
    const pulse = 0.6 + Math.sin(performance.now()/250)*0.4;
    g.circle(dotX, dotY, inRange ? 5 : 4).stroke({width:1.5, color:0xff4400, alpha:pulse});
    g.circle(dotX, dotY, inRange ? 4 : 3).fill({color:0xff4400});
  }
}

// ── Init Boss Display ──────────────────────────────────
function initBossDisplay() {
  bossGfx = new PIXI.Graphics();
  if (typeof PIXI.filters.GlowFilter !== 'undefined') {
    bossGlow = new PIXI.filters.GlowFilter({ distance: 18, outerStrength: 3.5, color: 0xff4400 });
  }
  if (typeof IS_MOBILE !== 'undefined' && !IS_MOBILE && typeof PIXI.filters.BloomFilter !== 'undefined') {
    bossBloom = new PIXI.filters.BloomFilter({ strength: 2, quality: 3, brightness: 1.5 });
  }
  const filters = [];
  if (bossGlow) filters.push(bossGlow);
  if (bossBloom) filters.push(bossBloom);
  bossGfx.filters = filters;
  bossGfx.filterArea = app.renderer.screen;
  entityContainer.addChild(bossGfx);

  // Create label pools for world-space boss name + HP text
  const STYLE_BOSS_NAME = { fontFamily:'"Press Start 2P", monospace', fontSize:11, fill:'#ff8800', fontWeight:'bold' };
  const STYLE_BOSS_HP   = { fontFamily:'"Press Start 2P", monospace', fontSize:9, fill:'#ffcc88' };
  for (let i = 0; i < 8; i++) {
    const nl = makeText(STYLE_BOSS_NAME, 0, 0, 0.5, 0.5);
    const hl = makeText(STYLE_BOSS_HP, 0, 0, 0.5, 0.5);
    nl.visible = false; hl.visible = false;
    entityContainer.addChild(nl);
    entityContainer.addChild(hl);
    bossNameLabels.push(nl);
    bossHpLabels.push(hl);
  }
}

// ── Reset Boss ─────────────────────────────────────────
function resetBoss() {
  bosses = [];
  nextBossAt = BOSS_INTERVAL;
  bossWave = 0;
  bossIndex = 0;
  for (const nl of bossNameLabels) nl.destroy();
  for (const hl of bossHpLabels) hl.destroy();
  bossNameLabels = [];
  bossHpLabels = [];
}

// ── Accessors ──────────────────────────────────────────
function getBossCount() {
  return bosses.length;
}

function getBossMinimapLabel() {
  return bosses.length > 0 ? `${bosses.length} BOSS` : null;
}
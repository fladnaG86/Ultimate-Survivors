// ═══════════════════════════════════════════════════
//  Ultimate Survivor — boss.js
// ═══════════════════════════════════════════════════

// ── Boss Constants ────────────────────────────────────
const BOSS_INTERVAL = 80;    // secondi tra un'onda boss e la successiva
const BOSS_DEFS = [
  { name:'BEHEMOTH', radius:38, color:0xcc3300, hpMult:25, spdMult:0.45, reward:20, icon:'☠' },
  { name:'WRAITH',   radius:28, color:0x9922cc, hpMult:18, spdMult:0.85, reward:15, icon:'👻' },
  { name:'IRONCLAD', radius:44, color:0x558800, hpMult:35, spdMult:0.30, reward:25, icon:'🛡' },
];

// ── Boss State ────────────────────────────────────────
let bosses = [];
let bossGfx, bossHudGfx;
let txtBossName, txtBossHp;
let nextBossAt;
let bossWave = 0;
let bossIndex = 0;
let bossGlow = null;

// ── Boss Spawn ────────────────────────────────────────
function spawnBoss() {
  bossWave++;
  const count = bossWave;
  for (let i = 0; i < count; i++) {
    const def = BOSS_DEFS[bossIndex % BOSS_DEFS.length];
    bossIndex++;
    const W = app.renderer.width;
    const H = app.renderer.height;
    const angle = Math.random()*Math.PI*2 + (i * Math.PI * 2 / count);
    const dist  = Math.max(W, H)*0.6 + 80;
    const scale = 1 + gameTime/90;
    const maxHp = Math.ceil(def.hpMult * scale * 3);
    bosses.push({
      x: player.x + Math.cos(angle)*dist,
      y: player.y + Math.sin(angle)*dist,
      hp: maxHp, maxHp,
      speed: ENEMY_BASE_SPD * def.spdMult * (1 + gameTime/180),
      radius: def.radius,
      angle: 0,
      def, reward: def.reward,
      phase: 1,
      novaTimer: 0,
      _wasEnraged: false,
    });
  }
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
          if (Math.hypot(e.x-boss.x, e.y-boss.y) < novaR) e.hp += 1;
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

    // Hit da proiettili
    for (const b of bullets) {
      if (b._hitBoss) continue;
      if (Math.hypot(b.x-boss.x, b.y-boss.y) < boss.radius + b.radius) {
        const dmg = (player._crit && Math.random()<0.25) ? b.dmg*5 : b.dmg;
        boss.hp -= dmg;
        spawnParticles(b.x, b.y, '#ffaa00', 6);
        b._hitBoss = true;
        if (!player._pierce) b.life = 0;
      }
    }

    // Boss morto
    if (boss.hp <= 0) {
      spawnParticles(boss.x, boss.y, '#ff8800', 45);
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
    txtBossName.visible = false; txtBossHp.visible = false;
    bossHudGfx.clear();
    return;
  }

  const t = performance.now() / 1000;
  bossGfx.filters = [bossGlow];

  for (const boss of bosses) {
    const hpF = Math.max(0, boss.hp / boss.maxHp);
    const enraged = hpF < 0.30;
    bossGlow.color = enraged ? 0xff2200 : boss.def.color;

    // Outer ring pulse
    const pulse = 0.3 + Math.sin(t * (enraged ? 8 : 3)) * 0.2;
    g.circle(boss.x, boss.y, boss.radius + 8).stroke({width:enraged ? 3 : 2, color:enraged ? 0xff2200 : boss.def.color, alpha:pulse});

    // Body
    g.circle(boss.x, boss.y, boss.radius).fill({color:boss.def.color, alpha:1});

    // Inner dark core
    g.circle(boss.x, boss.y, boss.radius * 0.55).fill({color:0x000000, alpha:0.35});

    // Eye
    g.circle(
      boss.x + Math.cos(boss.angle) * boss.radius * 0.45,
      boss.y + Math.sin(boss.angle) * boss.radius * 0.45,
      enraged ? 7 : 5
    ).fill({color:enraged ? 0xff2200 : 0xffffff});

    // HP bar above boss (world space)
    const bw = boss.radius * 3.5;
    g.rect(boss.x - bw/2, boss.y - boss.radius - 14, bw, 6).fill({color:0x222222});
    g.rect(boss.x - bw/2, boss.y - boss.radius - 14, bw * hpF, 6).fill({color:enraged ? 0xff2200 : boss.def.color});
  }

  // HUD boss bars (bottom center, screen space)
  const W = app.renderer.width;
  const H = app.renderer.height;
  const hudG = bossHudGfx; hudG.clear();
  const barH = 16;
  const totalBarH = bosses.length * (barH + 6);
  const startY = H - 40 - totalBarH;
  const barW = Math.min(500, W * 0.55);
  const barX = (W - barW) / 2;

  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    const hpF = Math.max(0, boss.hp / boss.maxHp);
    const enraged = hpF < 0.30;
    const barY = startY + i * (barH + 6);
    hudG.rect(barX-2, barY-18, barW+4, barH+22).fill({color:0x000000, alpha:0.7});
    hudG.rect(barX, barY, barW, barH).fill({color:0x111111});
    hudG.rect(barX, barY, barW * hpF, barH).fill({color:enraged ? 0xff2200 : boss.def.color});
    hudG.rect(barX, barY, barW, barH).stroke({width:1, color:0xffffff, alpha:0.12});
  }

  // Info per primo boss o conteggio combinato
  if (bosses.length === 1) {
    const boss = bosses[0];
    const enraged = boss.hp / boss.maxHp < 0.30;
    txtBossName.visible = true; txtBossHp.visible = true;
    txtBossName.text = `${boss.def.icon} ${boss.def.name}${enraged ? '  ⚠ ENRAGE' : ''}`;
    txtBossName.alpha = enraged ? (0.7 + Math.sin(t*8)*0.3) : 1;
    txtBossName.x = W/2; txtBossName.y = startY - 16;
    txtBossHp.text = `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`;
    txtBossHp.x = W/2; txtBossHp.y = startY + barH + 4;
  } else {
    txtBossName.visible = true; txtBossHp.visible = false;
    txtBossName.text = `${bosses.length} BOSS ATTIVI`;
    txtBossName.alpha = 1;
    txtBossName.x = W/2; txtBossName.y = startY - 16;
  }
}

// ── Draw Boss on Minimap ──────────────────────────────
function drawBossOnMinimap(g, cx, cy, rad, playerX, playerY, RANGE) {
  for (const boss of bosses) {
    const dx=(boss.x-playerX)/RANGE*rad, dy=(boss.y-playerY)/RANGE*rad;
    const inRange = Math.hypot(dx,dy) <= rad;
    const dotX = inRange ? cx+dx : cx + (dx/Math.hypot(dx,dy||1))*rad*0.92;
    const dotY = inRange ? cy+dy : cy + (dy/Math.hypot(dx,dy||1))*rad*0.92;
    const pulse = 0.6 + Math.sin(performance.now()/250)*0.4;
    g.circle(dotX, dotY, inRange ? 5 : 4).stroke({width:1.5, color:0xff4400, alpha:pulse});
    g.circle(dotX, dotY, inRange ? 4 : 3).fill({color:0xff4400});
  }
}

// ── Init Boss Display ──────────────────────────────────
function initBossDisplay() {
  bossGfx = new PIXI.Graphics();
  bossGlow = new PIXI.filters.GlowFilter({ distance: 15, outerStrength: 3, color: 0xff4400 });
  bossGfx.filters = [bossGlow];
  entityContainer.addChild(bossGfx);

  bossHudGfx = new PIXI.Graphics();
  hudContainer.addChild(bossHudGfx);

  const W = app.renderer.width;
  const H = app.renderer.height;
  const STYLE_BOSS_NAME = { fontFamily:'Courier New', fontSize:13, fill:'#ff8800', fontWeight:'bold' };
  const STYLE_BOSS_HP   = { fontFamily:'Courier New', fontSize:10, fill:'#ffcc88' };
  txtBossName = makeText(STYLE_BOSS_NAME, W/2, H-52, 0.5, 0.5); hudContainer.addChild(txtBossName);
  txtBossHp   = makeText(STYLE_BOSS_HP,   W/2, H-36, 0.5, 0.5); hudContainer.addChild(txtBossHp);
  txtBossName.visible = false; txtBossHp.visible = false;
}

// ── Reset Boss ─────────────────────────────────────────
function resetBoss() {
  bosses = [];
  nextBossAt = BOSS_INTERVAL;
  bossWave = 0;
  bossIndex = 0;
}

// ── Accessors ──────────────────────────────────────────
function getBossCount() {
  return bosses.length;
}

function getBossMinimapLabel() {
  return bosses.length > 0 ? `${bosses.length} BOSS` : null;
}
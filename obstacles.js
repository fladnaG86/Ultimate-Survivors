// ═══════════════════════════════════════════════════
//  Ultimate Survivor — obstacles.js
// ═══════════════════════════════════════════════════

// ── Obstacle State ──────────────────────────────────────
let obstacles = [];
let obstacleSprites = [];

// ── Utility ─────────────────────────────────────────────
function cellHash(cx, cy) {
  let h = (cx * 374761393 ^ cy * 1103515245) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return h;
}

// ── Obstacle Generation ────────────────────────────────
function generateObstacles() {
  obstacles = [];
  const MAP_SIZE = 10000;
  const CELL = 180;
  for (let cx = -MAP_SIZE / CELL; cx <= MAP_SIZE / CELL; cx++) {
    for (let cy = -MAP_SIZE / CELL; cy <= MAP_SIZE / CELL; cy++) {
      const h = cellHash(cx, cy);
      if (h % 7 === 0 && h % 5 !== 0) {
        // Size categories: 0=small, 1=medium, 2=large, 3=huge
        const sizeCat = h % 4;
        const radius = [40, 65, 100, 150][sizeCat];
        const ox = cx * CELL + (h % CELL) - CELL / 2;
        const oy = cy * CELL + ((h >> 8) % CELL) - CELL / 2;

        // Biome-aware density filtering
        const obsBiome = getDominantBiome(getBiomeWeights(ox, oy));
        const density = BIOMES[obsBiome].obstacleDensity;
        if (((h >>> 20) % 100) / 100 > density) continue;

        const catRoll = ((h >> 4) * 2654435761 >>> 0) % 100;
        const texCategory = catRoll < 60 ? 0 : catRoll < 85 ? 1 : 2;
        obstacles.push({
          x: ox, y: oy, radius,
          type: h % 8,
          texCategory,
          biome: obsBiome,
        });
      }
    }
  }
}

// ── Player-Obstacle Collision (spatial grid) ───────────
//  Returns { canMoveX, canMoveY } for wall-sliding movement.
let _playerObsResult = { canMoveX: true, canMoveY: true };
function resolvePlayerObstacles(px, py, tryX, tryY, playerRadius) {
  let canMoveX = true;
  const nearObs = spatialObstaclesNearby(tryX, py, playerRadius + 200);
  const nearLen = spatialObstaclesNearbyCount();
  for (let i = 0; i < nearLen; i++) {
    const obs = nearObs[i];
    if (Math.hypot(tryX - obs.x, py - obs.y) < obs.radius + playerRadius) {
      canMoveX = false;
      break;
    }
  }

  let canMoveY = true;
  const curX = canMoveX ? tryX : px;
  const nearObs2 = spatialObstaclesNearby(curX, tryY, playerRadius + 200);
  const nearLen2 = spatialObstaclesNearbyCount();
  for (let i = 0; i < nearLen2; i++) {
    const obs = nearObs2[i];
    if (Math.hypot(curX - obs.x, tryY - obs.y) < obs.radius + playerRadius) {
      canMoveY = false;
      break;
    }
  }

  _playerObsResult.canMoveX = canMoveX;
  _playerObsResult.canMoveY = canMoveY;
  return _playerObsResult;
}

// ── Enemy-Obstacle Collision (spatial grid) ────────────
//  Pushes enemy out of overlapping obstacles (iterative).
function resolveEnemyObstacles(e) {
  const checkR = e.radius + 200;
  const nearObs = spatialObstaclesNearby(e.x, e.y, checkR);
  const nearLen = spatialObstaclesNearbyCount();
  for (let iter = 0; iter < 3; iter++) {
    let pushed = false;
    for (let i = 0; i < nearLen; i++) {
      const obs = nearObs[i];
      const obsDist = Math.hypot(e.x - obs.x, e.y - obs.y);
      if (obsDist < obs.radius + e.radius) {
        const pushAngle = Math.atan2(e.y - obs.y, e.x - obs.x) || 0;
        e.x = obs.x + Math.cos(pushAngle) * (obs.radius + e.radius + 1);
        e.y = obs.y + Math.sin(pushAngle) * (obs.radius + e.radius + 1);
        pushed = true;
      }
    }
    if (!pushed) break;
  }
}

// ── Obstacle Sprite Pool ────────────────────────────────
function initObstacleSprites(container) {
  // Remove old sprites
  for (const spr of obstacleSprites) container.removeChild(spr);
  obstacleSprites = [];

  const RUIN_THEMES = ['bluegray','brown','browngray','sand','snow','water','white','yellow'];

  for (const obs of obstacles) {
    let spr;
    const cat = obs.texCategory || 0;

    if (cat === 0 && SpriteGen.rockTextures && SpriteGen.rockTextures.length > 0) {
      spr = new PIXI.Sprite(SpriteGen.getRockTexture(obs.type));
      spr.anchor.set(0.5);
      const scale = (obs.radius * 2.4) / 64;
      spr.scale.set(scale);
      spr.tint = BIOMES[obs.biome || 'forest'].rockTint;
    } else if (cat === 1 && SpriteGen.ruinTextures && SpriteGen.ruinTextures.length > 0) {
      const theme = BIOMES[obs.biome || 'forest'].ruinTheme || 'brown';
      const themeIndex = RUIN_THEMES.indexOf(theme);
      const variant = obs.type % 5;
      const ruinIdx = (themeIndex >= 0 ? themeIndex : 1) * 5 + variant;
      spr = new PIXI.Sprite(SpriteGen.ruinTextures[ruinIdx % SpriteGen.ruinTextures.length]);
      spr.anchor.set(0.5);
      const maxDim = Math.max(spr.texture.width, spr.texture.height);
      spr.scale.set((obs.radius * 2.0) / maxDim);
    } else if (cat === 2 && SpriteGen.undeadTextures && SpriteGen.undeadTextures.length > 0) {
      spr = new PIXI.Sprite(SpriteGen.getUndeadTexture(obs.type));
      spr.anchor.set(0.5);
      spr.scale.set((obs.radius * 2.0) / 32);
      spr.tint = BIOMES[obs.biome || 'forest'].rockTint;
    } else {
      spr = new PIXI.Sprite(SpriteGen.rockTextures && SpriteGen.rockTextures.length > 0
        ? SpriteGen.getRockTexture(obs.type) : PIXI.Texture.EMPTY);
      spr.anchor.set(0.5);
      if (!SpriteGen.rockTextures || SpriteGen.rockTextures.length === 0) spr.visible = false;
      else {
        const scale = (obs.radius * 2.4) / 64;
        spr.scale.set(scale);
        spr.tint = BIOMES[obs.biome || 'forest'].rockTint;
      }
    }
    spr.x = obs.x;
    spr.y = obs.y;
    container.addChild(spr);
    obstacleSprites.push(spr);
  }
}

// ── Update Obstacle Sprite Positions ────────────────────
//  Called after camera changes to keep sprites in world position
function updateObstacleSprites() {
  for (let i = 0; i < obstacles.length && i < obstacleSprites.length; i++) {
    obstacleSprites[i].x = obstacles[i].x;
    obstacleSprites[i].y = obstacles[i].y;
  }
}

// ── Draw Obstacles ──────────────────────────────────────
//  Only draws HP bars / effects; sprites are handled by the sprite pool.
function drawObstacles(g, cameraX, cameraY, screenW, screenH) {
  // Sprites are positioned in worldContainer and auto-culled by PixiJS
  // This function is kept for any overlay effects (e.g., boundary glow)
}
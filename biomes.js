// ═══════════════════════════════════════════════════
//  Ultimate Survivor — biomes.js
// ═══════════════════════════════════════════════════

const TRANSITION_PX = 800;

const BIOME_ANCHORS = [
  { id: 'forest', x: 0,     y: 0 },
  { id: 'desert', x: 8000,  y: 0 },
  { id: 'ice',    x: 0,     y: -8000 },
  { id: 'swamp',  x: -6000, y: 6000 },
];

const BIOMES = {
  forest: {
    name: 'Foresta',
    texturePath: 'assets/terrain/forest.png',
    gridColor: 0x1a3344,    gridAlpha: 0.035,
    bigGridColor: 0x1a3344, bigGridAlpha: 0.065,
    decoColor: 0x3366aa,    decoRingColor: 0x224477,
    canvasColor: 0x030508,
    rockTint: 0xcccccc,     obstacleDensity: 1.0,
    enemySlime: 1,           enemyBigSlime: 2,
    enemyTypes:  [{type:'orc1',w:0.55},{type:'orc2',w:0.30},{type:'slime',w:0.15}],
    enemyBigTypes:[{type:'orc3',w:0.60},{type:'orc2',w:0.25},{type:'slime',w:0.15}],
    enemyTint: 0xffffff,     enemyBigTint: 0xffffff,
    hpMult: 1.0,            spdMult: 1.0,
    xpMult: 1.0,
    ruinTheme: 'brown',
    behaviorWeights: { chaser:0.80, charger:0.05, orbiter:0.10, exploder:0.05 },
  },
  desert: {
    name: 'Deserto',
    texturePath: 'assets/terrain/desert.png',
    gridColor: 0x332211,    gridAlpha: 0.03,
    bigGridColor: 0x332211, bigGridAlpha: 0.055,
    decoColor: 0x997744,    decoRingColor: 0x886633,
    canvasColor: 0x0e0a05,
    rockTint: 0xbb9966,     obstacleDensity: 0.6,
    enemySlime: 1,           enemyBigSlime: 2,
    enemyTypes:  [{type:'plant1',w:0.55},{type:'plant2',w:0.30},{type:'slime',w:0.15}],
    enemyBigTypes:[{type:'plant3',w:0.60},{type:'plant2',w:0.25},{type:'slime',w:0.15}],
    enemyTint: 0xff9944,     enemyBigTint: 0xcc6600,
    hpMult: 1.5,            spdMult: 1.1,
    xpMult: 1.5,
    ruinTheme: 'sand',
    behaviorWeights: { chaser:0.65, charger:0.25, orbiter:0.05, exploder:0.05 },
  },
  ice: {
    name: 'Ghiaccio',
    texturePath: 'assets/terrain/ice.png',
    gridColor: 0x223344,    gridAlpha: 0.035,
    bigGridColor: 0x223344, bigGridAlpha: 0.065,
    decoColor: 0x7799aa,    decoRingColor: 0x556677,
    canvasColor: 0x050810,
    rockTint: 0x99aabb,     obstacleDensity: 0.8,
    enemySlime: 1,           enemyBigSlime: 2,
    enemyTypes:  [{type:'slime',w:0.55},{type:'orc2',w:0.25},{type:'plant2',w:0.20}],
    enemyBigTypes:[{type:'slime',w:0.55},{type:'orc2',w:0.25},{type:'plant2',w:0.20}],
    enemyTint: 0x88ccff,     enemyBigTint: 0x6699cc,
    hpMult: 1.3,            spdMult: 0.9,
    xpMult: 1.3,
    ruinTheme: 'snow',
    behaviorWeights: { chaser:0.75, charger:0.15, orbiter:0.05, exploder:0.05 },
  },
  swamp: {
    name: 'Palude',
    texturePath: 'assets/terrain/swamp.png',
    gridColor: 0x1a2211,    gridAlpha: 0.03,
    bigGridColor: 0x1a2211, bigGridAlpha: 0.055,
    decoColor: 0x446644,    decoRingColor: 0x334433,
    canvasColor: 0x050a04,
    rockTint: 0x557744,     obstacleDensity: 1.2,
    enemySlime: 3,           enemyBigSlime: 2,
    enemyTypes:  [{type:'vamp1',w:0.55},{type:'vamp2',w:0.30},{type:'slime',w:0.15}],
    enemyBigTypes:[{type:'vamp3',w:0.60},{type:'vamp2',w:0.25},{type:'slime',w:0.15}],
    enemyTint: 0x66cc44,     enemyBigTint: 0x448822,
    hpMult: 1.8,            spdMult: 1.2,
    xpMult: 2.0,
    ruinTheme: 'browngray',
    behaviorWeights: { chaser:0.70, charger:0.05, orbiter:0.05, exploder:0.20 },
  },
};

// ── Biome Weight Calculation ────────────────────────────
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Reusable objects to avoid per-frame allocation
const _reusableWeights = { forest: 0, desert: 0, ice: 0, swamp: 0 };
const _distsArr = [
  { id: '', d: 0 },
  { id: '', d: 0 },
  { id: '', d: 0 },
  { id: '', d: 0 },
];

function getBiomeWeights(wx, wy, out) {
  // Compute distances (reuse array to avoid allocation)
  for (let i = 0; i < 4; i++) {
    _distsArr[i].id = BIOME_ANCHORS[i].id;
    _distsArr[i].d = Math.hypot(wx - BIOME_ANCHORS[i].x, wy - BIOME_ANCHORS[i].y);
  }
  _distsArr.sort((a, b) => a.d - b.d);

  const w = out || _reusableWeights;
  w.forest = 0; w.desert = 0; w.ice = 0; w.swamp = 0;
  if (_distsArr[1].d - _distsArr[0].d >= TRANSITION_PX) {
    w[_distsArr[0].id] = 1;
  } else {
    const t = smoothstep(0, TRANSITION_PX, _distsArr[1].d - _distsArr[0].d);
    w[_distsArr[0].id] = t;
    w[_distsArr[1].id] = 1 - t;
  }
  return w;
}

function getDominantBiome(weights) {
  let best = 'forest', bestW = 0;
  if (weights.forest > bestW) { bestW = weights.forest; best = 'forest'; }
  if (weights.desert > bestW) { bestW = weights.desert; best = 'desert'; }
  if (weights.ice > bestW) { bestW = weights.ice; best = 'ice'; }
  if (weights.swamp > bestW) { bestW = weights.swamp; best = 'swamp'; }
  return best;
}

// Fast dominant biome without allocating weights object
function getDominantBiomeAt(wx, wy) {
  let bestId = 'forest', bestD = Infinity, secondD = Infinity;
  for (let i = 0; i < 4; i++) {
    const d = Math.hypot(wx - BIOME_ANCHORS[i].x, wy - BIOME_ANCHORS[i].y);
    if (d < bestD) { secondD = bestD; bestD = d; bestId = BIOME_ANCHORS[i].id; }
    else if (d < secondD) { secondD = d; }
  }
  // If clearly inside one biome, no transition
  if (secondD - bestD >= TRANSITION_PX) return bestId;
  // In transition zone — use weights for accuracy
  getBiomeWeights(wx, wy, _reusableWeights);
  return getDominantBiome(_reusableWeights);
}

// ── Color/Alpha Blending ────────────────────────────────
function blendColor(weights, colorKey) {
  let r = 0, g = 0, b = 0;
  for (const id of ['forest', 'desert', 'ice', 'swamp']) {
    const w = weights[id];
    if (w === 0) continue;
    const c = BIOMES[id][colorKey];
    r += ((c >> 16) & 0xff) * w;
    g += ((c >> 8) & 0xff) * w;
    b += (c & 0xff) * w;
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function blendAlpha(weights, alphaKey) {
  let a = 0;
  for (const id of ['forest', 'desert', 'ice', 'swamp']) {
    a += BIOMES[id][alphaKey] * weights[id];
  }
  return a;
}

// ── Biome-specific Decorations ──────────────────────────
function drawBiomeDecoration(g, type, wx, wy, alpha, biomeId) {
  const color = BIOMES[biomeId].decoColor;
  const ringColor = BIOMES[biomeId].decoRingColor;

  switch (biomeId) {
    case 'forest':
      if (type === 0) {
        g.rect(wx - 2, wy - 0.5, 4, 1).fill({ color, alpha });
        g.rect(wx - 0.5, wy - 2, 1, 4).fill({ color, alpha });
      } else if (type === 1) {
        g.circle(wx, wy, 1.5).fill({ color, alpha });
      } else if (type === 2) {
        g.moveTo(wx, wy - 4); g.lineTo(wx + 3, wy); g.lineTo(wx, wy + 4); g.lineTo(wx - 3, wy); g.closePath(); g.fill({ color, alpha });
      } else {
        g.circle(wx, wy, 4).stroke({ width: 0.5, color: ringColor, alpha });
      }
      break;

    case 'desert':
      if (type === 0) {
        g.rect(wx - 3, wy - 0.4, 6, 0.8).fill({ color, alpha });
      } else if (type === 1) {
        g.circle(wx, wy, 1).fill({ color, alpha });
      } else if (type === 2) {
        g.rect(wx - 4, wy - 0.3, 2, 0.6).fill({ color, alpha });
        g.rect(wx - 0.5, wy - 0.3, 2, 0.6).fill({ color, alpha });
        g.rect(wx + 3, wy - 0.3, 2, 0.6).fill({ color, alpha });
      } else {
        g.moveTo(wx - 4, wy); g.quadraticCurveTo(wx, wy - 3, wx + 4, wy);
        g.stroke({ width: 0.5, color: ringColor, alpha });
      }
      break;

    case 'ice':
      if (type === 0) {
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * 3, wy + Math.sin(a) * 3);
        }
        g.stroke({ width: 0.5, color, alpha });
      } else if (type === 1) {
        g.moveTo(wx, wy - 2.5); g.lineTo(wx + 2, wy); g.lineTo(wx, wy + 2.5); g.lineTo(wx - 2, wy); g.closePath(); g.fill({ color, alpha });
      } else if (type === 2) {
        g.circle(wx, wy, 3).stroke({ width: 0.4, color: ringColor, alpha });
      } else {
        g.moveTo(wx, wy - 3); g.lineTo(wx + 1, wy - 1); g.lineTo(wx + 3, wy);
        g.lineTo(wx + 1, wy + 1); g.lineTo(wx, wy + 3); g.lineTo(wx - 1, wy + 1);
        g.lineTo(wx - 3, wy); g.lineTo(wx - 1, wy - 1); g.closePath(); g.fill({ color, alpha });
      }
      break;

    case 'swamp':
      if (type === 0) {
        g.rect(wx - 2, wy - 0.5, 4, 1).fill({ color, alpha });
        g.rect(wx - 0.5, wy - 2, 1, 4).fill({ color, alpha });
      } else if (type === 1) {
        g.circle(wx, wy, 1.8).fill({ color, alpha });
      } else if (type === 2) {
        g.circle(wx - 1.5, wy, 2).fill({ color, alpha });
        g.circle(wx + 2, wy - 1, 1.5).fill({ color, alpha });
      } else {
        g.circle(wx, wy, 4).stroke({ width: 0.5, color: ringColor, alpha });
        g.circle(wx, wy, 2).stroke({ width: 0.3, color: ringColor, alpha });
      }
      break;
  }
}
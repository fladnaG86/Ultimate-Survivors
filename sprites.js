// ═══════════════════════════════════════════════════
//  Ultimate Survivor — sprites.js  (procedural + sheet textures)
// ═══════════════════════════════════════════════════

const SpriteGen = {
  textures: {},
  // slimeFrames[slimeType][direction][frame] = PIXI.Texture
  slimeFrames: {},
  // rockTextures[0..7] = PIXI.Texture
  rockTextures: [],
  // New enemy sprite system
  enemyFrames: {},    // enemyFrames['orc1']['down'][0..5] = PIXI.Texture
  enemyMeta: {},      // enemyMeta['orc1'] = { cols, frameSize }
  // Obstacle textures
  ruinTextures: [],
  undeadTextures: [],
  // Terrain textures for biomes
  terrainTextures: {}, // terrainTextures['forest'] = PIXI.Texture

  async generateAll(app) {
    this.textures.player = await this._player(app);
    this.textures.playerInvuln = await this._playerInvuln(app);
    this.textures.bullet = await this._bullet(app);
    this.textures.bulletPierce = await this._bulletPierce(app);
    this.textures.xpGem = await this._xpGem(app);
    this.textures.enemy = await this._enemy(app);
    this.textures.enemyBig = await this._enemyBig(app);
    this.textures.chest = await this._chest(app);

    await this._loadSlimeSheets(app);
    await this._loadRockTextures(app);
    await this._loadEnemySheets(app);
    await this._loadRuinTextures(app);
    await this._loadUndeadTextures(app);
    await this._loadTerrainTextures(app);
  },

  async _player(app) {
    const g = new PIXI.Graphics();
    // Hooded mage silhouette (fallback texture — drawPlayer draws the real sprite)
    g.circle(16, 16, 10).fill(0x44aaff);
    // Pointed hood
    g.moveTo(10, 12).lineTo(16, 4).lineTo(22, 12).closePath().fill(0x44aaff);
    // Eyes
    g.circle(13, 15, 2).fill(0xffffff);
    g.circle(19, 15, 2).fill(0xffffff);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _playerInvuln(app) {
    const g = new PIXI.Graphics();
    g.circle(16, 16, 10).fill(0x44aaff);
    g.moveTo(10, 12).lineTo(16, 4).lineTo(22, 12).closePath().fill(0x44aaff);
    g.circle(13, 15, 2).fill(0xffffff);
    g.circle(19, 15, 2).fill(0xffffff);
    g.circle(16, 16, 14).stroke({ width: 2, color: 0x66ccff, alpha: 0.5 });
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _bullet(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0xffdc3c);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _bulletPierce(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0x00ff8c);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _xpGem(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0x00ff88);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _enemy(app) {
    const g = new PIXI.Graphics();
    g.circle(8, 8, 8).fill(0xdd3322);
    g.circle(11.5, 8, 2.5).fill(0xffffff);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _enemyBig(app) {
    const g = new PIXI.Graphics();
    g.circle(16, 16, 16).fill(0xcc6600);
    g.circle(19.5, 16, 3.5).fill(0xffffff);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  async _chest(app) {
    const g = new PIXI.Graphics();
    g.rect(0, 0, 24, 16).fill({ color: 0xb7410e, rounded: 2 });
    g.rect(0, 0, 24, 4).fill(0xffdd00);
    g.rect(10, 4, 4, 8).fill(0xffdd00);
    g.rect(6, 7, 12, 2).fill(0xffdd00);
    const tex = app.renderer.generateTexture({ target: g });
    tex.source.scaleMode = 'nearest';
    return tex;
  },

  // ── Slime sprite sheets ──────────────────────────────────
  //  Each sheet: 8 columns (frames) × 4 rows (directions)
  //  Row order: down, left, right, up
  //  Frame size: 64×64
  async _loadSlimeSheets(app) {
    const FRAME = 64;
    const COLS = 8;
    const ROWS = 4;
    const sheets = [
      { id: 1, src: 'assets/slime1_walk.png' },  // regular enemy
      { id: 2, src: 'assets/slime2_walk.png' },  // big enemy
      { id: 3, src: 'assets/slime3_walk.png' },  // variant
    ];
    // Direction row indices: down=0, left=1, right=2, up=3
    const DIRS = ['down', 'left', 'right', 'up'];

    for (const sheet of sheets) {
      const baseTex = await PIXI.Assets.load(sheet.src);
      baseTex.source.scaleMode = 'nearest';
      this.slimeFrames[sheet.id] = {};
      for (let dir = 0; dir < ROWS; dir++) {
        this.slimeFrames[sheet.id][DIRS[dir]] = [];
        for (let col = 0; col < COLS; col++) {
          const frame = new PIXI.Texture({
            source: baseTex.source,
            frame: new PIXI.Rectangle(col * FRAME, dir * FRAME, FRAME, FRAME),
          });
          this.slimeFrames[sheet.id][DIRS[dir]].push(frame);
        }
      }
    }
  },

  // ── Rock textures ────────────────────────────────────────
  async _loadRockTextures(app) {
    for (let i = 1; i <= 8; i++) {
      const tex = await PIXI.Assets.load(`assets/rock${i}.png`);
      tex.source.scaleMode = 'nearest';
      this.rockTextures.push(tex);
    }
  },

  // Get a rock texture, cycling through 8 types based on a seed
  getRockTexture(seed) {
    return this.rockTextures[seed % this.rockTextures.length];
  },

  // Get the correct frame for a slime type, direction, and animation time
  getSlimeFrame(slimeType, angle, animTime) {
    const fps = 8;
    const frame = Math.floor(animTime * fps) % 8;
    // Map angle (from enemy to player) to direction
    // In game coords: y increases downward
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    let dir;
    if (deg >= 225 && deg < 315) dir = 'up';      // player is above enemy
    else if (deg >= 135 && deg < 225) dir = 'left';  // player is to the left
    else if (deg >= 45 && deg < 135) dir = 'down';    // player is below enemy
    else dir = 'right';                                // player is to the right

    return this.slimeFrames[slimeType][dir][frame];
  },

  // ── New enemy sprite sheets (orcs, vampires, plants) ───
  async _loadEnemySheets(app) {
    const FRAME = 64;
    const ROWS = 4;
    const DIRS = ['down', 'left', 'right', 'up'];
    const sheets = [
      { key: 'orc1',   src: 'assets/orc1_walk.png',   cols: 6 },
      { key: 'orc2',   src: 'assets/orc2_walk.png',   cols: 6 },
      { key: 'orc3',   src: 'assets/orc3_walk.png',   cols: 6 },
      { key: 'vamp1',  src: 'assets/vamp1_walk.png',   cols: 6 },
      { key: 'vamp2',  src: 'assets/vamp2_walk.png',   cols: 6 },
      { key: 'vamp3',  src: 'assets/vamp3_walk.png',   cols: 6 },
      { key: 'plant1', src: 'assets/plant1_walk.png',   cols: 6 },
      { key: 'plant2', src: 'assets/plant2_walk.png',   cols: 6 },
      { key: 'plant3', src: 'assets/plant3_walk.png',   cols: 6 },
    ];

    for (const sheet of sheets) {
      const baseTex = await PIXI.Assets.load(sheet.src);
      baseTex.source.scaleMode = 'nearest';
      this.enemyFrames[sheet.key] = {};
      this.enemyMeta[sheet.key] = { cols: sheet.cols, frameSize: FRAME };
      for (let dir = 0; dir < ROWS; dir++) {
        this.enemyFrames[sheet.key][DIRS[dir]] = [];
        for (let col = 0; col < sheet.cols; col++) {
          const frame = new PIXI.Texture({
            source: baseTex.source,
            frame: new PIXI.Rectangle(col * FRAME, dir * FRAME, FRAME, FRAME),
          });
          this.enemyFrames[sheet.key][DIRS[dir]].push(frame);
        }
      }
    }
  },

  getEnemyFrame(sheetKey, angle, animTime) {
    const meta = this.enemyMeta[sheetKey];
    const fps = 8;
    const frame = Math.floor(animTime * fps) % meta.cols;
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    let dir;
    if (deg >= 225 && deg < 315) dir = 'up';
    else if (deg >= 135 && deg < 225) dir = 'left';
    else if (deg >= 45 && deg < 135) dir = 'down';
    else dir = 'right';
    return this.enemyFrames[sheetKey][dir][frame];
  },

  // ── Ruin textures (40 total: 8 themes × 5 variants) ────
  async _loadRuinTextures(app) {
    const themes = ['bluegray','brown','browngray','sand','snow','water','white','yellow'];
    for (const theme of themes) {
      for (let v = 1; v <= 5; v++) {
        const tex = await PIXI.Assets.load(`assets/ruin_${theme}${v}.png`);
        tex.source.scaleMode = 'nearest';
        this.ruinTextures.push(tex);
      }
    }
  },

  getRuinTexture(seed) {
    return this.ruinTextures[seed % this.ruinTextures.length];
  },

  // ── Undead/bones textures (27 total: 9 categories × 3 variants) ──
  async _loadUndeadTextures(app) {
    const categories = ['bones','grave','skulldoor','crystal','deadtree','thorn','ruin','lich','pile'];
    for (const cat of categories) {
      for (let v = 1; v <= 3; v++) {
        const tex = await PIXI.Assets.load(`assets/undead_${cat}${v}.png`);
        tex.source.scaleMode = 'nearest';
        this.undeadTextures.push(tex);
      }
    }
  },

  getUndeadTexture(seed) {
    return this.undeadTextures[seed % this.undeadTextures.length];
  },

  // ── Value noise helpers for procedural terrain ────────────
  _hash(x, y, seed) {
    let h = seed + x * 374761393 + y * 1103515245;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h);
    return (h & 0xffff) / 65536;
  },

  _valueNoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = this._hash(ix, iy, seed);
    const n10 = this._hash(ix + 1, iy, seed);
    const n01 = this._hash(ix, iy + 1, seed);
    const n11 = this._hash(ix + 1, iy + 1, seed);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  },

  _noise(x, y, seed, octaves = 2) {
    let val = 0, amp = 1, freq = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      val += this._valueNoise(x * freq, y * freq, seed + i * 1000) * amp;
      maxVal += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return val / maxVal;
  },

  _warpedNoise(x, y, seed, warp = 50) {
    const dx = (this._noise(x, y, seed + 500, 2) - 0.5) * warp;
    const dy = (this._noise(x, y, seed + 600, 2) - 0.5) * warp;
    return this._noise(x + dx, y + dy, seed, 3);
  },

  _colorFromStops(val, stops) {
    if (val <= stops[0][0]) { const s = stops[0]; return (s[1]<<16)|(s[2]<<8)|s[3]; }
    if (val >= stops[stops.length-1][0]) { const s = stops[stops.length-1]; return (s[1]<<16)|(s[2]<<8)|s[3]; }
    for (let i = 0; i < stops.length - 1; i++) {
      if (val >= stops[i][0] && val <= stops[i+1][0]) {
        const t = (val - stops[i][0]) / (stops[i+1][0] - stops[i][0]);
        const a = stops[i], b = stops[i+1];
        const r = Math.round(a[1] + (b[1] - a[1]) * t);
        const g = Math.round(a[2] + (b[2] - a[2]) * t);
        const bb = Math.round(a[3] + (b[3] - a[3]) * t);
        return (r<<16)|(g<<8)|bb;
      }
    }
    const s = stops[stops.length-1];
    return (s[1]<<16)|(s[2]<<8)|s[3];
  },

  // ── Terrain textures for biomes (Canvas 2D procedural + value noise) ──
  async _loadTerrainTextures(app) {
    const biomes = ['forest', 'desert', 'ice', 'swamp'];
    const TILE = 1024;

    const seededRandom = (seed) => {
      const x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    const rand = (seed, min, max) => min + seededRandom(seed) * (max - min);

    const COLOR_MAPS = {
      forest: [[0.0,20,14,10],[0.25,26,40,26],[0.50,40,65,40],[0.70,50,80,50],[0.85,65,95,60],[1.0,75,110,70]],
      desert: [[0.0,35,20,10],[0.25,75,55,30],[0.50,110,85,55],[0.70,140,110,70],[0.85,160,125,80],[1.0,175,140,95]],
      ice:    [[0.0,25,30,40],[0.25,55,70,80],[0.50,90,115,130],[0.70,140,165,180],[0.85,190,210,220],[1.0,220,235,245]],
      swamp:  [[0.0,12,16,8],[0.25,25,38,20],[0.50,40,58,30],[0.70,55,72,38],[0.85,65,82,45],[1.0,75,95,55]],
    };

    for (const biome of biomes) {
      const c = document.createElement('canvas');
      c.width = c.height = TILE;
      const ctx = c.getContext('2d');
      const S = biomes.indexOf(biome) * 10000;
      const colorStops = COLOR_MAPS[biome];

      // Forest: use image pattern instead of procedural generation
      if (biome === 'forest') {
        try {
          const img = new Image();
          img.src = 'assets/terrain/forest.png';
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });
          ctx.drawImage(img, 0, 0, TILE, TILE);
        } catch (e) {
          // Fallback to procedural if image fails
          this._generateProceduralTerrain(ctx, biome, TILE, S, colorStops, rand);
        }
      } else {
        this._generateProceduralTerrain(ctx, biome, TILE, S, colorStops, rand);
      }

      const terrainTex = PIXI.Texture.from(c);
      terrainTex.source.scaleMode = 'nearest';
      this.terrainTextures[biome] = terrainTex;
    }
  },

  _generateProceduralTerrain(ctx, biome, TILE, S, colorStops, rand) {
    const c = ctx.canvas;
    // Fill canvas pixel by pixel using noise → color mapping
    const imageData = ctx.createImageData(TILE, TILE);
    const data = imageData.data;
    const inv = 1 / TILE;
    const freq = 0.006;

    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const nx = px * inv, ny = py * inv;
        const n = this._warpedNoise(nx / freq, ny / freq, S + 200, 0.5);
        const col = this._colorFromStops(n, colorStops);
        const idx = (py * TILE + px) * 4;
        data[idx] = (col >> 16) & 0xff;
        data[idx+1] = (col >> 8) & 0xff;
        data[idx+2] = col & 0xff;
        data[idx+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Biome-specific detail layers
    if (biome === 'forest') {
      for (let i = 0; i < 800; i++) {
        const seed = S + 500 + i;
        const x = rand(seed, 0, TILE);
        const y = rand(seed + 1, 0, TILE);
        const h = rand(seed + 2, 8, 22);
        const w = rand(seed + 3, 3, 6);
        ctx.fillStyle = `rgba(35,55,30,${rand(seed+4,0.12,0.28)})`;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = `rgba(45,70,35,${rand(seed+5,0.12,0.28)})`;
        ctx.fillRect(x + 1, y - 2, w, h);
      }
    } else if (biome === 'desert') {
      for (let i = 0; i < 300; i++) {
        const seed = S + 500 + i;
        const y = rand(seed, 0, TILE);
        const amp = rand(seed + 1, 3, 8);
        ctx.strokeStyle = `rgba(120,85,50,${rand(seed+2,0.08,0.2)})`;
        ctx.lineWidth = rand(seed + 3, 1, 3);
        ctx.beginPath();
        for (let px = 0; px <= TILE; px += 8) {
          const py = y + Math.sin(px * 0.02 + seed) * amp;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 400; i++) {
        const seed = S + 600 + i;
        const x = rand(seed, 0, TILE);
        const y = rand(seed + 1, 0, TILE);
        const r = rand(seed + 2, 3, 7);
        ctx.fillStyle = `rgba(130,95,60,${rand(seed+3,0.15,0.3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === 'ice') {
      for (let i = 0; i < 150; i++) {
        const seed = S + 500 + i;
        let x = rand(seed, 0, TILE);
        let y = rand(seed + 1, 0, TILE);
        ctx.strokeStyle = `rgba(100,130,150,${rand(seed+2,0.12,0.35)})`;
        ctx.lineWidth = rand(seed + 3, 1, 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let step = 0; step < 6; step++) {
          x += rand(seed + 10 + step, -30, 30);
          y += rand(seed + 20 + step, 10, 40);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 400; i++) {
        const seed = S + 600 + i;
        const x = rand(seed, 0, TILE);
        const y = rand(seed + 1, 0, TILE);
        const r = rand(seed + 2, 6, 18);
        ctx.fillStyle = `rgba(220,235,245,${rand(seed+3,0.08,0.2)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === 'swamp') {
      for (let i = 0; i < 250; i++) {
        const seed = S + 500 + i;
        const x = rand(seed, 0, TILE);
        const y = rand(seed + 1, 0, TILE);
        const w = rand(seed + 2, 25, 80);
        const h = rand(seed + 3, 10, 30);
        ctx.fillStyle = `rgba(40,55,30,${rand(seed+4,0.12,0.3)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, rand(seed+5,0,Math.PI), 0, Math.PI*2);
        ctx.fill();
      }
      for (let i = 0; i < 500; i++) {
        const seed = S + 600 + i;
        const x = rand(seed, 0, TILE);
        const y = rand(seed + 1, 0, TILE);
        const w = rand(seed + 2, 4, 12);
        const h = rand(seed + 3, 4, 12);
        ctx.fillStyle = `rgba(30,40,20,${rand(seed+4,0.15,0.35)})`;
        ctx.fillRect(x, y, w, h);
      }
    }

    const terrainTex = PIXI.Texture.from(c);
    terrainTex.source.scaleMode = 'nearest';
    this.terrainTextures[biome] = terrainTex;
  },

  getTerrainTexture(biomeId) {
    return this.terrainTextures[biomeId];
  },
};
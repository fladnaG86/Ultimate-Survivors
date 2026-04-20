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
  },

  async _player(app) {
    const g = new PIXI.Graphics();
    g.circle(12, 12, 10).fill(0x44aaff);
    g.circle(19, 12, 3).fill(0xffffff);
    return app.renderer.generateTexture({ target: g });
  },

  async _playerInvuln(app) {
    const g = new PIXI.Graphics();
    g.circle(12, 12, 10).fill(0x44aaff);
    g.circle(19, 12, 3).fill(0xffffff);
    g.circle(12, 12, 14).stroke({ width: 2, color: 0x66ccff, alpha: 0.5 });
    return app.renderer.generateTexture({ target: g });
  },

  async _bullet(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0xffdc3c);
    return app.renderer.generateTexture({ target: g });
  },

  async _bulletPierce(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0x00ff8c);
    return app.renderer.generateTexture({ target: g });
  },

  async _xpGem(app) {
    const g = new PIXI.Graphics();
    g.circle(4, 4, 4).fill(0x00ff88);
    return app.renderer.generateTexture({ target: g });
  },

  async _enemy(app) {
    const g = new PIXI.Graphics();
    g.circle(8, 8, 8).fill(0xdd3322);
    g.circle(11.5, 8, 2.5).fill(0xffffff);
    return app.renderer.generateTexture({ target: g });
  },

  async _enemyBig(app) {
    const g = new PIXI.Graphics();
    g.circle(16, 16, 16).fill(0xcc6600);
    g.circle(19.5, 16, 3.5).fill(0xffffff);
    return app.renderer.generateTexture({ target: g });
  },

  async _chest(app) {
    const g = new PIXI.Graphics();
    g.rect(0, 0, 24, 16).fill({ color: 0xb7410e, rounded: 2 });
    g.rect(0, 0, 24, 4).fill(0xffdd00);
    g.rect(10, 4, 4, 8).fill(0xffdd00);
    g.rect(6, 7, 12, 2).fill(0xffdd00);
    return app.renderer.generateTexture({ target: g });
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
        this.undeadTextures.push(tex);
      }
    }
  },

  getUndeadTexture(seed) {
    return this.undeadTextures[seed % this.undeadTextures.length];
  },
};
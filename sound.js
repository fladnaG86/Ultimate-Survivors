// ═══════════════════════════════════════════════════
//  Ultimate Survivor — sound.js
// ═══════════════════════════════════════════════════

// ── Global state ──────────────────────────────────────
let _ctx, _masterGain, _sfxGain, _musicGain;
let _noiseShort, _noiseLong;
let _muted = false;
let _musicEls = {}, _musicSrcs = {}, _musicGains = {};
let _currentMusic = null;
let _musicReady = {};
let _lastXpCollect = 0, _lastNovaPulse = 0;
let _lastGunFire = 0, _lastEnemyDeath = 0, _lastBigEnemyDeath = 0;
let _muteBtn;

// ── Noise buffers ─────────────────────────────────────
function _createNoiseBuffers() {
  const sr = _ctx.sampleRate;
  _noiseShort = _ctx.createBuffer(1, sr * 0.5, sr);
  _noiseLong  = _ctx.createBuffer(1, sr * 2.0, sr);
  for (const buf of [_noiseShort, _noiseLong]) {
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
}

// ── SFX: gunFire (~50ms) ──────────────────────────────
function _sfxGunFire() {
  if (performance.now() - _lastGunFire < 80) return;
  _lastGunFire = performance.now();
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.05);
  g.gain.setValueAtTime(0.35, t);
  g.gain.linearRampToValueAtTime(0, t + 0.05);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.06);
}

// ── SFX: spreadFire (~80ms) ───────────────────────────
function _sfxSpreadFire() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  g.gain.setValueAtTime(0.3, t);
  g.gain.linearRampToValueAtTime(0, t + 0.08);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.09);

  const ns = _ctx.createBufferSource();
  ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.15, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.06);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.06);
}

// ── SFX: playerHit (~150ms) ──────────────────────────
function _sfxPlayerHit() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.4, t);
  g.gain.linearRampToValueAtTime(0, t + 0.15);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.16);

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.08);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.08);
}

// ── SFX: playerHitBoss (~200ms) ──────────────────────
function _sfxPlayerHitBoss() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(70, t);
  o.frequency.exponentialRampToValueAtTime(25, t + 0.2);
  g.gain.setValueAtTime(0.55, t);
  g.gain.linearRampToValueAtTime(0, t + 0.2);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.21);

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.4, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.12);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.12);
}

// ── SFX: enemyDeath (~100ms) ─────────────────────────
function _sfxEnemyDeath() {
  if (performance.now() - _lastEnemyDeath < 50) return;
  _lastEnemyDeath = performance.now();
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
  g.gain.setValueAtTime(0.25, t);
  g.gain.linearRampToValueAtTime(0, t + 0.1);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.11);

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 2;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.15, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.06);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.06);
}

// ── SFX: bigEnemyDeath (~200ms) ──────────────────────
function _sfxBigEnemyDeath() {
  if (performance.now() - _lastBigEnemyDeath < 80) return;
  _lastBigEnemyDeath = performance.now();
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(400, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.2);
  g.gain.setValueAtTime(0.35, t);
  g.gain.linearRampToValueAtTime(0, t + 0.2);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.21);

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.15);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.15);
}

// ── SFX: bossSpawn (~1.5s) ────────────────────────────
function _sfxBossSpawn() {
  const t = _ctx.currentTime;

  // Sub rumble
  const o1 = _ctx.createOscillator();
  const g1 = _ctx.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(40, t);
  o1.frequency.linearRampToValueAtTime(80, t + 0.5);
  o1.frequency.linearRampToValueAtTime(40, t + 1.5);
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(0.6, t + 0.1);
  g1.gain.linearRampToValueAtTime(0, t + 1.5);
  o1.connect(g1).connect(_sfxGain);
  o1.start(t); o1.stop(t + 1.6);

  // Noise rumble
  const ns = _ctx.createBufferSource(); ns.buffer = _noiseLong;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.3, t + 0.2);
  ng.gain.linearRampToValueAtTime(0, t + 1.5);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 1.5);

  // Impact crack
  const o2 = _ctx.createOscillator();
  const g2 = _ctx.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(120, t);
  o2.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  g2.gain.setValueAtTime(0.5, t);
  g2.gain.linearRampToValueAtTime(0, t + 0.3);
  o2.connect(g2).connect(_sfxGain);
  o2.start(t); o2.stop(t + 0.31);
}

// ── SFX: bossEnrage (~0.8s) ───────────────────────────
function _sfxBossEnrage() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2000;
  const g = _ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(1200, t + 0.8);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.05);
  g.gain.setValueAtTime(0.25, t + 0.6);
  g.gain.linearRampToValueAtTime(0, t + 0.8);
  o.connect(f).connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.85);
}

// ── SFX: bossNova (~300ms) ────────────────────────────
function _sfxBossNova() {
  const t = _ctx.currentTime;
  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.45, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.25);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.25);

  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(100, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  g.gain.setValueAtTime(0.35, t);
  g.gain.linearRampToValueAtTime(0, t + 0.3);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.31);
}

// ── SFX: bossDeath (~2s) ──────────────────────────────
function _sfxBossDeath() {
  const t = _ctx.currentTime;

  // Initial crack
  const ns1 = _ctx.createBufferSource(); ns1.buffer = _noiseShort;
  const ng1 = _ctx.createGain();
  ng1.gain.setValueAtTime(0.7, t);
  ng1.gain.linearRampToValueAtTime(0, t + 0.1);
  ns1.connect(ng1).connect(_sfxGain);
  ns1.start(t, 0, 0.1);

  // Explosion noise
  const ns2 = _ctx.createBufferSource(); ns2.buffer = _noiseLong;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const ng2 = _ctx.createGain();
  ng2.gain.setValueAtTime(0, t);
  ng2.gain.linearRampToValueAtTime(0.6, t + 0.05);
  ng2.gain.linearRampToValueAtTime(0, t + 1.5);
  ns2.connect(f).connect(ng2).connect(_sfxGain);
  ns2.start(t, 0, 1.5);

  // Sub-bass drop
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(20, t + 2.0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.05);
  g.gain.setValueAtTime(0.5, t + 0.5);
  g.gain.linearRampToValueAtTime(0, t + 1.95);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 2.0);
}

// ── SFX: swarmAlarm (~5s) ─────────────────────────────
function _sfxSwarmAlarm() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'square';
  for (let i = 0; i < 20; i++) {
    o.frequency.setValueAtTime(i % 2 === 0 ? 500 : 700, t + i * 0.25);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.15, t + 0.1);
  g.gain.setValueAtTime(0.15, t + 4.9);
  g.gain.linearRampToValueAtTime(0, t + 5.0);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 5.1);
}

// ── SFX: swarmStart (~500ms) ──────────────────────────
function _sfxSwarmStart() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
  g.gain.setValueAtTime(0.5, t);
  g.gain.linearRampToValueAtTime(0, t + 0.4);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.41);

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0.4, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.3);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.3);
}

// ── SFX: levelUp (~1s) ────────────────────────────────
function _sfxLevelUp() {
  const t = _ctx.currentTime;
  const notes = [523, 659, 784]; // C5, E5, G5
  for (let i = 0; i < notes.length; i++) {
    const start = t + i * 0.15;
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(notes[i], start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.25, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + 0.35);
    o.connect(g).connect(_sfxGain);
    o.start(start); o.stop(start + 0.4);
  }
}

// ── SFX: chestOpen (~0.5s) ────────────────────────────
function _sfxChestOpen() {
  const t = _ctx.currentTime;
  const tones = [1200, 1800, 2400];
  for (let i = 0; i < tones.length; i++) {
    const start = t + i * 0.1;
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(tones[i], start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.12, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + 0.3);
    o.connect(g).connect(_sfxGain);
    o.start(start); o.stop(start + 0.35);
  }

  const ns = _ctx.createBufferSource(); ns.buffer = _noiseShort;
  const f = _ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000;
  const ng = _ctx.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.08, t + 0.05);
  ng.gain.linearRampToValueAtTime(0, t + 0.4);
  ns.connect(f).connect(ng).connect(_sfxGain);
  ns.start(t, 0, 0.4);
}

// ── SFX: gameOver (~2s) ──────────────────────────────
function _sfxGameOver() {
  const t = _ctx.currentTime;
  const o1 = _ctx.createOscillator();
  const f1 = _ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 1000;
  const g1 = _ctx.createGain();
  o1.type = 'sawtooth';
  o1.frequency.setValueAtTime(400, t);
  o1.frequency.exponentialRampToValueAtTime(60, t + 2.0);
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(0.25, t + 0.1);
  g1.gain.setValueAtTime(0.25, t + 1.5);
  g1.gain.linearRampToValueAtTime(0, t + 1.9);
  o1.connect(f1).connect(g1).connect(_sfxGain);
  o1.start(t); o1.stop(t + 2.0);

  const o2 = _ctx.createOscillator();
  const f2 = _ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 800;
  const g2 = _ctx.createGain();
  o2.type = 'sawtooth';
  o2.frequency.setValueAtTime(420, t);
  o2.frequency.exponentialRampToValueAtTime(55, t + 2.0);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(0.15, t + 0.1);
  g2.gain.linearRampToValueAtTime(0, t + 1.9);
  o2.connect(f2).connect(g2).connect(_sfxGain);
  o2.start(t); o2.stop(t + 2.0);
}

// ── SFX: victory (~2s) ────────────────────────────────
function _sfxVictory() {
  const t = _ctx.currentTime;
  const arp = [523, 659, 784, 1047]; // C5, E5, G5, C6
  for (let i = 0; i < arp.length; i++) {
    const start = t + i * 0.2;
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(arp[i], start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.2, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + 0.7);
    o.connect(g).connect(_sfxGain);
    o.start(start); o.stop(start + 0.75);
  }

  // Sustained chord
  const chord = [523, 659, 784];
  for (let i = 0; i < chord.length; i++) {
    const start = t + 0.8;
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(chord[i], start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.15, start + 0.05);
    g.gain.linearRampToValueAtTime(0, start + 1.15);
    o.connect(g).connect(_sfxGain);
    o.start(start); o.stop(t + 2.0);
  }
}

// ── SFX: cardSelect (~30ms) ───────────────────────────
function _sfxCardSelect() {
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(1000, t);
  o.frequency.exponentialRampToValueAtTime(500, t + 0.03);
  g.gain.setValueAtTime(0.25, t);
  g.gain.linearRampToValueAtTime(0, t + 0.03);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.04);
}

// ── SFX: buffAcquired (~0.6s) ─────────────────────────
function _sfxBuffAcquired() {
  const t = _ctx.currentTime;
  const o1 = _ctx.createOscillator();
  const g1 = _ctx.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(400, t);
  o1.frequency.exponentialRampToValueAtTime(1600, t + 0.5);
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(0.25, t + 0.05);
  g1.gain.setValueAtTime(0.25, t + 0.4);
  g1.gain.linearRampToValueAtTime(0, t + 0.5);
  o1.connect(g1).connect(_sfxGain);
  o1.start(t); o1.stop(t + 0.55);

  const o2 = _ctx.createOscillator();
  const g2 = _ctx.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(800, t);
  o2.frequency.exponentialRampToValueAtTime(3200, t + 0.5);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(0.12, t + 0.05);
  g2.gain.linearRampToValueAtTime(0, t + 0.45);
  o2.connect(g2).connect(_sfxGain);
  o2.start(t); o2.stop(t + 0.5);
}

// ── SFX: xpCollect (~15ms, throttled) ─────────────────
function _sfxXpCollect() {
  if (performance.now() - _lastXpCollect < 100) return;
  _lastXpCollect = performance.now();
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(2000, t);
  o.frequency.exponentialRampToValueAtTime(800, t + 0.015);
  g.gain.setValueAtTime(0.12, t);
  g.gain.linearRampToValueAtTime(0, t + 0.015);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.02);
}

// ── SFX: novaPulse (~150ms, throttled) ─────────────────
function _sfxNovaPulse() {
  if (performance.now() - _lastNovaPulse < 1800) return;
  _lastNovaPulse = performance.now();
  const t = _ctx.currentTime;
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(100, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
  g.gain.setValueAtTime(0.25, t);
  g.gain.linearRampToValueAtTime(0, t + 0.15);
  o.connect(g).connect(_sfxGain);
  o.start(t); o.stop(t + 0.16);
}

// ── SFX dispatch table ────────────────────────────────
const _sfxHandlers = {
  gunFire:       _sfxGunFire,
  spreadFire:    _sfxSpreadFire,
  playerHit:     _sfxPlayerHit,
  playerHitBoss: _sfxPlayerHitBoss,
  enemyDeath:    _sfxEnemyDeath,
  bigEnemyDeath: _sfxBigEnemyDeath,
  bossSpawn:     _sfxBossSpawn,
  bossEnrage:    _sfxBossEnrage,
  bossNova:      _sfxBossNova,
  bossDeath:     _sfxBossDeath,
  swarmAlarm:    _sfxSwarmAlarm,
  swarmStart:    _sfxSwarmStart,
  levelUp:       _sfxLevelUp,
  chestOpen:     _sfxChestOpen,
  gameOver:      _sfxGameOver,
  victory:       _sfxVictory,
  cardSelect:    _sfxCardSelect,
  buffAcquired:  _sfxBuffAcquired,
  xpCollect:     _sfxXpCollect,
  novaPulse:     _sfxNovaPulse,
};

// ── sfx(name) — public dispatcher ─────────────────────
function sfx(name) {
  if (_muted || !_ctx || _ctx.state !== 'running') return;
  const h = _sfxHandlers[name];
  if (h) h();
}

// ── Music preload ─────────────────────────────────────
const _musicTracks = [
  { name: 'menu',     file: 'audio/Shadows of Survival.mp3',     loop: true  },
  { name: 'gameplay', file: 'audio/Hypnotic Order of Survival.mp3', loop: true  },
  { name: 'boss',     file: 'audio/Furia_ Battle of Survival.mp3', loop: true  },
  { name: 'swarm',    file: 'audio/Swarm of Chaos.mp3',    loop: true  },
  { name: 'victory',  file: 'audio/Echoes of Triumph.mp3',  loop: false },
];

function _preloadMusic() {
  for (const track of _musicTracks) {
    const el = new Audio();
    el.src = track.file;
    el.loop = track.loop;
    el.preload = 'auto';
    el.volume = 1;
    _musicEls[track.name] = el;
    _musicReady[track.name] = false;

    el.addEventListener('canplaythrough', () => { _musicReady[track.name] = true; }, { once: true });
    el.addEventListener('error', () => { _musicReady[track.name] = false; });

    try {
      const src = _ctx.createMediaElementSource(el);
      const gain = _ctx.createGain();
      gain.gain.value = 0; // start silent
      src.connect(gain).connect(_musicGain);
      _musicSrcs[track.name] = src;
      _musicGains[track.name] = gain;
    } catch (e) {
      _musicReady[track.name] = false;
    }
  }
}

// ── playMusic(track) — crossfade to new track ─────────
function playMusic(track) {
  if (track === _currentMusic) return;

  // Fade out old track even if new one is unavailable
  if (_currentMusic && _musicGains[_currentMusic]) {
    const t = _ctx.currentTime;
    const oldGain = _musicGains[_currentMusic];
    const oldEl  = _musicEls[_currentMusic];
    oldGain.gain.setValueAtTime(oldGain.gain.value, t);
    oldGain.gain.linearRampToValueAtTime(0, t + 1);
    setTimeout(() => { oldEl.pause(); }, 1100);
  }

  if (!_musicReady[track]) { _currentMusic = null; return; }

  const t = _ctx.currentTime;
  const newGain = _musicGains[track];
  const newEl  = _musicEls[track];

  // Fade in new track
  newGain.gain.setValueAtTime(0, t);
  newGain.gain.linearRampToValueAtTime(1, t + 1);
  newEl.currentTime = 0;
  newEl.play().catch(() => {});

  _currentMusic = track;
}

// ── stopMusic(track) ──────────────────────────────────
function stopMusic(track) {
  if (!_musicGains[track]) return;
  const t = _ctx.currentTime;
  _musicGains[track].gain.setValueAtTime(_musicGains[track].gain.value, t);
  _musicGains[track].gain.linearRampToValueAtTime(0, t + 1);
  setTimeout(() => { _musicEls[track].pause(); }, 1100);
  if (_currentMusic === track) _currentMusic = null;
}

// ── setMusicPhase(phase) — smart music switcher ───────
function setMusicPhase(phase) {
  const map = {
    menu: 'menu', gameplay: 'gameplay', boss: 'boss',
    swarm: 'swarm', gameover: 'gameover', victory: 'victory',
  };
  const track = map[phase];
  if (track) playMusic(track);
}

// ── Mute button ───────────────────────────────────────
function _createMuteButton() {
  _muteBtn = document.createElement('button');
  _muteBtn.textContent = '🔊';
  _muteBtn.style.cssText = `
    position:fixed; top:16px; right:16px; z-index:5;
    width:36px; height:36px; padding:0; border:1px solid #0af;
    background:rgba(0,0,0,.5); color:#fff; font-size:18px;
    cursor:pointer; border-radius:6px; line-height:36px; text-align:center;
  `;
  _muteBtn.onclick = toggleMute;
  document.body.appendChild(_muteBtn);
}

function _updateMuteButton() {
  if (_muted) {
    _muteBtn.textContent = '🔇';
    _muteBtn.style.borderColor = '#f44';
  } else {
    _muteBtn.textContent = '🔊';
    _muteBtn.style.borderColor = '#0af';
  }
}

// ── toggleMute() ──────────────────────────────────────
function toggleMute() {
  _muted = !_muted;
  if (!_ctx) return;
  if (_ctx.state === 'suspended') _ctx.resume();
  const t = _ctx.currentTime;
  _masterGain.gain.setValueAtTime(_masterGain.gain.value, t);
  _masterGain.gain.linearRampToValueAtTime(_muted ? 0 : 1, t + 0.05);
  _updateMuteButton();
}

// ── isMuted() ──────────────────────────────────────────
function isMuted() { return _muted; }

// ── initSound() — entry point ─────────────────────────
function initSound() {
  _ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Gain chain: sfxGain + musicGain → masterGain → destination
  _masterGain = _ctx.createGain();
  _masterGain.gain.value = 1;
  _masterGain.connect(_ctx.destination);

  _sfxGain = _ctx.createGain();
  _sfxGain.gain.value = 0.7;
  _sfxGain.connect(_masterGain);

  _musicGain = _ctx.createGain();
  _musicGain.gain.value = 0.5;
  _musicGain.connect(_masterGain);

  _createNoiseBuffers();
  _preloadMusic();
  _createMuteButton();

  // Unlock AudioContext on first user interaction (iOS requires touch)
  if (_ctx.state === 'suspended') {
    const resume = () => {
      _ctx.resume();
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
    document.addEventListener('touchstart', resume);
  }
}
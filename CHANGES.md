# Ultimate Survivor — Registro modifiche

Data: 2026-04-24
File toccato: `main.js` (unico)

---

## ✅ Modifiche apportate

### 1. Rework sistema combo (da malus a reward)

**Problema precedente**: il contatore combo scalava gli HP dei nemici (`(1 + combo*0.03)` in `spawnEnemy`), quindi *puniva* il player che andava bene.

**Ora**: il combo *premia* il player con buff progressivi a soglie.

| Soglia | Effetto |
|---|---|
| 10× | Fire rate armi +10% |
| 25× | +1 proiettile (gun + spread) |
| 50× | Danno proiettili +25% |
| 100× | Nova automatica ogni 2s |

- Rimosso lo scaling HP nemici basato su combo.
- Decay timer portato a **3.5s** (era 2.5s) → combo più generoso da mantenere.
- Reset combo → tutti i flag `_comboFireRate`, `_comboMulti`, `_comboDmg`, `_comboNova` decadono insieme.

**HUD**: nuovo testo `txtComboNext` sotto il contatore combo che mostra la prossima soglia (es. `→ 50× +25% DANNO`).

### 2. Tre nuove armi

Aggiunte a `UPGRADES` e gestite in `handleWeapons`:

- **Whip Slash** ⚔️: AoE in cono 180° davanti al player, raggio ~90 px, cd 0.7s, danno ×2. Disegna un arco `fxGfx` arancione/bianco alla attivazione.
- **Homing Missiles** 🚀: proiettile lento (0.55× speed) che corregge traiettoria verso `nearestEnemy()`. cd 1.4s, danno ×3. Riusa il `_bulletPool` con flag `b.homing`.
- **Lightning Chain** ⚡: colpisce `nearestEnemy()` e salta fino a 4 nemici vicini (HOP 120 px). cd 2.2s, danno ×1.5 con decay 20% per hop. Disegna segmenti di fulmine con `fxGfx`.

**Infrastruttura nuova**: `fxEffects[]` (array effetti transienti) + `fxGfx` (PIXI.Graphics) + `drawFX()`.

### 3. Quattro evolutions (combinazioni stile Vampire Survivors)

Al level-up, se i prerequisiti sono soddisfatti, **60% di chance** che una delle 3 card sia sostituita da un'evolution (bordo oro + glow).

| Evolution | Prerequisiti | Effetto |
|---|---|---|
| **Gatling** 🔱 | `gun_cd` ≥ 2 + `multi` ≥ 1 | Fucile cd 0.15s, danno −30%, +1 multishot |
| **Shotgun Nova** 🌟 | `spread` + `multi` ≥ 2 | `spread` → `spread_nova`: 7 proiettili a 360°, cd 1.3s |
| **Aegis Orb** 🛡️ | `orbit` + `hp_up` ≥ 2 | Flag `_aegis`: riflette 30% danno ricevuto ai nemici entro 62 px, +3 maxHp |
| **Soul Reaper** 💀 | Possiede `whip` | `whip` → `whip_reaper`: cd 0.55s, +1 HP per kill dentro il cono |

**Tracking**:
- `player.upgradeCount[id]` — incrementato ad ogni scelta di upgrade.
- `player.takenEvolutions[id]` — marca le evolutions già prese per non proporle di nuovo.
- `getAvailableEvolutions(p)` filtra quelle disponibili.

### 4. Due eventi casuali (contro la ripetitività)

**Elite Hunt**
- Ogni 90s, 40% di chance di spawnare un Elite, *solo* se non c'è swarm attiva e nessun boss.
- Elite = nemico con `isElite: true`, HP ×6, speed ×1.2, raggio 22, tint oro.
- Drop alla morte: **chest garantito** (prob 100%) + 3 gemme XP bonus.

**Blood Moon**
- Evento unico per run, attivazione random tra 12:00 e 18:00.
- Durata: 45 secondi.
- Effetti:
  - Spawn rate enemies ×1.8 (`bmMul` applicato nelle 3 fasi swarm)
  - Drop XP ×2 (moltiplicatore in `xpGems.push`)
- Annuncio: testo `🌑 BLOOD MOON 🌑` centrato, fade 2.5s.
- Overlay rosso pulsante (alpha 0.08–0.16, sin animato) sopra tutta la viewport.

**Stato nuovo**: `eliteCheckTimer`, `bloodMoonNextAt`, `bloodMoonTimer`, `bloodMoonActive`, `bloodMoonAnnounceTimer`.

### 5. HUD QoL

- **Barre cooldown armi**: una riga di bar colorate sotto la barra XP (una per arma equipaggiata). Colore per tipo (gun = giallo, spread = arancio, orbit = azzurro, whip = sabbia, whip_reaper = rosa, missile = rosso, chain = celeste, spread_nova = oro).
- **Indicatore soglia combo**: `txtComboNext` mostra la prossima soglia attiva.
- **Testo Blood Moon**: `txtBloodMoon` centrato durante l'announce.

---

## 📋 Backlog — cose non implementate (dal piano originale)

### Fuori scope esplicito

Nessuno di questi è bug: erano esclusi dal piano per stare nel budget 1-2 giornate.

- **Meta-progression persistente**: skill tree tra le run, unlock classi/armi salvati in `localStorage`, soulbound currency. Servirebbe:
  - Schermata post-partita che assegna punti meta.
  - `localStorage` schema con versioning per future migrazioni.
  - Schermata di spesa prima dello `initGame`.
- **Nuovi biomi o boss**: la lista biomi resta `forest / desert / ice / swamp`. I boss restano i 3 di `boss.js` (Behemoth / Wraith / Ironclad).
- **Economia monete / shop**: nessuna valuta, nessun negozio tra level-up, niente reroll card.
- **Nemici con AI avanzata**: tutti inseguono ancora il player. Niente ranged / healer / charger / esplosivi.

### Voci rinviate per tempo

- **Damage numbers fluttuanti** (era "opzionale se avanza tempo" nel piano). Pool di `PIXI.Text` riciclabili che salgono e sbiadiscono sopra i nemici colpiti.
- **SFX dedicati per le nuove armi**: attualmente whip e chain riusano `sfx('spreadFire')`, missile riusa `sfx('gunFire')`. Va aggiunto in `sound.js`:
  - `whipSwing` (sawtooth rapido, 80ms)
  - `chainZap` (noise + square high, 120ms)
  - `missileLaunch` (sweep sinusoide basso→alto, 200ms)
  - `bloodMoonStart` (droni bassi + riverbero, 1.5s)
- **Indicatore Elite sulla minimappa**: piccola corona lampeggiante sulla posizione Elite nel radar. Richiede hook in `drawMinimap` e flag `e.isElite`.
- **Animazione card oro più ricca**: attualmente solo border + glow + bg dorato. Si può aggiungere sparkle particles o pulse.

### Bug potenziali / da verificare in playtest

- **Bilanciamento Gatling**: cd 0.15s + danno 0.7× potrebbe essere troppo forte o troppo debole. Valutare dopo 2-3 partite.
- **Aegis damage**: il reflect usa `dmgIn * 0.3 * (1 + player.bulletDmg * 0.5)` — scala con `bulletDmg` del player. Se il player ha danno alto, la reflection diventa molto grossa. Da verificare.
- **Shotgun Nova uptime**: 7 proiettili a 360° con cd 1.3s è potenzialmente molto forte. Verificare che non renda le armi gun/orbit irrilevanti.
- **Evolution + classe Mago Corazzato**: Mago Corazzato parte con `orbit` già equipaggiato, quindi arriva ad Aegis molto prima di Mago Standard. OK per design, ma verificare che non si manifesti già al livello 2-3.

### Idee ulteriori (non nel piano, per un eventuale v5)

- **Più evolutions** (coverage degli altri upgrade `speed`, `magnet`, `dmg`).
- **Synergy passive**: es. "Crit Storm + Incendiary" che aggiunge bruciatura post-crit.
- **Arene con layout speciale**: zone del mondo con ostacoli curati (arena circolare di rovine, canyon).
- **Weekly seed challenge**: seed fisso su base settimanale + leaderboard locale.

---

## File modificati

- `main.js` (unico file gameplay)
  - `UPGRADES`: +3 entries (whip, missile, chain)
  - `EVOLUTIONS`: nuovo array + `getAvailableEvolutions()`
  - `COMBO_TIERS` + helper `applyComboTiers` / `clearComboTiers` / `nextComboTier`
  - `handleWeapons`: case whip, whip_reaper, missile, chain, spread_nova + cdMul/dmgMul/extraShot
  - `fireWhip`, `fireMissile`, `fireChain`: nuove funzioni
  - `spawnElite`: nuova funzione
  - Bullet update loop: logica homing
  - `_releaseBullet`: reset `b.homing`
  - Update loop: Blood Moon + Elite Hunt state machine, `bmMul` nei 3 rami swarm
  - Kill handler: rimosso scaling HP da combo, aggiunto chest 100% su Elite, bonus gems, XP ×2 Blood Moon, trigger `applyComboTiers`
  - Damage handler: reflection Aegis
  - `initDisplay`: nuovi text `txtComboNext`, `txtBloodMoon`, nuovo `fxGfx`
  - `initGame`: reset di `fxEffects`, eliteCheckTimer, bloodMoon vars, player.upgradeCount, player.takenEvolutions
  - `triggerLevelUp`: integrazione evolutions con border oro
  - `drawHUD`: overlay Blood Moon, barre cooldown armi, announce text
  - `drawFX`: nuova funzione per whip arc + chain bolts
  - `repositionHUD`: aggiunte posizioni per `txtComboNext` e `txtBloodMoon`

Non modificati: `boss.js`, `biomes.js`, `obstacles.js`, `spatial.js`, `sound.js`, `sprites.js`, `index.html`, `manifest.json`, launcher.

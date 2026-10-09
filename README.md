<p align="center">
  <h1 align="center">Space Shooter Remastered v3.0.0</h1>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v3.0.0-blue.svg?style=for-the-badge" alt="Version 3.0.0" />
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20Mobile%20%7C%20PWA-9cf.svg?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/engine-Phaser%203-e65c00.svg?style=for-the-badge" alt="Phaser 3" />
  <img src="https://img.shields.io/badge/tech-React%2018%20%7C%20TypeScript-3178c6.svg?style=for-the-badge" alt="React & TypeScript" />
  <img src="https://img.shields.io/badge/languages-ES%20%7C%20EN-green.svg?style=for-the-badge" alt="Bilingual" />
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=for-the-badge" alt="License MIT" />
</p>

---

## 🚀 Overview / Resumen

**Space Shooter Remastered v3.0.0** is an uncompromising modern retro arcade space shooter engineered with **React 18**, **TypeScript**, and **Phaser 3**, featuring a zero-asset procedural pixel art pipeline, a 10-sector deep campaign, **9 distinct boss chassis designs + the Apex Leviathan Core**, procedural faction recolors, unique enemy silhouettes with gameplay roles, full dual-language support (**Español / English**), and Web Audio synthwave procedural music.

---

## 🌟 Key Features (v3.0.0)

- **Zero-Asset Pixel Architecture**:
  - No PNG files needed! Original classic sprites are encoded as palette-indexed pixel matrices in source code.
  - Runtime geometric compositing, shading, hue shifting, and procedural backdrops.
- **9 Unique Boss Chassis + Apex Leviathan**:
  - Every boss features **custom composite geometric frames** (not just palette swaps):
    1. **Sector 1: GOLIATH-CORE** — Heavy broadside dreadnought with armored flank shields.
    2. **Sector 2: VIPER-STING** — Raked needle-hull interceptor with forward razor pincers.
    3. **Sector 3: AEGIS-FORTRESS** — Citadel battleship with reinforced frontal barrier crest.
    4. **Sector 4: HYDRA-TWIN** — Dual catamaran assault hulls with central bridge.
    5. **Sector 5: DREAD-MINER** — Spiked industrial mining platform with deployer prongs.
    6. **Sector 6: PHANTOM-CRUISER** — Stealth phase raider with raked diamond vents and decoys.
    7. **Sector 7: SOLARIS-CARRIER** — Broad hangar super-carrier with massive flank flight pods.
    8. **Sector 8: BEHEMOTH-LASER** — Siege laser platform with spinal railgun accelerator.
    9. **Sector 9: GRAVITY-TITAN** — Singularity dreadnought with dark event-horizon ring chassis.
    10. **Sector 10: OMNI-LEVIATHAN** — Apex alien flagship with 3 evolving battle phases.
- **Unique Enemy Silhouette Variations (Not Just Repainted)**:
  - **Standard Drone (White)**: Baseline weaver recon craft.
  - **Blinker (Purple)**: Compact telemetry core with phase antennae & teleport ambush.
  - **Kamikaze (Yellow)**: Streamlined delta dart that locks on and rams at high speed.
  - **Pod (Blue)**: Armored spherical hull reinforced by a 3-hit energy bubble shield.
  - **Gunship (Red)**: Heavy military dreadnought firing aimed shots every 2s.
  - **Spreader (Orange)**: Wide multi-barrel wing platform firing 3–5 shot fans.
  - **LaserShip (Cyan)**: Heavy spinal railgun lance with charging guidance beam.
  - **Lancer (Yellow)**: Sleek interceptor fuselage that charges and dashes.
  - **Splitter (Green)**: Heavy arachnid broodmother that splits into mini-drones upon death.
  - **Asteroid & Mini-Asteroid**: Drifting obstacles that shatter into fragments.
  - **Proximity Mine**: Seeking explosive mine detonating into an 8-way ring.
- **Dual Language Support (Bilingual ES / EN)**:
  - Complete translations for **Español (ES)** and **English (EN)**.
  - Instant in-game language toggle button on the main menu bar.
  - Full localization for UI, menus, settings, threats, guide codex, perks, and ship abilities.
- **Fleet Hangar (5 Player Ships)**:
  - **Vanguard**: Balanced stats + 3 Hyper Bombs.
  - **Striker**: Permanent twin-cannons + 15% fire rate.
  - **Phantom**: +30% speed + extended hit invulnerability.
  - **Bulwark**: 7 lives + 8s sector start bubble shield.
  - **Nova**: Permanent companion homing drone satellite.
- **Responsive Controls**:
  - Full Desktop support (WASD / Arrows, Mouse Aim, Space/Click, X/B Bomb, ESC Pause).
  - Gamepad support (Left stick move, Right stick aim, Triggers fire, Start pause).
  - Mobile Touch: **Drag** (auto-aim), **Twin-Stick** (floating dials), and **Classic** (buttons).
- **Procedural Synthesizer**:
  - 100% Web Audio API procedural sound synthesis (lasers, explosions, alarms, thrusters).
  - Dynamic tempo-scaled synthwave background combat tracks per sector.

---

## 🎮 How to Play / Controles

### Controls Table

| Action | Desktop (Keyboard & Mouse) | Gamepad | Mobile (Touch) |
| :--- | :--- | :--- | :--- |
| **Move / Mover** | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrows | Left Stick | Drag / Left Stick / Joystick |
| **Aim / Apuntar** | Mouse Cursor | Right Stick | Auto / Right Stick / Rotate |
| **Fire / Disparar** | Left Click / <kbd>Space</kbd> | <kbd>R2</kbd> / <kbd>RT</kbd> / <kbd>A</kbd> | Auto / Right Dial / Fire Button |
| **Hyper Bomb** | Right Click / <kbd>X</kbd> / <kbd>B</kbd> | <kbd>L2</kbd> / <kbd>LT</kbd> / <kbd>B</kbd> | Double Tap / Bomb Button |
| **Pause / Pausa** | <kbd>ESC</kbd> | <kbd>Start</kbd> | <kbd>II</kbd> Button (Top Right) |

---

## 🛠️ Architecture

```
Shooter-Space-Phaser/
├── game/
│   ├── config.ts              # Phaser 3 Game Configuration
│   ├── entities/
│   │   ├── Boss.ts            # State-machine boss engine (10 archetypes)
│   │   ├── Bullet.ts          # Pooled projectile recycling
│   │   ├── Enemy.ts           # Unique enemy varieties and behavior logic
│   │   ├── Player.ts          # Ship kinematics, arsenal, drones, shields
│   │   └── Ships.ts           # 5 playable ship definitions & stats
│   ├── generators/
│   │   ├── BossGenerator.ts   # 9 unique boss hull structures + modules
│   │   ├── OriginalSprites.ts # Decoded palette matrix tables
│   │   └── PixelArtGenerator.ts # Geometric compositor, shading, tints
│   ├── managers/
│   │   ├── LevelManager.ts    # 10 sector definitions, perks, roster unlocks
│   │   ├── ParticleManager.ts # Zero-texture graphics particles & fx
│   │   ├── ScoreManager.ts    # High-score table & multiplier combos
│   │   └── WaveManager.ts     # Wave choreographies & formation spawns
│   ├── scenes/
│   │   ├── Preloader.ts       # Sprite generator & procedural asset baking
│   │   ├── MainMenu.ts        # Title, difficulty, language toggle
│   │   ├── MainGame.ts        # Core loop, collisions, HUD integration
│   │   ├── Pause.ts           # In-game pause modal
│   │   ├── Guide.ts           # In-game codex (Powers, Enemies, Bosses)
│   │   ├── Hangar.ts          # Ship selector with live preview & stats
│   │   ├── LevelClear.ts      # Sector debrief & perk card selection
│   │   ├── GameOver.ts        # High scores & sector retry
│   │   └── Victory.ts         # Final campaign victory screen
│   ├── ui/
│   │   ├── HUD.ts             # Health, bombs, combo timers, boss bar
│   │   ├── PixelButton.ts     # Authentic retro pixel button component
│   │   └── TouchControls.ts   # Drag, Twin-stick, and Classic touch schemes
│   └── utils/
│       ├── Synth.ts           # Web Audio API music & SFX procedural engine
│       └── i18n.ts            # Spanish / English internationalization module
└── public/
    └── fonts/
        └── PressStart2P-Regular.ttf # Arcade typography
```

---

## 📦 Getting Started / Instalación

1. **Prerequisites**: Ensure Node.js (v18+) is installed.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Launch dev server**:
   ```bash
   npm run dev
   ```
4. **Build production bundle**:
   ```bash
   npm run build
   ```
5. **Run test suite**:
   ```bash
   node --experimental-strip-types game/generators/generators.test.ts
   node --experimental-strip-types game/managers/LevelManager.test.ts
   node --experimental-strip-types game/managers/ScoreManager.test.ts
   ```

---

## 📜 Version History

- **v3.0.0**:
  - Procedural composite geometries creating **9 unique boss hulls** + Apex Leviathan.
  - Unique geometric silhouettes for enemy varieties (Blinker, Kamikaze, Spreader, LaserShip, Lancer, Pod, Spiderling).
  - Bilingual localization engine (**ES / EN**) with instant menu toggle.
  - Zero-asset runtime rendering with zero external sprite textures.
  - 10-sector campaign with upgrades, 5 playable ships, and touch control schemes.
- **v2.0.8**:
  - Touch control enhancements and responsive UI adjustments.
- **v1.0.0**:
  - Initial classic space shooter release with static PNG assets.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
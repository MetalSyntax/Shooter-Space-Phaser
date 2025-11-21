# Space Shooter Remastered

A modernized, clean-code implementation of a classic Space Shooter arcade game, built with **React**, **TypeScript**, and **Phaser 3**.

## 🚀 Features

- **Modern Tech Stack**: Built using React 18 and Phaser 3 for robust performance and scalability.
- **Responsive Design**: The game canvas automatically resizes to fit any screen (Desktop & Mobile).
- **Improved Gameplay**:
  - **Infinite Scrolling Background**: Creates a sense of speed and depth.
  - **Screen Wrapping**: The ship reappears on the opposite side when crossing borders.
  - **Physics-based Movement**: Smooth acceleration and drag for a space-like feel.
  - **Dynamic Spawning**: Enemies spawn across the entire screen width.
- **Synthesized Audio**: No external audio files required. Sound effects (lasers, explosions) are generated procedurally using the Web Audio API.
- **Game States**: Distinct Preload, Menu, Gameplay, and Game Over scenes.

## 🎮 How to Play

### Controls

| Action | Desktop (Keyboard) | Mobile / Mouse |
| :--- | :--- | :--- |
| **Move** | Arrow Keys or WASD | - |
| **Shoot** | Spacebar | Click / Tap Screen |

### Rules
1.  **Survive**: Avoid colliding with asteroids (enemies).
2.  **Score**: Shoot asteroids to gain points (+10 per hit).
3.  **Lives**: You start with 3 lives. Colliding with an enemy loses a life.
4.  **Game Over**: The game ends when you lose all 3 lives.

## 🛠️ Architecture

The project is structured for maintainability and scalability:

- **`App.tsx`**: React wrapper that initializes the Phaser instance and handles cleanup.
- **`game/config.ts`**: Centralized Phaser game configuration.
- **`game/scenes/`**: Modular scenes for different game states.
  - `Preloader.ts`: Handles asset loading (images) and progress bars.
  - `MainMenu.ts`: Interactive start screen.
  - `MainGame.ts`: Core logic (physics, entities, scoring).
  - `GameOver.ts`: Results screen and restart logic.
- **`game/utils/Synth.ts`**: A singleton utility class for generating sound effects programmatically.

## 📦 Installation

1.  Ensure you have Node.js installed.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm start
    ```

## 📁 Assets

This game expects the following images in your `public/Img` directory:

**Player & Bullets:**
- `ship.png` (Player Ship)
- `bullet.png` (Player Bullet)

**Enemies:**
- `enemy.png` (Basic Enemy)
- `enemy-ship.png` (Enemy Ship - Shooter Type)
- `enemy-weaver.png` (Enemy Weaver - Fast Moving)
- `bullet-enemy.png` (Enemy Bullet)

**Power-ups:**
- `power-up-blue.png` (Shield Power-up)
- `power-up-yellow.png` (Rapid Fire Power-up)
- `power-up-red.png` (Bomb Power-up)

**Environment:**
- `background.png` (Background)

*Note: If assets are missing, the game will attempt to generate placeholder graphics programmatically.*
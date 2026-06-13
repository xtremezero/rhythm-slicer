# Project File Descriptions

This file provides a brief summary of the purpose of each file within the Beat//Slicer project.

- **index.html**
  The main entry point of the web application. It sets up the HTML document structure, imports external dependencies (Phaser.js and Tailwind CSS via CDN), defines global CSS styling and animations, and outlines the UI layers (game container, HUD, settings panel, and pause overlay).

- **config.js**
  Stores the global configuration constants for the game. This includes visual themes, default game settings (approach time, difficulty, UI scaling), and predefined 3D grid positions used for spawning rhythmic notes.

- **udio.js**
  Manages the Web Audio API integration and audio processing. It handles decoding audio buffers, applying lowpass filters, and analyzing audio flux/energy to procedurally generate beat maps (notes and directional slicing data) synced to the music. It also includes logic for BPM estimation.

- **ui-animations.js**
  A utility file containing minimal helper functions to trigger CSS-based animations on specific DOM elements (e.g., triggering a pop effect when the score or combo updates).

- **phaser-scene.js**
  The core visual and gameplay engine powered by Phaser. It handles rendering the retro-synthwave 3D environment (starfield, sun, scrolling grid, visualizer ring), spawns the animated notes based on the generated beat map, detects pointer input (hover/swipes) for slicing notes, calculates hit accuracy, applies post-processing effects, and tracks the score/combo.

- **ootstrap.js**
  Initializes the Phaser game instance. It sets up the game configuration, including rendering context (WebGL), canvas dimensions, scaling mode, and registers MainScene to start the engine.

- **ui-bindings.js**
  Acts as the bridge between the HTML UI and the game logic. It sets up event listeners for user interactions, such as uploading audio files, toggling the HUD/pause menu, starting the game, and updating config.js values dynamically through UI inputs (sliders and buttons).

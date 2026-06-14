// --- BOOTSTRAP PHASER ---
const phaserConfig = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [MainScene],
    scale: { mode: Phaser.Scale.RESIZE },
    backgroundColor: '#020005',
    antialias: true,
    antialiasGL: true,
    powerPreference: 'high-performance'
};
const game = new Phaser.Game(phaserConfig);
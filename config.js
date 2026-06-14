// --- CONFIGURATION ---
const THEMES = {
    'cyberpink': { primary: 0x00ffff, secondary: 0xff00ff },
};

const GRID_POSITIONS = [
    { x: -0.35, y: -0.25 }, { x: 0, y: -0.25 }, { x: 0.35, y: -0.25 },
    { x: -0.35, y: 0.05 },    { x: 0, y: 0.05 },    { x: 0.35, y: 0.05 }
];

const CONFIG = {
    approachTime: 2.3, fluxSensitivity: 0.022, frequencyFilter: 150, minBeatGap: 0.35,
    gridScale: 0.65, gridYOffset: 20, cubeScale: 1.0, swipeThreshold: 15,
    difficulty: 'medium', dotsOnlyMode: false, visualTheme: 'cyberpink', visualizerGlow: 1.0,
    sensitivity: 'normal'
};
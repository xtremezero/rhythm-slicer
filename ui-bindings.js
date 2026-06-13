// --- UI BINDINGS ---
const DOM = (id) => document.getElementById(id);

DOM('toggle-panel-btn').addEventListener('click', (e) => {
    const panel = DOM('hud-settings-panel');
    const isHidden = panel.classList.contains('opacity-0');
    if (isHidden) {
        panel.classList.remove('opacity-0', 'translate-x-12', 'pointer-events-none');
            e.target.innerText = "CLOSE SETTINGS";
    } else {
        panel.classList.add('opacity-0', 'translate-x-12', 'pointer-events-none');
            e.target.innerText = "SETTINGS";
    }
});

DOM('upload-btn').addEventListener('click', () => DOM('audio-upload').click());

DOM('audio-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    let displayName = file.name.replace(/\.[^/.]+$/, "");
    DOM('song-name-display').innerText = displayName.toUpperCase();
    
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    DOM('bpm-display').innerText = 'CALC...';
    
    const arrayBuffer = await file.arrayBuffer();
    audioCtx.decodeAudioData(arrayBuffer, async (buffer) => {
        audioBuffer = buffer;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        beatsData = await analyzeAudioBeats(buffer);
        
        DOM('bpm-display').innerText = `~${estimateBPM(beatsData)}`;
        DOM('nodes-display').innerText = beatsData.length;
        DOM('upload-btn').innerText = "TRACK LOADED - READY";
        DOM('upload-btn').classList.replace('text-slate-300', 'text-green-400');
    });
});

DOM('center-start-btn').addEventListener('click', () => {
    if (!audioBuffer) {
        const panel = DOM('hud-settings-panel');
        if (panel.classList.contains('opacity-0')) {
            DOM('toggle-panel-btn').click();
        }
        return;
    }
    DOM('start-btn').click();
});

DOM('start-btn').addEventListener('click', () => {
    if (!audioBuffer) return alert("System requires audio payload initialization.");
    
    if (currentSource) currentSource.stop();
    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    gameIsPlaying = true;
    document.body.classList.add('cursor-none');
    isPaused = false;
    DOM('pause-overlay').classList.add('opacity-0', 'pointer-events-none');
    
    DOM('center-start-btn').classList.add('hidden');
    DOM('toggle-panel-btn').classList.add('hidden');
    DOM('end-btn').classList.remove('hidden');
    currentSource.onended = () => {
        if (gameIsPlaying) endGame();
    };

    gameStartTime = audioCtx.currentTime;
    currentSource.start(0);
    
    if(game.scene.scenes[0].scene.isPaused("MainScene")) game.scene.scenes[0].scene.resume();
    
    DOM('hud-settings-panel').classList.add('opacity-0', 'translate-x-12', 'pointer-events-none');
    DOM('toggle-panel-btn').innerText = "SETTINGS";
    
    window.dispatchEvent(new Event('startGame'));
});

function endGame() {
    gameIsPlaying = false;
    document.body.classList.remove('cursor-none');
    if (currentSource) {
        currentSource.onended = null;
        currentSource.stop();
    }
    DOM('end-btn').classList.add('hidden');
    DOM('center-start-btn').classList.remove('hidden');
    DOM('toggle-panel-btn').classList.remove('hidden');
    
    DOM('stats-score').innerText = Math.floor(score);
    
    DOM('stats-title').innerText = DOM('song-name-display').innerText;
    const duration = audioBuffer ? audioBuffer.duration : 0;
    const formatTime = (time) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
    DOM('stats-length').innerText = formatTime(duration);
    
    DOM('stats-hits').innerText = statsHits;
    DOM('stats-misses').innerText = statsMisses;
    DOM('stats-perfects').innerText = statsPerfects;
    DOM('stats-goods').innerText = statsGoods;
    DOM('stats-oks').innerText = statsOks;

    DOM('stats-overlay').classList.remove('opacity-0', 'pointer-events-none');
}

DOM('end-btn').addEventListener('click', endGame);
DOM('stats-close-btn').addEventListener('click', () => {
    DOM('stats-overlay').classList.add('opacity-0', 'pointer-events-none');
});

// Pause state
let isPaused = false;
function togglePause() {
    if (!gameIsPlaying) return;
    isPaused = !isPaused;
    const overlay = DOM('pause-overlay');
    if (isPaused) {
        if (audioCtx.state === 'running') audioCtx.suspend();
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.remove('cursor-none');
        game.scene.scenes[0].scene.pause("MainScene");
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        overlay.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.add('cursor-none');
        game.scene.scenes[0].scene.resume("MainScene");
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'Space') togglePause();
});

DOM('resume-btn').addEventListener('click', togglePause);
DOM('restart-btn').addEventListener('click', () => {
    togglePause();
    DOM('start-btn').click();
});

// Settings Bindings
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => {
            b.className = "diff-btn py-1.5 text-[10px] rounded border bg-slate-900/40 border-slate-800 text-slate-500 cursor-pointer";
        });
        const t = e.target;
        t.className = "diff-btn py-1.5 text-[10px] rounded border bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold cursor-pointer glow";
        
        const diff = t.dataset.val;
        CONFIG.difficulty = diff;
        if(diff === 'easy') { CONFIG.approachTime = 3.2; CONFIG.fluxSensitivity = 0.035; CONFIG.minBeatGap = 0.5; CONFIG.cubeScale = 1.1; CONFIG.swipeThreshold = 10; }
        if(diff === 'medium') { CONFIG.approachTime = 2.3; CONFIG.fluxSensitivity = 0.022; CONFIG.minBeatGap = 0.35; CONFIG.cubeScale = 0.95; CONFIG.swipeThreshold = 15; }
        if(diff === 'hard') { CONFIG.approachTime = 1.5; CONFIG.fluxSensitivity = 0.012; CONFIG.minBeatGap = 0.22; CONFIG.cubeScale = 0.85; CONFIG.swipeThreshold = 20; }
        
        DOM('config-approach').value = CONFIG.approachTime; DOM('val-approach').innerText = CONFIG.approachTime.toFixed(1) + "s";
        DOM('config-cube').value = CONFIG.cubeScale; DOM('val-cube').innerText = CONFIG.cubeScale.toFixed(2) + "x";
    });
});

DOM('dots-toggle').addEventListener('click', (e) => {
    CONFIG.dotsOnlyMode = !CONFIG.dotsOnlyMode;
    const t = e.target;
    if(CONFIG.dotsOnlyMode) {
        t.className = "mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-all bg-pink-500/20 border-pink-500 text-pink-300 glow cursor-pointer";
        t.innerText = "OMNI-DIRECTIONAL: ACTIVE";
    } else {
        t.className = "mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-all bg-slate-900/40 border-slate-800 text-slate-500 cursor-pointer";
        t.innerText = "ENGAGE OMNI-DIRECTIONAL";
    }
});

DOM('sensitivity-toggle').addEventListener('click', (e) => {
    const t = e.target;
    if (CONFIG.sensitivity === 'normal') {
        CONFIG.sensitivity = 'high';
        CONFIG.frequencyFilter = 600;
        t.innerText = "FREQ SENSITIVITY: HIGH";
        t.className = "mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-all bg-cyan-500/20 border-cyan-400 text-cyan-300 glow cursor-pointer";
    } else if (CONFIG.sensitivity === 'high') {
        CONFIG.sensitivity = 'low';
        CONFIG.frequencyFilter = 60;
        t.innerText = "FREQ SENSITIVITY: LOW";
        t.className = "mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-all bg-slate-800 border-slate-700 text-slate-400 cursor-pointer";
    } else {
        CONFIG.sensitivity = 'normal';
        CONFIG.frequencyFilter = 150;
        t.innerText = "FREQ SENSITIVITY: NORMAL";
        t.className = "mt-1 w-full py-1.5 text-[10px] font-bold rounded border transition-all bg-slate-900/40 border-slate-800 text-slate-500 cursor-pointer";
    }
});

const bindInput = (id, configKey, valTransform, textId, textFormat) => {
    DOM(id).addEventListener('input', (e) => {
        CONFIG[configKey] = valTransform(e.target.value);
        if(textId) DOM(textId).innerText = textFormat(CONFIG[configKey]);
    });
};

bindInput('config-approach', 'approachTime', parseFloat, 'val-approach', v => v.toFixed(1) + 's');
bindInput('config-cube', 'cubeScale', parseFloat, 'val-cube', v => v.toFixed(2) + 'x');
bindInput('config-glow', 'visualizerGlow', parseFloat, 'val-glow', v => v.toFixed(1) + 'x');
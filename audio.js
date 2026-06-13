// --- AUDIO PROCESSING ---
let audioCtx, audioBuffer, currentSource, analyser, dataArray;
let beatsData = [], gameIsPlaying = false, gameStartTime = 0;
let score = 0, combo = 0, displayCombo = 1.0;
let statsHits = 0, statsMisses = 0, statsPerfects = 0, statsGoods = 0, statsOks = 0;

async function analyzeAudioBeats(buffer) {
    const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    const filter = offlineCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = CONFIG.frequencyFilter;
    
    source.connect(filter);
    filter.connect(offlineCtx.destination);
    source.start(0);
    
    const renderedBuffer = await offlineCtx.startRendering();
    const rawData = renderedBuffer.getChannelData(0);
    const windowSize = Math.floor(buffer.sampleRate * 0.04);
    const minGapSamples = Math.floor(buffer.sampleRate * CONFIG.minBeatGap);
    
    let beats = [];
    let prevEnergy = 0, lastBeatSample = -minGapSamples;
    
    for (let i = 0; i < rawData.length; i += windowSize) {
        let energySum = 0;
        const actualLength = Math.min(windowSize, rawData.length - i);
        for (let j = 0; j < actualLength; j++) energySum += rawData[i + j] * rawData[i + j];
        const energy = energySum / actualLength;
        const flux = energy - prevEnergy;
        
        if (flux > CONFIG.fluxSensitivity && i - lastBeatSample >= minGapSamples) {
            const isDot = Math.random() < 0.2;
            const pos = GRID_POSITIONS[Math.floor(Math.random() * GRID_POSITIONS.length)];
            
            let dir = null;
            if (!isDot) {
                // Natural mapping: top row = UP, bottom row = DOWN. Left/Right edges = OUTWARD.
                if (pos.y < 0) {
                    dir = Math.random() > 0.4 ? { angle: -90 } : (pos.x < 0 ? { angle: 180 } : (pos.x > 0 ? { angle: 0 } : { angle: -90 }));
                } else {
                    dir = Math.random() > 0.4 ? { angle: 90 } : (pos.x < 0 ? { angle: 180 } : (pos.x > 0 ? { angle: 0 } : { angle: 90 }));
                }
            }

            beats.push({
                time: i / buffer.sampleRate,
                pos: pos,
                dir: dir,
                isDot, spawned: false, id: Math.random().toString(36)
            });
            lastBeatSample = i;
        }
        prevEnergy = energy;
    }
    return beats;
}

function estimateBPM(beats) {
    if (beats.length < 5) return 120;
    const diffs = [];
    for (let i = 1; i < beats.length; i++) {
        const diff = beats[i].time - beats[i - 1].time;
        if (diff > 0.18 && diff < 2.2) diffs.push(diff);
    }
    if (diffs.length === 0) return 120;
    diffs.sort((a, b) => a - b);
    let bpm = 60 / diffs[Math.floor(diffs.length / 2)];
    while (bpm < 90) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    return Math.round(bpm);
}
// --- PHASER SCENE ---
class MainScene extends Phaser.Scene {
    constructor() { 
        super('MainScene'); 
        this.blockSprites = new Map(); 
        this.trailPoints = []; 
        this.retroOffset = 0; 
        this.lastBeatPulse = 0;
    }

    preload() {
        let g = this.make.graphics({x:0,y:0,add:false});
        
        g.lineStyle(12, 0xffffff, 1);
        g.strokeRoundedRect(6, 6, 116, 116, 24);
        g.generateTexture('tex_box', 128, 128);
        g.clear();

        g.fillStyle(0xffffff, 1);
        g.beginPath(); g.moveTo(64, 20); g.lineTo(100, 70); g.lineTo(76, 70); g.lineTo(76, 108);
        g.lineTo(52, 108); g.lineTo(52, 70); g.lineTo(28, 70); g.closePath(); g.fillPath();
        g.generateTexture('tex_arrow', 128, 128);
        g.clear();

        g.fillStyle(0xffffff, 1);
        g.fillCircle(64, 64, 32);
        g.generateTexture('tex_dot', 128, 128);
        g.clear();

        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, "rgba(255,255,255,0.8)");
        grd.addColorStop(0.4, "rgba(255,255,255,0.2)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grd; ctx.fillRect(0,0,256,256);
        this.textures.addCanvas('tex_aura', canvas);

        g.lineStyle(4, 0xffffff, 1);
        g.strokeRoundedRect(6, 6, 116, 116, 24);
        g.generateTexture('tex_frame', 128, 128);
        g.clear();

        g.fillStyle(0xffffff); g.fillRect(0,0,8,8);
        g.generateTexture('dummy', 8, 8);

        const cLight = document.createElement('canvas');
        cLight.width = 64; cLight.height = 64;
        const ctxLight = cLight.getContext('2d');
        const grdLight = ctxLight.createRadialGradient(32, 32, 0, 32, 32, 32);
        grdLight.addColorStop(0, "rgba(0, 255, 255, 1)");
        grdLight.addColorStop(0.3, "rgba(0, 255, 255, 0.8)");
        grdLight.addColorStop(1, "rgba(0, 255, 255, 0)");
        ctxLight.fillStyle = grdLight; ctxLight.fillRect(0,0,64,64);
        this.textures.addCanvas('tex_gridlight', cLight);

        // Retro Synthwave Sun - Cyberpunk Vibe
        const cSun = document.createElement('canvas');
        cSun.width = 1024; cSun.height = 1024;
        const ctxS = cSun.getContext('2d');
        
        ctxS.shadowBlur = 60;
        ctxS.shadowColor = '#ff00ff';

        const grdS = ctxS.createLinearGradient(0, 0, 0, 1024);
        grdS.addColorStop(0, "#fefe33"); 
        grdS.addColorStop(1, "#ff00ff"); 
        
        ctxS.fillStyle = grdS;
        ctxS.beginPath();
        ctxS.arc(512, 512, 450, 0, Math.PI * 2);
        ctxS.fill();
        
        ctxS.shadowBlur = 0;
        ctxS.globalCompositeOperation = 'destination-out';
        
        // Scanlines across the sun
        for (let y = 62; y < 962; y += 16) {
            ctxS.fillRect(0, y, 1024, 4);
        }
        // Thicker bars at the bottom
        for (let y = 700; y < 962; y += 38) {
            ctxS.fillRect(0, y, 1024, 18);
        }
        
        this.textures.addCanvas('tex_sun', cSun);

    }

    create() {
        // Enforce Depths for 3D Layering
        this.bgGraphics = this.add.graphics().setDepth(-20);
        this.starGraphics = this.add.graphics().setDepth(-15);
        this.sunSprite = this.add.sprite(0, 0, 'tex_sun').setDepth(-10).setBlendMode(Phaser.BlendModes.ADD);
        this.mountainGraphics = this.add.graphics().setDepth(-5);
        this.gridGraphics = this.add.graphics().setDepth(-4);
        this.darkOverlay = this.add.graphics().setDepth(-1);
        
        this.targetGraphics = this.add.graphics().setDepth(10);
        this.trailGraphics = this.add.graphics().setDepth(15);
        this.cursorGraphics = this.add.graphics().setDepth(25);
        this.spritesLayer = this.add.container(0, 0).setDepth(20);
        
        this.stars = Array.from({length: 150}, () => ({
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: Math.random() + 0.1
        }));

        this.bloomFX = this.cameras.main.postFX.addBloom?.(0xffffff, 1, 1, 0.9, 1.1) || null;
        
        this.lightPool = [];
        this.activeGridLights = [];
        for (let i = 0; i < 40; i++) {
            let s = this.add.sprite(0, 0, 'tex_gridlight').setDepth(-3).setBlendMode(Phaser.BlendModes.SCREEN).setVisible(false);
            this.lightPool.push(s);
        }

        this.chromaticFX = this.cameras.main.postFX.addChromaticAberration?.() || null;
        if(this.chromaticFX) this.chromaticFX.intensity = 0; 
        
        this.vignetteFX = this.cameras.main.postFX.addVignette?.(0.5, 0.5, 0.9, 0.25) || null;

        // Synthwave Blend Modes
        this.gridGraphics.setBlendMode(Phaser.BlendModes.ADD);
        this.starGraphics.setBlendMode(Phaser.BlendModes.ADD);

        this.lastPointerPos = new Phaser.Math.Vector2(this.input.x, this.input.y);

        window.addEventListener('startGame', () => {
            this.blockSprites.forEach(obj => { obj.base.destroy(); obj.glow.destroy(); obj.icon.destroy(); obj.reticle.destroy(); });
            this.blockSprites.clear();
            beatsData.forEach(b => b.spawned = false);
            score = 0; combo = 0; displayCombo = 1.0; this.updateScore();
            statsHits = 0; statsMisses = 0; statsPerfects = 0; statsGoods = 0; statsOks = 0;
        });
    }

    update() {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2 + CONFIG.gridYOffset;
        const theme = THEMES[CONFIG.visualTheme];

        this.starGraphics.clear();
        this.bgGraphics.clear();
        this.gridGraphics.clear();
        this.mountainGraphics.clear();
        this.darkOverlay.clear();
        this.targetGraphics.clear();
        this.trailGraphics.clear();
        this.cursorGraphics.clear();

        // Enforce full canvas boundaries for PostFX graphics to avoid rectangular artifacts
        this.mountainGraphics.fillStyle(0x000000, 0);
        this.mountainGraphics.fillRect(0, 0, w, h);
        this.gridGraphics.fillStyle(0x000000, 0);
        this.gridGraphics.fillRect(0, 0, w, h);

        // Ensure shared points array exists for object pooling
        if (!this.sharedPoints) {
            this.sharedPoints = [{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}];
        }

        // --- HOVER INPUT LOGIC ---
        const ptr = this.input.activePointer;
        const currentPos = new Phaser.Math.Vector2(ptr.x, ptr.y);
        const dist = currentPos.distance(this.lastPointerPos);

        if (dist > 2 || this.trailPoints.length === 0) this.trailPoints.push({ x: currentPos.x, y: currentPos.y });
        if (this.trailPoints.length > 15) this.trailPoints.shift();
        if (dist < 1 && this.trailPoints.length > 1) this.trailPoints.shift();

        if (dist >= Math.min(CONFIG.swipeThreshold, 20)) this.checkSlices(this.lastPointerPos, currentPos, dist);
        this.lastPointerPos.copy(currentPos);

        // --- DRAW CURSOR ---
        if (gameIsPlaying) {
            this.cursorGraphics.lineStyle(2, theme.primary, 0.8);
            this.cursorGraphics.strokeCircle(currentPos.x, currentPos.y, 8);
            this.cursorGraphics.fillStyle(theme.secondary, 1);
            this.cursorGraphics.fillCircle(currentPos.x, currentPos.y, 3);
        }

        // --- AUDIO REACTIVE BACKGROUND ---
        let bassEnergy = 0;
        let midEnergy = 0;
        if (analyser && dataArray && gameIsPlaying) {
            analyser.getByteFrequencyData(dataArray);
            let sumBass = 0; for(let i=0; i<8; i++) sumBass += dataArray[i];
            bassEnergy = (sumBass / 8 / 255);
            
            let sumMid = 0; for(let i=8; i<24; i++) sumMid += dataArray[i];
            midEnergy = (sumMid / 16 / 255);
            
            // Dynamic Camera Bump on strong beats
            if (bassEnergy > 0.85 && this.time.now - this.lastBeatPulse > 200) {
                this.cameras.main.zoomTo(1.02 + (bassEnergy * 0.03), 40, 'Sine.easeOut', true, (c, p) => {
                    if(p === 1) c.zoomTo(1.0, 120, 'Sine.easeIn');
                });
                if (this.chromaticFX) {
                    this.tweens.add({
                        targets: this.chromaticFX,
                        intensity: bassEnergy * 0.8,
                        duration: 80,
                        yoyo: true,
                        ease: 'Power2'
                    });
                }
                this.lastBeatPulse = this.time.now;
            }
        }

        const gridH = h * 0.45;
        const transitionY = h - gridH;

        const t = this.time.now * 0.0005;

        // --- DEEP SKY & HORIZON ---
        const bgSkyTop = gameIsPlaying ? 0x010002 : 0x020005;
        const bgSkyMid1 = gameIsPlaying ? 0x04000a : 0x0a001a;
        const bgSkyMid2 = gameIsPlaying ? 0x0a0014 : 0x1f0033;
        const bgSkyBot = gameIsPlaying ? 0x130022 : 0x3d0066;

        this.bgGraphics.fillGradientStyle(bgSkyTop, bgSkyTop, bgSkyMid1, bgSkyMid1, 1);
        this.bgGraphics.fillRect(0, 0, w, transitionY - 300);
        
        this.bgGraphics.fillGradientStyle(bgSkyMid1, bgSkyMid1, bgSkyMid2, bgSkyMid2, 1);
        this.bgGraphics.fillRect(0, transitionY - 300, w, 220);
        
        this.bgGraphics.fillGradientStyle(bgSkyMid2, bgSkyMid2, bgSkyBot, bgSkyBot, 1);
        this.bgGraphics.fillRect(0, transitionY - 80, w, 80);

        const targetSunSize = Math.min(w, h) * 0.85;
        this.sunSprite.setPosition(cx, transitionY + 20);
        this.sunSprite.setScale((targetSunSize / 1024) * (1 + bassEnergy * 0.05));

        // --- STARFIELD ---
        const starSpeed = gameIsPlaying ? 0.015 + (bassEnergy * 0.02) : 0.002;
        this.starGraphics.fillStyle(0x00ffff, 0.8);
        for (let s of this.stars) {
            s.z -= starSpeed;
            if (s.z <= 0) {
                s.x = (Math.random() - 0.5) * 2;
                s.y = (Math.random() - 0.5) * 2;
                s.z = 1.0;
            }
            let px = cx + (s.x / s.z) * w;
            let py = (transitionY - 150) + (s.y / s.z) * transitionY; 
            if (px > 0 && px < w && py > 0 && py < transitionY) {
                let size = (1 - s.z) * 2.5;
                this.starGraphics.fillCircle(px, py, size);
            }
        }

        // --- 3D PROCEDURAL GRID ---
        if (typeof this.cameraZ === 'undefined') this.cameraZ = 0;
        const scrollSpeed = gameIsPlaying ? 500 + bassEnergy * 800 : 250;
        this.cameraZ += scrollSpeed * 0.016;

        const fov = h * 0.85;
        const camY = h * 0.4; 
        const gridSpacingZ = 600;
        const gridSpacingX = 400;
        const maxZ = 16000;
        let baseZ = Math.floor(this.cameraZ / gridSpacingZ) * gridSpacingZ;

        // Base Grid Floor Background
        this.mountainGraphics.fillStyle(0x040008, 1);
        this.mountainGraphics.fillRect(0, transitionY, w, h - transitionY);

        // Subtle Reflection near horizon
        const reflectionH = 120;
        this.mountainGraphics.fillGradientStyle(0x2a004a, 0x2a004a, 0x040008, 0x040008, 0.5 + bassEnergy * 0.2);
        this.mountainGraphics.fillRect(0, transitionY, w, reflectionH);

        const numVLines = Math.floor((w / 2) / (gridSpacingX / (maxZ/fov))) + 6;
        let projectedRows = [];

        // Precalculate all points
        for (let z = baseZ + maxZ; z >= baseZ; z -= gridSpacingZ) {
            let zFront = z - this.cameraZ;
            if (zFront <= 5) continue;
            
            let scale = fov / zFront;
            let alpha = Math.max(0, 1 - (zFront / maxZ));
            alpha = Math.pow(alpha, 1.2); 
            
            let rowPts = [];
            for(let i = -numVLines; i <= numVLines; i++) {
                let worldX = i * gridSpacingX;
                
                let waveH = Math.sin(worldX * 0.005 + t * 1.5) * Math.cos(z * 0.005 - t * 2) * 120;
                waveH += Math.sin(worldX * 0.015 - t) * Math.sin(z * 0.015 + t) * 50;
                let centerDist = Math.abs(worldX);
                let flattenFactor = Math.min(1, Math.max(0, (centerDist - 300) / 500));
                waveH *= flattenFactor; 
                
                let worldY = camY - waveH;
                
                let px = cx + worldX * scale;
                let py = transitionY + worldY * scale;
                
                rowPts.push({px, py, alpha, worldX, zFront});
            }
            projectedRows.push(rowPts);
        }

        // Draw grid
        for(let r = 0; r < projectedRows.length; r++) {
            let rowP1 = projectedRows[r];
            if (rowP1[0].py < transitionY || rowP1[0].py > h + 150) continue;

            this.gridGraphics.lineStyle(1.5 + bassEnergy, 0xff00ff, rowP1[0].alpha * (0.6 + bassEnergy * 0.4));
            this.gridGraphics.beginPath();
            
            this.gridGraphics.moveTo(rowP1[0].px, rowP1[0].py);
            for(let c = 1; c < rowP1.length; c++) {
                this.gridGraphics.lineTo(rowP1[c].px, rowP1[c].py);
            }
            
            if (r < projectedRows.length - 1) {
                let rowP2 = projectedRows[r+1];
                for(let c = 0; c < rowP1.length; c++) {
                    this.gridGraphics.moveTo(rowP1[c].px, rowP1[c].py);
                    this.gridGraphics.lineTo(rowP2[c].px, rowP2[c].py);
                }
            }
            this.gridGraphics.strokePath();
        }

        // POOLED LIGHTS UPDATE
        let spawnChance = gameIsPlaying ? 0.3 + (bassEnergy * 0.5) : 0.05;
        if (Math.random() < spawnChance && this.lightPool.length > 0) {
            let sprite = this.lightPool.pop();
            let col = Math.floor(Math.random() * (numVLines * 2 + 1)) - numVLines;
            let worldX = col * gridSpacingX;
            let worldZ = baseZ + maxZ + Math.random() * gridSpacingZ * 2; 
            
            this.activeGridLights.push({ sprite, worldX, worldZ, col });
        }

        for (let i = this.activeGridLights.length - 1; i >= 0; i--) {
            let light = this.activeGridLights[i];
            let zFront = light.worldZ - this.cameraZ;
            
            if (zFront <= 5) {
                light.sprite.setVisible(false);
                this.lightPool.push(light.sprite);
                this.activeGridLights.splice(i, 1);
                continue;
            }
            
            let scale = fov / zFront;
            let waveH = Math.sin(light.worldX * 0.005 + t * 1.5) * Math.cos(light.worldZ * 0.005 - t * 2) * 120;
            waveH += Math.sin(light.worldX * 0.015 - t) * Math.sin(light.worldZ * 0.015 + t) * 50;
            let centerDist = Math.abs(light.worldX);
            let flattenFactor = Math.min(1, Math.max(0, (centerDist - 300) / 500));
            waveH *= flattenFactor;
            
            let worldY = camY - waveH;
            
            let px = cx + light.worldX * scale;
            let py = transitionY + worldY * scale;
            
            if (py > transitionY && py < h + 50) {
                light.sprite.setPosition(px, py);
                light.sprite.setScale(scale * 12 * (1 + bassEnergy * 0.5));
                light.sprite.setAlpha(Math.max(0, 1 - (zFront / maxZ)) * 0.5);
                light.sprite.setVisible(true);
            } else {
                light.sprite.setVisible(false);
            }
        }
        
        // Intense Horizon Line Separator over Grid
        this.gridGraphics.lineStyle(4 + bassEnergy*4, 0x00ffff, 0.9 + bassEnergy*0.1);
        this.gridGraphics.beginPath();
        this.gridGraphics.moveTo(0, transitionY);
        this.gridGraphics.lineTo(w, transitionY);
        this.gridGraphics.strokePath();
        
        // Extra glow rect on top of horizon
        this.gridGraphics.fillGradientStyle(0x00ffff, 0x00ffff, 0xff00ff, 0xff00ff, 0.9, 0.9, 0.0, 0.0);
        this.gridGraphics.fillRect(0, transitionY, w, 4);

        if (gameIsPlaying) {
            const overallEnergy = (bassEnergy + midEnergy) / 2;
            const targetDarkAlpha = Math.min(0.5, 0.1 + (overallEnergy * 0.8));
            
            this.currentDarkAlpha = this.currentDarkAlpha ?? 0.1;
            this.currentDarkAlpha += (targetDarkAlpha - this.currentDarkAlpha) * 0.15;
            
            this.darkOverlay.fillStyle(0x000000, this.currentDarkAlpha);
            this.darkOverlay.fillRect(0, 0, w, h);
        } else {
            this.currentDarkAlpha = 0.1;
        }

        // --- DRAW POLISHED TARGET SYNC RING AND CIRCULAR EQ ---
        const ringScale = 1 + bassEnergy * 0.15;
        const ringRadius = 180 * ringScale;
        
        // Inner Glow Rings (Additive overlapping lines for glow)
        this.targetGraphics.lineStyle(12, theme.primary, 0.1);
        this.targetGraphics.strokeCircle(cx, cy, ringRadius);
        this.targetGraphics.lineStyle(6, theme.primary, 0.3);
        this.targetGraphics.strokeCircle(cx, cy, ringRadius);
        
        // Solid Core
        this.targetGraphics.lineStyle(2, 0xffffff, 0.8);
        this.targetGraphics.strokeCircle(cx, cy, ringRadius);
        
        // Circular EQ Visualizer
        const numBars = 64;
        const step = (Math.PI * 2) / numBars;
        const rotationOffset = t * 15 * Math.PI / 180;
        
        for(let i=0; i<numBars; i++) {
            const rad = i * step + rotationOffset;
            let v = 0;
            if (analyser && dataArray && gameIsPlaying) {
                // sample lower-mid freq spread nicely
                v = dataArray[i * 2 + 2] / 255.0; 
            }
            
            const intensityScale = v * v * 90 * CONFIG.visualizerGlow + (i%2===0 ? 12 : 6);
            const r1 = ringRadius + 4;
            const r2 = ringRadius + intensityScale + (bassEnergy * 20);
            const rInner = ringRadius - 4 - (v * v * 20);
            
            this.targetGraphics.lineStyle(4, theme.primary, 0.4 + v * 0.6);
            this.targetGraphics.beginPath();
            this.targetGraphics.moveTo(cx + Math.cos(rad) * rInner, cy + Math.sin(rad) * rInner);
            this.targetGraphics.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
            this.targetGraphics.strokePath();
        }

        if (!gameIsPlaying || !audioCtx) {
            document.getElementById('time-display').innerText = "00:00 / 00:00";
            this.drawTrail(theme, bassEnergy);
            return;
        }

        const currentTime = Math.max(0, audioCtx.currentTime - gameStartTime);
        const duration = audioBuffer.duration;
        const formatTime = (time) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
        
        const formattedTime = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        if (this.lastTimeText !== formattedTime) {
            document.getElementById('time-display').innerText = formattedTime;
            this.lastTimeText = formattedTime;
        }

        const approach = CONFIG.approachTime;

        // --- SPAWN LOGIC ---
        for (let i = 0; i < beatsData.length; i++) {
            const b = beatsData[i];
            if (!b.spawned && currentTime >= b.time - approach) {
                const targetX = cx + b.pos.x * w * CONFIG.gridScale;
                const targetY = cy + b.pos.y * h * CONFIG.gridScale;
                
                const color = Math.random() > 0.5 ? theme.primary : theme.secondary;
                
                const isActDot = CONFIG.dotsOnlyMode ? true : b.isDot;
                const iconStr = isActDot ? 'tex_dot' : 'tex_arrow';

                const glow = this.add.sprite(cx, transitionY - 20, 'tex_aura').setTint(color).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
                const base = this.add.sprite(cx, transitionY - 20, 'tex_box').setTint(0x444455).setAlpha(0); 
                const icon = this.add.sprite(cx, transitionY - 20, iconStr).setTint(0x888888).setAlpha(0); 
                const reticle = this.add.sprite(cx, transitionY - 20, 'tex_frame').setTint(color).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
                
                if (!isActDot && b.dir) icon.setAngle(b.dir.angle + 90);

                this.spritesLayer.add([glow, base, icon, reticle]);

                this.blockSprites.set(b.id, {
                    data: b, targetX, targetY,
                    glow, base, icon, reticle, color,
                    baseSize: 100, isActDot
                });
                b.spawned = true;
            }
            if (b.time - approach > currentTime) break;
        }

        // --- RENDER & UPDATE BLOCKS ---
        for (const [id, block] of this.blockSprites.entries()) {
            const timeLapsed = currentTime - (block.data.time - approach);
            const easeProgress = Math.pow(timeLapsed / approach, 2.8); 
            const linearProgress = timeLapsed / approach;
            
            // Modulate origin spawn based on horizon line
            const originY = transitionY - 20; 
            const currX = cx + (block.targetX - cx) * easeProgress;
            const currY = originY + (block.targetY - originY) * Math.pow(timeLapsed / approach, 2.2); 
            
            const scale = (CONFIG.cubeScale * easeProgress * block.baseSize) / 128;
            const realSize = 128 * scale;
            const syncGap = Math.abs(currentTime - block.data.time);
            
            // Allow 0.55s after beat before complete MISS deletion
            if (timeLapsed > approach + 0.55) {
                this.cameras.main.shake(150, 0.008);
                this.spawnFloatingText(currX, currY, "MISS\n+0", 0x475569);
                block.glow.destroy(); block.base.destroy(); block.icon.destroy(); block.reticle.destroy();
                this.blockSprites.delete(id);
                combo = 0; displayCombo = 1.0; this.updateScore();
                statsMisses++;
                continue;
            }

            if (scale > 0.05) {
                let alphaScale = 1.0;
                if (linearProgress < 0.2) alphaScale = linearProgress / 0.2;
                
                if (timeLapsed > approach + 0.35) {
                    const fadeProgress = (timeLapsed - (approach + 0.35)) / 0.2;
                    alphaScale = Math.max(0, 1.0 - fadeProgress);
                }

                const isHitable = linearProgress >= 0.65 && syncGap <= 0.35;
                
                // Dim down missed blocks
                let activeColor = 0x444455;
                let iconColor = 0x888888;
                let glowAlpha = 0;
                let glowScale = 2.5;

                if (syncGap <= 0.35) {
                    activeColor = block.color;
                    iconColor = 0xffffff;
                    const intensity = 1.0 - (syncGap / 0.35); 
                    glowAlpha = intensity * 0.9 + (bassEnergy * 0.3);
                    glowScale = 2.5 + (intensity * 1.5) + (bassEnergy * 0.5);
                } else if (timeLapsed > approach) {
                    activeColor = 0x333344; // Dark gray if late
                    iconColor = 0x555555;
                }

                block.base.setPosition(currX, currY).setScale(scale).setTint(activeColor).setAlpha(alphaScale);
                block.icon.setPosition(currX, currY).setScale(scale * 0.7).setTint(iconColor).setAlpha(alphaScale);
                block.glow.setPosition(currX, currY).setScale(scale * glowScale).setTint(block.color).setAlpha(glowAlpha * alphaScale);

                // 3D Motion Trail Streak
                if (linearProgress > 0.05 && linearProgress < 1.0) {
                    const historyProgress = Math.max(0, linearProgress - 0.12);
                    const trailX = cx + (block.targetX - cx) * Math.pow(historyProgress, 2.8);
                    const trailY = originY + (block.targetY - originY) * Math.pow(historyProgress, 2.2);
                    
                    this.starGraphics.lineStyle(realSize * 0.4, activeColor, alphaScale * 0.2);
                    this.starGraphics.beginPath();
                    this.starGraphics.moveTo(currX, currY);
                    this.starGraphics.lineTo(trailX, trailY);
                    this.starGraphics.strokePath();
                }

                // Approach Reticle
                let reticleBaseAlpha = Math.max(0, 1 - Math.abs(syncGap));
                let reticleScaleMultiplier = 1 + Math.max(0, approach - timeLapsed) * 1.5;
                block.reticle.setPosition(currX, currY).setScale(scale * reticleScaleMultiplier).setTint(activeColor).setAlpha(alphaScale * reticleBaseAlpha);

                // Add slight chaotic shake to block on high bass
                if (bassEnergy > 0.8 && syncGap <= 0.35) {
                    block.base.x += (Math.random() - 0.5) * 6 * bassEnergy;
                    block.base.y += (Math.random() - 0.5) * 6 * bassEnergy;
                }

                block.hitbox = new Phaser.Geom.Rectangle(currX - realSize/2 - 20, currY - realSize/2 - 20, realSize + 40, realSize + 40);
                block.isHitable = isHitable;
                block.syncGap = syncGap;
            }
        }

        this.drawTrail(theme, bassEnergy);
    }

    drawTrail(theme, bassEnergy = 0) {
        if (this.trailPoints.length > 1) {
            let trailColor = theme.primary;
            for (let i = 1; i < this.trailPoints.length; i++) {
                const p1 = this.trailPoints[i-1];
                const p2 = this.trailPoints[i];
                const alpha = (i / this.trailPoints.length);
                
                this.trailGraphics.lineStyle((15 + bassEnergy * 10) * alpha, trailColor, alpha * 0.8);
                this.trailGraphics.beginPath();
                this.trailGraphics.moveTo(p1.x, p1.y);
                this.trailGraphics.lineTo(p2.x, p2.y);
                this.trailGraphics.strokePath();
                
                this.trailGraphics.lineStyle(6 * alpha, 0xffffff, alpha);
                this.trailGraphics.beginPath();
                this.trailGraphics.moveTo(p1.x, p1.y);
                this.trailGraphics.lineTo(p2.x, p2.y);
                this.trailGraphics.strokePath();
            }
        }
    }

    checkSlices(p1, p2, speed) {
        if (!gameIsPlaying) return;
        const swipeLine = new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y);
        const swipeAngle = Phaser.Math.RadToDeg(Phaser.Geom.Line.Angle(swipeLine));

        for (const [id, block] of this.blockSprites.entries()) {
            if (block.isHitable && block.hitbox) {
                if (Phaser.Geom.Intersects.LineToRectangle(swipeLine, block.hitbox)) {
                    
                    let angleMatch = true;
                    if (!block.isActDot && block.data.dir) {
                        let diff = Math.abs(swipeAngle - block.data.dir.angle);
                        if (diff > 180) diff = 360 - diff;
                        if (diff > 85) angleMatch = false; // Expanded angle leniency
                    }

                    if (angleMatch) {
                        let hitResult = "MISS";
                        let pts = 0;
                        let hitColor = 0x475569; 

                        if (block.syncGap <= 0.12) { 
                            hitResult = "PERFECT"; pts = 200; hitColor = 0x00e5ff; statsPerfects++; statsHits++; // Cyan
                        } else if (block.syncGap <= 0.25) { 
                            hitResult = "GOOD"; pts = 100; hitColor = 0xff007f; statsGoods++; statsHits++; // Pink
                        } else { 
                            hitResult = "OK"; pts = 50; hitColor = 0xffffff; statsOks++; statsHits++; // White
                        }

                        combo++;
                        displayCombo = Math.min(8.0, 1.0 + Math.floor(combo / 10) * 0.5);
                        const actualScoreAdded = Math.floor(pts * displayCombo);
                        score += actualScoreAdded;
                        
                        // Screen Flash / Camera Shake
                        if (hitResult === "PERFECT") {
                            this.cameras.main.shake(80, 0.012);
                            this.cameras.main.zoomTo(1.03, 40, 'Quad.easeOut', true, (c, p) => {
                                if(p===1) c.zoomTo(1.0, 100, 'Quad.easeIn');
                            });
                            // Screen flash burst additive overlay
                            const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff, 0.2)
                                .setBlendMode(Phaser.BlendModes.ADD).setDepth(100);
                            this.tweens.add({ targets: flash, alpha: 0, duration: 150, onComplete: () => flash.destroy() });
                        } else {
                            this.cameras.main.shake(40, 0.005);
                        }

                        this.createParticles(block.base.x, block.base.y, block.color, hitResult === "PERFECT");
                        this.spawnFloatingText(block.base.x, block.base.y, `${hitResult}\n+${actualScoreAdded}`, hitColor, hitResult === "PERFECT");
                        
                        block.glow.destroy(); block.base.destroy(); block.icon.destroy(); block.reticle.destroy();
                        this.blockSprites.delete(id);
                        this.updateScore();
                    } else {
                        combo = 0; displayCombo = 1.0;
                        statsMisses++;
                        this.cameras.main.shake(120, 0.01);
                        this.spawnFloatingText(block.base.x, block.base.y, "MISS\n+0", 0x475569);
                        block.glow.destroy(); block.base.destroy(); block.icon.destroy(); block.reticle.destroy();
                        this.blockSprites.delete(id);
                        this.updateScore();
                    }
                }
            }
        }
    }

    spawnFloatingText(x, y, message, color, isPerfect = false) {
        const txt = this.add.text(x, y, message, {
            fontFamily: 'monospace', fontSize: isPerfect ? '30px' : '22px', fontStyle: 'italic 900',
            color: '#ffffff', align: 'center', stroke: '#0a0a16', strokeThickness: 6
        }).setOrigin(0.5).setTint(color).setBlendMode(Phaser.BlendModes.ADD);

        const targetY = y - 120 + (Math.random() * -40);
        const targetX = x + (Math.random() - 0.5) * 60;
        const targetScale = isPerfect ? 1.6 : 1.1;

        this.tweens.add({
            targets: txt,
            y: targetY, x: targetX, alpha: { start: 1, to: 0, ease: 'Cubic.easeIn', delay: 150 }, scale: targetScale,
            duration: isPerfect ? 700 : 500, ease: isPerfect ? 'Back.easeOut' : 'Quad.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    createParticles(x, y, color, isPerfect) {
        const emitter = this.add.particles(x, y, 'dummy', {
            speed: { min: 200, max: isPerfect ? 900 : 500 },
            angle: { min: 0, max: 360 },
            scale: { start: isPerfect ? 3.0 : 1.5, end: 0 },
            blendMode: 'ADD',
            lifespan: isPerfect ? 600 : 350,
            gravityY: 500,
            tint: color,
            emitting: false
        });
        emitter.explode(isPerfect ? 50 : 20);
        this.time.delayedCall(700, () => emitter.destroy());
    }

    updateScore() {
        document.getElementById('score-display').innerText = Math.floor(score);
        document.getElementById('combo-display').innerText = `x${displayCombo.toFixed(1)}`;
        
        animateElement('score-display');
        animateElement('combo-display');

        const comboEl = document.getElementById('combo-display');
        if (displayCombo >= 4.0) comboEl.className = "text-3xl font-black text-fuchsia-500 glow animate-pop w-[90px] text-right";
        else if (displayCombo > 1.0) comboEl.className = "text-3xl font-black text-cyan-500 glow animate-pop w-[90px] text-right";
        else comboEl.className = "text-3xl font-black text-cyan-600 glow animate-pop w-[90px] text-right";
    }
}
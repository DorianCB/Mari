// app.js - CORREGIDO: Árbol en el suelo (vertical) y más pequeño (horizontal).
document.addEventListener('DOMContentLoaded', () => {
    const fallingPoint = document.getElementById('falling-point');
    const treeCanvas = document.getElementById('treeCanvas');
    const ctx = treeCanvas.getContext('2d');
    const container = document.getElementById('container');

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const cssW = container.clientWidth;
        const cssH = container.clientHeight;
        
        const canvasRect = treeCanvas.getBoundingClientRect();
        const canvasW = canvasRect.width;
        const canvasH = canvasRect.height;
        
        treeCanvas.style.width = canvasW + 'px';
        treeCanvas.style.height = canvasH + 'px';
        treeCanvas.width = Math.round(canvasW * dpr);
        treeCanvas.height = Math.round(canvasH * dpr);
        
        generateTree();
    }
    
    window.addEventListener('resize', resizeCanvas);
    
    fallingPoint.addEventListener('animationend', () => {
        fallingPoint.style.display = 'none';
        resizeCanvas(); 
    });

    // --- FUNCIONES PARA CORAZONES ---

    function drawHeart(x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const s = size * 0.1; 
        ctx.moveTo(x, y - 3 * s);
        ctx.bezierCurveTo(x - 5 * s, y - 10 * s, x - 12 * s, y - 5 * s, x, y + 8 * s);
        ctx.bezierCurveTo(x + 12 * s, y - 5 * s, x + 5 * s, y - 10 * s, x, y - 3 * s);
        ctx.fill();
    }

    function getRandomPointInHeart(cx, cy, radius) {
        while (true) {
            const x = (Math.random() - 0.5) * 2.2 * radius; 
            const y = (Math.random() - 0.5) * 2.5 * radius; 

            const nx = x / radius * 1.2; 
            const ny = -(y / radius) * 1.5 + 0.3; 
            const check = Math.pow(nx, 2) + Math.pow(ny - Math.sqrt(Math.abs(nx)), 2);

            if (check <= 1.0) { 
                return { x: cx + x, y: cy + y };
            }
        }
    }

    // --- Funciones para el Cronómetro (ACTUALIZADAS) ---

    function formatNumber(num) {
        return num < 10 ? '0' + num : num;
    }

    function calculateDuration(startDate) {
        const now = new Date();
        let diff = Math.floor((now - startDate) / 1000); 

        if (diff < 0) diff = 0; 

        const d = Math.floor(diff / (60 * 60 * 24));
        diff -= d * (60 * 60 * 24);

        const h = Math.floor(diff / (60 * 60));
        diff -= h * (60 * 60);

        const m = Math.floor(diff / 60);
        diff -= m * 60;

        const s = diff;

        return { d, h, m, s };
    }

    let timerInterval = null; // Variable para guardar el intervalo
    function startTimers() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        const timersContainer = document.getElementById('timers-container');
        const spanTalk = document.getElementById('time-talk');
        const spanLove = document.getElementById('time-love');
        const spanHappy = document.getElementById('time-happy');

        const dateTalk = new Date('2025-03-31T00:00:00');
        const dateLove = new Date('2025-06-04T00:00:00');
        const dateHappy = new Date('2025-09-06T00:00:00');

        timersContainer.classList.add('timer-visible');

        function buildTimerHTML(time) {
            return `
                <span class="timer-num">${time.d}</span>
                <span class="timer-unit">días</span>
                <span class="timer-num">${formatNumber(time.h)}</span>
                <span class="timer-unit">horas</span>
                <span class="timer-num">${formatNumber(time.m)}</span>
                <span class="timer-unit">minutos</span>
                <span class="timer-num">${formatNumber(time.s)}</span>
                <span class="timer-unit">segundos</span>
            `;
        }

        function updateClocks() {
            spanTalk.innerHTML = buildTimerHTML(calculateDuration(dateTalk));
            spanLove.innerHTML = buildTimerHTML(calculateDuration(dateLove));
            spanHappy.innerHTML = buildTimerHTML(calculateDuration(dateHappy));
        }

        updateClocks(); // Llamar una vez inmediatamente
        timerInterval = setInterval(updateClocks, 1000); // Luego actualizar
    }


    // --- Funciones de Animación (easing, bend, etc.) ---

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function computeCompositeBend(p, rightBend, leftBend, hookStrength = 0.8, hookStart = 0.7) {
        const s = easeInOutCubic(p);
        let base = rightBend * (1 - s) + leftBend * s;

        if (p > hookStart) {
            const t = (p - hookStart) / (1 - hookStart);
            const hookFactor = Math.pow(t, 1.8);
            base += -Math.abs(leftBend) * hookStrength * hookFactor;
        }

        return base;
    }

    function computeBendSecondary(p, baseBend, variation) {
        let bend = baseBend;
        return bend;
    }

    function cubicPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        return { x, y };
    }

    function cubicDerivative(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const ax = 3 * (u * u * (p1.x - p0.x) + 2 * u * t * (p2.x - p1.x) + t * t * (p3.x - p2.x));
        const ay = 3 * (u * u * (p1.y - p0.y) + 2 * u * t * (p2.y - p1.y) + t * t * (p3.y - p2.y));
        return { x: ax, y: ay };
    }

    function computeMainBranchShape(centerX, groundY, p, params) {
        const {
            baseWidth,
            topHeight,
            rightBend,
            leftBend,
            endThicken
        } = params;

        const pe = easeOutCubic(p);

        let thicknessProgress = 0;
        if (pe > 0.5) {
            thicknessProgress = (pe - 0.5) / 0.5;
            thicknessProgress = easeOutCubic(thicknessProgress);
        }
        const thicknessFactor = 1 + (endThicken - 1) * thicknessProgress;

        const height = topHeight * pe;
        const halfBase = (baseWidth * (1 + (thicknessFactor - 1) * 0.8)) / 2;

        const leftBaseX = centerX - halfBase;
        const rightBaseX = centerX + halfBase;
        const baseY = groundY;

        const bend = computeCompositeBend(pe, rightBend, leftBend);

        const sagStart = 0.5;
        let sagFactor = 0;
        if (pe > sagStart) {
            const raw = (pe - sagStart) / (1 - sagStart);
            sagFactor = Math.pow(raw, 0.8);
        }
        const sagY = topHeight * 0.08 * sagFactor;
        const sagX = -Math.abs(bend) * 0.5 * sagFactor;

        const tipX = centerX + bend * pe + sagX;
        const tipY = baseY - height + sagY;

        const leftCp1X = leftBaseX + halfBase * 0.15 + bend * 0.05;
        const leftCp1Y = baseY - height * 0.08 + sagY * 0.1;
        const leftCp2X = centerX - halfBase * 0.25 + bend * 0.15 + (halfBase * 0.15) * (thicknessFactor - 1);
        const leftCp2Y = baseY - height * 0.5 + sagY * 0.4;
        const rightCp1X = centerX + halfBase * 0.25 + bend * 0.05 + sagX * 0.05 + (halfBase * 0.08) * (thicknessFactor - 1);
        const rightCp1Y = baseY - height * 0.48 + sagY * 0.3;
        const rightCp2X = rightBaseX - halfBase * 0.15 + bend * 0.02;
        const rightCp2Y = baseY - height * 0.1 + sagY * 0.05;
        
        return { 
            pe, height, halfBase, leftBaseX, rightBaseX, baseY, bend, tipX, tipY,
            leftCp1X, leftCp1Y, leftCp2X, leftCp2Y, rightCp1X, rightCp1Y, rightCp2X, rightCp2Y,
            thicknessFactor
        };
    } 

    function getPointOnMainBranch(centerX, groundY, heightProgress, side, mainParams) { 
        const data = computeMainBranchShape(centerX, groundY, heightProgress, mainParams);
        const t = data.pe; 

        const leftP0 = { x: data.leftBaseX, y: data.baseY };
        const leftP1 = { x: data.leftCp1X, y: data.leftCp1Y };
        const leftP2 = { x: data.leftCp2X, y: data.leftCp2Y };
        const leftP3 = { x: data.tipX, y: data.tipY };

        const rightP0 = { x: data.rightBaseX, y: data.baseY };
        const rightP1 = { x: data.rightCp2X, y: data.rightCp2Y };
        const rightP2 = { x: data.rightCp1X, y: data.rightCp1Y };
        const rightP3 = { x: data.tipX, y: data.tipY };

        let pt, deriv;
        if (side === 'left') {
            pt = cubicPoint(t, leftP0, leftP1, leftP2, leftP3);
            deriv = cubicDerivative(t, leftP0, leftP1, leftP2, leftP3);
        } else {
            pt = cubicPoint(t, rightP0, rightP1, rightP2, rightP3);
            deriv = cubicDerivative(t, rightP0, rightP1, rightP2, rightP3);
        }

        const dtLen = Math.hypot(deriv.x, deriv.y) || 1;
        const tx = deriv.x / dtLen;
        const ty = deriv.y / dtLen;
        let nx = -ty;
        let ny = tx;

        const dirFromCenter = pt.x - centerX;
        if ((side === 'left' && nx > 0) || (side === 'right' && nx < 0)) {
            nx = -nx; ny = -ny;
        }

        const x = pt.x;
        const y = pt.y;

        return { x, y, rawX: pt.x, rawY: pt.y, tx, ty, nx, ny };
    }

    function drawMainBranch(centerX, groundY, p, params) {
        const { colorFill } = params;
        const data = computeMainBranchShape(centerX, groundY, p, params);

        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.moveTo(data.leftBaseX, data.baseY);
        ctx.bezierCurveTo(data.leftCp1X, data.leftCp1Y, data.leftCp2X, data.leftCp2Y, data.tipX, data.tipY);
        ctx.bezierCurveTo(data.rightCp1X, data.rightCp1Y, data.rightCp2X, data.rightCp2Y, data.rightBaseX, data.baseY);
        ctx.closePath();
        ctx.fill();
        
        return { 
            tipX: data.tipX, tipY: data.tipY, height: data.height, bend: data.bend, 
            leftBaseX: data.leftBaseX, rightBaseX: data.rightBaseX, baseY: data.baseY,
            halfBase: data.halfBase, currentHeight: data.height
        };
    }

    function drawThinBranch(startX, startY, p, params) {
        const {
            length,
            baseBend,
            baseThickness,
            color,
            startProgress
        } = params;

        const relativeP = Math.max(0, (p - startProgress) / (1 - startProgress));
        if (relativeP <= 0) return;

        const pe = easeOutCubic(relativeP);
        const currentLength = length * pe;
        
        const bend = computeBendSecondary(pe, baseBend, baseThickness * 10);
        
        const angle = bend * 0.015;
        const endX = startX + Math.sin(angle) * currentLength;
        const endY = startY - Math.cos(angle) * currentLength;

        const THICKNESS_MULTIPLIER = 5.0;
        const effectiveBaseThickness = baseThickness * THICKNESS_MULTIPLIER;
        const hwStart = effectiveBaseThickness * 0.5;
        const lengthFactor = params.length || length;
        const taperRatio = Math.max(0.03, 0.45 - lengthFactor * 0.002);
        const hwEnd = Math.max(0.6, hwStart * taperRatio);

        const cp1X = startX + Math.sin(angle * 0.4) * currentLength * 0.3;
        const cp1Y = startY - Math.cos(angle * 0.4) * currentLength * 0.3;
        const cp2X = startX + Math.sin(angle * 0.8) * currentLength * 0.7;
        const cp2Y = startY - Math.cos(angle * 0.8) * currentLength * 0.7;

        const nx = Math.cos(angle);
        const ny = Math.sin(angle);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(startX + nx * hwStart, startY + ny * hwStart);
        ctx.bezierCurveTo(
            cp1X + nx * hwStart * 0.7, cp1Y + ny * hwStart * 0.4,
            cp2X + nx * hwStart * 0.25, cp2Y + ny * hwStart * 0.12,
            endX + nx * hwEnd, endY + ny * hwEnd
        );
        ctx.lineTo(endX - nx * hwEnd, endY - ny * hwEnd);
        ctx.bezierCurveTo(
            cp2X - nx * hwStart * 0.25, cp2Y - ny * hwStart * 0.12,
            cp1X - nx * hwStart * 0.7, cp1Y - ny * hwStart * 0.4,
            startX - nx * hwStart, startY - ny * hwStart
        );
        ctx.closePath();
        ctx.fill();

        if (relativeP > 0.95) {
            ctx.beginPath();
            ctx.arc(endX, endY, Math.max(1, hwEnd * 1.2), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        return { endX, endY };
    }

    // --- LÓGICA DE ANIMACIÓN (SEPARADA EN FASES) ---
    
    let animationFrameId = null;

    function generateTree() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        document.getElementById('timers-container').classList.remove('timer-visible');

        const dpr = window.devicePixelRatio || 1;
        const W = treeCanvas.width / dpr;
        const H = treeCanvas.height / dpr;
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // *** LÓGICA DE LAYOUT ***
        const isPortrait = container.clientHeight > container.clientWidth;
        const isLandscapeMobile = (!isPortrait && container.clientWidth < 900); 
        
        let animationMode;
        let centerX_growth; 
        let targetOffsetX; 
        let heightMultiplier; 

        if (isPortrait) {
            animationMode = 'portrait';
            centerX_growth = W / 2; 
            targetOffsetX = 0; 
            heightMultiplier = 0.6; 
            fallingPoint.style.left = '50%';
        } else if (isLandscapeMobile) {
            animationMode = 'desktop';
            centerX_growth = W / 2; 
            targetOffsetX = W * 0.30; 
            heightMultiplier = 0.65;
            fallingPoint.style.left = '50%';
        } else {
            animationMode = 'desktop';
            centerX_growth = W / 2; 
            targetOffsetX = W * 0.25; 
            heightMultiplier = 0.8;
            fallingPoint.style.left = '50%';
        }
        
        // *** CAMBIO AQUÍ: Árbol "escondido" ***
        // Se sube la línea del suelo 4px (en lugar de 2px)
        const groundY = H - 4; 
        
        const smallestDim = Math.min(W, H); 

        const mainParams = {
            baseWidth: Math.max(16, smallestDim * 0.08), 
            topHeight: Math.max(150, smallestDim * heightMultiplier), 
            rightBend: 1,
            leftBend: -25,
            endThicken: 2.5,
            colorFill: '#14b79b',
        };

        const thinBranches = [
            { length: Math.round(smallestDim * 0.2 * heightMultiplier), baseBend: -65, baseThickness: 3.0, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'left', xOffset: -30 },
            { length: Math.round(smallestDim * 0.18 * heightMultiplier), baseBend: -35, baseThickness: 2.5, color: '#14b79b', startProgress: 0.30, heightProgress: 0.30, side: 'left', xOffset: -25 },
            { length: Math.round(smallestDim * 0.19 * heightMultiplier), baseBend: 20, baseThickness: 2.7, color: '#14b79b', startProgress: 0.25, heightProgress: 0.33, side: 'right', xOffset: -5 },
            { length: Math.round(smallestDim * 0.17 * heightMultiplier), baseBend: 40, baseThickness: 2.3, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'right', xOffset: -10 }
        ];

        const thinState = thinBranches.map(() => ({ started: false, startX: null, startY: null }));
        const treeSecondsDuration = 3.0;
        let treeStart = null;

        let timersStarted = false;

        const hearts = [];
        const heartColors = ['#e63946', '#f4a261', '#e9c46a', '#f78cbf', '#f25287', '#ffccd5', '#ef476f', '#ffd166'];
        const maxHearts = 3000;
        const heartMinSize = 5;
        const heartMaxSize = 15;

        const finalBranchData = computeMainBranchShape(centerX_growth, groundY, 1, mainParams);
        
        const hRadius = mainParams.topHeight * 0.5; 
        const wRadius = (W / 2) * 0.9; 
        const finalHeartRadius = Math.min(hRadius, wRadius); 

        const finalHeartCenterX = centerX_growth + finalBranchData.bend * 0.7 + 20;
        const finalHeartCenterY = groundY - (mainParams.topHeight * 0.5) - (finalHeartRadius * 0.2); 

        for (let i = 0; i < maxHearts; i++) {
            const targetPos = getRandomPointInHeart(finalHeartCenterX, finalHeartCenterY, finalHeartRadius);
            hearts.push({
                x: targetPos.x,
                y: targetPos.y,
                size: heartMinSize + Math.random() * (heartMaxSize - heartMinSize),
                color: heartColors[Math.floor(Math.random() * heartColors.length)],
                spawnTime: Math.random() * 0.8 
            });
        }
        
        // Dibuja la línea en la posición Y correcta
        function drawGround() {
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(W, groundY);
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2; // La línea ocupa 2px (de H-4 a H-2)
            ctx.stroke();
        }

        // --- FASE 1: Animación del ÁRBOL ---
        function treeStep(ts) {
            if (!treeStart) treeStart = ts;
            const elapsed = (ts - treeStart) / 1000;
            let rawP = Math.min(1, elapsed / treeSecondsDuration);
            const easedP = easeOutCubic(rawP);

            ctx.clearRect(0, 0, W, H);
            drawGround(); 
 
            drawMainBranch(centerX_growth, groundY, easedP, mainParams);

            for (let i = 0; i < thinBranches.length; i++) {
                const branch = thinBranches[i];
                const state = thinState[i];

                if (rawP >= branch.startProgress) {
                    if (!state.started) {
                        const startPoint = getPointOnMainBranch(centerX_growth, groundY, branch.heightProgress, branch.side, mainParams);
                        const xOff = branch.xOffset || 0;
                        if (branch.side === 'right') {
                            state.startX = startPoint.x + xOff;
                            state.startY = startPoint.y;
                        } else {
                            state.startX = startPoint.x + (startPoint.tx * xOff);
                            state.startY = startPoint.y + (startPoint.ty * xOff);
                        }
                        state.started = true;
                    }
                    drawThinBranch(state.startX, state.startY, rawP, branch);
                }
            }
            
            if (rawP < 1) {
                animationFrameId = requestAnimationFrame(treeStep);
            } else {
                animationFrameId = requestAnimationFrame(heartStep);
            }
        }

        // --- FASE 2: Animación de CORAZONES ---
        const heartSecondsDuration = 2.0; 
        let heartStart = null;

        function heartStep(ts) {
            if (!heartStart) heartStart = ts;
            const elapsed = (ts - heartStart) / 1000;
            let rawP = Math.min(1, elapsed / heartSecondsDuration); 
            
            ctx.clearRect(0, 0, W, H);
            drawGround();

            drawMainBranch(centerX_growth, groundY, 1, mainParams);
            for (let i = 0; i < thinBranches.length; i++) {
                if (thinState[i].started) {
                    drawThinBranch(thinState[i].startX, thinState[i].startY, 1, thinBranches[i]);
                }
            }

            hearts.forEach(heart => {
                const heartAge = rawP - heart.spawnTime; 
                const growDuration = 0.6; 
                const heartProgress = Math.min(1, Math.max(0, heartAge) / growDuration);
                if (heartProgress > 0) {
                    const currentSize = heart.size * easeOutCubic(heartProgress);
                    drawHeart(heart.x, heart.y, currentSize, heart.color);
                }
            });

            if (rawP < 1) {
                animationFrameId = requestAnimationFrame(heartStep);
            } else {
                if (animationMode === 'portrait') {
                    if (!timersStarted) {
                        timersStarted = true;
                        startTimers(); 
                    }
                } else {
                    animationFrameId = requestAnimationFrame(moveStep);
                }
            }
        }
        
        // --- FASE 3: Animación de MOVIMIENTO (Solo Desktop/Horizontal) ---
        const moveSecondsDuration = 1.5; 
        let moveStart = null;

        function moveStep(ts) {
            if (!moveStart) moveStart = ts;
            const elapsed = (ts - moveStart) / 1000;
            let rawP = Math.min(1, elapsed / moveSecondsDuration);
            const easedP = easeInOutCubic(rawP); 
            const currentOffsetX = targetOffsetX * easedP;

            ctx.clearRect(0, 0, W, H);
            drawGround();
            
            ctx.save();
            ctx.translate(currentOffsetX, 0);

            drawMainBranch(centerX_growth, groundY, 1, mainParams); 
            for (let i = 0; i < thinBranches.length; i++) { 
                drawThinBranch(thinState[i].startX, thinState[i].startY, 1, thinBranches[i]);
            }
            hearts.forEach(heart => { 
                drawHeart(heart.x, heart.y, heart.size, heart.color);
            });

            ctx.restore();

            if (rawP < 1) {
                animationFrameId = requestAnimationFrame(moveStep);
            } else {
                if (!timersStarted) {
                    timersStarted = true;
                    startTimers(); 
                }
            }
        }
        
        // --- INICIAR LA FASE 1 ---
        animationFrameId = requestAnimationFrame(treeStep);
    }
});
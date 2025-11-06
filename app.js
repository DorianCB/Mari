// app.js - CÓDIGO FINAL (Corazón más bajo y más a la derecha)
document.addEventListener('DOMContentLoaded', () => {
    const fallingPoint = document.getElementById('falling-point');
    const treeCanvas = document.getElementById('treeCanvas');
    const ctx = treeCanvas.getContext('2d');
    const container = document.getElementById('container');

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const cssW = container.clientWidth;
        const cssH = container.clientHeight;
        treeCanvas.style.width = cssW + 'px';
        treeCanvas.style.height = cssH + 'px';
        treeCanvas.width = Math.round(cssW * dpr);
        treeCanvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    fallingPoint.addEventListener('animationend', () => {
        fallingPoint.style.display = 'none';
        generateTree();
    });

    // --- FUNCIONES PARA CORAZONES ---

    /**
     * Dibuja un corazón centrado en (x, y).
     */
    function drawHeart(x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const s = size * 0.1; // Factor de escala
        ctx.moveTo(x, y - 3 * s);
        ctx.bezierCurveTo(x - 5 * s, y - 10 * s, x - 12 * s, y - 5 * s, x, y + 8 * s);
        ctx.bezierCurveTo(x + 12 * s, y - 5 * s, x + 5 * s, y - 10 * s, x, y - 3 * s);
        ctx.fill();
    }

    /**
     * Obtiene un punto aleatorio dentro de una forma de corazón (usando rejection sampling).
     * AJUSTES CRÍTICOS PARA FORMA, POSICIÓN E INVERSIÓN.
     */
    function getRandomPointInHeart(cx, cy, radius) {
        while (true) {
            const x = (Math.random() - 0.5) * 2.8 * radius; 
            const y = (Math.random() - 0.5) * 2.5 * radius; 

            // Ecuación matemática de un corazón (AFINADA e INVERTIDA)
            const nx = x / radius * 1.2; 
            const ny = -(y / radius) * 1.5 + 0.3; 

            const check = Math.pow(nx, 2) + Math.pow(ny - Math.sqrt(Math.abs(nx)), 2);

            if (check <= 1.0) { 
                return { x: cx + x, y: cy + y };
            }
        }
    }

    // --- FIN DE FUNCIONES PARA CORAZONES ---


    // funciones de easing (suavizado)
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // computeCompositeBend para rama principal
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

    // computeBendSecondary para ramas delgadas (curva más simple)
    function computeBendSecondary(p, baseBend, variation) {
        let bend = baseBend;
        return bend;
    }

    // Evaluador cúbico Bezier
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

    // Derivada de la cúbica Bezier
    function cubicDerivative(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const ax = 3 * (u * u * (p1.x - p0.x) + 2 * u * t * (p2.x - p1.x) + t * t * (p3.x - p2.x));
        const ay = 3 * (u * u * (p1.y - p0.y) + 2 * u * t * (p2.y - p1.y) + t * t * (p3.y - p2.y));
        return { x: ax, y: ay };
    }

    // computeMainBranchShape - Lógica de forma original
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

    // Rama principal (gruesa) - Lógica de forma original
    function drawMainBranch(centerX, groundY, p, params) {
        const { colorFill } = params;
            
        // Esta función ahora usa computeMainBranchShape para obtener los datos
        const data = computeMainBranchShape(centerX, groundY, p, params);

        // forma rellena
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

    // Rama delgada secundaria con taper (de gruesa a delgada)
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

    // --- LÓGICA DE ANIMACIÓN ---
    function generateTree() {
        const W = container.clientWidth;
        const H = container.clientHeight;
        const centerX = W / 2;
        const groundY = H + 2;

        // Parámetros rama principal
        const mainParams = {
            baseWidth: Math.max(16, H * 0.07),
            topHeight: Math.max(350, H * 0.95),
            rightBend: 1,
            leftBend: -25,
            endThicken: 2.5,
            colorFill: '#14b79b',
            colorAccent: '#14b79b',
            colorHighlight: '#14b79b'
        };

        // Array de ramas delgadas (AHORA DESCOMENTADAS)
        const thinBranches = [
            { length: Math.round(150 * 1.75), baseBend: -45, baseThickness: 3.5 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'left', xOffset: -30 },
            { length: Math.round(125 * 1.75), baseBend: -35, baseThickness: 3.0 * 1.5, color: '#14b79b', startProgress: 0.30, heightProgress: 0.30, side: 'left', xOffset: -25 },
            { length: Math.round(120 * 1.75), baseBend: 20, baseThickness: 3.2 * 1.5, color: '#14b79b', startProgress: 0.25, heightProgress: 0.33, side: 'right', xOffset: -5 },
            { length: Math.round(110 * 1.75), baseBend: 40, baseThickness: 2.8 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'right', xOffset: -10 }
        ];

        // Estado de anclaje
        const thinState = thinBranches.map(() => ({ started: false, startX: null, startY: null }));

        // Variables de animación
        const secondsDuration = 3.0;
        let start = null;
        let mainBranchData = null;

        // --- VARIABLES PARA CORAZONES ---
        const hearts = [];
        const heartColors = ['#e63946', '#f4a261', '#e9c46a', '#f78cbf', '#f25287', '#ffccd5', '#ef476f', '#ffd166'];
        const heartGenerationStart = 0.1;
        const maxHearts = 1500;
        const heartMinSize = 5;
        const heartMaxSize = 15;

        // Calcular la posición y tamaño FINAL del corazón UNA SOLA VEZ
        const finalBranchData = computeMainBranchShape(centerX, groundY, 1, mainParams);
        
        const finalHeartRadius = mainParams.topHeight * 0.45; 
        // AJUSTADO para mover MÁS a la derecha
        const finalHeartCenterX = centerX + finalBranchData.bend * 0.7 + 20; // Ajustado de +10 a +20
        // AJUSTADO para BAJAR MÁS el corazón
        const finalHeartCenterY = finalBranchData.tipY + finalHeartRadius * 0.7; // Ajustado de +0.55 a +0.7

        // Función de animación
        function step(ts) {
            if (!start) start = ts;
            const elapsed = (ts - start) / 1000;
            let rawP = Math.min(1, elapsed / secondsDuration);
            const easedP = easeOutCubic(rawP);

            ctx.clearRect(0, 0, W, H);
 
            mainBranchData = drawMainBranch(centerX, groundY, easedP, mainParams);

            // RAMAS DELGADAS AHORA VISIBLES
            for (let i = 0; i < thinBranches.length; i++) {
                const branch = thinBranches[i];
                const state = thinState[i];

                if (rawP >= branch.startProgress) {
                    if (!state.started) {
                        const startPoint = getPointOnMainBranch(centerX, groundY, branch.heightProgress, branch.side, mainParams);
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
            
            // --- Lógica de generación y movimiento de CORAZONES ---
            
            if (rawP >= heartGenerationStart && hearts.length < maxHearts) {
                const heartsToGenerate = 100; // Generar 100 por frame
                for (let i = 0; i < heartsToGenerate && hearts.length < maxHearts; i++) {
                    const targetPos = getRandomPointInHeart(finalHeartCenterX, finalHeartCenterY, finalHeartRadius);
                    
                    hearts.push({
                        x: targetPos.x,
                        y: targetPos.y,
                        size: heartMinSize + Math.random() * (heartMaxSize - heartMinSize),
                        color: heartColors[Math.floor(Math.random() * heartColors.length)],
                        spawnTime: rawP + (Math.random() * 0.1)
                    });
                }
            }

            // Animar y dibujar corazones
            hearts.forEach(heart => {
                const heartAge = rawP - heart.spawnTime;
                const growDuration = 0.5;
                const heartProgress = Math.min(1, heartAge / growDuration);
                
                const currentSize = heart.size * easeOutCubic(heartProgress);

                drawHeart(heart.x, heart.y, currentSize, heart.color);
            });

            // --- FIN LÓGICA DE CORAZONES ---

            if (rawP < 1) {
                requestAnimationFrame(step);
            } else {
                // Dibujo final para asegurar estado perfecto
                ctx.clearRect(0, 0, W, H);

                mainBranchData = drawMainBranch(centerX, groundY, 1, mainParams);
                
                // RAMAS DELGADAS VISIBLES EN EL ESTADO FINAL
                for (let i = 0; i < thinBranches.length; i++) {
                    const branch = thinBranches[i];
                    const state = thinState[i];
                    if (!state.started) {
                        const startPoint = getPointOnMainBranch(centerX, groundY, branch.heightProgress, branch.side, mainParams);
                        const xOff = branch.xOffset || 0;
                        if (branch.side === 'right') {
                            state.startX = startPoint.x + xOff;
                            state.startY = startPoint.y;
                        } else {
                            state.startX = startPoint.x + (startPoint.tx * xOff);
                            state.startY = startPoint.y + (startPoint.ty * xOff);
                        }
                    }
                    drawThinBranch(state.startX, state.startY, 1, branch);
                }

                // --- DIBUJO FINAL DE CORAZONES ---
                hearts.forEach(heart => {
                    if (!heart.x) { // Fallback por si acaso
                        const targetPos = getRandomPointInHeart(finalHeartCenterX, finalHeartCenterY, finalHeartRadius);
                        heart.x = targetPos.x;
                        heart.y = targetPos.y;
                        heart.size = heartMinSize + Math.random() * (heartMaxSize - heartMinSize);
                    }
                    drawHeart(heart.x, heart.y, heart.size, heart.color);
                });
            }
        }

        requestAnimationFrame(step);
    }
});
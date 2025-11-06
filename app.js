// app.js - CÓDIGO FINAL (FORMA DE ÁRBOL REVERTIDA) + CORAZONES
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

    // --- NUEVAS FUNCIONES PARA CORAZONES ---

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
     * Esto asegura que el corazón grande se vea "lleno".
     */
    function getRandomPointInHeart(cx, cy, radius) {
        while (true) {
            // Obtiene un punto aleatorio en la caja que contiene al corazón
            const x = (Math.random() - 0.5) * 2 * radius;
            const y = (Math.random() - 0.5) * 2 * radius;

            // Ecuación matemática de un corazón
            // Ajustamos 'nx' y 'ny' para escalar y posicionar el corazón
            const nx = x / radius * 1.2;
            const ny = (y / radius) * 1.2 - 0.3; // Sube el corazón
            
            // (x^2 + (y - sqrt(|x|))^2) <= r
            const check = Math.pow(nx, 2) + Math.pow(ny - Math.sqrt(Math.abs(nx)), 2);

            if (check <= 0.7) { // 0.7 es el radio/densidad
                return { x: cx + x, y: cy + y };
            }
        }
    }

    // --- FIN DE NUEVAS FUNCIONES ---


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

    // computeMainBranchShape
    function computeMainBranchShape(centerX, groundY, p, params) {
        const {
            baseWidth,
            topHeight,
            rightBend,
            leftBend,
            endThicken
        } = params;

        const pe = easeOutCubic(p);

        // REVERTIDO: Esta es la lógica original que te gustaba
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

        // puntos de control
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

    function getPointOnMainBranch(centerX, groundY, heightProgress, side, mainParams, bend, totalHeight) {
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

        // CORREGIDO: Sin 'outward' para que las ramas nazcan pegadas
        const x = pt.x;
        const y = pt.y;

        return { x, y, rawX: pt.x, rawY: pt.y, tx, ty, nx, ny };
    }

    // Rama principal (gruesa)
    function drawMainBranch(centerX, groundY, p, params) {
        const {
            baseWidth, topHeight, rightBend, leftBend, endThicken,
            colorFill, colorAccent, colorHighlight
        } = params;
            
        // REVERTIDO: Esta es la lógica original que te gustaba
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

        // puntos de control
        const leftCp1X = leftBaseX + halfBase * 0.15 + bend * 0.05;
        const leftCp1Y = baseY - height * 0.08 + sagY * 0.1;
        const leftCp2X = centerX - halfBase * 0.25 + bend * 0.15 + (halfBase * 0.15) * (thicknessFactor - 1);
        const leftCp2Y = baseY - height * 0.5 + sagY * 0.4;
        const rightCp1X = centerX + halfBase * 0.25 + bend * 0.05 + sagX * 0.05 + (halfBase * 0.08) * (thicknessFactor - 1);
        const rightCp1Y = baseY - height * 0.48 + sagY * 0.3;
        const rightCp2X = rightBaseX - halfBase * 0.15 + bend * 0.02;
        const rightCp2Y = baseY - height * 0.1 + sagY * 0.05;

        // forma rellena
        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.moveTo(leftBaseX, baseY);
        ctx.bezierCurveTo(leftCp1X, leftCp1Y, leftCp2X, leftCp2Y, tipX, tipY);
        ctx.bezierCurveTo(rightCp1X, rightCp1Y, rightCp2X, rightCp2Y, rightBaseX, baseY);
        ctx.closePath();
        ctx.fill();
        
        // CORREGIDO: Todos los trazos y la base extra se han eliminado 
        // para evitar artefactos visuales en la base.
  
        return { 
            tipX: tipX, tipY: tipY, height: height, bend: bend, 
            leftBaseX: leftBaseX, rightBaseX: rightBaseX, baseY: baseY,
            halfBase: halfBase, currentHeight: height
        };
    }

    // Rama delgada secundaria con taper (de gruesa a delgada)
    function drawThinBranch(startX, startY, p, params) {
        const {
            length,
            baseBend,
            baseThickness,
            color,
            startProgress // <-- Usado para calcular el progreso relativo
        } = params;

        // Progress relativo al inicio de esta rama
        const relativeP = Math.max(0, (p - startProgress) / (1 - startProgress));
        if (relativeP <= 0) return; // No dibujar si aún no es tiempo

        const pe = easeOutCubic(relativeP);
        const currentLength = length * pe;
        
        const bend = computeBendSecondary(pe, baseBend, baseThickness * 10);
        
        const angle = bend * 0.015;
        const endX = startX + Math.sin(angle) * currentLength;
        const endY = startY - Math.cos(angle) * currentLength;

        // Taper:
        const THICKNESS_MULTIPLIER = 5.0; // Grosor
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

        // Construir forma rellena
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

        // Punta redondeada
        if (relativeP > 0.95) {
            ctx.beginPath();
            ctx.arc(endX, endY, Math.max(1, hwEnd * 1.2), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        return { endX, endY };
    }

    // --- LÓGICA DE ANIMACIÓN RESTAURADA ---
    function generateTree() {
        const W = container.clientWidth;
        const H = container.clientHeight;
        const centerX = W / 2;
        const groundY = H + 2; // CORREGIDO: +2 para tapar el borde CSS

        // Parámetros rama principal
        const mainParams = {
            baseWidth: Math.max(16, H * 0.07), // CORREGIDO: Basado en H
            topHeight: Math.max(350, H * 0.95),
            rightBend: 1,
            leftBend: -25,
            endThicken: 2.5, // REVERTIDO: Esta es la forma original que te gustaba
            colorFill: '#14b79b',
            colorAccent: '#14b79b',
            colorHighlight: '#14b79b'
        };

        // Array de ramas delgadas (Valores CORREGIDOS)
        const thinBranches = [
            // Izquierda (xOffset negativo para meterse en el tallo)
            { length: Math.round(150 * 1.75), baseBend: -45, baseThickness: 3.5 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'left', xOffset: -30 },
            { length: Math.round(125 * 1.75), baseBend: -35, baseThickness: 3.0 * 1.5, color: '#14b79b', startProgress: 0.30, heightProgress: 0.30, side: 'left', xOffset: -25 },
            // Derecha (xOffset negativo para esconder la base)
            { length: Math.round(140 * 1.75), baseBend: 80, baseThickness: 3.2 * 1.5, color: '#14b79b', startProgress: 0.25, heightProgress: 0.3, side: 'right', xOffset: 5 },
            { length: Math.round(110 * 1.75), baseBend: 40, baseThickness: 2.8 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'right', xOffset: -10 }
        ];

        // Estado de anclaje
        const thinState = thinBranches.map(() => ({ started: false, startX: null, startY: null }));

        // Variables de animación ÚNICAS
        const secondsDuration = 3.0;
        let start = null;
        let mainBranchData = null;

        // --- NUEVAS VARIABLES PARA CORAZONES ---
        const hearts = [];
        // Colores de las imágenes: Rosas, Rojos, Naranjas, Amarillos
        const heartColors = ['#e63946', '#f4a261', '#e9c46a', '#f78cbf', '#f25287', '#ffccd5', '#ef476f', '#ffd166'];
        const heartGenerationStart = 0.2;  // Empezar a generar corazones al 20%
        const heartFinalShapeStart = 0.8; // Empezar a moverlos al 80%
        const maxHearts = 2000;             // CORREGIDO: MUCHOS corazones
        const heartMinSize = 5;             // Más pequeños para más densidad
        const heartMaxSize = 15;
        // Definir el área del corazón grande final
        let finalHeartRadius = Math.min(W, H) * 0.3;
        let finalHeartCenterX = centerX;
        let finalHeartCenterY = groundY - mainParams.topHeight * 0.7;


        // Función de animación ÚNICA
        function step(ts) {
            if (!start) start = ts;
            const elapsed = (ts - start) / 1000;
            let rawP = Math.min(1, elapsed / secondsDuration);
            const easedP = easeOutCubic(rawP);

            // 1. Limpiar
            ctx.clearRect(0, 0, W, H);
 
            // 2. Dibujar tallo principal animado
            mainBranchData = drawMainBranch(centerX, groundY, easedP, mainParams);

            // 3. Dibujar ramas delgadas
            for (let i = 0; i < thinBranches.length; i++) {
                const branch = thinBranches[i];
                const state = thinState[i];

                if (rawP >= branch.startProgress) {
                    // CORREGIDO: Lógica de anclaje condicional
                    if (!state.started) {
                        const startPoint = getPointOnMainBranch(centerX, groundY, branch.heightProgress, branch.side, mainParams, mainBranchData.bend, mainBranchData.currentHeight);
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
            
            // --- NUEVA LÓGICA DE CORAZONES ---

            // 4. Generar corazones (Fase 1: Aparición)
            const spawnCenterX = centerX + mainBranchData.bend * 0.7;
            const spawnCenterY = mainBranchData.tipY - mainBranchData.currentHeight * 0.1;
            const spawnRadius = mainBranchData.currentHeight * 0.3 + 50;

            // CORREGIDO: Aumentada la tasa de generación
            if (rawP >= heartGenerationStart && hearts.length < maxHearts && Math.random() < 0.7) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * spawnRadius;
                const x = spawnCenterX + Math.cos(angle) * radius;
                const y = spawnCenterY + Math.sin(angle) * radius;
                
                hearts.push({
                    initialX: x,
                    initialY: y,
                    targetX: 0, 
                    targetY: 0, 
                    size: heartMinSize + Math.random() * (heartMaxSize - heartMinSize),
                    color: heartColors[Math.floor(Math.random() * heartColors.length)],
                    delay: Math.random() * (1.0 - heartFinalShapeStart) * 0.5,
                    targetCalculated: false
                });
            }

            // 5. Animar y dibujar corazones
            finalHeartRadius = Math.min(W, H) * 0.3;
            finalHeartCenterX = centerX + mainBranchData.bend * 0.7;
            finalHeartCenterY = mainBranchData.tipY - finalHeartRadius * 0.5;

            hearts.forEach(heart => {
                let currentX = heart.initialX;
                let currentY = heart.initialY;

                if (rawP >= heartFinalShapeStart) {
                    if (!heart.targetCalculated) {
                        const targetPos = getRandomPointInHeart(finalHeartCenterX, finalHeartCenterY, finalHeartRadius);
                        heart.targetX = targetPos.x;
                        heart.targetY = targetPos.y;
                        heart.targetCalculated = true;
                    }

                    const moveStartTime = heartFinalShapeStart + heart.delay;
                    const moveDuration = (1.0 - moveStartTime);
                    const moveProgress = Math.min(1, Math.max(0, (rawP - moveStartTime) / moveDuration));
                    const easedMoveP = easeInOutCubic(moveProgress);

                    currentX = heart.initialX + (heart.targetX - heart.initialX) * easedMoveP;
                    currentY = heart.initialY + (heart.targetY - heart.initialY) * easedMoveP;
                }

                drawHeart(currentX, currentY, heart.size, heart.color);
            });

            // --- FIN LÓGICA DE CORAZONES ---

            // 6. Continuar bucle
            if (rawP < 1) {
                requestAnimationFrame(step);
            } else {
                // Dibujo final para asegurar estado perfecto
                ctx.clearRect(0, 0, W, H);

                mainBranchData = drawMainBranch(centerX, groundY, 1, mainParams);
                for (let i = 0; i < thinBranches.length; i++) {
                    const branch = thinBranches[i];
                    const state = thinState[i];
                    // CORREGIDO: Lógica de anclaje condicional final
                    if (!state.started) {
                        const startPoint = getPointOnMainBranch(centerX, groundY, branch.heightProgress, branch.side, mainParams, mainBranchData.bend, mainBranchData.currentHeight);
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
                finalHeartRadius = Math.min(W, H) * 0.3;
                finalHeartCenterX = centerX + mainBranchData.bend * 0.7;
                finalHeartCenterY = mainBranchData.tipY - finalHeartRadius * 0.5;

                hearts.forEach(heart => {
                    if (!heart.targetCalculated) {
                        const targetPos = getRandomPointInHeart(finalHeartCenterX, finalHeartCenterY, finalHeartRadius);
                        heart.targetX = targetPos.x;
                        heart.targetY = targetPos.y;
                        heart.targetCalculated = true;
                    }
                    drawHeart(heart.targetX, heart.targetY, heart.size, heart.color);
                });
            }
        }

        // Iniciar la animación
        requestAnimationFrame(step);
    }
});
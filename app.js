// app.js - Lógica CONCURRENTE CORREGIDA
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

    // línea del suelo
    function drawGround(W, groundY) {
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(W, groundY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

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
    // CORREGIDO: Devuelve la inclinación base fija, sin animarla.
    function computeBendSecondary(p, baseBend, variation) {
        let bend = baseBend;
        return bend;
    }

    // Función para calcular punto en el borde de la rama principal
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

        const outward = Math.max(2, mainParams.baseWidth * 0.02);
        const x = pt.x + nx * outward;
        const y = pt.y + ny * outward;

        return { x, y, rawX: pt.x, rawY: pt.y, tx, ty, nx, ny };
    }

    // Rama principal (gruesa)
    function drawMainBranch(centerX, groundY, p, params) {
        const {
            baseWidth, topHeight, rightBend, leftBend, endThicken,
            colorFill, colorAccent, colorHighlight
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

        // forma rellena
        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.moveTo(leftBaseX, baseY);
        ctx.bezierCurveTo(leftCp1X, leftCp1Y, leftCp2X, leftCp2Y, tipX, tipY);
        ctx.bezierCurveTo(rightCp1X, rightCp1Y, rightCp2X, rightCp2Y, rightBaseX, baseY);
        ctx.closePath();
        ctx.fill();

        // trazo externo
        ctx.strokeStyle = colorAccent;
        ctx.lineWidth = Math.max(1.2, baseWidth * 0.05 * thicknessFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(rightBaseX - baseWidth * 0.08, baseY - Math.max(2, height * 0.05));
        ctx.bezierCurveTo(
            rightCp1X, rightCp1Y - Math.max(2, height * 0.03),
            rightCp2X, rightCp2Y - Math.max(2, height * 0.03),
            tipX, tipY
        );
        ctx.stroke();

        // brillo interior
        ctx.strokeStyle = colorHighlight;
        ctx.lineWidth = Math.max(1.0, baseWidth * 0.035 * (0.9 + 0.3 * thicknessProgress));
        ctx.lineCap = 'round';
        ctx.beginPath();
        const hiStartX = leftBaseX + baseWidth * 0.12;
        const hiStartY = baseY - Math.max(1, height * 0.04);
        const hiCp1X = leftCp1X + (halfBase * 0.08);
        const hiCp1Y = leftCp1Y - Math.max(1, height * 0.04);
        const hiCp2X = leftCp2X + (halfBase * 0.1);
        const hiCp2Y = leftCp2Y - Math.max(2, height * 0.06);
        ctx.moveTo(hiStartX, hiStartY);
        ctx.bezierCurveTo(hiCp1X, hiCp1Y, hiCp2X, hiCp2Y, tipX, tipY);
        ctx.stroke();

        // base
        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.rect(centerX - halfBase * 0.6, baseY - 4, halfBase * 1.2, 8);
        ctx.fill();

        return { 
            tipX, tipY, height, bend, 
            leftBaseX, rightBaseX, baseY,
            halfBase, currentHeight: height
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
        // ESTA ES LA LÓGICA CLAVE
        const relativeP = Math.max(0, (p - startProgress) / (1 - startProgress));
        if (relativeP <= 0) return; // No dibujar si aún no es tiempo

        const pe = easeOutCubic(relativeP);
        const currentLength = length * pe;
        
        // Curva más orgánica para ramas delgadas
        const bend = computeBendSecondary(pe, baseBend, baseThickness * 10);
        
        // Calcular posición final con curva
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

        // Puntos de control para curva suave
        const cp1X = startX + Math.sin(angle * 0.4) * currentLength * 0.3;
        const cp1Y = startY - Math.cos(angle * 0.4) * currentLength * 0.3;
        const cp2X = startX + Math.sin(angle * 0.8) * currentLength * 0.7;
        const cp2Y = startY - Math.cos(angle * 0.8) * currentLength * 0.7;

        // Normal
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
        const groundY = H;

        // Parámetros rama principal
        const mainParams = {
            baseWidth: Math.max(16, W * 0.07),
            topHeight: Math.max(350, H * 0.95),
            rightBend: 1,
            leftBend: -25,
            endThicken: 2.5,
            colorFill: '#14b79b',
            colorAccent: '#14b79b',
            colorHighlight: '#14b79b'
        };

        // Array de ramas delgadas (con startProgress y heightProgress sincronizados)
        const thinBranches = [
            // Izquierda
            { length: Math.round(150 * 1.75), baseBend: -45, baseThickness: 3.5 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'left', xOffset: -30 },
            { length: Math.round(125 * 1.75), baseBend: -35, baseThickness: 3.0 * 1.5, color: '#14b79b', startProgress: 0.30, heightProgress: 0.30, side: 'left', xOffset: -25 },
            // Derecha
            { length: Math.round(140 * 1.75), baseBend: 20, baseThickness: 3.2 * 1.5, color: '#14b79b', startProgress: 0.25, heightProgress: 0.25, side: 'right', xOffset: 12 },
            { length: Math.round(110 * 1.75), baseBend: 80, baseThickness: 2.8 * 1.5, color: '#14b79b', startProgress: 0.45, heightProgress: 0.45, side: 'right', xOffset: 18 }
        ];

        // Estado de anclaje
        const thinState = thinBranches.map(() => ({ started: false, startX: null, startY: null }));

        // Variables de animación ÚNICAS
        const secondsDuration = 3.0; // Duración total de toda la animación
        let start = null;
        let mainBranchData = null;

        // Función de animación ÚNICA
        function step(ts) {
            if (!start) start = ts;
            const elapsed = (ts - start) / 1000;
            let rawP = Math.min(1, elapsed / secondsDuration); // Progreso global
            const easedP = easeOutCubic(rawP);

            // 1. Limpiar y dibujar suelo
            ctx.clearRect(0, 0, W, H);
            drawGround(W, groundY);
            
            // 2. Dibujar tallo principal animado
            mainBranchData = drawMainBranch(centerX, groundY, easedP, mainParams);

            // 3. Dibujar ramas delgadas (lógica concurrente)
            for (let i = 0; i < thinBranches.length; i++) {
                const branch = thinBranches[i];
                const state = thinState[i];

                // Comprobar si la animación global ha alcanzado el punto de inicio de esta rama
                if (rawP >= branch.startProgress) {
                    
                    if (!state.started) {
                        // Es la primera vez: Calcular y FIJAR el punto de anclaje
                        const startPoint = getPointOnMainBranch(
                            centerX,
                            groundY,
                            branch.heightProgress, // Usar la altura de anclaje
                            branch.side,
                            mainParams,
                            mainBranchData.bend,
                            mainBranchData.currentHeight
                        );
                        
                        const xOff = branch.xOffset || 0;
                        state.startX = startPoint.x + (startPoint.tx * xOff);
                        state.startY = startPoint.y + (startPoint.ty * xOff);
                        state.started = true;
                    }
                    
                    // Dibujar la rama. Pasa el progreso GLOBAL.
                    // drawThinBranch calculará el progreso relativo internamente
                    drawThinBranch(state.startX, state.startY, rawP, branch);
                }
            }

            // 4. Continuar bucle si no ha terminado
            if (rawP < 1) {
                requestAnimationFrame(step);
            } else {
                // Dibujo final para asegurar estado perfecto
                ctx.clearRect(0, 0, W, H);
                drawGround(W, groundY);
                mainBranchData = drawMainBranch(centerX, groundY, 1, mainParams);
                for (let i = 0; i < thinBranches.length; i++) {
                    const branch = thinBranches[i];
                    const state = thinState[i];
                    if (!state.started) { // Por si acaso la animación fue muy rápida
                        const startPoint = getPointOnMainBranch(centerX, groundY, branch.heightProgress, branch.side, mainParams, mainBranchData.bend, mainBranchData.currentHeight);
                        const xOff = branch.xOffset || 0;
                        state.startX = startPoint.x + (startPoint.tx * xOff);
                        state.startY = startPoint.y + (startPoint.ty * xOff);
                    }
                    drawThinBranch(state.startX, state.startY, 1, branch);
                }
            }
        }

        // Iniciar la animación
        requestAnimationFrame(step);
    }
});
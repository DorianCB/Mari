// app.js - curva suave sin golpe a la derecha y gancho/garfio hacia la izquierda
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
        generateSingleBranch();
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

    // computeCompositeBend: SUAVE inicio (muy poca curva a la derecha),
    // luego transición continua a la izquierda, y al final añade un "garfio" (hook)
    // que provoca un giro notable a la izquierda (sin golpe brusco).
    function computeCompositeBend(p, rightBend, leftBend, hookStrength = 0.45, hookStart = 0.65) {
        // p asumido suavizado (0..1)
        // interpolación base entre rightBend pequeño y leftBend con suavizado continuo
        const s = easeInOutCubic(p);
        let base = rightBend * (1 - s) + leftBend * s;

        // añadir efecto de gancho cerca de la punta (después de hookStart)
        if (p > hookStart) {
            const t = (p - hookStart) / (1 - hookStart); // 0..1 across hook region
            // usar curva acelerada para que el gancho aparezca rápido pero suavemente
            const hookFactor = Math.pow(t, 1.6);
            // el gancho empuja más hacia la izquierda (negativo)
            base += -Math.abs(leftBend) * hookStrength * hookFactor;
        }

        return base;
    }

    // Dibuja una sola hoja/rama rellena curva usando Beziers cúbicos y un brillo interior.
    function drawSingleBranch(centerX, groundY, p, params) {
        const {
            baseWidth,
            topHeight,
            rightBend,
            leftBend,
            endThicken,
            colorFill,
            colorAccent,
            colorHighlight
        } = params;

        // progreso visual suavizado para la forma
        const pe = easeOutCubic(p);

        // calcular rampa de grosor: solo aplica en la mitad superior (pe>0.5)
        let thicknessProgress = 0;
        if (pe > 0.5) {
            thicknessProgress = (pe - 0.5) / 0.5; // 0..1 across second half
            thicknessProgress = easeOutCubic(thicknessProgress);
        }
        const thicknessFactor = 1 + (endThicken - 1) * thicknessProgress; // 1..endThicken

        // altura y base
        const height = topHeight * pe;
        // aumentar la influencia de thicknessFactor para que la parte superior/punta se mantenga mucho más gruesa
        const halfBase = (baseWidth * (1 + (thicknessFactor - 1) * 0.6)) / 2;
        // const halfBase = (baseWidth * (1 + (thicknessFactor - 1) * 0.05)) / 2; // slight base adjustment when thickening

        const leftBaseX = centerX - halfBase;
        const rightBaseX = centerX + halfBase;
        const baseY = groundY;

        // calcular curvatura compuesta (suave + gancho)
        const bend = computeCompositeBend(pe, rightBend, leftBend, 1, 1); // stronger hookStrength, earlier hookStart

        // efecto de caída (sag) después del 50% para enfatizar apariencia cayéndose hacia la izquierda (sutil)
        const sagStart = 0.5;
        let sagFactor = 0;
        if (pe > sagStart) {
            const raw = (pe - sagStart) / (1 - sagStart);
            sagFactor = Math.pow(raw, 0.8);
        }
        const sagY = topHeight * 0.06 * sagFactor;
        const sagX = -Math.abs(bend) * 0.35 * sagFactor; // a bit stronger lateral drop

        // coordenadas de la punta (aplicar curvatura y caída)
        const tipX = centerX + bend * pe + sagX;
        const tipY = baseY - height + sagY;

        // puntos de control
        const leftCp1X = leftBaseX + halfBase * 0.10 + bend * 0.02;
        const leftCp1Y = baseY - height * 0.06 + sagY * 0.12;

        const leftCp2X = centerX - halfBase * 0.18 + bend * 0.12 + (halfBase * 0.18) * (thicknessFactor - 1);
        const leftCp2Y = baseY - height * 0.46 + sagY * 0.42;

        const rightCp1X = centerX + halfBase * 0.20 + bend * 0.03 + sagX * 0.03 + (halfBase * 0.06) * (thicknessFactor - 1);
        const rightCp1Y = baseY - height * 0.44 + sagY * 0.28;

        const rightCp2X = rightBaseX - halfBase * 0.10 + bend * 0.01;
        const rightCp2Y = baseY - height * 0.08 + sagY * 0.06;

        // forma rellena
        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.moveTo(leftBaseX, baseY);
        ctx.bezierCurveTo(leftCp1X, leftCp1Y, leftCp2X, leftCp2Y, tipX, tipY);
        ctx.bezierCurveTo(rightCp1X, rightCp1Y, rightCp2X, rightCp2Y, rightBaseX, baseY);
        ctx.closePath();
        ctx.fill();

        // trazo externo de acento (borde externo derecho) - ancho de línea escala con thicknessFactor
        ctx.strokeStyle = colorAccent;
        ctx.lineWidth = Math.max(1.0, baseWidth * 0.045 * thicknessFactor);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(rightBaseX - baseWidth * 0.06, baseY - Math.max(2, height * 0.04));
        ctx.bezierCurveTo(
            rightCp1X,
            rightCp1Y - Math.max(2, height * 0.02),
            rightCp2X,
            rightCp2Y - Math.max(2, height * 0.02),
            tipX,
            tipY
        );
        ctx.stroke();

        // brillo interior
        ctx.strokeStyle = colorHighlight;
        ctx.lineWidth = Math.max(0.8, baseWidth * 0.03 * (0.95 + 0.25 * thicknessProgress));
        ctx.lineCap = 'round';
        ctx.beginPath();
        const hiStartX = leftBaseX + baseWidth * 0.08;
        const hiStartY = baseY - Math.max(1, height * 0.03);
        const hiCp1X = leftCp1X + (halfBase * 0.05);
        const hiCp1Y = leftCp1Y - Math.max(1, height * 0.03);
        const hiCp2X = leftCp2X + (halfBase * 0.06);
        const hiCp2Y = leftCp2Y - Math.max(2, height * 0.05);
        ctx.moveTo(hiStartX, hiStartY);
        ctx.bezierCurveTo(hiCp1X, hiCp1Y, hiCp2X, hiCp2Y, tipX, tipY);
        ctx.stroke();

        // pelito en la punta (línea fina orientada a lo largo de la punta) - mantener sutil
        const angleToBase = Math.atan2(baseY - tipY, tipX - centerX);
        const tipHairLen = Math.min(20, Math.max(8, height * 0.12));
        const hairStartX = tipX - Math.cos(angleToBase) * (tipHairLen * 0.28);
        const hairStartY = tipY + Math.sin(angleToBase) * (tipHairLen * 0.28);

        ctx.save();
        ctx.strokeStyle = colorAccent;
        ctx.lineWidth = Math.max(0.6, baseWidth * 0.02) * 1.1 * thicknessFactor;
        ctx.lineCap = 'round';
        ctx.shadowColor = colorHighlight;
        ctx.shadowBlur = 3 * pe;
        ctx.beginPath();
        ctx.moveTo(hairStartX, hairStartY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();

        // NOTA: sin remate en la punta (sin punto)

        // pequeño rectángulo en la base para apoyar en el suelo (ajustado ligeramente por el grosor)
        ctx.fillStyle = colorFill;
        ctx.beginPath();
        ctx.rect(centerX - halfBase * 0.55, baseY - 3, halfBase * 1.1, 6);
        ctx.fill();
    }

    // Parámetros afinados: eliminar sacudida fuerte a la derecha (rightBend pequeño), curvatura izquierda más fuerte + gancho
    function generateSingleBranch() {
        const W = container.clientWidth;
        const H = container.clientHeight;
        const centerX = W / 2;
        const groundY = H;

        // Tuned parameters: remove strong right jolt (small rightBend), stronger left bend + hook
        const params = {
            // multiplicador aumentado para que la rama sea mucho más ancha en el canvas
            baseWidth: Math.max(14, W * 0.06),
            topHeight: Math.max(320, H * 0.9),
            rightBend: 2,    // curva muy ligera a la derecha al inicio (pequeña, sin sacudida)
            leftBend: -22,   // curva izquierda más fuerte al final
            // endThicken mayor hace que la zona fina en la punta sea menos extrema
            endThicken: 2.2,
            colorFill: '#14b79b',
            colorAccent: '#14b79b',
            colorHighlight: '#14b79b'
        };

        const secondsDuration = 2.2;
        let start = null;

        function step(ts) {
            if (!start) start = ts;
            const elapsed = (ts - start) / 1000;
            let rawP = Math.min(1, elapsed / secondsDuration);
            const easedP = easeOutCubic(rawP);

            ctx.clearRect(0, 0, W, H);
            drawGround(W, groundY);
            drawSingleBranch(centerX, groundY, easedP, params);

            if (rawP < 1) {
                requestAnimationFrame(step);
            } else {
                ctx.clearRect(0, 0, W, H);
                drawGround(W, groundY);
                drawSingleBranch(centerX, groundY, 1, params);
            }
        }

        requestAnimationFrame(step);
    }
});
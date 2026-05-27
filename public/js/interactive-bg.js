/**
 * Interactive canvas background effect.
 */
(function () {
  'use strict';

  const ORBS = [
    { color: [66, 133, 244],  xPct: 0.15, yPct: 0.20, radius: 0.42, speed: 0.00018, phase: 0.0,  parallax: 0.030 },
    { color: [234, 67,  53],  xPct: 0.82, yPct: 0.75, radius: 0.38, speed: 0.00022, phase: 2.1,  parallax: 0.025 },
    { color: [251, 188,  4],  xPct: 0.78, yPct: 0.18, radius: 0.32, speed: 0.00015, phase: 4.3,  parallax: 0.035 },
    { color: [52,  168, 83],  xPct: 0.18, yPct: 0.80, radius: 0.34, speed: 0.00020, phase: 1.2,  parallax: 0.028 },
    { color: [66,  133, 244], xPct: 0.50, yPct: 0.50, radius: 0.28, speed: 0.00013, phase: 3.5,  parallax: 0.018 },
  ];

  const ORB_ALPHA = 0.18;
  const DRIFT_AMOUNT = 0.12;
  const SPRING = 0.06;

  let canvas, ctx;
  let W = 0, H = 0;
  let mouse = { x: 0.5, y: 0.5 };
  let spring = { x: 0.5, y: 0.5 };
  let raf;
  let t = 0;

  function resize () {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function onMouseMove (e) {
    mouse.x = e.clientX / W;
    mouse.y = e.clientY / H;
  }

  function onTouch (e) {
    if (!e.touches.length) return;
    mouse.x = e.touches[0].clientX / W;
    mouse.y = e.touches[0].clientY / H;
  }

  function drawOrb (orb) {
    const driftX = Math.sin(t * orb.speed * 1.0 + orb.phase) * DRIFT_AMOUNT;
    const driftY = Math.cos(t * orb.speed * 0.7 + orb.phase * 1.3) * DRIFT_AMOUNT;

    const px = (spring.x - 0.5) * orb.parallax;
    const py = (spring.y - 0.5) * orb.parallax;

    const cx = (orb.xPct + driftX + px) * W;
    const cy = (orb.yPct + driftY + py) * H;

    const breathe = 1 + 0.08 * Math.sin(t * orb.speed * 2 + orb.phase * 0.5);
    const r = orb.radius * Math.min(W, H) * breathe;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const [red, green, blue] = orb.color;
    grad.addColorStop(0,   `rgba(${red},${green},${blue},${ORB_ALPHA})`);
    grad.addColorStop(0.4, `rgba(${red},${green},${blue},${ORB_ALPHA * 0.55})`);
    grad.addColorStop(1,   `rgba(${red},${green},${blue},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDotGrid () {
    const spacing = 36;
    const dotR    = 0.9;
    const cols = Math.ceil(W / spacing) + 1;
    const rows = Math.ceil(H / spacing) + 1;

    const offsetX = (spring.x - 0.5) * 8;
    const offsetY = (spring.y - 0.5) * 8;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * spacing + offsetX;
        const y = r * spacing + offsetY;
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function tick () {
    t++;

    spring.x += (mouse.x - spring.x) * SPRING;
    spring.y += (mouse.y - spring.y) * SPRING;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    drawDotGrid();

    ctx.globalCompositeOperation = 'screen';
    for (const orb of ORBS) drawOrb(orb);
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(tick);
  }

  function createCursorGlow () {
    const el = document.createElement('div');
    el.id = 'ag-cursor-glow';
    el.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 420px; height: 420px;
      border-radius: 50%;
      background: radial-gradient(circle,
        rgba(66,133,244,0.13) 0%,
        rgba(251,188,4,0.06) 45%,
        transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s ease;
      mix-blend-mode: screen;
      will-change: transform;
    `;
    document.body.appendChild(el);

    let cx = window.innerWidth  / 2;
    let cy = window.innerHeight / 2;
    let tx = cx, ty = cy;

    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });

    (function glowTick () {
      cx += (tx - cx) * 0.10;
      cy += (ty - cy) * 0.10;
      el.style.transform = `translate(${cx - 210}px, ${cy - 210}px)`;
      requestAnimationFrame(glowTick);
    })();
  }

  function init () {
    const oldCanvas = document.querySelector('#tsparticles canvas');
    if (oldCanvas) oldCanvas.remove();
    const tsContainer = document.getElementById('tsparticles');
    if (tsContainer) tsContainer.innerHTML = '';

    const wf = document.querySelector('.wireframe-bg');
    if (wf) wf.remove();

    canvas = document.createElement('canvas');
    canvas.id = 'ag-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: -2;
      pointer-events: none;
      display: block;
    `;
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize',      resize,      { passive: true });
    window.addEventListener('mousemove',   onMouseMove, { passive: true });
    window.addEventListener('touchmove',   onTouch,     { passive: true });

    createCursorGlow();
    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

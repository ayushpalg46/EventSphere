/**
 * antigravity-bg.js
 * Replicates the antigravity.google background:
 *   – Large soft colour orbs (Google Red, Yellow, Blue, Green) that float & morph
 *   – Mouse hover parallax: orbs shift toward the cursor with spring physics
 *   – Fully canvas-based, GPU-accelerated via requestAnimationFrame
 */
(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────────── */
  const ORBS = [
    // Google Blue – top-left area
    { color: [66, 133, 244],  xPct: 0.15, yPct: 0.20, radius: 0.42, speed: 0.00018, phase: 0.0,  parallax: 0.030 },
    // Google Red – bottom-right area
    { color: [234, 67,  53],  xPct: 0.82, yPct: 0.75, radius: 0.38, speed: 0.00022, phase: 2.1,  parallax: 0.025 },
    // Google Yellow – top-right area
    { color: [251, 188,  4],  xPct: 0.78, yPct: 0.18, radius: 0.32, speed: 0.00015, phase: 4.3,  parallax: 0.035 },
    // Google Green – bottom-left area
    { color: [52,  168, 83],  xPct: 0.18, yPct: 0.80, radius: 0.34, speed: 0.00020, phase: 1.2,  parallax: 0.028 },
    // Blue accent – centre-ish
    { color: [66,  133, 244], xPct: 0.50, yPct: 0.50, radius: 0.28, speed: 0.00013, phase: 3.5,  parallax: 0.018 },
  ];

  /* Alpha of each orb radial gradient (0-1) */
  const ORB_ALPHA = 0.18;
  /* How much the orb drifts from its anchor point (fraction of viewport width) */
  const DRIFT_AMOUNT = 0.12;
  /* Spring stiffness for mouse tracking (0 = instant, higher = stiffer / slower) */
  const SPRING = 0.06;

  /* ── State ────────────────────────────────────────────────────────────── */
  let canvas, ctx;
  let W = 0, H = 0;
  let mouse = { x: 0.5, y: 0.5 };          // normalised [0,1]
  let spring = { x: 0.5, y: 0.5 };          // spring-smoothed mouse
  let raf;
  let t = 0;

  /* ── Helpers ─────────────────────────────────────────────────────────── */
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

  /* Draw one softly blurred colour orb */
  function drawOrb (orb) {
    /* Compute the drift offset — a slow sine/cosine Lissajous wander */
    const driftX = Math.sin(t * orb.speed * 1.0 + orb.phase) * DRIFT_AMOUNT;
    const driftY = Math.cos(t * orb.speed * 0.7 + orb.phase * 1.3) * DRIFT_AMOUNT;

    /* Compute parallax offset driven by spring-smoothed mouse */
    const px = (spring.x - 0.5) * orb.parallax;
    const py = (spring.y - 0.5) * orb.parallax;

    /* Final world position */
    const cx = (orb.xPct + driftX + px) * W;
    const cy = (orb.yPct + driftY + py) * H;

    /* Radius oscillates slightly to breathe */
    const breathe = 1 + 0.08 * Math.sin(t * orb.speed * 2 + orb.phase * 0.5);
    const r = orb.radius * Math.min(W, H) * breathe;

    /* Soft radial gradient: opaque core → transparent edge */
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

  /* Draw the fine dot-grid mesh (antigravity.google subtle dot pattern) */
  function drawDotGrid () {
    const spacing = 36;
    const dotR    = 0.9;
    const cols = Math.ceil(W / spacing) + 1;
    const rows = Math.ceil(H / spacing) + 1;

    /* Grid subtly shifts with mouse */
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

  /* Main animation loop */
  function tick () {
    t++;

    /* Advance spring toward mouse */
    spring.x += (mouse.x - spring.x) * SPRING;
    spring.y += (mouse.y - spring.y) * SPRING;

    /* Clear */
    ctx.clearRect(0, 0, W, H);

    /* Fill pure black base */
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    /* Draw faint dot-mesh grid first */
    drawDotGrid();

    /* Draw all orbs on top (additive blending feel via global composite) */
    ctx.globalCompositeOperation = 'screen';
    for (const orb of ORBS) drawOrb(orb);
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(tick);
  }

  /* ── Cursor glow follower ─────────────────────────────────────────────── */
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

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function init () {
    /* Remove the old tsParticles canvas if present */
    const oldCanvas = document.querySelector('#tsparticles canvas');
    if (oldCanvas) oldCanvas.remove();
    const tsContainer = document.getElementById('tsparticles');
    if (tsContainer) tsContainer.innerHTML = '';

    /* Remove wireframe-bg overlay */
    const wf = document.querySelector('.wireframe-bg');
    if (wf) wf.remove();

    /* Create full-screen canvas */
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

  /* Wait for DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

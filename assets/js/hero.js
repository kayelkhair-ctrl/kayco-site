/* ============================================================
   Kay & Co. hero canvas
   Lightweight transparent overlay: clinical blue network graph
   over the static CSS hero surface. No per-frame image redraw,
   no shadowBlur; pre-rendered glow sprites instead.
   ============================================================ */
(function () {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;

  const section = canvas.closest('.hero');
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PRIMARY_BLUE = '#1F6FEB';
  const ACCENT_BLUE = '#0B8FD3';

  let W = 1;
  let H = 1;
  let DPR = 1;
  let particles = [];
  let paths = [];
  let flow = 0;
  let clickWave = 0;
  let visible = true;
  let raf = null;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

  function seeded(n) {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  }

  function makeGlow(color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  const primaryGlow = makeGlow('rgba(31,111,235,0.78)', 48);
  const accentGlow = makeGlow('rgba(11,143,211,0.72)', 48);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 1.25);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pointer.x = pointer.tx = W * 0.62;
    pointer.y = pointer.ty = H * 0.45;
    buildScene();
  }

  function buildScene() {
    const centre = { x: W * 0.62, y: H * 0.45 };
    const nodes = [
      centre,
      { x: W * 0.42, y: H * 0.20 },
      { x: W * 0.74, y: H * 0.18 },
      { x: W * 0.34, y: H * 0.58 },
      { x: W * 0.95, y: H * 0.40 },
      { x: W * 0.66, y: H * 0.84 },
      { x: W * 0.90, y: H * 0.70 },
      { x: W * 0.30, y: H * 0.40 }
    ];

    paths = nodes.slice(1).map((n, i) => ({
      from: nodes[0],
      to: n,
      offset: i / Math.max(1, nodes.length - 1),
      color: i % 3 === 1 ? ACCENT_BLUE : PRIMARY_BLUE
    }));

    const count = Math.round(Math.min(90, Math.max(40, (W * H) / 9000)));
    particles = Array.from({ length: count }, (_, i) => {
      const path = paths[Math.floor(seeded(i * 1.73) * paths.length)];
      const t = seeded(i * 2.91);
      const side = seeded(i * 3.77) - 0.5;
      const x = path.from.x + (path.to.x - path.from.x) * t + side * W * 0.08;
      const y = path.from.y + (path.to.y - path.from.y) * t + side * H * 0.06;
      return {
        x,
        y,
        bx: x,
        by: y,
        vx: 0,
        vy: 0,
        size: 1.1 + seeded(i * 4.23) * 1.7,
        phase: seeded(i * 5.19) * Math.PI * 2,
        color: seeded(i * 6.31) > 0.82 ? ACCENT_BLUE : PRIMARY_BLUE
      };
    });
  }

  function setPointer(evt) {
    const rect = (section || canvas).getBoundingClientRect();
    pointer.tx = evt.clientX - rect.left;
    pointer.ty = evt.clientY - rect.top;
    pointer.active = true;
  }

  const pointerTarget = section || canvas;
  pointerTarget.addEventListener('pointermove', setPointer);
  pointerTarget.addEventListener('pointerenter', setPointer);
  pointerTarget.addEventListener('pointerleave', () => { pointer.active = false; });
  pointerTarget.addEventListener('pointerdown', (evt) => {
    setPointer(evt);
    clickWave = 1;
  });
  window.addEventListener('resize', resize);

  function drawGlow(sprite, x, y, r) {
    const d = r * 2;
    ctx.drawImage(sprite, x - r, y - r, d, d);
  }

  function drawFlow(t) {
    ctx.clearRect(0, 0, W, H);

    flow = (flow + 0.0045) % 1;

    paths.forEach((path, i) => {
      const p = (flow + path.offset) % 1;
      const x = path.from.x + (path.to.x - path.from.x) * p;
      const y = path.from.y + (path.to.y - path.from.y) * p;

      ctx.beginPath();
      ctx.moveTo(path.from.x, path.from.y);
      ctx.lineTo(path.to.x, path.to.y);
      ctx.strokeStyle = i % 3 === 1 ? 'rgba(11,143,211,.16)' : 'rgba(31,111,235,.14)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      drawGlow(path.color === ACCENT_BLUE ? accentGlow : primaryGlow, x, y, 9);
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + Math.sin(t * 0.004 + i) * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = path.color;
      ctx.fill();
    });

    clickWave *= 0.92;
    particles.forEach((p) => {
      const driftX = Math.cos(t * 0.0008 + p.phase) * 8;
      const driftY = Math.sin(t * 0.0007 + p.phase) * 6;
      let tx = p.bx + driftX;
      let ty = p.by + driftY;

      if (pointer.active && !reduceMotion) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const pull = Math.max(0, 1 - dist / 220);
        tx += dx * pull * 0.12;
        ty += dy * pull * 0.12;

        if (clickWave > 0.01) {
          const repel = Math.max(0, 1 - dist / 260) * clickWave * 6;
          p.vx -= (dx / dist) * repel;
          p.vy -= (dy / dist) * repel;
        }
      }

      p.vx += (tx - p.x) * 0.018;
      p.vy += (ty - p.y) * 0.018;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;
    });

    particles.forEach((p) => {
      drawGlow(p.color === ACCENT_BLUE ? accentGlow : primaryGlow, p.x, p.y, p.size * 3.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color === ACCENT_BLUE ? 'rgba(11,143,211,.56)' : 'rgba(31,111,235,.58)';
      ctx.fill();
    });
  }

  function draw(now) {
    pointer.x += (pointer.tx - pointer.x) * 0.09;
    pointer.y += (pointer.ty - pointer.y) * 0.09;
    drawFlow(now || 0);
    if (visible && !reduceMotion) raf = requestAnimationFrame(draw);
  }

  function start() {
    if (raf || reduceMotion) return;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  resize();

  if (reduceMotion) {
    drawFlow(0);
  } else if ('IntersectionObserver' in window && section) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.05 });
    observer.observe(section);
    if (document.visibilityState !== 'hidden') start();
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (visible) {
      start();
    }
  });
})();

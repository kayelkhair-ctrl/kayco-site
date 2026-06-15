/* ============================================================
   Kay & Co. hero canvas
   Draws the generated hero image into canvas and animates the
   image surface itself with cursor, scroll, and data-flow motion.
   ============================================================ */
(function () {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const image = new Image();
  image.decoding = 'async';
  image.src = canvas.dataset.image || '/assets/img/home-hero-ai-search-premium.jpg';

  const LIME = '#C6F500';
  const BLUE = '#2D6CFF';
  const DARK = '#050508';
  const WHITE = '#F6F4EF';

  let W = 1;
  let H = 1;
  let DPR = 1;
  let base = { x: 0, y: 0, w: 1, h: 1 };
  let particles = [];
  let paths = [];
  let flow = 0;
  let scrollEase = 0;
  let clickWave = 0;
  let started = false;

  const pointer = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    active: false
  };

  function seeded(n) {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pointer.x = pointer.tx = W * 0.5;
    pointer.y = pointer.ty = H * 0.5;
    computeCover();
    buildScene();
  }

  function computeCover() {
    if (!image.naturalWidth) return;
    const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight) * 1.025;
    base.w = image.naturalWidth * scale;
    base.h = image.naturalHeight * scale;
    base.x = (W - base.w) * 0.5;
    base.y = (H - base.h) * 0.5;
  }

  function imagePoint(nx, ny) {
    if (!image.naturalWidth) return { x: W * nx, y: H * ny };
    return {
      x: base.x + base.w * nx,
      y: base.y + base.h * ny
    };
  }

  function buildScene() {
    const centre = imagePoint(0.63, 0.43);
    const nodes = [
      centre,
      imagePoint(0.43, 0.18),
      imagePoint(0.72, 0.16),
      imagePoint(0.35, 0.56),
      imagePoint(0.96, 0.39),
      imagePoint(0.66, 0.82),
      imagePoint(0.90, 0.70),
      imagePoint(0.32, 0.38)
    ];

    paths = nodes.slice(1).map((n, i) => ({
      from: nodes[0],
      to: n,
      offset: i / Math.max(1, nodes.length - 1),
      color: i % 3 === 1 ? BLUE : LIME
    }));

    const count = Math.round(Math.min(240, Math.max(120, (W * H) / 3600)));
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
        size: 0.7 + seeded(i * 4.23) * 1.6,
        phase: seeded(i * 5.19) * Math.PI * 2,
        color: seeded(i * 6.31) > 0.82 ? BLUE : LIME
      };
    });
  }

  function setPointer(evt) {
    const rect = canvas.getBoundingClientRect();
    pointer.tx = evt.clientX - rect.left;
    pointer.ty = evt.clientY - rect.top;
    pointer.active = true;
  }

  canvas.addEventListener('pointermove', setPointer);
  canvas.addEventListener('pointerenter', setPointer);
  canvas.addEventListener('pointerleave', () => { pointer.active = false; });
  canvas.addEventListener('pointerdown', (evt) => {
    setPointer(evt);
    clickWave = 1;
  });
  window.addEventListener('resize', resize);

  function scrollAmount() {
    const rect = canvas.getBoundingClientRect();
    const vh = window.innerHeight || H;
    return Math.max(0, Math.min(1, -rect.top / Math.max(1, vh * 0.7)));
  }

  function drawImageSurface(t) {
    if (!image.naturalWidth) {
      ctx.fillStyle = DARK;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    pointer.x += (pointer.tx - pointer.x) * 0.09;
    pointer.y += (pointer.ty - pointer.y) * 0.09;
    const mx = pointer.active ? (pointer.x / W - 0.5) : 0;
    const my = pointer.active ? (pointer.y / H - 0.5) : 0;
    scrollEase += (scrollAmount() - scrollEase) * 0.08;

    const zoom = 1 + scrollEase * 0.035 + (pointer.active ? Math.hypot(mx, my) * 0.012 : 0);
    const dx = base.x - (base.w * (zoom - 1)) * 0.5 - mx * 11;
    const dy = base.y - (base.h * (zoom - 1)) * 0.5 - my * 8 + scrollEase * 10;
    const dw = base.w * zoom;
    const dh = base.h * zoom;

    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, dx, dy, dw, dh);

    const glowX = pointer.active ? pointer.x : W * 0.5;
    const glowY = pointer.active ? pointer.y : H * 0.52;
    const radial = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(W, H) * 0.52);
    radial.addColorStop(0, 'rgba(198,245,0,.10)');
    radial.addColorStop(0.24, 'rgba(45,108,255,.045)');
    radial.addColorStop(1, 'rgba(5,5,8,.34)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    const centre = paths[0] ? paths[0].from : imagePoint(0.63, 0.43);
    const core = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, Math.max(W, H) * 0.22);
    const breath = reduceMotion ? 0.4 : (0.38 + Math.sin(t * 0.0016) * 0.1);
    core.addColorStop(0, `rgba(198,245,0,${breath})`);
    core.addColorStop(0.25, 'rgba(198,245,0,.08)');
    core.addColorStop(1, 'rgba(198,245,0,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFlow(t) {
    flow = (flow + 0.0045) % 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    paths.forEach((path, i) => {
      const p = (flow + path.offset) % 1;
      const x = path.from.x + (path.to.x - path.from.x) * p;
      const y = path.from.y + (path.to.y - path.from.y) * p;

      ctx.beginPath();
      ctx.moveTo(path.from.x, path.from.y);
      ctx.lineTo(path.to.x, path.to.y);
      ctx.strokeStyle = i % 3 === 1 ? 'rgba(45,108,255,.10)' : 'rgba(198,245,0,.12)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 1.8 + Math.sin(t * 0.004 + i) * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = path.color;
      ctx.shadowColor = path.color;
      ctx.shadowBlur = 12;
      ctx.fill();
    });

    clickWave *= 0.92;
    particles.forEach((p) => {
      const driftX = Math.cos(t * 0.0008 + p.phase) * 8;
      const driftY = Math.sin(t * 0.0007 + p.phase) * 6;
      let tx = p.bx + driftX;
      let ty = p.by + driftY + scrollEase * 18;

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

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color === BLUE ? 'rgba(45,108,255,.62)' : 'rgba(198,245,0,.64)';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3.5;
      ctx.fill();
    }

    const centre = paths[0] ? paths[0].from : { x: W * 0.5, y: H * 0.52 };
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, 34 + Math.sin(t * 0.0016) * 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(246,244,239,.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.shadowColor = LIME;
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.restore();
  }

  function draw(now) {
    const t = now || 0;
    drawImageSurface(t);
    if (!reduceMotion) drawFlow(t);
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  function start() {
    if (started) return;
    started = true;
    computeCover();
    buildScene();
    requestAnimationFrame(draw);
  }

  image.addEventListener('load', start);

  resize();
  if (image.complete) start();
  else drawImageSurface(0);
})();

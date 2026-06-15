/* ============================================================
   Kay & Co. hero interaction
   Transparent particle and citation layer over the hero image.
   ============================================================ */
(function () {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIME = '#C6F500';
  const BLUE = '#2D6CFF';
  const WHITE = '#F6F4EF';

  let W = 0;
  let H = 0;
  let DPR = 1;
  let particles = [];
  let anchors = [];
  let pulse = 0;
  let clickWave = 0;

  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const cx = W * 0.5;
    const cy = H * 0.52;
    anchors = [
      { x: cx, y: cy },
      { x: W * 0.28, y: H * 0.24 },
      { x: W * 0.68, y: H * 0.24 },
      { x: W * 0.16, y: H * 0.52 },
      { x: W * 0.84, y: H * 0.52 },
      { x: W * 0.34, y: H * 0.82 },
      { x: W * 0.66, y: H * 0.82 }
    ];

    const count = Math.round(Math.min(520, Math.max(260, (W * H) / 1700)));
    particles = Array.from({ length: count }, (_, i) => {
      const a = rand(i * 8.17) * Math.PI * 2;
      const r = Math.pow(rand(i * 4.41), 0.72);
      const bias = anchors[Math.floor(rand(i * 2.31) * anchors.length)];
      const spreadX = W * (0.16 + rand(i * 1.37) * 0.22);
      const spreadY = H * (0.12 + rand(i * 1.91) * 0.2);
      const baseX = Math.max(14, Math.min(W - 14, bias.x + Math.cos(a) * spreadX * r));
      const baseY = Math.max(14, Math.min(H - 14, bias.y + Math.sin(a) * spreadY * r));
      return {
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        vx: 0,
        vy: 0,
        size: 0.7 + rand(i * 5.77) * 1.7,
        hue: rand(i * 6.19) > 0.84 ? BLUE : LIME,
        phase: rand(i * 9.13) * Math.PI * 2
      };
    });
  }

  function setPointer(evt) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = evt.clientX - rect.left;
    pointer.y = evt.clientY - rect.top;
    pointer.active = true;
  }

  canvas.addEventListener('pointermove', setPointer);
  canvas.addEventListener('pointerenter', setPointer);
  canvas.addEventListener('pointerleave', () => { pointer.active = false; });
  canvas.addEventListener('pointerdown', (evt) => {
    setPointer(evt);
    clickWave = 1;
  });
  window.addEventListener('resize', layout);

  function drawAnchorLines(t) {
    const centre = anchors[0];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    anchors.slice(1).forEach((a, i) => {
      const p = (pulse + i * 0.13) % 1;
      const hx = centre.x + (a.x - centre.x) * p;
      const hy = centre.y + (a.y - centre.y) * p;

      ctx.beginPath();
      ctx.moveTo(centre.x, centre.y);
      ctx.lineTo(a.x, a.y);
      ctx.strokeStyle = 'rgba(198,245,0,.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hx, hy, 2.5 + Math.sin(t * 0.003 + i) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? BLUE : LIME;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.fill();
    });
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const t = now || 0;
    pulse = reduceMotion ? 0.42 : (pulse + 0.0038) % 1;
    clickWave *= 0.92;

    drawAnchorLines(t);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const p of particles) {
      const driftX = Math.cos(t * 0.00045 + p.phase) * 8;
      const driftY = Math.sin(t * 0.00038 + p.phase) * 6;
      let tx = p.baseX + driftX;
      let ty = p.baseY + driftY;

      if (pointer.active && !reduceMotion) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const pull = Math.max(0, 1 - dist / 210);
        tx += dx * pull * 0.22;
        ty += dy * pull * 0.22;

        if (clickWave > 0.01) {
          const repel = Math.max(0, 1 - dist / 260) * clickWave * 10;
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
    }

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 9) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 3600) {
          const alpha = (1 - d2 / 3600) * 0.18;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(198,245,0,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === BLUE ? 'rgba(45,108,255,.82)' : 'rgba(198,245,0,.86)';
      ctx.shadowColor = p.hue;
      ctx.shadowBlur = p.size * 5;
      ctx.fill();
    }

    const centre = anchors[0];
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, 22 + Math.sin(t * 0.002) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(246,244,239,.72)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.shadowColor = LIME;
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.restore();

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  layout();
  requestAnimationFrame(draw);
})();

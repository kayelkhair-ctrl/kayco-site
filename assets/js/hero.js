/* ============================================================
   Kay & Co. — Hero network graph (Canvas 2D)
   A clean data-visualisation: a central "Your Brand" node linked
   to Google, ChatGPT, Perplexity, and Gemini. Orange pulses travel
   out to each engine in sequence, suggesting citations being made.
   Light background, dark nodes, orange pulse lines.
   Loads only where <canvas id="net-canvas"> exists.
   ============================================================ */
(function () {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '#0A0A0A';
  const ORANGE = '#FF5C1A';
  const LINE = '#D8D8D1';
  const MUTED = '#9a9aa0';

  // Engine nodes positioned by angle around the centre (unit circle coords)
  const engines = [
    { label: 'Google',     ax: Math.cos(-Math.PI * 0.75), ay: Math.sin(-Math.PI * 0.75) },
    { label: 'ChatGPT',    ax: Math.cos(-Math.PI * 0.25), ay: Math.sin(-Math.PI * 0.25) },
    { label: 'Perplexity', ax: Math.cos(Math.PI * 0.25),  ay: Math.sin(Math.PI * 0.25) },
    { label: 'Gemini',     ax: Math.cos(Math.PI * 0.75),  ay: Math.sin(Math.PI * 0.75) }
  ];

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  function layout() {
    const rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.34;
    engines.forEach((e) => { e.x = cx + e.ax * R; e.y = cy + e.ay * R; e.glow = 0; });
  }
  layout();
  window.addEventListener('resize', layout);

  // Pulse scheduling: one engine lights up at a time, in sequence
  let active = -1;
  let pulseStart = 0;
  const PULSE_MS = 900;   // travel time
  const GAP_MS = 380;     // pause between pulses
  let phaseStart = performance.now();

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawNode(x, y, label, opts) {
    opts = opts || {};
    ctx.font = `700 ${opts.big ? 15 : 13}px Inter, system-ui, sans-serif`;
    const padX = opts.big ? 18 : 14, padY = opts.big ? 12 : 10;
    const tw = ctx.measureText(label).width;
    const w = tw + padX * 2, h = (opts.big ? 18 : 15) + padY * 2;
    const rx = x - w / 2, ry = y - h / 2;

    // glow ring on pulse arrival
    if (opts.glow > 0.01) {
      ctx.save();
      ctx.shadowColor = ORANGE;
      ctx.shadowBlur = 26 * opts.glow;
      roundRectPath(rx, ry, w, h, h / 2);
      ctx.fillStyle = ORANGE;
      ctx.globalAlpha = 0.0;
      ctx.fill();
      ctx.restore();
      // orange outline flash
      roundRectPath(rx, ry, w, h, h / 2);
      ctx.strokeStyle = ORANGE;
      ctx.globalAlpha = opts.glow;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    roundRectPath(rx, ry, w, h, h / 2);
    ctx.fillStyle = opts.filled ? INK : '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = opts.filled ? INK : LINE;
    ctx.stroke();

    ctx.fillStyle = opts.filled ? '#FFFFFF' : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    return { w, h };
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Sequence state machine
    const elapsed = now - phaseStart;
    if (active === -1) {
      if (elapsed > GAP_MS) { active = 0; pulseStart = now; phaseStart = now; }
    } else {
      const t = (now - pulseStart) / PULSE_MS;
      if (t >= 1) {
        engines[active].glow = 1;
        if (elapsed > PULSE_MS + GAP_MS) { active = (active + 1) % engines.length; pulseStart = now; phaseStart = now; }
      }
    }

    // base connecting lines
    engines.forEach((e) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(e.x, e.y);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // active pulse line + travelling dot
    if (active >= 0 && !reduceMotion) {
      const e = engines[active];
      const t = Math.min(1, (now - pulseStart) / PULSE_MS);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // highlighted portion of the line
      const hx = cx + (e.x - cx) * ease;
      const hy = cy + (e.y - cy) * ease;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // travelling dot with glow
      ctx.save();
      ctx.shadowColor = ORANGE; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = ORANGE; ctx.fill();
      ctx.restore();
    }

    // decay glows
    engines.forEach((e) => { e.glow *= 0.94; });

    // draw engine nodes
    engines.forEach((e) => drawNode(e.x, e.y, e.label, { glow: e.glow }));

    // centre node
    drawNode(cx, cy, 'Your Brand', { filled: true, big: true });

    requestAnimationFrame(draw);
  }

  if (reduceMotion) {
    // static render
    layout();
    ctx.clearRect(0, 0, W, H);
    engines.forEach((e) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e.x, e.y); ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.stroke(); });
    engines.forEach((e) => drawNode(e.x, e.y, e.label, { glow: 0 }));
    drawNode(cx, cy, 'Your Brand', { filled: true, big: true });
  } else {
    // wait a tick so layout/fonts are ready
    requestAnimationFrame(draw);
  }
})();

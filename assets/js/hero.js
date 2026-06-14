/* ============================================================
   Kay & Co., Hero particle field (Three.js)
 , 2000+ particles forming a constellation network
 , React to cursor (drift toward), repel on click
 , Disperse on scroll
   Loads only on pages that include <canvas id="hero-canvas">.
   ============================================================ */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = { blue: new THREE.Color('#2D6CFF'), orange: new THREE.Color('#FF5C1A'), white: new THREE.Color('#aab4ff') };
  const COUNT = window.innerWidth < 768 ? 1400 : 2400;
  const SPREAD = 80;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#050508', 0.0085);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 60;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ---- Particle data ----
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const home = new Float32Array(COUNT * 3);     // rest position
  const velocity = new Float32Array(COUNT * 3); // current velocity

  const tmpColor = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const x = (Math.random() - 0.5) * SPREAD * 2;
    const y = (Math.random() - 0.5) * SPREAD;
    const z = (Math.random() - 0.5) * SPREAD;
    positions[i3] = home[i3] = x;
    positions[i3 + 1] = home[i3 + 1] = y;
    positions[i3 + 2] = home[i3 + 2] = z;

    const t = Math.random();
    if (t > 0.86) tmpColor.copy(COLORS.orange);
    else if (t > 0.5) tmpColor.copy(COLORS.blue);
    else tmpColor.copy(COLORS.white);
    colors[i3] = tmpColor.r; colors[i3 + 1] = tmpColor.g; colors[i3 + 2] = tmpColor.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Round soft sprite for particles
  const sprite = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
  })();

  const mat = new THREE.PointsMaterial({
    size: 1.1, map: sprite, vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Constellation lines (connect nearby particles) ----
  const LINE_SAMPLE = window.innerWidth < 768 ? 220 : 420; // subset for performance
  const MAX_LINES = LINE_SAMPLE * 6;
  const linePositions = new Float32Array(MAX_LINES * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x2D6CFF, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);
  const LINK_DIST = 9;

  // ---- 3D floating text "Kay & Co." ----
  let textMesh = null;
  if (typeof THREE.FontLoader !== 'undefined') {
    try {
      new THREE.FontLoader().load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
        function (font) {
          const tGeo = new THREE.TextGeometry('Kay & Co.', {
            font: font, size: 9, height: 1.4, curveSegments: 8, bevelEnabled: true,
            bevelThickness: 0.3, bevelSize: 0.25, bevelSegments: 3
          });
          tGeo.center();
          const tMat = new THREE.MeshBasicMaterial({ color: 0x223a8f, transparent: true, opacity: 0.16 });
          textMesh = new THREE.Mesh(tGeo, tMat);
          textMesh.position.set(0, 6, -10);
          scene.add(textMesh);
        },
        undefined,
        function () { /* font load failed, particles remain the focus */ }
      );
    } catch (e) { /* noop */ }
  }

  // ---- Interaction state ----
  const pointer = new THREE.Vector3(9999, 9999, 0);
  const mouseNDC = new THREE.Vector2(0, 0);
  const targetMouse = new THREE.Vector2(0, 0);
  let repel = 0;          // spikes to 1 on click, decays
  let scrollDisperse = 0; // 0..1 grows as user scrolls hero away
  const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ray = new THREE.Raycaster();

  function setPointerFromEvent(clientX, clientY) {
    targetMouse.x = (clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }
  window.addEventListener('pointermove', (e) => setPointerFromEvent(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', () => { repel = 1; });
  window.addEventListener('scroll', () => {
    const h = window.innerHeight;
    scrollDisperse = Math.min(1, window.scrollY / h);
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Animation loop ----
  const clock = new THREE.Clock();
  const ATTRACT = 1.6;      // pull toward cursor
  const RETURN = 0.012;     // spring back home
  const DAMP = 0.9;
  let frame = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    frame++;

    // smooth mouse + project onto z=0 plane in world space
    mouseNDC.x += (targetMouse.x - mouseNDC.x) * 0.08;
    mouseNDC.y += (targetMouse.y - mouseNDC.y) * 0.08;
    ray.setFromCamera(mouseNDC, camera);
    ray.ray.intersectPlane(raycastPlane, pointer);

    repel *= 0.92;

    const pos = geo.attributes.position.array;
    if (!reduceMotion) {
      const disperseForce = scrollDisperse * scrollDisperse;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        let dx = pointer.x - pos[i3];
        let dy = pointer.y - pos[i3 + 1];
        let dz = pointer.z - pos[i3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz + 0.001;

        // Cursor influence within radius
        if (distSq < 900) {
          const dist = Math.sqrt(distSq);
          const f = (ATTRACT / distSq) * 6;
          const sign = repel > 0.05 ? -(repel * 9) : 1; // repel on click
          velocity[i3]     += (dx / dist) * f * sign * dt * 60 * 0.016;
          velocity[i3 + 1] += (dy / dist) * f * sign * dt * 60 * 0.016;
          velocity[i3 + 2] += (dz / dist) * f * sign * dt * 60 * 0.016;
        }

        // Spring home
        velocity[i3]     += (home[i3] - pos[i3]) * RETURN;
        velocity[i3 + 1] += (home[i3 + 1] - pos[i3 + 1]) * RETURN;
        velocity[i3 + 2] += (home[i3 + 2] - pos[i3 + 2]) * RETURN;

        // Scroll dispersion, push outward from center
        if (disperseForce > 0.001) {
          velocity[i3]     += pos[i3] * 0.004 * disperseForce;
          velocity[i3 + 1] += pos[i3 + 1] * 0.004 * disperseForce;
          velocity[i3 + 2] += (pos[i3 + 2] - 30) * 0.004 * disperseForce;
        }

        velocity[i3] *= DAMP; velocity[i3 + 1] *= DAMP; velocity[i3 + 2] *= DAMP;
        pos[i3] += velocity[i3]; pos[i3 + 1] += velocity[i3 + 1]; pos[i3 + 2] += velocity[i3 + 2];
      }
      geo.attributes.position.needsUpdate = true;
    }

    // Constellation lines, recompute on a subset every few frames
    if (frame % 2 === 0) {
      let v = 0;
      for (let a = 0; a < LINE_SAMPLE && v < linePositions.length - 6; a++) {
        const ai = a * 3;
        for (let b = a + 1; b < LINE_SAMPLE && v < linePositions.length - 6; b++) {
          const bi = b * 3;
          const dx = pos[ai] - pos[bi], dy = pos[ai + 1] - pos[bi + 1], dz = pos[ai + 2] - pos[bi + 2];
          if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
            linePositions[v++] = pos[ai]; linePositions[v++] = pos[ai + 1]; linePositions[v++] = pos[ai + 2];
            linePositions[v++] = pos[bi]; linePositions[v++] = pos[bi + 1]; linePositions[v++] = pos[bi + 2];
          }
        }
      }
      lineGeo.setDrawRange(0, v / 3);
      lineGeo.attributes.position.needsUpdate = true;
    }
    lineMat.opacity = 0.12 * (1 - scrollDisperse);

    // Gentle global drift + parallax toward mouse
    points.rotation.y += 0.0004 + mouseNDC.x * 0.0002;
    points.rotation.x = mouseNDC.y * 0.05;
    lines.rotation.copy(points.rotation);
    mat.opacity = 0.9 * (1 - scrollDisperse * 0.85);

    if (textMesh) {
      const t = clock.elapsedTime;
      textMesh.position.y = 6 + Math.sin(t * 0.6) * 1.2;
      textMesh.rotation.y = mouseNDC.x * 0.15;
      textMesh.material.opacity = 0.16 * (1 - scrollDisperse);
    }

    camera.position.x += (mouseNDC.x * 6 - camera.position.x) * 0.03;
    camera.position.y += (mouseNDC.y * 4 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();

/* ============================================================
   Kay & Co. — Hero particle field (Three.js)
   Advanced GPU particle system:
   - Custom GLSL shader: per-particle twinkle + depth-based glow
   - Organic flow-field drift layered over a structured lattice
   - Cursor gravity well (attract) + click shockwave (repel)
   - Constellation lines that fade with distance and on scroll
   - Floating 3D "Kay & Co." wordmark, parallax camera
   Loads only on pages that include <canvas id="hero-canvas">.
   ============================================================ */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const PAL = {
    blue:   new THREE.Color('#2D6CFF'),
    blueLt: new THREE.Color('#7aa0ff'),
    orange: new THREE.Color('#FF5C1A'),
    white:  new THREE.Color('#cdd6ff')
  };
  const COUNT = isMobile ? 1600 : 3000;
  const SPREAD_X = 110, SPREAD_Y = 70, SPREAD_Z = 70;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#050508', 0.0072);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 64);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);

  // ---- Particle buffers ----
  const positions = new Float32Array(COUNT * 3);
  const home      = new Float32Array(COUNT * 3);
  const velocity  = new Float32Array(COUNT * 3);
  const aColor    = new Float32Array(COUNT * 3);
  const aScale    = new Float32Array(COUNT);
  const aSeed     = new Float32Array(COUNT);

  const c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    // Distribute in a slightly disc-biased volume for depth
    const x = (Math.random() - 0.5) * SPREAD_X * 2;
    const y = (Math.random() - 0.5) * SPREAD_Y * 2;
    const z = (Math.random() - 0.5) * SPREAD_Z * 2;
    positions[i3] = home[i3] = x;
    positions[i3 + 1] = home[i3 + 1] = y;
    positions[i3 + 2] = home[i3 + 2] = z;

    const t = Math.random();
    if (t > 0.9) c.copy(PAL.orange);
    else if (t > 0.62) c.copy(PAL.blue);
    else if (t > 0.4) c.copy(PAL.blueLt);
    else c.copy(PAL.white);
    aColor[i3] = c.r; aColor[i3 + 1] = c.g; aColor[i3 + 2] = c.b;

    aScale[i] = Math.pow(Math.random(), 2.2) * 2.4 + 0.5; // mostly small, few large
    aSeed[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));

  const uniforms = {
    uTime:    { value: 0 },
    uSize:    { value: isMobile ? 34 : 46 },
    uPixel:   { value: PR },
    uOpacity: { value: 1 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      uniform float uPixel;
      attribute vec3 aColor;
      attribute float aScale;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 6.2831853);
        vTw = tw;
        gl_PointSize = uSize * aScale * (0.6 + 0.4 * tw) * uPixel * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        float glow = pow(core, 2.2);
        float alpha = glow * (0.5 + 0.5 * vTw) * uOpacity;
        // hot core -> coloured halo
        vec3 col = mix(vColor, vec3(1.0), pow(core, 6.0) * 0.6);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Constellation lines (nearest-neighbour subset) ----
  const LINE_SAMPLE = isMobile ? 260 : 520;
  const MAX_SEG = LINE_SAMPLE * 6;
  const linePositions = new Float32Array(MAX_SEG * 2 * 3);
  const lineColors = new Float32Array(MAX_SEG * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);
  const LINK_DIST = 11, LINK_DIST_SQ = LINK_DIST * LINK_DIST;

  // ---- 3D floating wordmark ----
  let textMesh = null;
  if (typeof THREE.FontLoader !== 'undefined') {
    try {
      new THREE.FontLoader().load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
        function (font) {
          const tGeo = new THREE.TextGeometry('Kay & Co.', {
            font: font, size: 10, height: 2, curveSegments: 10,
            bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 4
          });
          tGeo.center();
          const tMat = new THREE.MeshBasicMaterial({ color: 0x21356f, transparent: true, opacity: 0.14, wireframe: false });
          textMesh = new THREE.Mesh(tGeo, tMat);
          textMesh.position.set(0, 4, -14);
          scene.add(textMesh);
        },
        undefined, function () {}
      );
    } catch (e) {}
  }

  // ---- Interaction state ----
  const pointer = new THREE.Vector3(9999, 9999, 0);
  const mouseNDC = new THREE.Vector2(0, 0);
  const targetMouse = new THREE.Vector2(0, 0);
  let shock = 0;          // click shockwave 0..1
  let scrollDisperse = 0;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ray = new THREE.Raycaster();

  function setPointer(x, y) {
    targetMouse.x = (x / window.innerWidth) * 2 - 1;
    targetMouse.y = -(y / window.innerHeight) * 2 + 1;
  }
  window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', () => { shock = 1; });
  window.addEventListener('scroll', () => {
    scrollDisperse = Math.min(1, window.scrollY / window.innerHeight);
  }, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Loop ----
  const clock = new THREE.Clock();
  const RETURN = 0.013, DAMP = 0.88, FLOW = 0.9;
  let frame = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    frame++;
    uniforms.uTime.value = t;

    mouseNDC.x += (targetMouse.x - mouseNDC.x) * 0.07;
    mouseNDC.y += (targetMouse.y - mouseNDC.y) * 0.07;
    ray.setFromCamera(mouseNDC, camera);
    ray.ray.intersectPlane(plane, pointer);
    shock *= 0.9;

    const pos = geo.attributes.position.array;
    if (!reduceMotion) {
      const disperse = scrollDisperse * scrollDisperse;
      const step = dt * 60;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];

        // Organic flow field (cheap pseudo-curl)
        const fx = Math.sin(py * 0.03 + t * 0.25) + Math.cos(pz * 0.025 - t * 0.2);
        const fy = Math.sin(pz * 0.03 - t * 0.22) + Math.cos(px * 0.025 + t * 0.18);
        const fz = Math.sin(px * 0.03 + t * 0.2)  + Math.cos(py * 0.025 - t * 0.24);
        velocity[i3]     += fx * 0.0016 * FLOW * step;
        velocity[i3 + 1] += fy * 0.0016 * FLOW * step;
        velocity[i3 + 2] += fz * 0.0016 * FLOW * step;

        // Cursor gravity well / shockwave
        const dx = pointer.x - px, dy = pointer.y - py, dz = pointer.z - pz;
        const dSq = dx * dx + dy * dy + dz * dz + 0.001;
        if (dSq < 1200) {
          const dist = Math.sqrt(dSq);
          const pull = (9.5 / dSq);
          const sign = shock > 0.04 ? -(shock * 11) : 1;
          velocity[i3]     += (dx / dist) * pull * sign * step * 0.016;
          velocity[i3 + 1] += (dy / dist) * pull * sign * step * 0.016;
          velocity[i3 + 2] += (dz / dist) * pull * sign * step * 0.016;
        }

        // Spring back to lattice home
        velocity[i3]     += (home[i3] - px) * RETURN;
        velocity[i3 + 1] += (home[i3 + 1] - py) * RETURN;
        velocity[i3 + 2] += (home[i3 + 2] - pz) * RETURN;

        // Scroll dispersion (blow outward)
        if (disperse > 0.001) {
          velocity[i3]     += px * 0.005 * disperse;
          velocity[i3 + 1] += py * 0.005 * disperse;
          velocity[i3 + 2] += (pz - 40) * 0.005 * disperse;
        }

        velocity[i3] *= DAMP; velocity[i3 + 1] *= DAMP; velocity[i3 + 2] *= DAMP;
        pos[i3] += velocity[i3]; pos[i3 + 1] += velocity[i3 + 1]; pos[i3 + 2] += velocity[i3 + 2];
      }
      geo.attributes.position.needsUpdate = true;
    }

    // Constellation lines on a subset, every other frame
    if (frame % 2 === 0) {
      let v = 0, cIdx = 0;
      for (let a = 0; a < LINE_SAMPLE && v < linePositions.length - 6; a++) {
        const ai = a * 3;
        for (let b = a + 1; b < LINE_SAMPLE && v < linePositions.length - 6; b++) {
          const bi = b * 3;
          const dx = pos[ai] - pos[bi], dy = pos[ai + 1] - pos[bi + 1], dz = pos[ai + 2] - pos[bi + 2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < LINK_DIST_SQ) {
            const fade = (1 - dSq / LINK_DIST_SQ) * 0.6;
            linePositions[v] = pos[ai]; linePositions[v + 1] = pos[ai + 1]; linePositions[v + 2] = pos[ai + 2];
            linePositions[v + 3] = pos[bi]; linePositions[v + 4] = pos[bi + 1]; linePositions[v + 5] = pos[bi + 2];
            v += 6;
            // colour fades with distance toward blue
            lineColors[cIdx] = 0.18 * fade * 5; lineColors[cIdx + 1] = 0.42 * fade * 5; lineColors[cIdx + 2] = fade * 5;
            lineColors[cIdx + 3] = 0.18 * fade * 5; lineColors[cIdx + 4] = 0.42 * fade * 5; lineColors[cIdx + 5] = fade * 5;
            cIdx += 6;
          }
        }
      }
      lineGeo.setDrawRange(0, v / 3);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;
    }

    // Global motion + scroll fade
    const fade = 1 - scrollDisperse;
    points.rotation.y += 0.0003 + mouseNDC.x * 0.00015;
    points.rotation.x = mouseNDC.y * 0.04;
    lines.rotation.copy(points.rotation);
    uniforms.uOpacity.value = Math.max(0, fade * 1.0);
    lineMat.opacity = 0.5 * fade;

    if (textMesh) {
      textMesh.position.y = 4 + Math.sin(t * 0.6) * 1.4;
      textMesh.rotation.y = mouseNDC.x * 0.18;
      textMesh.rotation.x = mouseNDC.y * 0.06;
      textMesh.material.opacity = 0.14 * fade;
    }

    camera.position.x += (mouseNDC.x * 7 - camera.position.x) * 0.025;
    camera.position.y += (mouseNDC.y * 5 - camera.position.y) * 0.025;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();

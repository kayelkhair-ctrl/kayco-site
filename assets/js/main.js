/* ============================================================
   Kay & Co., Site interactions
   Nav, mobile menu, GSAP scroll reveals, stat counters,
   3D card tilt, FAQ accordion, contact form.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Mark GSAP availability for CSS ---------- */
  const hasGSAP = typeof gsap !== 'undefined';
  document.documentElement.classList.add(hasGSAP ? 'gsap-ready' : 'no-gsap');

  /* ---------- Navigation ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector('.nav__burger');
  const links = document.querySelector('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq__item').forEach((item) => {
    const q = item.querySelector('.faq__q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close siblings within same .faq group
      const group = item.closest('.faq');
      if (group) group.querySelectorAll('.faq__item.open').forEach((s) => { if (s !== item) s.classList.remove('open'); });
      item.classList.toggle('open', !isOpen);
      q.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------- 3D tilt on cards ---------- */
  const tiltCards = document.querySelectorAll('[data-tilt]');
  tiltCards.forEach((card) => {
    const strength = 8;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * strength}deg) rotateX(${(0.5 - py) * strength}deg) translateY(-6px)`;
      card.style.setProperty('--mx', px * 100 + '%');
      card.style.setProperty('--my', py * 100 + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  /* ---------- Stat counters ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals, 10)) || 0;
    const dur = 1600;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }

  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => io.observe(c));
  }

  /* ---------- GSAP scroll reveals ---------- */
  if (hasGSAP && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Generic reveal: any .reveal element (supports stagger groups via data-reveal-group)
    const groups = new Map();
    document.querySelectorAll('.reveal').forEach((el) => {
      const g = el.dataset.revealGroup;
      if (g) {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(el);
      } else {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      }
    });
    groups.forEach((els) => {
      gsap.to(els, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: els[0], start: 'top 82%' }
      });
    });
  } else {
    // Fallback: reveal everything immediately
    document.querySelectorAll('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- Contact form (client-side demo handler) ---------- */
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = form.querySelector('.form__status');
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !emailOk || !message) {
        if (status) { status.className = 'form__status err'; status.textContent = 'Please add your name, a valid email, and a message.'; }
        return;
      }
      // No backend on a static host, open a pre-filled mailto so the message still sends.
      const subject = encodeURIComponent(`New enquiry from ${name}, Kay & Co.`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nCompany: ${data.get('company') || ' - '}\nService: ${data.get('service') || ' - '}\n\n${message}`
      );
      if (status) { status.className = 'form__status ok'; status.textContent = 'Thanks, opening your email client to send this securely.'; }
      window.location.href = `mailto:hello@kayco.net?subject=${subject}&body=${body}`;
      form.reset();
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

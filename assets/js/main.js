/* ============================================================
   Kay & Co. — Site interactions
   Nav, mobile menu, GSAP scroll reveals, letter-split headline,
   card wipe, stat counters, FAQ accordion, contact form.
   ============================================================ */
(function () {
  'use strict';

  const hasGSAP = typeof gsap !== 'undefined';
  document.documentElement.classList.add(hasGSAP ? 'gsap-ready' : 'no-gsap');

  /* ---------- Navigation ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 30); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector('.nav__burger');
  const links = document.querySelector('.nav__links');
  if (burger && links) {
    let lockedScrollY = 0;
    const setMenuOpen = (open) => {
      links.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      if (nav) nav.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));

      if (open) {
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.documentElement.style.scrollBehavior = 'auto';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, lockedScrollY);
        document.documentElement.style.scrollBehavior = '';
      }
    };

    burger.addEventListener('click', () => {
      setMenuOpen(!links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        setMenuOpen(false);
      })
    );
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && links.classList.contains('open')) setMenuOpen(false);
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq__item').forEach((item) => {
    const q = item.querySelector('.faq__q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      const group = item.closest('.faq');
      if (group) group.querySelectorAll('.faq__item.open').forEach((s) => { if (s !== item) s.classList.remove('open'); });
      item.classList.toggle('open', !isOpen);
      q.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------- Letter-split headlines ---------- */
  function splitText(el) {
    const text = el.textContent;
    el.textContent = '';
    const words = text.split(' ');
    const chars = [];
    words.forEach((word, wi) => {
      const wspan = document.createElement('span');
      wspan.className = 'word';
      wspan.style.display = 'inline-block';
      wspan.style.whiteSpace = 'nowrap';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'char';
        c.textContent = ch;
        c.style.display = 'inline-block';
        wspan.appendChild(c);
        chars.push(c);
      }
      el.appendChild(wspan);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return chars;
  }

  const splitTargets = document.querySelectorAll('[data-split]');
  splitTargets.forEach((el) => {
    const chars = splitText(el);
    if (hasGSAP) {
      gsap.set(chars, { yPercent: 110, opacity: 0 });
      gsap.to(chars, {
        yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.022, delay: 0.15
      });
    }
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
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    counters.forEach((c) => io.observe(c));
  }

  /* ---------- GSAP scroll reveals ---------- */
  if (hasGSAP && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Service cards / posts: clean upward wipe
    document.querySelectorAll('.card, .post, .res-item').forEach((el) => {
      gsap.set(el, { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.to(el, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Generic reveals (fade + slide up), with optional stagger groups
    const groups = new Map();
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el.closest('.card, .post, .res-item')) { el.style.opacity = 1; el.style.transform = 'none'; return; }
      const g = el.dataset.revealGroup;
      if (g) {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(el);
      } else {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      }
    });
    groups.forEach((els) => {
      gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: els[0], start: 'top 85%' } });
    });
  } else {
    document.querySelectorAll('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- Contact form ---------- */
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.form__status');
      const submit = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();
      const company = (data.get('company') || '').toString().trim();
      const service = (data.get('service') || '').toString().trim();
      const website = (data.get('website') || '').toString().trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !emailOk || !message) {
        if (status) { status.className = 'form__status err'; status.textContent = 'Please add your name, a valid email, and a message.'; }
        return;
      }
      if (submit) { submit.disabled = true; submit.dataset.originalText = submit.textContent; submit.textContent = 'Sending...'; }
      if (status) { status.className = 'form__status'; status.textContent = 'Sending your message...'; }
      try {
        const endpoint = form.getAttribute('action') || '/api/contact';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, email, company, service, message, website })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) throw new Error(body.error || 'The form could not be sent.');
        if (status) { status.className = 'form__status ok'; status.textContent = 'Thanks, your message has been sent. We will reply within one business day.'; }
        form.reset();
      } catch (err) {
        if (status) { status.className = 'form__status err'; status.textContent = err.message || 'Sorry, something went wrong. Please email hello@kayco.net.'; }
      } finally {
        if (submit) { submit.disabled = false; submit.innerHTML = 'Send message <span class="arrow">&rarr;</span>'; }
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

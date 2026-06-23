/* ============================================================
   Kay & Co. — Site interactions
   Nav, mobile menu, native reveals, stat counters,
   FAQ accordion, contact form.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Navigation ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 30); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const dropdownItems = document.querySelectorAll('.nav__item--dropdown');
  const setDropdownPanelOpen = (menu, open) => {
    if (!menu) return;
    menu.classList.toggle('open', open);
  };
  const closeDropdowns = (except) => {
    dropdownItems.forEach((item) => {
      if (item === except) return;
      item.classList.remove('open');
      const toggle = item.querySelector('.nav__drop-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      const menu = item.querySelector('.nav__dropdown');
      setDropdownPanelOpen(menu, false);
    });
  };

  dropdownItems.forEach((item) => {
    const toggle = item.querySelector('.nav__drop-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = item.classList.contains('open');
      closeDropdowns(item);
      item.classList.toggle('open', !isOpen);
      const menu = item.querySelector('.nav__dropdown');
      setDropdownPanelOpen(menu, !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav__item--dropdown')) closeDropdowns();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDropdowns();
  });

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
        closeDropdowns();
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

  /* ---------- Lightweight scroll reveals ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (revealEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    const groupCounts = new Map();
    revealEls.forEach((el) => {
      const group = el.dataset.revealGroup;
      if (!group) return;
      const index = groupCounts.get(group) || 0;
      groupCounts.set(group, index + 1);
      el.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
    });
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
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

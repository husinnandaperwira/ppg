(() => {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const header = document.querySelector('[data-header]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const toTop = document.querySelector('[data-to-top]');

  const setHeaderHeightVar = () => {
    if (!header) return;
    const h = Math.max(56, Math.round(header.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--header-h', `${h}px`);
  };

  const mobileMq = window.matchMedia?.('(max-width: 768px)');

  const setMenuA11y = (isOpen) => {
    if (!navMenu || !navToggle) return;

    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navToggle.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');

    const onMobile = mobileMq?.matches ?? false;
    if (onMobile) navMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    else navMenu.removeAttribute('aria-hidden');

    const links = Array.from(navMenu.querySelectorAll('a'));
    for (const a of links) {
      if (onMobile && !isOpen) a.setAttribute('tabindex', '-1');
      else a.removeAttribute('tabindex');
    }
  };

  const openMenu = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.add('is-open');
    setMenuA11y(true);

    const firstLink = navMenu.querySelector('a');
    if (firstLink instanceof HTMLElement) {
      requestAnimationFrame(() => firstLink.focus());
    }
  };

  const closeMenu = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove('is-open');
    setMenuA11y(false);
  };

  const syncMenuForViewport = () => {
    if (!navMenu || !navToggle) return;
    const onMobile = mobileMq?.matches ?? false;
    if (!onMobile) {
      navMenu.classList.remove('is-open');
      setMenuA11y(false);
      return;
    }

    setMenuA11y(navMenu.classList.contains('is-open'));
  };

  const toggleMenu = () => {
    if (!navMenu) return;
    const isOpen = navMenu.classList.contains('is-open');
    if (isOpen) closeMenu();
    else openMenu();
  };

  const getHeaderOffset = () => {
    const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
    return Number.isFinite(h) ? h : 72;
  };

  const scrollToHash = (hash) => {
    if (!hash || !hash.startsWith('#')) return;
    const el = document.querySelector(hash);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset() - 12;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const setActiveHeroButton = (activeEl) => {
    if (!(activeEl instanceof Element)) return;
    const group = activeEl.closest('.hero-actions');
    if (!group) return;

    const buttons = Array.from(group.querySelectorAll('a.btn'));
    for (const b of buttons) b.classList.remove('btn-primary');
    activeEl.classList.add('btn-primary');
  };

  const setActiveNavLinkByHash = (hash) => {
    if (!hash || !hash.startsWith('#')) return false;

    const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    for (const a of navLinks) a.classList.remove('is-active');

    const active = navLinks.find((a) => (a.getAttribute('href') || '') === hash);
    if (active) {
      active.classList.add('is-active');
      return true;
    }
    return false;
  };

  const setActiveNavLinkById = (id) => {
    if (!id) return false;
    const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    let changed = false;
    for (const a of navLinks) {
      const match = (a.getAttribute('href') || '') === `#${id}`;
      if (match) {
        if (!a.classList.contains('is-active')) {
          changed = true;
          a.classList.add('is-active');
        }
      } else if (a.classList.contains('is-active')) {
        changed = true;
        a.classList.remove('is-active');
      }
    }
    return changed;
  };

  const initNavLinks = () => {
    const links = Array.from(document.querySelectorAll('a[href^="#"]'));

    for (const a of links) {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') || '';
        if (href === '#' || !href.startsWith('#')) return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        history.pushState(null, '', href);
        setActiveNavLinkByHash(href);
        scrollToHash(href);
        setActiveHeroButton(a);
        closeMenu();
      });
    }
  };

  const initScrollSpy = () => {
    const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    const sections = navLinks
      .map((a) => {
        const href = a.getAttribute('href') || '';
        return href && href.startsWith('#') ? document.querySelector(href) : null;
      })
      .filter(Boolean);

    if (!navLinks.length || !sections.length) return;

    const byId = new Map(
      navLinks.map((a) => [a.getAttribute('href')?.slice(1), a])
    );
    const orderedIds = sections.map((s) => s.id).filter(Boolean);

    let lastActiveId = null;
    const setActive = (id, { force = false } = {}) => {
      if (!id) return;
      if (!force && id === lastActiveId) return;
      lastActiveId = id;

      for (const a of navLinks) a.classList.remove('is-active');
      const link = byId.get(id);
      if (link) link.classList.add('is-active');
    };

    const buildOptions = () => ({
      root: null,
      threshold: [0.05, 0.15, 0.3, 0.5, 0.75],
      rootMargin: `-${Math.round(getHeaderOffset() + 8)}px 0px -42% 0px`,
    });

    const findActiveByScroll = () => {
      const offset = getHeaderOffset() + 16;
      const viewportMid = window.innerHeight * 0.45;
      // Pilih section yang top-nya sudah "masuk viewport" dan paling dekat dengan mid-line header-ish.
      let bestId = null;
      let bestScore = Infinity;

      for (const sec of sections) {
        const rect = sec.getBoundingClientRect();
        if (rect.bottom <= offset) continue; // section sudah lewat sepenuhnya di atas
        // Jarak titik tengah section terhadap mid viewport
        const sectionMid = rect.top + Math.min(180, rect.height / 2);
        const distance = Math.abs(sectionMid - viewportMid);
        // Bonus: jika top section tepat di atas offset -> lebih diutamakan
        const topPenalty = rect.top > offset ? 0 : (offset - rect.top) * 0.5;
        const score = distance + topPenalty;
        if (score < bestScore) {
          bestScore = score;
          bestId = sec.id;
        }
      }

      // Fallback untuk section paling bawah (footer/kontak) jika scroll sudah paling bawah
      if (!bestId && orderedIds.length) {
        const atBottom = (window.innerHeight + Math.round(window.scrollY)) >= (document.documentElement.scrollHeight - 4);
        if (atBottom) bestId = orderedIds[orderedIds.length - 1];
      }

      return bestId;
    };

    let scrollTicking = false;
    const onScrollTick = () => {
      scrollTicking = false;
      const id = findActiveByScroll();
      if (id) setActive(id);
    };

    const onScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      // requestAnimationFrame agar tidak thrashing
      if ('requestAnimationFrame' in window) requestAnimationFrame(onScrollTick);
      else setTimeout(onScrollTick, 16);
    };

    const useObserver = 'IntersectionObserver' in window;
    let observer = null;
    let lastObservedId = null;

    if (useObserver) {
      observer = new IntersectionObserver(
        (entries) => {
          // Prioritaskan: visible + top paling mendekati 0 (paling dekat header)
          const visible = entries.filter((e) => e.isIntersecting);
          if (!visible.length) {
            lastObservedId = null;
            onScroll(); // fallback agar tidak kosong
            return;
          }
          visible.sort((a, b) => {
            const ar = a.boundingClientRect;
            const br = b.boundingClientRect;
            // Section yang top-nya negatif (sudah melewati header) -> urut berdasarkan bottom terkecil
            const aTop = Math.max(0, ar.top);
            const bTop = Math.max(0, br.top);
            if (aTop !== bTop) return aTop - bTop;
            return (b.intersectionRatio || 0) - (a.intersectionRatio || 0);
          });
          const id = visible[0].target?.id;
          if (id) {
            lastObservedId = id;
            setActive(id);
          }
        },
        buildOptions()
      );
      for (const s of sections) observer.observe(s);
    }

    const onResize = () => {
      setHeaderHeightVar();
      if (observer) {
        try {
          observer.disconnect();
        } catch (_) { /* noop */ }
        // Re-observe all dengan opsi baru
        const newOpts = buildOptions();
        observer = new IntersectionObserver(observer.takeRecords ? observer.root : null, newOpts);
        for (const s of sections) observer.observe(s);
      }
      onScroll(); // re-detect setelah dimensi berubah
    };

    // Kombinasi observer + scroll fallback agar 100% reliable pada semua kasus
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('load', onScroll, { once: true });

    // Deteksi awal
    onScroll();
  };

  const initToTop = () => {
    if (!toTop) return;

    const update = () => {
      if (window.scrollY > 600) toTop.classList.add('is-visible');
      else toTop.classList.remove('is-visible');
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    toTop.addEventListener('click', () => scrollToHash('#home'));
  };

  const initFooterYear = () => {
    const el = document.querySelector('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  };

  const initPplCycles = () => {
    const grid = document.querySelector('[data-cycle-grid]');
    if (!grid) return;

    const cycles = [
      {
        label: 'Siklus 1',
        perangkat: 90,
        mengajar: 90,
        catatan: 'Siklus 1 menunjukkan kesiapan awal yang baik. Fokus berikutnya adalah penguatan asesmen formatif dan pengelolaan waktu.',
      },
      {
        label: 'Siklus 2',
        perangkat: 90,
        mengajar: 90,
        catatan: 'Siklus 2 mengalami peningkatan pada pelaksanaan pembelajaran dan keterlibatan siswa.',
      },
      {
        label: 'Siklus 3',
        perangkat: 90,
        mengajar: 90,
        catatan: 'Siklus 3 menunjukkan perkembangan positif dalam refleksi, penyesuaian strategi, dan komunikasi pembelajaran.',
      },
    ];

    grid.innerHTML = cycles
      .map(
        (c) => `
          <article class="cycle">
            <div class="cycle-head">
              <h3 class="cycle-title">Data Evaluasi</h3>
              <span class="cycle-pill">${c.label}</span>
            </div>

            <div class="cycle-kv" aria-label="Nilai">
              <div class="kvbox">
                <div class="kvlabel">Nilai Perangkat</div>
                <div class="kvvalue">${c.perangkat}</div>
              </div>
              <div class="kvbox">
                <div class="kvlabel">Praktik Mengajar</div>
                <div class="kvvalue">${c.mengajar}</div>
              </div>
            </div>

            <div class="cycle-note">
              <div class="cycle-note-title">Catatan Guru Pamong</div>
              <p class="cycle-note-text">${c.catatan}</p>
            </div>
          </article>
        `
      )
      .join('');
  };

  const initDocLinks = () => {
    const links = Array.from(document.querySelectorAll('[data-doc-link]'));

    const setSelected = (activeEl) => {
      if (!(activeEl instanceof Element)) return;
      const scope = activeEl.closest('.docs') || document;
      const all = Array.from(scope.querySelectorAll('[data-doc-link]'));
      for (const el of all) el.classList.remove('is-selected');
      activeEl.classList.add('is-selected');
    };

    const setEmbed = (scope, src, title) => {
      const embedDetails = scope.querySelector('[data-embed]');
      const embedFrame = embedDetails?.querySelector('iframe');
      if (!(embedFrame instanceof HTMLIFrameElement)) return;
      if (!src) return;

      embedFrame.setAttribute('src', src);
      if (title) embedFrame.setAttribute('title', `Embed: ${title}`);

      if (embedDetails instanceof HTMLDetailsElement) {
        embedDetails.open = true;
        const top = embedDetails.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset() - 12;
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    };

    for (const a of links) {
      a.addEventListener('click', (e) => {
        setSelected(a);

        const scope = a.closest('.docs') || document;
        const embedSrc = a.getAttribute('data-embed-src') || '';
        const embedTitle = a.getAttribute('data-embed-title') || a.textContent?.trim() || '';
        const href = a.getAttribute('href');

        if (embedSrc) {
          e.preventDefault();
          setEmbed(scope, embedSrc, embedTitle);
          return;
        }

        if (!href || href === '#') {
          e.preventDefault();
          alert('Ganti href tombol ini dengan link dokumenmu (Drive/PDF).');
          return;
        }
      });
    }
  };

  const initPlaceholderLinks = () => {
    const links = Array.from(document.querySelectorAll('[data-placeholder-link]'));
    for (const a of links) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Ganti link ini dengan file CV (PDF) atau tautan Google Drive.');
      });
    }
  };

  const init = () => {
    setHeaderHeightVar();
    initNavLinks();
    initScrollSpy();
    initToTop();
    initFooterYear();
    initPplCycles();
    initDocLinks();
    initPlaceholderLinks();

    syncMenuForViewport();

    navToggle?.addEventListener('click', toggleMenu);

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!navMenu?.classList.contains('is-open')) return;
      if (target.closest('[data-nav-menu]') || target.closest('[data-nav-toggle]')) return;
      closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!navMenu?.classList.contains('is-open')) return;
      closeMenu();
      navToggle?.focus();
    });

    window.addEventListener('resize', setHeaderHeightVar, { passive: true });

    if (mobileMq) {
      if (typeof mobileMq.addEventListener === 'function') mobileMq.addEventListener('change', syncMenuForViewport);
      else if (typeof mobileMq.addListener === 'function') mobileMq.addListener(syncMenuForViewport);
    }

    const initialHash = location.hash || '#home';
    setActiveNavLinkByHash(initialHash);

    if (location.hash) {
      setTimeout(() => scrollToHash(location.hash), 0);
    }

    window.addEventListener('popstate', () => {
      const hash = location.hash || '#home';
      setActiveNavLinkByHash(hash);
      scrollToHash(hash);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
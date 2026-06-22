/* navbar.js — Mango Poster Shell v2
   Builds sidebar, topbar, toast system, image export.
   All original features preserved. Code cleaned & deduplicated.
   ─────────────────────────────────────────────────────────── */
(function () {
  if (!document.body) { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

  function init() {
    /* ── Path helpers ──────────────────────────────────────── */
    const parts    = window.location.pathname.split('/');
    const inPosters = parts.includes('posters');
    const base     = inPosters
      ? parts.slice(0, parts.indexOf('posters')).join('/') + '/'
      : parts.slice(0, -1).join('/') + '/';
    function r(p) { return new URL(p, window.location.origin + base).pathname; }

    /* ── Navigation link registry ─────────────────────────── */
    const LINKS = [
      { href: r('index.html'),           label: 'Poster 1',     sub: 'Single Price', icon: '🏷️', group: 'posters' },
      { href: r('posters/poster2.html'), label: 'Poster 2',     sub: 'Red Offer',    icon: '🔴', group: 'posters' },
      { href: r('posters/poster3.html'), label: 'Poster 3',     sub: 'Fresh Deal',   icon: '🌿', group: 'posters' },
      { href: r('posters/poster4.html'), label: 'Poster 4',     sub: 'Green Split',  icon: '💚', group: 'posters' },
      { href: r('posters/poster5.html'), label: 'Poster 5',     sub: '2 Per Page',   icon: '📄', group: 'posters' },
      { href: r('posters/poster6.html'), label: 'Poster 6',     sub: 'Multi-Item',   icon: '🗂️', group: 'posters' },
      { href: r('posters/poster7.html'), label: 'Poster 7',     sub: 'Hotfood 1',    icon: '🍔', group: 'hotfood' },
      { href: r('posters/poster8.html'), label: 'Poster 8',     sub: 'Hotfood 2',    icon: '🌶️', group: 'hotfood' },
      { href: r('posters/posterA6.html'),label: 'Poster A6',    sub: 'Roastry Label',icon: '☕', group: 'posters' },
      { href: r('posters/posterA6-2.html'),label: 'Shelf Tag',      sub: 'Shelf Label',  icon: '🏷️', group: 'posters' },
      { href: r('posters/custom.html'),  label: 'Custom Maker', sub: 'Drag & Drop',  icon: '🖼️', group: 'maker'   },
    ];

    const GROUPS = { posters: 'Posters', hotfood: 'Hot Food', maker: 'Maker' };
    const cur    = window.location.pathname.split('/').pop() || 'index.html';
    const active = LINKS.find(l => l.href.split('/').pop() === cur) || LINKS[0];

    /* ── Build sidebar ────────────────────────────────────── */
    const sidebar = document.createElement('div');
    sidebar.id    = 'ds';
    sidebar.innerHTML = `<div class="ds-brand">
      <div><div class="ds-brand-name">Mango Poster</div></div>
    </div><nav class="ds-nav" id="ds-nav"></nav>
    <div class="ds-footer" id="ds-footer"></div>`;

    const nav = sidebar.querySelector('#ds-nav');
    Object.entries(GROUPS).forEach(([key, label]) => {
      const grp = document.createElement('div');
      grp.innerHTML = `<div class="ds-group-lbl">${label}</div>`;
      LINKS.filter(l => l.group === key).forEach(link => {
        const isActive = link.href.split('/').pop() === cur;
        const a        = document.createElement('a');
        a.href      = link.href;
        a.className = 'ds-item' + (isActive ? ' active' : '');
        a.title     = link.label;
        a.innerHTML = `<span class="ds-ic">${link.icon}</span>
          <span>
            <div class="ds-lbl">${link.label}</div>
            <div class="ds-sub">${link.sub}</div>
          </span>`;
        grp.appendChild(a);
      });
      nav.appendChild(grp);
    });

    /* ── Inject manifest link if missing ──────────────────── */
    if (!document.querySelector('link[rel="manifest"]')) {
      const mLink = document.createElement('link');
      mLink.rel  = 'manifest';
      mLink.href = r('manifest.json');
      document.head.appendChild(mLink);
    }

    /* ── Register service worker if missing ───────────────── */
    if ('serviceWorker' in navigator && !navigator._swRegistered) {
      navigator._swRegistered = true;
      navigator.serviceWorker.register(r('sw.js')).catch(() => {});
    }

    /* ── Build sidebar footer / PWA install ───────────────── */
    const footer = sidebar.querySelector('#ds-footer');
    const installBtn = document.createElement('button');
    installBtn.id        = 'btn-install';
    installBtn.className = 'ds-install-btn';
    installBtn.innerHTML = '<span class="ds-ic">📲</span><span><div class="ds-lbl">Install App</div><div class="ds-sub">Add to Home Screen</div></span>';
    installBtn.style.display = 'none';
    footer.appendChild(installBtn);

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in navigator && navigator.standalone) ||
                               window.matchMedia('(display-mode: standalone)').matches;

    let _deferredPrompt = null;

    function hideInstallBtns() {
      installBtn.style.display = 'none';
      const t = document.getElementById('btn-install-top');
      if (t) t.style.display = 'none';
    }

    function triggerInstall() {
      if (_deferredPrompt) {
        _deferredPrompt.prompt();
        _deferredPrompt.userChoice.then(({ outcome }) => {
          if (outcome === 'accepted') hideInstallBtns();
          _deferredPrompt = null;
        });
      } else if (isIOS) {
        if (window.showDashToast) showDashToast('Tap Share then "Add to Home Screen" to install', 'info', 5000);
      } else {
        if (window.showDashToast) showDashToast('Open in Chrome / Edge / Safari to install', 'info', 4000);
      }
    }

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      hideInstallBtns();
      _deferredPrompt = null;
      if (window.showDashToast) showDashToast('App installed!', 'success', 3000);
    });

    installBtn.onclick = triggerInstall;

    const topInstallBtn = document.getElementById('btn-install-top');
    if (topInstallBtn) topInstallBtn.onclick = triggerInstall;

    /* Hide both buttons if already running as installed PWA */
    if (isInStandaloneMode) hideInstallBtns();

    /* ── Build topbar ─────────────────────────────────────── */
    const topbar   = document.createElement('div');
    topbar.id      = 'dt';
    topbar.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <button id="mob-toggle" title="Menu">☰</button>
        <div>
          <div class="dt-title">${active.label} – ${active.sub}</div>
          <div class="dt-sub">Click text to edit · Upload images</div>
        </div>
      </div>
      <div class="dt-right">
        <button class="db db-install" id="btn-install-top">📲 <span class="bl">Install App</span></button>
        <button class="db db-reset" id="btn-reset">↺ <span class="bl">Reset</span></button>
        <button class="db db-png"   id="btn-img">⬇ <span class="bl">Save Image</span></button>
        <button class="db db-print" id="btn-print">🖨 <span class="bl">Print</span></button>
      </div>`;

    /* ── Build overlay & toast container ──────────────────── */
    const overlay = document.createElement('div'); overlay.id = 'dov';
    const toastC  = document.createElement('div'); toastC.id  = 'dtc';

    /* ── Wrap existing page content in #dm ────────────────── */
    const main = document.createElement('div'); main.id = 'dm';
    while (document.body.firstChild) main.appendChild(document.body.firstChild);
    document.body.append(sidebar, topbar, overlay, main, toastC);

    /* ── Mobile sidebar toggle ────────────────────────────── */
    document.getElementById('mob-toggle').onclick = () => {
      sidebar.classList.toggle('m-open');
      overlay.classList.toggle('on');
    };
    overlay.onclick = () => {
      sidebar.classList.remove('m-open');
      overlay.classList.remove('on');
    };

    /* ── Toast helper (exposed globally) ──────────────────── */
    function toast(msg, type, ms) {
      ms = ms || 2800;
      const t = document.createElement('div');
      t.className  = 'dtoast ' + (type || 'info');
      t.textContent = msg;
      toastC.appendChild(t);
      setTimeout(() => {
        t.classList.add('out');
        t.addEventListener('animationend', () => t.remove());
      }, ms);
    }
    window.showDashToast = toast;

    /* ── Topbar button actions ────────────────────────────── */
    document.getElementById('btn-print').onclick = () => {
      toast('🖨 Printing…', 'info', 1800);
      setTimeout(() => window.print(), 300);
    };
    document.getElementById('btn-reset').onclick = () => {
      if (confirm('Reset all fields to defaults?\nThis clears uploaded images and text edits.')) {
        toast('↺ Resetting…', 'warning', 1200);
        setTimeout(() => window.location.reload(), 400);
      }
    };
    const imgBtn = document.getElementById('btn-img');
    imgBtn.onclick = () => {
      imgBtn.innerHTML = '⏳';
      imgBtn.disabled  = true;
      toast('⏳ Preparing image…', 'info', 3000);
      downloadPrintImage(imgBtn);
    };

    /* ── Keyboard shortcuts ───────────────────────────────── */
    document.addEventListener('keydown', e => {
      if (document.activeElement.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); document.getElementById('btn-print').click(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); document.getElementById('btn-reset').click(); }
    });

    /* ── Initial poster fit ───────────────────────────────── */
    fitPoster();
    window.addEventListener('resize', fitPoster);
  }

  /* ── Poster viewport scaling ────────────────────────────── */
  function fitPoster() {
    const pages = document.querySelectorAll('.a4-page,.page-container,.poster,.template,.poster-canvas');
    if (!pages.length) return;
    const sw    = window.innerWidth > 860 ? 220 : 0;
    const avH   = window.innerHeight - 54 - 32;
    const avW   = window.innerWidth  - sw  - 32;
    const scale = Math.min(avH / 1123, avW / 794, 1);
    pages.forEach(pg => {
      pg.style.transformOrigin = 'top center';
      if (scale < 1) {
        pg.style.transform    = `scale(${scale})`;
        pg.style.marginBottom = `${-(1123 * (1 - scale))}px`;
        pg.style.marginTop    = '0';
      } else {
        pg.style.transform    = '';
        pg.style.marginBottom = '';
      }
    });
  }

  /* ── PNG export (lazy-loads html2canvas from CDN) ───────── */
  function downloadPrintImage(btn) {
    const A4W = 2480, A4H = 3508;
    const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

    const loadLib = window.html2canvas
      ? Promise.resolve()
      : new Promise((res, rej) => {
          const s  = document.createElement('script');
          s.src    = CDN;
          s.async  = true;
          s.onload = () => window.html2canvas ? res() : rej(new Error('missing'));
          s.onerror = () => rej(new Error('load failed'));
          document.head.appendChild(s);
        });

    function resetBtn() {
      btn.innerHTML = '⬇ <span class="bl">Save Image</span>';
      btn.disabled  = false;
    }

    loadLib.then(() => {
      const poster         = document.querySelector('.a4-page,.page-container,.poster,.template,.poster-canvas') || document.body;
      const hideSelectors  = ['#ds','#dt','#dov','#dtc','.upload-btn','.controls','.remove-btn','.remove-hint'];
      const hidden         = [];
      const hidVis         = [];

      hideSelectors.forEach(sel =>
        document.querySelectorAll(sel).forEach(el => {
          if (el.style.display !== 'none') { el.style.display = 'none'; hidden.push(el); }
        })
      );
      document.querySelectorAll('input[type="file"]').forEach(el => {
        el.style.visibility = 'hidden'; hidVis.push(el);
      });

      const prevTransform = poster.style.transform;
      const prevMargin    = poster.style.marginBottom;
      poster.style.transform    = 'none';
      poster.style.marginBottom = '';

      // restore() lives here so it closes over poster, prevTransform, prevMargin, hidden, hidVis
      function restore() {
        poster.style.transform    = prevTransform;
        poster.style.marginBottom = prevMargin;
        hidden.forEach(el => el.style.display = '');
        hidVis.forEach(el => el.style.visibility = '');
      }

      const rect  = poster.getBoundingClientRect();
      const scale = A4W / rect.width;

      html2canvas(poster, {
        scale, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        width: rect.width, height: rect.height,
        x: 0, y: 0, scrollX: -rect.left, scrollY: -rect.top,
        windowWidth:  Math.max(document.documentElement.scrollWidth,  rect.right  + 40),
        windowHeight: Math.max(document.documentElement.scrollHeight, rect.bottom + 40),
      }).then(canvas => {
        restore();
        const name = (location.pathname.split('/').pop() || 'poster').replace('.html', '');
        const a    = document.createElement('a');
        a.download = name + '-A4.png';
        a.href     = canvas.toDataURL('image/png');
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        resetBtn();
        if (window.showDashToast) showDashToast('✅ PNG saved! (' + A4W + '×' + canvas.height + ' px)', 'success', 3500);
      }).catch(() => { restore(); resetBtn(); if (window.showDashToast) showDashToast('Export failed — use Print instead', 'error'); });

    }).catch(() => { resetBtn(); if (window.showDashToast) showDashToast('Could not load export library', 'error'); });
  }
})();

/* shared.js — Mango Poster Utilities v2
   All original functions preserved exactly.
   ──────────────────────────────────────── */

/* ── Arabic numeral conversion ────────── */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArabicNumerals(s) {
  return String(s).replace(/[0-9]/g, d => AR_DIGITS[d]);
}

/* ── Single price sync (en → ar) ─────── */
function bindPriceSync(enId, arId) {
  const en = document.getElementById(enId);
  const ar = document.getElementById(arId);
  if (!en || !ar) return;
  const sync = () => { ar.textContent = toArabicNumerals(en.textContent.replace(/\n/g, '').trim()); };
  en.addEventListener('input', sync);
  sync();
}

/* ── Multi-price sync via data-attrs ─── */
function bindAllPriceSyncs() {
  document.querySelectorAll('[data-price-en]').forEach(en => {
    const ar = document.querySelector('[data-price-ar="' + en.dataset.priceEn + '"]');
    if (!ar) return;
    en.addEventListener('input', () => {
      ar.textContent = toArabicNumerals(en.textContent.replace(/\n/g, '').trim());
    });
  });
}

/* ── Auto-translate EN → AR (debounced) ─ */
function bindAutoTranslate(enId, arId, statusRef) {
  const enEl = document.getElementById(enId);
  const arEl = document.getElementById(arId);
  if (!enEl || !arEl) return;
  const statusEl = statusRef
    ? (typeof statusRef === 'string' ? document.getElementById(statusRef) : statusRef)
    : null;
  let timer = null;
  function setStatus(msg, cls) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'translate-status' + (cls ? ' ' + cls : '');
  }
  async function doTranslate() {
    const text = enEl.textContent.trim();
    if (!text) { arEl.textContent = ''; return; }
    setStatus('Translating…', 'loading');
    try {
      const res = await fetch('https://api.mymemory.translated.net/get?q='
        + encodeURIComponent(text) + '&langpair=en|ar');
      const json = await res.json();
      if (json.responseStatus === 200 && json.responseData?.translatedText) {
        arEl.textContent = json.responseData.translatedText;
        setStatus('✓ Translated', 'done');
        setTimeout(() => setStatus(''), 2500);
      } else {
        setStatus('Translation unavailable');
      }
    } catch (e) {
      setStatus('Offline – edit Arabic manually');
    }
  }
  enEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(doTranslate, 900); });
}

/* ── Font auto-shrink (height) ────────── */
function autoShrink(el, maxPx, minPx = 16) {
  el.style.fontSize = maxPx + 'px';
  while (el.scrollHeight > el.offsetHeight + 2 && maxPx > minPx) {
    el.style.fontSize = --maxPx + 'px';
  }
}

/* ── Font auto-shrink (width) ─────────── */
function autoShrinkWidth(el, maxPx, minPx = 16) {
  el.style.fontSize = maxPx + 'px';
  while (el.scrollWidth > el.offsetWidth + 2 && maxPx > minPx) {
    el.style.fontSize = --maxPx + 'px';
  }
}

/* ── Block Enter key on single-line fields */
function blockEnter(sel) {
  document.querySelectorAll(sel).forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  });
}

/* ── Theme switcher ───────────────────── */
function changeTheme(t) {
  document.body.classList.remove('theme-green', 'theme-red', 'theme-dark');
  if (t) document.body.classList.add(t);
}

/* ── Print-safe poster scale reset ────── */
function initPrintFix(fitFn) {
  const poster = document.getElementById('cm-poster');
  if (!poster) return;
  window.addEventListener('beforeprint', () => {
    poster.style.transform = 'none';
    poster.style.scale = '';
  });
  window.addEventListener('afterprint', () => {
    if (typeof fitFn === 'function') fitFn();
  });
}

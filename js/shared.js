/* shared.js — Mango Poster Utilities v3
   Consolidated & deduplicated. Covers:
     - Arabic numeral conversion
     - Price sync (single + multi via data-attrs)
     - Auto-translate EN→AR (MyMemory primary, Google JSONP fallback)
     - Translation typing handler (debounced, with optional autoFit hooks)
     - Country update helper
     - Card lifecycle (add / remove)
     - Background image load / clear
     - Font auto-shrink (height & width)
     - Block Enter key
     - Theme switcher
     - Print-safe scale reset
   ───────────────────────────────────────────────────────────── */

/* ── Arabic numeral conversion ──────────────────────────────── */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArabicNumerals(s) {
  return String(s).replace(/[0-9]/g, d => AR_DIGITS[d]);
}

/* ── Single price sync (en → ar) ───────────────────────────── */
function bindPriceSync(enId, arId) {
  const en = document.getElementById(enId);
  const ar = document.getElementById(arId);
  if (!en || !ar) return;
  const sync = () => { ar.textContent = toArabicNumerals(en.textContent.replace(/\n/g, '').trim()); };
  en.addEventListener('input', sync);
  sync();
}

/* ── Multi-price sync via data-attrs ────────────────────────── */
function bindAllPriceSyncs() {
  document.querySelectorAll('[data-price-en]').forEach(en => {
    const ar = document.querySelector('[data-price-ar="' + en.dataset.priceEn + '"]');
    if (!ar) return;
    en.addEventListener('input', () => {
      ar.textContent = toArabicNumerals(en.textContent.replace(/\n/g, '').trim());
    });
  });
}

/* ── Translation engine (MyMemory + Google JSONP fallback) ──── */
/**
 * fetchTranslation(text, targetLang, callback)
 *
 * Shared by poster9 and posterA6-2. Tries MyMemory first; on failure
 * falls through to the Google Translate JSONP endpoint.
 *
 * @param {string}   text       - Source text to translate.
 * @param {string}   targetLang - BCP-47 language code, e.g. 'ar'.
 * @param {Function} callback   - Node-style (err, result).
 */
async function fetchTranslation(text, targetLang, callback) {
  // ── 1. MyMemory (free, CORS-friendly, no key needed) ──
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const json = await res.json();
      const t = json?.responseData?.translatedText;
      if (t && t !== text) { callback(null, t); return; }
    }
  } catch (_) { /* fall through */ }

  // ── 2. Google Translate JSONP fallback ──
  const cbName = 'gtCb_' + Math.round(Math.random() * 1e9);
  function cleanup() {
    const el = document.getElementById(cbName);
    if (el) el.remove();
    delete window[cbName];
  }
  const timer = setTimeout(() => { cleanup(); callback('Timeout'); }, 8000);
  window[cbName] = function (data) {
    clearTimeout(timer); cleanup();
    try {
      if (data && data[0] && Array.isArray(data[0])) {
        const translated = data[0].filter(s => s?.[0]).map(s => s[0]).join('');
        if (translated) { callback(null, translated); return; }
      }
      callback('Structure unexpected');
    } catch (e) { callback(e); }
  };
  const script = document.createElement('script');
  script.id      = cbName;
  script.onerror = () => { clearTimeout(timer); cleanup(); callback('Network error'); };
  script.src = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}&callback=${cbName}`;
  document.body.appendChild(script);
}

/* ── Debounced translation typing handler ───────────────────── */
/**
 * _sharedHandleTranslationTyping(n, options?)
 *
 * Replaces the per-poster duplicate.  Shared by poster9 and posterA6-2.
 * posterA6-2 needs autoFit calls on the EN and AR elements — pass them
 * via the optional `options` object so the core logic stays in one place.
 *
 * @param {number} n - Card index.
 * @param {object} [opts]
 * @param {Function} [opts.onEnInput]  - Called with enEl after reading source text (e.g. autoFitText).
 * @param {Function} [opts.onArResult] - Called with arEl after successful translation (e.g. autoFitText).
 */
function _sharedHandleTranslationTyping(n, opts) {
  const statusEl  = document.getElementById(`ts${n}`);
  const enEl      = document.getElementById(`nameEn${n}`);
  const targetEl  = document.getElementById(`nameAr${n}`);
  const sourceText = enEl ? enEl.innerText.trim() : '';

  if (opts && opts.onEnInput && enEl) opts.onEnInput(enEl);

  if (typeof translationTimeouts === 'undefined') window.translationTimeouts = {};
  clearTimeout(translationTimeouts[n]);

  if (!sourceText) { if (statusEl) statusEl.textContent = ''; return; }
  if (statusEl) statusEl.textContent = 'Translating... / جاري الترجمة';

  translationTimeouts[n] = setTimeout(() => {
    fetchTranslation(sourceText, 'ar', (err, result) => {
      if (document.getElementById(`nameEn${n}`)?.innerText.trim() !== sourceText) return;
      if (!err && result) {
        if (targetEl) targetEl.innerText = result;
        if (statusEl) statusEl.textContent = '';
        if (opts && opts.onArResult && targetEl) opts.onArResult(targetEl);
      } else {
        if (statusEl) statusEl.textContent = 'Translation failed / فشلت الترجمة';
      }
    });
  }, 900);
}

/* ── Auto-translate EN → AR for simple single-field pairs ───── */
/**
 * bindAutoTranslate(enId, arId, statusRef?)
 *
 * Used by the main shell (index.html) and poster2/3/4 via shared.js.
 * Lighter than fetchTranslation — uses MyMemory only, no JSONP fallback.
 */
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
      const res  = await fetch('https://api.mymemory.translated.net/get?q='
        + encodeURIComponent(text) + '&langpair=en|ar');
      const json = await res.json();
      if (json.responseStatus === 200 && json.responseData?.translatedText) {
        arEl.textContent = json.responseData.translatedText;
        setStatus('✓ Translated', 'done');
        setTimeout(() => setStatus(''), 2500);
      } else {
        setStatus('Translation unavailable');
      }
    } catch (_) {
      setStatus('Offline – edit Arabic manually');
    }
  }
  enEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(doTranslate, 900); });
}

/* ── Country badge updater ──────────────────────────────────── */
/**
 * updateCountry(selectEl, n)
 *
 * Shared between poster9 and posterA6-2 (identical logic).
 * Depends on `countriesData` array being present in the calling page.
 */
function updateCountry(selectEl, n) {
  const country = (window.countriesData || []).find(c => c.code === selectEl.value);
  if (!country) return;
  document.getElementById(`badgeFlag${n}L`).style.backgroundImage = `url('${country.flag}')`;
  document.getElementById(`badgeFlag${n}R`).style.backgroundImage = `url('${country.flag}')`;
  document.getElementById(`madeInEn${n}`).textContent = `Made in ${country.en}`;
  document.getElementById(`madeInAr${n}`).textContent = `صنع في ${country.ar}`;
}

/* ── Card lifecycle ─────────────────────────────────────────── */
/**
 * addCard(country?)
 *
 * Appends a new card to #page. `createCard` must be defined in the
 * calling page (it differs between poster9 and posterA6-2).
 */
function addCard(country) {
  const page = document.getElementById('page');
  if (page && typeof createCard === 'function') page.appendChild(createCard(country));
}

/**
 * removeCard(n)
 *
 * Removes the card wrapper with id `container{n}`.
 */
function removeCard(n) {
  const el = document.getElementById('container' + n);
  if (el) el.remove();
}

/* ── Background image load / clear ─────────────────────────── */
function loadBg(input, cardId) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const c = document.getElementById(cardId);
    if (!c) return;
    c.style.backgroundImage = `url('${ev.target.result}')`;
    c.classList.add('has-bg');
  };
  r.readAsDataURL(f);
}

function clearBg(cardId) {
  const c = document.getElementById(cardId);
  if (!c) return;
  c.style.backgroundImage = '';
  c.classList.remove('has-bg');
}

/* ── Font auto-shrink (height) ──────────────────────────────── */
function autoShrink(el, maxPx, minPx = 16) {
  el.style.fontSize = maxPx + 'px';
  while (el.scrollHeight > el.offsetHeight + 2 && maxPx > minPx) {
    el.style.fontSize = --maxPx + 'px';
  }
}

/* ── Font auto-shrink (width) ───────────────────────────────── */
function autoShrinkWidth(el, maxPx, minPx = 16) {
  el.style.fontSize = maxPx + 'px';
  while (el.scrollWidth > el.offsetWidth + 2 && maxPx > minPx) {
    el.style.fontSize = --maxPx + 'px';
  }
}

/* ── Block Enter key on single-line fields ──────────────────── */
function blockEnter(sel) {
  document.querySelectorAll(sel).forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  });
}

/* ── Theme switcher ─────────────────────────────────────────── */
function changeTheme(t) {
  document.body.classList.remove('theme-green', 'theme-red', 'theme-dark');
  if (t) document.body.classList.add(t);
}

/* ── Print-safe poster scale reset ─────────────────────────── */
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

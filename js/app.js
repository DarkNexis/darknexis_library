/* ============================================================
   Домашние гайды — версии для статичных страниц.

   ВАЖНО: весь контент (главная и оба гайда) лежит прямо в HTML.
   Этот скрипт только добавляет удобства. Если он не загрузился,
   сайт остаётся читаемым: текст, таблицы, PDF-ссылки — всё на месте.

   Функции: тёмная тема, меню гайдов из реестра, поиск, шторка,
   прогресс чтения, активный раздел, чек-листы, «поделиться»,
   копирование ссылки на раздел, кнопка «наверх», горячие клавиши,
   переходы «предыдущий/следующий гайд» и счётчики на главной.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* страницы в папке guides/ помечены data-in-guides (или data-page="guide") —
     от этого зависят префиксы ссылок в меню. Проверяем оба признака:
     если хотя бы один сработал, значит мы внутри папки guides/.
     Раньше здесь был только data-in-guides — из-за этого меню на страницах
     гайдов вело на guides/guides/… и отдавало «Страницу не найдена». */
  var IN_GUIDES = document.body.hasAttribute('data-in-guides') ||
    document.body.getAttribute('data-page') === 'guide';
  var GUIDE_PREFIX = IN_GUIDES ? '' : 'guides/';
  var INDEX_HREF = IN_GUIDES ? '../index.html' : './';

  var GUIDE_ID = document.body.getAttribute('data-guide') || null;
  var IS_GUIDE = !!GUIDE_ID;
  var toastTimer = null;

  /* ---------- тёмная тема ----------
     Начальное значение ставит инлайн-скрипт в <head>, здесь только
     переключение, сохранение и синхронизация всех кнопок. */
  var THEME_KEY = 'cg-theme';
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#181310' : '#8a3134');
    $$('.theme-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      b.setAttribute('title', t === 'dark' ? 'Светлая тема (T)' : 'Тёмная тема (T)');
    });
    $$('.theme-btn .tb-label').forEach(function (s) {
      s.textContent = t === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    });
  }
  function toggleTheme() { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }

  /* печать всегда из светлой палитры */
  var _themeBeforePrint = null;
  window.addEventListener('beforeprint', function () {
    _themeBeforePrint = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  window.addEventListener('afterprint', function () {
    if (_themeBeforePrint) {
      document.documentElement.setAttribute('data-theme', _themeBeforePrint);
      _themeBeforePrint = null;
    }
  });

  /* ---------- меню гайдов из реестра (js/registry.js) ----------
     Реестр — единственное место, которое надо править при добавлении
     нового гайда. Если скрипт/реестр не загрузился, список просто
     останется пустым, контент страниц не пострадает. */
  function haystack(g) {
    return [g.title, g.desc || '', (g.tags || '')].join(' ').toLowerCase();
  }
  function renderNav(filter) {
    var guides = window.GUIDES || [];
    var q = (filter || '').trim().toLowerCase();
    var list = guides.filter(function (g) { return !q || haystack(g).indexOf(q) !== -1; });
    var html = '';
    /* на странице гайда первым в меню идёт возврат в библиотеку */
    if (IS_GUIDE && !q) {
      html += '<a class="side-card side-home" href="' + INDEX_HREF + '" style="--ac:var(--olive,#66713d)">' +
        '<span class="side-card-top"><span class="side-emoji" aria-hidden="true">🏠</span>' +
        '<span class="side-card-t">Все гайды</span></span>' +
        '<span class="side-card-meta" style="display:block">Главная страница библиотеки</span></a>';
    }
    if (!list.length) {
      html += '<div class="side-empty">Ничего не нашлось.<br>Попробуйте другое слово — например, «кожа» или «гель».</div>';
    }
    list.forEach(function (g) {
      var meta = g.sections + ' ' + plural(g.sections, 'раздел', 'раздела', 'разделов') +
        ' · ' + g.minutes + ' мин' + (g.pdf ? ' · есть PDF' : '');
      html += '<a class="side-card' + (GUIDE_ID === g.file.replace('.html', '') ? ' active' : '') +
        '" href="' + GUIDE_PREFIX + g.file + '" style="--ac:' + esc(g.accent) + '">' +
        '<span class="side-card-top"><span class="side-emoji" aria-hidden="true">' + esc(g.emoji) + '</span>' +
        '<span class="side-card-t">' + esc(g.title) + '</span></span>' +
        '<span class="side-card-meta" style="display:block">' + esc(meta) + '</span></a>';
    });
    $$('.side-nav').forEach(function (nav) { nav.innerHTML = html; });
    $$('.side-label').forEach(function (lab) {
      lab.textContent = 'Гайды' + (q ? ' · найдено ' + list.length : ' · ' + guides.length);
    });
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ---------- «предыдущий / следующий гайд» в конце статьи ----------
     Строится из реестра автоматически: добавили третий гайд —
     переходы обновились на всех страницах без правки HTML. */
  function renderArtNav() {
    if (!IS_GUIDE) return;
    var navs = $$('.art-nav[data-auto]');
    if (!navs.length) return;
    var guides = window.GUIDES || [];
    var i = -1;
    guides.forEach(function (g, k) { if (g.file === GUIDE_ID + '.html') i = k; });
    if (i === -1) return;
    var prev = i > 0 ? guides[i - 1] : null;
    var next = i < guides.length - 1 ? guides[i + 1] : null;
    var html = prev
      ? '<a class="prev" href="' + GUIDE_PREFIX + prev.file + '"><div class="dir">← Предыдущий гайд</div><div class="t">' + esc(prev.title) + '</div></a>'
      : '<span></span>';
    html += next
      ? '<a class="next" href="' + GUIDE_PREFIX + next.file + '"><div class="dir">Следующий гайд →</div><div class="t">' + esc(next.title) + '</div></a>'
      : '<span></span>';
    navs.forEach(function (n) { n.innerHTML = html; });
  }

  /* ---------- счётчики на главной — считаются из реестра ----------
     Добавили гайд в реестр — числа в шапке обновились сами. */
  function renderStats() {
    if (IS_GUIDE) return;
    var guides = window.GUIDES || [];
    if (!guides.length) return;
    var secs = guides.reduce(function (s, g) { return s + (parseInt(g.sections, 10) || 0); }, 0);
    var gEl = $('[data-stat="guides"]');
    var sEl = $('[data-stat="sections"]');
    if (gEl) gEl.innerHTML = '<b>' + guides.length + '</b> ' + plural(guides.length, 'гайд', 'гайда', 'гайдов');
    if (sEl) sEl.innerHTML = '<b>' + secs + '</b> ' + plural(secs, 'раздел', 'раздела', 'разделов');
  }

  /* ---------- поиск: меню + карточки на главной ---------- */
  function bindSearch() {
    $$('.search-input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var v = inp.value;
        renderNav(v);
        $$('.search-input').forEach(function (o) { if (o !== inp && o.value !== v) o.value = v; });
        /* фильтр карточек на главной */
        var cards = $$('.g-card[data-search]');
        if (cards.length) {
          var qq = v.trim().toLowerCase();
          var shown = 0;
          cards.forEach(function (c) {
            var ok = !qq || (c.getAttribute('data-search') + ' ' + c.textContent.toLowerCase()).indexOf(qq) !== -1;
            c.classList.toggle('is-hidden', !ok);
            if (ok) shown++;
          });
          var nr = $('.no-results');
          if (!nr && cards[0] && cards[0].parentElement) {
            nr = document.createElement('div');
            nr.className = 'side-empty no-results';
            nr.hidden = true;
            cards[0].parentElement.after(nr);
          }
          if (nr) {
            nr.hidden = shown > 0;
            nr.innerHTML = 'Ничего не нашлось.<br>Попробуйте другое слово — например, «кожа» или «гель».';
          }
        }
      });
    });
  }

  /* ---------- шторка (мобильное меню) ---------- */
  function openDrawer() {
    var d = $('#drawer'), o = $('#overlay'), b = $('#burger');
    if (d) d.classList.add('on');
    if (o) o.classList.add('on');
    if (b) b.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open'); /* фон под шторкой не скроллится */
  }
  function closeDrawer() {
    var d = $('#drawer'), o = $('#overlay'), b = $('#burger');
    if (d) d.classList.remove('on');
    if (o) o.classList.remove('on');
    if (b) b.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  /* ---------- чек-листы ---------- */
  function initChecklists() {
    $$('.checklist').forEach(function (box) {
      var key = 'cg-check:' + GUIDE_ID + ':' + (box.getAttribute('data-checkkey') || '');
      var saved = [];
      try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
      saved.forEach(function (i) {
        var row = box.querySelector('.chk-row[data-i="' + i + '"]');
        if (row) { row.classList.add('done'); row.setAttribute('aria-checked', 'true'); }
      });
      box.addEventListener('click', function (e) {
        if (e.target.closest('.chk-reset')) {
          try { localStorage.removeItem(key); } catch (err) {}
          $$('.chk-row', box).forEach(function (r) { r.classList.remove('done'); r.setAttribute('aria-checked', 'false'); });
          toast('Чек-лист сброшен');
          return;
        }
        var row = e.target.closest('.chk-row');
        if (!row) return;
        row.classList.toggle('done');
        row.setAttribute('aria-checked', row.classList.contains('done') ? 'true' : 'false');
        var done = $$('.chk-row.done', box).map(function (r) { return parseInt(r.getAttribute('data-i'), 10); });
        try { localStorage.setItem(key, JSON.stringify(done)); } catch (e2) {}
      });
      box.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('chk-row')) {
          e.preventDefault();
          e.target.click();
        }
      });
    });
  }

  /* ---------- прогресс чтения + активный раздел + «наверх» ---------- */
  function updateProgress() {
    var bar = $('#progress');
    if (!bar) return;
    if (!IS_GUIDE) { bar.style.width = '0'; return; }
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop || document.body.scrollTop) / max * 100) : 0) + '%';
  }
  function updateSpy(force) {
    if (!IS_GUIDE) return;
    var links = $$('.toc a[data-sec]');
    if (!links.length) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var cur = -1;
    links.forEach(function (a, i) {
      var t = document.getElementById(a.getAttribute('data-sec'));
      if (t && t.getBoundingClientRect().top <= 150) cur = i;
    });
    var doc = document.documentElement;
    if (y + window.innerHeight >= doc.scrollHeight - 80) cur = links.length - 1;
    if (force && cur === -1) cur = 0;
    links.forEach(function (a, i) { a.classList.toggle('cur', i === cur); });
  }
  function updateToTop() {
    var tt = $('#to-top');
    if (!tt) return;
    tt.classList.toggle('on', (window.scrollY || 0) > 560);
  }

  /* ---------- продолжение чтения ---------- */
  function restorePos() {
    if (!IS_GUIDE) return;
    var saved = 0;
    try { saved = parseInt(localStorage.getItem('cg-pos:' + GUIDE_ID) || '0', 10) || 0; } catch (e) {}
    if (saved > 600) {
      var hEl = document.documentElement;
      var prev = hEl.style.scrollBehavior;
      hEl.style.scrollBehavior = 'auto';
      window.scrollTo(0, saved);
      hEl.style.scrollBehavior = prev || '';
      toast('Вернулись к месту, где вы остановились');
    }
    /* якорь раздела в адресе — прокручиваем к нему */
    if (location.hash.length > 1) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) requestAnimationFrame(function () { t.scrollIntoView({ block: 'start' }); });
    }
  }
  function savePos() {
    if (!IS_GUIDE) return;
    var y = Math.round(window.scrollY || 0);
    clearTimeout(window._posTimer);
    window._posTimer = setTimeout(function () {
      try {
        if (y < 200) { localStorage.removeItem('cg-pos:' + GUIDE_ID); return; }
        localStorage.setItem('cg-pos:' + GUIDE_ID, String(y));
      } catch (e) {}
    }, 400);
  }

  /* ---------- тост, копирование, поделиться ---------- */
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () {
        legacyCopy(text) ? toast(okMsg) : toast(text);
      });
    } else {
      legacyCopy(text) ? toast(okMsg) : toast(text);
    }
  }
  function share() {
    var data = { title: document.title, text: ($('meta[name="description"]') || {}).content || '', url: location.href };
    if (navigator.share) navigator.share(data).catch(function () {});
    else copyText(location.href, 'Ссылка скопирована');
  }

  /* ---------- содержание: плавная прокрутка ---------- */
  function bindToc() {
    $$('.toc a[data-sec]').forEach(function (a) {
      a.addEventListener('click', function () {
        $$('.toc a').forEach(function (o) { o.classList.remove('cur'); });
        a.classList.add('cur');
      });
    });
  }

  /* ---------- старт ---------- */
  function boot() {
    /* переключатели темы: шапка + меню */
    $$('.theme-btn').forEach(function (b) { b.addEventListener('click', toggleTheme); });
    applyTheme(currentTheme());

    renderNav('');
    renderArtNav();
    renderStats();
    bindSearch();

    /* шторка */
    var burger = $('#burger');
    if (burger) burger.addEventListener('click', function () {
      $('#drawer').classList.contains('on') ? closeDrawer() : openDrawer();
    });
    var overlay = $('#overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);
    var drawer = $('#drawer');
    if (drawer) drawer.addEventListener('click', function (e) {
      if (e.target.closest('.drawer-close') || e.target.closest('a')) closeDrawer();
    });

    /* наверх */
    var tt = $('#to-top');
    if (tt) tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    /* делегированные клики: печать, поделиться, ссылка на раздел */
    document.addEventListener('click', function (e) {
      if (e.target.closest('#print-btn')) { window.print(); return; }
      if (e.target.closest('#share-btn')) { share(); return; }
      var an = e.target.closest('.sec-anchor');
      if (an) {
        var anchor = an.getAttribute('data-anchor') || '';
        history.replaceState(null, '', anchor || '#');
        copyText(location.href.split('#')[0] + anchor, 'Ссылка на раздел скопирована');
      }
    });

    /* горячие клавиши */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      var t = e.target, tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        var vis = $$('.search-input').filter(function (i) { return i.offsetParent !== null; });
        var inp = vis[0] || $('.search-input');
        if (inp) { e.preventDefault(); inp.focus(); inp.select(); }
      } else if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
        toggleTheme();
      }
    });

    /* скролл: прогресс, раздел, наверх, позиция */
    var _tick = false;
    window.addEventListener('scroll', function () {
      if (_tick) return;
      _tick = true;
      requestAnimationFrame(function () {
        _tick = false;
        updateProgress();
        updateSpy();
        updateToTop();
        savePos();
      });
    }, { passive: true });

    initChecklists();
    bindToc();
    restorePos();
    updateProgress();
    updateSpy(true);
    updateToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

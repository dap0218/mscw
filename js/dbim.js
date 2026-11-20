/* =========================================================
   DBIM.JS — Meghalaya State Commission for Women
   Main menu (keyboard + mobile), sticky menu bar, current-page
   highlight, "Last Updated On" date, back-to-top button and
   site search. No dependencies.
   ========================================================= */
(function () {
  'use strict';

  var onReady = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  /* ---------------- Main menu ---------------- */
  function initMenu() {
    var nav = document.querySelector('nav.main-navbar');
    if (!nav) return;
    var menu = document.getElementById('mainMenu');
    var toggle = document.getElementById('mobileMenuToggle');
    var triggers = nav.querySelectorAll('.has-dropdown > button');

    function closeAll(except) {
      triggers.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        var dd = b.nextElementSibling;
        if (dd) dd.classList.remove('show');
      });
    }

    triggers.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        btn.nextElementSibling.classList.toggle('show', !open);
      });
    });

    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      });
    }

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) closeAll();
    });
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var li = e.target.closest('.has-dropdown');
      closeAll();
      if (li) li.querySelector('button').focus();
    });
    // close a dropdown when focus leaves it
    nav.querySelectorAll('.has-dropdown').forEach(function (li) {
      li.addEventListener('focusout', function (e) {
        if (!li.contains(e.relatedTarget)) {
          var b = li.querySelector('button');
          b.setAttribute('aria-expanded', 'false');
          b.nextElementSibling.classList.remove('show');
        }
      });
    });

    // current page highlight
    var here = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    if (here === '' || here === 'index.html' || here === 'index.htm' || here === 'default.htm') here = 'home.html';
    here = here.replace(/\.htm$/, '.html');
    nav.querySelectorAll('a[href]').forEach(function (a) {
      var target = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (target && target === here) {
        a.setAttribute('aria-current', 'page');
        var top = a.closest('.main-menu > li');
        if (top) top.classList.add('active');
      }
    });
  }

  /* ---------------- Sticky menu bar ---------------- */
  function initSticky() {
    var nav = document.querySelector('nav.main-navbar');
    if (!nav) return;
    var ph = document.createElement('div');
    ph.className = 'main-navbar-placeholder';
    nav.parentNode.insertBefore(ph, nav.nextSibling);
    var start = 0;
    function measure() { if (!nav.classList.contains('is-fixed')) start = nav.getBoundingClientRect().top + window.pageYOffset; }
    function update() {
      if (window.innerWidth < 992) { nav.classList.remove('is-fixed'); ph.classList.remove('is-visible'); return; }
      var fix = window.pageYOffset > start;
      if (fix && !nav.classList.contains('is-fixed')) { ph.style.height = nav.offsetHeight + 'px'; }
      nav.classList.toggle('is-fixed', fix);
      ph.classList.toggle('is-visible', fix);
    }
    measure();
    window.addEventListener('resize', function () { measure(); update(); });
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------------- Last updated + back to top ---------------- */
  function initFooter() {
    var t = document.getElementById('lastUpdated');
    if (t) {
      var d = new Date(document.lastModified);
      if (!isNaN(d)) {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December'];
        t.textContent = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
        t.setAttribute('datetime', d.toISOString().slice(0, 10));
      }
    }
    var btn = document.querySelector('.footer-back-top');
    if (btn) {
      var onScroll = function () { btn.classList.toggle('is-visible', window.pageYOffset > 300); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      btn.addEventListener('click', function () {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        var skip = document.getElementById('main');
        var first = document.querySelector('header.main-header a');
        if (first) first.focus({ preventScroll: true });
        else if (skip) skip.focus();
      });
    }
  }

  /* ---------------- Site search ----------------
     Reads the pages linked from the sitemap and activity index
     pages (same site only) and lists those containing every
     word typed. Results are kept for the browser session. */
  var SEED_PAGES = ['sitemap.html', 'home.html', 'activities.html', 'archive_activities.html',
    'archive_photos.html', 'Photo_gallery.html', 'news-archive.html', 'MSCW_in_the_news.html'];
  var MAX_PAGES = 200;
  var index = null;
  var indexing = null;

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sameSitePage(href, base) {
    try {
      var u = new URL(href, base);
      if (u.origin !== location.origin) return null;
      if (!/\.html?$/i.test(u.pathname)) return null;
      if (/\/archive\.html?$/i.test(u.pathname)) return null;   // the archive lists everything; search the real pages
      return u.pathname;
    } catch (e) { return null; }
  }
  function pageText(doc) {
    var root = doc.querySelector('#main-content') || doc.querySelector('#content') || doc.body;
    if (!root) return '';
    var clone = root.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach(function (n) { n.remove(); });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function pageTitle(doc, path) {
    var h = doc.querySelector('#main-content h2, #main-content h1');
    var t = (h && h.textContent.trim()) || (doc.title || '').trim();
    return t || path.split('/').pop();
  }

  function buildIndex() {
    if (index) return Promise.resolve(index);
    if (indexing) return indexing;
    try {
      var cached = sessionStorage.getItem('mscw-search-index-v2');
      if (cached) { index = JSON.parse(cached); return Promise.resolve(index); }
    } catch (e) { /* storage unavailable */ }

    var dir = location.pathname.replace(/[^/]*$/, '');
    var queue = SEED_PAGES.map(function (p) { return dir + p; });
    var seen = {};
    queue.forEach(function (p) { seen[p] = true; });
    var results = [];
    var parser = new DOMParser();

    indexing = new Promise(function (resolve) {
      var active = 0, pos = 0;
      function next() {
        if (pos >= queue.length && active === 0) {
          index = results;
          try { sessionStorage.setItem('mscw-search-index-v2', JSON.stringify(results)); } catch (e) { /* ignore */ }
          resolve(results);
          return;
        }
        while (active < 5 && pos < queue.length) {
          (function (path) {
            active++;
            fetch(path, { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.text() : ''; })
              .then(function (html) {
                if (!html) return;
                var doc = parser.parseFromString(html, 'text/html');
                results.push({ url: path, title: pageTitle(doc, path), text: pageText(doc) });
                doc.querySelectorAll('a[href]').forEach(function (a) {
                  var p = sameSitePage(a.getAttribute('href'), location.origin + path);
                  if (p && !seen[p] && queue.length < MAX_PAGES) { seen[p] = true; queue.push(p); }
                });
              })
              .catch(function () { /* skip unreadable page */ })
              .then(function () { active--; next(); });
          })(queue[pos++]);
        }
      }
      next();
    });
    return indexing;
  }

  function snippet(text, terms) {
    var lower = text.toLowerCase();
    var at = lower.indexOf(terms[0]);
    var start = Math.max(0, at - 80);
    var s = (start > 0 ? '… ' : '') + text.substr(start, 220) + (start + 220 < text.length ? ' …' : '');
    var out = esc(s);
    terms.forEach(function (t) {
      var re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function initSearch() {
    var form = document.getElementById('siteSearchForm');
    var input = document.getElementById('siteSearchInput');
    var modal = document.getElementById('searchModal');
    if (!form || !input || !modal) return;
    var box = document.getElementById('searchResults');
    var qText = document.getElementById('searchQueryText');
    var closeBtn = document.getElementById('closeSearchModal');
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      closeBtn.focus();
    }
    function close() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      if (lastFocus) lastFocus.focus();
    }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('button, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      qText.textContent = 'Searching for “' + q + '” …';
      box.innerHTML = '';
      open();
      buildIndex().then(function (pages) {
        var hits = pages.filter(function (p) {
          var hay = (p.title + ' ' + p.text).toLowerCase();
          return terms.every(function (t) { return hay.indexOf(t) !== -1; });
        });
        // pages whose title matches come first
        hits.sort(function (a, b) {
          var at = terms.some(function (t) { return a.title.toLowerCase().indexOf(t) !== -1; }) ? 0 : 1;
          var bt = terms.some(function (t) { return b.title.toLowerCase().indexOf(t) !== -1; }) ? 0 : 1;
          return at - bt;
        });
        qText.textContent = hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + q + '”';
        if (!hits.length) {
          box.innerHTML = '<p>No pages matched. Try fewer or different words, or see the <a href="sitemap.html">Sitemap</a>.</p>';
          return;
        }
        box.innerHTML = '<ol class="search-results">' + hits.map(function (h) {
          return '<li><a href="' + esc(h.url) + '">' + esc(h.title) + '</a><p>' + snippet(h.text, terms) + '</p></li>';
        }).join('') + '</ol>';
      });
    });
  }

  onReady(function () {
    initMenu();
    initSticky();
    initFooter();
    initSearch();
  });
})();

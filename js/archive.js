/* =========================================================
   ARCHIVE.JS — Archives page (archive.html)
   Section tabs, keyword search, year filter, sort and paging over
   the plain HTML table. Without JavaScript the full table shows.
   Links: archive.html?tab=news&q=women&year=2016
   ========================================================= */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var root = document.getElementById('archive');
    if (!root) return;

    var tbody = document.getElementById('archiveRows');
    var search = document.getElementById('archiveSearch');
    var yearSel = document.getElementById('archiveYear');
    var sortSel = document.getElementById('archiveSort');
    var perSel = document.getElementById('archivePer');
    var clearBtn = document.getElementById('archiveClear');
    var status = document.getElementById('archiveStatus');
    var empty = document.getElementById('archiveEmpty');
    var pager = document.getElementById('archivePager');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.archive-tab'));

    var LABEL = {};
    tabs.forEach(function (t) { LABEL[t.dataset.tab] = t.childNodes[0].textContent.trim(); });

    // one record per row; keep the original link text for highlighting
    var rows = [];
    function collect() {
      rows = Array.prototype.slice.call(tbody.rows).map(function (tr, i) {
        var link = tr.cells[1].querySelector('a');
        return {
          tr: tr,
          link: link,
          title: link.textContent,
          text: (tr.cells[1].textContent + ' ' + tr.cells[2].textContent + ' ' + tr.cells[3].textContent).toLowerCase(),
          section: tr.dataset.section,
          year: tr.dataset.year,
          sort: tr.dataset.sort || '',
          order: i
        };
      });
    }
    // year list = every year present in the rows (keeps the current choice if still there)
    function rebuildYears() {
      var keep = yearSel.value;
      var years = {};
      rows.forEach(function (r) { if (r.year) years[r.year] = true; });
      var list = Object.keys(years).sort(function (a, b) { return b - a; });
      yearSel.innerHTML = '<option value="">All years</option>' +
        list.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      yearSel.value = years[keep] ? keep : '';
    }
    collect();

    var state = { tab: 'all', page: 1 };

    // read ?tab= ?q= ?year= from the address
    try {
      var qs = new URLSearchParams(location.search);
      if (qs.get('tab') && LABEL[qs.get('tab')]) state.tab = qs.get('tab');
      if (qs.get('q')) search.value = qs.get('q');
      if (qs.get('year')) yearSel.value = qs.get('year');
    } catch (e) { /* old browser: ignore */ }

    function esc(s) {
      return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }
    function highlight(title, terms) {
      var out = esc(title);
      terms.forEach(function (t) {
        if (!t) return;
        var re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        out = out.replace(re, '<mark>$1</mark>');
      });
      return out;
    }

    function render(moveFocus) {
      var terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var year = yearSel.value;

      // matches ignoring the tab, so every tab can show its own count
      var matchAll = rows.filter(function (r) {
        if (year && r.year !== year) return false;
        return terms.every(function (t) { return r.text.indexOf(t) !== -1; });
      });
      tabs.forEach(function (t) {
        var n = t.dataset.tab === 'all' ? matchAll.length
          : matchAll.filter(function (r) { return r.section === t.dataset.tab; }).length;
        t.querySelector('.archive-count').textContent = n;
        t.setAttribute('aria-pressed', t.dataset.tab === state.tab ? 'true' : 'false');
      });

      var list = matchAll.filter(function (r) { return state.tab === 'all' || r.section === state.tab; });

      var mode = sortSel.value;
      list.sort(function (a, b) {
        if (mode === 'az') return a.title.localeCompare(b.title);
        // undated items always last
        if (!a.sort !== !b.sort) return a.sort ? -1 : 1;
        if (a.sort !== b.sort) return mode === 'old' ? (a.sort < b.sort ? -1 : 1) : (a.sort > b.sort ? -1 : 1);
        return a.order - b.order;
      });

      var per = parseInt(perSel.value, 10) || 0;
      var pages = per ? Math.max(1, Math.ceil(list.length / per)) : 1;
      if (state.page > pages) state.page = pages;
      var start = per ? (state.page - 1) * per : 0;
      var shown = per ? list.slice(start, start + per) : list;

      rows.forEach(function (r) { r.tr.hidden = true; });
      shown.forEach(function (r, i) {
        r.tr.hidden = false;
        r.tr.cells[0].textContent = start + i + 1;
        r.link.innerHTML = highlight(r.title, terms);
        tbody.appendChild(r.tr);
      });

      var where = state.tab === 'all' ? 'across all sections' : 'in ' + LABEL[state.tab];
      var bits = [];
      if (terms.length) bits.push('matching “' + search.value.trim() + '”');
      if (year) bits.push('from ' + year);
      status.textContent = list.length
        ? 'Showing ' + (start + 1) + '–' + (start + shown.length) + ' of ' + list.length + ' items ' + where + (bits.length ? ' ' + bits.join(' ') : '') + '.'
        : 'No items found ' + where + (bits.length ? ' ' + bits.join(' ') : '') + '.';
      empty.hidden = list.length !== 0;
      root.querySelector('.archive-table-wrap').hidden = list.length === 0;

      // pager
      pager.innerHTML = '';
      if (pages > 1) {
        var mk = function (label, page, opts) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          if (opts && opts.aria) b.setAttribute('aria-label', opts.aria);
          if (page === state.page && !(opts && opts.nav)) b.setAttribute('aria-current', 'page');
          if (opts && opts.disabled) b.disabled = true;
          b.addEventListener('click', function () { state.page = page; render(true); });
          pager.appendChild(b);
        };
        mk('‹ Previous', state.page - 1, { nav: true, disabled: state.page === 1, aria: 'Previous page' });
        for (var p = 1; p <= pages; p++) mk(String(p), p, { aria: 'Page ' + p });
        mk('Next ›', state.page + 1, { nav: true, disabled: state.page === pages, aria: 'Next page' });
      }
      if (moveFocus) status.focus();
    }

    var typing;
    search.addEventListener('input', function () {
      clearTimeout(typing);
      typing = setTimeout(function () { state.page = 1; render(false); }, 200);
    });
    search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); state.page = 1; render(true); } });
    [yearSel, sortSel, perSel].forEach(function (el) {
      el.addEventListener('change', function () { state.page = 1; render(false); });
    });
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { state.tab = t.dataset.tab; state.page = 1; render(false); });
    });
    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      search.value = ''; yearSel.value = ''; sortSel.value = 'new'; perSel.value = '25';
      state.tab = 'all'; state.page = 1;
      render(false);
      search.focus();
    });

    render(false);

    // js/content.js calls this after putting the latest news rows from the Excel file into the table
    window.MSCWArchive = {
      reload: function () { collect(); rebuildYears(); render(false); }
    };
  });
})();

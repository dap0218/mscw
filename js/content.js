/* =========================================================
   CONTENT.JS — lists that come from data/mscw_content.xlsx
   (same idea as whats_new.xlsx on the Personnel & AR website)

   News sheet          -> home Latest News + News Clipping, MSCW in the News,
                          News Archive, and the News Clippings tab of Archives
   Photo Gallery sheet -> Photo Gallery and Photo Archive album cards
   Settings sheet      -> how many news items the home page shows

   The lists written in the page stay if the Excel file cannot be read
   (or JavaScript is off), so a page is never empty. The spreadsheet
   reader (SheetJS, js/xlsx.full.min.js) is loaded only after the page
   has finished loading, and only on pages that have one of these lists.
   To change the content: edit mscw_content.xlsx and upload it to data/.
   ========================================================= */
(function () {
  'use strict';

  var EXCEL_URL = 'data/mscw_content.xlsx';
  var SHEETJS = 'js/xlsx.full.min.js';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var MON = {};
  MONTHS.forEach(function (m, i) { MON[m.toLowerCase()] = i + 1; MON[m.slice(0, 3).toLowerCase()] = i + 1; });

  var targets = {
    ticker: document.getElementById('tickerTrack'),
    homeNews: document.getElementById('homeNews'),
    months: document.getElementById('newsMonths'),
    archiveList: document.getElementById('newsArchiveList'),
    galleryCurrent: document.getElementById('galleryCurrent'),
    galleryArchive: document.getElementById('galleryArchive'),
    archiveRows: document.getElementById('archiveRows')
  };
  var needed = Object.keys(targets).some(function (k) { return targets[k]; });
  if (!needed || !window.fetch) return;

  /* ---------- helpers (match scripts/content_render.py) ---------- */
  function s(v) { return v == null ? '' : String(v).trim(); }
  function yes(v, dflt) { v = s(v).toLowerCase(); return v ? ['yes', 'y', 'true', '1'].indexOf(v) !== -1 : dflt; }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
    if (typeof v === 'number' && window.XLSX && XLSX.SSF) {           // Excel date serial
      var p = XLSX.SSF.parse_date_code(v);
      if (p) return { y: p.y, m: p.m, d: p.d };
    }
    v = s(v);
    var m = v.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (m) return { y: +m[3], m: +m[2], d: +m[1] };
    m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return { y: +m[1], m: +m[2], d: +m[3] };
    m = v.match(/^([A-Za-z]+)\.?,?\s+(\d{4})$/);
    if (m && MON[m[1].toLowerCase()]) return { y: +m[2], m: MON[m[1].toLowerCase()], d: 0 };
    return null;
  }
  function ordinal(n) {
    var t = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return n + t;
  }
  function longDate(dt) {
    if (!dt) return '';
    return dt.d ? ordinal(dt.d) + ' ' + MONTHS[dt.m - 1] + ', ' + dt.y : MONTHS[dt.m - 1] + ' ' + dt.y;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function shortDate(dt) {
    if (!dt) return '';
    return dt.d ? pad(dt.d) + '-' + pad(dt.m) + '-' + dt.y : MONTHS[dt.m - 1] + ' ' + dt.y;
  }
  function sortKey(dt) { return dt ? dt.y + '-' + pad(dt.m) + '-' + pad(dt.d) : ''; }
  function newestFirst(list) {
    var dated = list.filter(function (n) { return n.date; }).sort(function (a, b) {
      var ka = sortKey(a.date), kb = sortKey(b.date);
      return ka === kb ? b.order - a.order : (ka < kb ? 1 : -1);
    });
    return dated.concat(list.filter(function (n) { return !n.date; }));
  }
  function rows(ws) {
    return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }).map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k.trim().toLowerCase()] = r[k]; });
      return o;
    });
  }

  /* ---------- markup (match content_render.py) ---------- */
  function isLity(n) { return n.type.toLowerCase() === 'video' && n.link.indexOf('youtube.com/embed/') !== -1; }
  function linkOpen(n, lityOk) {
    if (lityOk && isLity(n)) return '<a href="' + esc(n.link) + '" data-lity>';
    return '<a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">';
  }
  function hiddenNote(n, lityOk, noSource) {
    if (lityOk && isLity(n)) return '<span class="visually-hidden"> (video)</span>';
    var bits = (n.source && !noSource ? [n.source] : []).concat(['opens in a new window']);
    return '<span class="visually-hidden"> (' + esc(bits.join(', ')) + ')</span>';
  }
  function fileType(n) {
    return n.type.toLowerCase() === 'pdf' ? ' <span class="file-type">(PDF' + (n.size ? ', ' + esc(n.size) : '') + ')</span>' : '';
  }
  function count(settings, key, dflt) {
    var v = parseInt(settings[key], 10);
    return isNaN(v) || v < 0 ? dflt : v;
  }
  function homeItems(news, settings, key, dflt) {
    return newestFirst(news.filter(function (n) { return n.home && n.date; })).slice(0, count(settings, key, dflt));
  }
  function newsLi(n) {
    var src = n.source ? ' <span class="news-source">(' + esc(n.source) + ')</span>' : '';
    return '<li>' + linkOpen(n) + esc(n.title) + '</a>' + fileType(n) + src + hiddenNote(n, false, true) + '</li>';
  }

  function render(data) {
    var news = data.news, albums = data.albums, settings = data.settings;

    if (targets.ticker) {
      targets.ticker.innerHTML = homeItems(news, settings, 'home ticker items', 3).map(function (n) {
        return linkOpen(n, true) + '<strong>' + esc(longDate(n.date)) + '</strong>: ' + esc(n.title) + fileType(n) + hiddenNote(n, true) + '</a>';
      }).join('');
    }
    if (targets.homeNews) {
      targets.homeNews.innerHTML = homeItems(news, settings, 'home news items', 6).map(function (n) {
        return '<li>' + linkOpen(n, true) + '<strong>' + esc(longDate(n.date)) + '</strong>: ' + esc(n.title) + fileType(n) + hiddenNote(n, true) + '</a></li>';
      }).join('');
    }
    if (targets.months) {
      var items = news.filter(function (n) { return n.page.toLowerCase() === 'mscw in the news'; });
      var plain = newestFirst(items.filter(function (n) { return n.type.toLowerCase() !== 'video'; }));
      var videos = newestFirst(items.filter(function (n) { return n.type.toLowerCase() === 'video'; }));
      var out = [], current = null;
      plain.forEach(function (n) {
        var head = n.date ? MONTHS[n.date.m - 1] + ' ' + n.date.y : 'Other news';
        if (head !== current) {
          if (current !== null) out.push('</ul>');
          out.push('<h3>' + esc(head) + '</h3><ul class="news-month-list">');
          current = head;
        }
        out.push(newsLi(n));
      });
      if (current !== null) out.push('</ul>');
      if (videos.length) out.push('<h3>Video Links</h3><ul class="news-month-list">' + videos.map(newsLi).join('') + '</ul>');
      targets.months.innerHTML = out.join('');
    }
    if (targets.archiveList) {
      targets.archiveList.innerHTML = newestFirst(news.filter(function (n) { return n.page.toLowerCase() === 'news archive'; }))
        .map(function (n) {
          return '<li>' + linkOpen(n) + '<strong>' + (esc(longDate(n.date)) || 'Date not given') + '</strong>: ' + esc(n.title) + '</a>' + fileType(n) + hiddenNote(n) + '</li>';
        }).join('');
    }
    function albumCards(section) {
      return albums.filter(function (a) { return a.section.toLowerCase() === section; }).map(function (a) {
        var img = a.cover ? '<img src="' + esc(a.cover) + '" alt="" loading="lazy">' : '<span class="album-noimg" aria-hidden="true"></span>';
        var yr = a.year ? '<span class="album-year">' + esc(a.year) + '</span>' : '';
        return '<li><a href="' + esc(a.page) + '">' + img + '<span class="album-title">' + esc(a.title) + '</span>' + yr + '</a></li>';
      }).join('');
    }
    if (targets.galleryCurrent) targets.galleryCurrent.innerHTML = albumCards('current');
    if (targets.galleryArchive) targets.galleryArchive.innerHTML = albumCards('archive');

    if (targets.archiveRows) {
      var tbody = targets.archiveRows;
      Array.prototype.slice.call(tbody.querySelectorAll('tr[data-section="news"]')).forEach(function (tr) { tr.remove(); });
      var seen = {};
      news.forEach(function (n) {
        var title = n.title + (n.source && n.page.toLowerCase() === 'mscw in the news' ? ' (' + n.source + ')' : '');
        var key = n.link + '|' + title.toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        var tr = document.createElement('tr');
        tr.setAttribute('data-section', 'news');
        tr.setAttribute('data-year', n.date ? n.date.y : '');
        tr.setAttribute('data-sort', sortKey(n.date));
        tr.innerHTML = '<td class="archive-sno"></td><td><a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">' + esc(title) + '</a>' +
          fileType(n) + '<span class="visually-hidden"> (opens in a new window)</span></td>' +
          '<td class="archive-section"><a class="archive-section-link" href="news-archive.html">News Clippings</a></td>' +
          '<td class="archive-date">' + (n.date ? esc(shortDate(n.date)) : '<span class="visually-hidden">Date not given</span>&ndash;') + '</td>';
        tbody.appendChild(tr);
      });
      if (window.MSCWArchive) window.MSCWArchive.reload();
    }
  }

  function parse(buf) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: true });
    var news = [], albums = [], settings = {};
    if (wb.Sheets.News) {
      rows(wb.Sheets.News).forEach(function (r, i) {
        if (!s(r.title) || !s(r.link) || !yes(r.show, true)) return;
        news.push({
          title: s(r.title), link: s(r.link), source: s(r.source), date: parseDate(r.date),
          type: s(r.type) || 'Article', page: s(r.page) || 'MSCW in the News',
          home: yes(r['show on home'], true), size: s(r['file size']), order: i
        });
      });
    }
    if (wb.Sheets['Photo Gallery']) {
      rows(wb.Sheets['Photo Gallery']).forEach(function (r, i) {
        if (!s(r.title) || !s(r['album page']) || !yes(r.show, true)) return;
        albums.push({
          title: s(r.title), page: s(r['album page']), cover: s(r['cover image']),
          year: s(r.year), section: s(r.section) || 'Current', order: i
        });
      });
    }
    if (wb.Sheets.Settings) {
      rows(wb.Sheets.Settings).forEach(function (r) { settings[s(r.setting).toLowerCase()] = r.value; });
    }
    return { news: news, albums: albums, settings: settings };
  }

  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = SHEETJS;
      sc.onload = resolve;
      sc.onerror = function () { reject(new Error('Could not load ' + SHEETJS)); };
      document.body.appendChild(sc);
    });
  }

  function start() {
    Promise.all([
      fetch(EXCEL_URL, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.arrayBuffer();
      }),
      loadSheetJS()
    ]).then(function (res) {
      render(parse(res[0]));
    }).catch(function (err) {
      // keep the lists already in the page
      if (window.console) console.warn('Content from ' + EXCEL_URL + ' not loaded; showing the built-in list.', err);
    });
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();

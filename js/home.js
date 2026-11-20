/* =========================================================
   HOME.JS — hero slideshow and latest-news ticker
   Both can be paused (WCAG 2.2.2). Auto-play is off for people
   who ask their system for reduced motion. No dependencies.
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setPauseButton(btn, paused, what) {
    var img = btn.querySelector('img');
    var label = (paused ? 'Play ' : 'Pause ') + what;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    if (img) img.src = 'images/icons/' + (paused ? 'play' : 'pause') + '.svg';
  }

  /* ---------- Hero slideshow ---------- */
  function initHero() {
    var hero = document.getElementById('heroCarousel');
    if (!hero) return;
    var slides = hero.querySelectorAll('.hero-slide');
    var dotsBox = hero.querySelector('.hero-dots');
    var pauseBtn = hero.querySelector('.hero-pause');
    var status = document.getElementById('heroStatus');
    var current = 0, timer = null, paused = reduce, hoverHold = false;
    if (slides.length < 2) return;

    var dots = [];
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show slide ' + (i + 1) + ': ' + s.querySelector('figcaption').textContent.trim());
      b.addEventListener('click', function () { go(i, true); });
      dotsBox.appendChild(b);
      dots.push(b);
    });

    function go(i, announce) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var on = n === current;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        dots[n].setAttribute('aria-current', on ? 'true' : 'false');
      });
      if (announce && status) {
        status.textContent = 'Slide ' + (current + 1) + ' of ' + slides.length + ': ' +
          slides[current].querySelector('figcaption').textContent.trim();
      }
    }
    function stop() { clearInterval(timer); timer = null; }
    function start() { stop(); if (!paused && !hoverHold) timer = setInterval(function () { go(current + 1, false); }, 6000); }

    hero.querySelector('.hero-prev').addEventListener('click', function () { go(current - 1, true); start(); });
    hero.querySelector('.hero-next').addEventListener('click', function () { go(current + 1, true); start(); });
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      setPauseButton(pauseBtn, paused, 'slideshow');
      start();
    });
    // hold still while the pointer or keyboard focus is in the banner
    hero.addEventListener('mouseenter', function () { hoverHold = true; stop(); });
    hero.addEventListener('mouseleave', function () { hoverHold = false; start(); });
    hero.addEventListener('focusin', function () { hoverHold = true; stop(); });
    hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { hoverHold = false; start(); } });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(current - 1, true); }
      if (e.key === 'ArrowRight') { go(current + 1, true); }
    });

    setPauseButton(pauseBtn, paused, 'slideshow');
    go(0, false);
    start();
  }

  /* ---------- Latest news ticker ---------- */
  function initTicker() {
    var btn = document.getElementById('tickerToggle');
    var box = document.querySelector('.news-ticker');
    if (!btn || !box) return;
    var paused = reduce;
    box.classList.toggle('is-paused', paused);
    setPauseButton(btn, paused, 'latest news');
    btn.addEventListener('click', function () {
      paused = !paused;
      box.classList.toggle('is-paused', paused);
      setPauseButton(btn, paused, 'latest news');
    });
  }

  if (document.readyState !== 'loading') { initHero(); initTicker(); }
  else document.addEventListener('DOMContentLoaded', function () { initHero(); initTicker(); });
})();

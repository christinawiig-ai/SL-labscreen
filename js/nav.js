/* SL-labscreen v2 — Navigation + Scale-to-fit */

(function () {
  const deck = document.getElementById('deck');
  const slides = deck.querySelectorAll('.slide');
  let current = 0;

  function show(n) {
    if (n < 0 || n >= slides.length) return;
    slides[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(slides.length - 1);
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    }
  });

  // Click zones: left 25% = prev, right 75% = next
  deck.addEventListener('click', function (e) {
    // Ignore clicks on interactive elements
    if (e.target.closest('a, button, input')) return;
    var rect = deck.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width;
    if (x < 0.25) show(current - 1);
    else show(current + 1);
  });

  // Scale deck to fit viewport
  function scale() {
    var sx = window.innerWidth / 1920;
    var sy = window.innerHeight / 1080;
    var s = Math.min(sx, sy);
    deck.style.transform = 'scale(' + s + ')';
    // Center if aspect ratio doesn't match
    var offsetX = (window.innerWidth - 1920 * s) / 2;
    var offsetY = (window.innerHeight - 1080 * s) / 2;
    deck.style.marginLeft = offsetX + 'px';
    deck.style.marginTop = offsetY + 'px';
  }

  window.addEventListener('resize', scale);
  scale();

  // Init: ensure first slide is active
  slides[0].classList.add('active');
})();

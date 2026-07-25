/* remote-cursor.js — visual mouse cursor driven by the phone remote.
   Real click/keyboard events are dispatched natively from the Android
   side (WebView.dispatchTouchEvent / dispatchKeyEvent), so Aurora's own
   window.js / input.js handle drag, focus, and shortcuts completely
   unmodified. This file only draws where the cursor currently is. */
(function () {
  const el = document.getElementById('remote-cursor');
  if (!el) return;

  function move(x, y) {
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function pulse() {
    el.classList.add('clicking');
    setTimeout(() => el.classList.remove('clicking'), 120);
  }

  // Exposed for Kotlin to call via evaluateJavascript:
  //   __auroraCursor.move(x, y)
  //   __auroraCursor.pulse()
  window.__auroraCursor = { move, pulse };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();
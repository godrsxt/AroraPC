/* remote-cursor.js — PURELY VISUAL. Draws where the cursor is; does not
   dispatch any input itself.

   Why: this used to also dispatch synthetic click/drag events in JS.
   That reliably worked for Aurora's own top-level UI, but two things
   about synthetic (JS dispatchEvent) input are platform limitations, not
   bugs that can be worked around in JS:
     1. It cannot cross an iframe boundary -- events dispatched on/near
        an <iframe> element in the parent document never reach the
        iframe's own internal document, so installed (sandboxed-iframe)
        apps never received any input at all.
     2. Browsers only let *trusted* (real) input trigger native behaviors
        like text-field focus, caret placement, and drag-to-select text.
        Synthetic events fire JS listeners but never those native
        behaviors.

   Real input -- genuine Android MotionEvent/KeyEvent objects dispatched
   from Kotlin, exactly what a real touchscreen or USB mouse produces --
   doesn't have either limitation, and is also the one mechanism that
   generalizes cleanly to a future direct-touch "Android mode" (no
   external display) alongside this "Cast mode". So clicks/drags are
   dispatched natively again; this file only ever draws the cursor. */
(function () {
  const el = document.getElementById('remote-cursor');
  if (!el) return;

  function move(x, y) {
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    const cx = Math.max(0, Math.min(x, maxX));
    const cy = Math.max(0, Math.min(y, maxY));
    el.style.transform = `translate(${cx}px, ${cy}px)`;
  }

  function pulse() {
    el.classList.add('clicking');
    setTimeout(() => el.classList.remove('clicking'), 120);
  }

  // Exposed for Kotlin to call via evaluateJavascript.
  window.__auroraCursor = { move, pulse };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();

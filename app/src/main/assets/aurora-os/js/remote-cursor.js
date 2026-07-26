/* remote-cursor.js — visual cursor, plus reliable click/dblclick
   activation for BOTH Aurora's own top-level UI and installed
   (iframe-sandboxed) third-party apps.

   Top-level Aurora content: .click()/'dblclick' dispatched directly on
   the element under the cursor -- safe on any element, bubbles to
   whatever listener actually handles it.

   Installed apps run in a sandboxed <iframe> with no allow-same-origin,
   so direct DOM access into it (calling .click() on something inside it)
   is fundamentally impossible from here -- that's not a translation
   pipeline being unreliable, it's a hard platform boundary. postMessage
   is the one channel specifically designed to cross it: this posts an
   "activate at (x, y)" message into the iframe's own window, and a small
   bridge script auto-injected into every installed app at install time
   (see MainActivity.kt's installAppFromZip/installSingleHtmlApp) does the
   actual elementFromPoint(...).click() from *inside* that document, where
   it has full same-document access with no cross-boundary issue at all.

   Text inputs (top-level or, via the injected bridge, inside an
   installed app) still fall back to real native MotionEvent dispatch --
   that's what's needed for genuine focus/caret placement/drag-selection,
   which only ever respond to trusted input. */
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

  function needsNativeInput(target) {
    if (!target) return true;
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  /** Returns true if it handled the activation itself (top-level click,
   *  or relayed into an installed app's iframe), false if Kotlin should
   *  fall back to real native dispatch (a text-like input, or nothing
   *  actionable there). */
  function smartActivate(x, y, isDoubleTap) {
    const target = document.elementFromPoint(x, y);
    if (!target) return false;

    const iframe = target.closest('iframe');
    if (iframe) {
      const rect = iframe.getBoundingClientRect();
      iframe.contentWindow.postMessage({
        type: 'aurora:activate',
        x: x - rect.left,
        y: y - rect.top,
        dbl: !!isDoubleTap
      }, '*');
      return true;
    }

    if (needsNativeInput(target)) return false;

    if (isDoubleTap) {
      target.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true, cancelable: true, clientX: x, clientY: y, view: window
      }));
      return true;
    }

    target.click(); // safe on any element; bubbles to whatever listener handles it
    return true;
  }

  // Exposed for Kotlin to call via evaluateJavascript.
  window.__auroraCursor = { move, pulse, smartActivate };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();

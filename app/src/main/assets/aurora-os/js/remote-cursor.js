/* remote-cursor.js — visual cursor, PLUS a reliable "smart activate" that
   covers ALL of Aurora's own top-level content -- desktop/taskbar chrome
   AND whatever arbitrary UI a built-in app (Notepad, Calculator, Settings,
   etc.) renders inside its own window, since those all mount real DOM
   directly into the page (only third-party apps use an iframe).

   Why this exists instead of relying purely on native MotionEvent
   dispatch: there's no way, without device logs, to confirm Chromium's
   internal touch-to-click translation is actually producing real
   'click'/'dblclick' DOM events from synthetic touch input, vs. only
   registering at the Android View level. Rather than keep guessing at
   that pipeline, for anything that is definitely NOT inside a sandboxed
   iframe and definitely NOT a native-input-requiring element, this calls
   the DOM's own activation directly (.click(), or a manually dispatched
   'dblclick') -- guaranteed to work regardless of that pipeline.

   IMPORTANT: this does NOT try to guess what counts as "clickable" via a
   list of CSS classes/tags (that's what broke interaction inside opened
   app windows last time -- an app's own buttons/menu items don't
   necessarily match any hardcoded selector). Instead .click()/'dblclick'
   is dispatched on the EXACT element under the cursor -- .click() is
   safe to call on any element; if nothing is listening, it's a no-op,
   and it still bubbles to whatever ancestor listener actually handles it
   (exactly how Aurora's own delegated click handlers already work).

   This does NOT reintroduce the earlier iframe/text-selection problem:
   - If the point is over (or inside) an <iframe>, this returns false and
     Kotlin falls back to real native dispatch (the only way to reach
     inside a sandboxed iframe at all).
   - If the point is over a text input/textarea/select/contenteditable,
     this also returns false, so native dispatch (which supports real
     focus, caret placement, and drag-to-select) handles those. */
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
    if (target.closest('iframe')) return true;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
    return false;
  }

  /** Returns true if it handled the activation itself, false if Kotlin
   *  should fall back to real native dispatch (iframe / text-like input
   *  / nothing there at all). */
  function smartActivate(x, y, isDoubleTap) {
    const target = document.elementFromPoint(x, y);
    if (!target) return false;
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

/* remote-cursor.js — visual cursor, PLUS a reliable "smart activate" for
   Aurora's own top-level UI (icons, buttons, taskbar items).

   Why this exists instead of relying purely on native MotionEvent
   dispatch: we can no longer tell, without device logs, whether
   Chromium's internal touch-to-click translation is actually producing
   real 'click'/'dblclick' DOM events from our synthetic touch input, or
   only registering at the Android View level (which is all "consumed"
   in the debug log actually proves). Rather than keep guessing at that
   pipeline, for anything that is definitely NOT inside a sandboxed
   iframe and definitely NOT a text input, we skip the translation
   uncertainty entirely and call the DOM's own reliable activation
   directly (.click(), or a manually dispatched 'dblclick').

   This does NOT reintroduce the earlier iframe/text-selection problem:
   - If the point is over an <iframe>, this returns false and Kotlin
     falls back to real native dispatch (the only way to reach inside a
     sandboxed iframe).
   - If the point is over a text input/textarea/contenteditable, this
     also returns false, so native dispatch (which supports real focus,
     caret placement, and drag-to-select) still handles those. */
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

  /** Returns true if it handled the activation itself (Aurora's own UI),
   *  false if Kotlin should fall back to native dispatch (iframe / text
   *  input / nothing actionable there). */
  function smartActivate(x, y, isDoubleTap) {
    const el = document.elementFromPoint(x, y);
    if (!el) return false;

    if (el.tagName === 'IFRAME') return false; // installed app -- needs native
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
      return false; // needs native for real focus/caret/selection
    }

    if (isDoubleTap) {
      const icon = el.closest('.desktop-icon');
      if (icon) {
        icon.dispatchEvent(new MouseEvent('dblclick', {
          bubbles: true, cancelable: true, clientX: x, clientY: y, view: window
        }));
        return true;
      }
    }

    const clickable = el.closest(
      'button, .taskbar-btn, .start-app, .desktop-icon, [role="button"], a, .win-ctrl, .icon-btn'
    );
    if (clickable) {
      clickable.click();
      return true;
    }
    return false;
  }

  // Exposed for Kotlin to call via evaluateJavascript.
  window.__auroraCursor = { move, pulse, smartActivate };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();

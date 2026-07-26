/* remote-cursor.js — visual mouse cursor + click/drag dispatch, driven by
   the phone remote AND (via Kotlin routing the same functions) a USB
   mouse. Cursor MOVEMENT still uses a real Android ACTION_HOVER_MOVE
   dispatched from Kotlin. Clicks and drags are dispatched here as real DOM
   PointerEvent/MouseEvent objects -- synthetic ACTION_DOWN/ACTION_UP
   injected through WebView.dispatchTouchEvent proved unreliable, and even
   when it registered, a synthetic mousedown+mouseup pair alone never
   produces a "click" (browsers only auto-synthesize that from real input),
   so icon/button click handlers silently never fired -- including
   double-click, which desktop icons need to open. */
(function () {
  const el = document.getElementById('remote-cursor');
  if (!el) return;

  let dragTarget = null;
  let dragStartX = 0, dragStartY = 0;
  let dragMoved = false;
  let lastClickTime = 0, lastClickX = 0, lastClickY = 0;

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

  function opts(x, y, button, buttons) {
    return {
      bubbles: true, cancelable: true, composed: true,
      clientX: x, clientY: y, button, buttons,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, view: window
    };
  }

  function fire(target, x, y, button, buttons, types) {
    types.forEach((type) => {
      const Ctor = type.indexOf('pointer') === 0 ? PointerEvent : MouseEvent;
      target.dispatchEvent(new Ctor(type, opts(x, y, button, buttons)));
    });
  }

  /** Fires click (or contextmenu for right-button), and escalates to
   *  dblclick if this click landed close in time+space to the last one --
   *  exactly how a real desktop mouse/trackpad double-click is detected.
   *  This is the ONE place click/dblclick get fired, whether the source
   *  was a discrete tap (clickAt) or a press+release-without-moving
   *  (dragStart/dragEnd) -- see dragEnd below. */
  function fireClickSequence(target, x, y, button) {
    if (button === 2) {
      fire(target, x, y, button, 0, ['contextmenu']);
      return;
    }
    const now = Date.now();
    const isDouble = (now - lastClickTime) < 400 &&
      Math.abs(x - lastClickX) < 14 && Math.abs(y - lastClickY) < 14;

    fire(target, x, y, button, 0, ['click']);
    if (isDouble) {
      fire(target, x, y, button, 0, ['dblclick']);
      lastClickTime = 0; // don't chain a third tap into another dblclick
    } else {
      lastClickTime = now; lastClickX = x; lastClickY = y;
    }
  }

  /** One-shot tap: full down+up+click(+dblclick) sequence at (x, y) in CSS
   *  px. button: 0 = left, 2 = right. Used by the phone's explicit
   *  Left Click / Right Click buttons and a plain trackpad tap. */
  function clickAt(x, y, button) {
    const target = document.elementFromPoint(x, y) || document.body;
    fire(target, x, y, button, button === 2 ? 2 : 1, ['pointerdown', 'mousedown']);
    fire(target, x, y, button, 0, ['pointerup', 'mouseup']);
    fireClickSequence(target, x, y, button);
    pulse();
  }

  /** Press-and-hold start -- used both for the phone's "Drag: ON" mode
   *  and for a physical USB mouse's real button-down (which might turn
   *  into a drag, or might just be a click if released without moving:
   *  see dragEnd). */
  function dragStart(x, y) {
    dragTarget = document.elementFromPoint(x, y) || document.body;
    dragStartX = x; dragStartY = y; dragMoved = false;
    fire(dragTarget, x, y, 0, 1, ['pointerdown', 'mousedown']);
  }

  /** Move while held -- dispatched on document so listeners bound at the
   *  window/document level (how drags that leave the original element's
   *  bounds, or scrollbar thumbs, are normally handled) still receive it. */
  function dragMove(x, y) {
    if (!dragTarget) return;
    if (Math.abs(x - dragStartX) > 4 || Math.abs(y - dragStartY) > 4) dragMoved = true;
    fire(document, x, y, 0, 1, ['pointermove', 'mousemove']);
  }

  function dragEnd(x, y) {
    if (!dragTarget) return;
    fire(document, x, y, 0, 0, ['pointerup', 'mouseup']);
    if (!dragMoved) {
      // Pressed and released without real movement -- that's a click, not
      // a drag. This is what makes a physical USB mouse's ordinary click
      // (which Kotlin routes through dragStart/dragEnd, not clickAt) still
      // open icons on a double-click, exactly like a real desktop.
      fireClickSequence(dragTarget, x, y, 0);
    }
    dragTarget = null;
    pulse();
  }

  // Exposed for Kotlin to call via evaluateJavascript.
  window.__auroraCursor = { move, pulse, clickAt, dragStart, dragMove, dragEnd };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();

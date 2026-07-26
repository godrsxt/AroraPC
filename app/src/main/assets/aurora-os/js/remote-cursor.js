/* remote-cursor.js — visual mouse cursor + click/drag dispatch, driven by
   the phone remote. Cursor MOVEMENT still uses a real Android
   ACTION_HOVER_MOVE dispatched from Kotlin (that part works fine). Clicks
   and drags are dispatched here instead, as real DOM PointerEvent/
   MouseEvent objects -- synthetic ACTION_DOWN/ACTION_UP injected through
   WebView.dispatchTouchEvent is unreliable on some Chromium/WebView
   builds, and even when it registers, a synthetic mousedown+mouseup pair
   alone never produces a "click" event (browsers only auto-synthesize
   that from real input), so element click handlers silently never fired. */
(function () {
  const el = document.getElementById('remote-cursor');
  if (!el) return;

  let dragTarget = null;

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

  /** Single tap/click at (x, y) in CSS px. button: 0 = left, 2 = right. */
  function clickAt(x, y, button) {
    const target = document.elementFromPoint(x, y) || document.body;
    const finalType = button === 2 ? 'contextmenu' : 'click';
    fire(target, x, y, button, button === 2 ? 2 : 1,
      ['pointerdown', 'mousedown']);
    fire(target, x, y, button, 0,
      ['pointerup', 'mouseup', finalType]);
    pulse();
  }

  /** Press-and-hold start, for window dragging / text selection. */
  function dragStart(x, y) {
    dragTarget = document.elementFromPoint(x, y) || document.body;
    fire(dragTarget, x, y, 0, 1, ['pointerdown', 'mousedown']);
  }

  /** Move while held -- dispatched on document so listeners bound at the
   *  window/document level (how drags that leave the original element's
   *  bounds are normally handled) still receive it. */
  function dragMove(x, y) {
    if (!dragTarget) return;
    fire(document, x, y, 0, 1, ['pointermove', 'mousemove']);
  }

  function dragEnd(x, y) {
    if (!dragTarget) return;
    fire(document, x, y, 0, 0, ['pointerup', 'mouseup']);
    dragTarget = null;
    pulse();
  }

  // Exposed for Kotlin to call via evaluateJavascript.
  window.__auroraCursor = { move, pulse, clickAt, dragStart, dragMove, dragEnd };

  move(window.innerWidth / 2, window.innerHeight / 2);
})();

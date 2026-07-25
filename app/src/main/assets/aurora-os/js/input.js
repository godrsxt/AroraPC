/* =========================================================
   Input — engine/input.js
   Detects active input device (mouse / touch / stylus / trackpad)
   and wires global keyboard shortcuts (Alt+Tab, Ctrl shortcuts…)
   ========================================================= */
const InputEngine = (() => {
  let lastDevice = 'mouse';

  function detectPointer(e){
    let device = 'mouse';
    if(e.pointerType === 'touch') device = 'touch';
    else if(e.pointerType === 'pen') device = 'stylus';
    else if(e.pointerType === 'mouse') device = 'mouse';
    if(device !== lastDevice){
      lastDevice = device;
      document.body.dataset.inputDevice = device;
      Bus.emit('input:device-changed', device);
    }
  }

  function bindGamepad(){
    window.addEventListener('gamepadconnected', (e) => {
      Notifications.push({ icon:'🎮', title:'Gamepad connected', body:e.gamepad.id, silent:true });
    });
  }

  function bindKeyboard(){
    let altTabHeld = false;
    document.addEventListener('keydown', (e) => {
      // Alt+Tab — cycle focused window
      if(e.altKey && e.key === 'Tab'){
        e.preventDefault();
        WindowManager.cycleFocus();
        altTabHeld = true;
        return;
      }
      // Windows/Meta key — toggle start menu
      if(e.key === 'Meta' || e.key === 'OS'){
        e.preventDefault();
        Taskbar.togglePanel('start-menu');
        return;
      }
      // Ctrl+Shift+Esc — nothing destructive, just focus taskbar search as a nod to task manager
      if(e.ctrlKey && e.shiftKey && e.key === 'Escape'){
        e.preventDefault();
        Taskbar.togglePanel('start-menu');
      }
      // Escape closes panels/menus
      if(e.key === 'Escape'){
        document.getElementById('context-menu').classList.add('hidden');
        ['start-menu','quick-panel','notif-panel'].forEach(id => document.getElementById(id).classList.add('hidden'));
      }
    });
    document.addEventListener('keyup', (e) => {
      if(e.key === 'Alt' && altTabHeld) altTabHeld = false;
    });
  }

  function init(){
    document.addEventListener('pointerdown', detectPointer);
    document.addEventListener('pointermove', detectPointer);
    bindGamepad();
    bindKeyboard();
  }

  return { init, get device(){ return lastDevice; } };
})();
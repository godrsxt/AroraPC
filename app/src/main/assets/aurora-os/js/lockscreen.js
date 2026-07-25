/* =========================================================
   LockScreen — engine/lockscreen.js
   ========================================================= */
const LockScreen = (() => {
  function show(){
    const lock = document.getElementById('lock-screen');
    document.getElementById('desktop-screen').classList.add('hidden');
    lock.classList.remove('hidden', 'unlocking');
  }

  function unlock(){
    const lock = document.getElementById('lock-screen');
    lock.classList.add('unlocking');
    setTimeout(() => {
      lock.classList.add('hidden');
      document.getElementById('desktop-screen').classList.remove('hidden');
      Bus.emit('system:unlocked');
    }, 480);
  }

  function init(){
    const lock = document.getElementById('lock-screen');
    lock.addEventListener('click', unlock);
    document.addEventListener('keydown', (e) => {
      if(!lock.classList.contains('hidden')) unlock();
    });
    Bus.on('system:lock', show);
  }

  return { init, show, unlock };
})();
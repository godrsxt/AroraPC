/* =========================================================
   Boot — engine/boot.js
   Plays a short boot sequence, then hands off to the lock screen.
   ========================================================= */
const Boot = (() => {
  const messages = [
    'Initializing kernel…',
    'Mounting virtual file system…',
    'Loading window manager…',
    'Starting Aurora shell…',
    'Welcome.'
  ];

  function run(){
    return new Promise((resolve) => {
      const statusEl = document.getElementById('boot-status');
      let i = 0;
      const step = () => {
        statusEl.textContent = messages[i];
        i++;
        if(i < messages.length) setTimeout(step, 480);
        else setTimeout(() => {
          document.getElementById('boot-screen').classList.add('hidden');
          resolve();
        }, 500);
      };
      step();
    });
  }

  return { run };
})();

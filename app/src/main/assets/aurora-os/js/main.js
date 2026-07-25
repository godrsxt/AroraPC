/* =========================================================
   main.js — boots Aurora OS
   ========================================================= */
(async function(){
  async function applyTheme(theme){
    document.documentElement.dataset.theme = theme;
    await AuroraStorage.kvSet('theme', theme);
    document.getElementById('theme-toggle-btn')?.classList.toggle('active', theme === 'dark');
  }

  async function initTheme(){
    const theme = await AuroraStorage.kvGet('theme', 'light');
    await applyTheme(theme);
  }

  async function initWallpaper(){
    const wallpaper = await AuroraStorage.kvGet('wallpaper', 'bloom');
    if(typeof applyWallpaper === 'function') applyWallpaper(wallpaper);
  }

  Bus.on('system:toggle-theme', async () => {
    const current = document.documentElement.dataset.theme || 'dark';
    await applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  Bus.on('system:unlocked', () => {
    Notifications.push({ icon:'👋', title:'Welcome back', body:'Aurora OS is ready.', silent:false });
  });

  Notifications.init();
  InputEngine.init();
  Taskbar.init();
  Desktop.init();
  Desktops.init();
  LockScreen.init();

  await initTheme();
  await initWallpaper();
  await AuroraStorage.seedDefaultFolders();

  await Boot.run();
  LockScreen.show();

  // Global taskbar clock keeps ticking even before unlock
  setInterval(() => Bus.emit('tick', Date.now()), 1000);
})();

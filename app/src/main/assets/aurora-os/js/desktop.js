/* =========================================================
   Desktop — engine/desktop.js
   Renders desktop icons, wallpaper layer, right-click menu,
   and the clock widget.
   ========================================================= */
const Desktop = (() => {
  const DEFAULT_ICON_APPS = ['explorer','browser','terminal','notepad','calculator','paint','minesweeper','recyclebin','settings','aboutme'];

  function renderWallpaper(){
    const desktop = document.getElementById('desktop');
    let bg = desktop.querySelector('.aurora-bg');
    if(!bg){
      bg = document.createElement('div');
      bg.className = 'aurora-bg';
      bg.innerHTML = '<div class="blob"></div>';
      desktop.prepend(bg);
    }
  }

  function addIconTo(grid, id){
    const app = AppRegistry.get(id);
    if(!app) return;
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.tabIndex = 0;
    el.innerHTML = `<div class="icon-glyph">${app.icon}</div><div class="icon-label">${app.title}</div>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      grid.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
    });
    el.addEventListener('dblclick', () => WindowManager.open(id));
    // Right-click (or the phone's Right Click button) removes the icon
    // from the desktop only -- the app stays reachable from Start menu >
    // All apps, and can be put back with AppManager.showOnDesktop(id).
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if(window.AppManager) AppManager.hideFromDesktop(id);
    });
    grid.appendChild(el);
  }

  function renderIcons(){
    const grid = document.getElementById('desktop-icons');
    grid.innerHTML = '';
    const isHidden = (id) => window.AppManager && AppManager.isHiddenFromDesktop(id);
    DEFAULT_ICON_APPS.forEach(id => { if(!isHidden(id)) addIconTo(grid, id); });
    // Third-party apps installed via AppManager.install() -- appended
    // after the built-in set, same icon markup/behavior.
    if(window.AppManager) AppManager.installedIds().forEach(id => { if(!isHidden(id)) addIconTo(grid, id); });
  }

  function renderClockWidget(){
    const layer = document.getElementById('widgets-layer');
    layer.innerHTML = `<div class="widget-clock"><div class="w-time" id="widget-time">00:00</div><div class="w-date" id="widget-date">—</div></div>`;
    tickWidget();
    setInterval(tickWidget, 1000 * 10);
  }
  function tickWidget(){
    const now = new Date();
    const t = document.getElementById('widget-time');
    const d = document.getElementById('widget-date');
    if(t) t.textContent = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    if(d) d.textContent = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
  }

  // ---- Context menu ----
  function showContextMenu(x, y, items){
    const menu = document.getElementById('context-menu');
    menu.innerHTML = items.map((it, i) => {
      if(it.sep) return '<div class="cm-sep"></div>';
      return `<div class="cm-item ${it.danger?'danger':''}" data-i="${i}">${it.icon||''} <span>${it.label}</span></div>`;
    }).join('');
    menu.style.left = Math.min(x, window.innerWidth - 240) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 56 - items.length*36) + 'px';
    menu.classList.remove('hidden');
    menu.querySelectorAll('.cm-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = items[+el.dataset.i];
        item.action && item.action();
        hideContextMenu();
      });
    });
  }
  function hideContextMenu(){ document.getElementById('context-menu').classList.add('hidden'); }

  function bindContextMenu(){
    const desktop = document.getElementById('desktop');
    desktop.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label:'Refresh', icon:'↻', action:()=>Notifications.push({icon:'↻', title:'Desktop refreshed'}) },
        { sep:true },
        { label:'New Text File', icon:'📄', action:()=>WindowManager.open('notepad') },
        { label:'Open Terminal here', icon:'⌨️', action:()=>WindowManager.open('terminal') },
        { sep:true },
        { label:'Change wallpaper', icon:'🖼️', action:()=>WindowManager.open('settings', { pane:'personalization' }) },
        { label:'Display settings', icon:'⚙️', action:()=>WindowManager.open('settings') },
      ]);
    });
    document.addEventListener('click', (e) => {
      if(!e.target.closest('.context-menu')) hideContextMenu();
    });
    window.addEventListener('blur', hideContextMenu);
  }

  function bindFileDrop(){
    const desktop = document.getElementById('desktop');
    ;['dragover','dragenter'].forEach(evt => desktop.addEventListener(evt, (e) => {
      if(!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
    }));
    desktop.addEventListener('drop', async (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if(files.length === 0) return;
      e.preventDefault();
      for(const file of files) await AuroraStorage.importFile(file, '/Downloads/');
      Notifications.push({ icon:'⬇️', title:`Imported ${files.length} file${files.length>1?'s':''} to Downloads`, silent:false });
      Bus.emit('fs:changed');
    });
  }

  function init(){
    renderWallpaper();
    renderIcons();
    renderClockWidget();
    bindContextMenu();
    bindFileDrop();
  }

  return { init, showContextMenu, hideContextMenu, renderIcons };
})();

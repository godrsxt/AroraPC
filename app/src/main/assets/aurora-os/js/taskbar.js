/* =========================================================
   Taskbar — engine/taskbar.js
   Start menu, running-apps tracker, clock/date, quick panel,
   notification center. All wired via the Bus so it stays
   decoupled from WindowManager internals.
   ========================================================= */
const Taskbar = (() => {
  const runningEls = new Map(); // winId -> button el

  function tickClock(){
    const now = new Date();
    document.getElementById('taskbar-clock').textContent = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    document.getElementById('taskbar-date').textContent = now.toLocaleDateString([], { weekday:'short', month:'numeric', day:'numeric' });
    const lt = document.getElementById('lock-time');
    const ld = document.getElementById('lock-date');
    if(lt) lt.textContent = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    if(ld) ld.textContent = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
  }

  function closeAllPanels(except){
    ['start-menu','quick-panel','notif-panel','taskview-panel'].forEach(id => {
      if(id !== except) document.getElementById(id).classList.add('hidden');
    });
  }

  function togglePanel(id){
    const el = document.getElementById(id);
    const willOpen = el.classList.contains('hidden');
    closeAllPanels(willOpen ? id : null);
    el.classList.toggle('hidden');
  }

  function renderStartApps(filter=''){
    const grid = document.getElementById('start-apps-grid');
    const apps = AppRegistry.pinned().filter(a => a.title.toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = apps.map(a => `
      <div class="start-app" data-app="${a.id}">
        <div class="icon-glyph">${a.icon}</div>
        <span>${a.title}</span>
      </div>`).join('') || `<div class="explorer-empty">No apps found</div>`;
    grid.querySelectorAll('.start-app').forEach(el => {
      el.addEventListener('click', () => {
        WindowManager.open(el.dataset.app);
        closeAllPanels();
      });
    });
  }

  function renderRecommended(){
    const wrap = document.getElementById('start-recommended');
    if(!wrap) return;
    wrap.innerHTML = `<div class="rec-item" style="cursor:default;"><div class="rec-text"><div class="rec-sub">Your recently used files will show up here</div></div></div>`;
  }

  function addRunningButton({ id, appId, title, icon }){
    const wrap = document.getElementById('running-apps');
    const btn = document.createElement('button');
    btn.className = 'running-app-btn active';
    btn.title = title;
    btn.innerHTML = `<div class="rab-icon">${icon}</div><span class="dot"></span>`;
    btn.addEventListener('click', () => {
      const win = WindowManager.list().find(w => w.id === id);
      if(win && win.desktop !== WindowManager.getCurrentDesktop()) WindowManager.switchDesktop(win.desktop);
      WindowManager.toggleMinimizeOrFocus(id);
    });
    wrap.appendChild(btn);
    runningEls.set(id, btn);
    highlightFocused(id);
  }

  function removeRunningButton(id){
    const btn = runningEls.get(id);
    if(btn) btn.remove();
    runningEls.delete(id);
  }

  function highlightFocused(focusedId){
    runningEls.forEach((btn, id) => btn.classList.toggle('active', id === focusedId));
  }

  function bindEvents(){
    document.getElementById('start-btn').addEventListener('click', (e) => { e.stopPropagation(); togglePanel('start-menu'); });
    document.getElementById('search-btn').addEventListener('click', (e) => {
      e.stopPropagation(); togglePanel('start-menu');
      setTimeout(() => document.getElementById('start-search-input').focus(), 50);
    });
    document.getElementById('quick-panel-btn').addEventListener('click', (e) => { e.stopPropagation(); togglePanel('quick-panel'); });
    document.getElementById('clock-btn').addEventListener('click', (e) => { e.stopPropagation(); togglePanel('quick-panel'); });
    document.getElementById('notif-btn').addEventListener('click', (e) => { e.stopPropagation(); togglePanel('notif-panel'); });

    document.getElementById('start-search-input').addEventListener('input', (e) => renderStartApps(e.target.value));

    document.getElementById('start-power').addEventListener('click', () => {
      closeAllPanels();
      Bus.emit('system:lock');
    });

    document.addEventListener('click', (e) => {
      if(!e.target.closest('.start-menu, .quick-panel, .notif-panel, .taskview-panel, #start-btn, #search-btn, #quick-panel-btn, #clock-btn, #notif-btn, #taskview-btn')){
        closeAllPanels();
      }
    });

    // Quick toggles
    document.querySelectorAll('.qtoggle').forEach(btn => {
      btn.addEventListener('click', () => {
        if(btn.id === 'theme-toggle-btn'){ Bus.emit('system:toggle-theme'); return; }
        btn.classList.toggle('active');
      });
    });

    Bus.on('window:opened', addRunningButton);
    Bus.on('window:closed', ({ id }) => removeRunningButton(id));
    Bus.on('window:focused', ({ id }) => highlightFocused(id));
    Bus.on('window:minimized', ({ id }) => { const b = runningEls.get(id); if(b) b.classList.remove('active'); });
  }

  function init(){
    renderStartApps();
    renderRecommended();
    tickClock();
    setInterval(tickClock, 1000 * 10);
    bindEvents();
  }

  return { init, togglePanel, renderStartApps };
})();

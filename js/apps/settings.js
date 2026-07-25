/* =========================================================
   Settings — theme + wallpaper + system info
   ========================================================= */
const WALLPAPERS = [
  { id:'bloom',    label:'Bloom',    a:'#2E7CF6', b:'#33C6C1', c:'#7C5CFF', d:'#8FD3FE' },
  { id:'sunrise',  label:'Sunrise',  a:'#FF8A5C', b:'#FFC93C', c:'#FF5C8A', d:'#FFD6A5' },
  { id:'glow',     label:'Glow',     a:'#33C6C1', b:'#5FE0A5', c:'#2E7CF6', d:'#9BE8D8' },
  { id:'flow',     label:'Flow',     a:'#3AA0FF', b:'#66E3FF', c:'#2E7CF6', d:'#B8E8FF' },
  { id:'captured', label:'Captured Motion', a:'#7C5CFF', b:'#B18CFF', c:'#FF5C8A', d:'#D8C6FF' },
  { id:'mono',     label:'Monochrome', a:'#6E6E76', b:'#9B9BA3', c:'#3D3D42', d:'#C4C4CC' },
];

function applyWallpaper(id){
  const w = WALLPAPERS.find(x => x.id === id) || WALLPAPERS[0];
  const root = document.documentElement.style;
  root.setProperty('--wp-a', w.a);
  root.setProperty('--wp-b', w.b);
  root.setProperty('--wp-c', w.c);
  root.setProperty('--wp-d', w.d);
}

AppRegistry.register('settings', {
  title: 'Settings',
  icon: Icons.settings(),
  color: 'linear-gradient(135deg,#8b91a8,#c4c9dc)',
  defaultSize: { w: 680, h: 480 },
  singleInstance: true,
  async mount(body, ctx){
    const panes = ['Personalization','System','Apps','About'];
    let active = ctx.opts.pane === 'personalization' ? 'Personalization' : 'Personalization';

    body.innerHTML = `
      <div class="settings-body">
        <div class="settings-nav" id="st-nav"></div>
        <div class="settings-pane" id="st-pane"></div>
      </div>`;
    const nav = body.querySelector('#st-nav');
    const pane = body.querySelector('#st-pane');

    nav.innerHTML = panes.map(p => `<div class="sn-item ${p===active?'active':''}" data-p="${p}">${p}</div>`).join('');
    nav.querySelectorAll('.sn-item').forEach(el => el.addEventListener('click', () => {
      active = el.dataset.p;
      nav.querySelectorAll('.sn-item').forEach(i=>i.classList.remove('active'));
      el.classList.add('active');
      renderPane();
    }));

    async function renderPane(){
      if(active === 'Personalization') await renderPersonalization();
      else if(active === 'System') renderSystem();
      else if(active === 'Apps') renderApps();
      else renderAbout();
    }

    async function renderPersonalization(){
      const theme = document.documentElement.dataset.theme || 'dark';
      const savedWallpaper = await AuroraStorage.kvGet('wallpaper', 'bloom');
      pane.innerHTML = `
        <h2>Personalization</h2>
        <div class="settings-row">
          <div><div class="sr-label">Dark mode</div><div class="sr-desc">Switch between light and dark appearance</div></div>
          <div class="switch ${theme==='dark'?'on':''}" id="st-theme-switch"><div class="knob"></div></div>
        </div>
        <div class="settings-row" style="border-bottom:none;flex-direction:column;align-items:stretch;">
          <div class="sr-label">Wallpaper</div>
          <div class="sr-desc">Choose an accent palette for your desktop</div>
          <div class="wallpaper-grid" id="st-wallpapers"></div>
        </div>`;
      pane.querySelector('#st-theme-switch').addEventListener('click', () => Bus.emit('system:toggle-theme'));
      const grid = pane.querySelector('#st-wallpapers');
      grid.innerHTML = WALLPAPERS.map(w => `
        <div class="wallpaper-swatch ${w.id===savedWallpaper?'active':''}" data-w="${w.id}"
             style="background:linear-gradient(135deg,${w.a},${w.b},${w.c},${w.d})" title="${w.label}"></div>`).join('');
      grid.querySelectorAll('.wallpaper-swatch').forEach(el => el.addEventListener('click', async () => {
        grid.querySelectorAll('.wallpaper-swatch').forEach(s=>s.classList.remove('active'));
        el.classList.add('active');
        applyWallpaper(el.dataset.w);
        await AuroraStorage.kvSet('wallpaper', el.dataset.w);
        Notifications.push({ icon:'🖼️', title:'Wallpaper updated', silent:true });
      }));
    }

    function renderSystem(){
      pane.innerHTML = `
        <h2>System</h2>
        <div class="settings-row"><div class="sr-label">OS</div><div>Aurora OS · web edition</div></div>
        <div class="settings-row"><div class="sr-label">Screen resolution</div><div>${window.innerWidth} × ${window.innerHeight}</div></div>
        <div class="settings-row"><div class="sr-label">Input device</div><div>${InputEngine.device}</div></div>
        <div class="settings-row"><div class="sr-label">Renderer</div><div>${navigator.userAgent.includes('Chrome')?'Chromium':'Browser engine'}</div></div>
        <div class="settings-row" style="border-bottom:none;"><div class="sr-label">Storage</div><div>IndexedDB</div></div>`;
    }

    function renderApps(){
      pane.innerHTML = `<h2>Installed apps</h2><div id="st-app-list"></div>`;
      const list = pane.querySelector('#st-app-list');
      list.innerHTML = AppRegistry.all().map(a => `
        <div class="settings-row"><div style="display:flex;align-items:center;gap:10px;"><span style="width:22px;height:22px;display:inline-flex;">${a.icon}</span><span class="sr-label">${a.title}</span></div>
        <button class="qtoggle" style="padding:6px 12px;" data-open="${a.id}">Open</button></div>`).join('');
      list.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => WindowManager.open(b.dataset.open)));
    }

    function renderAbout(){
      pane.innerHTML = `
        <h2>About Aurora OS</h2>
        <p style="color:var(--text-2);font-size:13px;line-height:1.7;">
          Aurora OS is a desktop environment built entirely with HTML, CSS, and JavaScript —
          a window manager, taskbar, file system, and a handful of apps running in your browser tab.
          Everything you create is saved locally via IndexedDB.
        </p>`;
    }

    await renderPane();
  }
});
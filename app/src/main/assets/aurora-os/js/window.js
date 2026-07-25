/* =========================================================
   WindowManager — engine/window.js
   Handles the full lifecycle of app windows: spawn, drag,
   resize, snap-to-edge, maximize, minimize, focus, close.
   ========================================================= */
const WindowManager = (() => {
  let zTop = 100;
  const windows = new Map(); // id -> {el, app, state}
  let cascadeOffset = 0;
  let desktopCount = 1;
  let currentDesktop = 0;

  function layerEl(){ return document.getElementById('windows-layer'); }
  function deskRect(){ return document.getElementById('desktop').getBoundingClientRect(); }

  function open(appId, opts={}){
    const app = AppRegistry.get(appId);
    if(!app){ console.warn('Unknown app', appId); return; }

    // Single-instance apps: focus existing window instead of duplicating
    if(app.singleInstance){
      const existing = [...windows.values()].find(w => w.appId === appId);
      if(existing){ restore(existing.id); focus(existing.id); return existing.id; }
    }

    const id = 'win-' + Math.random().toString(36).slice(2,9);
    const size = opts.size || app.defaultSize;
    const rect = deskRect();
    cascadeOffset = (cascadeOffset + 28) % 160;
    const x = opts.x ?? Math.max(20, (rect.width - size.w)/2 + cascadeOffset - 80);
    const y = opts.y ?? Math.max(20, (rect.height - size.h)/2 + cascadeOffset - 80);

    const el = document.createElement('div');
    el.className = 'window';
    el.style.width = size.w + 'px';
    el.style.height = size.h + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.zIndex = ++zTop;
    el.dataset.winId = id;

    el.innerHTML = `
      <div class="window-titlebar">
        <span class="window-icon">${app.icon}</span>
        <span class="window-title">${app.title}</span>
        <div class="window-controls">
          <button class="win-ctrl min" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 24 24"><rect x="4" y="18" width="16" height="2" fill="currentColor"/></svg>
          </button>
          <button class="win-ctrl max" title="Maximize">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/></svg>
          </button>
          <button class="win-ctrl close" title="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="window-body"></div>
      <div class="resize-handle n"></div><div class="resize-handle s"></div>
      <div class="resize-handle e"></div><div class="resize-handle w"></div>
      <div class="resize-handle ne"></div><div class="resize-handle nw"></div>
      <div class="resize-handle se"></div><div class="resize-handle sw"></div>
    `;
    layerEl().appendChild(el);

    const state = { id, appId, el, maximized:false, minimized:false, prevRect:null, desktop: opts.desktop ?? currentDesktop };
    windows.set(id, state);

    // Mount app content
    try{
      app.mount(el.querySelector('.window-body'), { winId:id, opts, close:()=>close(id), setTitle:(t)=>{ el.querySelector('.window-title').textContent = t; } });
    }catch(e){ console.error('App mount failed', appId, e); }

    bindWindowEvents(state);
    focus(id);
    Bus.emit('window:opened', { id, appId, title:app.title, icon:app.icon });
    return id;
  }

  function bindWindowEvents(state){
    const { el, id } = state;
    el.addEventListener('mousedown', () => focus(id));
    el.addEventListener('touchstart', () => focus(id), { passive:true });

    el.querySelector('.win-ctrl.close').addEventListener('click', (e)=>{ e.stopPropagation(); close(id); });
    el.querySelector('.win-ctrl.min').addEventListener('click', (e)=>{ e.stopPropagation(); minimize(id); });
    el.querySelector('.win-ctrl.max').addEventListener('click', (e)=>{ e.stopPropagation(); toggleMaximize(id); });

    const titlebar = el.querySelector('.window-titlebar');
    titlebar.addEventListener('dblclick', () => toggleMaximize(id));
    titlebar.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      const count = getDesktopCount();
      const items = [];
      for(let i=0;i<count;i++){
        if(i === state.desktop) continue;
        items.push({ label:`Move to Desktop ${i+1}`, icon:'🖥️', action:()=>moveWindowToDesktop(id, i) });
      }
      items.push({ label:'Move to new Desktop', icon:'➕', action:()=>{ const idx = addDesktop(); moveWindowToDesktop(id, idx); } });
      if(typeof Desktop !== 'undefined' && Desktop.showContextMenu) Desktop.showContextMenu(e.clientX, e.clientY, items);
    });
    makeDraggable(state, titlebar);

    el.querySelectorAll('.resize-handle').forEach(h => makeResizable(state, h));
  }

  function makeDraggable(state, handle){
    let sx, sy, ox, oy, dragging=false;
    const onDown = (e) => {
      if(state.maximized) return;
      const p = point(e);
      sx = p.x; sy = p.y;
      const r = state.el.getBoundingClientRect();
      const dr = deskRect();
      ox = r.left - dr.left; oy = r.top - dr.top;
      dragging = true;
      state.el.classList.add('dragging');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive:false });
      document.addEventListener('touchend', onUp);
    };
    const onMove = (e) => {
      if(!dragging) return;
      e.preventDefault && e.preventDefault();
      const p = point(e);
      const dx = p.x - sx, dy = p.y - sy;
      let nx = ox + dx, ny = Math.max(0, oy + dy);
      state.el.style.left = nx + 'px';
      state.el.style.top = ny + 'px';
      showSnapPreview(p);
    };
    const onUp = (e) => {
      dragging = false;
      state.el.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const p = point(e.changedTouches ? e.changedTouches[0] : e);
      applySnap(state, p);
      hideSnapPreview();
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive:true });
  }

  function point(e){
    if(e.touches && e.touches[0]) return { x:e.touches[0].clientX, y:e.touches[0].clientY };
    if(e.changedTouches && e.changedTouches[0]) return { x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY };
    return { x:e.clientX, y:e.clientY };
  }

  const SNAP_MARGIN = 24;
  let snapEl = null;
  function ensureSnapEl(){
    if(!snapEl){
      snapEl = document.createElement('div');
      snapEl.className = 'snap-indicator';
      snapEl.style.display = 'none';
      document.getElementById('desktop').appendChild(snapEl);
    }
    return snapEl;
  }
  function computeSnapZone(p){
    const dr = deskRect();
    const x = p.x - dr.left, y = p.y - dr.top;
    if(x < SNAP_MARGIN) return 'left';
    if(x > dr.width - SNAP_MARGIN) return 'right';
    if(y < SNAP_MARGIN) return 'top';
    return null;
  }
  function zoneRect(zone){
    const dr = deskRect();
    switch(zone){
      case 'left': return { x:0, y:0, w:dr.width/2, h:dr.height };
      case 'right': return { x:dr.width/2, y:0, w:dr.width/2, h:dr.height };
      case 'top': return { x:0, y:0, w:dr.width, h:dr.height };
      default: return null;
    }
  }
  function showSnapPreview(p){
    const zone = computeSnapZone(p);
    const el = ensureSnapEl();
    if(!zone){ el.style.display = 'none'; return; }
    const r = zoneRect(zone);
    el.style.display = 'block';
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px';
    el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
  }
  function hideSnapPreview(){ if(snapEl) snapEl.style.display = 'none'; }
  function applySnap(state, p){
    const zone = computeSnapZone(p);
    if(!zone) return;
    const r = zoneRect(zone);
    if(zone === 'top'){ toggleMaximize(state.id, true); return; }
    if(!state.prevRect) state.prevRect = currentRect(state);
    Object.assign(state.el.style, { left:r.x+'px', top:r.y+'px', width:r.w+'px', height:r.h+'px' });
  }

  function currentRect(state){
    return { left:state.el.style.left, top:state.el.style.top, width:state.el.style.width, height:state.el.style.height };
  }

  function makeResizable(state, handle){
    const cls = [...handle.classList].find(c => c !== 'resize-handle');
    let sx, sy, sw, sh, sl, st, active=false;
    const onDown = (e) => {
      if(state.maximized) return;
      e.stopPropagation();
      const p = point(e);
      sx = p.x; sy = p.y;
      const r = state.el.getBoundingClientRect();
      const dr = deskRect();
      sw = r.width; sh = r.height; sl = r.left - dr.left; st = r.top - dr.top;
      active = true;
      state.el.classList.add('resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive:false });
      document.addEventListener('touchend', onUp);
    };
    const onMove = (e) => {
      if(!active) return;
      e.preventDefault && e.preventDefault();
      const p = point(e);
      const dx = p.x - sx, dy = p.y - sy;
      let w = sw, h = sh, l = sl, t = st;
      if(cls.includes('e')) w = Math.max(320, sw + dx);
      if(cls.includes('s')) h = Math.max(200, sh + dy);
      if(cls.includes('w')){ w = Math.max(320, sw - dx); l = sl + (sw - w); }
      if(cls.includes('n')){ h = Math.max(200, sh - dy); t = st + (sh - h); }
      Object.assign(state.el.style, { width:w+'px', height:h+'px', left:l+'px', top:t+'px' });
    };
    const onUp = () => {
      active = false;
      state.el.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive:true });
  }

  function focus(id){
    const state = windows.get(id);
    if(!state) return;
    windows.forEach(w => w.el.classList.remove('focused'));
    state.el.classList.add('focused');
    state.el.style.zIndex = ++zTop;
    Bus.emit('window:focused', { id });
  }

  function close(id){
    const state = windows.get(id);
    if(!state) return;
    state.el.classList.add('closing');
    setTimeout(() => { state.el.remove(); windows.delete(id); Bus.emit('window:closed', { id }); }, 180);
  }

  function minimize(id){
    const state = windows.get(id);
    if(!state) return;
    state.minimized = true;
    state.el.classList.add('minimized');
    Bus.emit('window:minimized', { id });
  }

  function restore(id){
    const state = windows.get(id);
    if(!state) return;
    state.minimized = false;
    state.el.classList.remove('minimized');
    focus(id);
    Bus.emit('window:restored', { id });
  }

  function toggleMinimizeOrFocus(id){
    const state = windows.get(id);
    if(!state) return;
    if(state.minimized || !state.el.classList.contains('focused')) restore(id);
    else minimize(id);
  }

  function toggleMaximize(id, force){
    const state = windows.get(id);
    if(!state) return;
    const shouldMax = force !== undefined ? force : !state.maximized;
    if(shouldMax){
      state.prevRect = state.prevRect || currentRect(state);
      state.maximized = true;
      state.el.classList.add('maximized');
      Object.assign(state.el.style, { left:'0px', top:'0px', width:'100%', height:'100%' });
    } else {
      state.maximized = false;
      state.el.classList.remove('maximized');
      if(state.prevRect) Object.assign(state.el.style, state.prevRect);
      state.prevRect = null;
    }
    focus(id);
  }

  function closeAll(){ [...windows.keys()].forEach(close); }
  function list(){ return [...windows.values()]; }
  function cycleFocus(){
    const arr = list().filter(w => !w.minimized && w.desktop === currentDesktop);
    if(arr.length < 2) return;
    const currentIdx = arr.findIndex(w => w.el.classList.contains('focused'));
    const next = arr[(currentIdx + 1) % arr.length];
    focus(next.id);
  }

  // ---- Virtual desktops ----
  function applyDesktopVisibility(){
    windows.forEach(w => w.el.classList.toggle('off-desktop', w.desktop !== currentDesktop));
    Bus.emit('desktop:switched', { index: currentDesktop, count: desktopCount });
  }
  function getCurrentDesktop(){ return currentDesktop; }
  function getDesktopCount(){ return desktopCount; }
  function switchDesktop(index){
    if(index < 0 || index >= desktopCount) return;
    currentDesktop = index;
    applyDesktopVisibility();
  }
  function addDesktop(){
    desktopCount++;
    Bus.emit('desktop:switched', { index: currentDesktop, count: desktopCount });
    return desktopCount - 1;
  }
  function removeDesktop(index){
    if(desktopCount <= 1) return;
    // Move any windows on the removed desktop to the desktop before it
    const fallback = Math.max(0, index - 1);
    windows.forEach(w => { if(w.desktop === index) w.desktop = fallback; else if(w.desktop > index) w.desktop -= 1; });
    desktopCount--;
    if(currentDesktop >= index) currentDesktop = Math.max(0, currentDesktop - 1);
    applyDesktopVisibility();
  }
  function moveWindowToDesktop(id, index){
    const state = windows.get(id);
    if(!state || index < 0 || index >= desktopCount) return;
    state.desktop = index;
    applyDesktopVisibility();
  }
  function windowsOnDesktop(index){ return list().filter(w => w.desktop === index); }

  return {
    open, close, minimize, restore, toggleMinimizeOrFocus, toggleMaximize, focus, list, closeAll, cycleFocus,
    getCurrentDesktop, getDesktopCount, switchDesktop, addDesktop, removeDesktop, moveWindowToDesktop, windowsOnDesktop
  };
})();

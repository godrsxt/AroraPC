/* =========================================================
   Notepad — a faithful clone of the modern Windows Notepad:
   tabbed documents, a simple menu bar (File/Edit/View/Help),
   Find & Replace, word-wrap and zoom, and a Ln/Col status bar.
   Files are saved into the real virtual file system.
   ========================================================= */
AppRegistry.register('notepad', {
  title: 'Notepad',
  icon: Icons.notepad(),
  defaultSize: { w: 640, h: 500 },
  singleInstance: true,
  mount(body, ctx){
    let tabs = [];       // {id, path, name, dirty, content, wrap, zoom}
    let activeId = null;
    let tabSeq = 0;

    body.innerHTML = `
      <div class="notepad-body">
        <div class="notepad-tabs" id="np-tabs"></div>
        <div class="notepad-menubar" id="np-menubar">
          <button data-menu="file">File</button>
          <button data-menu="edit">Edit</button>
          <button data-menu="view">View</button>
        </div>
        <div class="notepad-find hidden" id="np-find">
          <input type="text" id="np-find-input" placeholder="Find">
          <button id="np-find-next" class="app-toolbar-btn">Find next</button>
          <input type="text" id="np-replace-input" placeholder="Replace with">
          <button id="np-replace-btn">Replace</button>
          <button id="np-find-close">✕</button>
        </div>
        <textarea class="notepad-area" id="np-area" spellcheck="false"></textarea>
        <div class="status-bar">
          <span id="np-linecol">Ln 1, Col 1</span>
          <span class="sb-spacer"></span>
          <span id="np-wrap-status">Windows (CRLF)</span>
          <span class="sb-sep"></span>
          <span id="np-zoom">100%</span>
        </div>
      </div>`;

    const tabsEl = body.querySelector('#np-tabs');
    const area = body.querySelector('#np-area');
    const menubar = body.querySelector('#np-menubar');
    const findBar = body.querySelector('#np-find');
    const findInput = body.querySelector('#np-find-input');
    const replaceInput = body.querySelector('#np-replace-input');
    const lineColEl = body.querySelector('#np-linecol');
    const zoomEl = body.querySelector('#np-zoom');

    function active(){ return tabs.find(t => t.id === activeId); }

    function newTab(data={}){
      tabSeq++;
      const tab = { id:'t'+tabSeq, path:data.path||null, name:data.name||'Untitled', dirty:false, content:data.content||'', wrap:true, zoom:100 };
      tabs.push(tab);
      return tab;
    }

    function renderTabs(){
      tabsEl.innerHTML = tabs.map(t => `
        <div class="notepad-tab ${t.id===activeId?'active':''}" data-id="${t.id}">
          <span class="nt-name">${t.dirty?'• ':''}${t.name}</span>
          <span class="nt-close" data-close="${t.id}">✕</span>
        </div>`).join('') + `<div class="nt-add" id="np-add-tab" title="New tab (Ctrl+N)">+</div>`;
      tabsEl.querySelectorAll('.notepad-tab').forEach(el => {
        el.addEventListener('click', (e) => {
          if(e.target.closest('[data-close]')) return;
          switchTo(el.dataset.id);
        });
      });
      tabsEl.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', (e) => { e.stopPropagation(); closeTab(el.dataset.close); });
      });
      tabsEl.querySelector('#np-add-tab').addEventListener('click', () => { const t = newTab(); renderTabs(); switchTo(t.id); });
    }

    function switchTo(id){
      if(active()) active().content = area.value;
      activeId = id;
      const t = active();
      if(!t) return;
      area.value = t.content;
      area.classList.toggle('wrap', t.wrap);
      zoomEl.textContent = t.zoom + '%';
      area.style.fontSize = (14 * t.zoom / 100) + 'px';
      ctx.setTitle(`${t.dirty?'• ':''}${t.name} - Notepad`);
      renderTabs();
      area.focus();
      updateLineCol();
    }

    function closeTab(id){
      const idx = tabs.findIndex(t => t.id === id);
      if(idx === -1) return;
      tabs.splice(idx, 1);
      if(tabs.length === 0){ ctx.close(); return; }
      if(activeId === id) switchTo(tabs[Math.max(0, idx-1)].id);
      else renderTabs();
    }

    function updateLineCol(){
      const val = area.value.slice(0, area.selectionStart);
      const lines = val.split('\n');
      lineColEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length + 1}`;
    }

    async function saveActive(saveAs=false){
      const t = active();
      if(!t) return;
      t.content = area.value;
      let targetPath = t.path;
      if(!targetPath || saveAs){
        const name = prompt('Save as (file name):', t.name === 'Untitled' ? 'Untitled.txt' : t.name);
        if(!name) return;
        const fname = name.includes('.') ? name : name + '.txt';
        const rec = await AuroraStorage.createTextFile('/Documents', fname, t.content);
        targetPath = rec.path;
        t.name = rec.name;
      } else {
        const rec = await AuroraStorage.fileGet(targetPath);
        if(rec){ rec.content = t.content; rec.modified = Date.now(); await AuroraStorage.fileSet(rec); }
      }
      t.path = targetPath;
      t.dirty = false;
      renderTabs();
      ctx.setTitle(`${t.name} - Notepad`);
      Notifications.push({ icon:'💾', title:'Saved', body:t.name, silent:true });
      Bus.emit('fs:changed');
    }

    async function openPicker(){
      const all = await AuroraStorage.filesAll();
      const files = all.filter(f => f.type === 'text' && !f.deleted);
      if(files.length === 0){ alert('No text files found. Save one first, or create files from File Explorer.'); return; }
      const listing = files.map((f,i) => `${i+1}. ${f.path}`).join('\n');
      const choice = prompt(`Open which file? Enter a number:\n\n${listing}`);
      const idx = parseInt(choice, 10) - 1;
      if(isNaN(idx) || !files[idx]) return;
      openFile(files[idx].path);
    }

    async function openFile(path){
      const rec = await AuroraStorage.fileGet(path);
      if(!rec) return;
      const existing = tabs.find(t => t.path === path);
      if(existing){ switchTo(existing.id); return; }
      const t = newTab({ path, name:rec.name, content:rec.content });
      renderTabs();
      switchTo(t.id);
    }

    // ---- Menus ----
    const MENUS = {
      file: [
        { label:'New tab', key:'Ctrl+N', action:()=>{ const t = newTab(); renderTabs(); switchTo(t.id); } },
        { label:'Open…', key:'Ctrl+O', action:openPicker },
        { label:'Save', key:'Ctrl+S', action:()=>saveActive(false) },
        { label:'Save as…', key:'Ctrl+Shift+S', action:()=>saveActive(true) },
        { sep:true },
        { label:'Close tab', key:'Ctrl+W', action:()=>closeTab(activeId) },
      ],
      edit: [
        { label:'Find / Replace', key:'Ctrl+F', action:()=>toggleFind(true) },
        { label:'Select all', key:'Ctrl+A', action:()=>{ area.focus(); area.select(); } },
        { label:'Time/Date', key:'F5', action:()=>{ insertAtCursor(new Date().toLocaleString()); } },
      ],
      view: [
        { label:'Word wrap', key:'', toggle:true, get:()=>active()?.wrap, action:()=>{ const t=active(); if(!t) return; t.wrap=!t.wrap; area.classList.toggle('wrap', t.wrap); } },
        { label:'Zoom in', key:'Ctrl+=', action:()=>zoom(10) },
        { label:'Zoom out', key:'Ctrl+-', action:()=>zoom(-10) },
        { label:'Reset zoom', key:'Ctrl+0', action:()=>zoom(0, true) },
      ],
    };

    function insertAtCursor(text){
      const s = area.selectionStart, e = area.selectionEnd;
      area.value = area.value.slice(0,s) + text + area.value.slice(e);
      area.selectionStart = area.selectionEnd = s + text.length;
      markDirty();
    }

    function zoom(delta, reset=false){
      const t = active(); if(!t) return;
      t.zoom = reset ? 100 : Math.min(200, Math.max(50, t.zoom + delta));
      zoomEl.textContent = t.zoom + '%';
      area.style.fontSize = (14 * t.zoom / 100) + 'px';
    }

    let openMenu = null;
    function closeMenus(){
      menubar.querySelectorAll('.notepad-dropdown').forEach(d => d.remove());
      menubar.querySelectorAll('button').forEach(b => b.classList.remove('open'));
      openMenu = null;
    }
    function openDropdown(name, btn){
      closeMenus();
      openMenu = name;
      btn.classList.add('open');
      const dd = document.createElement('div');
      dd.className = 'notepad-dropdown';
      dd.innerHTML = MENUS[name].map(item => item.sep
        ? `<div class="cm-sep"></div>`
        : `<div class="nd-item" data-a="${MENUS[name].indexOf(item)}">
             <span>${item.toggle && item.get && item.get() ? '✓ ' : ''}${item.label}</span>
             <span class="nd-key">${item.key||''}</span>
           </div>`).join('');
      menubar.appendChild(dd);
      dd.querySelectorAll('.nd-item').forEach(el => {
        el.addEventListener('click', () => { MENUS[name][+el.dataset.a].action(); closeMenus(); });
      });
    }
    menubar.querySelectorAll('[data-menu]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(openMenu === btn.dataset.menu) closeMenus();
        else openDropdown(btn.dataset.menu, btn);
      });
    });
    document.addEventListener('click', (e) => { if(!e.target.closest('.notepad-menubar')) closeMenus(); });

    function toggleFind(show){
      findBar.classList.toggle('hidden', !show);
      if(show) findInput.focus();
    }
    body.querySelector('#np-find-close').addEventListener('click', () => toggleFind(false));
    body.querySelector('#np-find-next').addEventListener('click', () => {
      const q = findInput.value; if(!q) return;
      const from = area.selectionEnd || 0;
      let idx = area.value.indexOf(q, from);
      if(idx === -1) idx = area.value.indexOf(q);
      if(idx === -1) return;
      area.focus(); area.setSelectionRange(idx, idx + q.length);
    });
    body.querySelector('#np-replace-btn').addEventListener('click', () => {
      const q = findInput.value, r = replaceInput.value; if(!q) return;
      area.value = area.value.split(q).join(r);
      markDirty();
    });

    function markDirty(){
      const t = active(); if(!t) return;
      t.dirty = true;
      renderTabs();
      ctx.setTitle(`• ${t.name} - Notepad`);
    }
    area.addEventListener('input', markDirty);
    area.addEventListener('keyup', updateLineCol);
    area.addEventListener('click', updateLineCol);

    document.addEventListener('keydown', function shortcut(e){
      if(!document.body.contains(body)){ document.removeEventListener('keydown', shortcut); return; }
      if(!body.contains(document.activeElement)) return;
      if(e.ctrlKey && e.key.toLowerCase() === 's'){ e.preventDefault(); saveActive(e.shiftKey); }
      else if(e.ctrlKey && e.key.toLowerCase() === 'n'){ e.preventDefault(); const t = newTab(); renderTabs(); switchTo(t.id); }
      else if(e.ctrlKey && e.key.toLowerCase() === 'o'){ e.preventDefault(); openPicker(); }
      else if(e.ctrlKey && e.key.toLowerCase() === 'f'){ e.preventDefault(); toggleFind(true); }
      else if(e.ctrlKey && e.key.toLowerCase() === 'w'){ e.preventDefault(); closeTab(activeId); }
      else if(e.key === 'Escape'){ toggleFind(false); }
    });

    // Boot with either a requested file or a fresh Untitled tab
    (async () => {
      if(ctx.opts.path){ await openFile(ctx.opts.path); }
      else { const t = newTab(); renderTabs(); switchTo(t.id); }
    })();
  }
});
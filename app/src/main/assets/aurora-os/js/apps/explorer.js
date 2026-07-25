/* =========================================================
   File Explorer — Windows 11 style. Real nested folders,
   breadcrumb address bar, create/rename/delete, and full
   drag & drop (move items between folders, import real
   files from the user's computer).
   ========================================================= */
AppRegistry.register('explorer', {
  title: 'File Explorer',
  icon: Icons.explorer(),
  defaultSize: { w: 820, h: 540 },
  async mount(body, ctx){
    const QUICK_ACCESS = [
      { path:'/Desktop', label:'Desktop' },
      { path:'/Documents', label:'Documents' },
      { path:'/Pictures', label:'Pictures' },
      { path:'/Downloads', label:'Downloads' },
      { path:'/Music', label:'Music' },
      { path:'/Videos', label:'Videos' },
    ];
    let currentPath = ctx.opts.folder || '/Documents';
    let selectedPath = null;

    body.innerHTML = `
      <div class="explorer-body">
        <div class="app-toolbar">
          <button id="ex-new-folder">📁 New folder</button>
          <button id="ex-new-file">📄 New text document</button>
          <div class="tb-sep"></div>
          <button id="ex-rename">✏️ Rename</button>
          <button id="ex-delete">🗑️ Delete</button>
          <div class="tb-sep"></div>
          <button id="ex-refresh">↻ Refresh</button>
        </div>
        <div class="explorer-addressbar" id="ex-address"></div>
        <div class="explorer-main-row">
          <div class="explorer-sidebar" id="ex-sidebar"></div>
          <div class="explorer-main" id="ex-main">
            <div class="explorer-grid" id="ex-grid"></div>
          </div>
        </div>
        <div class="status-bar"><span id="ex-count"></span><span class="sb-spacer"></span><span id="ex-selected"></span></div>
      </div>`;

    const sidebar = body.querySelector('#ex-sidebar');
    const grid = body.querySelector('#ex-grid');
    const mainEl = body.querySelector('#ex-main');
    const addressBar = body.querySelector('#ex-address');
    const countLabel = body.querySelector('#ex-count');
    const selLabel = body.querySelector('#ex-selected');

    function renderSidebar(){
      sidebar.innerHTML = `<div class="sb-section">Quick access</div>` + QUICK_ACCESS.map(q => `
        <div class="sb-item ${q.path===currentPath?'active':''}" data-path="${q.path}">
          <span class="sb-icon">${Icons.folder()}</span><span>${q.label}</span>
        </div>`).join('');
      sidebar.querySelectorAll('.sb-item').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.path));
        bindDropTarget(el, el.dataset.path);
      });
    }

    function renderAddress(){
      const parts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);
      let acc = '';
      let html = `<span class="addr-crumb ${currentPath==='/'?'current':''}" data-p="/">This PC</span>`;
      parts.forEach((p, i) => {
        acc += '/' + p;
        const isLast = i === parts.length - 1;
        html += `<span class="addr-sep">›</span><span class="addr-crumb ${isLast?'current':''}" data-p="${acc}">${p}</span>`;
      });
      addressBar.innerHTML = html;
      addressBar.querySelectorAll('.addr-crumb').forEach(el => el.addEventListener('click', () => navigate(el.dataset.p)));
    }

    function iconFor(item){
      if(item.type === 'folder') return Icons.folder();
      if(item.type === 'image') return Icons.fileImage();
      return Icons.fileText();
    }

    function clearSelection(){
      selectedPath = null;
      grid.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
      selLabel.textContent = '';
    }

    async function renderGrid(){
      renderAddress();
      renderSidebar();
      const children = await AuroraStorage.listChildren(currentPath);
      countLabel.textContent = `${children.length} item${children.length===1?'':'s'}`;
      if(children.length === 0){
        grid.innerHTML = `<div class="explorer-empty" style="grid-column:1/-1;">This folder is empty. Right-click for New, or drag files in from your computer.</div>`;
        return;
      }
      grid.innerHTML = children.map(f => `
        <div class="file-item" data-path="${f.path}" data-type="${f.type}" data-name="${f.name}" draggable="true">
          <div class="f-icon">${iconFor(f)}</div>
          <div class="f-name">${f.name}</div>
        </div>`).join('');

      grid.querySelectorAll('.file-item').forEach(el => {
        const path = el.dataset.path, type = el.dataset.type;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          clearSelection();
          selectedPath = path;
          el.classList.add('selected');
          selLabel.textContent = el.dataset.name;
        });
        el.addEventListener('dblclick', () => openItem(path, type));
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          clearSelection(); selectedPath = path; el.classList.add('selected'); selLabel.textContent = el.dataset.name;
          Desktop.showContextMenu(e.clientX, e.clientY, [
            { label:'Open', icon:'📂', action:()=>openItem(path, type) },
            { sep:true },
            { label:'Rename', icon:'✏️', action:()=>renamePrompt(path) },
            { label:'Move to Recycle Bin', icon:'🗑️', danger:true, action:()=>deleteItem(path) },
          ]);
        });

        // Drag a file/folder to move it
        el.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('application/x-aurora-path', path);
          e.dataTransfer.effectAllowed = 'move';
        });
        if(type === 'folder') bindDropTarget(el, path);
      });
    }

    function bindDropTarget(el, targetFolder){
      el.addEventListener('dragover', (e) => {
        if(![...e.dataTransfer.types].includes('application/x-aurora-path') && !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        el.classList.add('drag-target');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-target'));
      el.addEventListener('drop', async (e) => {
        el.classList.remove('drag-target');
        const internalPath = e.dataTransfer.getData('application/x-aurora-path');
        if(internalPath){
          e.preventDefault(); e.stopPropagation();
          if(internalPath === targetFolder) return;
          await AuroraStorage.moveEntry(internalPath, targetFolder);
          Bus.emit('fs:changed');
          return;
        }
        const files = [...(e.dataTransfer?.files || [])];
        if(files.length){
          e.preventDefault(); e.stopPropagation();
          for(const file of files) await AuroraStorage.importFile(file, targetFolder);
          Notifications.push({ icon:'⬇️', title:`Imported ${files.length} file${files.length>1?'s':''}`, body:targetFolder, silent:false });
          Bus.emit('fs:changed');
        }
      });
    }

    function openItem(path, type){
      if(type === 'folder') navigate(path);
      else if(type === 'image') WindowManager.open('gallery', { path });
      else WindowManager.open('notepad', { path });
    }

    function navigate(path){
      currentPath = path;
      clearSelection();
      renderGrid();
    }

    async function renamePrompt(path){
      const rec = await AuroraStorage.fileGet(path);
      if(!rec) return;
      const next = prompt('Rename to:', rec.name);
      if(!next || next === rec.name) return;
      await AuroraStorage.renameEntry(path, next);
      Bus.emit('fs:changed');
    }

    async function deleteItem(path){
      const rec = await AuroraStorage.fileGet(path);
      if(!rec) return;
      await AuroraStorage.trashEntry(path);
      Bus.emit('fs:changed');
      Notifications.push({ icon:'🗑️', title:'Moved to Recycle Bin', body:rec.name, silent:true });
    }

    // Toolbar actions
    body.querySelector('#ex-new-folder').addEventListener('click', async () => {
      await AuroraStorage.createFolder(currentPath, 'New folder');
      Bus.emit('fs:changed');
    });
    body.querySelector('#ex-new-file').addEventListener('click', async () => {
      await AuroraStorage.createTextFile(currentPath, 'New Text Document.txt', '');
      Bus.emit('fs:changed');
    });
    body.querySelector('#ex-rename').addEventListener('click', () => { if(selectedPath) renamePrompt(selectedPath); });
    body.querySelector('#ex-delete').addEventListener('click', () => { if(selectedPath) deleteItem(selectedPath); });
    body.querySelector('#ex-refresh').addEventListener('click', renderGrid);

    // Right-click empty space -> New folder/file
    mainEl.addEventListener('contextmenu', (e) => {
      if(e.target.closest('.file-item')) return;
      e.preventDefault();
      Desktop.showContextMenu(e.clientX, e.clientY, [
        { label:'New folder', icon:'📁', action: async ()=>{ await AuroraStorage.createFolder(currentPath, 'New folder'); Bus.emit('fs:changed'); } },
        { label:'New text document', icon:'📄', action: async ()=>{ await AuroraStorage.createTextFile(currentPath, 'New Text Document.txt', ''); Bus.emit('fs:changed'); } },
        { sep:true },
        { label:'Refresh', icon:'↻', action: renderGrid },
      ]);
    });
    mainEl.addEventListener('click', clearSelection);

    // Drag & drop real OS files anywhere onto the folder view
    ;['dragover','dragenter'].forEach(evt => mainEl.addEventListener(evt, (e) => {
      if(!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault(); mainEl.classList.add('drag-over');
    }));
    ;['dragleave','drop'].forEach(evt => mainEl.addEventListener(evt, () => mainEl.classList.remove('drag-over')));
    mainEl.addEventListener('drop', async (e) => {
      if(e.target.closest('.file-item.drag-target') || e.target.closest('[data-path].sb-item')) return;
      const items = [...(e.dataTransfer?.files || [])];
      if(items.length === 0) return;
      e.preventDefault();
      for(const file of items) await AuroraStorage.importFile(file, currentPath);
      Notifications.push({ icon:'⬇️', title:`Imported ${items.length} file${items.length>1?'s':''}`, body: currentPath, silent:false });
      Bus.emit('fs:changed');
    });

    Bus.on('fs:changed', renderGrid);
    await AuroraStorage.seedDefaultFolders();
    await renderGrid();
  }
});

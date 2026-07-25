/* =========================================================
   Recycle Bin — holds soft-deleted files and folders from
   Explorer. Restoring a folder restores its whole subtree.
   ========================================================= */
AppRegistry.register('recyclebin', {
  title: 'Recycle Bin',
  icon: Icons.recyclebin(),
  defaultSize: { w: 640, h: 460 },
  singleInstance: true,
  async mount(body, ctx){
    body.innerHTML = `
      <div class="app-shell">
        <div class="app-toolbar">
          <span style="font-size:12px;color:var(--text-2);">Items here stay until you empty the bin</span>
          <span style="flex:1;"></span>
          <button id="rb-empty">🗑️ Empty Recycle Bin</button>
        </div>
        <div class="app-content"><div class="explorer-grid" id="rb-grid" style="padding:14px;"></div></div>
      </div>`;
    const grid = body.querySelector('#rb-grid');

    async function trashedRoots(){
      const all = await AuroraStorage.filesAll();
      const trashed = all.filter(f => f.deleted);
      // Only show the top of each deleted subtree (hide cascaded children)
      return trashed.filter(f => {
        const parentRec = all.find(p => p.path === f.parent);
        return !parentRec || !parentRec.deleted;
      });
    }

    function iconFor(f){
      if(f.type === 'folder') return Icons.folder();
      if(f.type === 'image') return Icons.fileImage();
      return Icons.fileText();
    }

    async function render(){
      const roots = await trashedRoots();
      if(roots.length === 0){
        grid.innerHTML = `<div class="explorer-empty" style="grid-column:1/-1;">Recycle Bin is empty.</div>`;
        return;
      }
      grid.innerHTML = roots.map(f => `
        <div class="file-item" data-path="${f.path}" title="Right-click for options">
          <div class="f-icon">${iconFor(f)}</div>
          <div class="f-name">${f.name}</div>
        </div>`).join('');
      grid.querySelectorAll('.file-item').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          const path = el.dataset.path;
          Desktop.showContextMenu(e.clientX, e.clientY, [
            { label:'Restore', icon:'↩️', action: async ()=>{
                const rec = await AuroraStorage.restoreEntry(path);
                Bus.emit('fs:changed');
                if(rec) Notifications.push({ icon:'↩️', title:'Restored', body:rec.name, silent:true });
              } },
            { label:'Delete permanently', icon:'❌', danger:true, action: async ()=>{
                await AuroraStorage.purgeEntry(path); Bus.emit('fs:changed');
              } },
          ]);
        });
      });
    }

    body.querySelector('#rb-empty').addEventListener('click', async () => {
      const roots = await trashedRoots();
      for(const f of roots) await AuroraStorage.purgeEntry(f.path);
      Bus.emit('fs:changed');
      Notifications.push({ icon:'🗑️', title:'Recycle Bin emptied', silent:true });
    });

    Bus.on('fs:changed', render);
    await render();
  }
});

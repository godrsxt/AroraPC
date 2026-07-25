/* =========================================================
   Gallery — grid viewer for saved images
   ========================================================= */
AppRegistry.register('gallery', {
  title: 'Photos',
  icon: Icons.photos(),
  defaultSize: { w: 640, h: 480 },
  pinned: false,
  async mount(body, ctx){
    body.innerHTML = `<div class="app-shell">
      <div class="app-toolbar"><span style="font-size:12px;color:var(--text-2);">Pictures saved from Paint</span></div>
      <div class="app-content"><div class="gallery-grid" id="gl-grid"></div></div>
    </div>`;
    const grid = body.querySelector('#gl-grid');
    async function render(){
      const all = await AuroraStorage.filesAll();
      const images = all.filter(f => f.type === 'image' && !f.deleted);
      if(images.length === 0){
        grid.innerHTML = `<div class="explorer-empty" style="grid-column:1/-1;">No images yet. Draw something in Paint and save it.</div>`;
        return;
      }
      grid.innerHTML = images.map(f => `<div class="gallery-tile" data-p="${f.path}"><img src="${f.content}" alt="${f.name}"></div>`).join('');
    }
    Bus.on('fs:changed', render);
    await render();
  }
});
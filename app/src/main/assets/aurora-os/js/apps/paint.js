/* =========================================================
   Paint — a Windows 11 Paint-style clone: ribbon toolbar,
   pencil/brush/eraser/fill/eyedropper/shapes/text tools,
   a real 2-color palette, and flood-fill on the canvas.
   Saves PNGs into the virtual file system (/Pictures).
   ========================================================= */
AppRegistry.register('paint', {
  title: 'Paint',
  icon: Icons.paint(),
  defaultSize: { w: 780, h: 580 },
  mount(body, ctx){
    const PALETTE = [
      '#000000','#7F7F7F','#880015','#ED1C24','#FF7F27','#FFF200','#22B14C','#00A2E8','#3F48CC','#A349A4',
      '#FFFFFF','#C3C3C3','#B97A57','#FFAEC9','#FFC90E','#EFE4B0','#B5E61D','#99D9EA','#7092BE','#C8BFE7',
    ];
    let tool = 'pencil';
    let size = 4;
    let color1 = '#000000', color2 = '#FFFFFF';
    let activeColorSlot = 1;
    let filename = 'Untitled';

    body.innerHTML = `
      <div class="paint-body">
        <div class="paint-quickbar">
          <button class="qb-btn" id="pt-file" title="File">☰</button>
          <span style="font-size:12px;color:var(--text-2);">${filename} - Paint</span>
        </div>
        <div class="paint-ribbon">
          <div class="ribbon-group">
            <div class="rg-row">
              <button class="ribbon-btn-lg" id="pt-new" title="New"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2h9l5 5v15H6V2Z" stroke="currentColor" stroke-width="1.6"/></svg><span>New</span></button>
              <button class="ribbon-btn-lg" id="pt-save" title="Save to Pictures"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 3h12l4 4v14H5V3Z" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="3" width="8" height="6" stroke="currentColor" stroke-width="1.6"/></svg><span>Save</span></button>
            </div>
          </div>
          <div class="ribbon-group">
            <div class="ribbon-tools-grid" id="pt-tools"></div>
            <div class="ribbon-label">Tools</div>
          </div>
          <div class="ribbon-group">
            <div class="ribbon-tools-grid" id="pt-shapes"></div>
            <div class="ribbon-label">Shapes</div>
          </div>
          <div class="ribbon-group">
            <div class="rg-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
              <input type="range" id="pt-size" min="1" max="40" value="4" style="width:90px;accent-color:var(--accent);">
              <span style="font-size:10px;color:var(--text-2);" id="pt-size-label">Size: 4px</span>
            </div>
            <div class="ribbon-label">Size</div>
          </div>
          <div class="ribbon-group">
            <div class="rg-row" style="gap:8px;align-items:center;">
              <div class="paint-current-colors" id="pt-current-colors">
                <div class="pc1" id="pt-color1" style="background:${color1}"></div>
                <div class="pc2" id="pt-color2" style="background:${color2}"></div>
              </div>
              <div class="paint-colors" id="pt-palette"></div>
              <input type="color" id="pt-custom-color" style="width:26px;height:26px;border:none;background:none;cursor:pointer;">
            </div>
            <div class="ribbon-label">Colors</div>
          </div>
        </div>
        <div class="paint-canvas-wrap" id="pt-wrap">
          <canvas id="pt-canvas" width="900" height="620"></canvas>
        </div>
        <div class="status-bar">
          <span id="pt-pos">0, 0px</span><span class="sb-sep"></span>
          <span id="pt-canvas-size">900 x 620px</span><span class="sb-spacer"></span>
          <span>100%</span>
        </div>
      </div>`;

    const canvas = body.querySelector('#pt-canvas');
    const cx = canvas.getContext('2d', { willReadFrequently:true });
    cx.fillStyle = '#ffffff';
    cx.fillRect(0,0,canvas.width,canvas.height);

    // ---- Tools ribbon ----
    const TOOLS = [
      { id:'pencil', label:'Pencil', svg:'<path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
      { id:'brush', label:'Brush', svg:'<path d="M5 19c2-1 2-4 4-6l6-6 3 3-6 6c-2 2-5 2-6 4Z" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
      { id:'fill', label:'Fill', svg:'<path d="M4 12l8-8 8 8-8 8-8-8Z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M18 15c1.2 1 1.2 3 0 4s-2.4-1-2.4-2 1.2-2 2.4-2Z" fill="currentColor"/>' },
      { id:'eraser', label:'Eraser', svg:'<rect x="6" y="11" width="14" height="8" rx="1.5" transform="rotate(-15 6 11)" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
      { id:'eyedropper', label:'Pick color', svg:'<path d="M14 6l4 4-9 9-4-4 9-9Z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M14 6l2-2 4 4-2 2" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
      { id:'text', label:'Text', svg:'<path d="M5 6h14M12 6v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
      { id:'select', label:'Select', svg:'<rect x="5" y="5" width="14" height="14" stroke-dasharray="2 2" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
      { id:'magnifier', label:'Zoom', svg:'<circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    ];
    const toolsGrid = body.querySelector('#pt-tools');
    toolsGrid.innerHTML = TOOLS.map(t => `<button class="ribbon-btn ${t.id==='pencil'?'active':''}" data-tool="${t.id}" title="${t.label}"><svg width="16" height="16" viewBox="0 0 24 24">${t.svg}</svg></button>`).join('');
    toolsGrid.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => {
      toolsGrid.querySelectorAll('.ribbon-btn').forEach(b=>b.classList.remove('active'));
      shapesGrid.querySelectorAll('.ribbon-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.tool;
    }));

    const SHAPES = [
      { id:'line', label:'Line', svg:'<path d="M4 20L20 4" stroke="currentColor" stroke-width="1.8"/>' },
      { id:'rect', label:'Rectangle', svg:'<rect x="4" y="6" width="16" height="12" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
      { id:'ellipse', label:'Ellipse', svg:'<ellipse cx="12" cy="12" rx="8" ry="6" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
      { id:'rrect', label:'Rounded Rect', svg:'<rect x="4" y="6" width="16" height="12" rx="4" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    ];
    const shapesGrid = body.querySelector('#pt-shapes');
    shapesGrid.innerHTML = SHAPES.map(s => `<button class="ribbon-btn" data-tool="${s.id}" title="${s.label}"><svg width="16" height="16" viewBox="0 0 24 24">${s.svg}</svg></button>`).join('');
    shapesGrid.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => {
      toolsGrid.querySelectorAll('.ribbon-btn').forEach(b=>b.classList.remove('active'));
      shapesGrid.querySelectorAll('.ribbon-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.tool;
    }));

    // ---- Size slider ----
    const sizeInput = body.querySelector('#pt-size');
    const sizeLabel = body.querySelector('#pt-size-label');
    sizeInput.addEventListener('input', e => { size = +e.target.value; sizeLabel.textContent = `Size: ${size}px`; });

    // ---- Colors ----
    const palette = body.querySelector('#pt-palette');
    palette.innerHTML = PALETTE.map(c => `<div class="paint-swatch" style="background:${c}" data-c="${c}"></div>`).join('');
    const color1El = body.querySelector('#pt-color1');
    const color2El = body.querySelector('#pt-color2');
    function setColor(c, slot){
      if(slot === 1){ color1 = c; color1El.style.background = c; }
      else { color2 = c; color2El.style.background = c; }
    }
    palette.querySelectorAll('.paint-swatch').forEach(sw => {
      sw.addEventListener('click', (e) => setColor(sw.dataset.c, activeColorSlot));
      sw.addEventListener('contextmenu', (e) => { e.preventDefault(); setColor(sw.dataset.c, 2); });
    });
    color1El.addEventListener('click', () => activeColorSlot = 1);
    color2El.addEventListener('click', () => activeColorSlot = 2);
    body.querySelector('#pt-custom-color').addEventListener('input', (e) => setColor(e.target.value, activeColorSlot));

    // ---- Drawing state ----
    let drawing = false, startX = 0, startY = 0, snapshot = null;

    function getPos(e){
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x:Math.round((p.clientX-r.left) * (canvas.width/r.width)), y:Math.round((p.clientY-r.top) * (canvas.height/r.height)) };
    }

    function floodFill(x, y, fillColor){
      const img = cx.getImageData(0,0,canvas.width,canvas.height);
      const data = img.data;
      const w = canvas.width, h = canvas.height;
      const idx = (x + y*w) * 4;
      const target = [data[idx],data[idx+1],data[idx+2],data[idx+3]];
      const fill = hexToRgba(fillColor);
      if(target[0]===fill[0] && target[1]===fill[1] && target[2]===fill[2]) return;
      const stack = [[x,y]];
      const match = (i) => data[i]===target[0] && data[i+1]===target[1] && data[i+2]===target[2] && data[i+3]===target[3];
      while(stack.length){
        const [cx0,cy0] = stack.pop();
        if(cx0<0||cy0<0||cx0>=w||cy0>=h) continue;
        const i = (cx0+cy0*w)*4;
        if(!match(i)) continue;
        data[i]=fill[0]; data[i+1]=fill[1]; data[i+2]=fill[2]; data[i+3]=fill[3];
        stack.push([cx0+1,cy0],[cx0-1,cy0],[cx0,cy0+1],[cx0,cy0-1]);
      }
      cx.putImageData(img, 0, 0);
    }
    function hexToRgba(hex){
      hex = hex.replace('#','');
      const n = parseInt(hex,16);
      return [(n>>16)&255, (n>>8)&255, n&255, 255];
    }

    function drawShapePreview(x1,y1,x2,y2,strokeColor){
      cx.putImageData(snapshot, 0, 0);
      cx.strokeStyle = strokeColor; cx.lineWidth = size; cx.lineCap = 'round';
      cx.beginPath();
      if(tool === 'line'){ cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); }
      else if(tool === 'rect' || tool === 'rrect'){
        const w = x2-x1, h = y2-y1;
        if(tool === 'rrect'){ roundRectPath(Math.min(x1,x2),Math.min(y1,y2),Math.abs(w),Math.abs(h),10); cx.stroke(); }
        else cx.strokeRect(x1,y1,w,h);
      } else if(tool === 'ellipse'){
        cx.ellipse((x1+x2)/2,(y1+y2)/2, Math.abs(x2-x1)/2, Math.abs(y2-y1)/2, 0, 0, Math.PI*2);
        cx.stroke();
      }
    }
    function roundRectPath(x,y,w,h,r){
      cx.beginPath();
      cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r);
      cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath();
    }

    function start(e){
      const { x, y } = getPos(e);
      const isRight = e.button === 2;
      const strokeColor = isRight ? color2 : color1;
      startX = x; startY = y;

      if(tool === 'fill'){ floodFill(x,y, strokeColor); markDirtyTitle(); return; }
      if(tool === 'eyedropper'){
        const px = cx.getImageData(x,y,1,1).data;
        const hex = '#' + [px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
        setColor(hex, isRight?2:1);
        return;
      }
      if(tool === 'text'){
        const txt = prompt('Enter text:');
        if(txt){ cx.fillStyle = strokeColor; cx.font = `${14+size*2}px Segoe UI, sans-serif`; cx.fillText(txt, x, y); markDirtyTitle(); }
        return;
      }
      if(['line','rect','rrect','ellipse'].includes(tool)){
        snapshot = cx.getImageData(0,0,canvas.width,canvas.height);
        drawing = true;
        return;
      }
      // pencil / brush / eraser (freehand)
      drawing = true;
      cx.lineWidth = tool==='eraser' ? size*3 : (tool==='brush' ? size*2 : size);
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.strokeStyle = tool==='eraser' ? '#FFFFFF' : strokeColor;
      cx.globalAlpha = tool==='brush' ? 0.85 : 1;
      cx.beginPath();
      cx.moveTo(x,y);
    }
    function move(e){
      const { x, y } = getPos(e);
      body.querySelector('#pt-pos').textContent = `${x}, ${y}px`;
      if(!drawing) return;
      e.preventDefault && e.preventDefault();
      if(['line','rect','rrect','ellipse'].includes(tool)){
        const isRight = e.buttons === 2;
        drawShapePreview(startX, startY, x, y, isRight ? color2 : color1);
        return;
      }
      cx.lineTo(x,y);
      cx.stroke();
      cx.beginPath();
      cx.moveTo(x,y);
    }
    function end(){
      if(drawing) markDirtyTitle();
      drawing = false; cx.globalAlpha = 1; cx.beginPath();
    }
    function markDirtyTitle(){
      const label = body.querySelector('.paint-quickbar span');
      if(label && !label.textContent.startsWith('•')) label.textContent = '• ' + label.textContent;
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', start, { passive:false });
    canvas.addEventListener('touchmove', move, { passive:false });
    canvas.addEventListener('touchend', end);

    body.querySelector('#pt-new').addEventListener('click', () => {
      if(!confirm('Clear the canvas? Unsaved changes will be lost.')) return;
      cx.fillStyle = '#fff'; cx.fillRect(0,0,canvas.width,canvas.height);
    });
    body.querySelector('#pt-save').addEventListener('click', async () => {
      const name = prompt('Save as (file name):', filename === 'Untitled' ? 'Untitled.png' : filename) || 'Untitled.png';
      const fname = name.endsWith('.png') ? name : name + '.png';
      const dataUrl = canvas.toDataURL('image/png');
      const { name: savedName, path } = await AuroraStorage.uniqueNameAndPath('/Pictures', fname);
      await AuroraStorage.fileSet({ path, name:savedName, type:'image', parent:'/Pictures', content:dataUrl, modified:Date.now() });
      filename = savedName;
      body.querySelector('.paint-quickbar span').textContent = `${filename} - Paint`;
      ctx.setTitle(`${filename} - Paint`);
      Notifications.push({ icon:'🎨', title:'Saved to Pictures', body:savedName, silent:true });
      Bus.emit('fs:changed');
    });
  }
});
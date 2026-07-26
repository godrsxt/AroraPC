/* =========================================================
   Desktops — engine/desktops.js
   Renders the Task View panel (desktop thumbnails) and wires
   it to WindowManager's virtual-desktop functions.
   ========================================================= */
const Desktops = (() => {
  function render(){
    const list = document.getElementById('taskview-list');
    const count = WindowManager.getDesktopCount();
    const current = WindowManager.getCurrentDesktop();
    let html = '';
    for(let i=0; i<count; i++){
      const wins = WindowManager.windowsOnDesktop(i);
      const thumbContent = wins.length
        ? wins.slice(0,6).map(() => `<div class="mini-win"></div>`).join('')
        : `<span class="mini-empty">Empty</span>`;
      html += `
        <div class="taskview-desk ${i===current?'active':''}" data-i="${i}">
          <div class="taskview-thumb">${thumbContent}</div>
          <div class="taskview-label">
            <span>Desktop ${i+1}</span>
            ${count > 1 ? `<button data-remove="${i}" title="Close desktop">✕</button>` : ''}
          </div>
        </div>`;
    }
    list.innerHTML = html;
    list.querySelectorAll('.taskview-desk').forEach(el => {
      el.addEventListener('click', (e) => {
        if(e.target.closest('[data-remove]')) return;
        WindowManager.switchDesktop(+el.dataset.i);
        Taskbar.togglePanel('taskview-panel');
      });
    });
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        WindowManager.removeDesktop(+btn.dataset.remove);
        render();
      });
    });
  }

  function bindEvents(){
    document.getElementById('taskview-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      render();
      Taskbar.togglePanel('taskview-panel');
    });
    document.getElementById('taskview-add').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = WindowManager.addDesktop();
      WindowManager.switchDesktop(idx);
      render();
    });
    document.addEventListener('keydown', (e) => {
      if(e.ctrlKey && e.altKey && e.key === 'ArrowRight'){
        e.preventDefault();
        const c = WindowManager.getCurrentDesktop();
        if(c < WindowManager.getDesktopCount() - 1) WindowManager.switchDesktop(c + 1);
        else { const idx = WindowManager.addDesktop(); WindowManager.switchDesktop(idx); }
      }
      if(e.ctrlKey && e.altKey && e.key === 'ArrowLeft'){
        e.preventDefault();
        const c = WindowManager.getCurrentDesktop();
        if(c > 0) WindowManager.switchDesktop(c - 1);
      }
    });
    Bus.on('desktop:switched', () => {
      if(!document.getElementById('taskview-panel').classList.contains('hidden')) render();
    });
  }

  function init(){ bindEvents(); }
  return { init, render };
})();

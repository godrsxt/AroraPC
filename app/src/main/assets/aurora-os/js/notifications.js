/* =========================================================
   Notifications — toast popups + persistent notification center
   ========================================================= */
const Notifications = (() => {
  const store = [];

  function timeLabel(){
    return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }

  function push({ icon='🔔', title, body, silent=false }){
    const item = { id: crypto.randomUUID(), icon, title, body, time: timeLabel() };
    store.unshift(item);
    renderList();
    updateDot();
    if(!silent) toast(item);
    return item;
  }

  function toast({ icon, title, body }){
    const layer = document.getElementById('toast-layer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="t-icon">${icon}</div><div><div class="t-title">${title}</div><div class="t-body">${body||''}</div></div>`;
    layer.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, 4200);
  }

  function updateDot(){
    document.getElementById('notif-dot').classList.toggle('hidden', store.length === 0);
  }

  function renderList(){
    const list = document.getElementById('notif-list');
    if(!list) return;
    if(store.length === 0){
      list.innerHTML = `<div class="notif-empty">No new notifications</div>`;
      return;
    }
    list.innerHTML = store.map(n => `
      <div class="notif-item">
        <div class="ni-title">${n.icon} ${n.title}</div>
        <div class="ni-body">${n.body||''}</div>
        <div class="ni-time">${n.time}</div>
      </div>`).join('');
  }

  function clearAll(){
    store.length = 0;
    renderList();
    updateDot();
  }

  function init(){
    renderList();
    document.getElementById('clear-notifs').addEventListener('click', clearAll);
  }

  return { push, init };
})();
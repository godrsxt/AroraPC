/* =========================================================
   Clock — world clock, stopwatch, timer
   ========================================================= */
AppRegistry.register('clock', {
  title: 'Clock',
  icon: Icons.clock(),
  color: 'linear-gradient(135deg,#4dd8c0,#6d8bff)',
  defaultSize: { w: 420, h: 480 },
  mount(body, ctx){
    const ZONES = [
      { label:'Local', tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { label:'New York', tz:'America/New_York' },
      { label:'London', tz:'Europe/London' },
      { label:'Tokyo', tz:'Asia/Tokyo' },
      { label:'Sydney', tz:'Australia/Sydney' },
    ];
    body.innerHTML = `
      <div class="app-shell">
        <div class="app-toolbar">
          <button data-tab="world" class="active">🌍 World</button>
          <button data-tab="stopwatch">⏱️ Stopwatch</button>
          <button data-tab="timer">⏲️ Timer</button>
        </div>
        <div class="app-content" id="clock-content" style="padding:18px;"></div>
      </div>`;
    const content = body.querySelector('#clock-content');
    const tabs = body.querySelectorAll('[data-tab]');
    let active = 'world';
    let intervalRef = null;

    // Stopwatch state
    let swElapsed = 0, swRunning = false, swStart = 0;
    // Timer state
    let timerTotal = 0, timerRemaining = 0, timerRunning = false, timerDeadline = 0;

    function clearTick(){ if(intervalRef){ clearInterval(intervalRef); intervalRef = null; } }

    function renderWorld(){
      content.innerHTML = ZONES.map(z => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone: z.tz });
        return `<div class="settings-row"><div class="sr-label">${z.label}</div><div style="font-family:var(--font-mono);font-size:15px;">${time}</div></div>`;
      }).join('');
    }

    function fmt(ms){
      const total = Math.floor(ms/1000);
      const h = String(Math.floor(total/3600)).padStart(2,'0');
      const m = String(Math.floor((total%3600)/60)).padStart(2,'0');
      const s = String(total%60).padStart(2,'0');
      const cs = String(Math.floor((ms%1000)/10)).padStart(2,'0');
      return `${h}:${m}:${s}.${cs}`;
    }

    function renderStopwatch(){
      const currentMs = swRunning ? swElapsed + (Date.now() - swStart) : swElapsed;
      content.innerHTML = `
        <div style="text-align:center;">
          <div style="font-family:var(--font-display);font-size:42px;margin:24px 0;">${fmt(currentMs)}</div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="app-toolbar-btn calc-btn eq" id="sw-toggle" style="padding:10px 20px;border-radius:10px;">${swRunning?'Pause':'Start'}</button>
            <button class="calc-btn fn" id="sw-reset" style="padding:10px 20px;border-radius:10px;background:rgba(255,255,255,.08);">Reset</button>
          </div>
        </div>`;
      content.querySelector('#sw-toggle').addEventListener('click', () => {
        if(swRunning){ swElapsed += Date.now() - swStart; swRunning = false; }
        else { swStart = Date.now(); swRunning = true; }
        renderStopwatch();
      });
      content.querySelector('#sw-reset').addEventListener('click', () => {
        swElapsed = 0; swRunning = false; renderStopwatch();
      });
    }

    function renderTimer(){
      const mins = Math.floor(timerRemaining/60000);
      const secs = Math.floor((timerRemaining%60000)/1000);
      content.innerHTML = `
        <div style="text-align:center;">
          <div style="font-family:var(--font-display);font-size:42px;margin:24px 0;">${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div>
          ${!timerRunning ? `
            <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
              <input type="number" id="timer-min" min="0" max="180" value="5" style="width:70px;padding:8px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid var(--glass-border);color:var(--text-0);text-align:center;"> min
            </div>` : ''}
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="calc-btn eq" id="tm-toggle" style="padding:10px 20px;border-radius:10px;">${timerRunning?'Pause':'Start'}</button>
            <button class="calc-btn fn" id="tm-reset" style="padding:10px 20px;border-radius:10px;background:rgba(255,255,255,.08);">Reset</button>
          </div>
        </div>`;
      content.querySelector('#tm-toggle').addEventListener('click', () => {
        if(timerRunning){ timerRunning = false; }
        else {
          if(timerRemaining <= 0){
            const mins = +content.querySelector('#timer-min')?.value || 5;
            timerTotal = mins * 60000;
            timerRemaining = timerTotal;
          }
          timerDeadline = Date.now() + timerRemaining;
          timerRunning = true;
        }
        renderTimer();
      });
      content.querySelector('#tm-reset').addEventListener('click', () => {
        timerRunning = false; timerRemaining = 0; renderTimer();
      });
    }

    function renderActive(){
      if(active === 'world') renderWorld();
      else if(active === 'stopwatch') renderStopwatch();
      else renderTimer();
    }

    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      active = btn.dataset.tab;
      renderActive();
    }));

    clearTick();
    intervalRef = setInterval(() => {
      if(active === 'world') renderWorld();
      else if(active === 'stopwatch' && swRunning) renderStopwatch();
      else if(active === 'timer' && timerRunning){
        timerRemaining = Math.max(0, timerDeadline - Date.now());
        if(timerRemaining <= 0){
          timerRunning = false;
          Notifications.push({ icon:'⏲️', title:'Timer done', body:'Your countdown has finished.' });
        }
        renderTimer();
      }
    }, 250);

    renderActive();
  }
});
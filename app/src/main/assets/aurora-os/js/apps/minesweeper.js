/* =========================================================
   Minesweeper — classic tile-reveal game with flood reveal,
   flagging, a mine counter, and a timer.
   ========================================================= */
AppRegistry.register('minesweeper', {
  title: 'Minesweeper',
  icon: Icons.minesweeper(),
  defaultSize: { w: 420, h: 520 },
  pinned: true,
  mount(body, ctx){
    const LEVELS = { Beginner:{ w:9, h:9, mines:10 }, Intermediate:{ w:16, h:16, mines:40 }, Expert:{ w:16, h:30, mines:99 } };
    let level = 'Beginner';
    let cfg = LEVELS[level];
    let grid = [];       // {mine,revealed,flagged,adjacent}
    let started = false, over = false, won = false, timer = 0, timerRef = null, flagsUsed = 0;

    body.innerHTML = `
      <div class="game-shell">
        <div class="app-toolbar" style="width:100%;">
          <select id="ms-level" style="padding:6px 8px;border-radius:6px;background:rgba(128,128,140,.1);color:var(--text-0);border:1px solid var(--glass-border);">
            ${Object.keys(LEVELS).map(l => `<option ${l===level?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="game-hud">
          <div class="hud-box"><div class="hud-label">Mines</div><div class="hud-value" id="ms-mines">10</div></div>
          <button id="ms-face" style="font-size:26px;">🙂</button>
          <div class="hud-box"><div class="hud-label">Time</div><div class="hud-value" id="ms-time">0</div></div>
        </div>
        <div id="ms-board" style="display:grid; gap:2px; background:var(--glass-border); padding:6px; border-radius:8px;"></div>
      </div>`;

    const boardEl = body.querySelector('#ms-board');
    const minesEl = body.querySelector('#ms-mines');
    const timeEl = body.querySelector('#ms-time');
    const faceEl = body.querySelector('#ms-face');
    const levelSelect = body.querySelector('#ms-level');

    function inBounds(x,y){ return x>=0 && y>=0 && x<cfg.w && y<cfg.h; }
    function neighbors(x,y){
      const list = [];
      for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++){
        if(dx===0 && dy===0) continue;
        if(inBounds(x+dx,y+dy)) list.push([x+dx,y+dy]);
      }
      return list;
    }

    function buildGrid(safeX, safeY){
      grid = Array.from({length:cfg.h}, () => Array.from({length:cfg.w}, () => ({ mine:false, revealed:false, flagged:false, adjacent:0 })));
      let placed = 0;
      while(placed < cfg.mines){
        const x = Math.floor(Math.random()*cfg.w), y = Math.floor(Math.random()*cfg.h);
        if(grid[y][x].mine) continue;
        if(Math.abs(x-safeX)<=1 && Math.abs(y-safeY)<=1) continue;
        grid[y][x].mine = true; placed++;
      }
      for(let y=0;y<cfg.h;y++) for(let x=0;x<cfg.w;x++){
        if(grid[y][x].mine) continue;
        grid[y][x].adjacent = neighbors(x,y).filter(([nx,ny]) => grid[ny][nx].mine).length;
      }
    }

    function render(){
      boardEl.style.gridTemplateColumns = `repeat(${cfg.w}, 22px)`;
      boardEl.innerHTML = '';
      for(let y=0;y<cfg.h;y++){
        for(let x=0;x<cfg.w;x++){
          const cell = grid[y] ? grid[y][x] : { revealed:false, flagged:false };
          const el = document.createElement('div');
          el.style.cssText = `width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;user-select:none;border-radius:2px;`;
          if(cell.revealed){
            el.style.background = 'rgba(128,128,140,.08)';
            if(cell.mine){ el.textContent = '💣'; el.style.background = '#C42B1C'; }
            else if(cell.adjacent > 0){
              el.textContent = cell.adjacent;
              const colors = ['','#1D6FE0','#0F7B3E','#C42B1C','#3F48CC','#880015','#00A2E8','#000','#7F7F7F'];
              el.style.color = colors[cell.adjacent];
            }
          } else {
            el.style.background = 'rgba(128,128,140,.22)';
            el.style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,.25), inset -1px -1px 0 rgba(0,0,0,.15)';
            if(cell.flagged) el.textContent = '🚩';
          }
          el.addEventListener('click', () => reveal(x,y));
          el.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFlag(x,y); });
          boardEl.appendChild(el);
        }
      }
      minesEl.textContent = Math.max(0, cfg.mines - flagsUsed);
      timeEl.textContent = timer;
    }

    function toggleFlag(x,y){
      if(over || !grid[y]) return;
      const cell = grid[y][x];
      if(cell.revealed) return;
      cell.flagged = !cell.flagged;
      flagsUsed += cell.flagged ? 1 : -1;
      render();
    }

    function floodReveal(x,y){
      const stack = [[x,y]];
      while(stack.length){
        const [cx,cy] = stack.pop();
        const cell = grid[cy][cx];
        if(cell.revealed || cell.flagged) continue;
        cell.revealed = true;
        if(cell.adjacent === 0){
          neighbors(cx,cy).forEach(([nx,ny]) => { if(!grid[ny][nx].revealed) stack.push([nx,ny]); });
        }
      }
    }

    function reveal(x,y){
      if(over) return;
      if(!started){
        started = true;
        buildGrid(x,y);
        timerRef = setInterval(() => { timer++; timeEl.textContent = timer; }, 1000);
      }
      const cell = grid[y][x];
      if(cell.flagged || cell.revealed) return;
      if(cell.mine){
        cell.revealed = true;
        endGame(false);
        render();
        return;
      }
      floodReveal(x,y);
      checkWin();
      render();
    }

    function checkWin(){
      const total = cfg.w * cfg.h;
      const revealedCount = grid.flat().filter(c => c.revealed).length;
      if(revealedCount === total - cfg.mines) endGame(true);
    }

    function endGame(didWin){
      over = true; won = didWin;
      clearInterval(timerRef);
      faceEl.textContent = didWin ? '😎' : '😵';
      if(didWin){
        grid.flat().forEach(c => { if(c.mine) c.flagged = true; });
        Notifications.push({ icon:'🏆', title:'You win!', body:`Cleared ${level} in ${timer}s`, silent:false });
      }
    }

    function reset(){
      cfg = LEVELS[level];
      grid = []; started = false; over = false; won = false; timer = 0; flagsUsed = 0;
      clearInterval(timerRef);
      faceEl.textContent = '🙂';
      render();
    }

    faceEl.addEventListener('click', reset);
    levelSelect.addEventListener('change', () => { level = levelSelect.value; reset(); });
    reset();
  }
});

/* =========================================================
   2048 — classic sliding-tile puzzle. Arrow keys or on-screen
   buttons to slide; merge equal tiles to reach 2048 and beyond.
   ========================================================= */
AppRegistry.register('game2048', {
  title: '2048',
  icon: Icons.game2048(),
  defaultSize: { w: 380, h: 500 },
  pinned: true,
  mount(body, ctx){
    const SIZE = 4;
    let board = [];
    let score = 0, best = 0;
    let over = false;

    const COLORS = {
      2:'#EEE4DA', 4:'#EDE0C8', 8:'#F2B179', 16:'#F59563', 32:'#F67C5F', 64:'#F65E3B',
      128:'#EDCF72', 256:'#EDCC61', 512:'#EDC850', 1024:'#EDC53F', 2048:'#EDC22E'
    };
    const TEXT_DARK = new Set([2,4]);

    body.innerHTML = `
      <div class="game-shell">
        <div class="game-hud">
          <div class="hud-box"><div class="hud-label">Score</div><div class="hud-value" id="g-score">0</div></div>
          <div class="hud-box"><div class="hud-label">Best</div><div class="hud-value" id="g-best">0</div></div>
          <button class="game-btn" id="g-new">New Game</button>
        </div>
        <div id="g-board" style="position:relative; width:308px; height:308px; background:#BBADA0; border-radius:8px; padding:8px; display:grid; grid-template-columns:repeat(4,68px); grid-template-rows:repeat(4,68px); gap:8px;"></div>
        <div style="font-size:11px;color:var(--text-2);">Use arrow keys or swipe to play</div>
        <div id="g-overlay" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:rgba(255,255,255,.75);border-radius:8px;">
          <div style="font-family:var(--font-display);font-size:22px;font-weight:700;" id="g-overlay-text">Game Over</div>
          <button class="game-btn" id="g-retry">Try Again</button>
        </div>
      </div>`;

    const boardEl = body.querySelector('#g-board');
    const scoreEl = body.querySelector('#g-score');
    const bestEl = body.querySelector('#g-best');
    const overlay = body.querySelector('#g-overlay');
    const overlayText = body.querySelector('#g-overlay-text');

    function emptyBoard(){ return Array.from({length:SIZE}, () => Array(SIZE).fill(0)); }

    function addRandomTile(){
      const empties = [];
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) if(board[y][x]===0) empties.push([x,y]);
      if(empties.length === 0) return;
      const [x,y] = empties[Math.floor(Math.random()*empties.length)];
      board[y][x] = Math.random() < 0.9 ? 2 : 4;
    }

    function render(){
      boardEl.querySelectorAll('.tile').forEach(t => t.remove());
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++){
        const v = board[y][x];
        const cell = document.createElement('div');
        cell.style.cssText = `width:68px;height:68px;border-radius:4px;background:rgba(238,228,218,.35);grid-column:${x+1};grid-row:${y+1};`;
        boardEl.appendChild(cell);
      }
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++){
        const v = board[y][x];
        if(!v) continue;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.cssText = `width:68px;height:68px;border-radius:4px;grid-column:${x+1};grid-row:${y+1};display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-weight:700;font-size:${v>512?20:24}px;background:${COLORS[v]||'#3C3A32'};
          color:${TEXT_DARK.has(v)?'#776E65':'#fff'};transition:transform .1s ease;`;
        tile.textContent = v;
        boardEl.appendChild(tile);
      }
      scoreEl.textContent = score;
      bestEl.textContent = best;
    }

    function slideRow(row){
      const nums = row.filter(v => v !== 0);
      const merged = [];
      for(let i=0;i<nums.length;i++){
        if(nums[i] === nums[i+1]){
          const val = nums[i]*2;
          merged.push(val);
          score += val;
          i++;
        } else merged.push(nums[i]);
      }
      while(merged.length < SIZE) merged.push(0);
      return merged;
    }

    function rotateBoard(b){
      const nb = emptyBoard();
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) nb[x][SIZE-1-y] = b[y][x];
      return nb;
    }

    function boardsEqual(a,b){ return JSON.stringify(a) === JSON.stringify(b); }

    function move(dir){
      if(over) return;
      let b = board.map(r => r.slice());
      let rotations = { left:0, up:1, right:2, down:3 }[dir];
      for(let i=0;i<rotations;i++) b = rotateBoard(b);
      b = b.map(slideRow);
      for(let i=0;i<(4-rotations)%4;i++) b = rotateBoard(b);

      if(!boardsEqual(b, board)){
        board = b;
        addRandomTile();
        best = Math.max(best, score);
        render();
        checkGameOver();
      }
    }

    function checkGameOver(){
      const hasEmpty = board.some(row => row.includes(0));
      if(hasEmpty) return;
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++){
        const v = board[y][x];
        if(x<SIZE-1 && board[y][x+1]===v) return;
        if(y<SIZE-1 && board[y+1][x]===v) return;
      }
      over = true;
      overlayText.textContent = 'Game Over';
      overlay.style.display = 'flex';
    }

    function checkWin(){
      if(board.flat().includes(2048)){
        over = true;
        overlayText.textContent = 'You reached 2048! 🎉';
        overlay.style.display = 'flex';
        Notifications.push({ icon:'🏆', title:'2048 reached!', body:`Score: ${score}`, silent:false });
      }
    }

    function reset(){
      board = emptyBoard();
      score = 0; over = false;
      overlay.style.display = 'none';
      addRandomTile(); addRandomTile();
      render();
    }

    document.addEventListener('keydown', function onKey(e){
      if(!document.body.contains(body)){ document.removeEventListener('keydown', onKey); return; }
      if(!body.contains(document.activeElement) && document.activeElement !== document.body) return;
      const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
      if(map[e.key]){ e.preventDefault(); move(map[e.key]); checkWin(); }
    });

    // Basic swipe support
    let touchStart = null;
    boardEl.addEventListener('touchstart', e => { touchStart = e.touches[0]; });
    boardEl.addEventListener('touchend', e => {
      if(!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.clientX;
      const dy = e.changedTouches[0].clientY - touchStart.clientY;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if(Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
      checkWin();
    });

    body.querySelector('#g-new').addEventListener('click', reset);
    body.querySelector('#g-retry').addEventListener('click', reset);
    body.tabIndex = 0;
    reset();
  }
});
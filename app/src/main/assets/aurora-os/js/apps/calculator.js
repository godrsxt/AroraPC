/* =========================================================
   Calculator — simple 4-function calculator
   ========================================================= */
AppRegistry.register('calculator', {
  title: 'Calculator',
  icon: Icons.calculator(),
  color: 'linear-gradient(135deg,#b18cff,#ff8fc7)',
  defaultSize: { w: 300, h: 440 },
  mount(body){
    const keys = ['C','⌫','%','/', '7','8','9','*', '4','5','6','-', '1','2','3','+', '0','.','=' ];
    body.innerHTML = `
      <div class="calc-body">
        <div class="calc-sub" id="calc-expr">&nbsp;</div>
        <div class="calc-display" id="calc-display">0</div>
        <div class="calc-grid" id="calc-grid"></div>
      </div>`;
    const display = body.querySelector('#calc-display');
    const exprEl = body.querySelector('#calc-expr');
    const grid = body.querySelector('#calc-grid');
    let expr = '';

    function render(){
      display.textContent = expr === '' ? '0' : expr.slice(-16);
      exprEl.textContent = expr.length > 16 ? expr.slice(0,-16) : '\u00a0';
    }
    function evaluate(){
      try{
        if(!/^[0-9+\-*/.%\s]+$/.test(expr)) throw new Error();
        const safe = expr.replace(/%/g, '/100');
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + safe + ')')();
        expr = String(Math.round(result * 1e10) / 1e10);
      }catch(e){ expr = 'Error'; }
      render();
    }

    grid.innerHTML = keys.map(k => {
      let cls = 'calc-btn';
      if(['/','*','-','+'].includes(k)) cls += ' op';
      if(k === '=') cls += ' eq';
      if(['C','⌫','%'].includes(k)) cls += ' fn';
      const span = k === '0' ? 'grid-column:span 2' : '';
      return `<button class="${cls}" data-k="${k}" style="${span}">${k}</button>`;
    }).join('');

    grid.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.k;
      if(k === 'C'){ expr = ''; }
      else if(k === '⌫'){ expr = expr.slice(0,-1); }
      else if(k === '='){ evaluate(); return; }
      else { if(expr === 'Error') expr=''; expr += k; }
      render();
    }));

    document.addEventListener('keydown', function onKey(e){
      if(!document.body.contains(body)){ document.removeEventListener('keydown', onKey); return; }
      if(!body.contains(document.activeElement) && document.activeElement !== document.body) return;
      if(/[0-9+\-*/.%]/.test(e.key)){ expr += e.key; render(); }
      else if(e.key === 'Enter'){ evaluate(); }
      else if(e.key === 'Backspace'){ expr = expr.slice(0,-1); render(); }
      else if(e.key === 'Escape'){ expr=''; render(); }
    });

    render();
  }
});
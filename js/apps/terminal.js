/* =========================================================
   Terminal — a small built-in shell for the OS
   ========================================================= */
AppRegistry.register('terminal', {
  title: 'Terminal',
  icon: Icons.terminal(),
  color: 'linear-gradient(135deg,#232a3d,#4dd8c0)',
  defaultSize: { w: 620, h: 420 },
  mount(body, ctx){
    body.innerHTML = `<div class="terminal-body" id="tm-output"></div>`;
    const output = body.querySelector('#tm-output');

    const print = (html) => {
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    const commands = {
      help(){ print(`Available commands: help, about, date, echo [text], apps, open [app], clear, whoami, neofetch, calc [expr]`); },
      about(){ print('Aurora OS — a browser-based desktop environment. Type "apps" to see everything installed.'); },
      date(){ print(new Date().toString()); },
      echo(args){ print(args.join(' ')); },
      apps(){ print(AppRegistry.all().map(a => a.id).join('  ')); },
      open(args){
        const id = args[0];
        if(AppRegistry.get(id)){ WindowManager.open(id); print(`Launching ${id}…`); }
        else print(`Unknown app: ${id}. Try "apps" to list installed apps.`);
      },
      clear(){ output.innerHTML=''; },
      whoami(){ print('guest'); },
      neofetch(){
        print(`<b>Aurora OS</b> v1.0<br>Kernel: web-engine<br>Shell: aurora-sh<br>Uptime: ${Math.floor(performance.now()/1000)}s<br>Resolution: ${window.innerWidth}x${window.innerHeight}`);
      },
      calc(args){
        try{
          const expr = args.join(' ');
          if(!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('invalid characters');
          // eslint-disable-next-line no-new-func
          print(String(Function('"use strict"; return (' + expr + ')')()));
        }catch(e){ print('Error: invalid expression'); }
      }
    };

    print('Aurora Terminal — type <b>help</b> to get started.');
    spawnPrompt();

    function spawnPrompt(){
      const row = document.createElement('div');
      row.className = 'terminal-line terminal-input-row';
      row.innerHTML = `<span class="terminal-prompt">guest@aurora&nbsp;~&nbsp;$&nbsp;</span><input class="terminal-input" autocomplete="off" spellcheck="false">`;
      output.appendChild(row);
      const input = row.querySelector('input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){
          const val = input.value;
          input.disabled = true;
          const echoRow = document.createElement('div');
          echoRow.className = 'terminal-line';
          echoRow.innerHTML = `<span class="terminal-prompt">guest@aurora ~ $</span> ${val}`;
          row.replaceWith(echoRow);
          const [cmd, ...args] = val.trim().split(/\s+/);
          if(cmd){
            if(commands[cmd]) commands[cmd](args);
            else if(cmd.length) print(`Command not found: ${cmd}. Type "help".`);
          }
          spawnPrompt();
        }
      });
      output.scrollTop = output.scrollHeight;
      body.addEventListener('click', () => input.focus());
    }
  }
});
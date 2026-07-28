/* =========================================================
   Typing Test — built-in app. Runs inside a Shadow DOM so its many
   generic IDs/classes (#words, .letter, .caret, etc.) never collide
   with Aurora's own elements or with a second instance of this same
   app in another window; its <style> is scoped the same way, so
   none of it leaks into the rest of the OS.
   ========================================================= */
AppRegistry.register('typing', {
  title: 'Typing Test',
  icon: Icons.typing(),
  color: 'linear-gradient(135deg,#3a3c3f,#232426)',
  defaultSize: { w: 920, h: 640 },
  mount(body, ctx) {
    const host = document.createElement('div');
    host.style.cssText = 'width:100%;height:100%;overflow:auto;';
    body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&family=Lexend+Deca:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-color: #323437;
            --main-color: #e2b714;
            --caret-color: #e2b714;
            --sub-color: #646669;
            --sub-alt-color: #2c2e31;
            --text-color: #d1d0c5;
            --error-color: #ca4754;
            --error-extra-color: #7e2a33;
            --colorful-error-color: #ca4754;
            --colorful-error-extra-color: #7e2a33;
        }

        body {
            background: var(--bg-color);
            color: var(--text-color);
            font-family: 'Roboto Mono', monospace;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 40px;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            position: relative;
        }

        .logo-icon::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: var(--main-color);
            border-radius: 50% 50% 50% 5px;
            transform: rotate(-45deg);
        }

        .logo-text {
            font-family: 'Lexend Deca', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-color);
            letter-spacing: -1px;
        }

        .logo-text span {
            color: var(--sub-color);
        }

        nav {
            display: flex;
            gap: 20px;
        }

        nav button {
            background: none;
            border: none;
            color: var(--sub-color);
            cursor: pointer;
            font-family: inherit;
            font-size: 0.9rem;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        nav button:hover, nav button.active {
            color: var(--text-color);
            background: var(--sub-alt-color);
        }

        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            position: relative;
        }

        .mode-selector {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            background: var(--sub-alt-color);
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 0.85rem;
        }

        .mode-group {
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .mode-group:not(:last-child)::after {
            content: '';
            width: 1px;
            height: 20px;
            background: var(--sub-color);
            margin-left: 16px;
            opacity: 0.3;
        }

        .mode-btn {
            background: none;
            border: none;
            color: var(--sub-color);
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            padding: 4px 10px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .mode-btn:hover {
            color: var(--text-color);
        }

        .mode-btn.active {
            color: var(--main-color);
        }

        .typing-container {
            position: relative;
            width: 100%;
            max-width: 900px;
            min-height: 160px;
            margin: 0 auto;
        }

        .typing-wrapper {
            font-size: 1.5rem;
            line-height: 2.5rem;
            position: relative;
            overflow: hidden;
            height: 160px;
            mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
        }

        .words {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0.5rem 0.75rem;
            position: absolute;
            width: 100%;
            transition: transform 0.1s;
        }

        .word {
            position: relative;
            display: flex;
            border-bottom: 2px solid transparent;
            transition: all 0.1s;
        }

        .word.active {
            border-bottom-color: var(--sub-color);
        }

        .letter {
            position: relative;
            color: var(--sub-color);
            transition: color 0.1s;
        }

        .letter.correct {
            color: var(--text-color);
        }

        .letter.incorrect {
            color: var(--error-color);
        }

        .letter.incorrect.extra {
            color: var(--error-extra-color);
        }

        .letter.missing {
            border-bottom: 2px solid var(--error-color);
        }

        .caret {
            position: absolute;
            width: 2px;
            height: 1.8rem;
            background: var(--caret-color);
            border-radius: 2px;
            top: 0.35rem;
            left: 0;
            transition: all 0.1s ease;
            animation: blink 1s infinite;
            z-index: 10;
        }

        .caret.smooth {
            transition: all 0.1s ease;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        .live-stats {
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
            font-size: 1.5rem;
            color: var(--main-color);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .live-stats.visible {
            opacity: 1;
        }

        .live-stats span {
            color: var(--sub-color);
            font-size: 0.9rem;
            margin-left: 5px;
        }

        .restart-btn {
            margin-top: 30px;
            background: none;
            border: none;
            color: var(--sub-color);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 10px;
            border-radius: 8px;
            transition: all 0.2s;
            opacity: 0;
        }

        .restart-btn.visible {
            opacity: 1;
        }

        .restart-btn:hover {
            color: var(--text-color);
            transform: scale(1.1);
        }

        .results {
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            animation: fadeIn 0.5s;
        }

        .results.show {
            display: flex;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .result-stats {
            display: flex;
            gap: 40px;
            margin: 20px 0;
        }

        .result-stat {
            text-align: center;
        }

        .result-stat .value {
            font-size: 3rem;
            font-weight: 700;
            color: var(--main-color);
            line-height: 1;
        }

        .result-stat .label {
            font-size: 0.9rem;
            color: var(--sub-color);
            margin-top: 5px;
        }

        .result-graph {
            width: 600px;
            height: 200px;
            background: var(--sub-alt-color);
            border-radius: 12px;
            position: relative;
        }

        .result-graph canvas {
            width: 100%;
            height: 100%;
            border-radius: 12px;
        }

        .result-info {
            display: flex;
            gap: 30px;
            color: var(--sub-color);
            font-size: 0.9rem;
        }

        .result-info span {
            color: var(--text-color);
        }

        .games-menu {
            display: none;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            width: 100%;
            max-width: 900px;
            padding: 20px;
        }

        .games-menu.show {
            display: grid;
        }

        .game-card {
            background: var(--sub-alt-color);
            border-radius: 12px;
            padding: 30px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            text-align: center;
        }

        .game-card:hover {
            border-color: var(--main-color);
            transform: translateY(-5px);
        }

        .game-card .icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }

        .game-card h3 {
            color: var(--text-color);
            margin-bottom: 8px;
            font-size: 1.2rem;
        }

        .game-card p {
            color: var(--sub-color);
            font-size: 0.85rem;
            line-height: 1.5;
        }

        .game-screen {
            display: none;
            width: 100%;
            max-width: 900px;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }

        .game-screen.show {
            display: flex;
        }

        .game-header {
            display: flex;
            justify-content: space-between;
            width: 100%;
            align-items: center;
        }

        .game-title {
            font-size: 1.5rem;
            color: var(--main-color);
        }

        .game-stats-bar {
            display: flex;
            gap: 20px;
            color: var(--sub-color);
        }

        .game-stats-bar span {
            color: var(--text-color);
        }

        .back-btn {
            background: var(--sub-alt-color);
            border: none;
            color: var(--text-color);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }

        .back-btn:hover {
            background: var(--sub-color);
        }

        #rainfallCanvas {
            background: var(--sub-alt-color);
            border-radius: 12px;
            width: 100%;
            height: 500px;
        }

        .rainfall-input {
            width: 100%;
            max-width: 400px;
            padding: 12px 20px;
            background: var(--bg-color);
            border: 2px solid var(--sub-color);
            border-radius: 8px;
            color: var(--text-color);
            font-family: inherit;
            font-size: 1.2rem;
            text-align: center;
            outline: none;
        }

        .rainfall-input:focus {
            border-color: var(--main-color);
        }

        .memory-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            width: 100%;
        }

        .memory-card {
            background: var(--sub-alt-color);
            border-radius: 12px;
            padding: 30px 20px;
            text-align: center;
            font-size: 1.2rem;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            border: 2px solid transparent;
        }

        .memory-card.hidden {
            color: transparent;
            background: var(--bg-color);
            border-color: var(--sub-color);
        }

        .memory-card.revealed {
            border-color: var(--main-color);
            color: var(--text-color);
        }

        .memory-card.correct {
            border-color: #00ff00;
            color: #00ff00;
        }

        .memory-card.wrong {
            border-color: var(--error-color);
            color: var(--error-color);
            animation: shake 0.5s;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .chaos-area {
            font-size: 2rem;
            text-align: center;
            padding: 40px;
            background: var(--sub-alt-color);
            border-radius: 12px;
            width: 100%;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            position: relative;
            overflow: hidden;
        }

        .chaos-letter {
            display: inline-block;
            transition: all 0.2s;
            padding: 5px;
        }

        .chaos-letter.shake {
            animation: shake 0.3s;
        }

        .chaos-letter.glitch {
            animation: glitch 0.3s;
        }

        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }

        .survival-bar {
            width: 100%;
            height: 10px;
            background: var(--sub-alt-color);
            border-radius: 5px;
            overflow: hidden;
        }

        .survival-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--error-color), var(--main-color));
            transition: width 0.3s;
            border-radius: 5px;
        }

        .survival-word {
            font-size: 3rem;
            letter-spacing: 0.5rem;
            margin: 40px 0;
        }

        .survival-word .char {
            display: inline-block;
            transition: all 0.2s;
        }

        .survival-word .char.correct {
            color: var(--main-color);
        }

        .survival-word .char.wrong {
            color: var(--error-color);
        }

        .ghost-area {
            font-size: 1.5rem;
            line-height: 2.5rem;
            width: 100%;
            min-height: 200px;
            position: relative;
        }

        .ghost-word {
            display: inline-block;
            margin: 0 10px 10px 0;
            transition: all 0.5s;
        }

        .ghost-word.fading {
            opacity: 0;
            transform: scale(0.8);
        }

        .ghost-word.gone {
            display: none;
        }

        .reverse-display {
            font-size: 2.5rem;
            text-align: center;
            padding: 40px;
            background: var(--sub-alt-color);
            border-radius: 12px;
            width: 100%;
            letter-spacing: 0.3rem;
        }

        .reverse-hint {
            color: var(--sub-color);
            font-size: 0.9rem;
            margin-top: 10px;
        }

        .instructions {
            color: var(--sub-color);
            font-size: 0.9rem;
            text-align: center;
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            .games-menu {
                grid-template-columns: 1fr;
            }
            
            .result-stats {
                gap: 20px;
            }
            
            .result-stat .value {
                font-size: 2rem;
            }
            
            .result-graph {
                width: 100%;
            }
            
            .typing-wrapper {
                font-size: 1.2rem;
            }
        }

        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg-color);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--sub-color);
            border-radius: 4px;
        }

        .focus-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--sub-color);
            font-size: 1rem;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.3s;
        }

        .focus-indicator.hidden {
            opacity: 0;
        }
    </style><header>
        <div class="logo" data-onclick="showMain()">
            <div class="logo-icon"></div>
            <div class="logo-text">monkey<span>type</span></div>
        </div>
        <nav>
            <button class="active" data-onclick="showMain()" id="navMain">typing</button>
            <button data-onclick="showGames()" id="navGames">games</button>
            <button data-onclick="showAbout()">about</button>
        </nav>
    </header>

    <main>
        <div id="mainTest" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            <div class="mode-selector" id="modeSelector">
                <div class="mode-group">
                    <button class="mode-btn active" data-onclick="setMode('time')">time</button>
                    <button class="mode-btn" data-onclick="setMode('words')">words</button>
                    <button class="mode-btn" data-onclick="setMode('quote')">quote</button>
                    <button class="mode-btn" data-onclick="setMode('zen')">zen</button>
                </div>
                <div class="mode-group" id="timeModes">
                    <button class="mode-btn" data-onclick="setSubMode(15)">15</button>
                    <button class="mode-btn active" data-onclick="setSubMode(30)">30</button>
                    <button class="mode-btn" data-onclick="setSubMode(60)">60</button>
                    <button class="mode-btn" data-onclick="setSubMode(120)">120</button>
                </div>
                <div class="mode-group" id="wordModes" style="display: none;">
                    <button class="mode-btn" data-onclick="setSubMode(10)">10</button>
                    <button class="mode-btn active" data-onclick="setSubMode(25)">25</button>
                    <button class="mode-btn" data-onclick="setSubMode(50)">50</button>
                    <button class="mode-btn" data-onclick="setSubMode(100)">100</button>
                </div>
            </div>

            <div class="live-stats" id="liveStats">
                <div>30<span>time</span></div>
                <div id="liveWpm">0<span>wpm</span></div>
                <div id="liveAcc">100<span>acc</span></div>
            </div>

            <div class="typing-container" id="typingContainer">
                <div class="focus-indicator" id="focusIndicator">click to focus</div>
                <div class="typing-wrapper" id="typingWrapper">
                    <div class="words" id="words"></div>
                    <div class="caret" id="caret"></div>
                </div>
            </div>

            <button class="restart-btn visible" id="restartBtn" data-onclick="restartTest()">restart</button>

            <div class="results" id="results">
                <div class="result-stats">
                    <div class="result-stat">
                        <div class="value" id="resultWpm">0</div>
                        <div class="label">wpm</div>
                    </div>
                    <div class="result-stat">
                        <div class="value" id="resultAcc">0%</div>
                        <div class="label">acc</div>
                    </div>
                </div>
                <div class="result-graph">
                    <canvas id="resultCanvas"></canvas>
                </div>
                <div class="result-info">
                    <div>test type: <span id="resultType">time 30</span></div>
                    <div>raw: <span id="resultRaw">0</span></div>
                    <div>characters: <span id="resultChars">0/0/0</span></div>
                    <div>consistency: <span id="resultCons">0%</span></div>
                    <div>time: <span id="resultTime">0s</span></div>
                </div>
                <button class="restart-btn visible" data-onclick="restartTest()" style="margin-top: 20px;">restart</button>
            </div>
        </div>

        <div class="games-menu" id="gamesMenu">
            <div class="game-card" data-onclick="startGame('ghost')">
                <div class="icon">GH</div>
                <h3>Ghost Mode</h3>
                <p>Words fade away as you type them. Test your muscle memory and focus.</p>
            </div>
            <div class="game-card" data-onclick="startGame('rainfall')">
                <div class="icon">RF</div>
                <h3>Rainfall</h3>
                <p>Words fall from the sky. Type them before they hit the ground!</p>
            </div>
            <div class="game-card" data-onclick="startGame('memory')">
                <div class="icon">MM</div>
                <h3>Memory</h3>
                <p>Words appear briefly then hide. Type from memory to score points.</p>
            </div>
            <div class="game-card" data-onclick="startGame('reverse')">
                <div class="icon">RV</div>
                <h3>Reverse</h3>
                <p>Type words backwards. Challenges your brain's pattern recognition.</p>
            </div>
            <div class="game-card" data-onclick="startGame('chaos')">
                <div class="icon">CH</div>
                <h3>Chaos</h3>
                <p>Letters glitch and shake. Maintain accuracy through visual chaos.</p>
            </div>
            <div class="game-card" data-onclick="startGame('survival')">
                <div class="icon">SV</div>
                <h3>Survival</h3>
                <p>Speed increases over time. One mistake costs you health. How long can you last?</p>
            </div>
        </div>

        <div class="game-screen" id="ghostGame">
            <div class="game-header">
                <h2 class="game-title">Ghost Mode</h2>
                <div class="game-stats-bar">
                    <div>wpm: <span id="ghostWpm">0</span></div>
                    <div>score: <span id="ghostScore">0</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <div class="instructions">Type the words before they disappear. Words fade 1 second after you start typing them.</div>
            <div class="ghost-area" id="ghostArea"></div>
            <button class="restart-btn visible" data-onclick="startGhost()">restart</button>
        </div>

        <div class="game-screen" id="rainfallGame">
            <div class="game-header">
                <h2 class="game-title">Rainfall Typing</h2>
                <div class="game-stats-bar">
                    <div>score: <span id="rainScore">0</span></div>
                    <div>lives: <span id="rainLives">3</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <canvas id="rainfallCanvas"></canvas>
            <input type="text" class="rainfall-input" id="rainInput" placeholder="type falling words..." autocomplete="off">
        </div>

        <div class="game-screen" id="memoryGame">
            <div class="game-header">
                <h2 class="game-title">Memory Mode</h2>
                <div class="game-stats-bar">
                    <div>level: <span id="memLevel">1</span></div>
                    <div>score: <span id="memScore">0</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <div class="instructions">Memorize the words, then type them after they hide.</div>
            <div class="memory-grid" id="memoryGrid"></div>
            <input type="text" class="rainfall-input" id="memInput" placeholder="type what you remember..." autocomplete="off" style="margin-top: 20px;">
            <button class="restart-btn visible" data-onclick="startMemory()" id="memNext" style="display:none;">next level</button>
        </div>

        <div class="game-screen" id="reverseGame">
            <div class="game-header">
                <h2 class="game-title">Reverse Typing</h2>
                <div class="game-stats-bar">
                    <div>wpm: <span id="revWpm">0</span></div>
                    <div>streak: <span id="revStreak">0</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <div class="instructions">Type this word BACKWARDS</div>
            <div class="reverse-display" id="reverseDisplay">hello</div>
            <div class="reverse-hint" id="reverseHint">type: olleh</div>
            <input type="text" class="rainfall-input" id="revInput" placeholder="type backwards..." autocomplete="off" style="margin-top: 30px;">
        </div>

        <div class="game-screen" id="chaosGame">
            <div class="game-header">
                <h2 class="game-title">Chaos Mode</h2>
                <div class="game-stats-bar">
                    <div>time: <span id="chaosTime">60</span>s</div>
                    <div>score: <span id="chaosScore">0</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <div class="instructions">Type despite the visual distractions. Letters may shake, glitch, or change!</div>
            <div class="chaos-area" id="chaosArea"></div>
            <input type="text" class="rainfall-input" id="chaosInput" placeholder="type here..." autocomplete="off" style="margin-top: 20px;">
        </div>

        <div class="game-screen" id="survivalGame">
            <div class="game-header">
                <h2 class="game-title">Survival Mode</h2>
                <div class="game-stats-bar">
                    <div>health</div>
                    <div>score: <span id="survScore">0</span></div>
                    <div>level: <span id="survLevel">1</span></div>
                </div>
                <button class="back-btn" data-onclick="showGames()">back</button>
            </div>
            <div class="survival-bar">
                <div class="survival-fill" id="survBar" style="width: 100%"></div>
            </div>
            <div class="survival-word" id="survWord">ready?</div>
            <input type="text" class="rainfall-input" id="survInput" placeholder="type to survive..." autocomplete="off" style="margin-top: 20px;">
        </div>
    </main>`;

    // Wire up every data-onclick (originally onclick="...") to a real
    // listener. eval() here runs in THIS function's own closure, so it
    // sees the local functions declared below (setMode, startGame, etc.)
    // exactly like a normal call -- this isn't executing untrusted input,
    // it's our own static app markup.
    root.querySelectorAll('[data-onclick]').forEach(el => {
      el.addEventListener('click', () => {
        try { eval(el.getAttribute('data-onclick')); } catch (e) { console.error('[typing]', e); }
      });
    });


        const commonWords = [
            "the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at",
            "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there",
            "their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no",
            "just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then",
            "now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first",
            "well","way","even","new","want","because","any","these","give","day","most","us","is","was","are","were","been",
            "has","had","did","does","doing","done","being","having","getting","making","taking","coming","going","looking",
            "seeing","finding","giving","using","working","calling","trying","need","feel","seem","become","leave","put",
            "mean","keep","let","begin","seem","help","show","hear","play","run","move","live","believe","bring","happen",
            "write","provide","sit","stand","lose","pay","meet","include","continue","set","learn","change","lead","understand",
            "watch","follow","stop","create","speak","read","allow","add","spend","grow","open","walk","offer","remember",
            "love","consider","appear","buy","wait","serve","die","send","expect","build","stay","fall","cut","reach","kill",
            "remain","suggest","raise","pass","sell","require","report","decide","pull","return","explain","carry","develop",
            "hope","drive","break","receive","agree","support","remove","return","describe","lie","discover","contain",
            "establish","join","reduce","settle","secure","suffer","search","share","announce","operate","declare","handle",
            "advance","cross","insist","respond","reject","realize","expand","extend","assume","attack","claim","prove",
            "state","charge","address","relate","reveal","acknowledge","commit","emphasize","enable","ensure","illustrate",
            "imply","impose","indicate","inform","intend","maintain","mention","negotiate","obtain","participate","perceive",
            "possess","predict","preserve","proceed","promote","propose","protect","reflect","regard","rely","replace",
            "represent","require","resolve","restrict","retain","reveal","seek","select","separate","specify","struggle",
            "submit","succeed","survive","suspect","sustain","tackle","target","tend","threaten","transfer","transform",
            "translate","transport","treat","trust","undergo","undertake","unite","update","upgrade","upset","urge","value",
            "vary","violate","volunteer","vote","wander","warn","weaken","withdraw","wonder","worry","worship","wound",
            "wrap","yield","zone","zoom","ability","absence","academy","account","achieve","acquire","address","advance",
            "advice","affair","affect","afraid","agency","agenda","almost","already","always","amount","animal","annual",
            "answer","anxiety","anyone","anyway","appeal","appear","apple","apply","approach","approve","area","argue",
            "arise","around","arrive","artist","aspect","assess","assist","assume","attack","attend","august","author",
            "autumn","avenue","average","avoid","awake","award","aware","backup","bakery","balance","banana","banker",
            "basket","battle","beauty","became","become","before","behalf","behave","behind","belief","belong","beside",
            "better","beyond","bishop","bitter","border","bottle","bottom","branch","breast","breath","bridge","bright",
            "broken","budget","bullet","burden","bureau","button","camera","campus","cancel","cancer","carbon","career",
            "castle","casual","cattle","center","chance","change","charge","choice","choose","church","circle","client",
            "closed","closet","coffee","column","combat","comedy","coming","commit","common","comply","copper","corner",
            "costly","county","couple","course","cousin","create","credit","crisis","custom","damage","danger","dealer",
            "debate","defeat","defend","define","degree","demand","depend","deputy","derive","desert","design","desire",
            "detail","detect","device","differ","dinner","direct","divide","doctor","dollar","domain","double","driver",
            "during","easily","eating","editor","effect","effort","eighth","either","eleven","emerge","empire","employ",
            "ending","energy","engage","engine","enough","ensure","entire","escape","estate","ethics","exceed","except",
            "excite","excuse","expand","expect","expert","export","extend","extent","fabric","factor","fairly","family",
            "famous","father","fellow","female","figure","finger","finish","fiscal","flight","flower","flying","follow",
            "forced","forest","forget","formal","format","former","fossil","foster","fourth","freeze","french","friday",
            "friend","future","galaxy","garden","garlic","gather","gender","genius","gentle","german","global","golden",
            "ground","growth","guilty","guitar","handle","happen","hardly","health","heaven","height","hidden","holder",
            "hollow","honest","horror","horses","hospital","hostile","hungry","hunter","ignore","impact","import","income",
            "indeed","injury","inside","intend","intent","invest","island","itself","jacket","jersey","jewish","judge",
            "jungle","junior","keeper","kettle","killed","killer","kindly","knight","labour","ladder","laptop","lately",
            "launch","lawyer","leader","league","legacy","length","lesson","letter","lights","likely","listen","little",
            "living","locate","lonely","losing","lovely","luxury","mainly","making","manage","manner","manual","margin",
            "marine","marked","market","master","matter","medium","member","memory","mental","merely","method","middle",
            "miller","mining","minute","mirror","mobile","modern","modest","module","moment","monday","monkey","mostly",
            "mother","motion","moving","murder","museum","mutual","myself","narrow","nation","native","nature","nearly",
            "nights","nobody","normal","notice","notion","number","object","obtain","office","offset","online","option",
            "orange","origin","output","oxygen","packed","palace","parent","partly","patent","people","period","permit",
            "person","phrase","picked","planet","player","please","plenty","pocket","poetry","police","policy","prefer",
            "pretty","prince","prison","profit","proper","protest","prove","public","pursue","raised","random","rarely",
            "rather","rating","reader","really","reason","recall","recent","record","reduce","reform","regard","regime",
            "region","relate","relief","remain","remote","remove","repair","repeat","replay","report","rescue","resort",
            "result","retail","retain","return","reveal","review","rhythm","riding","rising","robust","rocket","ruling",
            "runner","safety","salary","sample","saving","scheme","school","screen","script","search","season","second",
            "secret","sector","secure","seeing","select","seller","senior","series","server","settle","severe","sexual",
            "should","signal","signed","silent","silver","simple","simply","singer","single","sister","slight","smooth",
            "social","socket","softly","solely","sought","source","soviet","speech","spirit","spoken","spread","spring",
            "square","stable","stance","starter","state","status","steady","stolen","strain","stream","street","stress",
            "strict","strike","string","strong","struck","studio","submit","sudden","suffer","summer","summit","supply",
            "surely","survey","switch","symbol","system","taking","talent","target","taught","tenant","tender","tennis",
            "thanks","theory","thirty","though","threat","thrown","ticket","timing","tissue","tomato","tongue","topics",
            "tough","toward","travel","treaty","trying","twelve","twenty","unable","unique","united","unless","unlike",
            "update","useful","valley","varied","vendor","versus","victim","vision","visual","volume","walker","wanted",
            "warning","wealth","weekly","weight","whilst","winter","within","wonder","worker","wright","writer","yellow"
        ];

        const quotes = [
            "The only way to do great work is to love what you do.",
            "Innovation distinguishes between a leader and a follower.",
            "Stay hungry, stay foolish.",
            "Your time is limited, don't waste it living someone else's life.",
            "The journey of a thousand miles begins with one step.",
            "That which does not kill us makes us stronger.",
            "Life is what happens when you're busy making other plans.",
            "The future belongs to those who believe in the beauty of their dreams.",
            "It is during our darkest moments that we must focus to see the light.",
            "Whoever is happy will make others happy too."
        ];

        let mode = 'time';
        let subMode = 30;
        let words = [];
        let currentWordIndex = 0;
        let currentCharIndex = 0;
        let isTyping = false;
        let startTime = null;
        let timer = null;
        let timeLeft = 30;
        let correctChars = 0;
        let incorrectChars = 0;
        let extraChars = 0;
        let missedChars = 0;
        let wpmHistory = [];
        let rawHistory = [];
        let errorsHistory = [];
        let testActive = false;
        let testEnded = false;
        let caretInterval = null;

        const wordsEl = root.getElementById('words');
        const caretEl = root.getElementById('caret');
        const liveStatsEl = root.getElementById('liveStats');
        const liveWpmEl = root.getElementById('liveWpm');
        const liveAccEl = root.getElementById('liveAcc');
        const resultsEl = root.getElementById('results');
        const typingWrapper = root.getElementById('typingWrapper');
        const focusIndicator = root.getElementById('focusIndicator');

        function init() {
            generateWords();
            renderWords();
            positionCaret();
            setupEventListeners();
        }

        function generateWords() {
            words = [];
            let count = mode === 'words' ? subMode : (mode === 'quote' ? 1 : 100);
            
            if (mode === 'quote') {
                const quote = quotes[Math.floor(Math.random() * quotes.length)];
                words = quote.split(' ');
            } else if (mode === 'zen') {
                words = Array(100).fill('').map(() => 'zen');
            } else {
                for (let i = 0; i < count; i++) {
                    words.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
                }
            }
        }

        function renderWords() {
            wordsEl.innerHTML = '';
            words.forEach((word, i) => {
                const wordEl = document.createElement('div');
                wordEl.className = 'word';
                wordEl.dataset.index = i;
                
                word.split('').forEach(char => {
                    const charEl = document.createElement('div');
                    charEl.className = 'letter';
                    charEl.textContent = char;
                    wordEl.appendChild(charEl);
                });
                
                wordsEl.appendChild(wordEl);
            });
            
            if (words.length > 0) {
                wordsEl.children[0].classList.add('active');
            }
        }

        function positionCaret() {
            const activeWord = wordsEl.querySelector('.word.active');
            if (!activeWord) return;
            
            const letters = activeWord.querySelectorAll('.letter');
            let targetLetter;
            
            if (currentCharIndex < letters.length) {
                targetLetter = letters[currentCharIndex];
            } else {
                targetLetter = letters[letters.length - 1];
            }
            
            if (targetLetter) {
                const wordRect = activeWord.getBoundingClientRect();
                const letterRect = targetLetter.getBoundingClientRect();
                const wrapperRect = typingWrapper.getBoundingClientRect();
                
                let left = letterRect.left - wrapperRect.left;
                if (currentCharIndex >= letters.length) {
                    left += letterRect.width;
                }
                
                caretEl.style.left = left + 'px';
                caretEl.style.top = (wordRect.top - wrapperRect.top + 4) + 'px';
                
                const scrollTop = wordRect.top - wrapperRect.top - 60;
                if (scrollTop > 0) {
                    wordsEl.style.transform = `translateY(-${scrollTop}px)`;
                }
            }
        }

        function setupEventListeners() {
            // (keydown listener attached below, wrapped with a focus guard)
            document.addEventListener('click', () => {
                focusIndicator.classList.add('hidden');
            });
        }

        function handleKeydown(e) {
            if (testEnded) {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    restartTest();
                }
                return;
            }

            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== ' ') return;

            if (!testActive && e.key.length === 1) {
                startTest();
            }

            if (!testActive) return;

            const activeWord = wordsEl.querySelector('.word.active');
            if (!activeWord) return;

            const letters = activeWord.querySelectorAll('.letter');

            if (e.key === 'Backspace') {
                if (currentCharIndex > 0) {
                    currentCharIndex--;
                    const letter = letters[currentCharIndex];
                    if (letter) {
                        letter.className = 'letter';
                        letter.textContent = words[currentWordIndex][currentCharIndex] || '';
                    }
                    
                    const extras = activeWord.querySelectorAll('.letter.extra');
                    extras.forEach(el => el.remove());
                } else if (currentWordIndex > 0) {
                    activeWord.classList.remove('active');
                    currentWordIndex--;
                    currentCharIndex = words[currentWordIndex].length;
                    const prevWord = wordsEl.children[currentWordIndex];
                    prevWord.classList.add('active');
                }
                positionCaret();
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
                for (let i = currentCharIndex; i < letters.length; i++) {
                    if (!letters[i].classList.contains('correct')) {
                        letters[i].classList.add('missing');
                        missedChars++;
                    }
                }
                
                activeWord.classList.remove('active');
                currentWordIndex++;
                currentCharIndex = 0;
                
                if (currentWordIndex < wordsEl.children.length) {
                    wordsEl.children[currentWordIndex].classList.add('active');
                } else if (mode === 'words') {
                    endTest();
                    return;
                }
                
                positionCaret();
                return;
            }

            if (e.key.length === 1) {
                const expected = letters[currentCharIndex];
                if (expected) {
                    if (e.key === expected.textContent) {
                        expected.classList.add('correct');
                        correctChars++;
                    } else {
                        expected.classList.add('incorrect');
                        incorrectChars++;
                    }
                } else {
                    const extra = document.createElement('div');
                    extra.className = 'letter incorrect extra';
                    extra.textContent = e.key;
                    activeWord.appendChild(extra);
                    extraChars++;
                    incorrectChars++;
                }
                
                currentCharIndex++;
                positionCaret();
                updateLiveStats();
            }
        }

        function startTest() {
            testActive = true;
            startTime = Date.now();
            liveStatsEl.classList.add('visible');
            
            if (mode === 'time') {
                timeLeft = subMode;
                timer = setInterval(() => {
                    timeLeft--;
                    updateLiveStats();
                    recordStats();
                    
                    if (timeLeft <= 0) {
                        endTest();
                    }
                }, 1000);
            } else {
                timer = setInterval(() => {
                    timeLeft++;
                    updateLiveStats();
                    recordStats();
                }, 1000);
            }
        }

        function recordStats() {
            const elapsed = (Date.now() - startTime) / 1000 / 60;
            if (elapsed > 0) {
                const wpm = Math.round((correctChars / 5) / elapsed);
                const raw = Math.round(((correctChars + incorrectChars) / 5) / elapsed);
                wpmHistory.push(wpm);
                rawHistory.push(raw);
                errorsHistory.push(incorrectChars);
            }
        }

        function updateLiveStats() {
            const elapsed = (Date.now() - startTime) / 1000;
            const minutes = elapsed / 60;
            
            if (minutes > 0) {
                const wpm = Math.round((correctChars / 5) / minutes);
                const total = correctChars + incorrectChars;
                const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;
                
                liveWpmEl.innerHTML = `${wpm}<span>wpm</span>`;
                liveAccEl.innerHTML = `${acc}<span>acc</span>`;
                liveStatsEl.children[0].innerHTML = `${mode === 'time' ? timeLeft : Math.floor(elapsed)}<span>${mode === 'time' ? 'time' : 'time'}</span>`;
            }
        }

        function endTest() {
            testActive = false;
            testEnded = true;
            clearInterval(timer);
            
            const elapsed = (Date.now() - startTime) / 1000;
            const minutes = elapsed / 60;
            const wpm = Math.round((correctChars / 5) / minutes) || 0;
            const raw = Math.round(((correctChars + incorrectChars) / 5) / minutes) || 0;
            const total = correctChars + incorrectChars + missedChars;
            const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;
            
            let consistency = 0;
            if (wpmHistory.length > 1) {
                const avg = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
                const variance = wpmHistory.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / wpmHistory.length;
                const stdDev = Math.sqrt(variance);
                consistency = Math.max(0, Math.round(100 - (stdDev / avg * 100)));
            } else {
                consistency = 100;
            }

            root.getElementById('resultWpm').textContent = wpm;
            root.getElementById('resultAcc').textContent = acc + '%';
            root.getElementById('resultRaw').textContent = raw;
            root.getElementById('resultChars').textContent = `${correctChars}/${incorrectChars}/${extraChars}`;
            root.getElementById('resultCons').textContent = consistency + '%';
            root.getElementById('resultTime').textContent = Math.round(elapsed) + 's';
            root.getElementById('resultType').textContent = `${mode} ${subMode}`;
            
            drawGraph();
            
            wordsEl.parentElement.style.display = 'none';
            liveStatsEl.style.display = 'none';
            root.getElementById('restartBtn').style.display = 'none';
            resultsEl.classList.add('show');
        }

        function drawGraph() {
            const canvas = root.getElementById('resultCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 600;
            canvas.height = 200;
            
            const padding = 30;
            const w = canvas.width - padding * 2;
            const h = canvas.height - padding * 2;
            
            const maxWpm = Math.max(...wpmHistory, ...rawHistory, 10);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#2c2e31';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding + (h / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(canvas.width - padding, y);
                ctx.stroke();
            }
            
            if (rawHistory.length > 1) {
                ctx.strokeStyle = '#646669';
                ctx.lineWidth = 2;
                ctx.beginPath();
                rawHistory.forEach((val, i) => {
                    const x = padding + (i / (rawHistory.length - 1)) * w;
                    const y = padding + h - (val / maxWpm) * h;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            }
            
            if (wpmHistory.length > 1) {
                ctx.strokeStyle = '#e2b714';
                ctx.lineWidth = 3;
                ctx.beginPath();
                wpmHistory.forEach((val, i) => {
                    const x = padding + (i / (wpmHistory.length - 1)) * w;
                    const y = padding + h - (val / maxWpm) * h;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                ctx.lineTo(padding + w, padding + h);
                ctx.lineTo(padding, padding + h);
                ctx.closePath();
                ctx.fillStyle = 'rgba(226, 183, 20, 0.1)';
                ctx.fill();
            }
            
            errorsHistory.forEach((err, i) => {
                if (err > 0 && i > 0) {
                    const x = padding + (i / (errorsHistory.length - 1)) * w;
                    const y = padding + h - (err / maxWpm) * h;
                    ctx.fillStyle = '#ca4754';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        function restartTest() {
            clearInterval(timer);
            testActive = false;
            testEnded = false;
            currentWordIndex = 0;
            currentCharIndex = 0;
            correctChars = 0;
            incorrectChars = 0;
            extraChars = 0;
            missedChars = 0;
            wpmHistory = [];
            rawHistory = [];
            errorsHistory = [];
            timeLeft = subMode;
            
            wordsEl.style.transform = 'translateY(0)';
            wordsEl.parentElement.style.display = 'block';
            liveStatsEl.style.display = 'flex';
            liveStatsEl.classList.remove('visible');
            resultsEl.classList.remove('show');
            root.getElementById('restartBtn').style.display = 'block';
            
            liveWpmEl.innerHTML = `0<span>wpm</span>`;
            liveAccEl.innerHTML = `100<span>acc</span>`;
            liveStatsEl.children[0].innerHTML = `${subMode}<span>time</span>`;
            
            generateWords();
            renderWords();
            positionCaret();
            focusIndicator.classList.remove('hidden');
        }

        function setMode(newMode) {
            mode = newMode;
            root.querySelectorAll('.mode-group:first-child .mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.textContent === newMode);
            });
            
            root.getElementById('timeModes').style.display = newMode === 'time' ? 'flex' : 'none';
            root.getElementById('wordModes').style.display = newMode === 'words' ? 'flex' : 'none';
            
            if (newMode === 'time') subMode = 30;
            else if (newMode === 'words') subMode = 25;
            else if (newMode === 'quote') subMode = 0;
            else if (newMode === 'zen') subMode = 0;
            
            restartTest();
        }

        function setSubMode(val) {
            subMode = val;
            const container = mode === 'time' ? root.getElementById('timeModes') : root.getElementById('wordModes');
            container.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.textContent) === val);
            });
            restartTest();
        }

        function showMain() {
            hideAllScreens();
            root.getElementById('mainTest').style.display = 'flex';
            root.getElementById('navMain').classList.add('active');
            root.getElementById('navGames').classList.remove('active');
            restartTest();
        }

        function showGames() {
            hideAllScreens();
            root.getElementById('gamesMenu').classList.add('show');
            root.getElementById('navMain').classList.remove('active');
            root.getElementById('navGames').classList.add('active');
            stopAllGames();
        }

        function showAbout() {
            alert('MonkeyType Clone\n\nA fully functional typing test with 6 additional challenging games.\n\nFeatures:\n- Time, Words, Quote, and Zen modes\n- Real-time WPM/Accuracy tracking\n- Detailed results with consistency graph\n- Ghost, Rainfall, Memory, Reverse, Chaos, and Survival games');
        }

        function hideAllScreens() {
            root.getElementById('mainTest').style.display = 'none';
            root.getElementById('gamesMenu').classList.remove('show');
            root.querySelectorAll('.game-screen').forEach(s => s.classList.remove('show'));
        }

        function startGame(game) {
            hideAllScreens();
            root.getElementById(game + 'Game').classList.add('show');
            
            switch(game) {
                case 'ghost': startGhost(); break;
                case 'rainfall': startRainfall(); break;
                case 'memory': startMemory(); break;
                case 'reverse': startReverse(); break;
                case 'chaos': startChaos(); break;
                case 'survival': startSurvival(); break;
            }
        }

        function stopAllGames() {
            clearInterval(rainfallInterval);
            clearInterval(survivalInterval);
            clearInterval(chaosInterval);
            clearTimeout(ghostTimeout);
        }

        let ghostTimeout = null;
        let ghostWords = [];
        let ghostCurrent = 0;
        let ghostScore = 0;
        let ghostStartTime = null;
        let ghostInputBuffer = '';

        function startGhost() {
            clearTimeout(ghostTimeout);
            ghostWords = [];
            ghostCurrent = 0;
            ghostScore = 0;
            ghostInputBuffer = '';
            ghostStartTime = Date.now();
            
            for (let i = 0; i < 30; i++) {
                ghostWords.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
            }
            
            renderGhost();
            root.getElementById('ghostArea').focus();
        }

        function renderGhost() {
            const area = root.getElementById('ghostArea');
            area.innerHTML = '';
            ghostWords.forEach((word, i) => {
                const span = document.createElement('span');
                span.className = 'ghost-word';
                span.textContent = word;
                span.dataset.index = i;
                area.appendChild(span);
            });
        }

        document.addEventListener('keydown', function ghostHandler(e) {
            if (!root.getElementById('ghostGame').classList.contains('show')) return;
            if (e.key === ' ') {
                e.preventDefault();
                if (ghostInputBuffer.trim() === ghostWords[ghostCurrent]) {
                    ghostScore++;
                    root.getElementById('ghostScore').textContent = ghostScore;
                    const wordEl = root.querySelector(`#ghostArea [data-index="${ghostCurrent}"]`);
                    if (wordEl) {
                        wordEl.classList.add('fading');
                        setTimeout(() => wordEl.classList.add('gone'), 500);
                    }
                    ghostCurrent++;
                    ghostInputBuffer = '';
                    
                    if (ghostCurrent >= ghostWords.length) {
                        const time = ((Date.now() - ghostStartTime) / 1000 / 60);
                        const wpm = Math.round((ghostScore * 5) / time);
                        root.getElementById('ghostWpm').textContent = wpm;
                        setTimeout(() => alert(`Ghost Mode Complete!\nWPM: ${wpm}\nScore: ${ghostScore}`), 600);
                    }
                } else {
                    ghostInputBuffer = '';
                }
            } else if (e.key === 'Backspace') {
                ghostInputBuffer = ghostInputBuffer.slice(0, -1);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                ghostInputBuffer += e.key;
            }
        });

        let rainfallInterval = null;
        let rainWords = [];
        let rainScore = 0;
        let rainLives = 3;
        let rainCanvas, rainCtx;
        let rainInput;

        function startRainfall() {
            clearInterval(rainfallInterval);
            rainCanvas = root.getElementById('rainfallCanvas');
            rainCtx = rainCanvas.getContext('2d');
            rainCanvas.width = rainCanvas.offsetWidth;
            rainCanvas.height = rainCanvas.offsetHeight;
            
            rainWords = [];
            rainScore = 0;
            rainLives = 3;
            rainInput = root.getElementById('rainInput');
            rainInput.value = '';
            rainInput.focus();
            
            updateRainLives();
            
            rainfallInterval = setInterval(() => {
                updateRainfall();
                drawRainfall();
            }, 1000 / 60);
            
            rainInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const val = rainInput.value.trim().toLowerCase();
                    const hit = rainWords.findIndex(w => w.text === val);
                    if (hit !== -1) {
                        rainWords.splice(hit, 1);
                        rainScore += 10;
                        root.getElementById('rainScore').textContent = rainScore;
                        rainInput.value = '';
                    }
                }
            };
        }

        function updateRainfall() {
            if (Math.random() < 0.015 && rainWords.length < 6) {
                const word = commonWords[Math.floor(Math.random() * commonWords.length)];
                rainWords.push({
                    text: word,
                    x: Math.random() * (rainCanvas.width - 100) + 50,
                    y: -30,
                    speed: 0.5 + Math.random() * 0.5 + (rainScore / 500)
                });
            }
            
            for (let i = rainWords.length - 1; i >= 0; i--) {
                rainWords[i].y += rainWords[i].speed;
                if (rainWords[i].y > rainCanvas.height - 20) {
                    rainWords.splice(i, 1);
                    rainLives--;
                    updateRainLives();
                    if (rainLives <= 0) {
                        clearInterval(rainfallInterval);
                        setTimeout(() => alert(`Game Over!\nScore: ${rainScore}`), 100);
                    }
                }
            }
        }

        function drawRainfall() {
            rainCtx.fillStyle = '#2c2e31';
            rainCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);
            
            rainCtx.fillStyle = '#d1d0c5';
            rainCtx.font = '20px Roboto Mono';
            rainCtx.textAlign = 'center';
            
            rainWords.forEach(w => {
                rainCtx.fillText(w.text, w.x, w.y);
            });
        }

        function updateRainLives() {
            root.getElementById('rainLives').textContent = String(Math.max(0, rainLives));
        }

        let memLevel = 1;
        let memScore = 0;
        let memWords = [];
        let memRevealed = false;
        let memCurrent = 0;

        function startMemory() {
            memLevel = 1;
            memScore = 0;
            root.getElementById('memLevel').textContent = memLevel;
            root.getElementById('memScore').textContent = memScore;
            root.getElementById('memNext').style.display = 'none';
            nextMemoryLevel();
        }

        function nextMemoryLevel() {
            memRevealed = false;
            memCurrent = 0;
            const count = Math.min(2 + memLevel, 12);
            memWords = [];
            
            for (let i = 0; i < count; i++) {
                memWords.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
            }
            
            renderMemory();
            
            setTimeout(() => {
                root.querySelectorAll('.memory-card').forEach(card => {
                    card.classList.add('hidden');
                    card.classList.remove('revealed');
                });
                memRevealed = true;
                root.getElementById('memInput').focus();
            }, 2000 + memLevel * 300);
            
            root.getElementById('memInput').value = '';
        }

        function renderMemory() {
            const grid = root.getElementById('memoryGrid');
            grid.innerHTML = '';
            memWords.forEach((word, i) => {
                const card = document.createElement('div');
                card.className = 'memory-card revealed';
                card.textContent = word;
                card.dataset.index = i;
                grid.appendChild(card);
            });
        }

        root.getElementById('memInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && memRevealed) {
                const val = e.target.value.trim().toLowerCase();
                const cards = root.querySelectorAll('.memory-card');
                
                if (val === memWords[memCurrent]) {
                    cards[memCurrent].classList.remove('hidden');
                    cards[memCurrent].classList.add('correct');
                    memCurrent++;
                    memScore += 10;
                    root.getElementById('memScore').textContent = memScore;
                    e.target.value = '';
                    
                    if (memCurrent >= memWords.length) {
                        memLevel++;
                        root.getElementById('memLevel').textContent = memLevel;
                        root.getElementById('memNext').style.display = 'block';
                    }
                } else {
                    cards[memCurrent].classList.remove('hidden');
                    cards[memCurrent].classList.add('wrong');
                    cards[memCurrent].textContent = memWords[memCurrent];
                    setTimeout(() => {
                        alert(`Wrong! Game Over.\nFinal Score: ${memScore}`);
                        startMemory();
                    }, 500);
                }
            }
        });

        root.getElementById('memNext').addEventListener('click', () => {
            root.getElementById('memNext').style.display = 'none';
            nextMemoryLevel();
        });

        let revStreak = 0;
        let revCurrent = '';
        let revStart = null;

        function startReverse() {
            revStreak = 0;
            revStart = Date.now();
            nextReverse();
            root.getElementById('revInput').focus();
        }

        function nextReverse() {
            revCurrent = commonWords[Math.floor(Math.random() * commonWords.length)];
            root.getElementById('reverseDisplay').textContent = revCurrent;
            root.getElementById('reverseHint').textContent = 'type: ' + revCurrent.split('').reverse().join('');
            root.getElementById('revInput').value = '';
        }

        root.getElementById('revInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = e.target.value.trim().toLowerCase();
                const reversed = revCurrent.split('').reverse().join('');
                
                if (val === reversed) {
                    revStreak++;
                    root.getElementById('revStreak').textContent = revStreak;
                    
                    const time = ((Date.now() - revStart) / 1000 / 60);
                    const wpm = Math.round((revStreak * 5) / time) || 0;
                    root.getElementById('revWpm').textContent = wpm;
                    
                    nextReverse();
                } else {
                    alert(`Wrong! Streak: ${revStreak}\nCorrect was: ${reversed}`);
                    revStreak = 0;
                    root.getElementById('revStreak').textContent = 0;
                    revStart = Date.now();
                    nextReverse();
                }
            }
        });

        let chaosInterval = null;
        let chaosScore = 0;
        let chaosTime = 60;
        let chaosWords = [];
        let chaosCurrent = 0;

        function startChaos() {
            clearInterval(chaosInterval);
            chaosScore = 0;
            chaosTime = 60;
            chaosCurrent = 0;
            root.getElementById('chaosScore').textContent = '0';
            root.getElementById('chaosTime').textContent = '60';
            
            chaosWords = [];
            for (let i = 0; i < 50; i++) {
                chaosWords.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
            }
            
            renderChaos();
            root.getElementById('chaosInput').value = '';
            root.getElementById('chaosInput').focus();
            
            chaosInterval = setInterval(() => {
                chaosTime--;
                root.getElementById('chaosTime').textContent = chaosTime;
                
                root.querySelectorAll('.chaos-letter').forEach(letter => {
                    if (Math.random() < 0.05) {
                        letter.classList.add('shake');
                        setTimeout(() => letter.classList.remove('shake'), 300);
                    }
                    if (Math.random() < 0.03) {
                        letter.classList.add('glitch');
                        setTimeout(() => letter.classList.remove('glitch'), 300);
                    }
                    if (Math.random() < 0.02) {
                        letter.style.textTransform = Math.random() > 0.5 ? 'uppercase' : 'lowercase';
                    }
                });
                
                if (chaosTime <= 0) {
                    clearInterval(chaosInterval);
                    alert(`Chaos Over!\nScore: ${chaosScore}`);
                }
            }, 1000);
        }

        function renderChaos() {
            const area = root.getElementById('chaosArea');
            area.innerHTML = '';
            chaosWords.forEach((word, wi) => {
                word.split('').forEach((char, ci) => {
                    const span = document.createElement('span');
                    span.className = 'chaos-letter';
                    span.textContent = char;
                    span.dataset.word = wi;
                    span.dataset.char = ci;
                    area.appendChild(span);
                });
                area.appendChild(document.createTextNode(' '));
            });
        }

        root.getElementById('chaosInput').addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                const val = e.target.value.trim().toLowerCase();
                if (val === chaosWords[chaosCurrent]) {
                    root.querySelectorAll(`[data-word="${chaosCurrent}"]`).forEach(el => {
                        el.style.color = 'var(--main-color)';
                        el.style.opacity = '0.3';
                    });
                    chaosScore += chaosWords[chaosCurrent].length;
                    chaosCurrent++;
                    root.getElementById('chaosScore').textContent = chaosScore;
                    e.target.value = '';
                }
            }
        });

        let survivalInterval = null;
        let survScore = 0;
        let survLevel = 1;
        let survHealth = 100;
        let survMaxHealth = 100;
        let survCurrentWord = '';
        let survCurrentIndex = 0;
        let survDecayRate = 0.5;

        function startSurvival() {
            clearInterval(survivalInterval);
            survScore = 0;
            survLevel = 1;
            survHealth = 100;
            survMaxHealth = 100;
            survDecayRate = 0.5;
            root.getElementById('survScore').textContent = '0';
            root.getElementById('survLevel').textContent = '1';
            updateSurvBar();
            
            nextSurvivalWord();
            root.getElementById('survInput').value = '';
            root.getElementById('survInput').focus();
            
            survivalInterval = setInterval(() => {
                survHealth -= survDecayRate;
                if (survHealth <= 0) {
                    survHealth = 0;
                    clearInterval(survivalInterval);
                    setTimeout(() => {
                        alert(`Game Over!\nLevel: ${survLevel}\nScore: ${survScore}`);
                    }, 200);
                }
                updateSurvBar();
            }, 100);
        }

        function nextSurvivalWord() {
            const minLen = Math.min(3 + Math.floor(survLevel / 2), 10);
            const candidates = commonWords.filter(w => w.length >= minLen && w.length <= minLen + 4);
            survCurrentWord = candidates[Math.floor(Math.random() * candidates.length)] || commonWords[Math.floor(Math.random() * commonWords.length)];
            survCurrentIndex = 0;
            
            const wordEl = root.getElementById('survWord');
            wordEl.innerHTML = '';
            survCurrentWord.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = char;
                wordEl.appendChild(span);
            });
        }

        function updateSurvBar() {
            const pct = (survHealth / survMaxHealth) * 100;
            root.getElementById('survBar').style.width = pct + '%';
            
            const r = Math.min(255, Math.floor((100 - pct) * 2.55));
            const g = Math.min(255, Math.floor(pct * 2.55));
            root.getElementById('survBar').style.background = `linear-gradient(90deg, rgb(${r},${g},0), var(--main-color))`;
        }

        root.getElementById('survInput').addEventListener('input', (e) => {
            const val = e.target.value;
            const chars = root.querySelectorAll('#survWord .char');
            
            for (let i = 0; i < val.length; i++) {
                if (i >= survCurrentWord.length) break;
                
                if (val[i] === survCurrentWord[i]) {
                    chars[i].classList.add('correct');
                    chars[i].classList.remove('wrong');
                } else {
                    chars[i].classList.add('wrong');
                    chars[i].classList.remove('correct');
                    survHealth = Math.max(0, survHealth - 5);
                    updateSurvBar();
                }
            }
            
            for (let i = val.length; i < chars.length; i++) {
                chars[i].classList.remove('correct', 'wrong');
            }
            
            if (val === survCurrentWord) {
                survScore += survCurrentWord.length * 10;
                root.getElementById('survScore').textContent = survScore;
                
                survHealth = Math.min(survMaxHealth, survHealth + 10);
                
                if (survScore > survLevel * 500) {
                    survLevel++;
                    root.getElementById('survLevel').textContent = survLevel;
                    survDecayRate += 0.2;
                }
                
                e.target.value = '';
                nextSurvivalWord();
            }
        });

        init();
    

    function isMyWindowFocused() {
      const winEl = body.closest('.window');
      return !!winEl && winEl.classList.contains('focused');
    }
    document.addEventListener('keydown', (e) => { if (isMyWindowFocused()) handleKeydown(e); });

    init();

    const unsubscribe = Bus.on('window:closed', ({ id }) => {
      if (id !== ctx.winId) return;
      clearInterval(timer);
      clearInterval(rainfallInterval);
      clearInterval(survivalInterval);
      clearInterval(chaosInterval);
      clearTimeout(ghostTimeout);
      unsubscribe();
    });
  }
});

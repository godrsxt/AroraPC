/* =========================================================
   Paint — built-in app. Runs inside a Shadow DOM for the same reason
   as Typing Test: isolates its many generic IDs/classes (#canvas,
   .tool-btn, .status-bar, etc.) from Aurora and from any other open
   window. Saves real PNGs to /Pictures via AuroraStorage.
   ========================================================= */
AppRegistry.register('paint', {
  title: 'Paint',
  icon: Icons.paint(),
  color: 'linear-gradient(135deg,#ff8a65,#ff5252)',
  defaultSize: { w: 880, h: 680 },
  mount(body, winCtx) {
    const host = document.createElement('div');
    host.style.cssText = 'width:100%;height:100%;overflow:hidden;display:flex;';
    body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #c0c0c0;
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        

        

        

        

        

        

        

        .menu-bar {
            background: #c0c0c0;
            border-bottom: 1px solid #808080;
            padding: 1px 0;
            display: flex;
            height: 24px;
        }

        .menu-item {
            padding: 2px 8px;
            font-size: 13px;
            cursor: pointer;
            position: relative;
        }

        .menu-item:hover {
            background: #000080;
            color: white;
        }

        .menu-item span {
            text-decoration: underline;
        }

        .main-container {
            display: flex;
            flex: 1;
            overflow: hidden;
            padding: 2px;
            gap: 2px;
        }

        .toolbox {
            width: 58px;
            background: #c0c0c0;
            border: 1px solid #fff;
            border-right-color: #404040;
            border-bottom-color: #404040;
            padding: 2px;
            display: flex;
            flex-wrap: wrap;
            gap: 1px;
            align-content: flex-start;
            height: fit-content;
        }

        .tool-btn {
            width: 25px;
            height: 25px;
            background: #c0c0c0;
            border: 1px solid #fff;
            border-right-color: #404040;
            border-bottom-color: #404040;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            position: relative;
        }

        .tool-btn.active {
            background: #c0c0c0;
            border: 1px solid #404040;
            border-right-color: #fff;
            border-bottom-color: #fff;
        }

        .tool-btn:hover:not(.active) {
            background: #d4d0c8;
        }

        .icon-pencil::before { content: 'P'; font-size: 12px; font-weight:bold; }
        .icon-brush::before { content: 'B'; font-size: 12px; font-weight:bold; }
        .icon-eraser::before { content: 'E'; font-size: 12px; font-weight:bold; }
        .icon-fill::before { content: 'F'; font-size: 12px; font-weight:bold; }
        .icon-picker::before { content: 'K'; font-size: 12px; font-weight:bold; }
        .icon-magnifier::before { content: 'Z'; font-size: 12px; font-weight:bold; }
        .icon-text::before { content: 'A'; font-family: serif; font-weight: bold; font-size: 14px; }
        .icon-line::before { content: 'L'; font-size: 12px; font-weight:bold; }
        .icon-rect::before { content: '\\25AD'; font-size: 14px; }
        .icon-ellipse::before { content: '\\2B2D'; font-size: 14px; }
        .icon-spray::before { content: 'S'; font-size: 12px; font-weight:bold; }
        .icon-round::before { content: '\\25A2'; font-size: 14px; }
        .icon-curve::before { content: 'C'; font-size: 12px; font-weight:bold; }
        .icon-poly::before { content: '\\2B21'; font-size: 14px; }

        .canvas-area {
            flex: 1;
            background: #808080;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: auto;
            border: 1px inset #808080;
        }

        .canvas-wrapper {
            background: white;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
            position: relative;
        }

        canvas {
            display: block;
            cursor: crosshair;
            background: white;
        }

        .options-box {
            width: 58px;
            background: #c0c0c0;
            border: 1px solid #fff;
            border-right-color: #404040;
            border-bottom-color: #404040;
            margin-top: 4px;
            padding: 4px;
            height: 120px;
        }

        .options-label {
            font-size: 11px;
            margin-bottom: 4px;
            text-align: center;
            border-bottom: 1px solid #808080;
            padding-bottom: 2px;
        }

        .size-btn {
            width: 100%;
            height: 18px;
            margin: 2px 0;
            background: #c0c0c0;
            border: 1px solid #fff;
            border-right-color: #404040;
            border-bottom-color: #404040;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .size-btn.active {
            border: 1px solid #404040;
            border-right-color: #fff;
            border-bottom-color: #fff;
        }

        .size-line {
            background: #000;
            border-radius: 1px;
        }

        .bottom-bar {
            background: #c0c0c0;
            border-top: 1px solid #fff;
            padding: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            height: 52px;
        }

        .color-preview {
            width: 40px;
            height: 36px;
            background: #c0c0c0;
            border: 1px solid #fff;
            border-right-color: #404040;
            border-bottom-color: #404040;
            position: relative;
            cursor: pointer;
        }

        .color-fore {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #000;
            border: 1px solid #808080;
            top: 2px;
            left: 2px;
            z-index: 2;
        }

        .color-back {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #fff;
            border: 1px solid #808080;
            bottom: 2px;
            right: 2px;
            z-index: 1;
        }

        .color-swap {
            position: absolute;
            top: 1px;
            right: 1px;
            font-size: 10px;
            cursor: pointer;
            z-index: 3;
        }

        .palette {
            display: flex;
            flex-wrap: wrap;
            width: 308px;
            gap: 1px;
        }

        .color-cell {
            width: 16px;
            height: 16px;
            border: 1px solid #808080;
            cursor: pointer;
        }

        .color-cell:hover {
            border-color: #fff;
        }

        .color-cell.selected {
            border: 2px solid #000;
        }

        .status-bar {
            background: #c0c0c0;
            border-top: 1px solid #fff;
            padding: 2px 4px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            height: 22px;
            align-items: center;
        }

        .status-section {
            border: 1px inset #c0c0c0;
            padding: 1px 6px;
            min-width: 100px;
        }

        .text-input {
            position: absolute;
            border: 1px dashed #000;
            background: transparent;
            outline: none;
            font-family: Arial, sans-serif;
            font-size: 16px;
            padding: 2px;
            min-width: 50px;
            min-height: 20px;
            z-index: 100;
            resize: both;
            overflow: hidden;
        }

        .tooltip {
            position: fixed;
            background: #ffffe0;
            border: 1px solid #000;
            padding: 2px 6px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            display: none;
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.3);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }

        .modal {
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            padding: 10px;
            min-width: 300px;
        }

        .modal-title {
            background: #000080;
            color: white;
            padding: 3px 6px;
            margin: -10px -10px 10px -10px;
            font-weight: bold;
            font-size: 13px;
        }

        .modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 10px;
        }

        .modal-btn {
            padding: 4px 16px;
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
            cursor: pointer;
            font-size: 12px;
        }

        .modal-btn:active {
            border-style: inset;
        }

        ::-webkit-scrollbar {
            width: 16px;
            height: 16px;
        }

        ::-webkit-scrollbar-track {
            background: #c0c0c0;
        }

        ::-webkit-scrollbar-thumb {
            background: #c0c0c0;
            border: 2px outset #c0c0c0;
        }

        ::-webkit-scrollbar-corner {
            background: #c0c0c0;
        }

        .fill-option {
            margin-top: 4px;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .fill-option input {
            margin: 0;
        }
    </style><div class="menu-bar">
        <div class="menu-item" data-onclick="menuAction('file')"><span>F</span>ile</div>
        <div class="menu-item" data-onclick="menuAction('edit')"><span>E</span>dit</div>
        <div class="menu-item" data-onclick="menuAction('view')"><span>V</span>iew</div>
        <div class="menu-item" data-onclick="menuAction('image')"><span>I</span>mage</div>
        <div class="menu-item" data-onclick="menuAction('colors')"><span>C</span>olors</div>
        <div class="menu-item" data-onclick="menuAction('help')"><span>H</span>elp</div>
    </div>

    <div class="main-container">
        <div style="display:flex;flex-direction:column;">
            <div class="toolbox" id="toolbox">
                <div class="tool-btn active" data-tool="pencil" title="Pencil" data-onclick="selectTool('pencil')">
                    <span class="icon-pencil"></span>
                </div>
                <div class="tool-btn" data-tool="brush" title="Brush" data-onclick="selectTool('brush')">
                    <span class="icon-brush"></span>
                </div>
                <div class="tool-btn" data-tool="eraser" title="Eraser" data-onclick="selectTool('eraser')">
                    <span class="icon-eraser"></span>
                </div>
                <div class="tool-btn" data-tool="fill" title="Fill With Color" data-onclick="selectTool('fill')">
                    <span class="icon-fill"></span>
                </div>
                <div class="tool-btn" data-tool="picker" title="Color Picker" data-onclick="selectTool('picker')">
                    <span class="icon-picker"></span>
                </div>
                <div class="tool-btn" data-tool="magnifier" title="Magnifier" data-onclick="selectTool('magnifier')">
                    <span class="icon-magnifier"></span>
                </div>
                <div class="tool-btn" data-tool="text" title="Text" data-onclick="selectTool('text')">
                    <span class="icon-text"></span>
                </div>
                <div class="tool-btn" data-tool="line" title="Line" data-onclick="selectTool('line')">
                    <span class="icon-line"></span>
                </div>
                <div class="tool-btn" data-tool="curve" title="Curve" data-onclick="selectTool('curve')">
                    <span class="icon-curve"></span>
                </div>
                <div class="tool-btn" data-tool="rect" title="Rectangle" data-onclick="selectTool('rect')">
                    <span class="icon-rect"></span>
                </div>
                <div class="tool-btn" data-tool="poly" title="Polygon" data-onclick="selectTool('poly')">
                    <span class="icon-poly"></span>
                </div>
                <div class="tool-btn" data-tool="ellipse" title="Ellipse" data-onclick="selectTool('ellipse')">
                    <span class="icon-ellipse"></span>
                </div>
                <div class="tool-btn" data-tool="round" title="Rounded Rectangle" data-onclick="selectTool('round')">
                    <span class="icon-round"></span>
                </div>
                <div class="tool-btn" data-tool="spray" title="Airbrush" data-onclick="selectTool('spray')">
                    <span class="icon-spray"></span>
                </div>
            </div>

            <div class="options-box">
                <div class="options-label">Options</div>
                <div class="size-btn active" data-onclick="setLineWidth(1)" title="1px">
                    <div class="size-line" style="width:8px;height:1px;"></div>
                </div>
                <div class="size-btn" data-onclick="setLineWidth(3)" title="3px">
                    <div class="size-line" style="width:10px;height:2px;"></div>
                </div>
                <div class="size-btn" data-onclick="setLineWidth(5)" title="5px">
                    <div class="size-line" style="width:12px;height:3px;"></div>
                </div>
                <div class="size-btn" data-onclick="setLineWidth(8)" title="8px">
                    <div class="size-line" style="width:14px;height:4px;"></div>
                </div>
                <div class="fill-option">
                    <input type="checkbox" id="fillShape" data-onchange="toggleFill()">
                    <label for="fillShape">Fill</label>
                </div>
            </div>
        </div>

        <div class="canvas-area" id="canvasArea">
            <div class="canvas-wrapper" id="canvasWrapper">
                <canvas id="canvas" width="800" height="600"></canvas>
            </div>
        </div>
    </div>

    <div class="bottom-bar">
        <div class="color-preview" data-onclick="swapColors()" title="Swap colors">
            <div class="color-fore" id="colorFore"></div>
            <div class="color-back" id="colorBack"></div>
            <span class="color-swap">&lt;&gt;</span>
        </div>
        <div class="palette" id="palette"></div>
    </div>

    <div class="status-bar">
        <div class="status-section" id="statusCoords">For Help, click Help Topics on the Help Menu.</div>
        <div class="status-section" id="statusSize">800 x 600px</div>
    </div>

    <input type="text" class="text-input" id="textInput" style="display:none;" placeholder="Type here...">

    <div class="tooltip" id="tooltip"></div>

    <div class="modal-overlay" id="modalOverlay">
        <div class="modal">
            <div class="modal-title" id="modalTitle">Confirm</div>
            <div id="modalContent">Are you sure?</div>
            <div class="modal-buttons">
                <button class="modal-btn" data-onclick="closeModal()">OK</button>
                <button class="modal-btn" data-onclick="closeModal()">Cancel</button>
            </div>
        </div>
    </div>`;

    root.querySelectorAll('[data-onclick]').forEach(el => {
      el.addEventListener('click', (e) => {
        try { eval(el.getAttribute('data-onclick')); } catch (err) { console.error('[paint]', err); }
      });
    });
    root.querySelectorAll('[data-onchange]').forEach(el => {
      el.addEventListener('change', () => {
        try { eval(el.getAttribute('data-onchange')); } catch (err) { console.error('[paint]', err); }
      });
    });


        const canvas = root.getElementById('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const canvasWrapper = root.getElementById('canvasWrapper');
        const textInput = root.getElementById('textInput');
        
        let currentTool = 'pencil';
        let isDrawing = false;
        let startX, startY;
        let currentX, currentY;
        let foreColor = '#000000';
        let backColor = '#ffffff';
        let lineWidth = 1;
        let fillShapes = false;
        let undoStack = [];
        let redoStack = [];
        let maxUndo = 50;
        let sprayInterval = null;
        let textPosition = null;
        let polygonPoints = [];
        let isPolyDrawing = false;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        saveState();

        const fullColors = [
            '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
            '#808080', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
            '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#ffffff', '#000000',
            '#c0c0c0', '#ff0000', '#00ff00', '#0000ff'
        ];

        const palette = root.getElementById('palette');
        fullColors.forEach((color, i) => {
            const cell = document.createElement('div');
            cell.className = 'color-cell';
            cell.style.background = color;
            cell.onclick = (e) => setColor(color, e.button !== 0);
            cell.oncontextmenu = (e) => { e.preventDefault(); setColor(color, true); };
            palette.appendChild(cell);
        });

        function selectTool(tool) {
            currentTool = tool;
            root.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            root.querySelector(`[data-tool="${tool}"]`).classList.add('active');
            
            if (tool === 'text') {
                canvas.style.cursor = 'text';
            } else if (tool === 'fill') {
                canvas.style.cursor = 'pointer';
            } else if (tool === 'picker') {
                canvas.style.cursor = 'crosshair';
            } else {
                canvas.style.cursor = 'crosshair';
            }
            
            if (tool !== 'poly') {
                isPolyDrawing = false;
                polygonPoints = [];
            }
            
            updateStatus(getToolName(tool) + ' selected');
        }

        function getToolName(tool) {
            const names = {
                pencil: 'Pencil', brush: 'Brush', eraser: 'Eraser', fill: 'Fill',
                picker: 'Color Picker', magnifier: 'Magnifier', text: 'Text',
                line: 'Line', curve: 'Curve', rect: 'Rectangle', poly: 'Polygon',
                ellipse: 'Ellipse', round: 'Rounded Rectangle', spray: 'Airbrush'
            };
            return names[tool] || tool;
        }

        function setColor(color, isBack) {
            if (isBack) {
                backColor = color;
                root.getElementById('colorBack').style.background = color;
            } else {
                foreColor = color;
                root.getElementById('colorFore').style.background = color;
            }
        }

        function swapColors() {
            const temp = foreColor;
            foreColor = backColor;
            backColor = temp;
            root.getElementById('colorFore').style.background = foreColor;
            root.getElementById('colorBack').style.background = backColor;
        }

        function setLineWidth(width) {
            lineWidth = width;
            root.querySelectorAll('.size-btn').forEach((btn, i) => {
                btn.classList.toggle('active', [1,3,5,8][i] === width);
            });
        }

        function toggleFill() {
            fillShapes = root.getElementById('fillShape').checked;
        }

        function saveState() {
            if (undoStack.length >= maxUndo) undoStack.shift();
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            redoStack = [];
        }

        function undo() {
            if (undoStack.length <= 1) return;
            redoStack.push(undoStack.pop());
            const state = undoStack[undoStack.length - 1];
            ctx.putImageData(state, 0, 0);
        }

        function redo() {
            if (redoStack.length === 0) return;
            const state = redoStack.pop();
            undoStack.push(state);
            ctx.putImageData(state, 0, 0);
        }

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: Math.floor(e.clientX - rect.left),
                y: Math.floor(e.clientY - rect.top)
            };
        }

        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0 && e.button !== 2) return;
            const pos = getPos(e);
            startX = pos.x;
            startY = pos.y;
            
            if (currentTool === 'text') {
                startText(e);
                return;
            }
            
            if (currentTool === 'picker') {
                pickColor(pos.x, pos.y, e.button !== 0);
                return;
            }
            
            if (currentTool === 'fill') {
                floodFill(pos.x, pos.y, e.button !== 0 ? backColor : foreColor);
                saveState();
                return;
            }
            
            if (currentTool === 'magnifier') {
                toggleZoom();
                return;
            }
            
            isDrawing = true;
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = e.button !== 0 ? backColor : foreColor;
            ctx.fillStyle = e.button !== 0 ? backColor : foreColor;
            
            if (currentTool === 'pencil' || currentTool === 'brush') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX, startY);
                ctx.stroke();
            } else if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX, startY);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            } else if (currentTool === 'spray') {
                startSpray(pos.x, pos.y, e.button !== 0);
            } else if (currentTool === 'poly') {
                handlePolygonClick(pos.x, pos.y, e.button !== 0);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = getPos(e);
            currentX = pos.x;
            currentY = pos.y;
            updateStatus(`${pos.x}, ${pos.y}px`);
            
            if (!isDrawing) return;
            
            if (currentTool === 'pencil') {
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
            } else if (currentTool === 'brush') {
                ctx.lineWidth = lineWidth * 3;
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                ctx.lineWidth = lineWidth;
            } else if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = lineWidth * 5;
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                ctx.lineWidth = lineWidth;
                ctx.globalCompositeOperation = 'source-over';
            } else if (['line', 'rect', 'ellipse', 'round', 'curve'].includes(currentTool)) {
                if (undoStack.length > 0) {
                    ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
                }
                drawShape(startX, startY, currentX, currentY, false);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing && currentTool !== 'poly') return;
            const pos = getPos(e);
            
            if (['line', 'rect', 'ellipse', 'round', 'curve'].includes(currentTool)) {
                drawShape(startX, startY, pos.x, pos.y, true);
                saveState();
            } else if (['pencil', 'brush', 'eraser'].includes(currentTool)) {
                saveState();
            } else if (currentTool === 'spray') {
                stopSpray();
                saveState();
            }
            
            isDrawing = false;
        });

        canvas.addEventListener('mouseleave', () => {
            if (isDrawing && currentTool === 'spray') {
                stopSpray();
                saveState();
            }
            isDrawing = false;
        });

        function drawShape(x1, y1, x2, y2, final) {
            ctx.beginPath();
            ctx.lineWidth = lineWidth;
            
            if (currentTool === 'line') {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (currentTool === 'rect') {
                const w = x2 - x1, h = y2 - y1;
                if (fillShapes) {
                    ctx.fillRect(x1, y1, w, h);
                }
                ctx.strokeRect(x1, y1, w, h);
            } else if (currentTool === 'round') {
                const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
                const rx = Math.min(20, w/4), ry = Math.min(20, h/4);
                roundRect(ctx, Math.min(x1,x2), Math.min(y1,y2), w, h, rx, ry, fillShapes);
            } else if (currentTool === 'ellipse') {
                const rx = Math.abs(x2 - x1) / 2;
                const ry = Math.abs(y2 - y1) / 2;
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                if (fillShapes) ctx.fill();
                ctx.stroke();
            } else if (currentTool === 'curve') {
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(x1, y2, x2, y2);
                ctx.stroke();
            }
        }

        function roundRect(ctx, x, y, w, h, r1, r2, fill) {
            ctx.beginPath();
            ctx.moveTo(x + r1, y);
            ctx.lineTo(x + w - r1, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r2);
            ctx.lineTo(x + w, y + h - r2);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r1, y + h);
            ctx.lineTo(x + r1, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r2);
            ctx.lineTo(x, y + r2);
            ctx.quadraticCurveTo(x, y, x + r1, y);
            ctx.closePath();
            if (fill) ctx.fill();
            ctx.stroke();
        }

        function startSpray(x, y, isBack) {
            const color = isBack ? backColor : foreColor;
            sprayInterval = setInterval(() => {
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * lineWidth * 5;
                    const px = x + Math.cos(angle) * radius;
                    const py = y + Math.sin(angle) * radius;
                    ctx.fillStyle = color;
                    ctx.fillRect(px, py, 1, 1);
                }
            }, 30);
        }

        function stopSpray() {
            if (sprayInterval) {
                clearInterval(sprayInterval);
                sprayInterval = null;
            }
        }

        function handlePolygonClick(x, y, isBack) {
            if (!isPolyDrawing) {
                polygonPoints = [{x, y}];
                isPolyDrawing = true;
                ctx.fillStyle = isBack ? backColor : foreColor;
                ctx.strokeStyle = isBack ? backColor : foreColor;
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else {
                polygonPoints.push({x, y});
                ctx.lineTo(x, y);
                ctx.stroke();
                
                const start = polygonPoints[0];
                const dist = Math.hypot(x - start.x, y - start.y);
                if (dist < 10 || polygonPoints.length > 10) {
                    ctx.closePath();
                    if (fillShapes) ctx.fill();
                    ctx.stroke();
                    isPolyDrawing = false;
                    polygonPoints = [];
                    saveState();
                }
            }
        }

        function floodFill(startX, startY, fillColor) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;
            
            const startPos = (startY * width + startX) * 4;
            const startR = data[startPos];
            const startG = data[startPos + 1];
            const startB = data[startPos + 2];
            const startA = data[startPos + 3];
            
            const fill = hexToRgb(fillColor);
            if (!fill) return;
            
            if (startR === fill.r && startG === fill.g && startB === fill.b && startA === 255) return;
            
            const stack = [[startX, startY]];
            
            while (stack.length) {
                const [x, y] = stack.pop();
                const pos = (y * width + x) * 4;
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                if (data[pos] !== startR || data[pos + 1] !== startG || data[pos + 2] !== startB || data[pos + 3] !== startA) continue;
                
                data[pos] = fill.r;
                data[pos + 1] = fill.g;
                data[pos + 2] = fill.b;
                data[pos + 3] = 255;
                
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
            
            ctx.putImageData(imageData, 0, 0);
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function pickColor(x, y, isBack) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
            setColor(hex, isBack);
            updateStatus(`Color picked: ${hex}`);
        }

        function startText(e) {
            const pos = getPos(e);
            textPosition = pos;
            textInput.style.display = 'block';
            textInput.style.left = (canvas.offsetLeft + pos.x) + 'px';
            textInput.style.top = (canvas.offsetTop + pos.y) + 'px';
            textInput.style.color = foreColor;
            textInput.value = '';
            textInput.focus();
        }

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                commitText();
            }
        });

        textInput.addEventListener('blur', commitText);

        function commitText() {
            if (!textPosition || textInput.style.display === 'none') return;
            const text = textInput.value;
            if (text) {
                ctx.font = `${16 + lineWidth * 2}px Arial`;
                ctx.fillStyle = foreColor;
                ctx.fillText(text, textPosition.x, textPosition.y + 16);
                saveState();
            }
            textInput.style.display = 'none';
            textPosition = null;
        }

        let zoomLevel = 1;
        function toggleZoom() {
            zoomLevel = zoomLevel === 1 ? 2 : 1;
            canvas.style.width = (canvas.width * zoomLevel) + 'px';
            canvas.style.height = (canvas.height * zoomLevel) + 'px';
            updateStatus(zoomLevel === 2 ? 'Zoom: 200%' : 'Zoom: 100%');
        }

        function menuAction(action) {
            switch(action) {
                case 'file':
                    const choice = confirm('New file? Click OK to clear canvas, Cancel to save first.');
                    if (choice) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        saveState();
                    } else {
                        saveImage();
                    }
                    break;
                case 'edit':
                    break;
                case 'view':
                    toggleZoom();
                    break;
                case 'image':
                    alert('Image attributes would go here');
                    break;
                case 'colors':
                    break;
                case 'help':
                    alert('MS Paint Clone\n\nTools:\n- Pencil/Brush: Draw freehand\n- Shapes: Click and drag\n- Fill: Click to flood fill\n- Text: Click to place text\n- Spray: Click and hold\n- Polygon: Click multiple points, double-click to finish\n\nColors:\n- Left click: Foreground color\n- Right click: Background color');
                    break;
            }
        }

        async function saveImage() {
            const suggested = 'untitled.png';
            const name = prompt('Save as:', suggested) || suggested;
            const finalName = name.toLowerCase().endsWith('.png') ? name : name + '.png';
            const dataUrl = canvas.toDataURL('image/png');
            await AuroraStorage.fileSet({
                path: '/Pictures/' + finalName, name: finalName, type: 'image',
                parent: '/Pictures', content: dataUrl, modified: Date.now()
            });
            updateStatus('Saved as ' + finalName);
        }

        // (Ctrl+Z/Y/S/Escape shortcuts attached below, wrapped with a focus guard)

        function updateStatus(msg) {
            root.getElementById('statusCoords').textContent = msg;
        }

        function minimize() {
            alert('Minimize not implemented in web version');
        }

        function maximize() {
            if (canvas.width < 1200) {
                canvas.width = 1200;
                canvas.height = 800;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                saveState();
                root.getElementById('statusSize').textContent = '1200 x 800px';
            }
        }

        function closeApp() {
            if (confirm('Do you want to save changes to untitled?')) {
                saveImage();
            }
        }

        function showModal(title, content) {
            root.getElementById('modalTitle').textContent = title;
            root.getElementById('modalContent').textContent = content;
            root.getElementById('modalOverlay').style.display = 'flex';
        }

        function closeModal() {
            root.getElementById('modalOverlay').style.display = 'none';
        }

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        const tooltip = root.getElementById('tooltip');
        root.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                tooltip.textContent = btn.title;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            });
            btn.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });

        updateStatus('Ready');
    

    function isMyWindowFocused() {
      const winEl = body.closest('.window');
      return !!winEl && winEl.classList.contains('focused');
    }
    // The original script's Ctrl+Z/Y/S/Escape shortcuts are on
    // document -- guard them the same way as Typing Test.
    const _shortcuts = (e) => {
      if (!isMyWindowFocused()) return;
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveImage(); }
      else if (e.key === 'Escape') {
        textInput.style.display = 'none';
        isPolyDrawing = false;
        polygonPoints = [];
        if (undoStack.length > 0) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
      }
    };
    document.addEventListener('keydown', _shortcuts);

    const unsubscribe = Bus.on('window:closed', ({ id }) => {
      if (id !== winCtx.winId) return;
      stopSpray();
      document.removeEventListener('keydown', _shortcuts);
      unsubscribe();
    });
  }
});

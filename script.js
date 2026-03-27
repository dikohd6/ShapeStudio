/**
 * Shape Studio - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {

   
    const AppState = {
        shapes: [],
        selection: [], // array of shape IDs
        history: [], // array of shape states
        redoStack: [],
        mode: 'beginner',
        fileName: 'Untitled File',
        settings: {
            snapToGrid: false,
            gridSize: 20,
            snapToObjects: true,
            zoom: 1,
            panX: 0,
            panY: 0,
            canvasW: 900,
            canvasH: 600
        },
        drawConfig: {
            mode: 'pen', //pen or highlighter
            color: '#444444',
            thickness: 2
        },
        textConfig: {
            fontFamily: 'sans-serif',
            fontSize: 24,
            bold: false,
            italic: false,
            textAlign: 'center',
            color: '#000000'
        },
        eraserConfig: {
            mode: 'object', //object or partial
            size: 20
        },
        activeTool: 'select'
    };

    let shapeCounter = 0;

    function applyCanvasSettingsToDOM() {
        if (DOM.canvasW) DOM.canvasW.value = AppState.settings.canvasW;
        if (DOM.canvasH) DOM.canvasH.value = AppState.settings.canvasH;
        if (DOM.snapGrid) DOM.snapGrid.value = AppState.settings.gridSize;
        DOM.canvas.style.width = `${AppState.settings.canvasW}px`;
        DOM.canvas.style.height = `${AppState.settings.canvasH}px`;
        DOM.canvas.style.backgroundSize = `${AppState.settings.gridSize}px ${AppState.settings.gridSize}px`;
    }

    // Save history point
    function commitHistory() {
        // Deep copy shapes and settings
        const stateSnap = {
            shapes: JSON.parse(JSON.stringify(AppState.shapes)),
            settings: JSON.parse(JSON.stringify(AppState.settings))
        };
        AppState.history.push(stateSnap);
        AppState.redoStack = []; // clear redo on new action
        if (AppState.history.length > 50) AppState.history.shift();
    }

    function undo() {
        if (AppState.history.length === 0) return;
        
        const currentSnap = {
            shapes: JSON.parse(JSON.stringify(AppState.shapes)),
            settings: JSON.parse(JSON.stringify(AppState.settings))
        };
        AppState.redoStack.push(currentSnap);

        const prevSnap = AppState.history.pop();
        if (Array.isArray(prevSnap)) {
            AppState.shapes = prevSnap;
        } else {
            AppState.shapes = prevSnap.shapes;
            AppState.settings = prevSnap.settings;
            applyCanvasSettingsToDOM();
        }

        AppState.selection = []; // clear selection on undo for simplicity
        renderAll();
    }

    function redo() {
        if (AppState.redoStack.length === 0) return;
        
        const currentSnap = {
            shapes: JSON.parse(JSON.stringify(AppState.shapes)),
            settings: JSON.parse(JSON.stringify(AppState.settings))
        };
        AppState.history.push(currentSnap);

        const nextSnap = AppState.redoStack.pop();
        if (Array.isArray(nextSnap)) {
            AppState.shapes = nextSnap;
        } else {
            AppState.shapes = nextSnap.shapes;
            AppState.settings = nextSnap.settings;
            applyCanvasSettingsToDOM();
        }

        AppState.selection = [];
        renderAll();
    }

    // Initialize first state
    commitHistory();

    //DOM Elements
    const DOM = {
        canvas: document.getElementById('canvas-container'),
        ghost: document.getElementById('drag-ghost'),
        toolbar: document.getElementById('context-toolbar'),

        inspX: document.getElementById('insp-x'),
        inspY: document.getElementById('insp-y'),
        inspW: document.getElementById('insp-w'),
        inspH: document.getElementById('insp-h'),
        inspRot: document.getElementById('insp-rot'),
        inspFill: document.getElementById('insp-fill'),
        inspStroke: document.getElementById('insp-stroke'),
        inspOpacity: document.getElementById('insp-opacity'),
        inspOpacityVal: document.getElementById('insp-opacity-val'),
        inspRad: document.getElementById('insp-rad'),
        inspLockAspect: document.getElementById('insp-lock-aspect'),
        inspLockPosition: document.getElementById('insp-lock-position'),
        inspLabel: document.getElementById('insp-label'),
        inspDesc: document.getElementById('insp-desc'),
        commandSuggestions: document.getElementById('command-suggestions'),
        btnSave: document.getElementById('save-btn'),
        btnImport: document.getElementById('import-btn'),
        inputImport: document.getElementById('import-input'),
        btnClearCanvas: document.getElementById('clear-canvas-btn'),
        globalSearch: document.getElementById('global-search'),
        selectionCounter: document.getElementById('selection-counter'),

        canvasW: document.getElementById('canvas-w'),
        canvasH: document.getElementById('canvas-h'),
        snapGrid: document.getElementById('snap-grid'),

        // Ribbon elements

        library: document.getElementById('library-grid'),

        btnUndo: document.getElementById('undo-btn'),
        btnRedo: document.getElementById('redo-btn'),
        btnDelete: document.getElementById('delete-btn'),
        btnDuplicate: document.getElementById('duplicate-btn'),
        btnMiniFill: document.getElementById('mini-fill-btn'),
        btnMiniStroke: document.getElementById('mini-stroke-btn'),
        btnAlign: document.getElementById('align-btn'),

        palette: document.getElementById('command-palette'),
        confirmDialog: document.getElementById('confirm-dialog'),
        btnCancelClear: document.getElementById('cancel-clear'),
        btnConfirmClear: document.getElementById('confirm-clear'),

        modeBeginner: document.getElementById('mode-beginner'),
        modeAdvanced: document.getElementById('mode-advanced'),

        toolButtons: document.querySelectorAll('.tool-btn[data-tool]'),
        fileName: document.getElementById('file-name')
    };

    if (DOM.fileName) {
        DOM.fileName.value = AppState.fileName;
    }


    function createShapeData(type, x, y) {
        shapeCounter++;
        let w = 120, h = 80;
        let fill = '#eaeaea';
        let stroke = '#444444';
        const squareish = ['square', 'circle', 'star', 'pentagon', 'hexagon', 'octagon', 'diamond', 'parallelogram', 'trapezoid', 'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down', 'double-arrow', 'cross', 'plus', 'tag'];
        let radius = 0;
        let actType = type;

        if (type === 'ui-button') {
            actType = 'rounded-rect'; w = 120; h = 40; radius = 4; fill = '#444444'; stroke = 'transparent';
        } else if (type === 'ui-input') {
            actType = 'rounded-rect'; w = 160; h = 32; radius = 4; fill = 'transparent'; stroke = '#666666';
        } else if (type === 'ui-card') {
            actType = 'rounded-rect'; w = 240; h = 320; radius = 8; fill = '#ffffff'; stroke = '#cccccc';
        } else if (type === 'ui-chip') {
            actType = 'pill'; w = 80; h = 24; fill = '#eaeaea'; stroke = 'transparent';
        } else if (squareish.includes(type)) {
            w = 100; h = 100;
        } else if (type === 'pill') {
            w = 160; h = 48;
        } else if (type === 'rounded-rect') {
            w = 140; h = 80;
        } else if (type === 'text') {
            w = 150; h = 40; fill = 'transparent'; stroke = AppState.textConfig ? AppState.textConfig.color : '#000000';
            actType = 'text';
        }

        return {
            id: 's_' + shapeCounter,
            type: actType,
            x: x - (w / 2),
            y: y - (h / 2),
            w: w,
            h: h,
            rot: 0,
            fill: fill,
            stroke: stroke,
            opacity: 100,
            text: actType === 'text' ? 'Text Box' : '',
            fontSize: AppState.textConfig ? AppState.textConfig.fontSize : 24,
            fontFamily: AppState.textConfig ? AppState.textConfig.fontFamily : 'sans-serif',
            fontWeight: AppState.textConfig && AppState.textConfig.bold ? 'bold' : 'normal',
            fontStyle: AppState.textConfig && AppState.textConfig.italic ? 'italic' : 'normal',
            textAlign: AppState.textConfig ? AppState.textConfig.textAlign : 'center',
            radius: radius,
            lockAspect: false,
            lockPosition: false,
            label: '',
            description: ''
        };
    }

    function addShape(shapeData) {
        AppState.shapes.push(shapeData);
        commitHistory();
        renderAll();
        selectShape(shapeData.id, false);
    }

    function removeSelectedShapes() {
        if (AppState.selection.length === 0) return;
        AppState.shapes = AppState.shapes.filter(s => !AppState.selection.includes(s.id));
        AppState.selection = [];
        commitHistory();
        renderAll();
        showToast('Deleted selection — Undo (Cmd+Z)');
    }

    function clearCanvas() {
        AppState.shapes = [];
        AppState.selection = [];
        commitHistory();
        renderAll();
        showToast('Cleared canvas — Undo (Cmd+Z)');
    }

    function openClearConfirm() {
        if (DOM.confirmDialog) DOM.confirmDialog.classList.remove('hidden');
    }

    function sanitizeFileName(name) {
        if (!name) return 'untitled';
        return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'untitled';
    }

    function downloadJSON(filename, data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function duplicateSelected() {
        if (AppState.selection.length === 0) return;
        const newSelection = [];
        AppState.selection.forEach(id => {
            const shape = AppState.shapes.find(s => s.id === id);
            if (shape) {
                shapeCounter++;
                const newShape = JSON.parse(JSON.stringify(shape));
                newShape.id = 's_' + shapeCounter;
                newShape.x += 20;
                newShape.y += 20;
                AppState.shapes.push(newShape);
                newSelection.push(newShape.id);
            }
        });
        commitHistory();
        AppState.selection = newSelection;
        renderAll();
        showToast('Duplicated — Undo (Cmd+Z)');
    }


    function applyCanvasTransform() {
        DOM.canvas.style.transform = `translate(${AppState.settings.panX}px, ${AppState.settings.panY}px) scale(${AppState.settings.zoom})`;
        DOM.canvas.style.transformOrigin = 'center center';
        const zoomLabel = document.getElementById('zoom-level-label');
        if (zoomLabel) zoomLabel.innerText = Math.round(AppState.settings.zoom * 100) + '%';
    }

    function renderAll() {
        // Remove existing shape elements except fixed things (ghost, toolbar)
        Array.from(DOM.canvas.children).forEach(child => {
            if (child.classList.contains('shape-element') || child.classList.contains('alignment-guide')) {
                child.remove();
            }
        });

        AppState.shapes.forEach(shape => {
            const el = document.createElement('div');
            el.id = shape.id;
            el.className = 'shape-element';

            // styling
            el.style.position = 'absolute';
            el.style.border = '1px solid #444';
            el.style.background = '#eaeaea';
            el.style.boxSizing = 'border-box';

            

            updateElementStyles(el, shape);

            // Shape Interactions
            el.addEventListener('mousedown', (e) => {
                const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                handleShapeMousedown(e, shape.id, isMulti);
            });

            if (shape.type === 'text') {
                el.addEventListener('input', (e) => {
                    shape.text = e.target.innerText;
                });

                el.addEventListener('focusout', (e) => {
                    if (e.target.classList.contains('text-inner')) {
                        e.target.contentEditable = 'false';
                        e.target.style.cursor = 'default';
                        el.style.outline = 'none';
                        window.getSelection().removeAllRanges();
                        commitHistory();
                    }
                });
            }

            DOM.canvas.appendChild(el);

            // Draw Handles if selected
            if (AppState.selection.includes(shape.id)) {
                el.classList.add('selected');
                renderHandles(el, shape.id);
            }
        });

        updateUI();
    }

    function updateElementStyles(el, shape) {
        el.style.left = shape.x + 'px';
        el.style.top = shape.y + 'px';
        el.style.width = shape.w + 'px';
        el.style.height = shape.h + 'px';
        el.style.transform = `rotate(${shape.rot}deg)`;
        el.style.opacity = shape.opacity / 100;

        el.style.backgroundColor = 'transparent';
        el.style.borderColor = 'transparent';
        el.style.borderRadius = '';
        el.style.clipPath = '';
        el.style.border = 'none';

        if (shape.type === 'text') {
            let inner = el.querySelector('.text-inner');
            if (!inner) {
                inner = document.createElement('div');
                inner.className = 'text-inner';
                inner.style.width = '100%';
                inner.style.height = '100%';
                inner.style.outline = 'none';
                el.appendChild(inner);
            }
            if (inner.contentEditable !== 'true') {
                inner.innerText = shape.text || 'Text Box';
            }
            inner.style.display = 'flex';
            inner.style.alignItems = 'center';
            inner.style.justifyContent = shape.textAlign === 'left' ? 'flex-start' : (shape.textAlign === 'right' ? 'flex-end' : 'center');
            inner.style.fontSize = shape.fontSize ? `${shape.fontSize}px` : Math.max(12, shape.h * 0.4) + 'px';
            inner.style.fontFamily = shape.fontFamily || 'sans-serif';
            inner.style.fontWeight = shape.fontWeight || 'normal';
            inner.style.fontStyle = shape.fontStyle || 'normal';
            inner.style.textAlign = shape.textAlign || 'center';
            inner.style.color = shape.stroke === 'transparent' ? '#000' : shape.stroke;
            if (shape.border !== 'none' && shape.stroke === 'transparent') {
                el.style.border = '1px dashed #ccc';
            }
            return;
        }

        if (shape.type === 'path') {
            let svgWrapper = el.querySelector('.path-svg');
            if (!svgWrapper) {
                svgWrapper = document.createElement('div');
                svgWrapper.className = 'path-svg';
                svgWrapper.style.width = '100%';
                svgWrapper.style.height = '100%';
                svgWrapper.style.pointerEvents = 'none';
                el.prepend(svgWrapper); 
            }
            const vw = shape.origW || shape.w;
            const vh = shape.origH || shape.h;
            const sw = shape.strokeWidth || 2;
            svgWrapper.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" style="overflow:visible; display:block;">
                <polyline points="${shape.points}" fill="none" stroke="${shape.stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
            </svg>`;
            return;
        }

        // For all other shapes, inject a visual child to hold clipping/backgrounds safely under handles
        let visual = el.querySelector('.shape-visual');
        if (!visual) {
            visual = document.createElement('div');
            visual.className = 'shape-visual';
            visual.style.width = '100%';
            visual.style.height = '100%';
            visual.style.position = 'absolute';
            visual.style.top = '0';
            visual.style.left = '0';
            visual.style.pointerEvents = 'none'; // pass clicks to the bounding box
            el.prepend(visual);
        }

        visual.style.backgroundColor = shape.fill;
        visual.style.border = `1px solid ${shape.stroke}`;
        visual.style.borderRadius = '';
        visual.style.clipPath = '';
        visual.innerHTML = '';

        const radiusPx = `${Math.max(0, shape.radius ?? 0)}px`;

        if (shape.type === 'circle') {
            visual.style.borderRadius = '50%';
            return;
        }

        if (shape.type === 'pill') {
            visual.style.borderRadius = shape.radius ? radiusPx : `${shape.h / 2}px`;
            return;
        }

        if (shape.type === 'rounded-rect' || shape.type === 'square') {
            visual.style.borderRadius = radiusPx;
            return;
        }

        visual.style.backgroundColor = 'transparent';
        visual.style.border = 'none';

        let points = "";
        if (shape.type === 'triangle')              points = "50,0 0,100 100,100";
        else if (shape.type === 'pentagon')         points = "50,0 100,38 82,100 18,100 0,38";
        else if (shape.type === 'hexagon')          points = "25,0 75,0 100,50 75,100 25,100 0,50";
        else if (shape.type === 'octagon')          points = "30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30";
        else if (shape.type === 'diamond')          points = "50,0 100,50 50,100 0,50";
        else if (shape.type === 'parallelogram')    points = "20,0 100,0 80,100 0,100";
        else if (shape.type === 'trapezoid')        points = "20,0 80,0 100,100 0,100";
        else if (shape.type === 'right-arrow')      points = "0,20 60,20 60,0 100,50 60,100 60,80 0,80";
        else if (shape.type === 'left-arrow')       points = "40,0 40,20 100,20 100,80 40,80 40,100 0,50";
        else if (shape.type === 'up-arrow')         points = "50,0 100,40 80,40 80,100 20,100 20,40 0,40";
        else if (shape.type === 'down-arrow')       points = "20,0 80,0 80,60 100,60 50,100 0,60 20,60";
        else if (shape.type === 'chevron-right')    points = "25,0 100,50 25,100 0,75 50,50 0,25";
        else if (shape.type === 'chevron-left')     points = "75,0 0,50 75,100 100,75 50,50 100,25";
        else if (shape.type === 'chevron-up')       points = "0,75 50,0 100,75 75,75 50,30 25,75";
        else if (shape.type === 'chevron-down')     points = "0,25 50,100 100,25 75,25 50,70 25,25";
        else if (shape.type === 'double-arrow')     points = "0,50 25,0 25,25 75,25 75,0 100,50 75,100 75,75 25,75 25,100";
        else if (shape.type === 'cross')            points = "20,0 50,30 80,0 100,20 70,50 100,80 80,100 50,70 20,100 0,80 30,50 0,20";
        else if (shape.type === 'plus')             points = "35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35";
        else if (shape.type === 'tag')              points = "0,0 75,0 100,50 75,100 0,100 0,0";
        else if (shape.type === 'star')             points = "50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35";

        if (points) {
            const sw = shape.stroke === 'transparent' ? 0 : 2;
            visual.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible; display:block;">
                <polygon points="${points}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="miter"/>
            </svg>`;
        }
    }

    function renderHandles(el, id) {
        const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handles.forEach(pos => {
            const h = document.createElement('div');
            h.className = `resize-handle ${pos}`;
            h.dataset.id = id;
            h.dataset.pos = pos;
            h.addEventListener('mousedown', handleResizeMousedown);
            el.appendChild(h);
        });
        const rot = document.createElement('div');
        rot.className = 'rotate-handle';
        rot.innerText = '⤿';
        rot.dataset.id = id;
        rot.addEventListener('mousedown', handleRotateMousedown);
        el.appendChild(rot);
    }

    //UI STUFF

    function selectShape(id, multi) {
        if (!id) {
            AppState.selection = [];
            renderAll();
            return;
        }

        if (!multi) {
            AppState.selection = [id];
        } else {
            if (AppState.selection.includes(id)) {
                AppState.selection = AppState.selection.filter(s => s !== id);
            } else {
                AppState.selection.push(id);
            }
        }
        renderAll();
    }

    function updateUI() {
        // Keep only valid selected shape IDs
        AppState.selection = AppState.selection.filter(id => AppState.shapes.some(s => s.id === id));
        
        if (DOM.selectionCounter) {
            DOM.selectionCounter.textContent = `${AppState.selection.length} Selected`;
        }

        // Toolbar visibility
        if (AppState.selection.length > 0) {
            const primary = AppState.shapes.find(s => s.id === AppState.selection[0]);
            if (!primary) {
                DOM.toolbar.classList.add('hidden');
                return;
            }

            DOM.toolbar.classList.remove('hidden');
            // Position the toolbar above and slightly left to avoid covering rotate handle
            const toolbarOffsetY = 70;
            const toolbarOffsetX = 10;
            const topPos = Math.max(0, primary.y - toolbarOffsetY);
            const leftPos = Math.max(0, primary.x - toolbarOffsetX);
            DOM.toolbar.style.top = topPos + 'px';
            DOM.toolbar.style.left = leftPos + 'px';

            // Disable all other inspector inputs
            [DOM.inspX, DOM.inspY, DOM.inspW, DOM.inspH, DOM.inspRot, DOM.inspRad, DOM.inspFill, DOM.inspStroke, DOM.inspOpacity, DOM.inspLockAspect, DOM.inspLockPosition, DOM.inspLabel, DOM.inspDesc].forEach(el => {
                if (el) el.disabled = false;
            });

            // Specific overrides based on shape type
            if ((primary.type === 'text' || primary.type === 'path') && DOM.inspFill) {
                DOM.inspFill.disabled = true;
            }

            // Enable ribbon action buttons
            const ribbonActionSelectors = ['#ribbon-copy', '#ribbon-duplicate', '#ribbon-delete', '#bring-front', '#send-back'];
            ribbonActionSelectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.disabled = false;
            });
            
            // Mini Toolbar visibility
            if (DOM.btnMiniFill) DOM.btnMiniFill.style.display = (primary.type === 'text' || primary.type === 'path') ? 'none' : '';
            if (DOM.btnMiniStroke) DOM.btnMiniStroke.style.display = '';

            const alignSelectors = ['#align-left', '#align-center', '#align-right', '#align-top', '#align-middle', '#align-bottom'];
            alignSelectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.disabled = AppState.selection.length === 0; // enable for 1 or more to align to canvas
            });
            
            // Update Inspector
            if (DOM.inspX && document.activeElement !== DOM.inspX) DOM.inspX.value = Math.round(primary.x);
            if (DOM.inspY && document.activeElement !== DOM.inspY) DOM.inspY.value = Math.round(primary.y);
            if (DOM.inspW && document.activeElement !== DOM.inspW) DOM.inspW.value = Math.round(primary.w);
            if (DOM.inspH && document.activeElement !== DOM.inspH) DOM.inspH.value = Math.round(primary.h);
            if (DOM.inspRot && document.activeElement !== DOM.inspRot) DOM.inspRot.value = primary.rot;
            if (DOM.inspRad && document.activeElement !== DOM.inspRad) DOM.inspRad.value = primary.radius != null ? primary.radius : 0;
            if (DOM.inspFill && document.activeElement !== DOM.inspFill) {
                DOM.inspFill.value = primary.fill !== 'transparent' ? primary.fill : '#ffffff';
                DOM.inspFill.style.backgroundColor = primary.fill;
            }
            if (DOM.inspStroke && document.activeElement !== DOM.inspStroke) {
                DOM.inspStroke.value = primary.stroke !== 'transparent' ? primary.stroke : '#ffffff';
                DOM.inspStroke.style.backgroundColor = primary.stroke;
            }
            if (DOM.inspOpacity) {
                if (document.activeElement !== DOM.inspOpacity) {
                    DOM.inspOpacity.value = primary.opacity;
                }
                if (DOM.inspOpacityVal) {
                    DOM.inspOpacityVal.innerText = primary.opacity + '%';
                }
            }
            if (DOM.inspLockAspect && document.activeElement !== DOM.inspLockAspect) DOM.inspLockAspect.checked = !!primary.lockAspect;
            if (DOM.inspLockPosition && document.activeElement !== DOM.inspLockPosition) DOM.inspLockPosition.checked = !!primary.lockPosition;
            if (DOM.inspLabel && document.activeElement !== DOM.inspLabel) DOM.inspLabel.value = primary.label || '';
            if (DOM.inspDesc && document.activeElement !== DOM.inspDesc) DOM.inspDesc.value = primary.description || '';
            
            // Text sync
            if (primary.type === 'text') {
                if (document.getElementById('text-font-family')) document.getElementById('text-font-family').value = primary.fontFamily || 'sans-serif';
                if (document.getElementById('text-font-size')) document.getElementById('text-font-size').value = primary.fontSize || 24;
                if (document.getElementById('text-color')) {
                    const tColor = primary.stroke === 'transparent' ? '#000000' : primary.stroke;
                    document.getElementById('text-color').value = tColor;
                    document.getElementById('text-color').style.backgroundColor = tColor;
                }
                if (document.getElementById('text-bold')) document.getElementById('text-bold').classList.toggle('active', primary.fontWeight === 'bold');
                if (document.getElementById('text-italic')) document.getElementById('text-italic').classList.toggle('active', primary.fontStyle === 'italic');
                
                ['left', 'center', 'right'].forEach(a => {
                    const b = document.getElementById(`text-align-${a}`);
                    if (b) b.classList.toggle('active', (primary.textAlign || 'center') === a);
                });
            }
        } else {
            DOM.toolbar.classList.add('hidden');
            if (DOM.inspX) DOM.inspX.value = '';
            if (DOM.inspY) DOM.inspY.value = '';
            if (DOM.inspW) DOM.inspW.value = '';
            if (DOM.inspH) DOM.inspH.value = '';
            if (DOM.inspRot) DOM.inspRot.value = '';
            
            if (DOM.inspLockAspect) DOM.inspLockAspect.checked = false;
            if (DOM.inspLockPosition) DOM.inspLockPosition.checked = false;
            if (DOM.inspLabel) DOM.inspLabel.value = '';
            if (DOM.inspDesc) DOM.inspDesc.value = '';

            // Disable fill and stroke when nothing is selected
            [DOM.inspX, DOM.inspY, DOM.inspW, DOM.inspH, DOM.inspRot, DOM.inspRad, DOM.inspFill, DOM.inspStroke, DOM.inspOpacity, DOM.inspLockAspect, DOM.inspLockPosition, DOM.inspLabel, DOM.inspDesc].forEach(el => {
                if (el) el.disabled = true;
            });
            
            // Disable ribbon action buttons requiring selection
            const ribbonActionSelectors = ['#ribbon-copy', '#ribbon-duplicate', '#ribbon-delete', '#align-left', '#align-center', '#align-right', '#align-top', '#align-middle', '#align-bottom', '#bring-front', '#send-back'];
            ribbonActionSelectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.disabled = true;
            });
        }
    }

    let toastTimer = null;
    function showToast(msg, isError = false) {
        const toast = document.querySelector('.toast');
        if (!toast) return;
        toast.innerHTML = `${msg}`;
        
        if (isError) {
            toast.style.backgroundColor = '#ef4444';
            toast.style.color = '#ffffff';
            toast.style.fontWeight = 'bold';
            toast.style.transform = 'scale(1.1)';
        } else {
            toast.style.backgroundColor = '';
            toast.style.color = '';
            toast.style.fontWeight = '';
            toast.style.transform = '';
        }

        toast.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, isError ? 4000 : 3200);
    }

    //drag and drop from library

    let dragType = null;

    document.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.shape-item, [id^="quick-add-"]');
        if (item) {
            dragType = item.dataset.type;
            e.dataTransfer.setData('text/plain', dragType);
            DOM.ghost.classList.remove('hidden');
        }
    });

    DOM.canvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
        if (dragType) {
            const rect = DOM.canvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) / AppState.settings.zoom;
            let y = (e.clientY - rect.top) / AppState.settings.zoom;

            // Snap ghost to grid if enabled
            if (AppState.settings.snapToGrid) {
                x = Math.round(x / AppState.settings.gridSize) * AppState.settings.gridSize;
                y = Math.round(y / AppState.settings.gridSize) * AppState.settings.gridSize;
            }

            DOM.ghost.style.left = (x - 40) + 'px'; // approximate center of ghost
            DOM.ghost.style.top = (y - 30) + 'px';
        }
    });

    DOM.canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.ghost.classList.add('hidden');

        if (dragType) {
            const rect = DOM.canvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) / AppState.settings.zoom;
            let y = (e.clientY - rect.top) / AppState.settings.zoom;

            if (AppState.settings.snapToGrid) {
                x = Math.round(x / AppState.settings.gridSize) * AppState.settings.gridSize;
                y = Math.round(y / AppState.settings.gridSize) * AppState.settings.gridSize;
            }

            const newShape = createShapeData(dragType, x, y);
            addShape(newShape);
            dragType = null;
        }
    });

    document.addEventListener('dragend', () => {
        DOM.ghost.classList.add('hidden');
        dragType = null;
    });

    DOM.library.addEventListener('click', (e) => {
        const item = e.target.closest('.shape-item');
        if (item) {
            const type = item.dataset.type;
            const rect = DOM.canvas.getBoundingClientRect();
            // Center of visible canvas
            let x = (rect.width / 2) / AppState.settings.zoom;
            let y = (rect.height / 2) / AppState.settings.zoom;
            
            if (AppState.settings.snapToGrid) {
                x = Math.round(x / AppState.settings.gridSize) * AppState.settings.gridSize;
                y = Math.round(y / AppState.settings.gridSize) * AppState.settings.gridSize;
            }

            const newShape = createShapeData(type, x, y);
            addShape(newShape);
        }
    });

    //canvas interactions
    let isDragging = false;
    let isResizing = false;
    let isRotating = false;

    let actionStartX, actionStartY;
    let initialShapesState = []; // snapshot of shapes being manipulated
    let resizeHandle = null;
    let lastClickTime = 0;
    let lastClickId = null;

    function handleShapeMousedown(e, id, isMulti) {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) return;

        const el = document.getElementById(id);
        const textInner = el ? el.querySelector('.text-inner') : null;
        if (el && (el.contentEditable === 'true' || (textInner && textInner.contentEditable === 'true'))) {
            e.stopPropagation(); // prevent background canvas from deselecting
            return; // let native text selection handle it
        }

        const now = Date.now();
        if (now - lastClickTime < 300 && lastClickId === id) {
            const shape = AppState.shapes.find(s => s.id === id);
            if (shape && shape.type === 'text') {
                e.preventDefault();
                e.stopPropagation();
                if (textInner) {
                    textInner.contentEditable = 'true';
                    textInner.focus();
                    textInner.style.cursor = 'text';
                    el.style.outline = '2px dashed #007bff';
                    
                    // Select text and put cursor at end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(textInner);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                return;
            }
        }
        lastClickTime = now;
        lastClickId = id;

        if (AppState.activeTool === 'eraser') {
            isErasing = true;
            if (AppState.eraserConfig.mode === 'object') {
                AppState.shapes = AppState.shapes.filter(s => s.id !== id);
                renderAll();
                showToast('Deleted shape');
            } else {
                performErase(e);
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (AppState.activeTool !== 'select') {
        e.preventDefault();
        return;
    }

        if (!AppState.selection.includes(id)) {
            selectShape(id, isMulti);
        } else if (isMulti) {
            selectShape(id, true);
            // If they are deselecting, they shouldn't trigger a drag
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        isDragging = true;
        beginAction(e);
        e.preventDefault();
        e.stopPropagation();
    }

    function handleResizeMousedown(e) {
        isResizing = true;
        resizeHandle = e.target.dataset.pos;
        beginAction(e);
        e.preventDefault();
        e.stopPropagation();
    }

    function handleRotateMousedown(e) {
        isRotating = true;
        beginAction(e);
        e.preventDefault();
        e.stopPropagation();
    }

    function beginAction(e) {
        actionStartX = e.clientX;
        actionStartY = e.clientY;
        // Snapshot the selected shapes
        initialShapesState = AppState.selection.map(id => {
            return JSON.parse(JSON.stringify(AppState.shapes.find(s => s.id === id)));
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (!isDragging && !isResizing && !isRotating) return;

        const dx = (e.clientX - actionStartX) / AppState.settings.zoom;
        const dy = (e.clientY - actionStartY) / AppState.settings.zoom;

        AppState.selection.forEach(id => {
            const shape = AppState.shapes.find(s => s.id === id);
            const initial = initialShapesState.find(s => s.id === id);
            if (!shape || !initial) return;

            if (isDragging) {
                if (initial.lockPosition) return;
                let nx = initial.x + dx;
                let ny = initial.y + dy;

                if (AppState.settings.snapToGrid) {
                    nx = Math.round(nx / AppState.settings.gridSize) * AppState.settings.gridSize;
                    ny = Math.round(ny / AppState.settings.gridSize) * AppState.settings.gridSize;
                }

                nx = Math.max(0, Math.min(nx, AppState.settings.canvasW - shape.w));
                ny = Math.max(0, Math.min(ny, AppState.settings.canvasH - shape.h));

                shape.x = nx;
                shape.y = ny;
            }
            else if (isResizing) {
                if (initial.lockPosition) return;
                // simple resizing logic 
                let nx = initial.x, ny = initial.y, nw = initial.w, nh = initial.h;
                const aspect = nw / nh;

                if (resizeHandle.includes('e')) nw += dx;
                if (resizeHandle.includes('s')) nh += dy;
                if (resizeHandle.includes('w')) { nx += dx; nw -= dx; }
                if (resizeHandle.includes('n')) { ny += dy; nh -= dy; }

                // Shift to lock aspect ratio, or respect lockAspect flag
                if (e.shiftKey || initial.lockAspect) {
                    if (resizeHandle.includes('e') || resizeHandle.includes('w')) nh = nw / aspect;
                    else nw = nh * aspect;
                }

                // Snap resize
                if (AppState.settings.snapToGrid) {
                    nw = Math.round(nw / AppState.settings.gridSize) * AppState.settings.gridSize;
                    nh = Math.round(nh / AppState.settings.gridSize) * AppState.settings.gridSize;
                }

                shape.w = Math.max(10, nw);
                shape.h = Math.max(10, nh);

                // Tie the x/y coordinates cleanly to the anchored opposite edges to prevent shape from floating away when minimized
                if (resizeHandle.includes('w')) {
                    shape.x = initial.x + initial.w - shape.w;
                } else {
                    shape.x = nx;
                }

                if (resizeHandle.includes('n')) {
                    shape.y = initial.y + initial.h - shape.h;
                } else {
                    shape.y = ny;
                }

                if (shape.x < 0) { shape.w += shape.x; shape.x = 0; }
                if (shape.y < 0) { shape.h += shape.y; shape.y = 0; }
                if (shape.x + shape.w > AppState.settings.canvasW) { shape.w = AppState.settings.canvasW - shape.x; }
                if (shape.y + shape.h > AppState.settings.canvasH) { shape.h = AppState.settings.canvasH - shape.y; }
            }
            else if (isRotating) {
                // calculate angle from shape center
                const cx = initial.x + initial.w / 2;
                const cy = initial.y + initial.h / 2;
                // canvas rect offset
                const rect = DOM.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / AppState.settings.zoom;
                const mouseY = (e.clientY - rect.top) / AppState.settings.zoom;

                let angle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;

                if (e.shiftKey) {
                    angle = Math.round(angle / 15) * 15; // 15 deg snapping
                }
                shape.rot = parseInt(angle);
            }
        });

        // Render fast updates without rebuilding whole DOM (just update styles)
        AppState.selection.forEach(id => {
            const shape = AppState.shapes.find(s => s.id === id);
            const el = document.getElementById(id);
            if (el && shape) updateElementStyles(el, shape);
        });
        updateUI(); // updates inspector numbers live
    });

    document.addEventListener('mouseup', () => {
        if (isDragging || isResizing || isRotating) {
            commitHistory(); // save state on release
            renderAll(); // full re-render to ensure handles map correctly
        }
        isDragging = false;
        isResizing = false;
        isRotating = false;
        initialShapesState = [];
    });

    // Canvas specific tool actions
    let panStartX = 0, panStartY = 0, isPanning = false;
    let isDrawing = false, currentDrawShape = null, currentRawPoints = [];
    let isMeasuring = false, measureStartX = 0, measureStartY = 0, measureEl = null;
    let isMarquee = false, marqueeStartX = 0, marqueeStartY = 0, marqueeEl = null;
    let isErasing = false;

    DOM.canvas.addEventListener('mousedown', (e) => {
        // Ignore clicks on UI overlays to prevent tools from stealing focus and hiding them
        if (e.target.closest('.overlay-inset') || e.target.closest('.mini-toolbar')) {
            return;
        }

        const isCanvasClick = e.target === DOM.canvas || e.target.id === 'measure-overlay' || e.target.classList.contains('alignment-guide');
        const isToolOverride = AppState.activeTool !== 'select';

        if (isCanvasClick || isToolOverride) {
            DOM.palette.classList.add('hidden');
            DOM.confirmDialog.classList.add('hidden');

            if (AppState.activeTool === 'select') {
                if (isCanvasClick) {
                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) selectShape(null, false);
                    isMarquee = true;
                    const rect = DOM.canvas.getBoundingClientRect();
                    marqueeStartX = (e.clientX - rect.left) / AppState.settings.zoom;
                    marqueeStartY = (e.clientY - rect.top) / AppState.settings.zoom;
                    marqueeEl = document.createElement('div');
                    marqueeEl.className = 'marquee-selection';
                    marqueeEl.style.position = 'absolute';
                    marqueeEl.style.border = '1px dashed #007bff';
                    marqueeEl.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                    marqueeEl.style.zIndex = '9999';
                    marqueeEl.style.pointerEvents = 'none';
                    marqueeEl.style.left = marqueeStartX + 'px';
                    marqueeEl.style.top = marqueeStartY + 'px';
                    marqueeEl.style.width = '0px';
                    marqueeEl.style.height = '0px';
                    DOM.canvas.appendChild(marqueeEl);
                }
            } else if (AppState.activeTool === 'text') {
                const rect = DOM.canvas.getBoundingClientRect();
                const newShape = createShapeData('text', (e.clientX - rect.left) / AppState.settings.zoom, (e.clientY - rect.top) / AppState.settings.zoom);
                addShape(newShape);
                document.getElementById('tool-select').click();
            } else if (AppState.activeTool === 'shape') {
                const rect = DOM.canvas.getBoundingClientRect();
                const newShape = createShapeData('square', (e.clientX - rect.left) / AppState.settings.zoom, (e.clientY - rect.top) / AppState.settings.zoom);
                addShape(newShape);
                document.getElementById('tool-select').click();
            } else if (AppState.activeTool === 'pan') {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
            } else if (AppState.activeTool === 'measure') {
                isMeasuring = true;
                const rect = DOM.canvas.getBoundingClientRect();
                measureStartX = (e.clientX - rect.left) / AppState.settings.zoom;
                measureStartY = (e.clientY - rect.top) / AppState.settings.zoom;
                
                measureEl = document.createElement('div');
                measureEl.id = 'measure-overlay';
                measureEl.style.position = 'absolute';
                measureEl.style.top = '0';
                measureEl.style.left = '0';
                measureEl.style.width = '100%';
                measureEl.style.height = '100%';
                measureEl.style.pointerEvents = 'none';
                measureEl.style.zIndex = '9999';
                measureEl.innerHTML = `<svg width="100%" height="100%" style="overflow:visible; display:block;">
                    <line x1="${measureStartX}" y1="${measureStartY}" x2="${measureStartX}" y2="${measureStartY}" stroke="#007bff" stroke-width="2" stroke-dasharray="4,4" />
                    <rect x="0" y="0" width="0" height="0" fill="#222" rx="4" id="measure-bg" />
                    <text x="${measureStartX}" y="${measureStartY}" fill="#fff" font-family="sans-serif" font-size="12px" text-anchor="middle" alignment-baseline="middle" id="measure-text">0px</text>
                </svg>`;
                DOM.canvas.appendChild(measureEl);
            } else if (AppState.activeTool === 'pen') {
                // Start drawing path
                isDrawing = true;
                const rect = DOM.canvas.getBoundingClientRect();
                const ptX = (e.clientX - rect.left) / AppState.settings.zoom;
                const ptY = (e.clientY - rect.top) / AppState.settings.zoom;
                currentRawPoints = [{ x: ptX, y: ptY }];

                shapeCounter++;
                const isHighlight = AppState.drawConfig.mode === 'highlighter';
                currentDrawShape = {
                    id: 's_' + shapeCounter,
                    type: 'path',
                    x: ptX, y: ptY, w: 1, h: 1, rot: 0,
                    origW: 1, origH: 1,
                    fill: 'transparent',
                    stroke: AppState.drawConfig.color,
                    strokeWidth: AppState.drawConfig.thickness,
                    opacity: isHighlight ? 40 : 100, 
                    points: "0,0"
                };
                AppState.shapes.push(currentDrawShape);
                renderAll();
            } else if (AppState.activeTool === 'eraser') {
                isErasing = true;
                performErase(e);
            }
        }
    });

    // Panning/Drawing logic on mouse move
    const eraserCursor = document.getElementById('eraser-cursor');
    function updateEraserCursor() {
        if (!eraserCursor) return;
        if (AppState.activeTool === 'eraser') {
            eraserCursor.style.display = 'block';
            eraserCursor.style.width = AppState.eraserConfig.size + 'px';
            eraserCursor.style.height = AppState.eraserConfig.size + 'px';
        } else {
            eraserCursor.style.display = 'none';
        }
    }

    // Add function to do partial erasing
    function performErase(e) {
        if (!isErasing) return;
        const rect = DOM.canvas.getBoundingClientRect();
        const ptX = (e.clientX - rect.left) / AppState.settings.zoom;
        const ptY = (e.clientY - rect.top) / AppState.settings.zoom;
        const eraseRadius = AppState.eraserConfig.size / 2;

        let changed = false;
        if (AppState.eraserConfig.mode === 'object') {
            const initialCount = AppState.shapes.length;
            AppState.shapes = AppState.shapes.filter(s => {
                // Check simple bounding box intersection with cursor center
                const inBox = ptX >= s.x && ptX <= s.x + s.w && ptY >= s.y && ptY <= s.y + s.h;
                return !inBox;
            });
            if (AppState.shapes.length < initialCount) changed = true;
        } else if (AppState.eraserConfig.mode === 'partial') {
            AppState.shapes.forEach(s => {
                if (s.type === 'path' && s.points) {
                    const points = s.points.split(' ').map(p => {
                        const [px, py] = p.split(',').map(Number);
                        return { x: px + s.x, y: py + s.y }; 
                    });
                    
                    const filtered = points.filter(p => {
                        const dist = Math.sqrt((p.x - ptX)**2 + (p.y - ptY)**2);
                        return dist > eraseRadius;
                    });
                    
                    if (filtered.length < points.length) {
                        changed = true;
                        if (filtered.length === 0) {
                            s._markedForDelete = true;
                        } else {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            filtered.forEach(p => {
                                if (p.x < minX) minX = p.x;
                                if (p.x > maxX) maxX = p.x;
                                if (p.y < minY) minY = p.y;
                                if (p.y > maxY) maxY = p.y;
                            });
                            s.x = minX;
                            s.y = minY;
                            s.w = Math.max(1, maxX - minX);
                            s.h = Math.max(1, maxY - minY);
                            s.origW = s.w;
                            s.origH = s.h;
                            s.points = filtered.map(p => `${p.x - minX},${p.y - minY}`).join(' ');
                        }
                    }
                } else {
                    // Normal shapes are immune to the partial path eraser, wait for whole object eraser
                }
            });
            
            if (changed) {
                AppState.shapes = AppState.shapes.filter(s => !s._markedForDelete);
            }
        }
        
        if (changed) {
            renderAll();
        }
    }

    document.addEventListener('mousemove', (e) => {
        if (eraserCursor && AppState.activeTool === 'eraser') {
            const rect = document.querySelector('.canvas-area').getBoundingClientRect();
            eraserCursor.style.left = (e.clientX - rect.left) + 'px';
            eraserCursor.style.top = (e.clientY - rect.top) + 'px';
        }
        if (isErasing) {
            performErase(e);
        }

        if (isPanning) {
            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            AppState.settings.panX += dx;
            AppState.settings.panY += dy;
            applyCanvasTransform();
            panStartX = e.clientX;
            panStartY = e.clientY;
        } else if (isMarquee && marqueeEl) {
            const rect = DOM.canvas.getBoundingClientRect();
            const ptX = (e.clientX - rect.left) / AppState.settings.zoom;
            const ptY = (e.clientY - rect.top) / AppState.settings.zoom;
            
            const x = Math.min(marqueeStartX, ptX);
            const y = Math.min(marqueeStartY, ptY);
            const w = Math.abs(ptX - marqueeStartX);
            const h = Math.abs(ptY - marqueeStartY);
            
            marqueeEl.style.left = x + 'px';
            marqueeEl.style.top = y + 'px';
            marqueeEl.style.width = w + 'px';
            marqueeEl.style.height = h + 'px';
        } else if (isMeasuring && measureEl) {
            const rect = DOM.canvas.getBoundingClientRect();
            const ptX = (e.clientX - rect.left) / AppState.settings.zoom;
            const ptY = (e.clientY - rect.top) / AppState.settings.zoom;
            
            const dx = ptX - measureStartX;
            const dy = ptY - measureStartY;
            const dist = Math.round(Math.sqrt(dx*dx + dy*dy));
            
            const line = measureEl.querySelector('line');
            if(line) {
                line.setAttribute('x2', ptX);
                line.setAttribute('y2', ptY);
            }
            
            const text = measureEl.querySelector('#measure-text');
            const bg = measureEl.querySelector('#measure-bg');
            const midX = measureStartX + dx/2;
            const midY = measureStartY + dy/2;
            
            if(text && bg) {
                text.setAttribute('x', midX);
                text.setAttribute('y', midY);
                text.textContent = `${dist}px`;
                
                const bbox = text.getBBox();
                if (bbox.width > 0) {
                    bg.setAttribute('x', bbox.x - 4);
                    bg.setAttribute('y', bbox.y - 2);
                    bg.setAttribute('width', bbox.width + 8);
                    bg.setAttribute('height', bbox.height + 4);
                }
            }
        } else if (isDrawing && currentDrawShape) {
            const rect = DOM.canvas.getBoundingClientRect();
            const ptX = (e.clientX - rect.left) / AppState.settings.zoom;
            const ptY = (e.clientY - rect.top) / AppState.settings.zoom;
            currentRawPoints.push({ x: ptX, y: ptY });

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < currentRawPoints.length; i++) {
                const p = currentRawPoints[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }

            currentDrawShape.x = minX;
            currentDrawShape.y = minY;
            currentDrawShape.w = Math.max(1, maxX - minX);
            currentDrawShape.h = Math.max(1, maxY - minY);
            currentDrawShape.origW = currentDrawShape.w;
            currentDrawShape.origH = currentDrawShape.h;

            const polyPoints = currentRawPoints.map(p => `${p.x - minX},${p.y - minY}`).join(' ');
            currentDrawShape.points = polyPoints;

            const el = document.getElementById(currentDrawShape.id);
            if (el) updateElementStyles(el, currentDrawShape);
        }
    });

    document.addEventListener('mouseup', (e) => {
        isPanning = false;
        if (isMarquee) {
            isMarquee = false;
            if (marqueeEl) {
                const mx = parseFloat(marqueeEl.style.left);
                const my = parseFloat(marqueeEl.style.top);
                const mw = parseFloat(marqueeEl.style.width);
                const mh = parseFloat(marqueeEl.style.height);

                if (mw > 0 && mh > 0) {
                    const selected = e.shiftKey ? [...AppState.selection] : [];
                    AppState.shapes.forEach(shape => {
                        if (shape.x < mx + mw && shape.x + shape.w > mx &&
                            shape.y < my + mh && shape.y + shape.h > my) {
                            if (!selected.includes(shape.id)) selected.push(shape.id);
                        }
                    });
                    if (selected.length > 0) {
                        AppState.selection = selected;
                        renderAll();
                    }
                }
                marqueeEl.remove();
                marqueeEl = null;
            }
        }
        if (isMeasuring) {
            isMeasuring = false;
            if (measureEl) {
                measureEl.remove();
                measureEl = null;
            }
        }
        if (isDrawing) {
            isDrawing = false;
            currentDrawShape = null;
            currentRawPoints = [];
            commitHistory();
        }
        if (isErasing) {
            isErasing = false;
            commitHistory();
        }
    });

    //Inspector bindings
    function bindInput(input, prop, isString = false) {
        if (!input) return;

        const eventType = (input.type === 'range' || input.type === 'color' || input.type === 'number') ? 'input' : 'change';

        input.addEventListener(eventType, (e) => {
            let val = e.target.value;
            if (!isString) {
                val = parseInt(val);
                if (isNaN(val)) return;
            }

            if (input.classList.contains('color-box')) {
                input.style.backgroundColor = val; // dynamically change visual background
            }

            let showBoundsError = false;
            let changed = false;
            
            AppState.selection.forEach(id => {
                const shape = AppState.shapes.find(s => s.id === id);
                if (shape) {
                    let finalVal = val;
                    if (prop === 'x') {
                        if (finalVal < 0 || finalVal + shape.w > AppState.settings.canvasW) { 
                            showBoundsError = true; 
                            finalVal = Math.max(0, Math.min(finalVal, AppState.settings.canvasW - shape.w)); 
                        }
                    } else if (prop === 'y') {
                        if (finalVal < 0 || finalVal + shape.h > AppState.settings.canvasH) { 
                            showBoundsError = true; 
                            finalVal = Math.max(0, Math.min(finalVal, AppState.settings.canvasH - shape.h)); 
                        }
                    } else if (prop === 'w') {
                        if (shape.x + finalVal > AppState.settings.canvasW) { 
                            showBoundsError = true; 
                            finalVal = AppState.settings.canvasW - shape.x; 
                        }
                        finalVal = Math.max(10, finalVal);
                    } else if (prop === 'h') {
                        if (shape.y + finalVal > AppState.settings.canvasH) { 
                            showBoundsError = true; 
                            finalVal = AppState.settings.canvasH - shape.y; 
                        }
                        finalVal = Math.max(10, finalVal);
                    }
                    
                    shape[prop] = finalVal;
                    if (prop === 'x' || prop === 'y' || prop === 'w' || prop === 'h') {
                        if (document.activeElement === input) {
                            input.value = finalVal;
                        }
                    }
                    
                    changed = true;
                }
            });

            if (showBoundsError) {
                showToast('🚨 OUT OF BOUNDS: Value exceeds canvas size!', true);
            }

            if (changed) {
                
                if (eventType === 'change') commitHistory();
                renderAll();
            }
        });

        if (eventType === 'input') {
            input.addEventListener('change', commitHistory);
        }
    }

    function bindCheckbox(input, prop) {
        if (!input) return;
        input.addEventListener('change', (e) => {
            const checked = e.target.checked;
            AppState.selection.forEach(id => {
                const shape = AppState.shapes.find(s => s.id === id);
                if (shape) shape[prop] = checked;
            });
            commitHistory();
            renderAll();
        });
    }

    bindInput(DOM.inspX, 'x');
    bindInput(DOM.inspY, 'y');
    bindInput(DOM.inspW, 'w');
    bindInput(DOM.inspH, 'h');
    bindInput(DOM.inspRot, 'rot');
    bindInput(DOM.inspRad, 'radius');
    bindInput(DOM.inspFill, 'fill', true);
    bindInput(DOM.inspStroke, 'stroke', true);
    bindInput(DOM.inspOpacity, 'opacity');
    bindCheckbox(DOM.inspLockAspect, 'lockAspect');
    bindCheckbox(DOM.inspLockPosition, 'lockPosition');
    bindInput(DOM.inspLabel, 'label', true);
    bindInput(DOM.inspDesc, 'description', true);

    // Canvas settings binding
    function clampShapesToCanvas() {
        let changed = false;
        AppState.shapes.forEach(shape => {
            if (shape.x + shape.w > AppState.settings.canvasW) { shape.x = Math.max(0, AppState.settings.canvasW - shape.w); changed = true; }
            if (shape.x < 0) { shape.w += shape.x; shape.x = 0; changed = true; }
            if (shape.w > AppState.settings.canvasW) { shape.w = AppState.settings.canvasW; changed = true; }
            
            if (shape.y + shape.h > AppState.settings.canvasH) { shape.y = Math.max(0, AppState.settings.canvasH - shape.h); changed = true; }
            if (shape.y < 0) { shape.h += shape.y; shape.y = 0; changed = true; }
            if (shape.h > AppState.settings.canvasH) { shape.h = AppState.settings.canvasH; changed = true; }
        });
        if (changed) renderAll();
    }

    if (DOM.canvasW) {
        DOM.canvasW.addEventListener('change', (e) => {
            const w = Math.max(100, parseInt(e.target.value) || 900);
            AppState.settings.canvasW = w;
            DOM.canvas.style.width = `${w}px`;
            e.target.value = w;
            clampShapesToCanvas();
            commitHistory();
        });
    }
    if (DOM.canvasH) {
        DOM.canvasH.addEventListener('change', (e) => {
            const h = Math.max(100, parseInt(e.target.value) || 600);
            AppState.settings.canvasH = h;
            DOM.canvas.style.height = `${h}px`;
            e.target.value = h;
            clampShapesToCanvas();
            commitHistory();
        });
    }
    if (DOM.snapGrid) {
        DOM.snapGrid.addEventListener('change', (e) => {
            const snap = Math.max(1, parseInt(e.target.value) || 20);
            AppState.settings.gridSize = snap;
            e.target.value = snap;
            // Update canvas background pattern
            DOM.canvas.style.backgroundSize = `${snap}px ${snap}px`;
            commitHistory();
        });
    }

    //Hotkeys and global actions

    document.addEventListener('keydown', (e) => {
        // Custom hotkeys (Cmd/Ctrl)
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.contentEditable !== 'true') {
                removeSelectedShapes();
            }
        }
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
            if (e.key === 'a') { 
                e.preventDefault(); 
                AppState.selection = AppState.shapes.map(s => s.id);
                renderAll();
                showToast('Selected All');
            }
            if (e.key === 'k') {
                e.preventDefault();
                DOM.palette.classList.toggle('hidden');
                if (!DOM.palette.classList.contains('hidden')) {
                    const input = DOM.palette.querySelector('input');
                    if (input) input.focus();
                }
            }
            if (e.key === 'd') {
                e.preventDefault();
                duplicateSelected();
            }
            if (e.key === 'c') {
                if (AppState.selection.length > 0) {
                    e.preventDefault();
                    const ribbonCopy = document.getElementById('ribbon-copy');
                    if (ribbonCopy) ribbonCopy.click();
                }
            }
            if (e.key === 'v') {
                e.preventDefault();
                const ribbonPaste = document.getElementById('ribbon-paste');
                // Allow shortcut paste if we have clipboard data
                if (ribbonPaste && !ribbonPaste.disabled) ribbonPaste.click();
            }
        }
    });

    // Buttons
    if (DOM.btnUndo) DOM.btnUndo.addEventListener('click', undo);
    if (DOM.btnRedo) DOM.btnRedo.addEventListener('click', redo);
    if (DOM.btnDelete) DOM.btnDelete.addEventListener('click', removeSelectedShapes);
    if (DOM.btnDuplicate) DOM.btnDuplicate.addEventListener('click', duplicateSelected);
    if (DOM.btnSave) DOM.btnSave.addEventListener('click', () => {
        const data = JSON.stringify({ shapes: AppState.shapes, settings: AppState.settings, fileName: AppState.fileName }, null, 2);
        const slug = sanitizeFileName(AppState.fileName || 'untitled');
        downloadJSON(`${slug}.json`, data);
        showToast(`Saved ${AppState.fileName} — downloads drawing file`);
    });

    if (DOM.btnImport && DOM.inputImport) {
        DOM.btnImport.addEventListener('click', () => {
            showToast('Import JSON: choose a drawing file to load.');
            DOM.inputImport.click();
        });

        DOM.inputImport.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data.shapes && Array.isArray(data.shapes)) {
                        AppState.shapes = data.shapes;
                        AppState.selection = data.selection || [];
                        if (data.settings) {
                            AppState.settings = Object.assign(AppState.settings, data.settings);
                            applyCanvasSettingsToDOM();
                        }
                        if (data.fileName) {
                            AppState.fileName = data.fileName;
                            if (DOM.fileName) DOM.fileName.textContent = `${AppState.fileName} ▾`;
                        }
                        commitHistory();
                        applyCanvasTransform();
                        renderAll();
                        showToast('Imported drawing');
                    } else {
                        showToast('Invalid file format');
                    }
                } catch (err) {
                    showToast('Failed to import');
                }
            };
            reader.readAsText(file);
            // reset input so same file can be re-imported
            DOM.inputImport.value = '';
        });
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
        AppState.settings.zoom = Math.min(3, AppState.settings.zoom + 0.1);
        applyCanvasTransform();
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
        AppState.settings.zoom = Math.max(0.2, AppState.settings.zoom - 0.1);
        applyCanvasTransform();
    });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => {
        AppState.settings.zoom = 1;
        AppState.settings.panX = 0;
        AppState.settings.panY = 0;
        applyCanvasTransform();
    });

    // Zoom via Scroll Wheel
    const canvasArea = DOM.canvas.closest('.canvas-area') || DOM.canvas.parentElement;
    if (canvasArea) {
        canvasArea.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey || !e.shiftKey) { // Adjust zoom on ctrl+scroll or standard scroll if desired
                e.preventDefault();
                const zoomSpeed = 0.05;
                const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
                const newZoom = Math.max(0.2, Math.min(3, AppState.settings.zoom + delta));
                
                AppState.settings.zoom = newZoom;
                applyCanvasTransform();
            }
        }, { passive: false });
    }

    // Mini toolbar specific actions
    if (DOM.btnMiniFill) DOM.btnMiniFill.addEventListener('click', () => { if (DOM.inspFill) DOM.inspFill.click(); });
    if (DOM.btnMiniStroke) DOM.btnMiniStroke.addEventListener('click', () => { if (DOM.inspStroke) DOM.inspStroke.click(); });
    if (DOM.btnAlign) {
        DOM.btnAlign.addEventListener('click', () => {
            if (AppState.selection.length === 0) return;
            if (AppState.selection.length === 1) {
                // center to canvas
                const s = AppState.shapes.find(x => x.id === AppState.selection[0]);
                if (s) {
                    s.x = (DOM.canvas.clientWidth / 2) - (s.w / 2);
                    s.y = (DOM.canvas.clientHeight / 2) - (s.h / 2);
                }
            } else {
                // align left to the first selected object
                const first = AppState.shapes.find(x => x.id === AppState.selection[0]);
                if (!first) return;
                AppState.selection.forEach(id => {
                    const s = AppState.shapes.find(x => x.id === id);
                    if (s && s.id !== first.id) {
                        s.x = first.x;
                    }
                });
            }
            commitHistory();
            renderAll();
            showToast('Aligned Selection — Undo (Cmd+Z)');
        });
    }

    // Ribbon Arrange Actions
    const alignActions = {
        'align-left': (s, first) => s.x = first.x,
        'align-center': (s, first) => s.x = first.x + (first.w / 2) - (s.w / 2),
        'align-right': (s, first) => s.x = first.x + first.w - s.w,
        'align-top': (s, first) => s.y = first.y,
        'align-middle': (s, first) => s.y = first.y + (first.h / 2) - (s.h / 2),
        'align-bottom': (s, first) => s.y = first.y + first.h - s.h
    };

    Object.keys(alignActions).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (AppState.selection.length === 0) return;
                
                if (AppState.selection.length === 1) {
                    // Align to canvas when single item selected
                    const s = AppState.shapes.find(x => x.id === AppState.selection[0]);
                    if (s) {
                        const canvasRef = { x: 0, y: 0, w: AppState.settings.canvasW, h: AppState.settings.canvasH };
                        alignActions[id](s, canvasRef);
                    }
                } else {
                    // Align relative to group bounding box
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    
                    const selectedShapes = AppState.shapes.filter(s => AppState.selection.includes(s.id));
                    selectedShapes.forEach(s => {
                        if (s.x < minX) minX = s.x;
                        if (s.y < minY) minY = s.y;
                        if (s.x + s.w > maxX) maxX = s.x + s.w;
                        if (s.y + s.h > maxY) maxY = s.y + s.h;
                    });
                    
                    const groupRef = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
                    
                    selectedShapes.forEach(s => {
                        alignActions[id](s, groupRef);
                    });
                }
                
                commitHistory();
                renderAll();
                showToast(`Aligned — Undo (Cmd+Z)`);
            });
        }
    });

    const bringToFrontBtn = document.getElementById('bring-front');
    if (bringToFrontBtn) bringToFrontBtn.addEventListener('click', () => {
        if (AppState.selection.length === 0) return;
        const selectedShapes = AppState.shapes.filter(s => AppState.selection.includes(s.id));
        AppState.shapes = AppState.shapes.filter(s => !AppState.selection.includes(s.id)).concat(selectedShapes);
        commitHistory();
        renderAll();
        showToast('Brought to Front');
    });

    const sendToBackBtn = document.getElementById('send-back');
    if (sendToBackBtn) sendToBackBtn.addEventListener('click', () => {
        if (AppState.selection.length === 0) return;
        const selectedShapes = AppState.shapes.filter(s => AppState.selection.includes(s.id));
        AppState.shapes = selectedShapes.concat(AppState.shapes.filter(s => !AppState.selection.includes(s.id)));
        commitHistory();
        renderAll();
        showToast('Sent to Back');
    });

    // Clipboard State
    let clipboard = null;

    // Home Ribbon Actions
    const ribbonUndo = document.getElementById('ribbon-undo');
    const ribbonRedo = document.getElementById('ribbon-redo');
    const ribbonCopy = document.getElementById('ribbon-copy');
    const ribbonPaste = document.getElementById('ribbon-paste');
    const ribbonDuplicate2 = document.getElementById('ribbon-duplicate');
    const ribbonDelete = document.getElementById('ribbon-delete');

    if (ribbonUndo) ribbonUndo.addEventListener('click', undo);
    if (ribbonRedo) ribbonRedo.addEventListener('click', redo);
    
    if (ribbonCopy) ribbonCopy.addEventListener('click', () => {
        if (AppState.selection.length === 0) return;
        clipboard = AppState.shapes.filter(s => AppState.selection.includes(s.id)).map(s => JSON.parse(JSON.stringify(s)));
        if (ribbonPaste) ribbonPaste.disabled = false;
        showToast('Copied to clipboard');
    });
    
    if (ribbonPaste) ribbonPaste.addEventListener('click', () => {
        if (!clipboard || clipboard.length === 0) return;
        const newSelection = [];
        
        // Deep copy the clipboard array to prevent reference sharing between pastes
        const pasteData = JSON.parse(JSON.stringify(clipboard));
        
        pasteData.forEach(s => {
            // Update the original clipboard objects so the next paste is further offset
            const originalClipItem = clipboard.find(c => c.id === s.id);
            if (originalClipItem) {
                 originalClipItem.x += 20;
                 originalClipItem.y += 20;
            }

            s.x += 20;
            s.y += 20;
            shapeCounter++;
            s.id = 's_' + shapeCounter;
            AppState.shapes.push(s);
            newSelection.push(s.id);
        });
        commitHistory();
        AppState.selection = newSelection;
        renderAll();
        showToast('Pasted from clipboard');
    });
    
    if (ribbonDuplicate2) ribbonDuplicate2.addEventListener('click', duplicateSelected);
    if (ribbonDelete) ribbonDelete.addEventListener('click', removeSelectedShapes);

    // Quick Add Buttons
    const addQuickShape = (type) => {
        const centerX = (DOM.canvas.clientWidth / 2) / AppState.settings.zoom - AppState.settings.panX;
        const centerY = (DOM.canvas.clientHeight / 2) / AppState.settings.zoom - AppState.settings.panY;
        const newShape = createShapeData(type, centerX, centerY);
        addShape(newShape);
    };
    
    const addSquare = document.getElementById('quick-add-square');
    const addCircle = document.getElementById('quick-add-circle');
    const addTriangle = document.getElementById('quick-add-triangle');
    
    if (addSquare) addSquare.addEventListener('click', () => addQuickShape('square'));
    if (addCircle) addCircle.addEventListener('click', () => addQuickShape('circle'));
    if (addTriangle) addTriangle.addEventListener('click', () => addQuickShape('triangle'));

    // Ribbon Templates Actions
    const addTemplate = (shapes) => {
        const ids = [];
        shapes.forEach(tmpl => {
            const data = createShapeData(tmpl.type, tmpl.x + 100, tmpl.y + 100);
            Object.assign(data, tmpl);
            data.id = 's_' + (++shapeCounter); // Reassign unique id
            AppState.shapes.push(data);
            ids.push(data.id);
        });
        AppState.selection = ids;
        commitHistory();
        renderAll();
        showToast('Template added');
    };

    const tmplButton = document.getElementById('tmpl-button');
    if (tmplButton) tmplButton.addEventListener('click', () => {
        addTemplate([
            { type: 'square', w: 120, h: 40, fill: '#007bff', stroke: 'transparent', rot: 0, opacity: 100, x: 200, y: 200 },
            { type: 'text', w: 120, h: 40, text: 'Click Me', stroke: '#ffffff', fill: 'transparent', rot: 0, opacity: 100, x: 200, y: 200 }
        ]);
    });

    const tmplCard = document.getElementById('tmpl-card');
    if (tmplCard) tmplCard.addEventListener('click', () => {
        addTemplate([
            { type: 'square', w: 200, h: 250, fill: '#eaeaea', stroke: '#444444', rot: 0, opacity: 100, x: 200, y: 200 },
            { type: 'circle', w: 60, h: 60, fill: '#cccccc', stroke: 'transparent', rot: 0, opacity: 100, x: 270, y: 220 },
            { type: 'text', w: 160, h: 30, text: 'Card Title', stroke: '#000000', fill: 'transparent', rot: 0, opacity: 100, x: 220, y: 300 }
        ]);
    });

    const tmplModal = document.getElementById('tmpl-modal');
    if (tmplModal) tmplModal.addEventListener('click', () => {
        addTemplate([
            { type: 'square', w: 400, h: 300, fill: '#ffffff', stroke: '#000000', rot: 0, opacity: 100, x: 200, y: 200 },
            { type: 'text', w: 360, h: 40, text: 'Confirm Action', stroke: '#000000', fill: 'transparent', rot: 0, opacity: 100, x: 220, y: 220 },
            { type: 'square', w: 100, h: 36, fill: '#007bff', stroke: 'transparent', rot: 0, opacity: 100, x: 480, y: 440 },
            { type: 'text', w: 100, h: 36, text: 'OK', stroke: '#ffffff', fill: 'transparent', rot: 0, opacity: 100, x: 480, y: 440 }
        ]);
    });

    // Clear Canvas Dialog
    if (DOM.btnClearCanvas) {
        DOM.btnClearCanvas.addEventListener('click', () => {
            openClearConfirm();
            showToast('Clear Canvas: confirm to remove everything.');
        });
    }

    if (DOM.fileName) {
        const commitName = () => {
            const trimmed = (DOM.fileName.value || '').trim();
            if (!trimmed) return;
            AppState.fileName = trimmed;
            DOM.fileName.value = AppState.fileName;
            showToast(`Renamed to "${AppState.fileName}"`);
        };
        DOM.fileName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitName();
                DOM.fileName.blur();
            }
        });
        DOM.fileName.addEventListener('blur', commitName);
        DOM.fileName.addEventListener('focus', () => {
            DOM.fileName.select();
        });
    }

    if (DOM.btnCancelClear) {
        DOM.btnCancelClear.addEventListener('click', () => {
            DOM.confirmDialog.classList.add('hidden');
        });
    }

    if (DOM.btnConfirmClear) {
        DOM.btnConfirmClear.addEventListener('click', () => {
            clearCanvas();
            DOM.confirmDialog.classList.add('hidden');
        });
    }

    // Modes
    function updateModeUI() {
        const isAdv = AppState.mode === 'advanced';
        
        // Toggle active states on buttons
        DOM.modeBeginner.classList.toggle('active', !isAdv);
        DOM.modeAdvanced.classList.toggle('active', isAdv);

        // Hide/show advanced elements (Progressive Disclosure)
        const advElements = document.querySelectorAll('.adv-only');
        advElements.forEach(el => {
            el.style.display = isAdv ? '' : 'none';
        });

        // Hide/show right sidebar completely to distinguish modes
        const rightSidebar = document.querySelector('.right-sidebar');
        if (rightSidebar) {
            rightSidebar.style.display = isAdv ? 'flex' : 'none';
        }
        
        // Show/hide specific advanced ribbon tabs
        const advTabs = ['tab-arrange', 'tab-templates'];
        const ribbonTabs = document.querySelectorAll('.ribbon .tab');
        ribbonTabs.forEach(t => {
            if (advTabs.includes(t.dataset.target)) {
                t.style.display = isAdv ? '' : 'none';
            }
        });

        // If a hidden tab is currently active, switch back to Home
        const activeTab = document.querySelector('.ribbon .tab.active');
        if (!isAdv && activeTab && advTabs.includes(activeTab.dataset.target)) {
            const homeTab = document.querySelector('.ribbon .tab[data-target="tab-home"]');
            if (homeTab) homeTab.click();
        }
        
        showToast(isAdv ? 'Advanced Mode: Full workspaces & tooling enabled.' : 'Beginner Mode: UI simplified.');
    }

    if (DOM.modeBeginner && DOM.modeAdvanced) {
        DOM.modeBeginner.addEventListener('click', () => {
            if (AppState.mode === 'beginner') return;
            AppState.mode = 'beginner';
            updateModeUI();
        });

        DOM.modeAdvanced.addEventListener('click', () => {
            if (AppState.mode === 'advanced') return;
            AppState.mode = 'advanced';
            updateModeUI();
        });
        
        // Initialize UI based on starting mode
        updateModeUI();
    }

    // Ribbon Tab Switching
    const ribbonTabs = document.querySelectorAll('.ribbon .tab');
    const ribbonContents = document.querySelectorAll('.ribbon-content');
    
    ribbonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active styling
            ribbonTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            const targetId = tab.dataset.target;
            ribbonContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });

    // Tool Selection
    if (DOM.toolButtons) {
        DOM.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.activeTool = btn.dataset.tool;

                if (AppState.activeTool !== 'select') {
                    selectShape(null, false); // clear selection
                }

                // If Pen tool is chosen, open the Draw tab automatically
                if (AppState.activeTool === 'pen') {
                    const drawTab = document.querySelector('.ribbon .tab[data-target="tab-draw"]');
                    if (drawTab) drawTab.click();
                } else if (AppState.activeTool === 'text') {
                    const textTab = document.querySelector('.ribbon .tab[data-target="tab-text"]');
                    if (textTab) textTab.click();
                } else if (AppState.activeTool === 'eraser') {
                    const eraserTab = document.querySelector('.ribbon .tab[data-target="tab-eraser"]');
                    if (eraserTab) eraserTab.click();
                } else if (AppState.activeTool === 'shape') {
                    const shapesTab = document.querySelector('.ribbon .tab[data-target="tab-shapes"]');
                    if (shapesTab) shapesTab.click();
                }

                if (typeof updateEraserCursor === 'function') {
                    updateEraserCursor();
                }
            });
        });
    }

    // Drawing Settings (Ribbon)
    const drawModePen = document.getElementById('draw-mode-pen');
    const drawModeHighlighter = document.getElementById('draw-mode-highlighter');
    const drawColorInput = document.getElementById('draw-color');
    const drawColorPresets = document.querySelectorAll('.draw-color-preset');
    const drawThicknessInput = document.getElementById('draw-thickness');
    const drawThicknessVal = document.getElementById('draw-thickness-val');

    if (drawModePen && drawModeHighlighter) {
        drawModePen.addEventListener('click', () => {
            AppState.drawConfig.mode = 'pen';
            drawModePen.classList.add('active');
            drawModeHighlighter.classList.remove('active');
            
            // Set pen defaults
            if (drawThicknessInput.value > 10) {
                drawThicknessInput.value = 2;
                drawThicknessInput.dispatchEvent(new Event('input'));
            }
        });
        drawModeHighlighter.addEventListener('click', () => {
            AppState.drawConfig.mode = 'highlighter';
            drawModeHighlighter.classList.add('active');
            drawModePen.classList.remove('active');
            
            // Set highlighter defaults
            drawThicknessInput.value = 16;
            drawThicknessInput.dispatchEvent(new Event('input'));
            
            // Often yellow
            const yellow = '#ffea00';
            drawColorInput.value = yellow;
            drawColorInput.style.backgroundColor = yellow;
            AppState.drawConfig.color = yellow;
        });
    }

    if (drawColorInput) {
        drawColorInput.addEventListener('input', (e) => {
            AppState.drawConfig.color = e.target.value;
            drawColorInput.style.backgroundColor = e.target.value;
        });
        // Initial setup for draw-color background
        drawColorInput.style.backgroundColor = drawColorInput.value;
    }

    if (drawThicknessInput && drawThicknessVal) {
        drawThicknessInput.addEventListener('input', (e) => {
            AppState.drawConfig.thickness = parseInt(e.target.value);
            drawThicknessVal.textContent = AppState.drawConfig.thickness + 'px';
        });
    }

    drawColorPresets.forEach(btn => {
        btn.addEventListener('click', () => {
            const hex = btn.dataset.color;
            AppState.drawConfig.color = hex;
            if (drawColorInput) {
                drawColorInput.value = hex;
                drawColorInput.style.backgroundColor = hex;
            }
        });
    });

    const textFontFamily = document.getElementById('text-font-family');
    const textFontSize = document.getElementById('text-font-size');
    const textBold = document.getElementById('text-bold');
    const textItalic = document.getElementById('text-italic');
    const textAlignLeft = document.getElementById('text-align-left');
    const textAlignCenter = document.getElementById('text-align-center');
    const textAlignRight = document.getElementById('text-align-right');
    const textColor = document.getElementById('text-color');

    function updateTextProp(prop, value, configCallback) {
        if (configCallback) configCallback(value);
        let changed = false;
        AppState.selection.forEach(id => {
            const s = AppState.shapes.find(x => x.id === id);
            if (s && s.type === 'text') {
                s[prop] = value;
                changed = true;
            }
        });
        if (changed) {
            commitHistory();
            renderAll();
        }
    }

    if (textFontFamily) {
        textFontFamily.addEventListener('change', e => {
            updateTextProp('fontFamily', e.target.value, v => AppState.textConfig.fontFamily = v);
        });
    }

    if (textFontSize) {
        textFontSize.addEventListener('change', e => {
            updateTextProp('fontSize', parseInt(e.target.value) || 24, v => AppState.textConfig.fontSize = v);
        });
    }

    if (textColor) {
        textColor.addEventListener('input', e => {
            updateTextProp('stroke', e.target.value, v => AppState.textConfig.color = v);
        });
    }

    if (textBold) {
        textBold.addEventListener('click', () => {
            const newVal = !AppState.textConfig.bold;
            textBold.classList.toggle('active', newVal);
            updateTextProp('fontWeight', newVal ? 'bold' : 'normal', () => AppState.textConfig.bold = newVal);
        });
    }

    if (textItalic) {
        textItalic.addEventListener('click', () => {
            const newVal = !AppState.textConfig.italic;
            textItalic.classList.toggle('active', newVal);
            updateTextProp('fontStyle', newVal ? 'italic' : 'normal', () => AppState.textConfig.italic = newVal);
        });
    }

    const textApplies = { 'left': textAlignLeft, 'center': textAlignCenter, 'right': textAlignRight };
    Object.keys(textApplies).forEach(align => {
        const btn = textApplies[align];
        if (btn) {
            btn.addEventListener('click', () => {
                Object.values(textApplies).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateTextProp('textAlign', align, v => AppState.textConfig.textAlign = v);
            });
        }
    });

    // Eraser Settings
    const eraserModeObject = document.getElementById('eraser-mode-object');
    const eraserModePartial = document.getElementById('eraser-mode-partial');
    const eraserSizeInput = document.getElementById('eraser-size');
    const eraserSizeVal = document.getElementById('eraser-size-val');

    if (eraserModeObject && eraserModePartial) {
        eraserModeObject.addEventListener('click', () => {
            AppState.eraserConfig.mode = 'object';
            eraserModeObject.classList.add('active');
            eraserModePartial.classList.remove('active');
        });
        eraserModePartial.addEventListener('click', () => {
            AppState.eraserConfig.mode = 'partial';
            eraserModePartial.classList.add('active');
            eraserModeObject.classList.remove('active');
        });
    }

    if (eraserSizeInput && eraserSizeVal) {
        eraserSizeInput.addEventListener('input', (e) => {
            AppState.eraserConfig.size = parseInt(e.target.value);
            eraserSizeVal.textContent = AppState.eraserConfig.size + 'px';
            updateEraserCursor();
        });
    }

    // Shape Library Toggling
    const toggleLibraryBtn = document.getElementById('toggle-library-btn');
    const closeLibraryBtn = document.getElementById('close-library-btn');
    const libraryPanel = document.querySelector('.library-panel');
    const rightSidebar = document.querySelector('.right-sidebar');

    if (toggleLibraryBtn && libraryPanel && rightSidebar) {
        toggleLibraryBtn.addEventListener('click', () => {
            const isHidden = libraryPanel.style.display === 'none';
            if (isHidden) {
                if (AppState.mode === 'advanced') {
                    rightSidebar.style.display = 'flex';
                }
                libraryPanel.style.display = 'flex';
                showToast('Library opened — drag shapes onto canvas.');
            } else {
                libraryPanel.style.display = 'none';
                showToast('Library hidden — toggle to show again.');
            }
        });
    }
    
    if (closeLibraryBtn && libraryPanel && rightSidebar) {
        closeLibraryBtn.addEventListener('click', () => {
            libraryPanel.style.display = 'none';
        });
    }

    // Shape Library items and Search
    const libraryChips = document.querySelectorAll('.library-panel .chips .chip');
    const libraryGrid = document.getElementById('library-grid');
    const librarySearch = document.getElementById('library-search');

    const libraryItems = [
        // Basic
        { name: 'Square', type: 'square', category: 'basic', icon: '□' },
        { name: 'Rectangle', type: 'rounded-rect', category: 'basic', icon: '▭' },
        { name: 'Circle', type: 'circle', category: 'basic', icon: '○' },
        { name: 'Triangle', type: 'triangle', category: 'basic', icon: '△' },
        { name: 'Star', type: 'star', category: 'basic', icon: '☆' },
        { name: 'Pill', type: 'pill', category: 'basic', icon: '⬭' },

        // Polygons
        { name: 'Pentagon', type: 'pentagon', category: 'polygons', icon: '⬠' },
        { name: 'Hexagon', type: 'hexagon', category: 'polygons', icon: '⬡' },
        { name: 'Octagon', type: 'octagon', category: 'polygons', icon: '⎔' },
        { name: 'Diamond', type: 'diamond', category: 'polygons', icon: '◇' },
        { name: 'Parallelogram', type: 'parallelogram', category: 'polygons', icon: '▱' },
        { name: 'Trapezoid', type: 'trapezoid', category: 'polygons', icon: '⏢' },

        // Arrows
        { name: 'Right Arrow', type: 'right-arrow', category: 'arrows', icon: '⇨' },
        { name: 'Left Arrow', type: 'left-arrow', category: 'arrows', icon: '⇦' },
        { name: 'Up Arrow', type: 'up-arrow', category: 'arrows', icon: '⇧' },
        { name: 'Down Arrow', type: 'down-arrow', category: 'arrows', icon: '⇩' },
        { name: 'Chevron Right', type: 'chevron-right', category: 'arrows', icon: '⟩' },
        { name: 'Chevron Left', type: 'chevron-left', category: 'arrows', icon: '⟨' },
        { name: 'Chevron Up', type: 'chevron-up', category: 'arrows', icon: '⌃' },
        { name: 'Chevron Down', type: 'chevron-down', category: 'arrows', icon: '⌄' },
        { name: 'Double Arrow', type: 'double-arrow', category: 'arrows', icon: '↔' },

        // UI blocks
        { name: 'Button', type: 'ui-button', category: 'ui', icon: '⬚' },
        { name: 'Input Field', type: 'ui-input', category: 'ui', icon: '▤' },
        { name: 'Card', type: 'ui-card', category: 'ui', icon: '▥' },
        { name: 'Chip', type: 'ui-chip', category: 'ui', icon: '⬭' },

        // Misc decorative
        { name: 'Tag', type: 'tag', category: 'misc', icon: '⭓' },
        { name: 'Cross', type: 'cross', category: 'misc', icon: '✕' },
        { name: 'Plus', type: 'plus', category: 'misc', icon: '＋' }
    ];

    let activeCategory = 'basic';

    function renderLibrary(category = 'basic', query = '') {
        if (!libraryGrid) return;
        const q = query.trim().toLowerCase();
        const items = libraryItems.filter(item => {
            const matchCat = category === 'all' ? true : item.category === category;
            const matchQuery = q === '' || item.name.toLowerCase().includes(q);
            return matchCat && matchQuery;
        });
        libraryGrid.innerHTML = items.map(item => `
            <div class="shape-item" draggable="true" data-type="${item.type}">${item.icon} <span>${item.name}</span></div>
        `).join('');
    }

    libraryChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            libraryChips.forEach(c => c.classList.remove('active'));
            const clicked = e.target;
            clicked.classList.add('active');
            activeCategory = clicked.innerText.trim().toLowerCase();
            renderLibrary(activeCategory, librarySearch ? librarySearch.value : '');
        });
    });

    if (librarySearch) {
        librarySearch.addEventListener('input', () => {
            renderLibrary(activeCategory, librarySearch.value);
        });
    }

    // initial render
    renderLibrary(activeCategory, '');

    // Command search with suggestions
    const commands = [
        { id: 'undo', label: 'Undo', keywords: ['undo', 'cmd+z', 'ctrl+z'], hint: 'Ctrl/Cmd+Z', action: undo },
        { id: 'redo', label: 'Redo', keywords: ['redo', 'cmd+shift+z', 'ctrl+y'], hint: 'Ctrl/Cmd+Shift+Z', action: redo },
        { id: 'duplicate', label: 'Duplicate Selection', keywords: ['duplicate', 'copy', 'dup'], hint: 'Ctrl/Cmd+D', action: duplicateSelected },
        { id: 'multi-select', label: 'Toggle Multiple Shapes', keywords: ['select', 'multiple', 'multi-select', 'shift'], hint: 'Shift/Ctrl+Click', action: () => { showToast('Hold Shift or Ctrl and click shapes to multi-select.'); } },
        { id: 'select-all', label: 'Select All', keywords: ['select', 'all'], hint: 'Ctrl/Cmd+A', action: () => { AppState.selection = AppState.shapes.map(s => s.id); renderAll(); showToast('Selected All'); } },
        { id: 'delete', label: 'Delete Selection', keywords: ['delete', 'remove', 'del'], hint: 'Del/Backspace', action: removeSelectedShapes },
        { id: 'clear', label: 'Clear Canvas', keywords: ['clear', 'reset', 'wipe', 'trash'], hint: 'Opens confirmation', action: openClearConfirm },
        { id: 'save', label: 'Save (JSON)', keywords: ['save', 'download', 'json'], hint: 'Downloads shapes', action: () => { if (DOM.btnSave) DOM.btnSave.click(); } },
        { id: 'import', label: 'Import (JSON)', keywords: ['import', 'load', 'open'], hint: 'Load drawing file', action: () => { if (DOM.btnImport) DOM.btnImport.click(); } },
        { id: 'toggle-library', label: 'Toggle Library', keywords: ['library', 'toggle library', 'shapes'], hint: 'Show/hide sidebar', action: () => {
            if (!rightSidebar) return;
            const isHidden = rightSidebar.style.display === 'none';
            rightSidebar.style.display = isHidden ? 'flex' : 'none';
            if (isHidden && libraryPanel) libraryPanel.style.display = 'flex';
        } }
    ];

    function filterCommands(query) {
        let availableCommands = commands;
        if (AppState.mode === 'beginner') {
            availableCommands = availableCommands.filter(cmd => cmd.id !== 'toggle-library');
        }
        const q = query.trim().toLowerCase();
        if (!q) return availableCommands;
        return availableCommands.filter(cmd => cmd.keywords.some(k => k.includes(q)) || cmd.label.toLowerCase().includes(q));
    }

    function hideCommandSuggestions() {
        if (DOM.commandSuggestions) DOM.commandSuggestions.classList.add('hidden');
    }

    function renderCommandSuggestions(query = '') {
        if (!DOM.commandSuggestions) return;
        const list = filterCommands(query);
        if (list.length === 0) {
            DOM.commandSuggestions.innerHTML = '<div class="item"><span class="label">No commands</span></div>';
        } else {
            DOM.commandSuggestions.innerHTML = list.map(cmd => `
                <div class="item" data-id="${cmd.id}">
                    <span class="label">${cmd.label}</span>
                    <span class="hint">${cmd.hint || ''}</span>
                </div>
            `).join('');

            // Make commands clickable and functional
            const items = DOM.commandSuggestions.querySelectorAll('.item');
            items.forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const command = commands.find(c => c.id === id);
                    if (command && command.action) {
                        command.action();
                        hideCommandSuggestions();
                        if (DOM.globalSearch) DOM.globalSearch.blur();
                    }
                });
            });
        }
        DOM.commandSuggestions.classList.remove('hidden');
    }

    if (DOM.globalSearch) {
        DOM.globalSearch.addEventListener('focus', () => {
            renderCommandSuggestions(DOM.globalSearch.value || '');
        });

        DOM.globalSearch.addEventListener('click', () => {
            renderCommandSuggestions(DOM.globalSearch.value || '');
        });

        DOM.globalSearch.addEventListener('input', () => {
            renderCommandSuggestions(DOM.globalSearch.value || '');
        });

        DOM.globalSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderCommandSuggestions(DOM.globalSearch.value || '');
            }
            if (e.key === 'Escape') {
                hideCommandSuggestions();
                DOM.globalSearch.blur();
            }
        });

        DOM.globalSearch.addEventListener('blur', () => {
            setTimeout(hideCommandSuggestions, 120);
        });
    }

    // Inspector Accordions (expand/collapse)
    const accordionHeaders = document.querySelectorAll('.accordion .acc-header');
    accordionHeaders.forEach(header => {
        const body = header.nextElementSibling;
        if (!body) return;
        header.addEventListener('click', () => {
            const isHidden = body.style.display === 'none';
            if (isHidden) {
                body.style.display = '';
                header.textContent = header.textContent.replace('▶', '▼');
            } else {
                body.style.display = 'none';
                header.textContent = header.textContent.replace('▼', '▶');
            }
        });
    });

    // Trigger Initial Render
    applyCanvasTransform();
    renderAll();

});

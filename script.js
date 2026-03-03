/**
 * Shape Studio - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
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

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const DOM = {
        canvas: document.getElementById('canvas-container'),
        ghost: document.getElementById('drag-ghost'),
        toolbar: document.getElementById('context-toolbar'),

        inspW: document.getElementById('insp-w'),
        inspH: document.getElementById('insp-h'),
        inspRot: document.getElementById('insp-rot'),
        inspFill: document.getElementById('insp-fill'),
        inspStroke: document.getElementById('insp-stroke'),
        inspOpacity: document.getElementById('insp-opacity'),
        inspOpacityVal: document.getElementById('insp-opacity-val'),
        inspRad: document.getElementById('insp-rad'),
        rotateBtn: document.getElementById('rotate-btn'),
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
        mouseX: document.getElementById('mouse-x'),
        mouseY: document.getElementById('mouse-y'),

        // Ribbon specific additions
        ribbonX: document.getElementById('ribbon-x'),
        ribbonY: document.getElementById('ribbon-y'),
        ribbonW: document.getElementById('ribbon-w'),
        ribbonH: document.getElementById('ribbon-h'),
        ribbonRot: document.getElementById('ribbon-rot'),
        ribbonFill: document.getElementById('ribbon-fill'),
        ribbonStroke: document.getElementById('ribbon-stroke'),
        ribbonOpacity: document.getElementById('ribbon-opacity'),

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
        advPanel: document.getElementById('advanced-preview-panel'),

        toolButtons: document.querySelectorAll('.tool-btn[data-tool]'),
        fileName: document.getElementById('file-name')
    };

    if (DOM.fileName) {
        DOM.fileName.value = AppState.fileName;
    }

    // ==========================================
    // 3. CANVAS CORE ACTIONS
    // ==========================================

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
            w = 150; h = 40; fill = 'transparent'; stroke = 'transparent';
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

    // ==========================================
    // 4. RENDERING ENGINE
    // ==========================================

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

            // Wireframe styling
            el.style.position = 'absolute';
            el.style.border = '1px solid #444';
            el.style.background = '#eaeaea';
            el.style.boxSizing = 'border-box';

            // Core shape styling logic moved to updateElementStyles for persistence

            updateElementStyles(el, shape);

            // Shape Interactions
            el.addEventListener('mousedown', (e) => {
                const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                handleShapeMousedown(e, shape.id, isMulti);
            });

            if (shape.type === 'text') {
                el.addEventListener('input', () => {
                    shape.text = el.innerText;
                });

                el.addEventListener('blur', () => {
                    el.contentEditable = 'false';
                    el.style.cursor = 'default';
                    el.style.outline = 'none';
                    window.getSelection().removeAllRanges();
                    commitHistory();
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

        // Reset wrapper styles so handles attached to 'el' are never clipped
        el.style.backgroundColor = 'transparent';
        el.style.borderColor = 'transparent';
        el.style.borderRadius = '';
        el.style.clipPath = '';
        el.style.border = 'none';

        if (shape.type === 'text') {
            if (el.contentEditable !== 'true') {
                el.innerText = shape.text || 'Text Box';
            }
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = Math.max(12, shape.h * 0.4) + 'px';
            el.style.fontFamily = 'sans-serif';
            el.style.color = shape.stroke === 'transparent' ? '#000' : shape.stroke;
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
            svgWrapper.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" style="overflow:visible;">
                <polyline points="${shape.points}" fill="none" stroke="${shape.stroke}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
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
        else if (shape.type === 'double-arrow')     points = "0,50 25,25 25,40 75,40 75,25 100,50 75,75 75,60 25,60 25,75";
        else if (shape.type === 'cross')            points = "20,0 50,30 80,0 100,20 70,50 100,80 80,100 50,70 20,100 0,80 30,50 0,20";
        else if (shape.type === 'plus')             points = "35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35";
        else if (shape.type === 'tag')              points = "0,0 75,0 100,50 75,100 0,100 0,0";
        else if (shape.type === 'star')             points = "50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35";

        if (points) {
            const sw = shape.stroke === 'transparent' ? 0 : 2;
            visual.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible;">
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

    // ==========================================
    // 5. SELECTION & UI UPDATES
    // ==========================================

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

            // Update Inspector
            if (DOM.inspW && document.activeElement !== DOM.inspW) DOM.inspW.value = primary.w;
            if (DOM.inspH && document.activeElement !== DOM.inspH) DOM.inspH.value = primary.h;
            if (DOM.inspRot && document.activeElement !== DOM.inspRot) DOM.inspRot.value = primary.rot;
            if (DOM.inspRad && document.activeElement !== DOM.inspRad) DOM.inspRad.value = primary.radius != null ? primary.radius : 0;
            if (DOM.inspFill && document.activeElement !== DOM.inspFill) DOM.inspFill.value = primary.fill;
            if (DOM.inspStroke && document.activeElement !== DOM.inspStroke) DOM.inspStroke.value = primary.stroke;
            if (DOM.inspOpacity && document.activeElement !== DOM.inspOpacity) {
                DOM.inspOpacity.value = primary.opacity;
                if (DOM.inspOpacityVal) DOM.inspOpacityVal.innerText = primary.opacity + '%';
            }
            if (DOM.inspLockAspect && document.activeElement !== DOM.inspLockAspect) DOM.inspLockAspect.checked = !!primary.lockAspect;
            if (DOM.inspLockPosition && document.activeElement !== DOM.inspLockPosition) DOM.inspLockPosition.checked = !!primary.lockPosition;
            if (DOM.inspLabel && document.activeElement !== DOM.inspLabel) DOM.inspLabel.value = primary.label || '';
            if (DOM.inspDesc && document.activeElement !== DOM.inspDesc) DOM.inspDesc.value = primary.description || '';
            
            // Update Ribbon Inputs
            if (DOM.ribbonX && document.activeElement !== DOM.ribbonX) DOM.ribbonX.value = primary.x;
            if (DOM.ribbonY && document.activeElement !== DOM.ribbonY) DOM.ribbonY.value = primary.y;
            if (DOM.ribbonW && document.activeElement !== DOM.ribbonW) DOM.ribbonW.value = primary.w;
            if (DOM.ribbonH && document.activeElement !== DOM.ribbonH) DOM.ribbonH.value = primary.h;
            if (DOM.ribbonRot && document.activeElement !== DOM.ribbonRot) DOM.ribbonRot.value = primary.rot;
            if (DOM.inspRad && primary.radius != null && document.activeElement !== DOM.inspRad) DOM.inspRad.value = primary.radius;
            if (DOM.ribbonFill && document.activeElement !== DOM.ribbonFill) DOM.ribbonFill.value = primary.fill;
            if (DOM.ribbonStroke && document.activeElement !== DOM.ribbonStroke) DOM.ribbonStroke.value = primary.stroke;
            if (DOM.ribbonOpacity && document.activeElement !== DOM.ribbonOpacity) DOM.ribbonOpacity.value = primary.opacity;
            
        } else {
            DOM.toolbar.classList.add('hidden');
            if (DOM.inspW) DOM.inspW.value = '';
            if (DOM.inspH) DOM.inspH.value = '';
            if (DOM.inspRot) DOM.inspRot.value = '';
            
            if (DOM.ribbonX) DOM.ribbonX.value = '';
            if (DOM.ribbonY) DOM.ribbonY.value = '';
            if (DOM.ribbonW) DOM.ribbonW.value = '';
            if (DOM.ribbonH) DOM.ribbonH.value = '';
            if (DOM.ribbonRot) DOM.ribbonRot.value = '';
            if (DOM.inspLockAspect) DOM.inspLockAspect.checked = false;
            if (DOM.inspLockPosition) DOM.inspLockPosition.checked = false;
            if (DOM.inspLabel) DOM.inspLabel.value = '';
            if (DOM.inspDesc) DOM.inspDesc.value = '';
        }
    }

    let toastTimer = null;
    function showToast(msg) {
        const toast = document.querySelector('.toast');
        if (!toast) return;
        toast.innerHTML = `${msg}`;
        toast.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3200);
    }

    // ==========================================
    // 6. DRAG & DROP FROM LIBRARY
    // ==========================================

    let dragType = null;

    DOM.library.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.shape-item');
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

    // ==========================================
    // 7. CANVAS MANIPULATION (MOVE, RESIZE, ROTATE)
    // ==========================================
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
        if (el && el.contentEditable === 'true') {
            e.stopPropagation(); // prevent background canvas from deselecting
            return; // let native text selection handle it
        }

        const shape = AppState.shapes.find(s => s.id === id);
        const now = Date.now();
        if (lastClickId === id && (now - lastClickTime) < 900 && shape && shape.type === 'text') {
            showToast('Editing text...');
            el.contentEditable = 'true';
            el.style.cursor = 'text';
            el.style.outline = '2px solid #007bff';
            setTimeout(() => {
                el.focus();
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }, 50);
            e.stopPropagation();
            lastClickId = null;
            return;
        }
        lastClickTime = now;
        lastClickId = id;

        if (AppState.activeTool === 'eraser') {
            AppState.shapes = AppState.shapes.filter(s => s.id !== id);
            commitHistory();
            renderAll();
            showToast('Deleted shape — Undo (Cmd+Z)');
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

                shape.x = nx;
                shape.y = ny;
            }
            else if (isResizing) {
                if (initial.lockPosition) return;
                // simple resizing logic (ignores rotation for prototype simplicity)
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

                shape.x = nx; shape.y = ny;
                shape.w = Math.max(10, nw); shape.h = Math.max(10, nh);
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

    DOM.canvas.addEventListener('mousedown', (e) => {
        const isCanvasClick = e.target === DOM.canvas || e.target.id === 'measure-overlay' || e.target.classList.contains('alignment-guide');
        const isToolOverride = AppState.activeTool !== 'select' && AppState.activeTool !== 'eraser';

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
                measureEl.innerHTML = `<svg width="100%" height="100%" style="overflow:visible;">
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
                currentDrawShape = {
                    id: 's_' + shapeCounter,
                    type: 'path',
                    x: ptX, y: ptY, w: 1, h: 1, rot: 0,
                    origW: 1, origH: 1,
                    fill: 'transparent',
                    stroke: '#444444',
                    opacity: 100,
                    points: "0,0"
                };
                AppState.shapes.push(currentDrawShape);
                renderAll();
            }
        }
    });

    // Panning/Drawing logic on mouse move globally
    document.addEventListener('mousemove', (e) => {
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
            document.getElementById('tool-select').click();
        }
    });

    // ==========================================
    // 8. INSPECTOR DATA BINDING
    // ==========================================
    function bindInput(input, prop, isString = false) {
        if (!input) return;

        const eventType = (input.type === 'range' || input.type === 'color' || input.type === 'number') ? 'input' : 'change';

        input.addEventListener(eventType, (e) => {
            let val = e.target.value;
            if (!isString) {
                val = parseInt(val);
                if (isNaN(val)) return;
            }

            let changed = false;
            AppState.selection.forEach(id => {
                const shape = AppState.shapes.find(s => s.id === id);
                if (shape) {
                    shape[prop] = val;
                    changed = true;
                }
            });
            if (changed) {
                // For 'input' events (dragging sliders/colors), maybe don't flood history?
                // For a prototype, saving history tracking on release is better, but this will do.
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

    // Ribbon input bindings
    bindInput(DOM.ribbonX, 'x');
    bindInput(DOM.ribbonY, 'y');
    bindInput(DOM.ribbonW, 'w');
    bindInput(DOM.ribbonH, 'h');
    bindInput(DOM.ribbonRot, 'rot');
    bindInput(DOM.ribbonFill, 'fill', true);
    bindInput(DOM.ribbonStroke, 'stroke', true);
    bindInput(DOM.ribbonOpacity, 'opacity');

    // Canvas settings binding
    if (DOM.canvasW) {
        DOM.canvasW.addEventListener('change', (e) => {
            const w = Math.max(100, parseInt(e.target.value) || 900);
            AppState.settings.canvasW = w;
            DOM.canvas.style.width = `${w}px`;
            e.target.value = w;
            commitHistory();
        });
    }
    if (DOM.canvasH) {
        DOM.canvasH.addEventListener('change', (e) => {
            const h = Math.max(100, parseInt(e.target.value) || 600);
            AppState.settings.canvasH = h;
            DOM.canvas.style.height = `${h}px`;
            e.target.value = h;
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

    // ==========================================
    // 9. HOTKEYS & GLOBAL ACTIONS
    // ==========================================

    document.addEventListener('keydown', (e) => {
        // Backspace / Delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (e.target.tagName !== 'INPUT') {
                removeSelectedShapes();
            }
        }

        // Custom hotkeys (Cmd/Ctrl)
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

    if (DOM.rotateBtn) {
        DOM.rotateBtn.addEventListener('click', () => {
            if (AppState.selection.length === 0) return;
            AppState.selection.forEach(id => {
                const s = AppState.shapes.find(x => x.id === id);
                if (s) s.rot = (s.rot || 0) + 15;
            });
            commitHistory();
            renderAll();
            showToast('Rotated +15° — Undo (Cmd+Z)');
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
                if (AppState.selection.length < 2) return;
                const first = AppState.shapes.find(x => x.id === AppState.selection[0]);
                if (!first) return;
                AppState.selection.forEach(selId => {
                    const s = AppState.shapes.find(x => x.id === selId);
                    if (s && s.id !== first.id) {
                        alignActions[id](s, first);
                    }
                });
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

    // Ribbon Templates Actions
    const addTemplate = (shapes) => {
        const ids = [];
        shapes.forEach(tmpl => {
            const data = createShapeData(tmpl.type, tmpl.x + 100, tmpl.y + 100);
            Object.assign(data, tmpl);
            data.id = 's_' + (++shapeCounter); // Re-assign unique id
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
            showToast('Clear Canvas: confirm to remove all shapes.');
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
    if (DOM.modeBeginner && DOM.modeAdvanced) {
        DOM.modeBeginner.addEventListener('click', () => {
            AppState.mode = 'beginner';
            DOM.modeBeginner.classList.add('active');
            DOM.modeAdvanced.classList.remove('active');
            DOM.advPanel.classList.add('hidden'); // hide advanced panel
        });

        DOM.modeAdvanced.addEventListener('click', () => {
            AppState.mode = 'advanced';
            DOM.modeAdvanced.classList.add('active');
            DOM.modeBeginner.classList.remove('active');
            DOM.advPanel.classList.remove('hidden');
        });
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
            });
        });
    }

    // Shape Library Toggling
    const toggleLibraryBtn = document.getElementById('toggle-library-btn');
    const closeLibraryBtn = document.getElementById('close-library-btn');
    const libraryPanel = document.querySelector('.library-panel');
    const rightSidebar = document.querySelector('.right-sidebar');

    if (toggleLibraryBtn && libraryPanel && rightSidebar) {
        toggleLibraryBtn.addEventListener('click', () => {
            const isHidden = rightSidebar.style.display === 'none';
            if (isHidden) {
                rightSidebar.style.display = 'flex';
                libraryPanel.style.display = 'flex';
                showToast('Library opened — drag shapes onto canvas.');
            } else {
                rightSidebar.style.display = 'none';
                showToast('Library hidden — toggle to show again.');
            }
        });
    }
    
    if (closeLibraryBtn && libraryPanel && rightSidebar) {
        closeLibraryBtn.addEventListener('click', () => {
            rightSidebar.style.display = 'none';
        });
    }

    // Shape Library Chips & Search
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
        { name: 'Double Arrow', type: 'double-arrow', category: 'arrows', icon: '⇄' },

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

    // Command search with suggestions (commands only; search does not auto-run)
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
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter(cmd => cmd.keywords.some(k => k.includes(q)) || cmd.label.toLowerCase().includes(q));
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

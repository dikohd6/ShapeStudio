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
        settings: {
            snapToGrid: false,
            gridSize: 20,
            snapToObjects: true
        },
        activeTool: 'select'
    };

    let shapeCounter = 0;

    // Save history point
    function commitHistory() {
        // Deep copy shapes
        const snap = JSON.parse(JSON.stringify(AppState.shapes));
        AppState.history.push(snap);
        AppState.redoStack = []; // clear redo on new action
        if (AppState.history.length > 50) AppState.history.shift();
    }

    function undo() {
        if (AppState.history.length === 0) return;
        const currentSnap = JSON.parse(JSON.stringify(AppState.shapes));
        AppState.redoStack.push(currentSnap);

        const prevSnap = AppState.history.pop();
        AppState.shapes = prevSnap;
        AppState.selection = []; // clear selection on undo for simplicity
        renderAll();
    }

    function redo() {
        if (AppState.redoStack.length === 0) return;
        const currentSnap = JSON.parse(JSON.stringify(AppState.shapes));
        AppState.history.push(currentSnap);

        const nextSnap = AppState.redoStack.pop();
        AppState.shapes = nextSnap;
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

        toolButtons: document.querySelectorAll('.tool-btn[data-tool]')
    };

    // ==========================================
    // 3. CANVAS CORE ACTIONS
    // ==========================================

    function createShapeData(type, x, y) {
        shapeCounter++;
        let w = 120, h = 80;
        if (type === 'square' || type === 'circle' || type === 'star') {
            w = 100; h = 100;
        } else if (type === 'text') {
            w = 150; h = 40;
        }
        return {
            id: 's_' + shapeCounter,
            type: type,
            x: x - (w / 2), // center on mouse
            y: y - (h / 2),
            w: w,
            h: h,
            rot: 0,
            fill: type === 'text' ? 'transparent' : '#eaeaea',
            stroke: type === 'text' ? 'transparent' : '#444444',
            opacity: 100,
            text: type === 'text' ? 'Text Box' : ''
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
                const isMulti = e.shiftKey;
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
        el.style.backgroundColor = shape.fill;
        el.style.borderColor = shape.stroke;
        el.style.opacity = shape.opacity / 100;

        // Shape specific styling that needs to persist across fast updates
        el.style.borderRadius = '';
        el.style.clipPath = '';
        el.style.border = `1px solid ${shape.stroke}`;

        if (shape.type === 'circle') {
            el.style.borderRadius = '50%';
        } else if (shape.type === 'triangle') {
            el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            el.style.border = 'none'; // borders break on CSS clip paths
        } else if (shape.type === 'star') {
            el.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
            el.style.border = 'none';
        } else if (shape.type === 'text') {
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
        } else if (shape.type === 'path') {
            el.style.border = 'none';
            el.style.backgroundColor = 'transparent';
            const vw = shape.origW || shape.w;
            const vh = shape.origH || shape.h;
            el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" style="overflow:visible;">
                <polyline points="${shape.points}" fill="none" stroke="${shape.stroke}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
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
        rot.innerText = '↻';
        rot.dataset.id = id;
        rot.addEventListener('mousedown', handleRotateMousedown);
        el.appendChild(rot);
    }

    // ==========================================
    // 5. SELECTION & UI UPDATES
    // ==========================================

    function selectShape(id, multi) {
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
        // Toolbar visibility
        if (AppState.selection.length > 0) {
            DOM.toolbar.classList.remove('hidden');
            // Position above the first selected shape
            const primary = AppState.shapes.find(s => s.id === AppState.selection[0]);
            if (primary) {
                DOM.toolbar.style.top = (primary.y - 45) + 'px';
                DOM.toolbar.style.left = primary.x + 'px';
            }

            // Update Inspector
            if (DOM.inspW) DOM.inspW.value = primary.w;
            if (DOM.inspH) DOM.inspH.value = primary.h;
            if (DOM.inspRot) DOM.inspRot.value = primary.rot;
            if (DOM.inspFill) DOM.inspFill.value = primary.fill;
            if (DOM.inspStroke) DOM.inspStroke.value = primary.stroke;
            if (DOM.inspOpacity) {
                DOM.inspOpacity.value = primary.opacity;
                if (DOM.inspOpacityVal) DOM.inspOpacityVal.innerText = primary.opacity + '%';
            }
        } else {
            DOM.toolbar.classList.add('hidden');
            if (DOM.inspW) DOM.inspW.value = '';
            if (DOM.inspH) DOM.inspH.value = '';
            if (DOM.inspRot) DOM.inspRot.value = '';
        }
    }

    function showToast(msg) {
        // Mocking a toast popup on the bottom status bar
        const toast = document.querySelector('.toast');
        if (toast) {
            toast.innerHTML = `${msg}`;
        }
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
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

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
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

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

        if (AppState.activeTool !== 'select') return;

        if (!AppState.selection.includes(id)) {
            selectShape(id, isMulti);
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

        const dx = e.clientX - actionStartX;
        const dy = e.clientY - actionStartY;

        AppState.selection.forEach(id => {
            const shape = AppState.shapes.find(s => s.id === id);
            const initial = initialShapesState.find(s => s.id === id);
            if (!shape || !initial) return;

            if (isDragging) {
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
                // simple resizing logic (ignores rotation for prototype simplicity)
                let nx = initial.x, ny = initial.y, nw = initial.w, nh = initial.h;
                const aspect = nw / nh;

                if (resizeHandle.includes('e')) nw += dx;
                if (resizeHandle.includes('s')) nh += dy;
                if (resizeHandle.includes('w')) { nx += dx; nw -= dx; }
                if (resizeHandle.includes('n')) { ny += dy; nh -= dy; }

                // Shift to lock aspect ratio
                if (e.shiftKey) {
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
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

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

    DOM.canvas.addEventListener('mousedown', (e) => {
        if (e.target === DOM.canvas || e.target.classList.contains('alignment-guide')) {
            DOM.palette.classList.add('hidden');
            DOM.confirmDialog.classList.add('hidden');

            if (AppState.activeTool === 'select') {
                selectShape(null, false);
            } else if (AppState.activeTool === 'text') {
                const rect = DOM.canvas.getBoundingClientRect();
                const newShape = createShapeData('text', e.clientX - rect.left, e.clientY - rect.top);
                addShape(newShape);
                document.getElementById('tool-select').click();
            } else if (AppState.activeTool === 'shape') {
                const rect = DOM.canvas.getBoundingClientRect();
                const newShape = createShapeData('square', e.clientX - rect.left, e.clientY - rect.top);
                addShape(newShape);
                document.getElementById('tool-select').click();
            } else if (AppState.activeTool === 'pan') {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
            } else if (AppState.activeTool === 'measure') {
                showToast(`Measure tool not implemented. Try drawing shapes.`);
                document.getElementById('tool-select').click();
            } else if (AppState.activeTool === 'pen') {
                // Start drawing path
                isDrawing = true;
                const rect = DOM.canvas.getBoundingClientRect();
                const ptX = e.clientX - rect.left;
                const ptY = e.clientY - rect.top;
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
            DOM.canvas.scrollBy(-dx, -dy);
            panStartX = e.clientX;
            panStartY = e.clientY;
        } else if (isDrawing && currentDrawShape) {
            const rect = DOM.canvas.getBoundingClientRect();
            const ptX = e.clientX - rect.left;
            const ptY = e.clientY - rect.top;
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

    document.addEventListener('mouseup', () => {
        isPanning = false;
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

        const eventType = input.type === 'range' || input.type === 'color' ? 'input' : 'change';

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

        if (input.type === 'range' || input.type === 'color') {
            input.addEventListener('change', commitHistory);
        }
    }

    bindInput(DOM.inspW, 'w');
    bindInput(DOM.inspH, 'h');
    bindInput(DOM.inspRot, 'rot');
    bindInput(DOM.inspFill, 'fill', true);
    bindInput(DOM.inspStroke, 'stroke', true);
    bindInput(DOM.inspOpacity, 'opacity');

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

    // Clear Canvas Dialog
    const helpBtn = document.querySelector('.app-bar-right .btn-icon-btn, .app-bar-right button:nth-child(2)');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            DOM.confirmDialog.classList.remove('hidden');
        });
    }

    if (DOM.btnCancelClear) {
        DOM.btnCancelClear.addEventListener('click', () => {
            DOM.confirmDialog.classList.add('hidden');
        });
    }

    if (DOM.btnConfirmClear) {
        DOM.btnConfirmClear.addEventListener('click', () => {
            AppState.shapes = [];
            AppState.selection = [];
            commitHistory();
            renderAll();
            DOM.confirmDialog.classList.add('hidden');
            showToast('Cleared canvas — Undo (Cmd+Z)');
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

    // Trigger Initial Render
    renderAll();

});

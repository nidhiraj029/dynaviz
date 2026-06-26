/**
 * DynaViz Application Logic
 * Manages grid states, UI actions, API calls, and algorithm visualization pipelines.
 */

// Grid settings
const ROWS = 21;
const COLS = 41;

// Default node positions
let defaultStart = [10, 8];
let defaultTarget = [10, 32];

// Grid States (Unified for synchronization)
const gridState = {
    start: [...defaultStart],
    target: [...defaultTarget],
    walls: new Set(), // Set of "r,c" strings
    weights: new Map() // Map of "r,c" -> weightValue
};

// UI and animation state variables
let activeBrush = 'wall'; // 'wall' | 'weight' | 'eraser'
let isDrawing = false;
let isDragging = null; // 'start' | 'target' | null
let isRunning = false;
let comparisonMode = false;
let speedDelay = 10; // Default: Fast (10ms)

// Animation references
let activeTimeouts = [];

// DOM Element Selections
const gridA = document.getElementById('grid-a');
const gridB = document.getElementById('grid-b');
const layoutContainer = document.getElementById('grid-layout-container');
const panelB = document.getElementById('panel-b');

const btnVisualize = document.getElementById('btn-visualize');
const btnBenchmark = document.getElementById('btn-benchmark');
const btnClearPath = document.getElementById('btn-clear-path');
const btnClearWalls = document.getElementById('btn-clear-walls');
const btnGenerateMaze = document.getElementById('btn-generate-maze');
const btnSaveMaze = document.getElementById('btn-save-maze');
const mazeNameInput = document.getElementById('maze-name-input');
const savedMazesList = document.getElementById('saved-mazes-list');

const modeSingle = document.getElementById('mode-single');
const modeComparison = document.getElementById('mode-comparison');

const algPrimary = document.getElementById('alg-primary');
const algSecondary = document.getElementById('alg-secondary');
const heuristicPrimary = document.getElementById('heuristic-primary');
const heuristicSecondary = document.getElementById('heuristic-secondary');
const mazeAlg = document.getElementById('maze-alg');

const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');

const comparisonHud = document.getElementById('comparison-hud');
const benchmarkTableBody = document.getElementById('benchmark-table-body');
const titleGridA = document.getElementById('title-grid-a');
const titleGridB = document.getElementById('title-grid-b');

// Stats DOM A & B
const statVisitedA = document.getElementById('stat-visited-a');
const statCostA = document.getElementById('stat-cost-a');
const statFrontierA = document.getElementById('stat-frontier-a');
const statTimeA = document.getElementById('stat-time-a');
const statVisitedB = document.getElementById('stat-visited-b');
const statCostB = document.getElementById('stat-cost-b');
const statFrontierB = document.getElementById('stat-frontier-b');
const statTimeB = document.getElementById('stat-time-b');

// ==========================================
// 1. INITIALIZATION & GRID CREATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initGrids();
    setupEventListeners();
    loadSavedMazes();
});

/**
 * Build empty grids in DOM for Grid A and Grid B.
 */
function initGrids() {
    createGridDOM(gridA, 'a');
    createGridDOM(gridB, 'b');
    syncGridVisuals();
}

function createGridDOM(gridElement, prefix) {
    gridElement.innerHTML = '';
    gridElement.style.setProperty('--grid-rows', ROWS);
    gridElement.style.setProperty('--grid-cols', COLS);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'node';
            cell.id = `${prefix}-${r}-${c}`;
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Mouse Drag Drawing Listeners
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, r, c));
            cell.addEventListener('mouseenter', () => handleMouseEnter(r, c));
            
            gridElement.appendChild(cell);
        }
    }

    // Window-level mouseup release handler
    window.addEventListener('mouseup', handleMouseUp);
}

// ==========================================
// 2. GRID RENDERING & SYNCHRONIZATION
// ==========================================

/**
 * Synchronizes classes across both Grid A and Grid B cells based on gridState.
 */
function syncGridVisuals() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const isStart = gridState.start[0] === r && gridState.start[1] === c;
            const isTarget = gridState.target[0] === r && gridState.target[1] === c;
            const coord = `${r},${c}`;

            updateCellVisuals('a', r, c, isStart, isTarget, coord);
            updateCellVisuals('b', r, c, isStart, isTarget, coord);
        }
    }
}

function updateCellVisuals(prefix, r, c, isStart, isTarget, coord) {
    const cell = document.getElementById(`${prefix}-${r}-${c}`);
    if (!cell) return;

    // Reset base node state classes
    cell.classList.remove('node-start', 'node-target', 'node-wall', 'node-weight', 'draggable');

    if (isStart) {
        cell.classList.add('node-start', 'draggable');
    } else if (isTarget) {
        cell.classList.add('node-target', 'draggable');
    } else if (gridState.walls.has(coord)) {
        cell.classList.add('node-wall');
    } else if (gridState.weights.has(coord)) {
        cell.classList.add('node-weight');
    }
}

// Helper to check if node matches start/target
const isStartNode = (r, c) => gridState.start[0] === r && gridState.start[1] === c;
const isTargetNode = (r, c) => gridState.target[0] === r && gridState.target[1] === c;

// ==========================================
// 3. MOUSE INTERACTION HANDLERS
// ==========================================

function handleMouseDown(e, r, c) {
    if (isRunning) return;
    e.preventDefault();

    if (isStartNode(r, c)) {
        isDragging = 'start';
    } else if (isTargetNode(r, c)) {
        isDragging = 'target';
    } else {
        isDrawing = true;
        applyBrush(r, c);
    }
}

function handleMouseEnter(r, c) {
    if (isRunning) return;
    
    if (isDragging === 'start') {
        // Can't move start on top of target
        if (!isTargetNode(r, c)) {
            // Remove wall/weight if start lands on it
            const coord = `${r},${c}`;
            gridState.walls.delete(coord);
            gridState.weights.delete(coord);
            gridState.start = [r, c];
            syncGridVisuals();
        }
    } else if (isDragging === 'target') {
        // Can't move target on top of start
        if (!isStartNode(r, c)) {
            const coord = `${r},${c}`;
            gridState.walls.delete(coord);
            gridState.weights.delete(coord);
            gridState.target = [r, c];
            syncGridVisuals();
        }
    } else if (isDrawing) {
        applyBrush(r, c);
    }
}

function handleMouseUp() {
    isDrawing = false;
    isDragging = null;
}

function applyBrush(r, c) {
    // Start and Target nodes cannot be painted over
    if (isStartNode(r, c) || isTargetNode(r, c)) return;

    const coord = `${r},${c}`;

    if (activeBrush === 'wall') {
        gridState.walls.add(coord);
        gridState.weights.delete(coord);
    } else if (activeBrush === 'weight') {
        gridState.weights.set(coord, 5);
        gridState.walls.delete(coord);
    } else if (activeBrush === 'eraser') {
        gridState.walls.delete(coord);
        gridState.weights.delete(coord);
    }

    // Fast inline visual sync instead of full grid refresh
    updateCellVisuals('a', r, c, false, false, coord);
    updateCellVisuals('b', r, c, false, false, coord);
}

// ==========================================
// 4. GUI BINDINGS & CONTROLS
// ==========================================

function setupEventListeners() {
    // Mode Toggles
    modeSingle.addEventListener('click', () => setMode(false));
    modeComparison.addEventListener('click', () => setMode(true));

    // Brush Tool selectors
    document.querySelectorAll('.btn-brush').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-brush').forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            activeBrush = targetBtn.dataset.brush;
        });
    });

    // Speed Slider
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const labels = ['Slow', 'Medium', 'Fast', 'Instant'];
        speedVal.innerText = labels[val];
        
        const speeds = [150, 45, 10, 0]; // ms delays
        speedDelay = speeds[val];
    });

    // Heuristics select visibility toggle
    algPrimary.addEventListener('change', () => {
        const needsHeur = algPrimary.value === 'astar' || algPrimary.value === 'gbfs';
        document.getElementById('heuristic-a-group').classList.toggle('hidden', !needsHeur);
        updateTitles();
    });
    algSecondary.addEventListener('change', () => {
        const needsHeur = algSecondary.value === 'astar' || algSecondary.value === 'gbfs';
        document.getElementById('heuristic-b-group').classList.toggle('hidden', !needsHeur);
        updateTitles();
    });

    // Clear actions
    btnClearPath.addEventListener('click', clearPaths);
    btnClearWalls.addEventListener('click', resetBoard);

    // Primary action triggers
    btnVisualize.addEventListener('click', startVisualization);
    btnBenchmark.addEventListener('click', runAllAlgorithmsBenchmark);
    btnGenerateMaze.addEventListener('click', startMazeGeneration);

    // Save/Load action triggers
    btnSaveMaze.addEventListener('click', saveLayout);
}

function setMode(mode) {
    if (isRunning) return;
    comparisonMode = mode;
    
    if (comparisonMode) {
        modeSingle.classList.remove('active');
        modeComparison.classList.add('active');
        
        layoutContainer.className = 'grid-layout-comparison';
        panelB.classList.remove('hidden');
        document.getElementById('comparison-alg-group').classList.remove('hidden');
        
        // Toggle heuristic B group visibility based on second algorithm setting
        const isAStarB = algSecondary.value === 'astar';
        document.getElementById('heuristic-b-group').classList.toggle('hidden', !isAStarB);
        
        // Show legend labels specific to secondary node coloring
        document.querySelectorAll('.select-b-only').forEach(el => el.classList.remove('hidden'));
    } else {
        modeSingle.classList.add('active');
        modeComparison.classList.remove('active');
        
        layoutContainer.className = 'grid-layout-single';
        panelB.classList.add('hidden');
        document.getElementById('comparison-alg-group').classList.add('hidden');
        document.getElementById('heuristic-b-group').classList.add('hidden');
        
        document.querySelectorAll('.select-b-only').forEach(el => el.classList.add('hidden'));
        comparisonHud.classList.add('hidden');
    }
    clearPaths();
    updateTitles();
}

function updateTitles() {
    const algAName = algPrimary.options[algPrimary.selectedIndex].text;
    const algBName = algSecondary.options[algSecondary.selectedIndex].text;
    
    titleGridA.innerText = comparisonMode ? `Grid A — ${algAName}` : `Grid View — ${algAName}`;
    titleGridB.innerText = `Grid B — ${algBName}`;
}

// ==========================================
// 5. GRID CLEANING OPERATIONS
// ==========================================

function clearPaths() {
    if (isRunning) return;
    
    // Cancel any active timeouts
    activeTimeouts.forEach(clearTimeout);
    activeTimeouts = [];

    comparisonHud.classList.add('hidden');

    // Reset statistics metrics display
    statVisitedA.innerText = '0';
    statCostA.innerText = '0';
    statFrontierA.innerText = '0';
    statTimeA.innerText = '0ms';
    statVisitedB.innerText = '0';
    statCostB.innerText = '0';
    statFrontierB.innerText = '0';
    statTimeB.innerText = '0ms';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellA = document.getElementById(`a-${r}-${c}`);
            const cellB = document.getElementById(`b-${r}-${c}`);

            if (cellA) cellA.classList.remove('node-visited-a', 'node-shortest-path');
            if (cellB) cellB.classList.remove('node-visited-b', 'node-shortest-path');
        }
    }
}

function resetBoard() {
    if (isRunning) return;
    clearPaths();

    gridState.walls.clear();
    gridState.weights.clear();
    gridState.start = [...defaultStart];
    gridState.target = [...defaultTarget];
    
    syncGridVisuals();
}

// ==========================================
// 6. VISUALIZATION PIPELINES
// ==========================================

function getGridMatrix() {
    const matrix = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const coord = `${r},${c}`;
            if (gridState.walls.has(coord)) {
                matrix[r][c] = 1;
            } else if (gridState.weights.has(coord)) {
                matrix[r][c] = 2; // Weight representation
            }
        }
    }
    return matrix;
}

function startVisualization() {
    if (isRunning) return;
    clearPaths();
    isRunning = true;
    toggleControls(true);

    const algAVal = algPrimary.value;
    const heurA = heuristicPrimary.value;

    const wallsArray = Array.from(gridState.walls).map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return { x: c, y: r };
    });
    const weightsArray = Array.from(gridState.weights.keys()).map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return { x: c, y: r };
    });

    const payload = {
        width: COLS,
        height: ROWS,
        start: { x: gridState.start[1], y: gridState.start[0] },
        end: { x: gridState.target[1], y: gridState.target[0] },
        walls: wallsArray,
        weights: weightsArray,
        algorithm: algAVal,
        heuristic: heurA
    };

    if (!comparisonMode) {
        // --- SINGLE GRID PIPELINE ---
        fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(async r => {
            if (!r.ok) throw new Error('Solver endpoint returned error');
            const res = await r.json();

            // Set metrics
            statTimeA.innerText = `${res.execution_time_ms.toFixed(2)}ms`;
            statFrontierA.innerText = res.max_frontier_size;
            document.getElementById('stat-memory-a').innerText = res.space_complexity_observed_nodes;
            document.getElementById('stat-branch-a').innerText = res.avg_branching_factor;

            if (speedDelay === 0) {
                // Instant loop
                res.visited.forEach(node => {
                    const r = node.y;
                    const c = node.x;
                    if (!isStartNode(r, c) && !isTargetNode(r, c)) {
                        const cell = document.getElementById(`a-${r}-${c}`);
                        if (cell) cell.classList.add('node-visited-a');
                    }
                });
                statVisitedA.innerText = res.nodes_visited_count;
                drawShortestPathSync('a', res.path, res.path_length);
                finishRun();
            } else {
                // Step animation
                let idx = 0;
                function stepVisited() {
                    if (idx >= res.visited.length) {
                        if (res.path) {
                            drawShortestPathAsync('a', res.path, res.path_length, finishRun);
                        } else {
                            finishRun();
                        }
                        return;
                    }
                    const node = res.visited[idx];
                    const r = node.y;
                    const c = node.x;
                    if (!isStartNode(r, c) && !isTargetNode(r, c)) {
                        const cell = document.getElementById(`a-${r}-${c}`);
                        if (cell) cell.classList.add('node-visited-a');
                    }
                    statVisitedA.innerText = idx + 1;
                    idx++;
                    const tid = setTimeout(stepVisited, speedDelay);
                    activeTimeouts.push(tid);
                }
                stepVisited();
            }
        }).catch(err => {
            console.error('Solve failed:', err);
            alert('Pathfinding solve request failed.');
            finishRun();
        });

    } else {
        // --- SIDE-BY-SIDE COMPARISON PIPELINE ---
        const algBVal = algSecondary.value;
        const heurB = heuristicSecondary.value;

        const payloadA = { ...payload, algorithm: algAVal, heuristic: heurA };
        const payloadB = { ...payload, algorithm: algBVal, heuristic: heurB };

        Promise.all([
            fetch('/api/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadA) }),
            fetch('/api/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadB) })
        ]).then(async ([respA, respB]) => {
            if (!respA.ok || !respB.ok) throw new Error('API request failed');
            const resA = await respA.json();
            const resB = await respB.json();
            
            // Set static stats
            statTimeA.innerText = `${resA.execution_time_ms.toFixed(2)}ms`;
            statFrontierA.innerText = resA.max_frontier_size;
            document.getElementById('stat-memory-a').innerText = resA.space_complexity_observed_nodes;
            document.getElementById('stat-branch-a').innerText = resA.avg_branching_factor;

            statTimeB.innerText = `${resB.execution_time_ms.toFixed(2)}ms`;
            statFrontierB.innerText = resB.max_frontier_size;
            document.getElementById('stat-memory-b').innerText = resB.space_complexity_observed_nodes;
            document.getElementById('stat-branch-b').innerText = resB.avg_branching_factor;

            if (speedDelay === 0) {
                // Instant comparison
                resA.visited.forEach(n => {
                    if (!isStartNode(n.y, n.x) && !isTargetNode(n.y, n.x)) {
                        const cell = document.getElementById(`a-${n.y}-${n.x}`);
                        if (cell) cell.classList.add('node-visited-a');
                    }
                });
                resB.visited.forEach(n => {
                    if (!isStartNode(n.y, n.x) && !isTargetNode(n.y, n.x)) {
                        const cell = document.getElementById(`b-${n.y}-${n.x}`);
                        if (cell) cell.classList.add('node-visited-b');
                    }
                });
                statVisitedA.innerText = resA.nodes_visited_count;
                statVisitedB.innerText = resB.nodes_visited_count;

                drawShortestPathSync('a', resA.path, resA.path_length);
                drawShortestPathSync('b', resB.path, resB.path_length);
                showBattleReport(resA.nodes_visited_count, resB.nodes_visited_count, resA.path, resB.path, resA.execution_time_ms, resB.execution_time_ms);
                finishRun();
            } else {
                // Step-by-step parallel animation
                let idxA = 0;
                let idxB = 0;
                let doneAnimA = false;
                let doneAnimB = false;

                function stepParallel() {
                    let ranStep = false;
                    if (!doneAnimA) {
                        if (idxA < resA.visited.length) {
                            ranStep = true;
                            const n = resA.visited[idxA];
                            if (!isStartNode(n.y, n.x) && !isTargetNode(n.y, n.x)) {
                                const cell = document.getElementById(`a-${n.y}-${n.x}`);
                                if (cell) cell.classList.add('node-visited-a');
                            }
                            statVisitedA.innerText = idxA + 1;
                            idxA++;
                        } else {
                            doneAnimA = true;
                        }
                    }

                    if (!doneAnimB) {
                        if (idxB < resB.visited.length) {
                            ranStep = true;
                            const n = resB.visited[idxB];
                            if (!isStartNode(n.y, n.x) && !isTargetNode(n.y, n.x)) {
                                const cell = document.getElementById(`b-${n.y}-${n.x}`);
                                if (cell) cell.classList.add('node-visited-b');
                            }
                            statVisitedB.innerText = idxB + 1;
                            idxB++;
                        } else {
                            doneAnimB = true;
                        }
                    }

                    if (ranStep) {
                        const tid = setTimeout(stepParallel, speedDelay);
                        activeTimeouts.push(tid);
                    } else {
                        // Both done, draw paths
                        let pathsDrawn = 0;
                        const onPathDrawn = () => {
                            pathsDrawn++;
                            if (pathsDrawn === 2 || (pathsDrawn === 1 && (!resA.path || !resB.path))) {
                                showBattleReport(resA.nodes_visited_count, resB.nodes_visited_count, resA.path, resB.path, resA.execution_time_ms, resB.execution_time_ms);
                                finishRun();
                            }
                        };

                        if (resA.path) drawShortestPathAsync('a', resA.path, resA.path_length, onPathDrawn);
                        else onPathDrawn();
                        
                        if (resB.path) drawShortestPathAsync('b', resB.path, resB.path_length, onPathDrawn);
                        else onPathDrawn();
                    }
                }
                stepParallel();
            }
        }).catch(err => {
            console.error('Error during solve:', err);
            alert('Failed to resolve pathfinding via backend.');
            finishRun();
        });
    }
}

/**
 * Animate drawing path cells sequentially.
 */
function drawShortestPathAsync(prefix, path, cost, callback) {
    if (!path || path.length === 0) {
        if (callback) callback();
        return;
    }

    let i = 0;
    const startStr = `${gridState.start[0]},${gridState.start[1]}`;
    const targetStr = `${gridState.target[0]},${gridState.target[1]}`;
    
    if (prefix === 'a') statCostA.innerText = cost;
    else statCostB.innerText = cost;

    function drawNext() {
        if (i >= path.length) {
            if (callback) callback();
            return;
        }

        const node = path[i];
        const r = node.y;
        const c = node.x;
        const coord = `${r},${c}`;
        
        if (coord !== startStr && coord !== targetStr) {
            const cell = document.getElementById(`${prefix}-${r}-${c}`);
            if (cell) cell.classList.add('node-shortest-path');
        }
        i++;
        const tid = setTimeout(drawNext, speedDelay * 1.5 + 5);
        activeTimeouts.push(tid);
    }
    drawNext();
}

/**
 * Instantly render path cells without delays.
 */
function drawShortestPathSync(prefix, path, cost) {
    if (!path) return;
    const startStr = `${gridState.start[0]},${gridState.start[1]}`;
    const targetStr = `${gridState.target[0]},${gridState.target[1]}`;
    
    if (prefix === 'a') statCostA.innerText = cost;
    else statCostB.innerText = cost;

    for (const node of path) {
        const r = node.y;
        const c = node.x;
        const coord = `${r},${c}`;
        if (coord !== startStr && coord !== targetStr) {
            const cell = document.getElementById(`${prefix}-${r}-${c}`);
            if (cell) cell.classList.add('node-shortest-path');
        }
    }
}

function finishRun() {
    isRunning = false;
    toggleControls(false);
}

function toggleControls(disable) {
    btnVisualize.disabled = disable;
    btnBenchmark.disabled = disable;
    btnClearPath.disabled = disable;
    btnClearWalls.disabled = disable;
    btnGenerateMaze.disabled = disable;
    modeSingle.disabled = disable;
    modeComparison.disabled = disable;
}

// ==========================================
// 7. COMPARISON HUD GENERATOR
// ==========================================

function showBattleReport(nodesA, nodesB, pathA, pathB, timeA, timeB) {
    comparisonHud.classList.remove('hidden');

    const nameA = algPrimary.options[algPrimary.selectedIndex].text;
    const nameB = algSecondary.options[algSecondary.selectedIndex].text;

    // 1. Efficiency comparison
    const nodeValEl = document.getElementById('hud-val-nodes');
    const nodeDetailEl = document.getElementById('hud-detail-nodes');

    if (nodesA < nodesB) {
        const diff = nodesB - nodesA;
        const pct = Math.round((diff / nodesB) * 100);
        nodeValEl.innerText = `${nameA} is ${pct}% more efficient!`;
        nodeDetailEl.innerText = `Grid A (${nameA}) explored ${nodesA} nodes vs Grid B (${nameB}) ${nodesB} nodes.`;
    } else if (nodesB < nodesA) {
        const diff = nodesA - nodesB;
        const pct = Math.round((diff / nodesA) * 100);
        nodeValEl.innerText = `${nameB} is ${pct}% more efficient!`;
        nodeDetailEl.innerText = `Grid B (${nameB}) explored ${nodesB} nodes vs Grid A (${nameA}) ${nodesA} nodes.`;
    } else {
        nodeValEl.innerText = `Both explored same volume of nodes`;
        nodeDetailEl.innerText = `Both algorithms visited exactly ${nodesA} nodes.`;
    }

    // 2. Shortest path cost comparison
    const costValEl = document.getElementById('hud-val-cost');
    const costDetailEl = document.getElementById('hud-detail-cost');

    const costA = pathA ? getPathCost(pathA) : Infinity;
    const costB = pathB ? getPathCost(pathB) : Infinity;

    if (costA === Infinity && costB === Infinity) {
        costValEl.innerText = "No path found by either!";
        costDetailEl.innerText = "Target node is completely enclosed/blocked.";
    } else if (costA < costB) {
        costValEl.innerText = `${nameA} found a shorter path!`;
        costDetailEl.innerText = `Shortest cost: Grid A (${nameA}) = ${costA} vs Grid B (${nameB}) = ${costB}.`;
    } else if (costB < costA) {
        costValEl.innerText = `${nameB} found a shorter path!`;
        costDetailEl.innerText = `Shortest cost: Grid B (${nameB}) = ${costB} vs Grid A (${nameA}) = ${costA}.`;
    } else {
        costValEl.innerText = `Both found the optimal path`;
        costDetailEl.innerText = `Path distance cost: ${costA}.`;
    }
}

/**
 * Calculate the cost of a path based on grid weights.
 */
function getPathCost(path) {
    if (!path || path.length <= 1) return 0;
    let cost = 0;
    for (let i = 1; i < path.length; i++) {
        const node = path[i];
        const coord = `${node.y},${node.x}`;
        cost += gridState.weights.has(coord) ? 5 : 1;
    }
    return cost;
}

// ==========================================
// 8. MAZE GENERATION ANIMATOR
// ==========================================

function startMazeGeneration() {
    if (isRunning) return;
    clearPaths();
    isRunning = true;
    toggleControls(true);

    const mazeType = mazeAlg.value;

    fetch('/api/generate-maze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            width: COLS,
            height: ROWS,
            algorithm: mazeType
        })
    }).then(async r => {
        if (!r.ok) throw new Error('Maze generation failed');
        const res = await r.json();

        // Set entire grid to walls
        gridState.walls.clear();
        gridState.weights.clear();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                gridState.walls.add(`${r},${c}`);
            }
        }
        syncGridVisuals();

        if (speedDelay === 0) {
            // Instant carving
            res.paths.forEach(p => {
                gridState.walls.delete(`${p.y},${p.x}`);
            });
            gridState.walls.delete(`${gridState.start[0]},${gridState.start[1]}`);
            gridState.walls.delete(`${gridState.target[0]},${gridState.target[1]}`);
            syncGridVisuals();
            finishRun();
        } else {
            // Step-by-step carving animation
            let idx = 0;
            const carveSpeed = Math.max(5, speedDelay * 0.25);
            function stepCarve() {
                if (idx >= res.paths.length) {
                    gridState.walls.delete(`${gridState.start[0]},${gridState.start[1]}`);
                    gridState.walls.delete(`${gridState.target[0]},${gridState.target[1]}`);
                    syncGridVisuals();
                    finishRun();
                    return;
                }
                const p = res.paths[idx];
                gridState.walls.delete(`${p.y},${p.x}`);
                
                const cellA = document.getElementById(`a-${p.y}-${p.x}`);
                const cellB = document.getElementById(`b-${p.y}-${p.x}`);
                if (cellA) cellA.classList.remove('node-wall');
                if (cellB) cellB.classList.remove('node-wall');

                idx++;
                const tid = setTimeout(stepCarve, carveSpeed);
                activeTimeouts.push(tid);
            }
            stepCarve();
        }
    }).catch(e => {
        console.error('Maze generation error:', e);
        alert('Failed to generate maze.');
        finishRun();
    });
}

function applyMazeGrid(matrix) {
    gridState.walls.clear();
    gridState.weights.clear();

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (matrix[r][c] === 1) {
                gridState.walls.add(`${r},${c}`);
            }
        }
    }
    syncGridVisuals();
}

// ==========================================
// 9. DATABASE API LAYOUT PERSISTENCE
// ==========================================

async function loadSavedMazes() {
    try {
        const response = await fetch('/api/mazes');
        if (!response.ok) throw new Error('API fetch failed');
        const list = await response.json();
        
        savedMazesList.innerHTML = '';
        if (list.length === 0) {
            savedMazesList.innerHTML = '<li class="empty-list-msg">No saved layouts.</li>';
            return;
        }

        list.forEach(maze => {
            const li = document.createElement('li');
            li.className = 'saved-item';
            li.innerHTML = `
                <span title="${maze.name}">${maze.name}</span>
                <div class="saved-actions">
                    <button class="btn btn-secondary btn-small btn-load" data-id="${maze.id}">Load</button>
                    <button class="btn btn-danger btn-small btn-delete" data-id="${maze.id}">Del</button>
                </div>
            `;
            
            li.querySelector('.btn-load').addEventListener('click', () => loadLayoutConfig(maze));
            li.querySelector('.btn-delete').addEventListener('click', () => deleteLayoutConfig(maze.id));
            
            savedMazesList.appendChild(li);
        });
    } catch (e) {
        console.error('Failed to load saved configurations:', e);
        savedMazesList.innerHTML = '<li class="empty-list-msg">Failed to contact API.</li>';
    }
}

async function saveLayout() {
    const name = mazeNameInput.value.trim();
    if (!name) {
        alert("Please enter a layout name!");
        return;
    }

    const start = gridState.start;
    const target = gridState.target;
    
    // Transform Sets and Maps into Arrays for transmission
    const wallsArray = Array.from(gridState.walls).map(coord => coord.split(',').map(Number));
    const weightsArray = Array.from(gridState.weights.entries()).map(([coord, w]) => {
        const [r, c] = coord.split(',').map(Number);
        return [r, c, w];
    });

    const payload = {
        name,
        grid_width: COLS,
        grid_height: ROWS,
        start_node: start,
        target_node: target,
        walls: wallsArray,
        weights: weightsArray
    };

    try {
        const response = await fetch('/api/mazes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API save failed');
        
        mazeNameInput.value = '';
        loadSavedMazes();
    } catch (e) {
        console.error('Failed to save layout:', e);
        alert('Failed to save layout to server.');
    }
}

function loadLayoutConfig(maze) {
    if (isRunning) return;
    clearPaths();

    gridState.start = maze.start_node;
    gridState.target = maze.target_node;
    
    gridState.walls.clear();
    maze.walls.forEach(([r, c]) => gridState.walls.add(`${r},${c}`));

    gridState.weights.clear();
    maze.weights.forEach(([r, c, w]) => gridState.weights.set(`${r},${c}`, w));

    syncGridVisuals();
}

async function deleteLayoutConfig(id) {
    if (isRunning) return;
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
        const response = await fetch(`/api/mazes/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('API delete failed');
        loadSavedMazes();
    } catch (e) {
        console.error('Failed to delete layout:', e);
        alert('Failed to delete layout.');
    }
}

// ==========================================
// 10. MULTI-ALGORITHM BENCHMARK BOARD
// ==========================================

async function runAllAlgorithmsBenchmark() {
    if (isRunning) return;
    clearPaths();
    isRunning = true;
    toggleControls(true);

    const wallsArray = Array.from(gridState.walls).map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return { x: c, y: r };
    });
    const weightsArray = Array.from(gridState.weights.keys()).map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return { x: c, y: r };
    });

    const basePayload = {
        width: COLS,
        height: ROWS,
        start: { x: gridState.start[1], y: gridState.start[0] },
        end: { x: gridState.target[1], y: gridState.target[0] },
        walls: wallsArray,
        weights: weightsArray,
        heuristic: heuristicPrimary.value
    };

    const benchmarkList = [
        { id: 'astar', name: `A* Search (${heuristicPrimary.options[heuristicPrimary.selectedIndex].text})` },
        { id: 'gbfs', name: `Greedy Best-First (${heuristicPrimary.options[heuristicPrimary.selectedIndex].text})` },
        { id: 'dijkstra', name: "Dijkstra's Algorithm" },
        { id: 'bfs', name: "Breadth-First Search (BFS)" },
        { id: 'dfs', name: "Depth-First Search (DFS)" },
        { id: 'bidirectional_bfs', name: "Bidirectional BFS" }
    ];

    try {
        const promises = benchmarkList.map(alg => {
            const payload = { ...basePayload, algorithm: alg.id };
            return fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async r => {
                if (!r.ok) throw new Error(`Failed to solve for ${alg.id}`);
                const data = await r.json();
                return {
                    id: alg.id,
                    name: alg.name,
                    time: data.execution_time_ms.toFixed(2) + ' ms',
                    nodes: data.nodes_visited_count,
                    cost: data.path ? data.path_length : 'Unreachable',
                    frontier: data.max_frontier_size,
                    observedNodes: data.space_complexity_observed_nodes,
                    branchFactor: data.avg_branching_factor,
                    rawCost: data.path ? data.path_length : Infinity,
                    rawNodes: data.nodes_visited_count,
                    rawTime: data.execution_time_ms
                };
            });
        });

        const results = await Promise.all(promises);

        // Determine the optimal winner algorithm
        let winner = null;
        let minCost = Infinity;
        let minNodes = Infinity;
        let minTime = Infinity;

        results.forEach(res => {
            if (res.rawCost === Infinity) return;
            
            let isBetter = false;
            if (res.rawCost < minCost) {
                isBetter = true;
            } else if (res.rawCost === minCost) {
                if (res.rawNodes < minNodes) {
                    isBetter = true;
                } else if (res.rawNodes === minNodes) {
                    if (res.rawTime < minTime) {
                        isBetter = true;
                    }
                }
            }

            if (isBetter) {
                winner = res.id;
                minCost = res.rawCost;
                minNodes = res.rawNodes;
                minTime = res.rawTime;
            }
        });

        // Populate comparison HUD table
        benchmarkTableBody.innerHTML = '';
        results.forEach(res => {
            const tr = document.createElement('tr');
            if (res.id === winner) {
                tr.className = 'highlight-winner';
            }
            tr.innerHTML = `
                <td style="padding: 10px 14px;">${res.name} ${res.id === winner ? '👑' : ''}</td>
                <td style="padding: 10px 14px; font-weight: 600;">${res.time}</td>
                <td style="padding: 10px 14px;">${res.nodes}</td>
                <td style="padding: 10px 14px; font-weight: 600;">${res.cost}</td>
                <td style="padding: 10px 14px;">${res.frontier}</td>
                <td style="padding: 10px 14px;">${res.observedNodes}</td>
                <td style="padding: 10px 14px;">${res.branchFactor}</td>
            `;
            benchmarkTableBody.appendChild(tr);
        });

        // Force show battle report HUD
        comparisonHud.classList.remove('hidden');
        
        // Customize HUD headers for Leaderboard focus
        document.getElementById('hud-val-nodes').innerText = "Leaderboard Calculation Completed!";
        document.getElementById('hud-detail-nodes').innerText = `Best Algorithm is ${results.find(r => r.id === winner)?.name || 'None'}.`;
        document.getElementById('hud-val-cost').innerText = `Winner path cost: ${minCost === Infinity ? 'Unreachable' : minCost}`;
        document.getElementById('hud-detail-cost').innerText = `Optimal search path found under ${minTime.toFixed(2)} ms.`;

        finishRun();

    } catch (e) {
        console.error('Benchmark run failed:', e);
        alert('Benchmark execution failed.');
        finishRun();
    }
}

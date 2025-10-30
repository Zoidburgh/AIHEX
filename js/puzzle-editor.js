// ============================================================================
// HEXUKI PUZZLE EDITOR - Core Functionality
// ============================================================================

// Editor State
let editorBoard = new Array(19).fill(null);  // Hex values (null or 1-9)
let p1Tiles = [1,2,3,4,5,6,7,8,9];
let p2Tiles = [1,2,3,4,5,6,7,8,9];
let startingPlayer = 1;
let selectedTile = null;
let wasmModule = null;

// Set initial board state: center tile = 1 (makes puzzle valid with 9 tiles each)
editorBoard[9] = 1;  // hex 10 (center) gets tile 1

// Initialize Editor
async function initEditor() {
    console.log('🎨 Initializing Puzzle Editor...');

    // Load WASM engine
    try {
        wasmModule = await HexukiWasm();
        wasmModule.initialize();
        console.log('✓ WASM engine loaded');
    } catch (err) {
        console.error('Failed to load WASM:', err);
        console.log('Editor will work but AI testing will be unavailable');
    }

    // Create hex board
    createHexBoard();

    // Set up event listeners
    setupTilePalette();
    setupPlayerTileEditors();
    setupSaveLoad();
    setupTesting();
    setupPlayMode();

    // Initial state - display the starting board
    updateBoardDisplay();
    updateTileCounts();
    updateBoardStats();
    updatePositionString();
    validatePuzzle();

    console.log('✅ Editor initialized and ready!');
}

// ============================================================================
// HEX BOARD CREATION (copied from visualizer for seamless rendering)
// ============================================================================

function createHexBoard() {
    const svg = document.getElementById('board');
    svg.innerHTML = '';  // Clear

    const hexSize = 45;  // Increased from 35 for larger board
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;
    const centerX = 225;
    const centerY = 250;

    // Hex positions (exact layout from visualizer, converted from 0-18 to 1-19)
    const hexPositions = [
        {id: 1, x: centerX, y: centerY - hexHeight * 2},                      // viz id:0
        {id: 2, x: centerX - hexWidth * 0.75, y: centerY - hexHeight * 1.5},  // viz id:1
        {id: 3, x: centerX + hexWidth * 0.75, y: centerY - hexHeight * 1.5},  // viz id:2
        {id: 4, x: centerX - hexWidth * 1.5, y: centerY - hexHeight},         // viz id:3
        {id: 5, x: centerX, y: centerY - hexHeight},                          // viz id:4 (MISSING!)
        {id: 6, x: centerX + hexWidth * 1.5, y: centerY - hexHeight},         // viz id:5
        {id: 7, x: centerX - hexWidth * 0.75, y: centerY - hexHeight * 0.5},  // viz id:6
        {id: 8, x: centerX + hexWidth * 0.75, y: centerY - hexHeight * 0.5},  // viz id:7
        {id: 9, x: centerX - hexWidth * 1.5, y: centerY},                     // viz id:8
        {id: 10, x: centerX, y: centerY},                                     // viz id:9 (center)
        {id: 11, x: centerX + hexWidth * 1.5, y: centerY},                    // viz id:10
        {id: 12, x: centerX - hexWidth * 0.75, y: centerY + hexHeight * 0.5}, // viz id:11
        {id: 13, x: centerX + hexWidth * 0.75, y: centerY + hexHeight * 0.5}, // viz id:12
        {id: 14, x: centerX - hexWidth * 1.5, y: centerY + hexHeight},        // viz id:13
        {id: 15, x: centerX, y: centerY + hexHeight},                         // viz id:14
        {id: 16, x: centerX + hexWidth * 1.5, y: centerY + hexHeight},        // viz id:15
        {id: 17, x: centerX - hexWidth * 0.75, y: centerY + hexHeight * 1.5}, // viz id:16
        {id: 18, x: centerX + hexWidth * 0.75, y: centerY + hexHeight * 1.5}, // viz id:17
        {id: 19, x: centerX, y: centerY + hexHeight * 2}                      // viz id:18
    ];

    hexPositions.forEach(pos => {
        const x = pos.x;
        const y = pos.y;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'hex empty');
        g.setAttribute('data-hex-id', pos.id);

        // Add click listener for hex
        g.addEventListener('click', () => onHexClick(pos.id));

        // Add right-click listener to clear hex
        g.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            onHexRightClick(pos.id);
        });

        // Hexagon points (using polygon like visualizer)
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = x + hexSize * Math.cos(angle);
            const py = y + hexSize * Math.sin(angle);
            points.push(`${px},${py}`);
        }

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        polygon.setAttribute('fill', '#ecf0f1');
        polygon.setAttribute('stroke', '#2c3e50');
        polygon.setAttribute('stroke-width', '2');
        g.appendChild(polygon);

        // Hex ID
        const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        idText.setAttribute('x', x);
        idText.setAttribute('y', y - 15);
        idText.setAttribute('text-anchor', 'middle');
        idText.setAttribute('class', 'hex-id');
        idText.setAttribute('font-size', '10');
        idText.setAttribute('fill', '#7f8c8d');
        idText.textContent = pos.id;
        g.appendChild(idText);

        // Tile value (initially empty)
        const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueText.setAttribute('x', x);
        valueText.setAttribute('y', y + 5);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('class', 'hex-text');
        valueText.textContent = '';
        g.appendChild(valueText);

        svg.appendChild(g);
    });

    console.log('✓ Hex board created with 19 hexes');
}

function onHexClick(hexId) {
    const hexIndex = hexId - 1;  // Convert to 0-indexed

    if (selectedTile === 0) {
        // Clear mode
        editorBoard[hexIndex] = null;
    } else if (selectedTile !== null) {
        // Place tile
        editorBoard[hexIndex] = selectedTile;
    }

    updateBoardDisplay();
    updateBoardStats();
    updatePositionString();
    validatePuzzle();
}

function onHexRightClick(hexId) {
    const hexIndex = hexId - 1;  // Convert to 0-indexed

    // Always clear on right-click
    editorBoard[hexIndex] = null;

    updateBoardDisplay();
    updateBoardStats();
    updatePositionString();
    validatePuzzle();
}

function updateBoardDisplay() {
    editorBoard.forEach((value, index) => {
        const hexId = index + 1;
        const g = document.querySelector(`[data-hex-id="${hexId}"]`);
        if (!g) return;

        const polygon = g.querySelector('polygon');
        const valueText = g.querySelector('.hex-text');

        if (value !== null) {
            // Hex has a tile
            polygon.setAttribute('fill', '#4a5568');
            valueText.textContent = value;
            valueText.setAttribute('fill', 'white');
            valueText.setAttribute('font-size', '24');
            valueText.setAttribute('font-weight', '700');
        } else {
            // Empty hex
            polygon.setAttribute('fill', '#ecf0f1');
            valueText.textContent = '';
        }
    });
}

// ============================================================================
// TILE PALETTE
// ============================================================================

function setupTilePalette() {
    const palette = document.querySelector('.tile-palette');

    // Create tile buttons 0-9
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'tile-btn';
        btn.dataset.value = i;
        btn.textContent = i === 0 ? '❌' : i;

        btn.addEventListener('click', () => {
            // Update selection
            document.querySelectorAll('.tile-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTile = i;

            // Update display
            const displayText = i === 0 ? 'Clear (❌)' : `Tile ${i}`;
            document.getElementById('selectedTileDisplay').textContent = displayText;
        });

        palette.appendChild(btn);
    }

    // Select tile 1 by default
    document.querySelector('.tile-btn[data-value="1"]').click();
}

// ============================================================================
// PLAYER TILE EDITORS
// ============================================================================

function setupPlayerTileEditors() {
    const p1Input = document.getElementById('p1TilesInput');
    const p2Input = document.getElementById('p2TilesInput');
    const p1EditBtn = document.getElementById('editP1Btn');
    const p2EditBtn = document.getElementById('editP2Btn');

    p1EditBtn.addEventListener('click', () => editPlayerTiles(1));
    p2EditBtn.addEventListener('click', () => editPlayerTiles(2));

    // Also allow direct editing in input
    p1Input.addEventListener('change', () => {
        p1Tiles = parseTileInput(p1Input.value);
        updateTileCounts();
        validatePuzzle();
    });

    p2Input.addEventListener('change', () => {
        p2Tiles = parseTileInput(p2Input.value);
        updateTileCounts();
        validatePuzzle();
    });
}

function editPlayerTiles(player) {
    const input = document.getElementById(`p${player}TilesInput`);
    const tiles = parseTileInput(input.value);

    if (player === 1) {
        p1Tiles = tiles;
    } else {
        p2Tiles = tiles;
    }

    updateTileCounts();
    updatePositionString();
    validatePuzzle();
}

function parseTileInput(str) {
    return str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 9);
}

function updateTileCounts() {
    document.getElementById('p1TileCount').textContent = p1Tiles.length;
    document.getElementById('p2TileCount').textContent = p2Tiles.length;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validatePuzzle() {
    const errors = [];

    // Count filled hexes
    const filledCount = editorBoard.filter(v => v !== null).length;
    const emptyCount = 19 - filledCount;

    // Calculate required tiles based on who starts
    let requiredP1, requiredP2;
    if (startingPlayer === 1) {
        requiredP1 = Math.ceil(emptyCount / 2);
        requiredP2 = Math.floor(emptyCount / 2);
    } else {
        requiredP2 = Math.ceil(emptyCount / 2);
        requiredP1 = Math.floor(emptyCount / 2);
    }

    // Validate tile counts
    if (p1Tiles.length !== requiredP1) {
        errors.push(`❌ P1 has ${p1Tiles.length} tiles but needs ${requiredP1} (${emptyCount} empty hexes, P${startingPlayer} starts)`);
    }

    if (p2Tiles.length !== requiredP2) {
        errors.push(`❌ P2 has ${p2Tiles.length} tiles but needs ${requiredP2} (${emptyCount} empty hexes, P${startingPlayer} starts)`);
    }

    // Display validation results
    const validationDiv = document.getElementById('validationMessages');

    if (errors.length === 0) {
        validationDiv.innerHTML = '<div class="validation-message" style="background: rgba(39, 174, 96, 0.2); border-left: 4px solid #27ae60; color: #27ae60;">✅ Puzzle is valid!</div>';
        document.getElementById('p1Validation').innerHTML = ' <span style="color: #27ae60;">✓</span>';
        document.getElementById('p2Validation').innerHTML = ' <span style="color: #27ae60;">✓</span>';
    } else {
        validationDiv.innerHTML = errors.map(err =>
            `<div class="validation-message" style="background: rgba(231, 76, 60, 0.2); border-left: 4px solid #e74c3c; color: #e74c3c;">${err}</div>`
        ).join('');

        if (p1Tiles.length !== requiredP1) {
            document.getElementById('p1Validation').innerHTML = ` <span style="color: #e74c3c;">✗ Need ${requiredP1}</span>`;
        } else {
            document.getElementById('p1Validation').innerHTML = ' <span style="color: #27ae60;">✓</span>';
        }

        if (p2Tiles.length !== requiredP2) {
            document.getElementById('p2Validation').innerHTML = ` <span style="color: #e74c3c;">✗ Need ${requiredP2}</span>`;
        } else {
            document.getElementById('p2Validation').innerHTML = ' <span style="color: #27ae60;">✓</span>';
        }
    }

    return errors.length === 0;
}

function updateBoardStats() {
    const filledCount = editorBoard.filter(v => v !== null).length;
    const emptyCount = 19 - filledCount;

    document.getElementById('filledCount').textContent = filledCount;
    document.getElementById('emptyCount').textContent = emptyCount;
}

// ============================================================================
// POSITION STRING
// ============================================================================

function updatePositionString() {
    const hexPlacements = [];

    for (let hexIndex = 0; hexIndex < 19; hexIndex++) {
        if (editorBoard[hexIndex] !== null) {
            hexPlacements.push(`h${hexIndex}:${editorBoard[hexIndex]}`);  // 0-indexed for copy/paste consistency
        }
    }

    const posStr = `${hexPlacements.join(',')}|p1:${p1Tiles.join(',')}|p2:${p2Tiles.join(',')}|turn:${startingPlayer}`;
    document.getElementById('positionString').value = posStr;
}

// Convert position string from 1-indexed (display) to 0-indexed (WASM engine)
function positionStringForWASM() {
    const hexPlacements = [];

    for (let hexIndex = 0; hexIndex < 19; hexIndex++) {
        if (editorBoard[hexIndex] !== null) {
            hexPlacements.push(`h${hexIndex}:${editorBoard[hexIndex]}`);  // 0-indexed for WASM
        }
    }

    const posStr = `${hexPlacements.join(',')}|p1:${p1Tiles.join(',')}|p2:${p2Tiles.join(',')}|turn:${startingPlayer}`;
    return posStr;
}

function loadFromPositionString(posStr) {
    try {
        const parts = posStr.split('|');

        // Clear board
        editorBoard.fill(null);

        // Parse hex placements
        if (parts[0]) {
            parts[0].split(',').forEach(placement => {
                const match = placement.match(/h(\d+):(\d+)/);
                if (match) {
                    const hexId = parseInt(match[1]);  // Already 0-indexed (h0-h18)
                    const value = parseInt(match[2]);
                    editorBoard[hexId] = value;  // No -1 needed, position string uses 0-indexed IDs
                }
            });
        }

        // Parse P1 tiles
        const p1Match = posStr.match(/p1:([0-9,]+)/);
        if (p1Match) {
            p1Tiles = p1Match[1].split(',').map(Number);
            document.getElementById('p1TilesInput').value = p1Tiles.join(',');
        }

        // Parse P2 tiles
        const p2Match = posStr.match(/p2:([0-9,]+)/);
        if (p2Match) {
            p2Tiles = p2Match[1].split(',').map(Number);
            document.getElementById('p2TilesInput').value = p2Tiles.join(',');
        }

        // Parse turn
        const turnMatch = posStr.match(/turn:(\d+)/);
        if (turnMatch) {
            startingPlayer = parseInt(turnMatch[1]);
            document.getElementById('startingPlayerSelect').value = startingPlayer;
        }

        updateBoardDisplay();
        updateTileCounts();
        updateBoardStats();
        validatePuzzle();

        console.log('✓ Position loaded successfully');
    } catch (err) {
        alert('Error parsing position string: ' + err.message);
    }
}

// ============================================================================
// SAVE/LOAD
// ============================================================================

function setupSaveLoad() {
    document.getElementById('newPuzzleBtn').addEventListener('click', newPuzzle);
    document.getElementById('savePuzzleBtn').addEventListener('click', savePuzzle);
    document.getElementById('exportBtn').addEventListener('click', exportPuzzle);
    document.getElementById('importBtn').addEventListener('click', importPuzzle);
    document.getElementById('copyPositionBtn').addEventListener('click', copyPositionString);
    document.getElementById('pastePositionBtn').addEventListener('click', pastePositionString);
    document.getElementById('browsePuzzlesBtn').addEventListener('click', openPuzzleBrowser);
    document.getElementById('closeBrowserBtn').addEventListener('click', closePuzzleBrowser);

    // Starting player change
    document.getElementById('startingPlayerSelect').addEventListener('change', (e) => {
        startingPlayer = parseInt(e.target.value);
        updatePositionString();
        validatePuzzle();
    });
}

function newPuzzle() {
    if (confirm('Create a new puzzle? Any unsaved changes will be lost.')) {
        // Reset to initial state
        editorBoard = new Array(19).fill(null);
        editorBoard[9] = 1;  // Center tile = 1
        p1Tiles = [1,2,3,4,5,6,7,8,9];
        p2Tiles = [1,2,3,4,5,6,7,8,9];
        startingPlayer = 1;

        document.getElementById('puzzleTitle').value = '';
        document.getElementById('puzzleDescription').value = '';
        document.getElementById('p1TilesInput').value = p1Tiles.join(',');
        document.getElementById('p2TilesInput').value = p2Tiles.join(',');
        document.getElementById('startingPlayerSelect').value = startingPlayer;

        updateBoardDisplay();
        updateTileCounts();
        updateBoardStats();
        updatePositionString();
        validatePuzzle();

        console.log('✓ New puzzle created');
    }
}

function savePuzzle() {
    if (!validatePuzzle()) {
        alert('❌ Cannot save: puzzle has validation errors!');
        return;
    }

    const puzzleData = {
        id: `custom_${Date.now()}`,
        title: document.getElementById('puzzleTitle').value || 'Untitled Puzzle',
        description: document.getElementById('puzzleDescription').value || '',
        position: document.getElementById('positionString').value,
        board: editorBoard,
        p1Tiles: p1Tiles,
        p2Tiles: p2Tiles,
        startingPlayer: startingPlayer,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const puzzles = JSON.parse(localStorage.getItem('hexuki_custom_puzzles') || '{}');
    puzzles[puzzleData.id] = puzzleData;
    localStorage.setItem('hexuki_custom_puzzles', JSON.stringify(puzzles));

    alert('✅ Puzzle saved successfully!');
    console.log('Saved puzzle:', puzzleData);
}

function exportPuzzle() {
    if (!validatePuzzle()) {
        alert('❌ Cannot export: puzzle has validation errors!');
        return;
    }

    const puzzleData = {
        title: document.getElementById('puzzleTitle').value || 'Untitled Puzzle',
        description: document.getElementById('puzzleDescription').value || '',
        position: document.getElementById('positionString').value,
        board: editorBoard,
        p1Tiles: p1Tiles,
        p2Tiles: p2Tiles,
        startingPlayer: startingPlayer,
        exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(puzzleData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hexuki_puzzle_${Date.now()}.json`;
    a.click();

    console.log('Exported puzzle:', puzzleData);
}

function importPuzzle() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const puzzleData = JSON.parse(event.target.result);

                // Load puzzle data
                document.getElementById('puzzleTitle').value = puzzleData.title || '';
                document.getElementById('puzzleDescription').value = puzzleData.description || '';

                editorBoard = puzzleData.board || new Array(19).fill(null);
                p1Tiles = puzzleData.p1Tiles || [];
                p2Tiles = puzzleData.p2Tiles || [];
                startingPlayer = puzzleData.startingPlayer || 1;

                document.getElementById('p1TilesInput').value = p1Tiles.join(',');
                document.getElementById('p2TilesInput').value = p2Tiles.join(',');
                document.getElementById('startingPlayerSelect').value = startingPlayer;

                updateBoardDisplay();
                updateTileCounts();
                updateBoardStats();
                updatePositionString();
                validatePuzzle();

                alert('✅ Puzzle imported successfully!');
            } catch (err) {
                alert('❌ Error importing puzzle: ' + err.message);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function copyPositionString() {
    const posStr = document.getElementById('positionString').value;
    navigator.clipboard.writeText(posStr);
    alert('📋 Position string copied to clipboard!');
}

function pastePositionString() {
    navigator.clipboard.readText().then(text => {
        loadFromPositionString(text);
    }).catch(err => {
        alert('❌ Could not read from clipboard');
    });
}

// ============================================================================
// PUZZLE BROWSER
// ============================================================================

function openPuzzleBrowser() {
    document.getElementById('puzzleBrowser').style.display = 'block';
    refreshPuzzleList();
}

function closePuzzleBrowser() {
    document.getElementById('puzzleBrowser').style.display = 'none';
}

function refreshPuzzleList() {
    const puzzles = JSON.parse(localStorage.getItem('hexuki_custom_puzzles') || '{}');
    const puzzleList = document.getElementById('puzzleList');

    // Check if there are any puzzles
    if (Object.keys(puzzles).length === 0) {
        puzzleList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No saved puzzles yet. Create and save a puzzle to see it here!</div>';
        return;
    }

    // Convert to array and sort by creation date (newest first)
    const puzzleArray = Object.entries(puzzles).map(([id, data]) => ({
        id,
        ...data
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Build HTML for puzzle list
    let html = '';
    puzzleArray.forEach(puzzle => {
        const date = new Date(puzzle.createdAt).toLocaleString();
        const emptyHexes = puzzle.board.filter(v => v === null).length;
        const filledHexes = 19 - emptyHexes;

        html += `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 5px 0; color: #fff;">${puzzle.title}</h3>
                        <p style="margin: 0 0 10px 0; color: #aaa; font-size: 14px;">${puzzle.description || 'No description'}</p>
                        <div style="font-size: 12px; color: #888;">
                            <div>📅 ${date}</div>
                            <div>🎯 ${filledHexes} filled, ${emptyHexes} empty | P${puzzle.startingPlayer} starts</div>
                            <div>🎲 P1: ${puzzle.p1Tiles.length} tiles | P2: ${puzzle.p2Tiles.length} tiles</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-left: 15px;">
                        <button class="btn btn-primary" onclick="loadSavedPuzzle('${puzzle.id}')" style="padding: 8px 15px;">📂 Load</button>
                        <button class="btn btn-secondary" onclick="deleteSavedPuzzle('${puzzle.id}')" style="padding: 8px 15px; background: #e74c3c;">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    });

    puzzleList.innerHTML = html;
}

// Make these functions globally accessible for onclick handlers
window.loadSavedPuzzle = function(puzzleId) {
    const puzzles = JSON.parse(localStorage.getItem('hexuki_custom_puzzles') || '{}');
    const puzzle = puzzles[puzzleId];

    if (!puzzle) {
        alert('❌ Puzzle not found!');
        return;
    }

    // Load puzzle data into editor
    document.getElementById('puzzleTitle').value = puzzle.title || '';
    document.getElementById('puzzleDescription').value = puzzle.description || '';

    editorBoard = puzzle.board || new Array(19).fill(null);
    p1Tiles = puzzle.p1Tiles || [];
    p2Tiles = puzzle.p2Tiles || [];
    startingPlayer = puzzle.startingPlayer || 1;

    document.getElementById('p1TilesInput').value = p1Tiles.join(',');
    document.getElementById('p2TilesInput').value = p2Tiles.join(',');
    document.getElementById('startingPlayerSelect').value = startingPlayer;

    updateBoardDisplay();
    updateTileCounts();
    updateBoardStats();
    updatePositionString();
    validatePuzzle();

    closePuzzleBrowser();

    console.log('✓ Loaded puzzle:', puzzle.title);
    alert(`✅ Loaded puzzle: ${puzzle.title}`);
};

window.deleteSavedPuzzle = function(puzzleId) {
    const puzzles = JSON.parse(localStorage.getItem('hexuki_custom_puzzles') || '{}');
    const puzzle = puzzles[puzzleId];

    if (!puzzle) {
        alert('❌ Puzzle not found!');
        return;
    }

    if (confirm(`Delete puzzle "${puzzle.title}"?\n\nThis cannot be undone!`)) {
        delete puzzles[puzzleId];
        localStorage.setItem('hexuki_custom_puzzles', JSON.stringify(puzzles));
        console.log('✓ Deleted puzzle:', puzzle.title);
        refreshPuzzleList();
    }
};

// ============================================================================
// AI TESTING
// ============================================================================

function setupTesting() {
    document.getElementById('aiMakeMoveBtn').addEventListener('click', aiMakeMove);
    document.getElementById('testMCTSBtn').addEventListener('click', testWithMCTS);
    document.getElementById('testMinimaxBtn').addEventListener('click', testWithMinimax);
    document.getElementById('autoPlayBtn').addEventListener('click', startAutoPlay);
}

// AI Make Move - uses threshold to decide between MCTS and minimax
async function aiMakeMove() {
    if (!playGame) {
        alert('❌ Start playing first!');
        return;
    }

    if (playGame.gameEnded) {
        alert('❌ Game is over!');
        return;
    }

    if (!wasmModule) {
        alert('❌ WASM engine not loaded');
        return;
    }

    try {
        // Count empty hexes
        const emptyHexes = playGame.board.filter(hex => hex.value === null).length;
        const minimaxThreshold = parseInt(document.getElementById('minimaxThreshold').value) || 10;

        // Decide which AI to use based on threshold
        if (emptyHexes <= minimaxThreshold) {
            console.log(`🤖 AI Make Move: ${emptyHexes} empty hexes ≤ ${minimaxThreshold} threshold → Using Minimax`);
            await runMinimaxMove();
        } else {
            console.log(`🤖 AI Make Move: ${emptyHexes} empty hexes > ${minimaxThreshold} threshold → Using MCTS`);
            await runMCTSMove();
        }
    } catch (err) {
        console.error('AI Make Move error:', err);
        alert('❌ Error making AI move: ' + err.message);
    }
}

// Convert current play game state to position string for WASM (0-indexed)
function getPlayGamePositionString() {
    if (!playGame) return '';

    const hexPlacements = [];

    // Get current board state from playGame
    playGame.board.forEach((hex, index) => {
        if (hex.value !== null) {
            hexPlacements.push(`h${index}:${hex.value}`);  // 0-indexed for WASM
        }
    });

    const posStr = `${hexPlacements.join(',')}|p1:${playGame.player1Tiles.join(',')}|p2:${playGame.player2Tiles.join(',')}|turn:${playGame.currentPlayer}`;
    return posStr;
}

async function testWithMCTS() {
    if (!playGame) {
        alert('❌ Start playing first!');
        return;
    }

    if (playGame.gameEnded) {
        alert('❌ Game is over!');
        return;
    }

    if (!wasmModule) {
        alert('❌ WASM engine not loaded');
        return;
    }

    try {
        const position = getPlayGamePositionString();
        const mctsSimulations = parseInt(document.getElementById('mctsSimulations').value) || 20000;

        // Console notification like visualizer
        console.log(`⚡ C++ WASM MCTS: running ${mctsSimulations.toLocaleString()} simulations...`);
        console.log(`📋 Position: ${position}`);

        wasmModule.loadPosition(position);
        const resultJson = wasmModule.mctsFindBestMove(mctsSimulations, 0, false, false, 10);
        const result = JSON.parse(resultJson);

        console.log(`📊 MCTS result:`, result);
        console.log(`   topMoves: ${result.topMoves ? result.topMoves.length : 'UNDEFINED'}`);

        // Log top 10 moves like visualizer
        if (result.topMoves && result.topMoves.length > 0) {
            console.log('=== C++ MCTS Top 10 Moves ===');
            result.topMoves.slice(0, 10).forEach((m, i) => {
                console.log(`  #${i+1}: H${m.hexId + 1}+${m.tileValue} | ${m.visits.toLocaleString()} visits | ${(m.winRate * 100).toFixed(1)}% win rate`);
            });
            console.log('==============================');
        }

        displayTestResults({
            engine: `MCTS (${(mctsSimulations/1000).toFixed(0)}k sims)`,
            bestMove: `H${result.hexId + 1}+${result.tileValue}`,
            winRate: (result.winRate * 100).toFixed(1) + '%',
            visits: result.visits.toLocaleString(),
            avgScore: result.avgScore !== undefined ? result.avgScore.toFixed(1) : 'N/A'
        });

        // Try to make the move, use alternatives if needed
        let moveMade = false;
        for (let i = 0; i < result.topMoves.length && !moveMade; i++) {
            const move = result.topMoves[i];
            const success = await executeBestMove(move.hexId, move.tileValue, i > 0);
            if (success) {
                moveMade = true;
                if (i > 0) {
                    console.log(`✅ Used alternative #${i+1} (top move blocked by anti-symmetry)`);
                }
            }
        }

        if (!moveMade) {
            alert('❌ All top MCTS moves failed! Try a different position or adjust tiles.');
        }

    } catch (err) {
        console.error('MCTS error:', err);
        alert('❌ Error running MCTS: ' + err.message);
    }
}

async function testWithMinimax() {
    if (!playGame) {
        alert('❌ Start playing first!');
        return;
    }

    if (playGame.gameEnded) {
        alert('❌ Game is over!');
        return;
    }

    if (!wasmModule) {
        alert('❌ WASM engine not loaded');
        return;
    }

    // Check if minimax is appropriate for this position
    const emptyHexes = playGame.board.filter(hex => hex.value === null).length;
    const minimaxThreshold = parseInt(document.getElementById('minimaxThreshold').value) || 10;

    if (emptyHexes > minimaxThreshold) {
        const proceed = confirm(`⚠️ Warning: ${emptyHexes} empty hexes exceeds minimax threshold (${minimaxThreshold}).\n\nMinimax may be slow or fail. Use MCTS instead?\n\nClick OK to run Minimax anyway, Cancel to stop.`);
        if (!proceed) {
            return;
        }
    }

    try {
        const position = getPlayGamePositionString();

        // Debug: Log the position string being sent
        console.log(`📋 Position string: ${position}`);
        console.log(`📊 Empty hexes: ${emptyHexes}, P1 tiles: ${playGame.player1Tiles.length}, P2 tiles: ${playGame.player2Tiles.length}`);

        // Console notification like visualizer
        const depth = emptyHexes; // Search to game end (no deeper than remaining moves)
        console.log(`⚡ C++ WASM Minimax: running depth ${depth} search...`);

        wasmModule.loadPosition(position);
        const resultJson = wasmModule.minimaxFindBestMove(depth, 120000);  // Dynamic depth, timeout=120000ms (2 minutes)
        const result = JSON.parse(resultJson);

        // Check for minimax failure (sentinel values)
        if (result.score === -1000000 || result.score === 1000000 || result.depth === 0) {
            console.error('❌ Minimax failed to search');
            console.error(`   Position: ${position}`);
            console.error(`   Result: depth=${result.depth}, score=${result.score}`);
            alert('❌ Minimax search failed!\n\nThis might be a puzzle validation issue.\nCheck console for position string.\n\nTry:\n- Use MCTS instead\n- Verify puzzle setup is valid');
            return;
        }

        // Log stats like visualizer
        console.log(`⚡ C++ WASM Minimax: depth=${result.depth}, nodes=${result.nodes || result.nodesExplored}, score=${result.score}, time=${result.timeMs?.toFixed(0)}ms`);

        // Get current scores
        const currentScores = playGame.calculateScores();

        // Minimax score is from current player's perspective (differential)
        const differentialFromP1 = playGame.currentPlayer === 1 ? result.score : -result.score;

        // Log prediction like visualizer
        console.log('=== MINIMAX PREDICTION (Perfect Play) ===');
        console.log(`Current Scores: P1: ${currentScores.player1} | P2: ${currentScores.player2}`);
        console.log(`EXACT Final Differential: ${differentialFromP1 > 0 ? 'P1 +' : 'P2 +'}${Math.abs(differentialFromP1)} points`);

        if (differentialFromP1 > 0) {
            console.log(`🏆 P1 WINS by exactly ${differentialFromP1} points (deterministic)`);
        } else if (differentialFromP1 < 0) {
            console.log(`🏆 P2 WINS by exactly ${Math.abs(differentialFromP1)} points (deterministic)`);
        } else {
            console.log(`🤝 EXACT DRAW (both players tie)`);
        }

        displayTestResults({
            engine: 'Minimax (depth 20)',
            bestMove: `H${result.hexId + 1}+${result.tileValue}`,
            score: result.score,
            nodesExplored: (result.nodes || result.nodesExplored) ? (result.nodes || result.nodesExplored).toLocaleString() : 'N/A'
        });

        // Try to make the move
        const success = await executeBestMove(result.hexId, result.tileValue);

        if (!success) {
            console.error('⚠️ C++ Minimax recommended an ILLEGAL move (anti-symmetry bug in C++ code)');
            console.error('   Falling back to MCTS...');

            // Fall back to MCTS which handles alternatives
            const mctsPosition = getPlayGamePositionString();
            const mctsSimulations = parseInt(document.getElementById('mctsSimulations').value) || 20000;

            wasmModule.loadPosition(mctsPosition);
            const mctsResultJson = wasmModule.mctsFindBestMove(mctsSimulations, 0, false, false, 10);
            const mctsResult = JSON.parse(mctsResultJson);

            console.log('=== C++ MCTS Top 10 Moves (Fallback) ===');
            mctsResult.topMoves.slice(0, 10).forEach((m, i) => {
                console.log(`  #${i+1}: H${m.hexId + 1}+${m.tileValue} | ${m.visits.toLocaleString()} visits | ${(m.winRate * 100).toFixed(1)}% win rate`);
            });
            console.log('==============================');

            // Try MCTS alternatives
            let moveMade = false;
            for (let i = 0; i < mctsResult.topMoves.length && !moveMade; i++) {
                const move = mctsResult.topMoves[i];
                const mctsSuccess = await executeBestMove(move.hexId, move.tileValue, i > 0);
                if (mctsSuccess) {
                    moveMade = true;
                    console.log(`✅ MCTS alternative #${i+1} succeeded`);
                }
            }

            if (!moveMade) {
                alert('❌ Both Minimax and MCTS failed! Position may have no legal moves.');
            }
        }

    } catch (err) {
        console.error('Minimax error:', err);
        alert('❌ Error running Minimax: ' + err.message);
    }
}

// Execute the AI's best move and handle auto-play
async function executeBestMove(hexId, tileValue, suppressLogging = false) {
    const hexIndex = hexId;  // WASM already uses 0-indexed

    // Make the move
    if (!suppressLogging) {
        console.log(`🤖 Executing AI move: H${hexId + 1}+${tileValue}`);
    }

    // Save move to history
    const currentPlayer = playGame.currentPlayer;

    const success = playGame.makeMove(hexIndex, tileValue);

    if (!success) {
        if (!suppressLogging) {
            console.warn(`⚠️ Move H${hexId + 1}+${tileValue} rejected (likely anti-symmetry rule)`);
        }
        return false;
    }

    // Add to move history
    moveHistory.push({
        hexIndex: hexIndex,
        tile: tileValue,
        player: currentPlayer
    });

    // Show undo button
    document.getElementById('undoMoveBtn').style.display = 'inline-block';

    // Update display
    updatePlayBoard();
    updatePlayDisplay();
    highlightValidMoves();

    if (playGame.gameEnded) {
        const scores = playGame.calculateScores();
        console.log(`🏁 Game Over! P1: ${scores.player1}, P2: ${scores.player2}`);
        if (scores.player1 > scores.player2) {
            console.log(`🏆 Player 1 Wins by ${scores.player1 - scores.player2} points!`);
        } else if (scores.player2 > scores.player1) {
            console.log(`🏆 Player 2 Wins by ${scores.player2 - scores.player1} points!`);
        } else {
            console.log(`🤝 Game is a Tie!`);
        }
    }

    return true;
}

async function startAutoPlay() {
    if (!playGame) {
        alert('❌ Start playing first!');
        return;
    }

    if (playGame.gameEnded) {
        alert('❌ Game is already over!');
        return;
    }

    console.log('🎮 Starting auto-play to end...');

    // Disable the button during auto-play
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const originalText = autoPlayBtn.textContent;
    autoPlayBtn.disabled = true;
    autoPlayBtn.textContent = '⏸️ Auto-playing...';

    try {
        // Keep playing until game ends
        while (!playGame.gameEnded) {
            // Safety check: if board is full, stop
            const emptyHexes = playGame.board.filter(hex => hex.value === null).length;
            if (emptyHexes === 0) {
                console.log('🏁 Board is full - Auto-play complete!');
                playGame.gameEnded = true;
                break;
            }

            await autoPlayNextMove();
            // Small delay for visual feedback
            await sleep(500);
        }

        if (!playGame.gameEnded) {
            // Shouldn't happen, but safety check
            console.log('🏁 Auto-play stopped');
        } else {
            console.log('🏁 Auto-play complete!');
        }
    } catch (err) {
        console.error('Auto-play stopped due to error:', err.message);
    } finally {
        // Re-enable button
        autoPlayBtn.disabled = false;
        autoPlayBtn.textContent = originalText;
    }
}

async function autoPlayNextMove() {
    if (playGame.gameEnded) return;

    // Count empty hexes
    const emptyHexes = playGame.board.filter(hex => hex.value === null).length;
    const minimaxThreshold = parseInt(document.getElementById('minimaxThreshold').value) || 10;

    // Decide which AI to use based on threshold
    if (emptyHexes <= minimaxThreshold) {
        console.log(`📊 ${emptyHexes} empty hexes ≤ ${minimaxThreshold} threshold → Using Minimax`);
        await runMinimaxMove();
    } else {
        console.log(`📊 ${emptyHexes} empty hexes > ${minimaxThreshold} threshold → Using MCTS`);
        await runMCTSMove();
    }
}

// Run MCTS and make move (without displaying test results)
async function runMCTSMove() {
    if (!wasmModule) return;

    const position = getPlayGamePositionString();
    const mctsSimulations = parseInt(document.getElementById('mctsSimulations').value) || 20000;

    console.log(`⚡ C++ WASM MCTS: running ${mctsSimulations.toLocaleString()} simulations...`);

    console.log(`📋 Loading position: ${position}`);
    wasmModule.loadPosition(position);
    const resultJson = wasmModule.mctsFindBestMove(mctsSimulations, 0, false, false, 10);
    const result = JSON.parse(resultJson);

    console.log(`📊 MCTS returned:`, result);
    console.log(`   topMoves count: ${result.topMoves ? result.topMoves.length : 'undefined'}`);

    // Log top 10 moves like visualizer
    if (result.topMoves && result.topMoves.length > 0) {
        console.log('=== C++ MCTS Top 10 Moves ===');
        result.topMoves.slice(0, 10).forEach((m, i) => {
            console.log(`  #${i+1}: H${m.hexId + 1}+${m.tileValue} | ${m.visits.toLocaleString()} visits | ${(m.winRate * 100).toFixed(1)}% win rate`);
        });
        console.log('==============================');
    }

    // Try the best move, if it fails try alternatives
    let moveMade = false;
    for (let i = 0; i < result.topMoves.length && !moveMade; i++) {
        const move = result.topMoves[i];
        const success = await executeBestMove(move.hexId, move.tileValue, i > 0);
        if (success) {
            moveMade = true;
            if (i > 0) {
                console.log(`✅ Used alternative #${i+1} after top ${i} failed (likely anti-symmetry)`);
            }
        }
    }

    if (!moveMade) {
        console.error('❌ All MCTS top moves failed! Game may be stuck.');
        throw new Error('No valid moves available');
    }
}

// Run Minimax and make move (without displaying test results)
async function runMinimaxMove() {
    if (!wasmModule) return;

    const position = getPlayGamePositionString();
    const emptyHexes = playGame.board.filter(hex => hex.value === null).length;
    const depth = emptyHexes; // Search to game end (no deeper than remaining moves)

    console.log(`⚡ C++ WASM Minimax: running depth ${depth} search...`);

    wasmModule.loadPosition(position);
    const resultJson = wasmModule.minimaxFindBestMove(depth, 120000);  // Dynamic depth, timeout=120000ms (2 minutes)
    const result = JSON.parse(resultJson);

    // Check for minimax failure
    if (result.score === -1000000 || result.score === 1000000 || result.depth === 0) {
        console.warn('⚠️ Minimax search failed - falling back to MCTS');
        await runMCTSMove();
        return;
    }

    console.log(`⚡ C++ WASM Minimax: depth=${result.depth}, nodes=${result.nodes || result.nodesExplored}, score=${result.score}, time=${result.timeMs?.toFixed(0)}ms`);

    // Get current scores and log prediction
    const currentScores = playGame.calculateScores();
    const differentialFromP1 = playGame.currentPlayer === 1 ? result.score : -result.score;

    console.log('=== MINIMAX PREDICTION (Perfect Play) ===');
    console.log(`Current Scores: P1: ${currentScores.player1} | P2: ${currentScores.player2}`);
    console.log(`EXACT Final Differential: ${differentialFromP1 > 0 ? 'P1 +' : 'P2 +'}${Math.abs(differentialFromP1)} points`);

    if (differentialFromP1 > 0) {
        console.log(`🏆 P1 WINS by exactly ${differentialFromP1} points (deterministic)`);
    } else if (differentialFromP1 < 0) {
        console.log(`🏆 P2 WINS by exactly ${Math.abs(differentialFromP1)} points (deterministic)`);
    } else {
        console.log(`🤝 EXACT DRAW (both players tie)`);
    }

    const success = await executeBestMove(result.hexId, result.tileValue);
    if (!success) {
        console.warn('⚠️ Minimax move rejected (likely anti-symmetry) - falling back to MCTS');
        await runMCTSMove();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function displayTestResults(results) {
    const resultsDiv = document.getElementById('testResults');

    let html = '<div style="background: rgba(102, 126, 234, 0.2); border-left: 4px solid #667eea; padding: 15px; border-radius: 6px; margin-top: 15px;">';
    html += `<h3 style="margin-top: 0; color: #667eea;">🤖 ${results.engine}</h3>`;
    html += `<div style="font-family: 'JetBrains Mono', monospace; font-size: 14px;">`;
    html += `<div><strong>Best Move:</strong> ${results.bestMove}</div>`;

    if (results.winRate) {
        html += `<div><strong>Win Rate:</strong> ${results.winRate}</div>`;
    }

    if (results.score !== undefined) {
        html += `<div><strong>Score:</strong> ${results.score}</div>`;
    }

    if (results.avgScore) {
        html += `<div><strong>Avg Score:</strong> ${results.avgScore}</div>`;
    }

    if (results.visits) {
        html += `<div><strong>Visits:</strong> ${results.visits}</div>`;
    }

    if (results.nodesExplored) {
        html += `<div><strong>Nodes:</strong> ${results.nodesExplored}</div>`;
    }

    html += '</div></div>';

    resultsDiv.innerHTML = html;
}

function playFromPosition() {
    const posStr = positionStringForWASM();  // Use 0-indexed format for visualizer
    const url = `opening_sequence_visualizer.html?position=${encodeURIComponent(posStr)}`;
    window.open(url, '_blank');
    console.log('Opening position in visualizer:', posStr);
}

// ============================================================================
// INTERACTIVE PLAY
// ============================================================================

let playGame = null;
let selectedPlayTile = null;
let moveHistory = [];  // Track moves for undo

function setupPlayMode() {
    document.getElementById('startPlayBtn').addEventListener('click', startPlaying);
    document.getElementById('resetPlayBtn').addEventListener('click', resetPlay);
    document.getElementById('undoMoveBtn').addEventListener('click', undoLastMove);
}

function startPlaying() {
    if (!validatePuzzle()) {
        alert('❌ Cannot start: puzzle has validation errors!');
        return;
    }

    // Create game using real Game engine
    playGame = new HexukiGameEngineAsymmetric();

    // Clear all hexes first (engine initializes center hex to 1 by default)
    playGame.board.forEach(hex => {
        hex.value = null;
        hex.owner = null;
    });

    // Set up board from puzzle
    editorBoard.forEach((value, index) => {
        if (value !== null) {
            playGame.board[index].value = value;
            playGame.board[index].owner = null; // Pre-placed tiles have no owner
        }
    });

    // Set player tiles
    playGame.player1Tiles = [...p1Tiles];
    playGame.player2Tiles = [...p2Tiles];
    playGame.currentPlayer = startingPlayer;

    // Calculate moveCount based on how many tiles have been used total
    // This is important for anti-symmetry rule to know if this is the final move
    const totalTilesUsed = (9 - playGame.player1Tiles.length) + (9 - playGame.player2Tiles.length);
    playGame.moveCount = totalTilesUsed;

    console.log(`Puzzle loaded: ${totalTilesUsed} tiles used total, moveCount = ${playGame.moveCount}`);

    selectedPlayTile = null;
    moveHistory = [];  // Reset move history

    // Show play area, AI testing section, and hide undo button
    document.getElementById('playArea').style.display = 'block';
    document.getElementById('aiTestingSection').style.display = 'block';
    document.getElementById('undoMoveBtn').style.display = 'none';

    // Draw game board
    drawPlayBoard();
    updatePlayDisplay();

    console.log('✓ Started playing puzzle with real game engine');
}

function resetPlay() {
    // Reset game state to initial puzzle (keep play area open)
    playGame = new HexukiGameEngineAsymmetric();

    // Clear all hexes first (engine initializes center hex to 1 by default)
    playGame.board.forEach(hex => {
        hex.value = null;
        hex.owner = null;
    });

    // Set up board from puzzle
    editorBoard.forEach((value, index) => {
        if (value !== null) {
            playGame.board[index].value = value;
            playGame.board[index].owner = null; // Pre-placed tiles have no owner
        }
    });

    // Set player tiles
    playGame.player1Tiles = [...p1Tiles];
    playGame.player2Tiles = [...p2Tiles];
    playGame.currentPlayer = startingPlayer;

    selectedPlayTile = null;
    moveHistory = [];

    // Hide undo button (no moves yet)
    document.getElementById('undoMoveBtn').style.display = 'none';

    // Redraw board with initial puzzle state
    updatePlayBoard();
    updatePlayDisplay();
    highlightValidMoves();

    console.log('✓ Reset to starting position');
}

function undoLastMove() {
    if (moveHistory.length === 0 || !playGame) {
        alert('No moves to undo!');
        return;
    }

    const lastMove = moveHistory.pop();

    // Restore the hex to empty
    playGame.board[lastMove.hexIndex].value = null;
    playGame.board[lastMove.hexIndex].owner = null;

    // Restore the tile to the player's hand
    if (lastMove.player === 1) {
        playGame.player1Tiles.push(lastMove.tile);
        playGame.player1Tiles.sort((a, b) => a - b);
    } else {
        playGame.player2Tiles.push(lastMove.tile);
        playGame.player2Tiles.sort((a, b) => a - b);
    }

    // Restore turn to previous player
    playGame.currentPlayer = lastMove.player;
    playGame.gameEnded = false;

    // Decrement move count (critical for game state)
    playGame.moveCount--;

    // Hide undo button if no more moves
    if (moveHistory.length === 0) {
        document.getElementById('undoMoveBtn').style.display = 'none';
    }

    updatePlayBoard();
    updatePlayDisplay();
    highlightValidMoves();

    console.log('✓ Undid move:', lastMove);
}

function drawPlayBoard() {
    const svg = document.getElementById('playBoard');
    svg.innerHTML = '';

    const hexSize = 45;
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;
    const centerX = 225;
    const centerY = 250;

    const hexPositions = [
        {id: 1, x: centerX, y: centerY - hexHeight * 2},
        {id: 2, x: centerX - hexWidth * 0.75, y: centerY - hexHeight * 1.5},
        {id: 3, x: centerX + hexWidth * 0.75, y: centerY - hexHeight * 1.5},
        {id: 4, x: centerX - hexWidth * 1.5, y: centerY - hexHeight},
        {id: 5, x: centerX, y: centerY - hexHeight},
        {id: 6, x: centerX + hexWidth * 1.5, y: centerY - hexHeight},
        {id: 7, x: centerX - hexWidth * 0.75, y: centerY - hexHeight * 0.5},
        {id: 8, x: centerX + hexWidth * 0.75, y: centerY - hexHeight * 0.5},
        {id: 9, x: centerX - hexWidth * 1.5, y: centerY},
        {id: 10, x: centerX, y: centerY},
        {id: 11, x: centerX + hexWidth * 1.5, y: centerY},
        {id: 12, x: centerX - hexWidth * 0.75, y: centerY + hexHeight * 0.5},
        {id: 13, x: centerX + hexWidth * 0.75, y: centerY + hexHeight * 0.5},
        {id: 14, x: centerX - hexWidth * 1.5, y: centerY + hexHeight},
        {id: 15, x: centerX, y: centerY + hexHeight},
        {id: 16, x: centerX + hexWidth * 1.5, y: centerY + hexHeight},
        {id: 17, x: centerX - hexWidth * 0.75, y: centerY + hexHeight * 1.5},
        {id: 18, x: centerX + hexWidth * 0.75, y: centerY + hexHeight * 1.5},
        {id: 19, x: centerX, y: centerY + hexHeight * 2}
    ];

    hexPositions.forEach(pos => {
        const x = pos.x;
        const y = pos.y;
        const hexIndex = pos.id - 1;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'play-hex');
        g.setAttribute('data-hex-id', pos.id);

        // Hexagon points
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = x + hexSize * Math.cos(angle);
            const py = y + hexSize * Math.sin(angle);
            points.push(`${px},${py}`);
        }

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        polygon.setAttribute('fill', '#ecf0f1');
        polygon.setAttribute('stroke', '#2c3e50');
        polygon.setAttribute('stroke-width', '2');
        g.appendChild(polygon);

        // Hex ID
        const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        idText.setAttribute('x', x);
        idText.setAttribute('y', y - 15);
        idText.setAttribute('text-anchor', 'middle');
        idText.setAttribute('font-size', '10');
        idText.setAttribute('fill', '#7f8c8d');
        idText.textContent = pos.id;
        g.appendChild(idText);

        // Tile value
        const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueText.setAttribute('x', x);
        valueText.setAttribute('y', y + 5);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('class', 'play-hex-text');
        valueText.textContent = '';
        g.appendChild(valueText);

        // Click handler for empty hexes
        if (playGame.board[hexIndex].value === null) {
            g.style.cursor = 'pointer';
            g.addEventListener('click', () => onPlayHexClick(pos.id));
        }

        svg.appendChild(g);
    });

    updatePlayBoard();
}

function onPlayHexClick(hexId) {
    if (playGame.gameEnded) {
        alert('Game is over!');
        return;
    }

    const hexIndex = hexId - 1;

    // Check if a tile is selected
    if (selectedPlayTile === null) {
        alert('Please select a tile first!');
        return;
    }

    // Save move to history before making it
    const currentPlayer = playGame.currentPlayer;

    // Try to make the move using the real game engine (validates automatically)
    const success = playGame.makeMove(hexIndex, selectedPlayTile);

    if (!success) {
        const errorMsg = playGame.lastError || 'Invalid move! This hex is already filled.';
        alert(errorMsg);
        return;
    }

    // Add to move history after successful move
    moveHistory.push({
        hexIndex: hexIndex,
        tile: selectedPlayTile,
        player: currentPlayer
    });

    // Show undo button now that we have moves
    document.getElementById('undoMoveBtn').style.display = 'inline-block';

    selectedPlayTile = null;

    updatePlayBoard();
    updatePlayDisplay();
    highlightValidMoves();  // Clear highlights

    if (playGame.gameEnded) {
        const scores = playGame.calculateScores();
        console.log(`🏁 Game Over! P1: ${scores.player1}, P2: ${scores.player2}`);
        if (scores.player1 > scores.player2) {
            console.log(`🏆 Player 1 Wins by ${scores.player1 - scores.player2} points!`);
        } else if (scores.player2 > scores.player1) {
            console.log(`🏆 Player 2 Wins by ${scores.player2 - scores.player1} points!`);
        } else {
            console.log(`🤝 Game is a Tie!`);
        }
    }
}

function updatePlayBoard() {
    playGame.board.forEach((hex, index) => {
        const hexId = index + 1;
        const g = document.querySelector(`#playBoard [data-hex-id="${hexId}"]`);
        if (!g) return;

        const polygon = g.querySelector('polygon');
        const valueText = g.querySelector('.play-hex-text');

        if (hex.value !== null) {
            // Color based on player ownership
            if (hex.owner === 'player1') {
                polygon.setAttribute('fill', '#e74c3c');  // Red for Player 1
            } else if (hex.owner === 'player2') {
                polygon.setAttribute('fill', '#3498db');  // Blue for Player 2
            } else {
                polygon.setAttribute('fill', '#4a5568');  // Gray for neutral (pre-placed)
            }
            valueText.textContent = hex.value;
            valueText.setAttribute('fill', 'white');
            valueText.setAttribute('font-size', '24');
            valueText.setAttribute('font-weight', '700');
            g.style.cursor = 'default';
        } else {
            polygon.setAttribute('fill', '#ecf0f1');
            valueText.textContent = '';
        }
    });
}

function highlightValidMoves() {
    // Clear all previous highlighting
    document.querySelectorAll('.play-hex').forEach(hex => {
        hex.classList.remove('valid-move');
    });

    // If no tile selected or game over, don't highlight anything
    if (!selectedPlayTile || !playGame || playGame.gameEnded) {
        return;
    }

    // Highlight only hexes where the move is actually legal
    playGame.board.forEach((hex, index) => {
        if (hex.value === null && playGame.isMoveLegal(index)) {
            const hexId = index + 1;
            const g = document.querySelector(`#playBoard [data-hex-id="${hexId}"]`);
            if (g) {
                g.classList.add('valid-move');
            }
        }
    });
}

function updatePlayDisplay() {
    // Update turn indicator
    const turnDiv = document.getElementById('currentTurn');
    if (playGame.gameEnded) {
        const scores = playGame.calculateScores();
        turnDiv.innerHTML = `<strong style="color: #ffd700;">Game Over!</strong>`;
        document.getElementById('gameScore').innerHTML = `P1: ${scores.player1} | P2: ${scores.player2} | Winner: ${scores.player1 > scores.player2 ? 'Player 1' : scores.player2 > scores.player1 ? 'Player 2' : 'Tie'}`;
    } else {
        turnDiv.innerHTML = `<strong style="color: ${playGame.currentPlayer === 1 ? '#3498db' : '#e74c3c'};">Player ${playGame.currentPlayer}'s Turn</strong>`;
        const scores = playGame.calculateScores();
        document.getElementById('gameScore').innerHTML = `P1: ${scores.player1} | P2: ${scores.player2}`;
    }

    // Update player tiles
    updatePlayerTileDisplay('p1PlayTiles', playGame.player1Tiles, 1);
    updatePlayerTileDisplay('p2PlayTiles', playGame.player2Tiles, 2);

    // Update position string display
    const posString = getPlayGamePositionString();
    const posStringElement = document.getElementById('playPositionString');
    if (posStringElement) {
        posStringElement.value = posString;
    }
}

function updatePlayerTileDisplay(elementId, tiles, player) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error('Container not found:', elementId);
        return;
    }

    container.innerHTML = '';

    tiles.forEach(tile => {
        const btn = document.createElement('button');
        btn.className = `play-tile-btn player${player}`;
        btn.textContent = tile;

        // Add selected class
        if (selectedPlayTile === tile && playGame.currentPlayer === player) {
            btn.classList.add('selected');
        }

        // Add disabled class if not current player's turn
        if (playGame.currentPlayer !== player || playGame.gameEnded) {
            btn.classList.add('disabled');
        }

        // Add click handler only for current player
        if (playGame.currentPlayer === player && !playGame.gameEnded) {
            btn.addEventListener('click', () => {
                selectedPlayTile = tile;
                updatePlayDisplay();
                highlightValidMoves();  // Show green outlines on valid hexes
            });
        }

        container.appendChild(btn);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start editor when page loads
window.addEventListener('DOMContentLoaded', initEditor);

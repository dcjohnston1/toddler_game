let gameMode = 'freeplay';

// Level 1 map: two horizontal walls dividing the grid into 3 chambers
// Wall 1 at row 11: cols 0-36 filled, gap at cols 37-40, cols 41-49 filled
// Wall 2 at row 38: cols 0-19 filled, gap at cols 20-22, cols 23-49 filled
const LEVEL_1_WALLS = (() => {
    const walls = [];
    for (let col = 0; col <= 36; col++) walls.push(11 * 50 + col);
    for (let col = 41; col <= 49; col++) walls.push(11 * 50 + col);
    for (let col = 0; col <= 19; col++) walls.push(38 * 50 + col);
    for (let col = 23; col <= 49; col++) walls.push(38 * 50 + col);
    return walls;
})();

let gameState = {
    cells: [],
    filledIndices: [],
    cIndex: -1,
    cellValues: {},
    highestIndices: [], // Now stores tetromino indices
    currentTetromino: null, // {shape, rotation, origin}
    gameOver: false,
    cWins: false
};

function isTouchingGreenTetromino(cIndex, greenIndices) {
    if (greenIndices.length === 0) return false;

    const cRow = Math.floor(cIndex / 50);
    const cCol = cIndex % 50;

    // Check if C is directly in the green tetromino
    if (greenIndices.includes(cIndex)) return true;

    // Check all 8 adjacent positions (including diagonals)
    for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
            if (dRow === 0 && dCol === 0) continue; // Skip center (C itself)

            const adjRow = cRow + dRow;
            const adjCol = cCol + dCol;

            if (adjRow >= 0 && adjRow < 50 && adjCol >= 0 && adjCol < 50) {
                const adjIndex = adjRow * 50 + adjCol;
                if (greenIndices.includes(adjIndex)) {
                    return true; // C is touching green tetromino
                }
            }
        }
    }

    return false; // C is not touching green tetromino
}

function getAdjacentIndices(index) {
    const row = Math.floor(index / 50);
    const col = index % 50;
    const adjacent = [];

    for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
            if (dRow === 0 && dCol === 0) continue;

            const newRow = row + dRow;
            const newCol = col + dCol;

            if (newRow >= 0 && newRow < 50 && newCol >= 0 && newCol < 50) {
                adjacent.push(newRow * 50 + newCol);
            }
        }
    }
    return adjacent;
}

// Tetromino definitions (relative positions from origin)
const TETROMINOES = {
    I: [
        [[0,0], [0,1], [0,2], [0,3]], // horizontal
        [[0,0], [1,0], [2,0], [3,0]], // vertical
        [[0,0], [0,1], [0,2], [0,3]], // horizontal (same)
        [[0,0], [1,0], [2,0], [3,0]]  // vertical (same)
    ],
    O: [
        [[0,0], [0,1], [1,0], [1,1]], // square (all rotations same)
        [[0,0], [0,1], [1,0], [1,1]],
        [[0,0], [0,1], [1,0], [1,1]],
        [[0,0], [0,1], [1,0], [1,1]]
    ],
    T: [
        [[1,0], [0,1], [1,1], [2,1]], // T up
        [[0,0], [0,1], [1,1], [0,2]], // T right
        [[0,0], [1,0], [2,0], [1,1]], // T down
        [[1,0], [0,1], [1,1], [1,2]]  // T left
    ],
    S: [
        [[1,0], [2,0], [0,1], [1,1]], // S horizontal
        [[0,0], [0,1], [1,1], [1,2]], // S vertical
        [[1,0], [2,0], [0,1], [1,1]], // S horizontal (same)
        [[0,0], [0,1], [1,1], [1,2]]  // S vertical (same)
    ],
    Z: [
        [[0,0], [1,0], [1,1], [2,1]], // Z horizontal
        [[1,0], [0,1], [1,1], [0,2]], // Z vertical
        [[0,0], [1,0], [1,1], [2,1]], // Z horizontal (same)
        [[1,0], [0,1], [1,1], [0,2]]  // Z vertical (same)
    ],
    J: [
        [[0,0], [0,1], [0,2], [1,2]], // J up
        [[0,0], [1,0], [2,0], [0,1]], // J right
        [[0,0], [1,0], [1,1], [1,2]], // J down
        [[2,0], [0,1], [1,1], [2,1]]  // J left
    ],
    L: [
        [[1,0], [1,1], [1,2], [0,2]], // L up
        [[0,0], [0,1], [1,1], [2,1]], // L right
        [[1,0], [0,0], [0,1], [0,2]], // L down
        [[0,0], [1,0], [2,0], [2,1]]  // L left
    ]
};

function getTetrominoIndices(originIndex, shape, rotation) {
    const originRow = Math.floor(originIndex / 50);
    const originCol = originIndex % 50;
    const pattern = TETROMINOES[shape][rotation];
    const indices = [];

    for (let [dRow, dCol] of pattern) {
        const newRow = originRow + dRow;
        const newCol = originCol + dCol;

        // Check bounds
        if (newRow >= 0 && newRow < 50 && newCol >= 0 && newCol < 50) {
            indices.push(newRow * 50 + newCol);
        } else {
            return []; // Invalid if any piece goes out of bounds
        }
    }

    return indices;
}

function isValidTetrominoMove(oldIndices, newIndices) {
    if (oldIndices.length === 0) return true; // First positioning

    // Get the required overlap count from slider
    const requiredOverlap = parseInt(document.getElementById('lockSlider').value);

    // Count overlapping cells
    let overlapCount = 0;
    for (let oldIndex of oldIndices) {
        if (newIndices.includes(oldIndex)) {
            overlapCount++;
        }
    }

    // Must share at least the required number of cells
    return overlapCount >= requiredOverlap;
}

function getAdjacentTetrominoPositions(currentIndices) {
    if (currentIndices.length === 0) return [];

    const adjacentPositions = [];

    // Try all shapes and rotations at nearby positions
    const shapes = Object.keys(TETROMINOES);

    // Get bounding box of current tetromino
    const currentRows = currentIndices.map(i => Math.floor(i / 50));
    const currentCols = currentIndices.map(i => i % 50);
    const minRow = Math.min(...currentRows);
    const maxRow = Math.max(...currentRows);
    const minCol = Math.min(...currentCols);
    const maxCol = Math.max(...currentCols);

    // Try positions in nearby area
    for (let row = Math.max(0, minRow - 2); row <= Math.min(47, maxRow + 2); row++) {
        for (let col = Math.max(0, minCol - 2); col <= Math.min(47, maxCol + 2); col++) {
            const originIndex = row * 50 + col;

            for (let shape of shapes) {
                for (let rotation = 0; rotation < 4; rotation++) {
                    const indices = getTetrominoIndices(originIndex, shape, rotation);

                    if (indices.length === 4 && isValidTetrominoMove(currentIndices, indices)) {
                        adjacentPositions.push({
                            indices,
                            shape,
                            rotation,
                            origin: originIndex
                        });
                    }
                }
            }
        }
    }

    return adjacentPositions;
}

function getCellValue(index, cellValues, filledIndices) {
    if (filledIndices.includes(index)) {
        return 0;
    }
    return cellValues[index] || 0;
}

function valueToGrayScale(value) {
    const scaledValue = Math.pow(value, 0.3);
    const grayValue = Math.round((1 - scaledValue) * 255);
    return `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
}

function calculateDistance(row1, col1, row2, col2) {
    const deltaRow = Math.abs(row1 - row2);
    const deltaCol = Math.abs(col1 - col2);
    return Math.sqrt(deltaRow * deltaRow + deltaCol * deltaCol);
}

function updateGameDisplay() {
    if (gameState.gameOver || gameState.cWins) {
        if (gameState.cWins) {
            document.getElementById('gameStatus').innerHTML = '<div class="game-win">Toddler Wins!</div>';
        } else {
            document.getElementById('gameStatus').innerHTML = '<div class="game-over">GAME OVER</div>';
        }
        return;
    } else {
        document.getElementById('gameStatus').innerHTML = '';
    }

    // Clear all cells
    for (let i = 0; i < 2500; i++) {
        gameState.cells[i].className = 'cell';
        gameState.cells[i].textContent = '';
        gameState.cells[i].style.backgroundColor = '#fff';
        gameState.cells[i].style.color = 'black';
    }

    // Set filled cells
    for (let index of gameState.filledIndices) {
        gameState.cells[index].classList.add('filled');
        if (gameMode === 'freeplay') {
            gameState.cells[index].textContent = '10';
        }
    }

    // Set C cell
    if (gameState.cIndex >= 0) {
        gameState.cells[gameState.cIndex].classList.add('letter');
        gameState.cells[gameState.cIndex].textContent = 'C';
    }

    // Calculate and display proximity values
    gameState.cellValues = {};
    for (let i = 0; i < 2500; i++) {
        if (!gameState.filledIndices.includes(i) && i !== gameState.cIndex) {
            const row = Math.floor(i / 50);
            const col = i % 50;
            let maxValue = 0;

            for (let filledIndex of gameState.filledIndices) {
                const filledRow = Math.floor(filledIndex / 50);
                const filledCol = filledIndex % 50;
                const distance = calculateDistance(row, col, filledRow, filledCol);
                const value = 1 / distance;
                maxValue = Math.max(maxValue, value);
            }

            if (maxValue > 0 && gameState.cIndex >= 0) {
                const cRow = Math.floor(gameState.cIndex / 50);
                const cCol = gameState.cIndex % 50;
                const distanceToC = calculateDistance(row, col, cRow, cCol);

                // New formula: (1/distance_to_C) + (1/distance_to_filled_cell) * field_strength
                const fieldStrength = parseFloat(document.getElementById('fieldSlider').value);

                if (distanceToC > 0) {
                    maxValue = (1 / distanceToC) + (maxValue * fieldStrength);
                }
            }

            if (maxValue > 0) {
                gameState.cellValues[i] = maxValue;
                // Only show values for larger cells, hide text for tiny cells
                if (window.innerWidth > 600) {
                    gameState.cells[i].textContent = maxValue.toFixed(1);
                }
                gameState.cells[i].classList.add('proximity');

                const backgroundColor = valueToGrayScale(maxValue);
                const scaledValue = Math.pow(maxValue, 0.3);
                const textColor = scaledValue > 0.6 ? 'white' : 'black';

                gameState.cells[i].style.backgroundColor = backgroundColor;
                gameState.cells[i].style.color = textColor;
            }
        }
    }

    // Find highest average tetromino (with movement constraint)
    let highestAverage = -1;
    let bestTetromino = null;

    // Get possible positions (either first time or adjacent to current)
    let candidatePositions = [];
    if (gameState.highestIndices.length === 0) {
        // First time - check all possible tetromino positions
        const shapes = Object.keys(TETROMINOES);
        for (let row = 0; row < 48; row++) {
            for (let col = 0; col < 48; col++) {
                const originIndex = row * 50 + col;
                for (let shape of shapes) {
                    for (let rotation = 0; rotation < 4; rotation++) {
                        const indices = getTetrominoIndices(originIndex, shape, rotation);
                        if (indices.length === 4) {
                            candidatePositions.push({
                                indices,
                                shape,
                                rotation,
                                origin: originIndex
                            });
                        }
                    }
                }
            }
        }
    } else {
        // Subsequent times - only check adjacent positions
        candidatePositions = getAdjacentTetrominoPositions(gameState.highestIndices);
        // Also consider staying in the same position
        if (gameState.currentTetromino) {
            candidatePositions.push({
                indices: [...gameState.highestIndices],
                shape: gameState.currentTetromino.shape,
                rotation: gameState.currentTetromino.rotation,
                origin: gameState.currentTetromino.origin
            });
        }
    }

    for (let candidate of candidatePositions) {
        const { indices, shape, rotation, origin } = candidate;

        // Skip if any cell in tetromino is filled or is C
        let validTetromino = true;
        for (let index of indices) {
            if (gameState.filledIndices.includes(index) || index === gameState.cIndex) {
                validTetromino = false;
                break;
            }
        }
        if (!validTetromino) continue;

        // Calculate average for this tetromino
        let sum = 0;
        let availableCells = 0;

        for (let tetrominoIndex of indices) {
            const cellValue = getCellValue(tetrominoIndex, gameState.cellValues, gameState.filledIndices);
            sum += cellValue;
            availableCells++;

            // Add adjacent cells
            const adjacentIndices = getAdjacentIndices(tetrominoIndex);
            for (let adjIndex of adjacentIndices) {
                // Don't double-count cells that are part of the tetromino
                if (!indices.includes(adjIndex)) {
                    const adjValue = getCellValue(adjIndex, gameState.cellValues, gameState.filledIndices);
                    sum += adjValue;
                    if (adjValue > 0 || (!gameState.filledIndices.includes(adjIndex) && adjIndex !== gameState.cIndex)) {
                        availableCells++;
                    }
                }
            }
        }

        const average = availableCells > 0 ? sum / availableCells : 0;

        if (average > highestAverage) {
            highestAverage = average;
            bestTetromino = candidate;
        }
    }

    // Update the green tetromino position
    if (bestTetromino) {
        gameState.highestIndices = bestTetromino.indices;
        gameState.currentTetromino = {
            shape: bestTetromino.shape,
            rotation: bestTetromino.rotation,
            origin: bestTetromino.origin
        };
    }

    // Highlight the tetromino in green
    for (let index of gameState.highestIndices) {
        gameState.cells[index].classList.add('highest');
    }

    // In map mode, render the canvas minimap
    if (gameMode === 'map') drawMinimap();
}

function moveC(direction) {
    if (gameState.gameOver || gameState.cWins || gameState.cIndex < 0) return;

    const currentRow = Math.floor(gameState.cIndex / 50);
    const currentCol = gameState.cIndex % 50;
    let newRow = currentRow;
    let newCol = currentCol;

    switch(direction) {
        case 'up': newRow--; break;
        case 'down': newRow++; break;
        case 'left': newCol--; break;
        case 'right': newCol++; break;
    }

    // Check boundaries
    if (newRow < 0 || newRow >= 50 || newCol < 0 || newCol >= 50) {
        return; // Ignore move
    }

    const newIndex = newRow * 50 + newCol;

    // Check if moving into any of the green-circled cells
    if (gameState.highestIndices.includes(newIndex)) {
        return; // Block move
    }

    // Check if moving into a filled cell
    if (gameState.filledIndices.includes(newIndex)) {
        if (gameMode === 'map') {
            return; // Walls always block in map mode
        }
        // Free play: C wins by reaching a 10-spot not guarded by the tetromino
        const willBeTouching = isTouchingGreenTetromino(newIndex, gameState.highestIndices);
        if (!willBeTouching) {
            gameState.cIndex = newIndex;
            const index = gameState.filledIndices.indexOf(newIndex);
            if (index > -1) {
                gameState.filledIndices.splice(index, 1);
            }
            gameState.cWins = true;
            playCelebrationSound();
            updateGameDisplay();
            return;
        } else {
            return;
        }
    }

    // Valid move
    playMoveSound(direction);
    gameState.cIndex = newIndex;

    // Map mode win condition: toddler reaches the lower chamber (row >= 39)
    if (gameMode === 'map' && newRow >= 39) {
        gameState.cWins = true;
        playCelebrationSound();
        updateGameDisplay();
        return;
    }

    updateGameDisplay();
}

function updatePopulationDisplay() {
    const slider = document.getElementById('populationSlider');
    const display = document.getElementById('populationValue');
    display.textContent = slider.value;
}

function updateFieldDisplay() {
    const slider = document.getElementById('fieldSlider');
    const display = document.getElementById('fieldValue');
    display.textContent = slider.value;
}

function updateLockDisplay() {
    const slider = document.getElementById('lockSlider');
    const display = document.getElementById('lockValue');
    display.textContent = slider.value;
}

function updateDistanceDisplay() {
    const slider = document.getElementById('distanceSlider');
    const display = document.getElementById('distanceValue');
    display.textContent = slider.value;
}

function colLabel(col) {
    if (col < 26) return String.fromCharCode(65 + col);
    return 'A' + String.fromCharCode(65 + col - 26);
}

function drawMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const CELL = 10;
    const HEADER = 24;
    const W = HEADER + 50 * CELL;
    const H = HEADER + 50 * CELL;

    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, W, H);

    // Header background strip
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, W, HEADER);
    ctx.fillRect(0, 0, HEADER, H);

    // Column headers
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let col = 0; col < 50; col++) {
        ctx.fillText(colLabel(col), HEADER + col * CELL + CELL / 2, HEADER / 2);
    }

    // Row headers
    ctx.textAlign = 'right';
    for (let row = 0; row < 50; row++) {
        ctx.fillText(row + 1, HEADER - 2, HEADER + row * CELL + CELL / 2);
    }

    // Draw cells
    for (let row = 0; row < 50; row++) {
        for (let col = 0; col < 50; col++) {
            const index = row * 50 + col;
            const x = HEADER + col * CELL;
            const y = HEADER + row * CELL;

            if (gameState.filledIndices.includes(index)) {
                // Wall — solid black
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, CELL, CELL);
            } else if (index === gameState.cIndex) {
                // Toddler — blue with C label
                ctx.fillStyle = '#1a7be8';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('C', x + CELL / 2, y + CELL / 2);
            } else if (gameState.highestIndices.includes(index)) {
                // Tetromino — green
                ctx.fillStyle = '#00cc44';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.strokeStyle = '#009933';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, CELL, CELL);
            } else {
                // Win zone tint (lower chamber, row >= 39)
                ctx.fillStyle = row >= 39 ? '#1a3a1a' : '#1e1e1e';
                ctx.fillRect(x, y, CELL, CELL);
                // Subtle grid lines
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.3;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
            }
        }
    }

    // Win zone label
    if (!gameState.cWins && !gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 200, 80, 0.5)';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼ WIN ZONE ▼', HEADER + 25 * CELL, HEADER + 44 * CELL);
    }

    // Win/lose overlay
    if (gameState.cWins || gameState.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(HEADER, HEADER, 50 * CELL, 50 * CELL);
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gameState.cWins ? '#00ff88' : '#ff4444';
        ctx.fillText(gameState.cWins ? 'Toddler Wins! 🎉' : 'GAME OVER', HEADER + 25 * CELL, HEADER + 25 * CELL);
    }
}

function showModeSelector() {
    document.getElementById('splashOverlay').style.display = 'none';
    document.getElementById('modeOverlay').style.display = 'flex';
}

function startGame(mode) {
    gameMode = mode;
    document.getElementById('modeOverlay').style.display = 'none';
    // Toggle grid vs minimap canvas
    document.getElementById('gridContainer').style.display = mode === 'map' ? 'none' : '';
    document.getElementById('minimap').style.display = mode === 'map' ? 'block' : 'none';
    newGame();
}

function newGame() {
    gameState = {
        cells: [],
        filledIndices: [],
        cIndex: -1,
        cellValues: {},
        highestIndices: [],
        currentTetromino: null,
        gameOver: false,
        cWins: false
    };

    const gridContainer = document.getElementById('gridContainer');
    gridContainer.innerHTML = '';

    // Create 2500 cells (50x50)
    for (let i = 0; i < 2500; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.backgroundColor = '#fff';
        gameState.cells.push(cell);
        gridContainer.appendChild(cell);
    }

    if (gameMode === 'map') {
        // Level 1: place walls and set fixed starting positions
        for (let wallIndex of LEVEL_1_WALLS) {
            gameState.filledIndices.push(wallIndex);
        }

        // Toddler starts in center of middle chamber (rows 12-37)
        gameState.cIndex = 24 * 50 + 25; // row 24, col 25

        // Tetromino starts in upper chamber (rows 0-10)
        const tetrominoOrigin = 5 * 50 + 23; // row 5, col 23
        const tetrominoIndices = getTetrominoIndices(tetrominoOrigin, 'T', 0);
        gameState.highestIndices = tetrominoIndices;
        gameState.currentTetromino = { shape: 'T', rotation: 0, origin: tetrominoOrigin };

        updateGameDisplay();
    } else {
        // Free play mode: random population
        const populationPercent = parseInt(document.getElementById('populationSlider').value);
        const populationChance = populationPercent / 100;

        for (let i = 0; i < 2500; i++) {
            if (Math.random() < populationChance) {
                gameState.filledIndices.push(i);
            }
        }

        // Find unoccupied cells for C placement
        const unoccupiedIndices = [];
        for (let i = 0; i < 2500; i++) {
            if (!gameState.filledIndices.includes(i)) {
                unoccupiedIndices.push(i);
            }
        }

        // Place C randomly
        if (unoccupiedIndices.length > 0) {
            gameState.cIndex = unoccupiedIndices[Math.floor(Math.random() * unoccupiedIndices.length)];
        }

        // Calculate initial tetromino position based on distance slider
        const targetDistance = parseInt(document.getElementById('distanceSlider').value);

        // First, do initial display to establish tetromino position
        updateGameDisplay();

        // Now try to reposition tetromino to be at target distance from C
        if (gameState.cIndex >= 0 && gameState.highestIndices.length > 0) {
            const cRow = Math.floor(gameState.cIndex / 50);
            const cCol = gameState.cIndex % 50;

            let bestTetromino = null;
            let closestDistanceDiff = Infinity;

            // Try all possible tetromino positions
            const shapes = Object.keys(TETROMINOES);
            for (let row = 0; row < 48; row++) {
                for (let col = 0; col < 48; col++) {
                    const originIndex = row * 50 + col;

                    for (let shape of shapes) {
                        for (let rotation = 0; rotation < 4; rotation++) {
                            const indices = getTetrominoIndices(originIndex, shape, rotation);

                            if (indices.length !== 4) continue;

                            // Check if valid (no overlap with filled or C)
                            let valid = true;
                            for (let index of indices) {
                                if (gameState.filledIndices.includes(index) || index === gameState.cIndex) {
                                    valid = false;
                                    break;
                                }
                            }
                            if (!valid) continue;

                            // Calculate average distance from this tetromino to C
                            let totalDistance = 0;
                            for (let tetrominoIndex of indices) {
                                const tRow = Math.floor(tetrominoIndex / 50);
                                const tCol = tetrominoIndex % 50;
                                totalDistance += calculateDistance(cRow, cCol, tRow, tCol);
                            }
                            const avgDistance = totalDistance / 4;

                            // Check if this is closer to target distance
                            const distanceDiff = Math.abs(avgDistance - targetDistance);
                            if (distanceDiff < closestDistanceDiff) {
                                closestDistanceDiff = distanceDiff;
                                bestTetromino = {
                                    indices,
                                    shape,
                                    rotation,
                                    origin: originIndex
                                };
                            }
                        }
                    }
                }
            }

            // Set the tetromino at the target distance
            if (bestTetromino) {
                gameState.highestIndices = bestTetromino.indices;
                gameState.currentTetromino = {
                    shape: bestTetromino.shape,
                    rotation: bestTetromino.rotation,
                    origin: bestTetromino.origin
                };
            }
        }

        updateGameDisplay();
    }
}

// Nintendo-style move sounds using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMoveSound(direction) {
    const frequencies = { up: 523, down: 330, left: 392, right: 440 };
    const freq = frequencies[direction] || 440;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.setValueAtTime(freq * 1.25, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.12);
}

function playCelebrationSound() {
    const melody = [
        [523, 0.00], [659, 0.10], [784, 0.20], [1047, 0.30],
        [784, 0.45], [1047, 0.55], [1319, 0.65]
    ];

    melody.forEach(([freq, time]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time + 0.18);

        osc.start(audioCtx.currentTime + time);
        osc.stop(audioCtx.currentTime + time + 0.18);
    });
}

// Trackpad support for mobile
(function() {
    const DEAD_ZONE = 18;   // px from center before movement triggers
    const MOVE_MS   = 180;  // ms between repeated moves

    function initTrackpad() {
        const pad = document.getElementById('trackpad');
        const dot = document.getElementById('trackpadDot');
        if (!pad) return;

        let interval = null;
        let activeDir = null;
        let mouseDown = false;

        function padCenter() {
            const r = pad.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }

        function directionFrom(dx, dy) {
            if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return null;
            return Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'right' : 'left')
                : (dy > 0 ? 'down' : 'up');
        }

        function setDirection(dir) {
            if (dir === activeDir) return;
            activeDir = dir;
            clearInterval(interval);
            interval = null;
            if (dir) {
                moveC(dir);
                interval = setInterval(() => moveC(dir), MOVE_MS);
            }
        }

        function update(clientX, clientY) {
            const c = padCenter();
            const dx = clientX - c.x;
            const dy = clientY - c.y;
            const maxOff = 50;
            dot.style.transform = `translate(calc(-50% + ${Math.max(-maxOff, Math.min(maxOff, dx))}px), calc(-50% + ${Math.max(-maxOff, Math.min(maxOff, dy))}px))`;
            setDirection(directionFrom(dx, dy));
        }

        function stop() {
            pad.classList.remove('active');
            dot.style.transform = 'translate(-50%, -50%)';
            setDirection(null);
        }

        // Touch
        pad.addEventListener('touchstart', e => {
            e.preventDefault();
            pad.classList.add('active');
            update(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        pad.addEventListener('touchmove', e => {
            e.preventDefault();
            update(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        pad.addEventListener('touchend', e => { e.preventDefault(); stop(); }, { passive: false });
        pad.addEventListener('touchcancel', e => { e.preventDefault(); stop(); }, { passive: false });

        // Mouse fallback for desktop testing
        pad.addEventListener('mousedown', e => {
            mouseDown = true;
            pad.classList.add('active');
            update(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', e => { if (mouseDown) update(e.clientX, e.clientY); });
        document.addEventListener('mouseup', () => { if (mouseDown) { mouseDown = false; stop(); } });
    }

    document.addEventListener('DOMContentLoaded', initTrackpad);
})();

function toggleSettings() {
    document.getElementById('settingsPanel').classList.toggle('open');
}

// Arrow key support
document.addEventListener('keydown', function(e) {
    const directionMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    if (directionMap[e.key]) {
        e.preventDefault();
        moveC(directionMap[e.key]);
    }
});

// Initialize slider event listeners and start new game when page loads
document.addEventListener('DOMContentLoaded', function() {
    const populationSlider = document.getElementById('populationSlider');
    const fieldSlider = document.getElementById('fieldSlider');
    const lockSlider = document.getElementById('lockSlider');
    const distanceSlider = document.getElementById('distanceSlider');

    populationSlider.addEventListener('input', updatePopulationDisplay);
    fieldSlider.addEventListener('input', updateFieldDisplay);
    lockSlider.addEventListener('input', updateLockDisplay);
    distanceSlider.addEventListener('input', updateDistanceDisplay);

    updatePopulationDisplay();
    updateFieldDisplay();
    updateLockDisplay();
    updateDistanceDisplay();
    // Splash is shown by default; mode selector shown after Play is clicked
});

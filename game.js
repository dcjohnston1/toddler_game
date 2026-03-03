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
            document.getElementById('gameStatus').innerHTML = '<div class="game-win">GAME OVER: C WINS</div>';
        } else {
            document.getElementById('gameStatus').innerHTML = '<div class="game-over">GAME OVER</div>';
        }
        document.getElementById('upBtn').disabled = true;
        document.getElementById('downBtn').disabled = true;
        document.getElementById('leftBtn').disabled = true;
        document.getElementById('rightBtn').disabled = true;
        return;
    } else {
        document.getElementById('gameStatus').innerHTML = '';
        document.getElementById('upBtn').disabled = false;
        document.getElementById('downBtn').disabled = false;
        document.getElementById('leftBtn').disabled = false;
        document.getElementById('rightBtn').disabled = false;
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
        gameState.cells[index].textContent = '10';
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

    // Check if moving into 10 spot
    if (gameState.filledIndices.includes(newIndex)) {
        const willBeTouching = isTouchingGreenTetromino(newIndex, gameState.highestIndices);

        if (!willBeTouching) {
            // C wins! Replace the 10 spot with C
            gameState.cIndex = newIndex;

            // Remove the 10 spot from filledIndices
            const index = gameState.filledIndices.indexOf(newIndex);
            if (index > -1) {
                gameState.filledIndices.splice(index, 1);
            }

            gameState.cWins = true;
            updateGameDisplay();
            return;
        } else {
            // Block the move: cannot enter 10 spot while touching green
            return;
        }
    }

    // Valid move
    gameState.cIndex = newIndex;
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
    const populationPercent = parseInt(document.getElementById('populationSlider').value);
    const populationChance = populationPercent / 100;

    for (let i = 0; i < 2500; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.backgroundColor = '#fff';

        // Use slider value for population chance
        if (Math.random() < populationChance) {
            gameState.filledIndices.push(i);
        }

        gameState.cells.push(cell);
        gridContainer.appendChild(cell);
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
    newGame();
});

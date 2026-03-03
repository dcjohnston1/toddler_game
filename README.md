# Playable Grid Game

A browser-based strategy game played on a 50×50 grid. Navigate the character **C** to reach a target cell while evading a pursuing tetromino.

## How to Play

Open `index.html` in any modern web browser — no build step or server required.

### Objective

Move **C** onto any dark-filled cell (marked `10`) to win. A green tetromino hunts you down each turn; if the tetromino is adjacent to the target cell, you cannot enter it.

### Controls

| Action | Input |
|--------|-------|
| Move up | ↑ button |
| Move left | ← button |
| Move right | → button |
| Move down | ↓ button |

### The Grid

- **White cells** — empty, free to move through. Shading indicates proximity score (darker = higher value).
- **Dark cells (`10`)** — target cells. Move **C** onto one of these to win.
- **Blue cell (`C`)** — your character.
- **Green-highlighted cells** — the current tetromino. You cannot move into these cells, and you cannot capture a target cell while the tetromino is touching it.

### The Tetromino

After every move you make, the tetromino repositions itself to the spot with the highest proximity score — a weighted sum of closeness to **C** and closeness to filled target cells. This makes it an adaptive pursuer that cuts off your paths to targets.

The tetromino can only slide to a new position that shares a minimum number of cells with its previous position (controlled by the **Movement Lock** slider), so it cannot teleport across the board.

### Sliders

| Slider | Range | Effect |
|--------|-------|--------|
| **Cell Population** | 1–20% | Density of target cells randomly placed on the grid. More cells = more targets but a more cluttered board. |
| **Field Strength** | 0–2 | How strongly target cells attract the tetromino relative to proximity to **C**. Higher values make the tetromino gravitate toward targets rather than chasing you directly. |
| **Movement Lock** | 1–3 cells | Minimum number of cells the tetromino must share with its previous position when it moves. Higher values slow the tetromino; lower values let it slide freely. |
| **Start Distance** | 1–25 | How far the tetromino starts from **C** at the beginning of each game. |

Adjust sliders before pressing **New Game** to take effect.

### Winning and Losing

- **C WINS** — you successfully moved onto a target cell that was not adjacent to the tetromino.
- **GAME OVER** — currently the tetromino does not directly end the game by collision; it only blocks your access to targets. Future versions may add a time limit or other loss conditions.

Press **New Game** at any time to reset with the current slider settings.

## Project Structure

```
toddler_game/
├── index.html   # HTML structure and layout
├── style.css    # All styling
├── game.js      # Game logic (state, tetromino AI, rendering)
└── README.md    # This file
```

## Technical Notes

- Pure vanilla HTML/CSS/JavaScript — no dependencies or build tools.
- The 50×50 grid is rendered as 2,500 individual `<div>` elements.
- Proximity scores use the formula: `(1 / distance_to_C) + (1 / distance_to_target) × field_strength`.
- Colors are mapped with a power-curve gray scale so nearby cells are visually prominent.
- The tetromino AI evaluates all seven standard tetromino shapes (I, O, T, S, Z, J, L) across four rotations each turn.

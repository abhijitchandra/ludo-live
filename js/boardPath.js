/**
 * boardPath.js
 * -------------------------------------------------------
 * Generates the classic 52-cell Ludo track using 4-fold
 * rotational symmetry around the board center (7,7) on a
 * 15x15 grid, plus the 4 colored home-column stretches.
 *
 * Grid convention: [row, col], both 0-indexed, 0-14.
 * -------------------------------------------------------
 */

// Rotate a cell 90 degrees clockwise around center (7,7)
function rotate(r, c) {
  return [c, 14 - r];
}

// Base arm: Red/West quadrant (13 cells)
const BASE_ARM = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6]
];

const WEST = BASE_ARM;
const NORTH = WEST.map(([r, c]) => rotate(r, c));
const EAST = NORTH.map(([r, c]) => rotate(r, c));
const SOUTH = EAST.map(([r, c]) => rotate(r, c));

// Full 52-cell shared track, clockwise, starting at Red's arm
const PATH = [...WEST, ...NORTH, ...EAST, ...SOUTH];

// Each color's arm starts at these offsets in PATH (13 cells apart)
const ARM_START = { red: 0, green: 13, yellow: 26, blue: 39 };

// The square a color's tokens step onto when leaving the yard
const START_INDEX = {
  red: ARM_START.red + 1,     // (6,1)
  green: ARM_START.green + 1, // (1,8)
  yellow: ARM_START.yellow + 1, // (8,13)
  blue: ARM_START.blue + 1    // (13,6)
};

// Safe squares: every start square + one "star" square per arm
const SAFE_INDICES = new Set([
  START_INDEX.red, START_INDEX.green, START_INDEX.yellow, START_INDEX.blue,
  ARM_START.red + 9, ARM_START.green + 9, ARM_START.yellow + 9, ARM_START.blue + 9
]);

// Home column stretches (6 cells each), entrance -> center-adjacent
const HOME_COLUMNS = {
  red: [[7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 14], [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[14, 7], [13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const CENTER_CELL = [7, 7];

// Yard (base) regions, 6x6 blocks, used for rendering + token "at home" spot
const YARDS = {
  red: { rowStart: 0, colStart: 0 },
  green: { rowStart: 0, colStart: 9 },
  yellow: { rowStart: 9, colStart: 9 },
  blue: { rowStart: 9, colStart: 0 }
};

// Fixed pixel-independent offsets (in cell units) for the 4 tokens inside a yard
const YARD_TOKEN_OFFSETS = [
  [1.2, 1.2], [1.2, 3.2], [3.2, 1.2], [3.2, 3.2]
];

/**
 * Convert a logical game position into a [row, col] grid coordinate.
 * pos format: { state: 'yard'|'path'|'home'|'finished', color, index, tokenIdx }
 *  - yard:  index unused, uses tokenIdx to place inside yard box
 *  - path:  index = 0..51, absolute index into PATH array
 *  - home:  index = 0..5, into that color's HOME_COLUMNS
 *  - finished: sits on CENTER_CELL
 */
function posToCoord(pos) {
  if (pos.state === 'yard') {
    const yard = YARDS[pos.color];
    const [dr, dc] = YARD_TOKEN_OFFSETS[pos.tokenIdx];
    return [yard.rowStart + dr, yard.colStart + dc];
  }
  if (pos.state === 'path') {
    return PATH[pos.index];
  }
  if (pos.state === 'home') {
    return HOME_COLUMNS[pos.color][pos.index];
  }
  return CENTER_CELL;
}

// How many steps a token has taken to know when it should turn into home column.
// A token's global path index for its own color = (START_INDEX[color] + stepsTaken) % 52
// After 51 steps taken (i.e. stepsTaken === 51), the 52nd step onward goes into home column.
const STEPS_ON_MAIN_TRACK = 51; // steps before entering home column
const HOME_COLUMN_LENGTH = 6;
const TOTAL_STEPS_TO_FINISH = STEPS_ON_MAIN_TRACK + HOME_COLUMN_LENGTH; // 57

// Canonical seating/turn order used everywhere players are assigned or rotated
const PLAYER_ORDER = ['red', 'green', 'yellow', 'blue'];

window.LudoBoard = {
  PATH,
  ARM_START,
  START_INDEX,
  SAFE_INDICES,
  HOME_COLUMNS,
  CENTER_CELL,
  YARDS,
  posToCoord,
  STEPS_ON_MAIN_TRACK,
  HOME_COLUMN_LENGTH,
  TOTAL_STEPS_TO_FINISH,
  PLAYER_ORDER
};

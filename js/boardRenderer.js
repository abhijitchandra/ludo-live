/**
 * boardRenderer.js
 * -------------------------------------------------------
 * Renders the static Ludo board: 15x15 grid with colored
 * yards, the shared track, colored home columns, and the
 * center finish triangle. Tokens are layered on top by ui.js.
 * -------------------------------------------------------
 */
(function () {
  const B = window.LudoBoard;
  const GRID = 15;

  const COLOR_HEX = {
    red: '#e6483e',
    green: '#3fae4c',
    yellow: '#f1b41a',
    blue: '#3a7bd5'
  };

  function cellKey(r, c) { return `${r}-${c}`; }

  function buildCellClassMap() {
    const map = {}; // key -> { type, color }

    // Track cells
    B.PATH.forEach(([r, c], idx) => {
      map[cellKey(r, c)] = {
        type: 'track',
        safe: B.SAFE_INDICES.has(idx),
        startColor: Object.keys(B.START_INDEX).find(col => B.START_INDEX[col] === idx) || null
      };
    });

    // Home columns
    Object.keys(B.HOME_COLUMNS).forEach((color) => {
      B.HOME_COLUMNS[color].forEach(([r, c]) => {
        map[cellKey(r, c)] = { type: 'home', color };
      });
    });

    // Center
    const [cr, cc] = B.CENTER_CELL;
    map[cellKey(cr, cc)] = { type: 'center' };

    return map;
  }

  function renderBoard(container) {
    container.innerHTML = '';
    container.classList.add('ludo-board');

    // Yards (4 colored 6x6 corner blocks, rendered as single elements for a clean look)
    Object.keys(B.YARDS).forEach((color) => {
      const yard = B.YARDS[color];
      const el = document.createElement('div');
      el.className = `yard yard-${color}`;
      el.style.gridRow = `${yard.rowStart + 1} / span 6`;
      el.style.gridColumn = `${yard.colStart + 1} / span 6`;
      el.innerHTML = `<div class="yard-inner yard-inner-${color}">
        <div class="yard-pocket"></div><div class="yard-pocket"></div>
        <div class="yard-pocket"></div><div class="yard-pocket"></div>
      </div>`;
      container.appendChild(el);
    });

    const cellMap = buildCellClassMap();

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const info = cellMap[cellKey(r, c)];
        if (!info) continue; // inside a yard block, already rendered as one element
        const cell = document.createElement('div');
        cell.style.gridRow = r + 1;
        cell.style.gridColumn = c + 1;
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (info.type === 'center') {
          cell.className = 'cell center-cell';
          cell.innerHTML = `
            <svg viewBox="0 0 100 100" class="center-star">
              <polygon points="50,50 50,0 100,50" fill="${COLOR_HEX.green}"/>
              <polygon points="50,50 100,50 50,100" fill="${COLOR_HEX.yellow}"/>
              <polygon points="50,50 50,100 0,50" fill="${COLOR_HEX.blue}"/>
              <polygon points="50,50 0,50 50,0" fill="${COLOR_HEX.red}"/>
            </svg>`;
        } else if (info.type === 'home') {
          cell.className = `cell home-cell home-${info.color}`;
        } else {
          cell.className = 'cell track-cell';
          if (info.safe) cell.classList.add('safe-cell');
          if (info.startColor) {
            cell.classList.add('start-cell', `start-${info.startColor}`);
          }
        }
        container.appendChild(cell);
      }
    }
  }

  window.LudoBoardRenderer = { renderBoard, GRID, COLOR_HEX };
})();

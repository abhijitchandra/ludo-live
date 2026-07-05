/**
 * ui.js
 * -------------------------------------------------------
 * Handles the animated token layer, dice rendering, player
 * panels, and toast notifications. Tokens are absolutely
 * positioned divs that glide between cells using CSS
 * transitions, stepping through intermediate track cells
 * one at a time so moves always look "walked" rather than
 * teleported.
 * -------------------------------------------------------
 */
(function () {
  const GRID = window.LudoBoardRenderer.GRID;
  const COLOR_HEX = window.LudoBoardRenderer.COLOR_HEX;
  const E = window.LudoEngine;
  const ALL_COLORS = ['red', 'green', 'yellow', 'blue'];

  let tokenLayer = null;
  let tokenEls = { red: [], green: [], yellow: [], blue: [] };
  let displayedSteps = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };
  let animating = false;
  let activeColors = ALL_COLORS;

  function initTokenLayer(container, colors) {
    activeColors = colors && colors.length ? colors : ALL_COLORS;
    tokenLayer = document.createElement('div');
    tokenLayer.className = 'token-layer';
    container.appendChild(tokenLayer);

    activeColors.forEach((color) => {
      tokenEls[color] = [0, 1, 2, 3].map((idx) => {
        const el = document.createElement('div');
        el.className = `token token-${color}`;
        el.dataset.color = color;
        el.dataset.idx = idx;
        el.innerHTML = `<div class="token-dot"></div>`;
        tokenLayer.appendChild(el);
        return el;
      });
    });
  }

  function placeTokenAt(el, row, col) {
    const cellPct = 100 / GRID;
    el.style.left = `${(col + 0.5) * cellPct}%`;
    el.style.top = `${(row + 0.5) * cellPct}%`;
  }

  function renderTokensInstant(tokens) {
    activeColors.forEach((color) => {
      (tokens[color] || []).forEach((steps, idx) => {
        displayedSteps[color][idx] = steps;
        const [r, c] = E.stepsToCoord(color, steps, idx);
        placeTokenAt(tokenEls[color][idx], r, c);
      });
    });
  }

  function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

  /**
   * Animate a single token from its currently displayed step count
   * to a new step count, walking one cell at a time.
   */
  async function animateToken(color, idx, fromSteps, toSteps) {
    const el = tokenEls[color][idx];
    el.classList.add('token-active');

    if (fromSteps === -1 && toSteps >= 0) {
      const [r, c] = E.stepsToCoord(color, 0, idx);
      placeTokenAt(el, r, c);
      await sleep(220);
    } else if (toSteps === -1) {
      el.classList.add('token-captured');
      const [r, c] = E.stepsToCoord(color, -1, idx);
      await sleep(120);
      placeTokenAt(el, r, c);
      await sleep(260);
      el.classList.remove('token-captured');
    } else {
      const step = fromSteps < toSteps ? 1 : -1;
      for (let s = fromSteps; s !== toSteps; s += step) {
        const next = s + step;
        const [r, c] = E.stepsToCoord(color, next, idx);
        placeTokenAt(el, r, c);
        await sleep(150);
      }
    }
    el.classList.remove('token-active');
    displayedSteps[color][idx] = toSteps;
  }

  async function animateTokensTo(newTokens) {
    animating = true;
    const jobs = [];
    activeColors.forEach((color) => {
      (newTokens[color] || []).forEach((steps, idx) => {
        const from = displayedSteps[color][idx];
        if (from !== steps) jobs.push(animateToken(color, idx, from, steps));
      });
    });
    await Promise.all(jobs);
    animating = false;
  }

  function isAnimating() { return animating; }

  function highlightMovable(color, tokenIndices, onPick) {
    clearHighlights();
    tokenIndices.forEach((idx) => {
      const el = tokenEls[color][idx];
      el.classList.add('token-movable');
      el.onclick = () => onPick(idx);
    });
  }

  function clearHighlights() {
    activeColors.forEach((color) => {
      tokenEls[color].forEach((el) => {
        el.classList.remove('token-movable');
        el.onclick = null;
      });
    });
  }

  // ---------- Dice ----------
  const DICE_PIPS = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]]
  };

  function renderDiceFace(el, value) {
    const pips = DICE_PIPS[value] || [];
    el.innerHTML = pips.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"></circle>`).join('');
  }

  async function animateDiceRoll(el, finalValue, colorHex) {
    el.parentElement.classList.add('dice-rolling');
    el.parentElement.style.setProperty('--dice-color', colorHex);
    for (let i = 0; i < 8; i++) {
      renderDiceFace(el, 1 + Math.floor(Math.random() * 6));
      await sleep(60);
    }
    renderDiceFace(el, finalValue);
    el.parentElement.classList.remove('dice-rolling');
    el.parentElement.classList.add('dice-landed');
    await sleep(300);
    el.parentElement.classList.remove('dice-landed');
  }

  // ---------- Toasts ----------
  let toastContainer = null;

  function initToasts(container) {
    toastContainer = container;
  }

  /**
   * Show an animated, color-highlighted pill notification at the
   * bottom of the screen. Stacks if multiple fire close together.
   */
  function showToast(text, color) {
    if (!toastContainer) return;
    const hex = COLOR_HEX[color] || '#7c9cff';
    const el = document.createElement('div');
    el.className = 'toast-pill';
    el.style.setProperty('--toast-color', hex);
    el.textContent = text;
    toastContainer.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast-in'));
    setTimeout(() => {
      el.classList.remove('toast-in');
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 400);
    }, 2600);
  }

  window.LudoUI = {
    initTokenLayer,
    renderTokensInstant,
    animateTokensTo,
    isAnimating,
    highlightMovable,
    clearHighlights,
    animateDiceRoll,
    renderDiceFace,
    initToasts,
    showToast,
    COLOR_HEX,
    ALL_COLORS
  };
})();

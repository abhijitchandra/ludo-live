/**
 * gameEngine.js
 * -------------------------------------------------------
 * Pure, deterministic Ludo rules engine. No DOM access here
 * so it's easy to reason about and keeps both clients (and
 * the Firebase-synced state) perfectly in agreement.
 *
 * A token's position is represented purely as an integer
 * "stepsTaken":
 *   -1        => sitting in the yard (not yet released)
 *    0 .. 50  => on the shared 52-cell track, relative to
 *                that color's own start square
 *    51 .. 56 => inside that color's private home column
 *    57       => finished (reached center)
 * -------------------------------------------------------
 */
(function () {
  const B = window.LudoBoard;
  const FINISH_STEP = B.TOTAL_STEPS_TO_FINISH; // 57
  const HOME_ENTRY_STEP = B.STEPS_ON_MAIN_TRACK; // 51

  function rollDice() {
    return 1 + Math.floor(Math.random() * 6);
  }

  // Convert a color + stepsTaken into an absolute board coordinate (for rendering)
  function stepsToCoord(color, stepsTaken, tokenIdx) {
    if (stepsTaken === -1) {
      return B.posToCoord({ state: 'yard', color, tokenIdx });
    }
    if (stepsTaken >= HOME_ENTRY_STEP && stepsTaken < FINISH_STEP) {
      return B.posToCoord({ state: 'home', color, index: stepsTaken - HOME_ENTRY_STEP });
    }
    if (stepsTaken === FINISH_STEP) {
      return B.posToCoord({ state: 'finished' });
    }
    const absoluteIndex = (B.START_INDEX[color] + stepsTaken) % 52;
    return B.posToCoord({ state: 'path', index: absoluteIndex });
  }

  // Absolute track index for a token currently on the main track (null otherwise)
  function absoluteTrackIndex(color, stepsTaken) {
    if (stepsTaken < 0 || stepsTaken >= HOME_ENTRY_STEP) return null;
    return (B.START_INDEX[color] + stepsTaken) % 52;
  }

  function isSafeCell(absIndex) {
    return B.SAFE_INDICES.has(absIndex);
  }

  /**
   * Determine which of a color's tokens can legally move with the given dice value.
   * Returns array of token indices (0-3).
   */
  function getMovableTokens(tokensSteps, diceValue) {
    const movable = [];
    tokensSteps.forEach((steps, idx) => {
      if (steps === FINISH_STEP) return; // already home
      if (steps === -1) {
        if (diceValue === 6) movable.push(idx);
        return;
      }
      const next = steps + diceValue;
      if (next <= FINISH_STEP) movable.push(idx);
    });
    return movable;
  }

  /**
   * Apply a move for `color`'s token at `tokenIdx` given `diceValue`.
   * `allTokens` = { red: [4 steps], green: [...], yellow: [...], blue: [...] }
   * Mutates nothing; returns { tokens, captured: [{color, tokenIdx}], finished, bonusTurn }
   */
  function applyMove(allTokens, color, tokenIdx, diceValue) {
    const tokens = JSON.parse(JSON.stringify(allTokens));
    const steps = tokens[color][tokenIdx];
    let newSteps;
    if (steps === -1) {
      newSteps = 0; // released onto own start square
    } else {
      newSteps = steps + diceValue;
    }
    tokens[color][tokenIdx] = newSteps;

    const captured = [];
    let finished = false;

    if (newSteps === FINISH_STEP) {
      finished = true;
    } else {
      const absIdx = absoluteTrackIndex(color, newSteps);
      if (absIdx !== null && !isSafeCell(absIdx)) {
        // Check every other color for a token sitting on the same absolute cell
        Object.keys(tokens).forEach((otherColor) => {
          if (otherColor === color) return;
          tokens[otherColor].forEach((otherSteps, otherIdx) => {
            if (otherSteps < 0 || otherSteps >= HOME_ENTRY_STEP) return;
            const otherAbs = absoluteTrackIndex(otherColor, otherSteps);
            if (otherAbs === absIdx) {
              tokens[otherColor][otherIdx] = -1; // sent home
              captured.push({ color: otherColor, tokenIdx: otherIdx });
            }
          });
        });
      }
    }

    const bonusTurn = diceValue === 6 || captured.length > 0 || finished;

    return { tokens, captured, finished, bonusTurn };
  }

  function hasWon(tokensSteps) {
    return tokensSteps.every((s) => s === FINISH_STEP);
  }

  window.LudoEngine = {
    FINISH_STEP,
    HOME_ENTRY_STEP,
    rollDice,
    stepsToCoord,
    absoluteTrackIndex,
    isSafeCell,
    getMovableTokens,
    applyMove,
    hasWon
  };
})();

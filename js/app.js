(function () {
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get('room') || '').toUpperCase();

  const boardEl = document.getElementById('board');
  const statusLine = document.getElementById('statusLine');
  const diceBox = document.getElementById('diceBox');
  const diceSvg = document.getElementById('diceSvg');
  const diceHint = document.getElementById('diceHint');
  const roomCodeLabel = document.getElementById('roomCodeLabel');
  const logLine = document.getElementById('logLine');
  const winnerOverlay = document.getElementById('winnerOverlay');
  const winnerTitle = document.getElementById('winnerTitle');
  const winnerSubtitle = document.getElementById('winnerSubtitle');

  if (!roomCode) {
    window.location.href = 'index.html';
    return;
  }
  roomCodeLabel.textContent = roomCode;

  const myColor = localStorage.getItem('ludo_room_' + roomCode);
  if (!myColor) {
    // Arrived via a shared link without joining yet — send to lobby prefilled
    window.location.href = `index.html?room=${roomCode}`;
    return;
  }

  window.LudoBoardRenderer.renderBoard(boardEl);
  window.LudoUI.initTokenLayer(boardEl);
  window.LudoUI.renderDiceFace(diceSvg, 1);

  let lastEventTs = 0;
  let lastKnownTokens = null;
  let processingMove = false;
  let currentRoom = null;
  let winnerShown = false;

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname.replace('game.html', 'index.html')}?room=${roomCode}`;
    navigator.clipboard?.writeText(url);
    const btn = document.getElementById('copyLinkBtn');
    const original = btn.textContent;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });

  document.getElementById('leaveBtn').addEventListener('click', async () => {
    await window.RoomClient.leaveRoom(roomCode, myColor);
    window.location.href = 'index.html';
  });

  document.getElementById('playAgainBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  function renderPlayerPanels(room) {
    ['red', 'yellow'].forEach((color) => {
      const player = room.players && room.players[color];
      document.getElementById(`name-${color}`).textContent = player ? player.name : 'Waiting for player…';
      const panel = document.getElementById(`panel-${color}`);
      panel.classList.toggle('active-turn', room.turn === color && room.status === 'playing');
      panel.classList.toggle('disconnected', !!player && player.connected === false);

      const progress = document.getElementById(`progress-${color}`);
      progress.innerHTML = '';
      const tokens = room.tokens[color] || [-1, -1, -1, -1];
      tokens.forEach((steps) => {
        const pip = document.createElement('div');
        pip.className = 'progress-pip' + (steps === window.LudoEngine.FINISH_STEP ? ' done' : '');
        pip.textContent = steps === window.LudoEngine.FINISH_STEP ? '✓' : '';
        progress.appendChild(pip);
      });
    });
  }

  function renderStatus(room) {
    if (room.status === 'waiting') {
      statusLine.textContent = 'Waiting for a second player to join…';
      statusLine.classList.remove('my-turn');
      diceHint.textContent = 'Share the room code to start';
      return;
    }
    if (room.status === 'finished') {
      statusLine.textContent = `${room.players[room.winner].name} won the game!`;
      statusLine.classList.remove('my-turn');
      return;
    }
    const isMyTurn = room.turn === myColor;
    const turnName = room.players[room.turn] ? room.players[room.turn].name : room.turn;
    statusLine.textContent = isMyTurn ? "It's your turn!" : `Waiting for ${turnName}…`;
    statusLine.classList.toggle('my-turn', isMyTurn);
  }

  function setDiceEnabled(enabled) {
    diceBox.classList.toggle('disabled', !enabled);
  }

  async function handleDiceClick() {
    if (!currentRoom || currentRoom.status !== 'playing') return;
    if (currentRoom.turn !== myColor) return;
    if (currentRoom.dice && currentRoom.dice.value !== null) return; // already rolled, waiting on a move
    if (window.LudoUI.isAnimating()) return;

    const value = window.LudoEngine.rollDice();
    const colorHex = window.LudoUI.COLOR_HEX[myColor];
    setDiceEnabled(false);
    await window.LudoUI.animateDiceRoll(diceSvg, value, colorHex);
    await window.RoomClient.rollDiceForRoom(roomCode, myColor, value);
  }

  diceBox.addEventListener('click', handleDiceClick);

  async function handlePostRollMovableCheck(room) {
    if (room.turn !== myColor) return;
    if (!room.dice || room.dice.value === null) return;
    if (room.dice.rolledBy !== myColor) return;

    const movable = window.LudoEngine.getMovableTokens(room.tokens[myColor], room.dice.value);
    if (movable.length === 0) {
      diceHint.textContent = `Rolled ${room.dice.value} — no valid moves. Passing turn…`;
      setTimeout(() => window.RoomClient.passTurn(roomCode, myColor), 900);
      return;
    }

    diceHint.textContent = movable.length === 1
      ? `Rolled ${room.dice.value} — moving your token…`
      : `Rolled ${room.dice.value} — tap a glowing token to move it`;

    if (movable.length === 1) {
      // Auto-play the only legal move for a snappier feel
      await window.RoomClient.submitMove(roomCode, myColor, movable[0], room.dice.value);
      return;
    }

    window.LudoUI.highlightMovable(myColor, movable, async (tokenIdx) => {
      window.LudoUI.clearHighlights();
      await window.RoomClient.submitMove(roomCode, myColor, tokenIdx, room.dice.value);
    });
  }

  function spawnConfetti() {
    const colors = ['#e6483e', '#f1b41a', '#3fae4c', '#3a7bd5'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4200);
    }
  }

  async function onRoomUpdate(room) {
    if (!room) return;
    currentRoom = room;

    renderPlayerPanels(room);
    renderStatus(room);

    if (lastKnownTokens) {
      await window.LudoUI.animateTokensTo(room.tokens);
    } else {
      window.LudoUI.renderTokensInstant(room.tokens);
    }
    lastKnownTokens = room.tokens;

    if (room.lastEvent && room.lastEvent.ts !== lastEventTs) {
      lastEventTs = room.lastEvent.ts;
      logLine.textContent = room.lastEvent.text || '';
    }

    const diceRolled = room.dice && room.dice.value !== null;
    if (diceRolled) window.LudoUI.renderDiceFace(diceSvg, room.dice.value);

    const canRoll = room.status === 'playing' && room.turn === myColor && !diceRolled;
    setDiceEnabled(canRoll);
    if (room.status === 'playing' && room.turn !== myColor) {
      diceHint.textContent = 'Waiting for opponent…';
      window.LudoUI.clearHighlights();
    } else if (room.status === 'playing' && room.turn === myColor && !diceRolled) {
      diceHint.textContent = 'Tap the dice to roll';
      window.LudoUI.clearHighlights();
    }

    if (diceRolled) {
      await handlePostRollMovableCheck(room);
    }

    if (room.status === 'finished' && !winnerShown) {
      winnerShown = true;
      const winnerName = room.players[room.winner].name;
      winnerTitle.textContent = room.winner === myColor ? '🎉 You Won!' : `🏆 ${winnerName} Won!`;
      winnerSubtitle.textContent = 'Thanks for playing — start a new room to play again.';
      winnerOverlay.classList.add('visible');
      spawnConfetti();
    }
  }

  window.RoomClient.subscribeRoom(roomCode, onRoomUpdate);

  window.addEventListener('beforeunload', () => {
    window.RoomClient.leaveRoom(roomCode, myColor);
  });
})();

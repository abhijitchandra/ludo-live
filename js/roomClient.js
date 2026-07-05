/**
 * roomClient.js
 * -------------------------------------------------------
 * Thin wrapper around Firebase Realtime Database for room
 * lifecycle: create, join, subscribe, and write moves.
 * Supports 2, 3, or 4 players.
 *
 * Data shape at /rooms/{code}:
 * {
 *   status: "waiting" | "playing" | "finished",
 *   maxPlayers: 2 | 3 | 4,
 *   colorOrder: ["red","yellow"] | ["red","green","blue"] | ["red","green","yellow","blue"],
 *   createdAt: <timestamp>,
 *   turn: "red" | "green" | "yellow" | "blue",
 *   dice: { value: number|null, rolledBy: string|null },
 *   consecutiveSixes: number,
 *   winner: string|null,
 *   tokens: { <color>: [n,n,n,n], ... },
 *   players: {
 *     <color>: { name, clientId, connected }
 *   },
 *   lastEvent: { type, text, color, ts }
 * }
 * -------------------------------------------------------
 */
(function () {
  // Which colors are in play for a given player count, listed in turn order
  // (this order matches the board's clockwise arm sequence: red -> green -> yellow -> blue)
  const COLOR_SETS = {
    2: ['red', 'yellow'],
    3: ['red', 'green', 'blue'],
    4: ['red', 'green', 'yellow', 'blue']
  };

  function getClientId() {
    let id = localStorage.getItem('ludo_client_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('ludo_client_id', id);
    }
    return id;
  }

  function makeRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function createRoom(playerName, maxPlayers) {
    maxPlayers = [2, 3, 4].includes(maxPlayers) ? maxPlayers : 2;
    const colorOrder = COLOR_SETS[maxPlayers];
    const firstColor = colorOrder[0];
    const code = makeRoomCode();
    const clientId = getClientId();

    const tokens = {};
    colorOrder.forEach((c) => { tokens[c] = [-1, -1, -1, -1]; });

    const initialState = {
      status: 'waiting',
      maxPlayers,
      colorOrder,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      turn: firstColor,
      dice: { value: null, rolledBy: null },
      consecutiveSixes: 0,
      winner: null,
      tokens,
      players: {
        [firstColor]: { name: playerName, clientId, connected: true }
      },
      lastEvent: { type: 'created', text: `${playerName} created this room`, color: firstColor, ts: Date.now() }
    };
    await db.ref('rooms/' + code).set(initialState);
    localStorage.setItem('ludo_room_' + code, firstColor);
    setupPresence(code, firstColor);
    return { code, color: firstColor };
  }

  async function joinRoom(code, playerName) {
    code = code.toUpperCase().trim();
    const clientId = getClientId();
    const snap = await db.ref('rooms/' + code).get();
    if (!snap.exists()) throw new Error('Room not found. Double-check the code.');
    const room = snap.val();
    const colorOrder = room.colorOrder || COLOR_SETS[room.maxPlayers || 2];

    // Reconnect case: this client already owns a seat in this room
    const savedColor = localStorage.getItem('ludo_room_' + code);
    if (savedColor && room.players && room.players[savedColor] && room.players[savedColor].clientId === clientId) {
      await db.ref(`rooms/${code}/players/${savedColor}`).update({ connected: true });
      setupPresence(code, savedColor);
      return { code, color: savedColor };
    }

    const joinedColors = Object.keys(room.players || {});
    if (joinedColors.length >= (room.maxPlayers || 2)) {
      throw new Error('Room is already full.');
    }

    const color = colorOrder.find((c) => !joinedColors.includes(c));
    if (!color) throw new Error('Room is already full.');

    await db.ref(`rooms/${code}/players/${color}`).set({ name: playerName, clientId, connected: true });

    const updatedSnap = await db.ref('rooms/' + code).get();
    const updated = updatedSnap.val();
    const nowJoined = Object.keys(updated.players || {}).length;
    if (nowJoined >= updated.maxPlayers) {
      await db.ref('rooms/' + code).update({
        status: 'playing',
        lastEvent: { type: 'joined', text: `${playerName} joined. Game on!`, color, ts: Date.now() }
      });
    } else {
      await db.ref('rooms/' + code).update({
        lastEvent: { type: 'joined', text: `${playerName} joined — waiting for ${updated.maxPlayers - nowJoined} more player(s)`, color, ts: Date.now() }
      });
    }

    localStorage.setItem('ludo_room_' + code, color);
    setupPresence(code, color);
    return { code, color };
  }

  function setupPresence(code, color) {
    const ref = db.ref(`rooms/${code}/players/${color}/connected`);
    ref.onDisconnect().set(false);
    ref.set(true);
  }

  function subscribeRoom(code, callback) {
    const ref = db.ref('rooms/' + code);
    ref.on('value', (snap) => callback(snap.val()));
    return () => ref.off('value');
  }

  async function rollDiceForRoom(code, color, value) {
    await db.ref(`rooms/${code}/dice`).set({ value, rolledBy: color });
  }

  function nextColorInOrder(colorOrder, current) {
    const idx = colorOrder.indexOf(current);
    return colorOrder[(idx + 1) % colorOrder.length];
  }

  /**
   * Atomically apply a move using the engine, then write the full
   * resulting state back. Uses a transaction on the room root to
   * avoid race conditions between players' clients.
   */
  async function submitMove(code, color, tokenIdx, diceValue) {
    const roomRef = db.ref('rooms/' + code);
    await roomRef.transaction((room) => {
      if (!room) return room;
      if (room.turn !== color) return room; // stale/late write guard
      if (!room.dice || room.dice.value !== diceValue) return room;

      const colorOrder = room.colorOrder || Object.keys(room.tokens);
      const result = window.LudoEngine.applyMove(room.tokens, color, tokenIdx, diceValue);
      room.tokens = result.tokens;

      let eventText = `${room.players[color].name} moved a token`;
      let eventColor = color;
      if (result.captured.length) {
        const names = result.captured.map(c => room.players[c.color].name).join(', ');
        eventText = `${room.players[color].name} captured ${names}'s token!`;
      }
      if (result.finished) {
        eventText = `${room.players[color].name} got a token home!`;
      }

      if (window.LudoEngine.hasWon(room.tokens[color])) {
        room.status = 'finished';
        room.winner = color;
        eventText = `${room.players[color].name} wins the game! 🎉`;
      } else {
        // Six streak rule: 3 sixes in a row forfeits the extra turn
        let sixes = room.consecutiveSixes || 0;
        if (diceValue === 6) sixes += 1; else sixes = 0;

        if (result.bonusTurn && diceValue === 6 && sixes >= 3) {
          room.turn = nextColorInOrder(colorOrder, color);
          sixes = 0;
        } else if (!result.bonusTurn) {
          room.turn = nextColorInOrder(colorOrder, color);
        }
        room.consecutiveSixes = sixes;
      }

      room.dice = { value: null, rolledBy: null };
      room.lastEvent = { type: 'move', text: eventText, color: eventColor, ts: Date.now() };
      return room;
    });
  }

  async function passTurn(code, color) {
    const roomRef = db.ref('rooms/' + code);
    await roomRef.transaction((room) => {
      if (!room) return room;
      if (room.turn !== color) return room;
      const colorOrder = room.colorOrder || Object.keys(room.tokens);
      room.turn = nextColorInOrder(colorOrder, color);
      room.dice = { value: null, rolledBy: null };
      room.consecutiveSixes = 0;
      room.lastEvent = { type: 'pass', text: `${room.players[color].name} had no valid moves`, color, ts: Date.now() };
      return room;
    });
  }

  async function leaveRoom(code, color) {
    await db.ref(`rooms/${code}/players/${color}/connected`).set(false);
  }

  window.RoomClient = {
    getClientId,
    createRoom,
    joinRoom,
    subscribeRoom,
    rollDiceForRoom,
    submitMove,
    passTurn,
    leaveRoom,
    COLOR_SETS
  };
})();

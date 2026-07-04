/**
 * roomClient.js
 * -------------------------------------------------------
 * Thin wrapper around Firebase Realtime Database for room
 * lifecycle: create, join, subscribe, and write moves.
 *
 * Data shape at /rooms/{code}:
 * {
 *   status: "waiting" | "playing" | "finished",
 *   createdAt: <timestamp>,
 *   turn: "red" | "yellow",
 *   dice: { value: number|null, rolledBy: string|null },
 *   consecutiveSixes: number,
 *   winner: string|null,
 *   tokens: { red: [n,n,n,n], yellow: [n,n,n,n] },
 *   players: {
 *     red:    { name, clientId, connected },
 *     yellow: { name, clientId, connected }
 *   },
 *   lastEvent: { type, text, ts }
 * }
 * -------------------------------------------------------
 */
(function () {
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

  async function createRoom(playerName) {
    const code = makeRoomCode();
    const clientId = getClientId();
    const initialState = {
      status: 'waiting',
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      turn: 'red',
      dice: { value: null, rolledBy: null },
      consecutiveSixes: 0,
      winner: null,
      tokens: {
        red: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1]
      },
      players: {
        red: { name: playerName, clientId, connected: true }
      },
      lastEvent: { type: 'created', text: `${playerName} created the room`, ts: Date.now() }
    };
    await db.ref('rooms/' + code).set(initialState);
    localStorage.setItem('ludo_room_' + code, 'red');
    setupPresence(code, 'red');
    return { code, color: 'red' };
  }

  async function joinRoom(code, playerName) {
    code = code.toUpperCase().trim();
    const clientId = getClientId();
    const snap = await db.ref('rooms/' + code).get();
    if (!snap.exists()) throw new Error('Room not found. Double-check the code.');
    const room = snap.val();

    // Reconnect case: this client already owns a seat in this room
    const savedColor = localStorage.getItem('ludo_room_' + code);
    if (savedColor && room.players && room.players[savedColor] && room.players[savedColor].clientId === clientId) {
      await db.ref(`rooms/${code}/players/${savedColor}`).update({ connected: true });
      setupPresence(code, savedColor);
      return { code, color: savedColor };
    }

    if (room.players && room.players.red && room.players.yellow) {
      throw new Error('Room is already full.');
    }

    const color = room.players && room.players.red ? 'yellow' : 'red';
    await db.ref(`rooms/${code}/players/${color}`).set({ name: playerName, clientId, connected: true });

    const updatedSnap = await db.ref('rooms/' + code).get();
    const updated = updatedSnap.val();
    if (updated.players.red && updated.players.yellow) {
      await db.ref('rooms/' + code).update({
        status: 'playing',
        lastEvent: { type: 'joined', text: `${playerName} joined. Game on!`, ts: Date.now() }
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

  /**
   * Atomically apply a move using the engine, then write the full
   * resulting state back. Uses a transaction on the room root to
   * avoid race conditions between the two players' clients.
   */
  async function submitMove(code, color, tokenIdx, diceValue) {
    const roomRef = db.ref('rooms/' + code);
    await roomRef.transaction((room) => {
      if (!room) return room;
      if (room.turn !== color) return room; // stale/late write guard
      if (!room.dice || room.dice.value !== diceValue) return room;

      const result = window.LudoEngine.applyMove(room.tokens, color, tokenIdx, diceValue);
      room.tokens = result.tokens;

      let eventText = `${room.players[color].name} moved a token`;
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
          room.turn = color === 'red' ? 'yellow' : 'red';
          sixes = 0;
        } else if (!result.bonusTurn) {
          room.turn = color === 'red' ? 'yellow' : 'red';
        }
        room.consecutiveSixes = sixes;
      }

      room.dice = { value: null, rolledBy: null };
      room.lastEvent = { type: 'move', text: eventText, ts: Date.now() };
      return room;
    });
  }

  async function passTurn(code, color) {
    const roomRef = db.ref('rooms/' + code);
    await roomRef.transaction((room) => {
      if (!room) return room;
      if (room.turn !== color) return room;
      room.turn = color === 'red' ? 'yellow' : 'red';
      room.dice = { value: null, rolledBy: null };
      room.consecutiveSixes = 0;
      room.lastEvent = { type: 'pass', text: `${room.players[color].name} had no valid moves`, ts: Date.now() };
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
    leaveRoom
  };
})();

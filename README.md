# 🎲 Ludo Online — Real-Time 2-Player Multiplayer

A fully playable, animated Ludo game for two players, anywhere in the world,
synced live over the internet — hosted for **free** on GitHub Pages.

No build step, no backend server to run: it's plain HTML/CSS/JS, using
**Firebase Realtime Database** (also free) purely as a message-passing layer
between the two browsers.

---

## ✨ Features

- Classic Ludo rules: roll-to-release on a 6, captures, safe squares, home
  column, extra turn on 6/capture/finish, three-sixes-forfeits-turn
- **2, 3, or 4 players** — pick the player count when creating a room
- Smooth CSS animations: tokens visibly walk step-by-step, dice roll/shake,
  capture "poof", confetti + winner screen
- **Animated, color-highlighted toast notifications** at the bottom of the
  screen for room events ("UserA created this room") and turn changes
  ("It's UserB's Turn!")
- **Light / dark mode toggle** (🌙/☀️ button, persisted per browser)
- Real-time sync between browsers using Firebase — works across different
  devices, cities, countries
- Shareable room codes + invite links
- Reconnect support (closing and reopening the tab keeps your seat)
- Fully static — deploys straight to GitHub Pages, no server to maintain

---

## 📁 Project Structure

```
ludo-multiplayer/
├── index.html            # Lobby: create / join a room
├── game.html             # The actual game screen
├── css/
│   └── styles.css        # All styling + animations
├── js/
│   ├── firebase-config.js  # 👉 YOU fill this in (see setup below)
│   ├── boardPath.js         # Board geometry (52-cell track, home columns)
│   ├── gameEngine.js         # Pure Ludo rules engine (dice, moves, captures)
│   ├── roomClient.js         # Firebase read/write layer (rooms, moves, presence)
│   ├── boardRenderer.js      # Draws the static board grid
│   ├── ui.js                 # Tokens, dice rendering, animations
│   ├── lobby.js               # index.html logic
│   └── app.js                  # game.html logic (the main controller)
├── firebase.rules.json    # Sample Realtime Database security rules
├── LICENSE
└── README.md
```

---

## 🚀 Quick Start

### 1. Open the project in VS Code

Unzip the project and open the folder in VS Code.

### 2. Create your free Firebase project (~3 minutes)

Real-time multiplayer needs *somewhere* to sync game state. Firebase's free
tier is more than enough for a game like this.

1. Go to <https://console.firebase.google.com/> and click **Add project**.
   Give it any name (e.g. `my-ludo-game`) and finish the wizard (you can
   disable Google Analytics, it's not needed).
2. In the left sidebar, click **Build → Realtime Database → Create Database**.
   - Choose any region.
   - Start in **test mode** for now (we'll tighten rules below). This gives
     you a `databaseURL` that looks like
     `https://my-ludo-game-default-rtdb.firebaseio.com`.
3. Click the ⚙️ gear icon → **Project settings** → scroll to **Your apps** →
   click the `</>` (web) icon → register an app (any nickname).
4. Firebase will show you a `firebaseConfig` object. Copy it.
5. Open `js/firebase-config.js` in this project and paste your values in,
   replacing the placeholders:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "my-ludo-game.firebaseapp.com",
     databaseURL: "https://my-ludo-game-default-rtdb.firebaseio.com",
     projectId: "my-ludo-game",
     storageBucket: "my-ludo-game.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

6. (Recommended) In the Firebase console, go to **Realtime Database → Rules**
   and paste the contents of `firebase.rules.json` from this repo, then
   **Publish**. This scopes reads/writes to the `rooms/` path only.

   > ⚠️ These rules don't use Firebase Auth, so anyone with a room code can
   > read/write that room — fine for a casual game with friends. If you want
   > stronger anti-cheat/security, add Firebase Anonymous Auth and rewrite the
   > rules to check `auth.uid` against each seat — the codebase is small
   > enough to extend easily (see `js/roomClient.js`).

### 3. Run it locally

Because the pages use `fetch`/module-like script loading, open them through a
local server rather than double-clicking the HTML file:

- **VS Code**: install the "Live Server" extension → right-click
  `index.html` → **Open with Live Server**.
- **Or, Python**: `python3 -m http.server 8080` then visit
  `http://localhost:8080`.

Open the lobby in two browser tabs (or send the link to a friend), create a
room in one, join with the code in the other, and play!

---

## 🌍 Deploy to GitHub Pages (free hosting)

1. Create a new GitHub repository and push this project:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Ludo Online"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. On GitHub, go to your repo → **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
4. After a minute, GitHub will give you a live URL like:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. Share that link with a friend — you can now both play from anywhere.

That's it — no server, no hosting bill, no build pipeline.

---

## 🎮 How to Play

1. One player picks **2, 3, or 4 players**, clicks **Create New Room**, and
   shares the room code (or copied invite link) with the others.
2. Each other player enters the code and clicks **Join Room**.
3. Once every seat is filled, the game begins — Red always goes first,
   turns proceed Red → Green → Yellow → Blue (skipping any color not in
   play for 2 or 3-player games).
4. On your turn, tap the dice. Roll a **6** to bring a token out of your yard.
5. If you have more than one legal move, tap the glowing token you want to
   move.
6. Land on an opponent's token (on a non-star square) to send it back to
   their yard. Star squares and starting squares are safe.
7. Get all 4 tokens all the way around and into your home column to win.

---

## 🛠 How the Real-Time Sync Works

There's no game server. Instead:

- `roomClient.js` writes the full game state (whose turn it is, dice value,
  every token's position) to a Firebase Realtime Database node at
  `/rooms/{code}`.
- Both browsers subscribe to that same node with `onValue`. Whenever either
  player's client writes a change, Firebase pushes the update to *both*
  browsers, typically within a few hundred milliseconds.
- `gameEngine.js` is a pure, deterministic rules engine — both clients run
  the exact same movement/capture logic, so what one player sees always
  matches the other.
- Moves are written using a Firebase **transaction**, so if both browsers
  ever raced to write at once, only one write wins and the state never gets
  corrupted.

## 🎨 Customization Ideas

- Add sound effects on dice roll / capture / win (drop `.mp3` files in
  `assets/` and play them in `ui.js`).
- Extend to 4 players (the board geometry already supports Green and Blue —
  `boardPath.js` defines all four; you'd extend `roomClient.js`'s player
  slots and `app.js`'s panels).
- Add a chat box using another Firebase Realtime Database path.
- Re-skin colors/board art by editing `css/styles.css` and
  `boardRenderer.js`.

---

## 📄 License

MIT — do whatever you like with it.

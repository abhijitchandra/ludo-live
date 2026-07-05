(function () {
  const nameInput = document.getElementById('playerName');
  const codeInput = document.getElementById('roomCode');
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const errorBox = document.getElementById('errorBox');
  const countSelector = document.getElementById('playerCountSelector');

  window.LudoTheme.init(document.getElementById('themeToggle'));

  let selectedCount = 2;
  countSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-count]');
    if (!btn) return;
    selectedCount = parseInt(btn.dataset.count, 10);
    countSelector.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  });

  // Pre-fill remembered name
  const savedName = localStorage.getItem('ludo_player_name');
  if (savedName) nameInput.value = savedName;

  // Auto-fill room code if opened via a shared link (?room=CODE)
  const params = new URLSearchParams(window.location.search);
  const roomFromLink = params.get('room');
  if (roomFromLink) codeInput.value = roomFromLink.toUpperCase();

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }

  function clearError() {
    errorBox.classList.remove('visible');
  }

  function getName() {
    const name = nameInput.value.trim() || 'Player';
    localStorage.setItem('ludo_player_name', name);
    return name;
  }

  function setBusy(busy) {
    createBtn.disabled = busy;
    joinBtn.disabled = busy;
    createBtn.style.opacity = busy ? 0.6 : 1;
    joinBtn.style.opacity = busy ? 0.6 : 1;
  }

  createBtn.addEventListener('click', async () => {
    clearError();
    setBusy(true);
    try {
      const { code } = await window.RoomClient.createRoom(getName(), selectedCount);
      window.location.href = `game.html?room=${code}`;
    } catch (e) {
      console.error(e);
      showError(explainError(e));
      setBusy(false);
    }
  });

  joinBtn.addEventListener('click', async () => {
    clearError();
    const code = codeInput.value.trim();
    if (!code) { showError('Enter a room code first.'); return; }
    setBusy(true);
    try {
      await window.RoomClient.joinRoom(code, getName());
      window.location.href = `game.html?room=${code.toUpperCase()}`;
    } catch (e) {
      console.error(e);
      showError(explainError(e));
      setBusy(false);
    }
  });

  function explainError(e) {
    const msg = (e && e.message) || String(e);
    if (msg.includes('YOUR_API_KEY') || msg.includes('databaseURL')) {
      return 'Firebase is not configured yet. Open js/firebase-config.js and add your project keys (see README.md).';
    }
    return msg;
  }
})();

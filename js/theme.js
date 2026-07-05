/**
 * theme.js
 * -------------------------------------------------------
 * Light/dark mode toggle, persisted in localStorage and
 * shared across the lobby and game pages.
 * -------------------------------------------------------
 */
(function () {
  const KEY = 'ludo_theme';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function getSaved() {
    return localStorage.getItem(KEY) ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }

  function init(buttonEl) {
    let theme = getSaved();
    apply(theme);
    updateButton(buttonEl, theme);

    buttonEl.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      apply(theme);
      localStorage.setItem(KEY, theme);
      updateButton(buttonEl, theme);
    });
  }

  function updateButton(buttonEl, theme) {
    buttonEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    buttonEl.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Apply saved theme immediately (before DOM paints) to avoid a flash
  apply(getSaved());

  window.LudoTheme = { init };
})();

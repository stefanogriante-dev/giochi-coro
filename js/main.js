/* ===========================
   GIOCHI DEL CORO — main.js
   Navigazione e stato globale
   =========================== */

const App = (() => {

  /* ---- STATO ---- */
  const state = {
    screen:  'home',
    game:    null,   // 'simon' | 'treno' | 'puzzle' | 'battitempo'
    level:   null,   // 'principiante' | 'intermedio' | 'avanzato'
    mode:    null,   // 'singoli' | 'coro'
    bpm:     80,
    running: false,
  };

  /* ---- BPM DEFAULT PER LIVELLO ---- */
  const BPM_DEFAULTS = {
    principiante: 60,
    intermedio:   80,
    avanzato:    110,
  };

  /* ---- INFO GIOCHI (chiavi i18n) ---- */
  const GAME_INFO = {
    simon:      { titleKey: 'game_simon_title',  descKey: 'game_simon_desc',  color: '#e74c3c' },
    treno:      { titleKey: 'game_treno_title',  descKey: 'game_treno_desc',  color: '#f39c12' },
    puzzle:     { titleKey: 'game_puzzle_title', descKey: 'game_puzzle_desc', color: '#3498db' },
    battitempo: { titleKey: 'game_batti_title',  descKey: 'game_batti_desc_coro', color: '#2ecc71' },
  };

  /* ---- NOMI LIVELLI (chiavi i18n) ---- */
  const LEVEL_KEYS = {
    principiante: 'level_p_name',
    intermedio:   'level_m_name',
    avanzato:     'level_a_name',
  };

  /* ---- NAVIGAZIONE ---- */
  function goTo(screenName) {
    stopCurrentGame();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + screenName).classList.add('active');
    state.screen = screenName;
    // Reset mode UI when returning to ritmica
    if (screenName === 'ritmica') {
      document.getElementById('game-cards-grid').style.display = 'none';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    }
  }

  /* ---- SELEZIONE MODALITÀ ---- */
  function setMode(mode) {
    state.mode = mode;
    // Update mode button active state
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('mode-btn-' + mode);
    if (activeBtn) activeBtn.classList.add('active');

    // Show/hide Puzzle (solo per coro)
    const cardPuzzle = document.getElementById('card-puzzle');
    if (cardPuzzle) cardPuzzle.style.display = mode === 'coro' ? '' : 'none';

    // Aggiorna descrizioni Simon e Batti in base alla modalità
    const simonDesc = document.getElementById('simon-card-desc');
    if (simonDesc) simonDesc.textContent = I18n.t(mode === 'singoli' ? 'simon_desc_singoli' : 'simon_desc_coro');
    const battiDesc = document.getElementById('batti-card-desc');
    if (battiDesc) battiDesc.textContent = I18n.t(mode === 'singoli' ? 'batti_desc_singoli' : 'batti_desc_coro');

    // Mostra la griglia giochi
    document.getElementById('game-cards-grid').style.display = '';
  }

  function selectGame(gameName) {
    state.game = gameName;
    const descSuffix = (gameName === 'battitempo' && state.mode === 'singoli') ? '_singoli' : '_coro';
    const descKey = gameName === 'battitempo'
      ? 'game_batti_desc' + descSuffix
      : GAME_INFO[gameName].descKey;
    const info = GAME_INFO[gameName];
    document.getElementById('livello-game-title').innerHTML =
      I18n.t(info.titleKey) + ' — <span>' + I18n.t('livello_word') + '</span>';
    document.getElementById('livello-game-desc').textContent = I18n.t(descKey);
    document.getElementById('level-desc-p').textContent =
      I18n.t('level_p_bpm').replace('{bpm}', BPM_DEFAULTS.principiante);
    document.getElementById('level-desc-m').textContent =
      I18n.t('level_m_bpm').replace('{bpm}', BPM_DEFAULTS.intermedio);
    document.getElementById('level-desc-a').textContent =
      I18n.t('level_a_bpm').replace('{bpm}', BPM_DEFAULTS.avanzato);
    setBpm(80);
    goTo('livello');
  }

  function startGame(level) {
    state.level = level;
    goTo('game');
    initGame();
  }

  function exitGame() {
    stopCurrentGame();
    goTo('ritmica');
  }

  /* ---- BPM ---- */
  function setBpm(val) {
    val = Math.max(40, Math.min(200, val));
    state.bpm = val;
    const el = document.getElementById('bpm-display');
    if (el) el.textContent = val;
    const slider = document.getElementById('bpm-slider');
    if (slider) slider.value = val;
    const label = document.getElementById('game-bpm-label');
    if (label) label.textContent = val + ' BPM';
    if (state.running && currentGameObj) {
      currentGameObj.updateBpm && currentGameObj.updateBpm(val);
    }
  }

  function changeBpm(delta) {
    setBpm(state.bpm + delta);
  }

  /* ---- GIOCO CORRENTE ---- */
  let currentGameObj = null;

  function initGame() {
    const info = GAME_INFO[state.game];
    document.getElementById('game-title-bar').textContent =
      I18n.t(info.titleKey) + '  ·  ' + I18n.t(LEVEL_KEYS[state.level]);
    document.getElementById('game-bpm-label').textContent = state.bpm + ' BPM';
    document.getElementById('btn-start-stop').textContent = I18n.t('btn_start');
    state.running = false;

    const area = document.getElementById('game-area');
    area.innerHTML = '';
    area.style.cssText = '';  /* Reset stili inline lasciati da giochi precedenti */

    // Passa mode allo stato per i giochi che ne hanno bisogno
    const gameState = Object.assign({}, state);

    switch (state.game) {
      case 'simon':      currentGameObj = new SimonGame(area, gameState);      break;
      case 'treno':      currentGameObj = new TrenoGame(area, gameState);      break;
      case 'puzzle':     currentGameObj = new PuzzleGame(area, gameState);     break;
      case 'battitempo': currentGameObj = new BattiTempoGame(area, gameState); break;
    }

    syncBpmDot();
  }

  function toggleGame() {
    if (!currentGameObj) return;
    if (state.running) {
      currentGameObj.pause();
      state.running = false;
      document.getElementById('btn-start-stop').textContent = I18n.t('btn_resume');
      clearBpmDot();
    } else {
      currentGameObj.start();
      state.running = true;
      document.getElementById('btn-start-stop').textContent = I18n.t('btn_pause');
      syncBpmDot();
    }
  }

  function resetGame() {
    stopCurrentGame();
    initGame();
  }

  function toggleFullscreen() {
    var btn = document.getElementById('btn-fullscreen');
    if (!document.fullscreenElement) {
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) fn.call(el);
      if (btn) btn.textContent = '⊿⛶';
    } else {
      var fn2 = document.exitFullscreen || document.webkitExitFullscreen;
      if (fn2) fn2.call(document);
      if (btn) btn.textContent = '⛶';
    }
  }

  function stopCurrentGame() {
    if (currentGameObj) {
      currentGameObj.stop && currentGameObj.stop();
      currentGameObj = null;
    }
    state.running = false;
    clearBpmDot();
  }

  /* ---- DOT BPM HEADER ---- */
  let _dotTimer = null;

  function syncBpmDot() {
    clearBpmDot();
    const dot = document.getElementById('bpm-dot');
    if (!dot) return;
    const interval = 60000 / state.bpm;
    dot.style.animationDuration = interval + 'ms';
  }

  function clearBpmDot() {
    if (_dotTimer) { clearInterval(_dotTimer); _dotTimer = null; }
  }

  /* ---- OVERLAY MESSAGGI ---- */
  function showMessage(title, body, onOk, showCancel) {
    showCancel = showCancel || false;
    document.getElementById('msg-title').textContent = title;
    document.getElementById('msg-body').textContent  = body;
    document.getElementById('msg-cancel').style.display = showCancel ? '' : 'none';
    _pendingOk = onOk || null;
    document.getElementById('message-overlay').classList.add('active');
  }

  let _pendingOk = null;

  function closeMessage() {
    document.getElementById('message-overlay').classList.remove('active');
    if (_pendingOk) { _pendingOk(); _pendingOk = null; }
  }

  /* ---- UTILS ---- */
  function randArray(n, max) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(Math.floor(Math.random() * max));
    return arr;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ---- API PUBBLICA ---- */
  return {
    goTo, setMode, selectGame, startGame, exitGame,
    setBpm, changeBpm,
    toggleGame, resetGame, toggleFullscreen,
    showMessage, closeMessage,
    randArray, shuffle,
    get bpm()     { return state.bpm; },
    get level()   { return state.level; },
    get mode()    { return state.mode; },
    get running() { return state.running; },
  };

})();

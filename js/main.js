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
    ingressi:   { titleKey: 'game_ingressi_title', descKey: 'game_ingressi_desc', color: '#9b59b6' },
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

    // Show/hide Puzzle e Ingressi (solo per coro)
    const cardPuzzle = document.getElementById('card-puzzle');
    if (cardPuzzle) cardPuzzle.style.display = mode === 'coro' ? '' : 'none';
    const cardIngressi = document.getElementById('card-ingressi');
    if (cardIngressi) cardIngressi.style.display = mode === 'coro' ? '' : 'none';

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
    if (gameName === 'ingressi') {
      document.getElementById('level-desc-p').textContent = 'Entrate ogni 4 battute · suggerito ' + BPM_DEFAULTS.principiante + ' BPM';
      document.getElementById('level-desc-m').textContent = 'Entrate ogni 2 battute · suggerito ' + BPM_DEFAULTS.intermedio + ' BPM';
      document.getElementById('level-desc-a').textContent = 'Canone stretto: entrate ogni battuta · suggerito ' + BPM_DEFAULTS.avanzato + ' BPM';
    } else {
      document.getElementById('level-desc-p').textContent =
        I18n.t('level_p_bpm').replace('{bpm}', BPM_DEFAULTS.principiante);
      document.getElementById('level-desc-m').textContent =
        I18n.t('level_m_bpm').replace('{bpm}', BPM_DEFAULTS.intermedio);
      document.getElementById('level-desc-a').textContent =
        I18n.t('level_a_bpm').replace('{bpm}', BPM_DEFAULTS.avanzato);
    }
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
      case 'ingressi':   currentGameObj = new IngressiGame(area, gameState);   break;
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

/* ===========================
   CELEBRATION
   Confetti esplosione + suono vittoria + banner
   Chiamato da _finish() nei giochi.
   =========================== */
const Celebration = (() => {

  const COLORS = ['#ff4444','#ffaa00','#3ab4ff','#22e87a','#ff3a5e','#ffffff','#ffdd00'];
  let _audioCtx = null;

  function _getCtx() {
    try {
      if (!_audioCtx || _audioCtx.state === 'closed')
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
    return _audioCtx;
  }

  /* Accordo do maggiore arpeggiato (do-mi-sol-do') */
  function playVictory() {
    var ctx = _getCtx();
    if (!ctx) return;
    var resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    resume.then(function() {
      var freqs   = [261.63, 329.63, 392.00, 523.25];
      var now     = ctx.currentTime;
      freqs.forEach(function(freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = now + i * 0.07;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        osc.start(t); osc.stop(t + 1.7);
      });
    });
  }

  /* Lancia i confetti dal centro */
  function _launchConfetti() {
    var overlay = document.getElementById('confetti-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    var count = 72;
    for (var i = 0; i < count; i++) {
      (function(idx) {
        var el    = document.createElement('div');
        var angle = (idx / count) * 360 + (Math.random() - 0.5) * 20;
        var dist  = 120 + Math.random() * 240;
        var size  = 7 + Math.random() * 11;
        var color = COLORS[Math.floor(Math.random() * COLORS.length)];
        var dur   = 0.9 + Math.random() * 0.6;
        var rot   = (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 260);
        var rad   = angle * Math.PI / 180;
        var tx    = Math.cos(rad) * dist;
        var ty    = Math.sin(rad) * dist;
        var shape = Math.random() > 0.45 ? '50%' : '2px';
        /* cssText non supporta custom properties: usiamo setProperty */
        el.style.position   = 'absolute';
        el.style.left       = '50%';
        el.style.top        = '50%';
        el.style.width      = size.toFixed(1) + 'px';
        el.style.height     = size.toFixed(1) + 'px';
        el.style.background = color;
        el.style.borderRadius = shape;
        el.style.animation  = 'confettiBurst ' + dur.toFixed(2) + 's ease-out ' + (idx * 0.008).toFixed(3) + 's both';
        el.style.setProperty('--tx',  tx.toFixed(1)  + 'px');
        el.style.setProperty('--ty',  ty.toFixed(1)  + 'px');
        el.style.setProperty('--rot', rot.toFixed(0) + 'deg');
        overlay.appendChild(el);
      })(i);
    }
    setTimeout(function() { overlay.innerHTML = ''; }, 2200);
  }

  /* Banner "Ottimo!" con pop in/out */
  function _showBanner(msg) {
    var banner = document.getElementById('completion-banner');
    var textEl = document.getElementById('completion-text');
    if (!banner) return;
    if (textEl) textEl.textContent = msg || 'Ottimo!';
    banner.className = '';
    banner.style.display = 'block';
    void banner.offsetWidth;
    banner.classList.add('pop-in');
    setTimeout(function() {
      banner.classList.remove('pop-in');
      banner.classList.add('fade-out');
      setTimeout(function() {
        banner.style.display = 'none';
        banner.className = '';
      }, 420);
    }, 2200);
  }

  function show(msg) {
    _launchConfetti();
    playVictory();
    _showBanner(msg);
  }

  return { show: show, playVictory: playVictory };

})();


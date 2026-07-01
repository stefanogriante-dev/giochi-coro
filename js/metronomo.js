/* ===========================
   METRONOMO STANDALONE
   Look-ahead Web Audio scheduler +
   display visivo DOM sincronizzato.
   =========================== */

const MetroApp = (() => {

  var bpm   = 80;
  var BEATS = 4;       /* battute per misura (4/4) */

  var _playing   = false;
  var _audioCtx  = null;
  var _active    = false;
  var _timerId   = null;
  var _nextBeat  = 0;        /* prossimo beat da pianificare (0-based assoluto) */
  var _wallStart = 0;        /* performance.now() al momento di start() */

  /* ================================
     CONTROLLI PUBBLICI
     ================================ */
  function toggle() {
    if (_playing) _stop(); else _start();
  }

  function setBpm(val) {
    val = Math.max(20, Math.min(300, +val));
    bpm = val;
    var el = document.getElementById('metro-bpm-val');
    if (el) el.textContent = val;
    var sl = document.getElementById('metro-slider');
    if (sl) sl.value = val;
  }

  function changeBpm(delta) { setBpm(bpm + delta); }

  /* ================================
     START / STOP
     ================================ */
  function _start() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
    } catch(e) { return; }

    _playing   = true;
    _active    = true;
    _nextBeat  = 0;
    _wallStart = performance.now();

    _schedulerLoop();

    var btn = document.getElementById('metro-start-btn');
    if (btn) btn.textContent = I18n.t('metro_stop');
  }

  function _stop() {
    _playing = false;
    _active  = false;
    if (_timerId) { clearTimeout(_timerId); _timerId = null; }

    var btn = document.getElementById('metro-start-btn');
    if (btn) btn.textContent = I18n.t('metro_start');
    _resetVisual();
  }

  /* ================================
     LOOK-AHEAD SCHEDULER
     Ogni 25 ms pianifica i click dei
     prossimi 120 ms sull'orologio
     preciso di AudioContext.
     ================================ */
  function _schedulerLoop() {
    if (!_active || !_audioCtx) return;

    var AHEAD    = 0.12;
    var bps      = bpm / 60;
    var beatInt  = 1.0 / bps;
    var audioNow = _audioCtx.currentTime;

    var wallElapsed = (performance.now() - _wallStart) / 1000;
    var currentBeat = wallElapsed * bps;   /* beat corrente (0 = avvio) */

    while (true) {
      var secsUntil = (_nextBeat - currentBeat) * beatInt;
      if (secsUntil > AHEAD) break;

      var audioTime = audioNow + Math.max(0, secsUntil);
      var beatIdx   = _nextBeat % BEATS;
      var isDown    = beatIdx === 0;

      _playClick(audioTime, isDown);

      /* Visivo: setTimeout con lo stesso anticipo del click audio */
      (function(bi, id) {
        var delay = Math.max(0, secsUntil * 1000);
        setTimeout(function() { _updateVisual(bi, id); }, delay);
      })(_nextBeat, beatIdx);

      _nextBeat++;
    }

    _timerId = setTimeout(_schedulerLoop, 25);
  }

  /* ================================
     CLICK AUDIO (oscillatore breve)
     ================================ */
  function _playClick(audioTime, isDownbeat) {
    var ctx  = _audioCtx;
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = 'triangle';
    osc.frequency.value = isDownbeat ? 1100 : 720;
    var vol = isDownbeat ? 0.35 : 0.20;
    var dur = isDownbeat ? 0.055 : 0.038;
    gain.gain.setValueAtTime(vol, audioTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioTime + dur);
    osc.start(audioTime);
    osc.stop(audioTime + dur + 0.01);
  }

  /* ================================
     VISUAL
     ================================ */
  function _updateVisual(beatNum, beatIdx) {
    var isDown = beatIdx === 0;

    /* Numero grande centrale */
    var numEl = document.getElementById('metro-beat-num');
    if (numEl) {
      numEl.textContent = beatIdx + 1;
      numEl.className   = 'metro-beat-num' + (isDown ? ' down' : '');
      /* Riavvia l'animazione di pop */
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = '';
    }

    /* Quattro pallini in cima */
    for (var i = 0; i < BEATS; i++) {
      var dot = document.getElementById('metro-dot-' + i);
      if (!dot) continue;
      if (i === beatIdx) {
        dot.className = 'metro-dot' + (isDown ? ' down' : ' up');
      } else {
        dot.className = 'metro-dot';
      }
    }

    /* Flash del cerchio sfondo */
    var disp = document.getElementById('metro-display');
    if (disp) {
      disp.classList.remove('flash-down', 'flash-up');
      void disp.offsetWidth;
      disp.classList.add(isDown ? 'flash-down' : 'flash-up');
    }
  }

  function _resetVisual() {
    var numEl = document.getElementById('metro-beat-num');
    if (numEl) { numEl.textContent = '-'; numEl.className = 'metro-beat-num'; }
    for (var i = 0; i < BEATS; i++) {
      var dot = document.getElementById('metro-dot-' + i);
      if (dot) dot.className = 'metro-dot';
    }
    var disp = document.getElementById('metro-display');
    if (disp) disp.className = '';
  }

  /* Espone l'API pubblica */
  return { toggle: toggle, setBpm: setBpm, changeBpm: changeBpm };

})();

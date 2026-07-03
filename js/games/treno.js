/* ===========================
   IL TRENO CHE ACCELERA
   Metronomo visivo con pallina che
   scompare per N battute (test memoria)
   =========================== */

class TrenoGame {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.bpm = state.bpm;

    var cfg = {
      principiante: { visibleBeats: 8,  hiddenBeats: 4,  totalCycles: 4 },
      intermedio:   { visibleBeats: 8,  hiddenBeats: 8,  totalCycles: 5 },
      avanzato:     { visibleBeats: 8,  hiddenBeats: 12, totalCycles: 6 },
    };
    this.cfg = cfg[state.level] || cfg.intermedio;

    this._beatCount  = 0;
    this._globalBeat = 0;
    this._phase      = 'idle';
    this._cycleCount = 0;
    this._timer      = null;
    this._cdTimer    = null;
    this._audioCtx   = null;
    this._playing    = false;

    this._build();
  }

  _build() {
    var total = this.cfg.visibleBeats + this.cfg.hiddenBeats;
    var dotsHtml = '';
    for (var i = 0; i < total; i++) {
      dotsHtml += '<div class="treno-beat-dot" id="tbd-' + i + '"></div>';
    }
    this.container.innerHTML =
      '<div id="treno-container">' +
        '<div id="treno-phase-label">' + I18n.t('press_start_short') + '</div>' +
        '<div id="treno-beat-num">-</div>' +
        '<div id="treno-track">' +
          '<div id="treno-rail"></div>' +
          '<div id="treno-ball"></div>' +
        '</div>' +
        '<div id="treno-beats">' + dotsHtml + '</div>' +
        '<div id="treno-beat-counter"></div>' +
      '</div>';
  }

  get _beatMs() {
    return Math.round(60000 / this.bpm);
  }

  start() {
    if (this._playing) return;
    this._playing    = true;
    this._beatCount  = 0;
    this._cycleCount = 0;
    this._globalBeat = 0;
    var self = this;
    this._playCountdown(function() {
      if (!self._playing) return;
      self._startCycle('visible');
    });
  }

  pause() {
    this._playing = false;
    this._clearTimer();
    this._setPhaseLabel(I18n.t('paused'));
    this._hideBall();
  }

  stop() {
    this._playing = false;
    this._clearTimer();
  }

  updateBpm(bpm) {
    this.bpm = bpm;
    if (this._playing) {
      this._clearTimer();
      this._tick();
    }
  }

  _startCycle(phase) {
    this._phase      = phase;
    this._beatCount  = 0;

    if (phase === 'visible') {
      this._showBall();
      this._showHelpers(true);
      this._setPhaseLabel('Seguite il treno!');
    } else {
      this._hideBall();
      this._showHelpers(false);
      this._setPhaseLabel('Treno nascosto - mantenete il tempo a memoria!');
    }

    this._tick();
  }

  _tick() {
    if (!this._playing) return;

    var self   = this;
    var beatMs = this._beatMs;
    var total  = this._phase === 'visible' ? this.cfg.visibleBeats : this.cfg.hiddenBeats;

    if (this._phase === 'visible') {
      this._flashBeat();
      this._updateDot();
      this._moveBall();
      this._playClick();
      var counter = document.getElementById('treno-beat-counter');
      if (counter) {
        counter.textContent = I18n.t('cycle').replace('{n}', this._cycleCount + 1).replace('{total}', this.cfg.totalCycles);
        counter.style.opacity = '1';
      }
    }

    this._beatCount++;
    this._globalBeat++;

    if (this._beatCount >= total) {
      if (this._phase === 'visible') {
        this._timer = setTimeout(function() {
          if (!self._playing) return;
          self._cycleCount++;
          if (self._cycleCount >= self.cfg.totalCycles) {
            self._finish();
          } else {
            self._startCycle('hidden');
          }
        }, beatMs);
      } else {
        this._timer = setTimeout(function() {
          if (!self._playing) return;
          self._startCycle('visible');
        }, beatMs);
      }
      return;
    }

    this._timer = setTimeout(function() { self._tick(); }, beatMs);
  }

  _moveBall() {
    var total    = this.cfg.visibleBeats;
    var fraction = (this._beatCount % total) / (total - 1);
    var ball     = document.getElementById('treno-ball');
    if (ball) {
      ball.style.left = (fraction * 100) + '%';
      ball.classList.add('beat-flash');
      setTimeout(function() { ball.classList.remove('beat-flash'); }, 120);
    }
  }

  _showBall() {
    var ball = document.getElementById('treno-ball');
    if (ball) {
      ball.style.opacity    = '1';
      ball.style.transition = 'left 0.12s linear, opacity 0.3s';
    }
  }

  _hideBall() {
    var ball = document.getElementById('treno-ball');
    if (ball) ball.style.opacity = '0';
  }

  /* Nasconde/mostra numero beat, dot e contatore durante la fase hidden */
  _showHelpers(show) {
    var op   = show ? '1' : '0';
    var num  = document.getElementById('treno-beat-num');
    var dots = document.getElementById('treno-beats');
    var ctr  = document.getElementById('treno-beat-counter');
    if (num)  num.style.opacity  = op;
    if (dots) dots.style.opacity = op;
    if (ctr)  ctr.style.opacity  = op;
  }

  _flashBeat() {
    var num = document.getElementById('treno-beat-num');
    if (!num) return;
    num.textContent = (this._beatCount % 4) + 1;
    num.classList.add('flash');
    setTimeout(function() { num.classList.remove('flash'); }, 100);
  }

  _updateDot() {
    var total       = this.cfg.visibleBeats + this.cfg.hiddenBeats;
    var beatInCycle = this._beatCount;
    for (var i = 0; i < total; i++) {
      var dot = document.getElementById('tbd-' + i);
      if (!dot) continue;
      dot.classList.remove('active', 'past');
      if (i < beatInCycle)   dot.classList.add('past');
      if (i === beatInCycle) dot.classList.add('active');
    }
  }

  /* ============================
     AUDIO
     ============================ */
  _initAudio() {
    try {
      if (!this._audioCtx)
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    } catch(e) {}
  }

  /* Countdown 4 battiti prima di partire */
  _playCountdown(callback) {
    var self    = this;
    var beatSec = 60 / this.bpm;
    var beatMs  = Math.round(60000 / this.bpm);

    this._initAudio();

    var scheduleClicks = function() {
      if (!self._audioCtx) return;
      var ctx = self._audioCtx, now = ctx.currentTime;
      for (var i = 0; i < 4; i++) {
        (function(idx) {
          var t = now + idx * beatSec;
          try {
            var osc = ctx.createOscillator(), g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = idx === 0 ? 1100 : 720;
            g.gain.setValueAtTime(idx === 0 ? 0.35 : 0.22, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
            osc.start(t); osc.stop(t + 0.07);
          } catch(e) {}
        })(i);
      }
    };

    if (this._audioCtx && this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().then(scheduleClicks, scheduleClicks);
    } else {
      scheduleClicks();
    }

    /* Countdown visivo nel numero beat */
    var numEl = document.getElementById('treno-beat-num');
    for (var i = 0; i < 4; i++) {
      (function(idx) {
        setTimeout(function() {
          if (!self._playing) return;
          if (numEl) { numEl.textContent = idx + 1; numEl.classList.add('flash'); }
          setTimeout(function() { if (numEl) numEl.classList.remove('flash'); }, 100);
        }, idx * beatMs);
      })(i);
    }

    this._cdTimer = setTimeout(function() {
      if (numEl) numEl.textContent = '-';
      callback();
    }, 4 * beatMs);
  }

  /* Click sul beat (solo fase visibile) */
  _playClick() {
    this._initAudio();
    if (!this._audioCtx) return;
    var ctx = this._audioCtx;
    var t   = ctx.currentTime;
    var isDown = (this._beatCount % 4) === 0;
    try {
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = isDown ? 1100 : 720;
      g.gain.setValueAtTime(isDown ? 0.30 : 0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t); osc.stop(t + 0.065);
    } catch(e) {}
  }

  _finish() {
    this._playing = false;
    this._showBall();
    this._showHelpers(true);
    this._setPhaseLabel(I18n.t('well_done'));
    var counter = document.getElementById('treno-beat-counter');
    if (counter) counter.textContent = I18n.t('ex_completed');
    if (typeof Celebration !== 'undefined') Celebration.show('Ottimo!');
  }

  _setPhaseLabel(txt) {
    var el = document.getElementById('treno-phase-label');
    if (el) el.textContent = txt;
  }

  _clearTimer() {
    if (this._timer)   { clearTimeout(this._timer);   this._timer   = null; }
    if (this._cdTimer) { clearTimeout(this._cdTimer); this._cdTimer = null; }
  }
}

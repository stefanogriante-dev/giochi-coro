/* ===========================
   SIMON RITMICO
   4 zone colorate (SATB)
   - Scelta gesto: solo mani / misto
   - Bottoni: Ripeti / Nuova Sequenza
   =========================== */

class SimonGame {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.bpm = state.bpm;
    this._step = 0;

    /* Modalita: 'coro' = 4 voci SATB, 'singoli' = 4 gesti */
    var isSingoli = state.mode === 'singoli';
    if (isSingoli) {
      this.voices = [
        { key: 's', label: '👏', name: I18n.t('gesture_clap'), color: '#e74c3c', gesture: '👏' },
        { key: 'a', label: '🫰', name: I18n.t('gesture_snap'), color: '#f39c12', gesture: '🫰' },
        { key: 't', label: '🦶', name: I18n.t('gesture_foot'), color: '#3498db', gesture: '🦶' },
        { key: 'b', label: '🙌', name: I18n.t('gesture_up'),   color: '#2ecc71', gesture: '🙌' },
      ];
    } else {
      this.voices = [
        { key: 's', label: 'S', name: 'Soprani',   color: '#e74c3c' },
        { key: 'a', label: 'A', name: 'Contralti', color: '#f39c12' },
        { key: 't', label: 'T', name: 'Tenori',    color: '#3498db' },
        { key: 'b', label: 'B', name: 'Bassi',     color: '#2ecc71' },
      ];
    }

    var cfg = {
      principiante: { startLen: 3, maxLen: 10 },
      intermedio:   { startLen: 4, maxLen: 14 },
      avanzato:     { startLen: 5, maxLen: 18 },
    };
    this.cfg = cfg[state.level] || cfg.intermedio;

    this.gestureMode = null;
    this.sequence    = [];
    this._audioCtx   = null;
    this.seqLen      = this.cfg.startLen;
    this._timer      = null;
    this._playing    = false;

    this._buildModeSelector();
  }

  /* ============================
     FASE 1 — scelta modalita
     ============================ */
  _buildModeSelector() {
    if (this.state.mode === 'singoli') {
      this.gestureMode = 'singoli';
      this._buildGameUI();
      return;
    }
    var SNAP = '\u{1FAF0}'; // schiocco dita (Unicode 14)
    var html = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:32px;padding:32px;">';
    html += '<div style="font-size:1.5rem;font-weight:800;color:#eaeaea;text-align:center;">Scegli il tipo di gesto</div>';
    html += '<div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;">';

    html += '<div id="btn-mode-mani" onclick="window._simonSetMode(\'mani\')" style="background:#1a1a2e;border:3px solid #444;border-radius:20px;padding:40px 48px;cursor:pointer;text-align:center;transition:all 0.2s;min-width:220px;">';
    html += '<div style="font-size:5rem;margin-bottom:16px;">\u{1F44F}</div>';
    html += '<div style="font-size:1.3rem;font-weight:800;color:#eaeaea;">Solo battito di mani</div>';
    html += '<div style="font-size:0.9rem;color:#8892a4;margin-top:8px;">Ogni sezione batte le mani</div>';
    html += '</div>';

    html += '<div id="btn-mode-misto" onclick="window._simonSetMode(\'misto\')" style="background:#1a1a2e;border:3px solid #444;border-radius:20px;padding:40px 48px;cursor:pointer;text-align:center;transition:all 0.2s;min-width:220px;">';
    html += '<div style="font-size:5rem;margin-bottom:16px;">\u{1F44F} + \u{1FAF0}</div>';
    html += '<div style="font-size:1.3rem;font-weight:800;color:#eaeaea;">Misto</div>';
    html += '<div style="font-size:0.9rem;color:#8892a4;margin-top:8px;">Mani e schiocco di dita a sorpresa</div>';
    html += '</div>';

    html += '</div>';
    html += '<div style="font-size:0.9rem;color:#555;text-align:center;max-width:400px;">Nel gioco misto ogni zona mostrera\u0300 casualmente \u{1F44F} o \u{1FAF0} \u2014 dovrete fare il gesto giusto!</div>';
    html += '</div>';

    this.container.innerHTML = html;

    var self = this;
    window._simonSetMode = function(mode) {
      self.gestureMode = mode;
      self._buildGameUI();
    };

    ['mani', 'misto'].forEach(function(mode) {
      var el = document.getElementById('btn-mode-' + mode);
      if (!el) return;
      el.addEventListener('pointerenter', function() {
        el.style.borderColor = '#e94560';
        el.style.transform   = 'translateY(-4px)';
        el.style.boxShadow   = '0 12px 32px rgba(233,69,96,0.3)';
      });
      el.addEventListener('pointerleave', function() {
        el.style.borderColor = '#444';
        el.style.transform   = 'none';
        el.style.boxShadow   = 'none';
      });
    });
  }

  /* ============================
     FASE 2 — UI di gioco
     ============================ */
  _buildGameUI() {
    var self = this;
    var isMobile = window.innerWidth <= 768;

    this.container.style.flexDirection  = isMobile ? 'column' : 'row';
    this.container.style.alignItems     = isMobile ? 'stretch' : 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.padding        = isMobile ? '8px' : '24px 16px';
    this.container.style.gap            = '0px';

    var gridStyle = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;' +
        (isMobile
          ? 'gap:8px;width:100%;height:calc(100% - 120px);'
          : 'gap:12px;width:calc(100% - 200px);height:100%;max-width:780px;max-height:520px;');

    var gridHtml = '<div id="simon-grid" style="' + gridStyle + '">';
    this.voices.forEach(function(v) {
      var gestStyle = 'font-size:4rem;opacity:0;transition:opacity 0.1s,transform 0.15s;' +
                      'position:absolute;top:50%;left:50%;' +
                      'transform:translate(-50%,-50%);pointer-events:none;';
      var _isS = self.state.mode === 'singoli';
      gridHtml += '<div class="simon-zone ' + v.key + '" id="sz-' + v.key + '">';
      var labelStyle = _isS
        ? 'font-size:clamp(50px,8vh,90px);opacity:0.9;margin-bottom:6px;transition:opacity 0.1s;'
        : 'font-size:clamp(60px,10vh,120px);font-weight:900;opacity:0.85;letter-spacing:2px;margin-bottom:6px;';
      gridHtml += '<div class="simon-zone-label" id="slabel-' + v.key + '" style="' + labelStyle + '">' + (_isS ? v.label : v.label) + '</div>';
      gridHtml += '<div class="simon-gesture" id="sgesture-' + v.key + '" style="' + gestStyle + '">' + (_isS ? v.gesture : '\u{1F44F}') + '</div>';
      var nameStyle = _isS
        ? 'font-size:clamp(20px,2.8vh,32px);font-weight:700;opacity:0.9;text-transform:uppercase;letter-spacing:3px;'
        : 'font-size:clamp(20px,2.8vh,32px);font-weight:700;opacity:0.9;text-transform:uppercase;letter-spacing:3px;';
      gridHtml += '<div class="simon-zone-name" style="' + nameStyle + '">' + v.name + '</div>';
      gridHtml += '</div>';
    });
    gridHtml += '</div>';

    var isMisto    = this.gestureMode === 'misto';
    var badgeBg    = isMisto ? '#2a1a3e' : '#1a2a1e';
    var badgeBord  = isMisto ? '#9b59b6' : '#2ecc71';
    var badgeColor = isMisto ? '#9b59b6' : '#2ecc71';
    var badgeText  = isMisto ? '\u{1F44F} + \u{1FAF0} Misto' : '\u{1F44F} Solo mani';

    var sideStyle = isMobile
      ? 'display:flex;flex-direction:row;align-items:center;justify-content:space-around;width:100%;height:112px;padding:8px 12px;gap:10px;flex-shrink:0;overflow:hidden;'
      : 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:180px;gap:20px;padding:16px;flex-shrink:0;';
    var sideHtml  = '<div id="simon-side" style="' + sideStyle + '">';

    sideHtml += '<div id="simon-status" style="font-size:1rem;font-weight:700;color:#eaeaea;text-align:center;min-height:48px;line-height:1.4;">' + I18n.t('press_start') + '</div>';
    sideHtml += '<div id="simon-seq-info" style="font-size:0.85rem;color:#8892a4;text-align:center;"></div>';
    if (self.state.mode !== 'singoli') {
      sideHtml += '<div style="background:' + badgeBg + ';border:1px solid ' + badgeBord + ';border-radius:99px;padding:6px 14px;font-size:0.8rem;font-weight:700;color:' + badgeColor + ';">' + badgeText + '</div>';
    }

    var btnRepStyle  = 'background:#1a1a2e;border:2px solid #e74c3c;color:#e74c3c;font-size:0.95rem;font-weight:700;padding:12px 16px;border-radius:12px;cursor:pointer;font-family:inherit;width:100%;';
    var btnNextStyle = 'background:#e94560;border:2px solid #e94560;color:white;font-size:0.95rem;font-weight:700;padding:12px 16px;border-radius:12px;cursor:pointer;font-family:inherit;width:100%;';
    var btnChgStyle  = 'background:transparent;border:1px solid #333;color:#666;font-size:0.75rem;padding:6px 12px;border-radius:99px;cursor:pointer;font-family:inherit;margin-top:8px;';

    sideHtml += '<div id="simon-action-btns" style="display:none;flex-direction:column;gap:12px;width:100%;">';
    sideHtml += '<button onclick="window._simonRepeat()" style="' + btnRepStyle + '">' + I18n.t('simon_repeat') + '</button>';
    sideHtml += '<button onclick="window._simonNext()" style="' + btnNextStyle + '">' + I18n.t('new_seq') + '</button>';
    sideHtml += '</div>';
    if (self.state.mode !== 'singoli') {
      sideHtml += '<button onclick="window._simonChangeMode()" style="' + btnChgStyle + '">';
      sideHtml += '\u21A9 Cambia gesto</button>';
    }
    sideHtml += '</div>';

    this.container.innerHTML = gridHtml + sideHtml;

    this._generateSequence();

    var self = this;
    window._simonRepeat = function() { if (!self._playing) self._playSequence(); };
    window._simonNext   = function() {
      if (!self._playing) {
        if (self.seqLen < self.cfg.maxLen) self.seqLen++;
        self._generateSequence();
        self._playSequence();
      }
    };
    window._simonChangeMode = function() {
      self.stop();
      self.container.style.flexDirection  = '';
      self.container.style.alignItems     = '';
      self.container.style.justifyContent = '';
      self.container.style.padding        = '';
      self.container.style.gap            = '';
      self._buildModeSelector();
    };
  }

  /* ============================
     SEQUENZA
     ============================ */
  _generateSequence() {
    var isMisto = this.gestureMode === 'misto';
    var isSingoli3 = this.state.mode === 'singoli';
    var CLAP = '\u{1F44F}';
    var SNAP = '\u{1FAF0}';
    this.sequence = [];
    for (var i = 0; i < this.seqLen; i++) {
      var voiceIdx = Math.floor(Math.random() * 4);
      var gesture;
      if (isSingoli3) {
        gesture = this.voices[voiceIdx].gesture;
      } else {
        gesture = (isMisto && Math.random() < 0.5) ? SNAP : CLAP;
      }
      this.sequence.push({ voiceIdx: voiceIdx, gesture: gesture });
    }
    var info = document.getElementById('simon-seq-info');
    if (info) {
      var round = this.seqLen - this.cfg.startLen + 1;
      info.textContent = I18n.t('seq_info').replace('{len}', this.seqLen).replace('{round}', round);
    }
  }

  get _beatMs() {
    return Math.round(60000 / this.bpm);
  }

  /* ============================
     START / PAUSE / STOP
     ============================ */
  start() {
    if (this.gestureMode) this._playSequence();
  }

  pause() {
    this._playing = false;
    this._clearTimer();
    this._deactivateAll();
    this._setStatus(I18n.t('paused'));
  }

  stop() {
    this._playing = false;
    this._clearTimer();
    this._deactivateAll();
  }

  updateBpm(bpm) {
    this.bpm = bpm;
  }

  /* ============================
     PLAYBACK
     ============================ */
  _playSequence() {
    if (this._playing) return;
    this._playing = true;
    this._showActionBtns(false);
    this._setStatus(I18n.t(this.state.mode === 'singoli' ? 'listening_s' : 'listening'));
    this._step = 0;
    var self = this;
    setTimeout(function() { self._scheduleNext(); }, 200);
  }

  _scheduleNext() {
    if (!this._playing) return;
    var self = this;
    var beat = this._beatMs;

    if (this._step >= this.sequence.length) {
      this._playing = false;
      this._setStatus(I18n.t(this.state.mode === 'singoli' ? 'your_turn_s' : 'your_turn'));
      this._showActionBtns(true);
      return;
    }

    var item = this.sequence[this._step];
    this._activateZone(item.voiceIdx, item.gesture);

    this._timer = setTimeout(function() {
      self._deactivateAll();
      self._timer = setTimeout(function() {
        if (!self._playing) return;
        self._step++;
        self._scheduleNext();
      }, beat * 0.15);
    }, beat * 0.75);
  }

  /* ============================
     UI HELPERS
     ============================ */
  _activateZone(idx, gesture) {
    this._deactivateAll();
    this._playGestureSound(gesture);
    var v    = this.voices[idx];
    var zone = document.getElementById('sz-' + v.key);
    var lbl  = document.getElementById('slabel-' + v.key);
    var gest = document.getElementById('sgesture-' + v.key);

    if (zone) zone.classList.add('active');
    if (lbl)  lbl.style.opacity = '0';
    if (gest) {
      gest.textContent     = gesture;
      gest.style.opacity   = '1';
      gest.style.transform = 'translate(-50%,-50%) scale(1.2)';
      setTimeout(function() {
        if (gest) gest.style.transform = 'translate(-50%,-50%) scale(1)';
      }, 120);
    }
  }

  /* ============================
     AUDIO SINTETICO PER GESTI
     ============================ */
  _initAudio() {
    try {
      if (!this._audioCtx)
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    } catch(e) {}
  }

  _playGestureSound(gesture) {
    this._initAudio();
    if (!this._audioCtx) return;
    var ctx = this._audioCtx;
    var t   = ctx.currentTime;
    try {
      if (gesture === '🫰') {        /* schiocco dita */
        this._soundSnap(ctx, t);
      } else if (gesture === '🦶') { /* piede */
        this._soundFoot(ctx, t);
      } else if (gesture === '🙌') { /* mani in alto: nessun suono */
        /* silenzio */
      } else {                               /* mani (clap / misto) */
        this._soundClap(ctx, t);
      }
    } catch(e) {}
  }

  _soundClap(ctx, t) {
    var sr = ctx.sampleRate, len = Math.round(sr * 0.18);
    var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 1.5);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1100; bp.Q.value=0.6;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.85,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t);
  }

  _soundSnap(ctx, t) {
    var sr = ctx.sampleRate, len = Math.round(sr * 0.04);
    var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 5);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3500;
    var g = ctx.createGain(); g.gain.setValueAtTime(1.0,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    src.connect(hp); hp.connect(g); g.connect(ctx.destination); src.start(t);
  }

  _soundFoot(ctx, t) {
    /* Tonfo molto grave: scende da 55 Hz a 18 Hz con decay lungo */
    var osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type='sine'; osc.frequency.setValueAtTime(55,t); osc.frequency.exponentialRampToValueAtTime(18,t+0.35);
    og.gain.setValueAtTime(2.0,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.40);
    osc.connect(og); og.connect(ctx.destination); osc.start(t); osc.stop(t+0.40);
    /* Secondo oscillatore sub-basso per corpo */
    var osc2 = ctx.createOscillator(), og2 = ctx.createGain();
    osc2.type='triangle'; osc2.frequency.setValueAtTime(40,t); osc2.frequency.exponentialRampToValueAtTime(14,t+0.30);
    og2.gain.setValueAtTime(1.4,t); og2.gain.exponentialRampToValueAtTime(0.001,t+0.35);
    osc2.connect(og2); og2.connect(ctx.destination); osc2.start(t); osc2.stop(t+0.35);
    /* Rumore d impatto breve */
    var sr = ctx.sampleRate, len = Math.round(sr*0.05);
    var buf = ctx.createBuffer(1,len,sr), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,3);
    var ns = ctx.createBufferSource(); ns.buffer = buf;
    var lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400;
    var ng = ctx.createGain(); ng.gain.setValueAtTime(0.9,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    ns.connect(lp); lp.connect(ng); ng.connect(ctx.destination); ns.start(t);
  }

  _deactivateAll() {
    this.voices.forEach(function(v) {
      var zone = document.getElementById('sz-' + v.key);
      var lbl  = document.getElementById('slabel-' + v.key);
      var gest = document.getElementById('sgesture-' + v.key);
      if (zone) zone.classList.remove('active');
      if (lbl)  lbl.style.opacity = '0.5';
      if (gest) gest.style.opacity = '0';
    });
  }

  _setStatus(txt) {
    var el = document.getElementById('simon-status');
    if (el) el.textContent = txt;
  }

  _showActionBtns(show) {
    var el = document.getElementById('simon-action-btns');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  _clearTimer() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }
}

/* ===========================
   GUIDA AGLI INGRESSI  v4
   Tutti gli stili inline — nessuna dipendenza da classi CSS.
   =========================== */

class IngressiGame {

  constructor(container, state) {
    this.container   = container;
    this.bpm         = state.bpm;
    this.beatsPerBar = 4;

    var off = { principiante: 4, intermedio: 2, avanzato: 1 }[state.level] || 4;

    this.voices = [
      { key: 's', label: 'S', name: 'Soprani',   color: '#c0392b', dark: 'rgba(0,0,0,0.38)' },
      { key: 'a', label: 'A', name: 'Contralti', color: '#b07d0d', dark: 'rgba(0,0,0,0.38)' },
      { key: 't', label: 'T', name: 'Tenori',    color: '#1a6fa0', dark: 'rgba(0,0,0,0.38)' },
      { key: 'b', label: 'B', name: 'Bassi',     color: '#1a7a4a', dark: 'rgba(0,0,0,0.38)' },
    ];

    this._slots = [
      { vi: 0, bar: 0,       beat: 0 },
      { vi: 1, bar: off,     beat: 0 },
      { vi: 2, bar: off * 2, beat: 0 },
      { vi: 3, bar: off * 3, beat: 0 },
    ];

    this._beat           = 0;
    this._playing        = false;
    this._timer          = null;
    this._cdTimer        = null;
    this._audioCtx       = null;
    this._voiceStates    = ['wait','wait','wait','wait'];
    this._configListener = null;
    this._changeListener = null;

    this._buildConfig();
  }

  /* === helpers === */

  _entryBeat(si) {
    return this._slots[si].bar * this.beatsPerBar + this._slots[si].beat;
  }

  get _beatMs() { return Math.round(60000 / this.bpm); }

  /* === stili inline condivisi === */

  _S() {
    /* Stili comuni riusabili */
    return {
      grid: [
        'display:grid',
        'grid-template-columns:1fr 1fr',
        'grid-template-rows:1fr 1fr',
        'gap:14px',
        'width:calc(100% - 80px)',
        'height:calc(100% - 80px)',
        'box-sizing:border-box',
      ].join(';'),

      cell: function(color) {
        return [
          'border-radius:22px',
          'display:flex',
          'flex-direction:column',
          'overflow:hidden',
          'background:' + color,
          'box-shadow:0 6px 32px rgba(0,0,0,0.45)',
          'transition:filter 0.15s,transform 0.12s',
        ].join(';');
      },

      voice: [
        'flex:1',
        'min-height:0',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'gap:10px',
        'cursor:pointer',
        'padding:16px 8px 10px',
        'user-select:none',
        '-webkit-user-select:none',
      ].join(';'),

      letter: [
        'display:block',
        'font-size:clamp(3.8rem,9vw,8.5rem)',
        'font-weight:900',
        'color:rgba(255,255,255,0.93)',
        'line-height:1',
        'text-shadow:0 4px 20px rgba(0,0,0,0.5)',
        'font-family:inherit',
        'text-align:center',
      ].join(';'),

      name: [
        'display:block',
        'font-size:clamp(0.72rem,1.6vw,1.2rem)',
        'font-weight:800',
        'letter-spacing:5px',
        'color:rgba(255,255,255,0.68)',
        'text-transform:uppercase',
        'font-family:inherit',
        'text-align:center',
      ].join(';'),

      bottom: [
        'flex-shrink:0',
        'display:flex',
        'flex-direction:row',
        'gap:12px',
        'padding:12px 16px 16px',
        'background:rgba(0,0,0,0.35)',
        'border-top:1px solid rgba(255,255,255,0.12)',
        'justify-content:center',
        'align-items:stretch',
      ].join(';'),

      selGroup: [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'gap:4px',
        'flex:1',
        'max-width:200px',
      ].join(';'),

      selLabel: [
        'display:block',
        'font-size:clamp(0.55rem,1.1vw,0.72rem)',
        'font-weight:800',
        'letter-spacing:3px',
        'color:rgba(255,255,255,0.45)',
        'text-transform:uppercase',
        'font-family:inherit',
      ].join(';'),

      sel: [
        'width:100%',
        'background:rgba(255,255,255,0.12)',
        'border:2px solid rgba(255,255,255,0.30)',
        'border-radius:12px',
        'color:#fff',
        'font-size:clamp(0.82rem,1.6vw,1.02rem)',
        'font-weight:700',
        'padding:8px 10px',
        'cursor:pointer',
        'outline:none',
        'font-family:inherit',
        'appearance:auto',
        '-webkit-appearance:auto',
        'transition:background 0.15s,border-color 0.15s',
      ].join(';'),
    };
  }


  /* ===========================
     CONFIG
     =========================== */

  _buildConfig() {
    var self = this;
    this.container.style.cssText = '';   /* lascia .game-area flex centrato */

    var S   = this._S();
    var html = '<div id="ing-grid" style="' + S.grid + '">';
    this._slots.forEach(function(slot, si) {
      html += self._cellHtml(si, self.voices[slot.vi], 'config', S);
    });
    html += '</div>';
    this.container.innerHTML = html;

    var root = document.getElementById('ing-grid');

    this._configListener = function(e) {
      var vDiv = e.target.closest('[data-voice-slot]');
      if (!vDiv) return;
      var si    = parseInt(vDiv.dataset.voiceSlot);
      var curVi = self._slots[si].vi;
      var nxtVi = (curVi + 1) % 4;
      for (var s = 0; s < self._slots.length; s++) {
        if (s !== si && self._slots[s].vi === nxtVi) {
          self._slots[s].vi = curVi;
          self._refreshCell(s);
          break;
        }
      }
      self._slots[si].vi = nxtVi;
      self._refreshCell(si);
    };

    this._changeListener = function(e) {
      var sel = e.target.closest('[data-slot]');
      if (!sel || sel.tagName !== 'SELECT') return;
      var si    = parseInt(sel.dataset.slot);
      var field = sel.dataset.field;
      if (field === 'bar')  self._slots[si].bar  = parseInt(sel.value);
      if (field === 'beat') self._slots[si].beat = parseInt(sel.value);
    };

    root.addEventListener('click',  this._configListener);
    root.addEventListener('change', this._changeListener);
  }

  _cellHtml(si, v, mode, S) {
    if (!S) S = this._S();
    var slot = this._slots[si];
    var bottom;

    if (mode === 'config') {
      bottom =
        '<div style="' + S.bottom + '">' +
          '<div style="' + S.selGroup + '">' +
            '<span style="' + S.selLabel + '">Battuta</span>' +
            '<select style="' + S.sel + '" data-slot="' + si + '" data-field="bar">'  + this._barOptions(slot.bar)   + '</select>' +
          '</div>' +
          '<div style="' + S.selGroup + '">' +
            '<span style="' + S.selLabel + '">Tempo</span>' +
            '<select style="' + S.sel + '" data-slot="' + si + '" data-field="beat">' + this._beatOptions(slot.beat) + '</select>' +
          '</div>' +
        '</div>';
    } else {
      var label = slot.bar === 0 && slot.beat === 0
        ? 'PRIMA VOCE'
        : 'BATTUTA ' + (slot.bar + 1) + (slot.beat > 0 ? ' · T' + (slot.beat + 1) : '');
      var statStyle = S.bottom + ';text-align:center;font-size:clamp(0.78rem,1.6vw,1.05rem);font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.45);text-transform:uppercase;font-family:inherit;';
      bottom = '<div id="ing-cc-s' + si + '" style="' + statStyle + '">' + label + '</div>';
    }

    return (
      '<div id="ing-cc-' + si + '" style="' + S.cell(v.color) + '">' +
        '<div id="ing-cc-v' + si + '" data-voice-slot="' + si + '" style="' + S.voice + '">' +
          '<span id="ing-cc-l' + si + '" style="' + S.letter + '">' + v.label + '</span>' +
          '<span id="ing-cc-n' + si + '" style="' + S.name   + '">' + v.name.toUpperCase() + '</span>' +
        '</div>' +
        bottom +
      '</div>'
    );
  }

  _refreshCell(si) {
    var S    = this._S();
    var v    = this.voices[this._slots[si].vi];
    var cell = document.getElementById('ing-cc-'  + si);
    var lEl  = document.getElementById('ing-cc-l' + si);
    var nEl  = document.getElementById('ing-cc-n' + si);
    if (cell) cell.style.background = v.color;
    if (lEl)  lEl.textContent = v.label;
    if (nEl)  nEl.textContent = v.name.toUpperCase();
    if (cell) {
      var bs  = cell.querySelector('[data-field="bar"]');
      var bts = cell.querySelector('[data-field="beat"]');
      if (bs)  bs.value = this._slots[si].bar;
      if (bts) bts.value = this._slots[si].beat;
    }
  }

  _barOptions(sel) {
    var h = '';
    for (var b = 0; b < 32; b++)
      h += '<option value="' + b + '" style="color:#111;background:#fff"' + (b === sel ? ' selected' : '') + '>' + (b + 1) + '</option>';
    return h;
  }

  _beatOptions(sel) {
    var names = ['1°','2°','3°','4°'];
    var h = '';
    for (var b = 0; b < 4; b++)
      h += '<option value="' + b + '" style="color:#111;background:#fff"' + (b === sel ? ' selected' : '') + '>' + names[b] + '</option>';
    return h;
  }

  _removeConfigListeners() {
    var root = document.getElementById('ing-grid');
    if (root) {
      if (this._configListener) root.removeEventListener('click',  this._configListener);
      if (this._changeListener) root.removeEventListener('change', this._changeListener);
    }
    this._configListener = null;
    this._changeListener = null;
  }


  /* ===========================
     GIOCO
     =========================== */

  _build() {
    var self = this;
    this.container.style.cssText = '';

    var S   = this._S();
    var html = '<div id="ing-grid" style="' + S.grid + '">';
    this._slots.forEach(function(slot, si) {
      html += self._cellHtml(si, self.voices[slot.vi], 'game', S);
    });
    html += '</div>';
    this.container.innerHTML = html;
  }

  _tick() {
    if (!this._playing) return;
    this._playClick();
    this._render();
    var self = this;
    this._timer = setTimeout(function() { self._beat++; self._tick(); }, this._beatMs);
  }

  _render() {
    var self = this, beat = this._beat, bib = beat % this.beatsPerBar;

    this._slots.forEach(function(slot, si) {
      var vi   = slot.vi;
      var eb   = self._entryBeat(si);
      var due  = eb - beat;
      var cell = document.getElementById('ing-cc-'  + si);
      var stat = document.getElementById('ing-cc-s' + si);
      if (!cell || !stat) return;

      if (due > 0) {
        var bl = Math.ceil(due / self.beatsPerBar);
        stat.textContent = bl === 1 ? 'PROSSIMA BATTUTA' : 'TRA ' + bl + ' BATTUTE';
        stat.style.color = 'rgba(255,255,255,0.45)';
        stat.style.fontSize = '';

      } else if (due === 0 && self._voiceStates[vi] === 'wait') {
        self._voiceStates[vi] = 'entering';
        cell.style.filter = 'brightness(1.8)';
        setTimeout(function(){ var c=document.getElementById('ing-cc-'+si); if(c) c.style.filter=''; }, 420);
        stat.textContent = '★  ENTRA!  ★';
        stat.style.color = '#fff';
        stat.style.fontSize = 'clamp(0.95rem,2.2vw,1.4rem)';

        var _si = si, _vi = vi;
        setTimeout(function() {
          var s = document.getElementById('ing-cc-s' + _si);
          if (s) { s.textContent = '♪  CANTA'; s.style.color = 'rgba(255,255,255,0.85)'; s.style.fontSize = ''; }
          self._voiceStates[_vi] = 'singing';
        }, self._beatMs * 0.68);

      } else if (self._voiceStates[vi] === 'singing') {
        stat.textContent = '♪  TEMPO ' + (bib + 1);
        stat.style.color = 'rgba(255,255,255,0.85)';
        stat.style.fontSize = '';
        if (bib === 0) {
          cell.style.filter = 'brightness(1.45)';
          setTimeout(function(){ var c=document.getElementById('ing-cc-'+si); if(c) c.style.filter=''; }, 180);
        }
      }
    });
  }


  /* ===========================
     CONTROLLI
     =========================== */

  start() {
    if (this._playing) return;
    this._removeConfigListeners();
    this._playing     = true;
    this._beat        = 0;
    this._voiceStates = ['wait','wait','wait','wait'];
    this._build();
    var self = this;
    this._playCountdown(function() { if (self._playing) self._tick(); });
  }

  pause()        { this._playing = false; this._clearTimer(); }
  stop()         { this._playing = false; this._clearTimer(); this._removeConfigListeners(); }
  updateBpm(bpm) { this.bpm = bpm; }


  /* ===========================
     AUDIO
     =========================== */

  _initAudio() {
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    } catch(e) {}
  }

  _playCountdown(cb) {
    var self = this, bm = this._beatMs;
    this._initAudio();
    var go = function() {
      if (!self._audioCtx) return;
      var ctx = self._audioCtx, now = ctx.currentTime, bs = 60 / self.bpm;
      for (var i = 0; i < 4; i++) {
        (function(idx) {
          var t = now + idx * bs;
          try {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = idx === 0 ? 1100 : 720;
            g.gain.setValueAtTime(idx === 0 ? 0.35 : 0.22, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
            o.start(t); o.stop(t + 0.07);
          } catch(e) {}
        })(i);
      }
    };
    if (this._audioCtx && this._audioCtx.state === 'suspended')
      this._audioCtx.resume().then(go, go);
    else go();
    this._cdTimer = setTimeout(cb, 4 * bm);
  }

  _playClick() {
    this._initAudio();
    if (!this._audioCtx) return;
    var ctx = this._audioCtx, t = ctx.currentTime;
    var down = !(this._beat % this.beatsPerBar);
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.value = down ? 1100 : 720;
      g.gain.setValueAtTime(down ? 0.28 : 0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.start(t); o.stop(t + 0.065);
    } catch(e) {}
  }

  _clearTimer() {
    if (this._timer)   { clearTimeout(this._timer);   this._timer   = null; }
    if (this._cdTimer) { clearTimeout(this._cdTimer); this._cdTimer = null; }
  }
}

/* ===========================
   BATTI IL TEMPO  v3
   Note fisse sul rigo, cursore mobile.
   2 righe - countdown 4/4 solo prima di partire.
   =========================== */

class BattiTempoGame {
  constructor(container, state) {
    this.container = container;
    this.state     = state;
    this.bpm       = state.bpm;

    /* --- Voci --- */
    if (state.mode === 'singoli') {
      this.voices = [
        { key:'r', label:'', name:'Ritmo', color:'#ff4d7a' },
      ];
    } else {
      this.voices = [
        { key:'s', label:'S', name:'Soprani',   color:'#ff4444' },
        { key:'a', label:'A', name:'Contralti', color:'#ffaa00' },
        { key:'u', label:'U', name:'Uomini',    color:'#a78bfa' },
      ];
    }

    /* --- Costanti layout --- */
    this.LW              = 52;   /* larghezza pannello label */
    this.MARG            = 18;   /* margine orizzontale interno (sinistra + destra) */
    this.ROWS            = 2;    /* righe di esercizio */
    this.MEASURES_PER_ROW = 7;
    this.MEASURES        = this.ROWS * this.MEASURES_PER_ROW;
    this.BEATS_PER       = 4;
    this.ROW_PAD         = 12;   /* px gap tra i due sistemi */

    /* --- Stato --- */
    this._playing   = false;
    this._rafId     = null;
    this._wallStart = 0;
    this._startBeat = 0;
    this._canvas    = null;
    this._ctx       = null;
    this._seqs      = [];
    this._audioCtx  = null;
    this._cdTimer   = null;

    this._generateSequences();
    this._build();
  }

  /* ==========================
     PATTERNS
     ========================== */
  _getPatterns(level) {
    var p = {
      principiante: [
        ['W'],
        ['H','H'],
        ['Q','Q','Q','Q'],
        ['H','Q','Q'],
        ['Q','Q','H'],
        ['Q','H','Q'],
      ],
      intermedio: [
        ['H','H'],
        ['Q','Q','Q','Q'],
        ['H','Q','Q'],
        ['Q','Q','H'],
        ['DH','Q'],
        ['Q','DH'],
        ['E2','Q','Q','Q'],
        ['Q','E2','Q','Q'],
        ['Q','Q','Q','E2'],
      ],
      avanzato: [
        ['Q','Q','Q','Q'],
        ['DH','Q'],
        ['Q','DH'],
        ['E2','E2','Q','Q'],
        ['Q','E2','E2','Q'],
        ['Q','Q','E2','E2'],
        ['E2','Q','E2','Q'],
        ['H','E2','E2'],
        ['DH','E2'],
      ],
    };
    return p[level] || p.intermedio;
  }

  _noteDur(type) {
    return type==='W' ? 4 : type==='DH' ? 3 : type==='H' ? 2 : 1;
  }

  /* ==========================
     GENERAZIONE SEQUENZE
     ========================== */
  _generateSequences() {
    var self = this;
    var pool = this._getPatterns(this.state.level);

    this._seqs = this.voices.map(function() {
      var notes = [], beat = 0;
      for (var m = 0; m < self.MEASURES; m++) {
        var pat = pool[Math.floor(Math.random() * pool.length)];
        pat.forEach(function(type) {
          var note = { type:type, beat:beat, dur:self._noteDur(type), ax:beat };
          notes.push(note);
          beat += note.dur;
        });
      }
      return notes;
    });
  }

  /* ==========================
     BUILD DOM
     ========================== */
  _build() {
    var self = this;
    this.container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

    var barStyle = 'display:flex;align-items:center;gap:12px;padding:8px 16px;' +
                   'background:rgba(0,0,0,0.35);border-bottom:1px solid #1e1e32;flex-shrink:0;';
    var btnStyle  = 'background:#1a1a2e;border:2px solid #3ab4ff;color:#3ab4ff;' +
                    'font-size:0.82rem;font-weight:700;padding:7px 14px;border-radius:10px;cursor:pointer;font-family:inherit;';
    var btnStyleP = 'background:#3ab4ff;border:2px solid #3ab4ff;color:#0c0c18;' +
                    'font-size:0.82rem;font-weight:700;padding:7px 14px;border-radius:10px;cursor:pointer;font-family:inherit;';

    this.container.innerHTML =
      '<div id="bt-bar" style="' + barStyle + '">' +
        '<div id="bt-status" style="font-size:0.9rem;font-weight:700;color:#8892a4;flex:1;">' + I18n.t('press_start') + '</div>' +
        '<div id="bt-btns" style="display:none;gap:10px;">' +
          '<button id="bt-rep" style="' + btnStyle  + '">' + I18n.t('repeat') + '</button>' +
          '<button id="bt-new" style="' + btnStyleP + '">' + I18n.t('new_seq') + '</button>' +
        '</div>' +
      '</div>' +
      '<canvas id="bt-canvas" style="display:block;flex:1;width:100%;min-height:0;"></canvas>';

    setTimeout(function() {
      var canvas = document.getElementById('bt-canvas');
      if (!canvas) return;
      var cr = canvas.getBoundingClientRect();
      canvas.width  = Math.round(cr.width  || window.innerWidth);
      canvas.height = Math.round(cr.height || window.innerHeight * 0.75);
      self._canvas = canvas;
      self._ctx    = canvas.getContext('2d');
      self._drawPreview();

      var repBtn = document.getElementById('bt-rep');
      var newBtn = document.getElementById('bt-new');
      if (repBtn) repBtn.onclick = function() {
        if (!self._playing) { self._startBeat = 0; self.start(); }
      };
      if (newBtn) newBtn.onclick = function() {
        if (!self._playing) {
          self._generateSequences();
          self._startBeat = 0;
          self._drawPreview();
          document.getElementById('bt-btns').style.display = 'none';
          document.getElementById('bt-status').textContent = I18n.t('press_start');
        }
      };
    }, 200);
  }

  /* ==========================
     CONTROLLI
     ========================== */
  start() {
    if (this._playing) return;
    if (!this._canvas) {
      var canvas = document.getElementById('bt-canvas');
      if (canvas) {
        var cr = canvas.getBoundingClientRect();
        canvas.width  = Math.round(cr.width  || window.innerWidth);
        canvas.height = Math.round(cr.height || window.innerHeight * 0.75);
        this._canvas = canvas;
        this._ctx    = canvas.getContext('2d');
      }
    }
    if (!this._canvas) return;

    this._playing = true;
    var self = this;

    /* Ripresa dopo pausa: nessun countdown */
    if (this._startBeat > 0) {
      this._wallStart = performance.now();
      this._rafId = requestAnimationFrame(function(ts) { self._drawFrame(ts); });
      var st = document.getElementById('bt-status');
      if (st) st.textContent = I18n.t('scrolling');
      return;
    }

    /* Prima partenza: countdown 4 battiti */
    var stEl = document.getElementById('bt-status');
    if (stEl) stEl.textContent = '1  2  3  4…';
    var btns = document.getElementById('bt-btns');
    if (btns) btns.style.display = 'none';

    this._playCountdown(function() {
      if (!self._playing) return;
      self._startBeat = 0;
      self._wallStart = performance.now();
      self._rafId = requestAnimationFrame(function(ts) { self._drawFrame(ts); });
      var st2 = document.getElementById('bt-status');
      if (st2) st2.textContent = I18n.t('scrolling');
    });
  }

  pause() {
    if (!this._playing) return;
    this._playing = false;
    if (this._rafId)  { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._cdTimer) { clearTimeout(this._cdTimer); this._cdTimer = null; }
    if (this._wallStart) {
      var bps = this.bpm / 60;
      this._startBeat += (performance.now() - this._wallStart) / 1000 * bps;
      this._wallStart = 0;
    }
    var st = document.getElementById('bt-status');
    if (st) st.textContent = I18n.t('paused');
  }

  stop() {
    this._playing = false;
    if (this._rafId)  { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._cdTimer) { clearTimeout(this._cdTimer); this._cdTimer = null; }
    this._wallStart = 0;
    this._startBeat = 0;
  }

  updateBpm(bpm) {
    if (this._playing && this._wallStart) {
      var bps_old = this.bpm / 60;
      this._startBeat += (performance.now() - this._wallStart) / 1000 * bps_old;
      this._wallStart = performance.now();
    }
    this.bpm = bpm;
  }

  /* ==========================
     COUNTDOWN AUDIO (4 battiti)
     Poi silenzio durante l'esercizio.
     ========================== */
  _playCountdown(callback) {
    var self    = this;
    var beatSec = 60 / this.bpm;
    var beatMs  = Math.round(60000 / this.bpm);

    try {
      if (!this._audioCtx)
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}

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
            g.gain.setValueAtTime(idx === 0 ? 0.38 : 0.24, t);
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

    this._cdTimer = setTimeout(function() {
      self._cdTimer = null;
      callback();
    }, 4 * beatMs);
  }

  /* ==========================
     LOOP ANIMAZIONE
     ========================== */
  _drawFrame(timestamp) {
    if (!this._playing) return;
    var bps         = this.bpm / 60;
    var elapsed     = (performance.now() - this._wallStart) / 1000;
    var currentBeat = this._startBeat + elapsed * bps;

    try { this._render(currentBeat); } catch(e) {}

    var totalBeats = this.MEASURES * this.BEATS_PER;
    if (currentBeat > totalBeats + 0.3) {
      this._playing = false; this._rafId = null;
      this._finish();
      return;
    }

    var self = this;
    this._rafId = requestAnimationFrame(function(ts) { self._drawFrame(ts); });
  }

  _drawPreview() {
    if (!this._canvas) return;
    this._render(-0.01);
  }

  /* ==========================
     RENDERING
     ========================== */
  _render(currentBeat) {
    var ctx = this._ctx;
    var W   = this._canvas.width;
    var H   = this._canvas.height;
    if (!ctx) return;

    /* Sfondo */
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);
    ctx.shadowBlur = 0;

    var MARG        = this.MARG;
    var noteX0      = this.LW + MARG;
    var noteXW      = W - this.LW - MARG * 2;
    var beatsPerRow = this.BEATS_PER * this.MEASURES_PER_ROW;
    var PPB         = noteXW / beatsPerRow;
    var availH      = H - this.ROW_PAD * (this.ROWS - 1);
    var sysH        = availH / this.ROWS;
    var voiceBandH  = sysH / this.voices.length;

    /* Riga e beat corrente */
    var beat       = Math.max(0, currentBeat);
    var curRow     = currentBeat < 0 ? 0 : Math.min(Math.floor(beat / beatsPerRow), this.ROWS - 1);
    var beatInRow  = currentBeat < 0 ? 0 : beat - curRow * beatsPerRow;
    var showCursor = (currentBeat >= 0);

    for (var row = 0; row < this.ROWS; row++) {
      var sysY = row * (sysH + this.ROW_PAD);

      /* Gap tra sistemi */
      if (row > 0) {
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(noteX0, sysY - this.ROW_PAD, noteXW, this.ROW_PAD);
      }

      for (var vi = 0; vi < this.voices.length; vi++) {
        var v     = this.voices[vi];
        var bandY = sysY + vi * voiceBandH;
        var lineY = Math.round(bandY + voiceBandH * 0.54);
        var isActiveRow = (row === curRow);

        /* Linea bianca */
        ctx.strokeStyle = 'rgba(255,255,255,0.80)';
        ctx.lineWidth   = 1.5;
        ctx.shadowBlur  = 0;
        ctx.beginPath();
        ctx.moveTo(noteX0, lineY);
        ctx.lineTo(W - MARG, lineY);
        ctx.stroke();

        /* Stanghette di misura */
        for (var m = 0; m <= this.MEASURES_PER_ROW; m++) {
          var bx    = noteX0 + m * this.BEATS_PER * PPB;
          var isEnd = (m === this.MEASURES_PER_ROW);
          var barH  = voiceBandH * 0.40;
          ctx.strokeStyle = v.color + (isEnd ? 'cc' : '60');
          ctx.lineWidth   = isEnd ? 2.5 : 1;
          ctx.beginPath();
          ctx.moveTo(bx, lineY - barH);
          ctx.lineTo(bx, lineY + barH * 0.5);
          ctx.stroke();
          if (isEnd) {
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(bx + 4, lineY - barH);
            ctx.lineTo(bx + 4, lineY + barH * 0.5);
            ctx.stroke();
          }
        }

        /* Etichetta riga (prima voce) */
        if (vi === 0) {
          ctx.globalAlpha = 0.30;
          ctx.fillStyle   = '#ddeeff';
          ctx.font        = '10px system-ui, sans-serif';
          ctx.textAlign   = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('Riga ' + (row + 1), noteX0 + 4, bandY + 12);
          ctx.globalAlpha = 1.0;
        }

        /* Note */
        var rowBeatStart = row * beatsPerRow;
        var notes = this._seqs[vi];
        for (var ni = 0; ni < notes.length; ni++) {
          var note = notes[ni];
          if (note.ax < rowBeatStart || note.ax >= rowBeatStart + beatsPerRow) continue;
          var nx = noteX0 + (note.ax - rowBeatStart) * PPB;
          var isActive = isActiveRow && showCursor && (Math.abs(note.ax - currentBeat) < 0.18);
          this._drawNote(ctx, note, nx, lineY, voiceBandH, v.color, isActive, PPB);
        }
      }

      /* Cursore */
      if (row === curRow && showCursor) {
        var cx = noteX0 + beatInRow * PPB;
        cx = Math.max(noteX0, Math.min(W - MARG, cx));

        /* Glow */
        ctx.shadowColor = '#e94560';
        ctx.shadowBlur  = 12;
        ctx.strokeStyle = '#e9456055';
        ctx.lineWidth   = 8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, sysY);
        ctx.lineTo(cx, sysY + sysH);
        ctx.stroke();
        ctx.shadowBlur = 0;

        /* Linea */
        ctx.strokeStyle = '#ff3a5eee';
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, sysY);
        ctx.lineTo(cx, sysY + sysH);
        ctx.stroke();

        /* Triangolo */
        ctx.fillStyle = '#ff3a5e';
        ctx.beginPath();
        ctx.moveTo(cx - 7, sysY);
        ctx.lineTo(cx + 7, sysY);
        ctx.lineTo(cx, sysY + 10);
        ctx.closePath();
        ctx.fill();
      }
    }

    /* Pannello label sinistro */
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#0c0c18';
    ctx.fillRect(0, 0, this.LW, H);
    ctx.strokeStyle = '#252535';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(this.LW, 0); ctx.lineTo(this.LW, H); ctx.stroke();

    for (var row2 = 0; row2 < this.ROWS; row2++) {
      var sysY2 = row2 * (sysH + this.ROW_PAD);
      for (var vi2 = 0; vi2 < this.voices.length; vi2++) {
        var v2    = this.voices[vi2];
        var bY2   = sysY2 + vi2 * voiceBandH;
        var lY2   = Math.round(bY2 + voiceBandH * 0.54);
        var fsize = Math.min(20, Math.round(voiceBandH * 0.38));
        var nsize = Math.min(9,  Math.round(voiceBandH * 0.17));
        ctx.fillStyle    = v2.color;
        ctx.font         = 'bold ' + fsize + 'px system-ui, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(v2.label || '', this.LW / 2, lY2 - 4);
        ctx.fillStyle = v2.color + '90';
        ctx.font      = nsize + 'px system-ui, sans-serif';
        ctx.fillText(v2.name, this.LW / 2, lY2 + Math.round(voiceBandH * 0.22));
      }
    }

    ctx.globalAlpha  = 1.0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';
    ctx.shadowBlur   = 0;
  }

  /* ==========================
     DISEGNO NOTA
     Tutte le note sul rigo (stessa Y).
     Glow vivace sempre, esplosione quando attiva.
     ========================== */
  _drawNote(ctx, note, x, lineY, bandH, color, isActive, PPB) {
    var NRX  = Math.min(7.5, PPB * 0.29);
    var NRY  = Math.min(5,   PPB * 0.19);
    var STL  = Math.min(26,  bandH * 0.30);
    var noteY = lineY;  /* tutte sul rigo */
    var fc    = isActive ? '#ffffff' : color;

    ctx.save();
    ctx.shadowColor = isActive ? '#ffffff' : color;
    ctx.shadowBlur  = isActive ? 24 : 7;

    var type = note.type;
    if (type === 'W') {
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.save(); ctx.translate(x, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX * 1.4, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.stroke();
    } else if (type === 'H') {
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.save(); ctx.translate(x, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.stroke();
      ctx.strokeStyle = fc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + NRX - 1, noteY); ctx.lineTo(x + NRX - 1, noteY - STL); ctx.stroke();
    } else if (type === 'DH') {
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.save(); ctx.translate(x, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.stroke();
      ctx.strokeStyle = fc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + NRX - 1, noteY); ctx.lineTo(x + NRX - 1, noteY - STL); ctx.stroke();
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.arc(x + NRX + 5, noteY - 1, Math.max(2.5, NRX * 0.32), 0, Math.PI * 2); ctx.fill();
    } else if (type === 'Q') {
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.save(); ctx.translate(x, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.fill();
      ctx.strokeStyle = fc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + NRX - 1, noteY); ctx.lineTo(x + NRX - 1, noteY - STL); ctx.stroke();
    } else if (type === 'E2') {
      var x2 = x + PPB * 0.5;
      ctx.fillStyle = fc;
      /* prima nota */
      ctx.beginPath();
      ctx.save(); ctx.translate(x, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.fill();
      /* seconda nota */
      ctx.beginPath();
      ctx.save(); ctx.translate(x2, noteY); ctx.rotate(-0.22);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore(); ctx.fill();
      /* gambi e travatura */
      var t1 = noteY - STL, t2 = noteY - STL;
      ctx.strokeStyle = fc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x  + NRX - 1, noteY); ctx.lineTo(x  + NRX - 1, t1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 + NRX - 1, noteY); ctx.lineTo(x2 + NRX - 1, t2); ctx.stroke();
      ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + NRX - 1, t1); ctx.lineTo(x2 + NRX - 1, t2); ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.restore();
  }

  /* ==========================
     FINE ESERCIZIO
     ========================== */
  _finish() {
    var st = document.getElementById('bt-status');
    if (st) st.textContent = I18n.t('completed');
    var btns = document.getElementById('bt-btns');
    if (btns) btns.style.display = 'flex';
    this._render(this.MEASURES * this.BEATS_PER - 0.01);
    if(typeof Celebration !== 'undefined') Celebration.show('Bravo!');
  }
}

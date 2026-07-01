/* ===========================
   BATTI IL TEMPO
   Partitura ritmica a 4 voci (SATB)
   4/4, 20 misure, note in scorrimento.
   Canvas-based, RAF animation.
   =========================== */

class BattiTempoGame {
  constructor(container, state) {
    this.container = container;
    this.state     = state;
    this.bpm       = state.bpm;

    /* --- Layout constants --- */
    this.LW   = 64;    /* label panel width (px) */
    this.PPB  = 96;    /* pixels per beat */
    this.PLX  = 210;   /* playhead X from canvas left */
    this.SP   = 8;     /* staff spacing (px between lines) */
    this.NRX  = 8.5;   /* notehead x-radius */
    this.NRY  = 5.5;   /* notehead y-radius */
    this.STL  = 32;    /* stem length (px) */
    this.MEASURES     = 20;
    this.BEATS_PER    = 4;
    this.PRE_BEATS    = 2; /* lead-in beats before first note */

    /* Singoli: 1 riga; Coro: 4 righe SATB */
    if (state.mode === 'singoli') {
      this.voices = [
        { key:'r', label:'', name:'♪ Ritmo', color:'#e94560' },
      ];
    } else {
      this.voices = [
        { key:'s', label:'S', name:'Soprani',   color:'#e74c3c' },
        { key:'a', label:'A', name:'Contralti', color:'#f39c12' },
        { key:'t', label:'T', name:'Tenori',    color:'#3498db' },
        { key:'b', label:'B', name:'Bassi',     color:'#2ecc71' },
      ];
    }

    /* --- Animation state --- */
    this._playing    = false;
    this._rafId      = null;
    this._wallStart  = 0;      /* performance.now() al momento di start() */
    this._startBeat  = 0;      /* beat accumulato prima di ogni pausa */
    this._canvas     = null;
    this._ctx        = null;
    this._rowH       = 0;
    this._seqs       = [];     /* note objects per voice */

    /* --- Metronomo Web Audio --- */
    this._audioCtx      = null;
    this._metroActive   = false;
    this._metroTimerId  = null;
    this._nextClickTime = 0;
    this._nextClickBeat = 0;

    this._generateSequences();
    this._build();
  }

  /* ==========================
     PATTERN POOLS
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
        ['H','E2','Q'],
        ['H','Q','E2'],
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
        ['E2','E2','H'],
        ['DH','E2'],
        ['E2','DH'],
        ['E2','E2','E2','Q'],
        ['Q','E2','E2','E2'],
      ],
    };
    return p[level] || p.intermedio;
  }

  _noteDur(type) {
    return type === 'W' ? 4 : type === 'DH' ? 3 : type === 'H' ? 2 : 1;
  }

  /* ==========================
     SEQUENCE GENERATION
     ========================== */
  _generateSequences() {
    var self    = this;
    var pool    = this._getPatterns(this.state.level);
    var maxPitch = { principiante:1, intermedio:2, avanzato:3 }[this.state.level] || 2;

    this._seqs = this.voices.map(function() {
      var notes = [];
      var beat  = 0;
      var prevPitch = 0;

      for (var m = 0; m < self.MEASURES; m++) {
        var pattern = pool[Math.floor(Math.random() * pool.length)];
        pattern.forEach(function(type) {
          /* Pitch walk: small steps, stays within ±maxPitch */
          var delta  = Math.random() < 0.65 ? (Math.random() < 0.5 ? 1 : -1) : 0;
          var pitch  = Math.max(-maxPitch, Math.min(maxPitch, prevPitch + delta));
          prevPitch  = pitch;

          var note = {
            type: type,
            beat: beat,
            dur:  self._noteDur(type),
            pitch: pitch,
            ax:   beat * self.PPB,   /* absolute X in score */
          };
          if (type === 'E2') {
            var d2 = Math.random() < 0.5 ? 1 : -1;
            note.pitch2 = Math.max(-maxPitch, Math.min(maxPitch, pitch + d2));
          }
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

    var barStyle = 'display:flex;align-items:center;gap:12px;padding:8px 16px;' +
                   'background:rgba(0,0,0,0.35);border-bottom:1px solid #1e1e32;' +
                   'flex-shrink:0;min-height:44px;';
    var statStyle = 'font-size:0.9rem;font-weight:700;color:#8892a4;flex:1;';
    var btnStyle  = 'background:#1a1a2e;border:2px solid #3498db;color:#3498db;' +
                    'font-size:0.82rem;font-weight:700;padding:7px 14px;border-radius:10px;' +
                    'cursor:pointer;font-family:inherit;';
    var btnStyleP = 'background:#3498db;border:2px solid #3498db;color:white;' +
                    'font-size:0.82rem;font-weight:700;padding:7px 14px;border-radius:10px;' +
                    'cursor:pointer;font-family:inherit;';

    this.container.innerHTML =
      '<div id="bt-bar" style="' + barStyle + '">' +
        '<div id="bt-status" style="' + statStyle + '">' + I18n.t('press_start') + '</div>' +
        '<div id="bt-btns" style="display:none;gap:10px;">' +
          '<button id="bt-rep" style="' + btnStyle  + '">' + I18n.t('repeat') + '</button>' +
          '<button id="bt-new" style="' + btnStyleP + '">' + I18n.t('new_seq') + '</button>' +
        '</div>' +
      '</div>' +
      '<canvas id="bt-canvas" style="display:block;flex:1;width:100%;min-height:0;"></canvas>';

    this.container.style.flexDirection = 'column';
    this.container.style.alignItems    = 'stretch';
    this.container.style.padding       = '0';
    this.container.style.overflow      = 'hidden';

    setTimeout(function() {
      var canvas = document.getElementById('bt-canvas');
      if (!canvas) return;
      /* Misura il canvas stesso (flex:1 lo ha già dimensionato) */
      var cr = canvas.getBoundingClientRect();
      canvas.width  = Math.round(cr.width  || window.innerWidth);
      canvas.height = Math.round(cr.height || window.innerHeight * 0.75);
      self._canvas  = canvas;
      self._ctx     = canvas.getContext('2d');
      self._rowH    = Math.floor(canvas.height / self.voices.length);
      self._drawPreview();

      var repBtn = document.getElementById('bt-rep');
      var newBtn = document.getElementById('bt-new');
      if (repBtn) repBtn.onclick = function() {
        if (!self._playing) {
          self._startBeat = 0;
          self.start();
        }
      };
      if (newBtn) newBtn.onclick = function() {
        if (!self._playing) {
          self._generateSequences();
          self._startBeat = 0;
          self._drawPreview();
          var btns = document.getElementById('bt-btns');
          if (btns) btns.style.display = 'none';
          var st = document.getElementById('bt-status');
          if (st) st.textContent = I18n.t('press_start');
        }
      };
    }, 200);
  }

  /* ==========================
     CONTROLS
     ========================== */
  _dbg(msg) {
    var st = document.getElementById('bt-status');
    if (st) st.textContent = msg;
  }

  start() {
    this._dbg('START: checking playing=' + this._playing);
    if (this._playing) return;

    this._dbg('START: checking canvas=' + !!this._canvas);
    if (!this._canvas) {
      var canvas = document.getElementById('bt-canvas');
      if (canvas) {
        var cr = canvas.getBoundingClientRect();
        this._dbg('CANVAS cr=' + Math.round(cr.width) + 'x' + Math.round(cr.height));
        canvas.width  = Math.round(cr.width  || window.innerWidth);
        canvas.height = Math.round(cr.height || window.innerHeight * 0.75);
        this._canvas  = canvas;
        this._ctx     = canvas.getContext('2d');
        this._rowH    = Math.floor(canvas.height / this.voices.length);
      }
    }
    if (!this._canvas) { this._dbg('ABORT: no canvas'); return; }

    this._dbg('START: canvas ok ' + this._canvas.width + 'x' + this._canvas.height);
    this._playing = true;
    this._wallStart = performance.now();
    try { this._startMetronome(); } catch(e) { /* audio error - visual still runs */ }
    var self = this;
    this._rafId = requestAnimationFrame(function(ts) {
      self._dbg('');
      self._drawFrame(ts);
    });
    var st = document.getElementById('bt-status');
    if (st) st.textContent = I18n.t('scrolling');
    var btns = document.getElementById('bt-btns');
    if (btns) btns.style.display = 'none';
  }

  pause() {
    if (!this._playing) return;
    this._playing = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._stopMetronome();
    /* Salva la posizione corrente in beat */
    var bpsP    = this.bpm / 60;
    var elapsedP = (performance.now() - this._wallStart) / 1000;
    this._startBeat += elapsedP * bpsP;
    this._wallStart  = 0;
    var st = document.getElementById('bt-status');
    if (st) st.textContent = I18n.t('paused');
  }

  stop() {
    this._playing   = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._wallStart = 0;
    this._startBeat = 0;
    this._stopMetronome();
  }

  updateBpm(bpm) {
    if (this._playing) {
      /* Rebase startBeat in modo che la posizione visiva resti invariata */
      var bps_old    = this.bpm / 60;
      var elapsed_u  = (performance.now() - this._wallStart) / 1000;
      this._startBeat += elapsed_u * bps_old;
      this._wallStart  = performance.now();
    }
    this.bpm = bpm;
  }


  /* ==========================
     METRONOMO WEB AUDIO
     Look-ahead scheduler: ogni 25 ms pianifica i click
     nei prossimi 120 ms sull'orologio preciso di AudioContext.
     ========================== */
  _startMetronome() {
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    } catch(e) { return; }

    this._metroActive   = true;
    /* Il primo click cade al beat 0 (prima nota al playhead).
       _nextClickBeat insegue il beat visivo; il tempo audio è
       calcolato dinamicamente nello schedulerLoop. */
    var cBeat = this._startBeat - this.PRE_BEATS; /* beat corrente = -PRE_BEATS all'avvio */
    this._nextClickBeat = Math.ceil(cBeat - 0.001);

    /* Su mobile (iOS) l'AudioContext parte in stato "suspended" anche durante
       un gesto utente. resume() è asincrono: aspettiamo che risolva prima di
       avviare lo scheduler, altrimenti currentTime=0 e le note vengono
       schedulate nel passato e perse. */
    var self = this;
    function startLoop() { if (self._metroActive) self._schedulerLoop(); }
    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().then(startLoop, startLoop);
    } else {
      startLoop();
    }
  }

  _stopMetronome() {
    this._metroActive = false;
    if (this._metroTimerId) {
      clearTimeout(this._metroTimerId);
      this._metroTimerId = null;
    }
  }

  _schedulerLoop() {
    if (!this._metroActive || !this._audioCtx) return;

    var AHEAD   = 0.12;                      /* pianifica 120 ms in anticipo */
    var bps     = this.bpm / 60;
    var beatInt = 1.0 / bps;                 /* durata di un beat in secondi */
    var audioNow = this._audioCtx.currentTime;

    /* Beat visivo corrente: ricavato dal clock di performance.now()
       che è lo stesso usato dal RAF → sincronizzazione perfetta. */
    var wallElapsed  = (performance.now() - this._wallStart) / 1000;
    var currentBeat  = this._startBeat + wallElapsed * bps - this.PRE_BEATS;

    while (true) {
      /* Quanti secondi mancano al beat this._nextClickBeat? */
      var secsUntil = (this._nextClickBeat - currentBeat) * beatInt;
      if (secsUntil > AHEAD) break;         /* troppo lontano: aspetta */
      var audioTime = audioNow + Math.max(0, secsUntil);  /* mai nel passato */
      var isDown = (this._nextClickBeat % this.BEATS_PER) === 0;
      try { this._playClick(audioTime, isDown); } catch(e) {}
      this._nextClickBeat++;
    }

    var self = this;
    this._metroTimerId = setTimeout(function() { self._schedulerLoop(); }, 25);
  }

  _playClick(audioTime, isDownbeat) {
    var ctx  = this._audioCtx;
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = 'triangle';
    osc.frequency.value = isDownbeat ? 1100 : 720;
    var vol = isDownbeat ? 0.30 : 0.16;
    var dur = isDownbeat ? 0.055 : 0.038;
    gain.gain.setValueAtTime(vol, audioTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioTime + dur);
    osc.start(audioTime);
    osc.stop(audioTime + dur + 0.01);
  }

  /* ==========================
     ANIMATION LOOP
     ========================== */
  _drawFrame(timestamp) {
    if (!this._playing) return;

    /* performance.now() condiviso con il metronomo → sync perfetta */
    var bps         = this.bpm / 60;
    var elapsed     = (performance.now() - this._wallStart) / 1000;
    var currentBeat = this._startBeat + elapsed * bps - this.PRE_BEATS;
    var scrollX     = this.PLX - currentBeat * this.PPB;

    try { this._render(scrollX, currentBeat); } catch(e) { /* non uccidere il RAF */ }

    var totalBeats = this.MEASURES * this.BEATS_PER;
    if (currentBeat > totalBeats + 1.5) {
      this._playing = false;
      this._rafId   = null;
      this._finish();
      return;
    }

    var self = this;
    this._rafId = requestAnimationFrame(function(ts) { self._drawFrame(ts); });
  }

  _drawPreview() {
    /* Show score before start: first note at PLX + 1 beat right */
    var previewScrollX = this.PLX + this.PPB * (this.PRE_BEATS + 0.5);
    this._render(previewScrollX, -9999); /* currentBeat far negative = no active notes */
  }

  /* ==========================
     RENDERING
     ========================== */
  _render(scrollX, currentBeat) {
    var ctx = this._ctx;
    var W   = this._canvas.width;
    var H   = this._canvas.height;
    if (!ctx) return;

    /* Background */
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    /* Row separators */
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth   = 1;
    for (var vi = 1; vi < this.voices.length; vi++) {
      var ry = vi * this._rowH;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
    }

    /* Staff lines (fixed screen-space, one set per row) */
    for (var vi = 0; vi < this.voices.length; vi++) {
      var sMY = vi * this._rowH + Math.round(this._rowH * 0.52);
      ctx.strokeStyle = this.voices[vi].color + '35';
      ctx.lineWidth   = 1;
      for (var li = -2; li <= 2; li++) {
        var ly = sMY + li * this.SP;
        ctx.beginPath();
        ctx.moveTo(this.LW, ly);
        ctx.lineTo(W, ly);
        ctx.stroke();
      }
    }

    /* Scrolling content (barlines + notes) */
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.LW, 0, W - this.LW, H);
    ctx.clip();
    ctx.translate(scrollX, 0);

    for (var vi = 0; vi < this.voices.length; vi++) {
      this._drawScrollRow(ctx, vi, scrollX, W, currentBeat);
    }

    ctx.restore();

    /* Left label panel */
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, this.LW, H);
    /* Label panel right border */
    ctx.strokeStyle = '#1e1e32';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(this.LW, 0); ctx.lineTo(this.LW, H); ctx.stroke();

    /* Voice labels */
    for (var vi = 0; vi < this.voices.length; vi++) {
      var v   = this.voices[vi];
      var sMY = vi * this._rowH + Math.round(this._rowH * 0.52);
      ctx.fillStyle    = v.color;
      ctx.font         = 'bold 22px system-ui, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.label, this.LW / 2, sMY);
      ctx.fillStyle = v.color + '55';
      ctx.font      = '10px system-ui, sans-serif';
      ctx.fillText(v.name, this.LW / 2, sMY + this.SP * 2.4);
    }
    ctx.textBaseline = 'alphabetic';

    /* Playhead */
    ctx.strokeStyle = '#e94560cc';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(this.PLX, 0); ctx.lineTo(this.PLX, H); ctx.stroke();
    ctx.setLineDash([]);
    /* Playhead triangle */
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.moveTo(this.PLX - 7, 0);
    ctx.lineTo(this.PLX + 7, 0);
    ctx.lineTo(this.PLX, 9);
    ctx.closePath();
    ctx.fill();
  }

  _drawScrollRow(ctx, vi, scrollX, W, currentBeat) {
    var v   = this.voices[vi];
    var sMY = vi * this._rowH + Math.round(this._rowH * 0.52);
    var notes = this._seqs[vi];

    /* Time signature "4/4" at start of score */
    ctx.fillStyle    = v.color + '70';
    ctx.font         = 'bold 15px Georgia, serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('4', -30, sMY - this.SP * 0.4);
    ctx.fillText('4', -30, sMY + this.SP * 1.5);

    /* Double barline at start */
    ctx.strokeStyle = v.color + '60';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, sMY - this.SP*2); ctx.lineTo(-6, sMY + this.SP*2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-2, sMY - this.SP*2); ctx.lineTo(-2, sMY + this.SP*2); ctx.stroke();

    /* Barlines + measure numbers */
    for (var m = 0; m <= this.MEASURES; m++) {
      var bx     = m * this.BEATS_PER * this.PPB;
      var bxScr  = bx + scrollX;
      if (bxScr < this.LW - 20 || bxScr > W + 20) continue;

      ctx.strokeStyle = m === this.MEASURES ? v.color + '80' : v.color + '30';
      ctx.lineWidth   = m === this.MEASURES ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(bx, sMY - this.SP * 2);
      ctx.lineTo(bx, sMY + this.SP * 2);
      ctx.stroke();

      /* Final double barline */
      if (m === this.MEASURES) {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(bx + 5, sMY - this.SP * 2);
        ctx.lineTo(bx + 5, sMY + this.SP * 2);
        ctx.stroke();
      }

      /* Measure number (above first row only) */
      if (vi === 0 && m > 0 && m < this.MEASURES) {
        ctx.fillStyle    = '#8892a430';
        ctx.font         = '9px system-ui, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(m + 1, bx, sMY - this.SP * 2 - 3);
      }
    }

    /* Notes */
    for (var ni = 0; ni < notes.length; ni++) {
      var note  = notes[ni];
      var nxScr = note.ax + scrollX;
      if (nxScr > W + 80 || nxScr < this.LW - 80) continue;

      var isActive = Math.abs(note.beat - currentBeat) < 0.14;
      this._drawNote(ctx, note, note.ax, sMY, v.color, isActive);
    }
  }

  /* ==========================
     NOTE DRAWING
     ========================== */
  _drawNote(ctx, note, x, sMY, color, isActive) {
    var pitch  = note.pitch;
    var noteY  = sMY - pitch * (this.SP / 2);
    var fc     = isActive ? '#ffffff' : color;
    var sc     = isActive ? '#ffffff' : color;

    ctx.save();
    if (isActive) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 22;
    }

    var type = note.type;
    var NRX  = this.NRX;
    var NRY  = this.NRY;
    var STL  = this.STL;
    var PPB  = this.PPB;

    if (type === 'W') {
      /* Whole note: wider open oval, no stem */
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX * 1.5, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
      /* Inner cutout to simulate open whole note */
      ctx.fillStyle = isActive ? 'rgba(255,255,255,0.15)' : '#0f0f1a';
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX * 0.7, NRY * 0.35, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();

    } else if (type === 'H') {
      /* Half note: open oval + stem */
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
      /* Stem */
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x + NRX - 1, noteY);
      ctx.lineTo(x + NRX - 1, noteY - STL);
      ctx.stroke();

    } else if (type === 'DH') {
      /* Dotted half: open oval + stem + dot */
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x + NRX - 1, noteY);
      ctx.lineTo(x + NRX - 1, noteY - STL);
      ctx.stroke();
      /* Dot */
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.arc(x + NRX + 7, noteY - 2, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'Q') {
      /* Quarter: filled oval + stem */
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x + NRX - 1, noteY);
      ctx.lineTo(x + NRX - 1, noteY - STL);
      ctx.stroke();

    } else if (type === 'E2') {
      /* Eighth pair: two filled ovals + beam */
      var p2   = note.pitch2 !== undefined ? note.pitch2 : pitch;
      var y2   = sMY - p2 * (this.SP / 2);
      var x2   = x + PPB * 0.5;
      /* Noteheads */
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, noteY);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
      ctx.beginPath();
      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(-0.25);
      ctx.ellipse(0, 0, NRX, NRY, 0, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
      /* Stems */
      var t1 = noteY - STL;
      var t2 = y2 - STL;
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x + NRX - 1, noteY); ctx.lineTo(x + NRX - 1, t1); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2 + NRX - 1, y2);  ctx.lineTo(x2 + NRX - 1, t2); ctx.stroke();
      /* Beam */
      ctx.strokeStyle = fc;
      ctx.lineWidth   = 4;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x + NRX - 1,  t1);
      ctx.lineTo(x2 + NRX - 1, t2);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    /* Ledger lines for pitch ±3 */
    if (Math.abs(pitch) >= 3) {
      var lx = Math.round(pitch / 2) * 2;
      ctx.strokeStyle = sc;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - NRX * 1.6, sMY - lx * (this.SP / 2));
      ctx.lineTo(x + NRX * 1.8, sMY - lx * (this.SP / 2));
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ==========================
     FINISH
     ========================== */
  _finish() {
    this._stopMetronome();
    var st = document.getElementById('bt-status');
    if (st) st.textContent = I18n.t('completed');
    var btns = document.getElementById('bt-btns');
    if (btns) btns.style.display = 'flex';
    /* Show final frame */
    var totalBeats = this.MEASURES * this.BEATS_PER;
    var finalScrollX = this.PLX - (totalBeats + 1) * this.PPB;
    this._render(finalScrollX, totalBeats + 2);
  }
}

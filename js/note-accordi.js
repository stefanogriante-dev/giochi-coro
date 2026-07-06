/* ===========================
   NOTE E ACCORDI  v3
   =========================== */

const NoteAccordi = (() => {

  let _audioCtx   = null;
  let _compressor = null;
  let _noteStates = {};
  let _chordState = null;
  let _arpState   = null;

  function _initAudio() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        _compressor = _audioCtx.createDynamicsCompressor();
        _compressor.threshold.value = -18;
        _compressor.knee.value      = 20;
        _compressor.ratio.value     = 6;
        _compressor.attack.value    = 0.003;
        _compressor.release.value   = 0.15;
        _compressor.connect(_audioCtx.destination);
      }
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
    } catch(e) {}
  }

  function _dest() { return _compressor || _audioCtx.destination; }

  /* ---- Note singole: toggle, più note insieme ---- */
  function _toggleNote(note, btn) {
    _initAudio();
    if (!_audioCtx) return;
    var key = String(note.freq);
    if (_noteStates[key]) {
      var s = _noteStates[key], now = _audioCtx.currentTime;
      s.gain.gain.cancelScheduledValues(now);
      s.gain.gain.setValueAtTime(s.gain.gain.value, now);
      s.gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      s.osc.stop(now + 0.35);
      delete _noteStates[key];
      _setNoteActive(btn, false);
    } else {
      var ctx = _audioCtx, now = ctx.currentTime;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(_dest());
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      var gv = note.freq < 250 ? 0.92 : 0.55;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gv, now + 0.025);
      osc.start(now);
      _noteStates[key] = { osc: osc, gain: gain };
      _setNoteActive(btn, true);
    }
  }

  /* ---- Accordi: esclusivi, toggle ---- */
  function _toggleChord(chord, btn) {
    _initAudio();
    if (!_audioCtx) return;
    if (_chordState && _chordState.btn === btn) {
      _stopChord();
    } else {
      _stopChord();
      _startChord(chord, btn);
    }
  }

  function _stopChord() {
    if (!_chordState) return;
    var now = _audioCtx.currentTime, cs = _chordState;
    cs.gains.forEach(function(g) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    });
    cs.oscs.forEach(function(o) { try { o.stop(now + 0.5); } catch(e){} });
    _setChordActive(cs.btn, false);
    _chordState = null;
  }

  function _startChord(chord, btn) {
    var ctx = _audioCtx, now = ctx.currentTime;
    var oscs = [], gains = [];
    chord.notes.forEach(function(freq) {
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(_dest());
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.28);
      osc.start(now);
      oscs.push(osc); gains.push(gain);
    });
    _chordState = { oscs: oscs, gains: gains, btn: btn };
    _setChordActive(btn, true);
  }

  /* ---- Arpeggi: esclusivi, toggle, loop ---- */
  function _toggleArp(chord, btn) {
    _initAudio();
    if (!_audioCtx) return;
    if (_arpState && _arpState.btn === btn) {
      _stopArp();
    } else {
      _stopArp();
      _startArp(chord, btn);
    }
  }

  function _stopArp() {
    if (!_arpState) return;
    clearTimeout(_arpState.timer);
    _setArpActive(_arpState.btn, false);
    _arpState = null;
  }

  function _startArp(chord, btn) {
    _arpState = { btn: btn, notes: chord.notes, idx: 0, timer: null };
    _setArpActive(btn, true);
    _arpTick();
  }

  function _arpTick() {
    if (!_arpState) return;
    var notes = _arpState.notes;
    var idx   = _arpState.idx;

    /* Tutte le note suonate: aspetta il decadimento dell'ultima e spegni */
    if (idx >= notes.length) {
      _arpState.timer = setTimeout(_stopArp, 1000);
      return;
    }

    var freq = notes[idx];
    var ctx = _audioCtx, now = ctx.currentTime;
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(_dest());
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.03);
    gain.gain.setValueAtTime(0.45, now + 0.72);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.95);
    osc.start(now); osc.stop(now + 1.0);

    _arpState.idx++;
    _arpState.timer = setTimeout(_arpTick, 700);
  }

  /* ---- Feedback visivo ---- */
  function _setNoteActive(btn, on) {
    var s = btn.dataset.sharp === 'true';
    btn.style.boxShadow  = on ? '0 0 16px 8px rgba(255,255,255,0.45)' : '';
    btn.style.transform  = on ? 'scale(1.13)' : '';
    btn.style.background = on ? (s ? 'rgba(90,90,150,0.98)' : 'rgba(255,255,255,1)')
                              : (s ? 'rgba(30,30,50,0.92)'  : 'rgba(255,255,255,0.92)');
    btn.style.borderColor = on ? (s ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.90)')
                               : (s ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)');
  }

  function _setChordActive(btn, on) {
    var maj = btn.dataset.type === 'maj';
    btn.style.background  = on ? (maj ? 'rgba(251,191,36,0.42)' : 'rgba(139,92,246,0.42)')
                               : (maj ? 'rgba(251,191,36,0.10)' : 'rgba(139,92,246,0.10)');
    btn.style.boxShadow   = on ? (maj ? '0 0 20px 8px rgba(251,191,36,0.55)' : '0 0 20px 8px rgba(139,92,246,0.55)') : '';
    btn.style.transform   = on ? 'scale(1.10)' : '';
    btn.style.borderColor = on ? (maj ? 'rgba(251,191,36,0.90)' : 'rgba(139,92,246,0.90)')
                               : (maj ? 'rgba(251,191,36,0.55)' : 'rgba(139,92,246,0.55)');
  }

  function _setArpActive(btn, on) {
    btn.style.background  = on ? 'rgba(6,182,212,0.42)' : 'rgba(6,182,212,0.10)';
    btn.style.boxShadow   = on ? '0 0 20px 8px rgba(6,182,212,0.55)' : '';
    btn.style.transform   = on ? 'scale(1.10)' : '';
    btn.style.borderColor = on ? 'rgba(6,182,212,0.90)' : 'rgba(6,182,212,0.55)';
  }

  /* ---- Dati ---- */

  /* Unica riga: Fa3→Si3 + Do4→Fa5 */
  var NOTES = [
    { name:'Fa',   sharp:false, freq:174.61 },
    { name:'Fa♯',  sharp:true,  freq:185.00 },
    { name:'Sol',  sharp:false, freq:196.00 },
    { name:'Sol♯', sharp:true,  freq:207.65 },
    { name:'La',   sharp:false, freq:220.00 },
    { name:'La♯',  sharp:true,  freq:233.08 },
    { name:'Si',   sharp:false, freq:246.94 },
    { name:'Do',   sharp:false, freq:261.63 },
    { name:'Do♯',  sharp:true,  freq:277.18 },
    { name:'Re',   sharp:false, freq:293.66 },
    { name:'Re♯',  sharp:true,  freq:311.13 },
    { name:'Mi',   sharp:false, freq:329.63 },
    { name:'Fa',   sharp:false, freq:349.23 },
    { name:'Fa♯',  sharp:true,  freq:369.99 },
    { name:'Sol',  sharp:false, freq:392.00 },
    { name:'Sol♯', sharp:true,  freq:415.30 },
    { name:'La',   sharp:false, freq:440.00 },
    { name:'La♯',  sharp:true,  freq:466.16 },
    { name:'Si',   sharp:false, freq:493.88 },
    { name:'Do',   sharp:false, freq:523.25 },
    { name:'Do♯',  sharp:true,  freq:554.37 },
    { name:'Re',   sharp:false, freq:587.33 },
    { name:'Re♯',  sharp:true,  freq:622.25 },
    { name:'Mi',   sharp:false, freq:659.25 },
    { name:'Fa',   sharp:false, freq:698.46 },
  ];

  var CHORDS_MAJ = [
    { name:'Do',  notes:[261.63,329.63,392.00,523.25] },
    { name:'Re',  notes:[293.66,369.99,440.00,587.33] },
    { name:'Mi',  notes:[329.63,415.30,493.88,659.25] },
    { name:'Fa',  notes:[349.23,440.00,523.25,698.46] },
    { name:'Sol', notes:[196.00,246.94,293.66,392.00] },
    { name:'La',  notes:[220.00,277.18,329.63,440.00] },
    { name:'Si',  notes:[246.94,311.13,369.99,493.88] },
    { name:'Sib', notes:[233.08,293.66,349.23,466.16] },
    { name:'Mib', notes:[311.13,392.00,466.16,622.25] },
    { name:'Lab', notes:[207.65,261.63,311.13,415.30] },
    { name:'Reb', notes:[277.18,349.23,415.30,554.37] },
  ];

  var CHORDS_MIN = [
    { name:'Do m',  notes:[261.63,311.13,392.00,523.25] },
    { name:'Re m',  notes:[293.66,349.23,440.00,587.33] },
    { name:'Mi m',  notes:[329.63,392.00,493.88,659.25] },
    { name:'Sol m', notes:[196.00,233.08,293.66,392.00] },
    { name:'La m',  notes:[220.00,261.63,329.63,440.00] },
    { name:'Si m',  notes:[246.94,293.66,369.99,493.88] },
    { name:'Sib m', notes:[233.08,277.18,349.23,466.16] },
    { name:'Mib m', notes:[311.13,369.99,466.16,622.25] },
  ];

  /* Pattern su-giù: radice→3a→5a→3a→radice */
  var ARPEGGIOS = [
    { name:'Do',  notes:[261.63,329.63,392.00,329.63,261.63] },
    { name:'Re',  notes:[293.66,369.99,440.00,369.99,293.66] },
    { name:'Mi',  notes:[329.63,415.30,493.88,415.30,329.63] },
    { name:'Fa',  notes:[349.23,440.00,523.25,440.00,349.23] },
    { name:'Sol', notes:[196.00,246.94,293.66,246.94,196.00] },
    { name:'La',  notes:[220.00,277.18,329.63,277.18,220.00] },
    { name:'Si',  notes:[246.94,311.13,369.99,311.13,246.94] },
  ];

  /* ---- Costruzione UI ---- */
  function _noteBtn(note) {
    var btn = document.createElement('button');
    btn.className = 'na-btn';
    btn.textContent = note.name;
    btn.dataset.sharp = String(note.sharp);
    var s = note.sharp;
    btn.style.cssText = [
      'padding:' + (s ? '6px 8px' : '10px 12px'),
      'border-radius:' + (s ? '8px' : '14px'),
      'border:2px solid ' + (s ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)'),
      'background:' + (s ? 'rgba(30,30,50,0.92)' : 'rgba(255,255,255,0.92)'),
      'color:' + (s ? 'rgba(220,220,255,0.85)' : '#111'),
      'font-family:inherit',
      'font-size:' + (s ? 'clamp(0.60rem,1.2vw,0.75rem)' : 'clamp(0.70rem,1.4vw,0.88rem)'),
      'font-weight:800',
      'cursor:pointer',
      'transition:background 0.12s,box-shadow 0.12s,transform 0.08s',
      'user-select:none','-webkit-user-select:none',
      'white-space:nowrap','outline:none',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click', (function(n,b){ return function(){ _toggleNote(n,b); }; })(note, btn));
    return btn;
  }

  function _chordBtn(ch, type) {
    var maj = type === 'maj';
    var btn = document.createElement('button');
    btn.className = 'na-btn'; btn.textContent = ch.name; btn.dataset.type = type;
    btn.style.cssText = [
      'padding:9px 22px','border-radius:24px',
      'border:2px solid ' + (maj ? 'rgba(251,191,36,0.55)' : 'rgba(139,92,246,0.55)'),
      'background:' + (maj ? 'rgba(251,191,36,0.10)' : 'rgba(139,92,246,0.10)'),
      'color:' + (maj ? '#fde68a' : '#c4b5fd'),
      'font-family:inherit','font-size:clamp(0.78rem,1.6vw,0.95rem)','font-weight:800',
      'cursor:pointer','transition:background 0.12s,box-shadow 0.12s,transform 0.08s',
      'user-select:none','-webkit-user-select:none','white-space:nowrap','outline:none',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click', (function(c,b){ return function(){ _toggleChord(c,b); }; })(ch, btn));
    return btn;
  }

  function _arpBtn(ch) {
    var btn = document.createElement('button');
    btn.className = 'na-btn'; btn.textContent = ch.name;
    btn.style.cssText = [
      'padding:9px 22px','border-radius:24px',
      'border:2px solid rgba(6,182,212,0.55)',
      'background:rgba(6,182,212,0.10)',
      'color:#67e8f9',
      'font-family:inherit','font-size:clamp(0.78rem,1.6vw,0.95rem)','font-weight:800',
      'cursor:pointer','transition:background 0.12s,box-shadow 0.12s,transform 0.08s',
      'user-select:none','-webkit-user-select:none','white-space:nowrap','outline:none',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click', (function(c,b){ return function(){ _toggleArp(c,b); }; })(ch, btn));
    return btn;
  }

  function _section(labelText) {
    var sec = document.createElement('div');
    var lbl = document.createElement('div');
    lbl.textContent = labelText;
    lbl.style.cssText = 'font-size:0.65rem;font-weight:800;letter-spacing:4px;color:rgba(255,255,255,0.38);margin-bottom:10px;text-align:center;';
    sec.appendChild(lbl);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 8px;justify-content:center;align-items:center;';
    sec.appendChild(row);
    sec._row = row;
    return sec;
  }

  function _buildScreen() {
    var target = document.getElementById('na-content');
    if (!target || target.dataset.built) return;
    target.dataset.built = '1';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:960px;margin:0 auto;padding:8px 16px 40px;display:flex;flex-direction:column;gap:22px;box-sizing:border-box;';

    /* Unica riga di note */
    var noteSec = document.createElement('div');
    var noteRow = document.createElement('div');
    noteRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 8px;justify-content:center;align-items:center;';
    NOTES.forEach(function(n) { noteRow.appendChild(_noteBtn(n)); });
    noteSec.appendChild(noteRow);
    wrap.appendChild(noteSec);

    var hr1 = document.createElement('div');
    hr1.style.cssText = 'border-top:1px solid rgba(255,255,255,0.10);';
    wrap.appendChild(hr1);

    var majSec = _section('ACCORDI MAGGIORI');
    CHORDS_MAJ.forEach(function(ch) { majSec._row.appendChild(_chordBtn(ch, 'maj')); });
    wrap.appendChild(majSec);

    var minSec = _section('ACCORDI MINORI');
    CHORDS_MIN.forEach(function(ch) { minSec._row.appendChild(_chordBtn(ch, 'min')); });
    wrap.appendChild(minSec);

    var hr2 = document.createElement('div');
    hr2.style.cssText = 'border-top:1px solid rgba(255,255,255,0.10);';
    wrap.appendChild(hr2);

    var arpSec = _section('ARPEGGI MAGGIORI');
    ARPEGGIOS.forEach(function(ch) { arpSec._row.appendChild(_arpBtn(ch)); });
    wrap.appendChild(arpSec);

    target.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', _buildScreen);

  return {};

})();

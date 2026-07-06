/* ===========================
   NOTE E ACCORDI
   Schermata di riferimento: note singole + accordi
   =========================== */

const NoteAccordi = (() => {

  let _audioCtx  = null;
  let _activeOsc = [];
  let _activeTimer = null;

  function _initAudio() {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
    } catch(e) {}
  }

  function _stopActive() {
    _activeOsc.forEach(function(o) { try { o.stop(0); } catch(e) {} });
    _activeOsc = [];
    if (_activeTimer) { clearTimeout(_activeTimer); _activeTimer = null; }
  }

  function _resetButtons() {
    document.querySelectorAll('.na-btn').forEach(function(b) {
      b.style.boxShadow = '';
      b.style.transform = '';
    });
  }

  function _highlight(btn) {
    _resetButtons();
    if (btn) {
      btn.style.boxShadow = '0 0 18px 6px rgba(255,255,255,0.35)';
      btn.style.transform = 'scale(1.10)';
    }
  }

  function _playNote(freq, btn) {
    _initAudio();
    if (!_audioCtx) return;
    _stopActive();
    _highlight(btn);

    var ctx = _audioCtx, now = ctx.currentTime;
    var dur = 2.2, attack = 0.02, release = 0.55;

    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + attack);
    gain.gain.setValueAtTime(0.28, now + dur - release);
    gain.gain.linearRampToValueAtTime(0.0001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.05);
    _activeOsc = [osc];

    _activeTimer = setTimeout(function() {
      _resetButtons(); _activeOsc = [];
    }, dur * 1000);
  }

  function _playChord(notes, btn) {
    _initAudio();
    if (!_audioCtx) return;
    _stopActive();
    _highlight(btn);

    var ctx = _audioCtx, now = ctx.currentTime;
    var dur = 5.0, attack = 0.25, release = 0.9;

    notes.forEach(function(freq) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + attack);
      gain.gain.setValueAtTime(0.15, now + dur - release);
      gain.gain.linearRampToValueAtTime(0.0001, now + dur);
      osc.start(now); osc.stop(now + dur + 0.05);
      _activeOsc.push(osc);
    });

    _activeTimer = setTimeout(function() {
      _resetButtons(); _activeOsc = [];
    }, dur * 1000);
  }

  /* ---- costruzione UI ---- */

  var OCTAVES = [
    {
      label: 'OTTAVA BASSA',
      notes: [
        { name:'Do',   sharp:false, freq:130.81 },
        { name:'Do♯',  sharp:true,  freq:138.59 },
        { name:'Re',   sharp:false, freq:146.83 },
        { name:'Re♯',  sharp:true,  freq:155.56 },
        { name:'Mi',   sharp:false, freq:164.81 },
        { name:'Fa',   sharp:false, freq:174.61 },
        { name:'Fa♯',  sharp:true,  freq:185.00 },
        { name:'Sol',  sharp:false, freq:196.00 },
        { name:'Sol♯', sharp:true,  freq:207.65 },
        { name:'La',   sharp:false, freq:220.00 },
        { name:'La♯',  sharp:true,  freq:233.08 },
        { name:'Si',   sharp:false, freq:246.94 },
      ]
    },
    {
      label: 'OTTAVA ALTA',
      notes: [
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
      ]
    },
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

  function _noteBtn(note) {
    var btn = document.createElement('button');
    btn.className = 'na-btn';
    btn.innerHTML = note.name;
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
      'letter-spacing:0.3px',
      'transition:all 0.10s',
      'user-select:none',
      '-webkit-user-select:none',
      'white-space:nowrap',
      'outline:none',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click', (function(f, b) {
      return function() { _playNote(f, b); };
    })(note.freq, btn));
    return btn;
  }

  function _chordBtn(ch, color, border, bg) {
    var btn = document.createElement('button');
    btn.className = 'na-btn';
    btn.textContent = ch.name;
    btn.style.cssText = [
      'padding:9px 22px',
      'border-radius:24px',
      'border:2px solid ' + border,
      'background:' + bg,
      'color:' + color,
      'font-family:inherit',
      'font-size:clamp(0.78rem,1.6vw,0.95rem)',
      'font-weight:800',
      'cursor:pointer',
      'letter-spacing:0.5px',
      'transition:all 0.12s',
      'user-select:none',
      '-webkit-user-select:none',
      'white-space:nowrap',
      'outline:none',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click', (function(c, b) {
      return function() { _playChord(c.notes, b); };
    })(ch, btn));
    return btn;
  }

  function _section(labelText) {
    var sec = document.createElement('div');

    var lbl = document.createElement('div');
    lbl.textContent = labelText;
    lbl.style.cssText = [
      'font-size:0.65rem',
      'font-weight:800',
      'letter-spacing:4px',
      'color:rgba(255,255,255,0.38)',
      'margin-bottom:10px',
      'text-align:center',
    ].join(';');
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
    wrap.style.cssText = [
      'max-width:960px',
      'margin:0 auto',
      'padding:8px 16px 40px',
      'display:flex',
      'flex-direction:column',
      'gap:22px',
      'box-sizing:border-box',
    ].join(';');

    /* Note per ottava */
    OCTAVES.forEach(function(oct) {
      var sec = _section(oct.label);
      oct.notes.forEach(function(n) { sec._row.appendChild(_noteBtn(n)); });
      wrap.appendChild(sec);
    });

    /* Separatore */
    var hr = document.createElement('div');
    hr.style.cssText = 'border-top:1px solid rgba(255,255,255,0.10);';
    wrap.appendChild(hr);

    /* Accordi maggiori */
    var majSec = _section('ACCORDI MAGGIORI');
    CHORDS_MAJ.forEach(function(ch) {
      majSec._row.appendChild(_chordBtn(ch, '#fde68a', 'rgba(251,191,36,0.55)', 'rgba(251,191,36,0.10)'));
    });
    wrap.appendChild(majSec);

    /* Accordi minori */
    var minSec = _section('ACCORDI MINORI');
    CHORDS_MIN.forEach(function(ch) {
      minSec._row.appendChild(_chordBtn(ch, '#c4b5fd', 'rgba(139,92,246,0.55)', 'rgba(139,92,246,0.10)'));
    });
    wrap.appendChild(minSec);

    target.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', _buildScreen);

  return {};

})();

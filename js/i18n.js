/* ===========================
   i18n — Internazionalizzazione
   Lingue: it (default), en
   =========================== */

var I18n = (function () {

  var _lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'it';

  var _tr = {
    it: {
      /* --- Home --- */
      rotate_device:       'Ruota il dispositivo in orizzontale',
      app_title:           'Giochi di Coro',
      app_subtitle:        'Esercizi interattivi per coro polifonico SATB',
      card_ritmica_title:  'Ritmica',
      card_ritmica_desc:   'Precisione ritmica, stabilità del tempo, indipendenza delle voci',
      card_ritmica_badge:  '4 esercizi',
      card_metro_title:    'Metronomo',
      card_metro_desc:     'Segna il tempo con click acustico e segnale visivo, BPM regolabile',
      card_metro_badge:    'Utilità',
      /* --- Selezione modalità --- */
      mode_title:          'Come vuoi esercitarti?',
      mode_singoli:        'Singoli',
      mode_singoli_sub:    'Un solo esecutore',
      mode_coro:           'Coro a 4 voci',
      mode_coro_sub:       'Soprano · Alto · Tenore · Basso',
      /* --- Schermata Ritmica --- */
      btn_back:            '← Indietro',
      ritmica_title:       'Esercizi <span>Ritmici</span>',
      ritmica_desc:        'Scegli un esercizio. La sequenza cambia ogni volta.',
      simon_title:         'Simon Ritmico',
      simon_desc_coro:     '4 zone per sezione corale: la sequenza si allunga, ogni sezione canta solo al suo turno',
      simon_desc_singoli:  '4 gesti diversi: la sequenza si allunga, ripeti solo il tuo gesto',
      simon_badge:         'Memoria ritmica',
      treno_title:         'Il Treno',
      treno_desc:          'Segui il metronomo visivo: quando sparisce, mantieni il tempo a memoria',
      treno_badge:         'Stabilità del tempo',
      puzzle_title:        'Puzzle a Canone',
      puzzle_desc:         '4 righe con pattern diversi in loop, sfalsati come un canone: ogni sezione segue solo la sua riga',
      puzzle_badge:        'Indipendenza voci',
      batti_title:         'Batti il Tempo',
      batti_desc_coro:     '4 righe di notazione ritmica in scorrimento, una per voce: battete le mani seguendo la vostra riga',
      batti_desc_singoli:  'Notazione ritmica in scorrimento: segui la riga e batti le mani a tempo',
      batti_badge:         'Lettura ritmica',
      /* --- Schermata Livello --- */
      livello_word:        'Livello',
      level_p_name:        'Principiante',
      level_m_name:        'Intermedio',
      level_a_name:        'Avanzato',
      level_p_bpm:         'Sequenze brevi, tempo comodo — suggerito: {bpm} BPM',
      level_m_bpm:         'Sequenze medie, ritmo sostenuto — suggerito: {bpm} BPM',
      level_a_bpm:         'Sequenze lunghe, ritmo serrato — suggerito: {bpm} BPM',
      /* --- Schermata Gioco --- */
      btn_exit:            '✕ Esci',
      btn_start:           '▶ Inizia',
      btn_pause:           '⏸ Pausa',
      btn_resume:          '▶ Riprendi',
      btn_reset:           '↺ Reset',
      /* --- Metronomo --- */
      metro_title:         'Metronomo',
      metro_start:         '▶ Inizia',
      metro_stop:          '⏹ Stop',
      /* --- Overlay --- */
      btn_ok:              'OK',
      btn_cancel:          'Annulla',
      /* --- Titoli giochi (GAME_INFO) --- */
      game_simon_title:    'Simon Ritmico',
      game_treno_title:    'Il Treno',
      game_puzzle_title:   'Puzzle a Canone',
      game_batti_title:    'Batti il Tempo',
      game_ingressi_title: 'Guida agli Ingressi',
      /* --- Descrizioni giochi --- */
      game_simon_desc:     'Ogni sezione esegue solo al suo turno. La sequenza si allunga ad ogni round.',
      game_treno_desc:     'Segui il beat visivo. Quando sparisce, mantieni il tempo a memoria.',
      game_puzzle_desc:    '4 righe sovrapposte, ognuna con il suo pattern. Ogni sezione segue solo la propria riga.',
      game_batti_desc_coro:     'Partitura ritmica in scorrimento: 20 misure in 4/4, una riga per voce. Battete le mani seguendo la vostra parte.',
      game_batti_desc_singoli:  'Partitura ritmica in scorrimento: 20 misure in 4/4, una sola riga. Batti le mani a tempo.',
      game_ingressi_desc:       'Indicatore visivo per canoni: mostra a ogni sezione SATB quando deve entrare.',
      ingressi_title:           'Guida agli Ingressi',
      ingressi_desc:            'Semaforo visivo per canoni: indica quando ogni sezione deve entrare',
      ingressi_badge:           'Canoni',
      /* --- Etichette gesti singoli --- */
      gesture_clap:        '👏 Mani',
      gesture_snap:        '🤌 Schiocco',
      gesture_foot:        '🦶 Piede',
      gesture_up:          '🙌 Mani su',
      /* --- Stringhe dinamiche giochi --- */
      press_start:         'Premi ▶ Inizia',
      press_start_short:   'Premi Inizia',
      scrolling:           '♪ In scorrimento…',
      paused:              'In pausa',
      completed:           '✓ Completato!',
      repeat:              '↩ Ripeti',
      new_seq:             '↻ Nuova sequenza',
      simon_repeat:        '🔁 Ripeti',
      listening:           '🎵 Ascoltate…',
      your_turn:           '🎤 Ora tocca a voi!',
      listening_s:         '🎵 Guarda…',
      your_turn_s:         '👆 Ora tocca a te!',
      well_done:           'Bravi! Avete mantenuto il tempo!',
      ex_completed:        'Esercizio completato',
      enter_now:           'Entra subito',
      enter_at_bar:        'Entra alla battuta {n}',
      seq_info:            'Sequenza: {len} battute  ·  Round {round}',
      cycle:               'Ciclo {n} / {total}',
    },
    en: {
      /* --- Home --- */
      rotate_device:       'Rotate device to landscape',
      app_title:           'Choir Games',
      app_subtitle:        'Interactive exercises for SATB polyphonic choir',
      card_ritmica_title:  'Rhythm',
      card_ritmica_desc:   'Rhythmic precision, tempo stability, voice independence',
      card_ritmica_badge:  '4 exercises',
      card_metro_title:    'Metronome',
      card_metro_desc:     'Keep time with acoustic click and visual signal, adjustable BPM',
      card_metro_badge:    'Utility',
      /* --- Mode selection --- */
      mode_title:          'How do you want to practice?',
      mode_singoli:        'Solo',
      mode_singoli_sub:    'Single performer',
      mode_coro:           '4-Voice Choir',
      mode_coro_sub:       'Soprano · Alto · Tenor · Bass',
      /* --- Rhythm screen --- */
      btn_back:            '← Back',
      ritmica_title:       'Rhythmic <span>Exercises</span>',
      ritmica_desc:        'Choose an exercise. The sequence changes each time.',
      simon_title:         'Rhythmic Simon',
      simon_desc_coro:     '4 zones for choir sections: the sequence grows, each section performs only on its turn',
      simon_desc_singoli:  '4 different gestures: the sequence grows, repeat only your gesture',
      simon_badge:         'Rhythmic memory',
      treno_title:         'The Train',
      treno_desc:          'Follow the visual metronome: when it disappears, keep the beat from memory',
      treno_badge:         'Tempo stability',
      puzzle_title:        'Canon Puzzle',
      puzzle_desc:         '4 rows with different looping patterns, offset like a canon: each section follows only its row',
      puzzle_badge:        'Voice independence',
      batti_title:         'Beat the Time',
      batti_desc_coro:     '4 scrolling rhythmic notation rows, one per voice: clap your hands following your row',
      batti_desc_singoli:  'Scrolling rhythmic notation: follow the row and clap in time',
      batti_badge:         'Rhythmic reading',
      /* --- Level screen --- */
      livello_word:        'Level',
      level_p_name:        'Beginner',
      level_m_name:        'Intermediate',
      level_a_name:        'Advanced',
      level_p_bpm:         'Short sequences, comfortable tempo — suggested: {bpm} BPM',
      level_m_bpm:         'Medium sequences, sustained rhythm — suggested: {bpm} BPM',
      level_a_bpm:         'Long sequences, tight rhythm — suggested: {bpm} BPM',
      /* --- Game screen --- */
      btn_exit:            '✕ Exit',
      btn_start:           '▶ Start',
      btn_pause:           '⏸ Pause',
      btn_resume:          '▶ Resume',
      btn_reset:           '↺ Reset',
      /* --- Metronome --- */
      metro_title:         'Metronome',
      metro_start:         '▶ Start',
      metro_stop:          '⏹ Stop',
      /* --- Overlay --- */
      btn_ok:              'OK',
      btn_cancel:          'Cancel',
      /* --- Game titles (GAME_INFO) --- */
      game_simon_title:    'Rhythmic Simon',
      game_treno_title:    'The Train',
      game_puzzle_title:   'Canon Puzzle',
      game_batti_title:    'Beat the Time',
      game_ingressi_title: 'Entry Guide',
      /* --- Game descriptions --- */
      game_simon_desc:     'Each section performs only on its turn. The sequence grows longer each round.',
      game_treno_desc:     'Follow the visual beat. When it disappears, keep the tempo from memory.',
      game_puzzle_desc:    '4 overlapping rows, each with its own pattern. Each section follows only its own row.',
      game_batti_desc_coro:     'Scrolling rhythmic score: 20 bars in 4/4, one row per voice. Clap your hands following your part.',
      game_batti_desc_singoli:  'Scrolling rhythmic score: 20 bars in 4/4, one single row. Clap your hands in time.',
      game_ingressi_desc:       'Visual indicator for canons: shows each SATB section when to enter.',
      ingressi_title:           'Entry Guide',
      ingressi_desc:            'Visual guide for canons: shows when each section should enter',
      ingressi_badge:           'Canons',
      /* --- Single performer gesture labels --- */
      gesture_clap:        '👏 Clap',
      gesture_snap:        '🤌 Snap',
      gesture_foot:        '🦶 Foot',
      gesture_up:          '🙌 Hands up',
      /* --- Dynamic game strings --- */
      press_start:         'Press ▶ Start',
      press_start_short:   'Press Start',
      scrolling:           '♪ Scrolling…',
      paused:              'Paused',
      completed:           '✓ Completed!',
      repeat:              '↩ Repeat',
      new_seq:             '↻ New sequence',
      simon_repeat:        '🔁 Repeat',
      listening:           '🎵 Listen…',
      your_turn:           '🎤 Now it\'s your turn!',
      listening_s:         '🎵 Watch…',
      your_turn_s:         '👆 Now it\'s your turn!',
      well_done:           'Well done! You kept the tempo!',
      ex_completed:        'Exercise completed',
      enter_now:           'Enter immediately',
      enter_at_bar:        'Enter at bar {n}',
      seq_info:            'Sequence: {len} bars  ·  Round {round}',
      cycle:               'Cycle {n} / {total}',
    },
  };

  function t(key, vars) {
    var str = (_tr[_lang] && _tr[_lang][key]) || (_tr['it'][key]) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace('{' + k + '}', vars[k]);
      });
    }
    return str;
  }

  function applyAll() {
    document.documentElement.lang = _lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'));
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-html'));
      if (val) el.innerHTML = val;
    });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === _lang);
    });
  }

  function setLang(lang) {
    _lang = lang;
    if (typeof localStorage !== 'undefined') localStorage.setItem('lang', lang);
    applyAll();
  }

  function getLang() { return _lang; }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', applyAll);
  }

  return { t: t, setLang: setLang, getLang: getLang, applyAll: applyAll };

})();

/* ===========================
   PUZZLE RITMICO A CANONE
   Valori pattern:
     0 = pausa
     1 = nota da un quarto (quarter note)
     2 = due note da un ottavo (eighth notes)
   =========================== */

class PuzzleGame {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.bpm = state.bpm;

    /* 0=pausa  1=quarto  2=due ottavi */
    var patterns = {
      principiante: [
        [1,0,1,0, 2,0,0,0],
        [1,1,0,0, 1,2,0,0],
        [2,0,0,1, 0,0,1,0],
        [1,0,2,0, 0,1,0,1],
      ],
      intermedio: [
        [1,0,2,1, 0,1,0,0, 2,0,1,0, 0,0,1,0],
        [1,2,0,0, 1,0,1,0, 1,1,0,2, 0,0,0,1],
        [2,0,0,1, 1,0,0,2, 1,0,1,0, 1,0,0,0],
        [1,0,2,0, 0,0,1,1, 0,2,0,0, 1,1,0,1],
      ],
      avanzato: [
        [2,1,0,1, 0,2,1,0, 1,0,0,2, 1,0,1,0],
        [1,0,2,0, 1,1,0,2, 0,0,1,0, 2,0,1,1],
        [0,2,1,0, 1,0,0,1, 2,1,0,0, 0,1,0,2],
        [1,0,0,2, 0,1,0,1, 2,0,1,1, 0,0,2,0],
      ],
    };

    var cfg = {
      principiante: { offsets: [0, 2, 4, 6],   loopLen: 8  },
      intermedio:   { offsets: [0, 4, 8, 12],   loopLen: 16 },
      avanzato:     { offsets: [0, 2, 4, 6],    loopLen: 16 },
    };

    this.cfg      = cfg[state.level]      || cfg.intermedio;
    this.patterns = patterns[state.level] || patterns.intermedio;

    this._randomizePatterns();

    this.voices = [
      { key: 's', label: 'S', name: 'Soprani',   color: '#e74c3c' },
      { key: 'a', label: 'A', name: 'Contralti', color: '#f39c12' },
      { key: 't', label: 'T', name: 'Tenori',    color: '#3498db' },
      { key: 'b', label: 'B', name: 'Bassi',     color: '#2ecc71' },
    ];

    /* Sottodivisione: ottavi per animazione interna */
    this._beat        = 0;
    this._subbeat     = 0;  /* 0 o 1: prima o seconda metà del beat */
    this._subTimer    = null;
    this._timer       = null;
    this._playing     = false;

    this._build();
  }

  _randomizePatterns() {
    this.patterns = this.patterns.map(function(p) {
      var shift = Math.floor(Math.random() * p.length);
      return p.slice(shift).concat(p.slice(0, shift));
    });
    this.patterns = this.patterns.slice().sort(function() { return Math.random() - 0.5; });
  }

  /* Icona per ogni valore */
  _icon(val) {
    if (val === 2) return '<span style="letter-spacing:5px;font-size:0.95rem;">&#9834;&#9834;</span>';
    if (val === 1) return '<span style="font-size:1.1rem;">&#9834;</span>';
    return '';
  }

  _build() {
    var self = this;
    /* Assicura che il container riempia l\'area di gioco */
    this.container.style.alignItems     = 'stretch';
    this.container.style.justifyContent = 'flex-start';
    this.container.style.padding        = '0';
    var html = '<div id="puzzle-container">';

    this.voices.forEach(function(v, vi) {
      var cells  = self.patterns[vi];
      var offset = self.cfg.offsets[vi];
      var color  = v.color;

      html += '<div class="puzzle-row">';
      html += '<div class="puzzle-row-label" style="color:' + color + '">' + v.label + '</div>';
      html += '<div class="puzzle-beats" id="pb-' + v.key + '">';

      cells.forEach(function(val, bi) {
        var bg    = val ? color + '33' : 'transparent';
        var bord  = val ? color + '44' : 'transparent';
        var extra = val === 2 ? 'outline:2px dashed ' + color + '55;outline-offset:-3px;' : '';
        html += '<div class="puzzle-beat-cell ' + (val ? 'note' : 'rest') + '"' +
                ' id="pbc-' + v.key + '-' + bi + '"' +
                ' style="background:' + bg + ';border:2px solid ' + bord + ';' + extra + '">' +
                self._icon(val) +
                '</div>';
      });

      html += '<div class="puzzle-cursor" id="pc-' + v.key + '"' +
              ' style="left:0;background:' + color + ';opacity:0.8"></div>';
      html += '</div>';

      var entryLabel = offset === 0 ? I18n.t('enter_now') : I18n.t('enter_at_bar').replace('{n}', offset + 1);
      html += '<div id="entry-' + v.key + '" style="font-size:0.75rem;color:' + color +
              ';opacity:0.7;min-width:90px;text-align:left;flex-shrink:0;padding-left:8px;">' +
              entryLabel + '</div>';
      html += '</div>';
    });

    html += '</div>';
    this.container.innerHTML = html;
  }

  get _beatMs()    { return Math.round(60000 / this.bpm); }
  get _subBeatMs() { return Math.round(30000 / this.bpm); }  /* metà beat */

  start() {
    if (this._playing) return;
    this._playing  = true;
    this._beat     = 0;
    this._subbeat  = 0;
    this._tick();
  }

  pause() {
    this._playing = false;
    this._clearTimers();
    this._clearHighlights();
  }

  stop() {
    this._playing = false;
    this._clearTimers();
    this._clearHighlights();
  }

  updateBpm(bpm) { this.bpm = bpm; }

  _tick() {
    if (!this._playing) return;
    var self = this;

    this._subbeat = 0;
    this._renderBeat(0);

    /* Se la cella corrente è un "2" (due ottavi), anima la seconda metà */
    this._subTimer = setTimeout(function() {
      if (!self._playing) return;
      self._subbeat = 1;
      self._renderSubBeat();
    }, this._subBeatMs);

    this._beat++;
    this._timer = setTimeout(function() { self._tick(); }, this._beatMs);
  }

  /* Render al secondo ottavo (solo visivo: cambia le celle con val=2) */
  _renderSubBeat() {
    var self = this;
    this.voices.forEach(function(v, vi) {
      var offset = self.cfg.offsets[vi];
      if (self._beat - 1 < offset) return;

      var cells       = self.patterns[vi];
      var loopLen     = self.cfg.loopLen;
      var localBeat   = (self._beat - 1 - offset) % loopLen;
      var beatInPat   = localBeat % cells.length;
      var val         = cells[beatInPat];

      if (val !== 2) return;  /* solo ottavi ricevono il secondo flash */

      var cell = document.getElementById('pbc-' + v.key + '-' + beatInPat);
      if (!cell) return;
      /* Flash leggero sul secondo ottavo: brightens momentaneamente */
      cell.style.filter = 'brightness(1.5)';
      setTimeout(function() { if (cell) cell.style.filter = ''; }, 80);
    });
  }

  _renderBeat(subbeat) {
    var self    = this;
    var loopLen = this.cfg.loopLen;

    this.voices.forEach(function(v, vi) {
      var offset = self.cfg.offsets[vi];
      var cells  = self.patterns[vi];
      var color  = v.color;

      if (self._beat < offset) {
        for (var ci = 0; ci < cells.length; ci++) {
          var cell = document.getElementById('pbc-' + v.key + '-' + ci);
          if (cell) {
            cell.style.background = cells[ci] ? color + '22' : 'transparent';
            cell.style.transform  = 'none';
            cell.style.boxShadow  = 'none';
            cell.style.filter     = '';
          }
        }
        var cur = document.getElementById('pc-' + v.key);
        if (cur) cur.style.left = '0%';
        return;
      }

      var localBeat   = (self._beat - offset) % loopLen;
      var beatInPat   = localBeat % cells.length;
      var entryEl     = document.getElementById('entry-' + v.key);
      if (entryEl) entryEl.textContent = '';

      for (var ci = 0; ci < cells.length; ci++) {
        var cell = document.getElementById('pbc-' + v.key + '-' + ci);
        if (!cell) continue;
        var val      = cells[ci];
        var isActive = ci === beatInPat;
        cell.style.filter = '';

        if (isActive) {
          if (val === 2) {
            /* Due ottavi: sfondo pieno + contorno tratteggiato + scaling */
            cell.style.background = color;
            cell.style.transform  = 'scaleY(1.1)';
            cell.style.boxShadow  = '0 0 18px ' + color;
            cell.style.outline    = '2px dashed white';
            cell.style.outlineOffset = '-3px';
          } else if (val === 1) {
            cell.style.background = color;
            cell.style.transform  = 'scaleY(1.15)';
            cell.style.boxShadow  = '0 0 16px ' + color;
            cell.style.outline    = '';
          } else {
            cell.style.background = color + '22';
            cell.style.transform  = 'none';
            cell.style.boxShadow  = 'none';
            cell.style.outline    = '';
          }
        } else {
          cell.style.background = val ? color + '33' : 'transparent';
          cell.style.transform  = 'none';
          cell.style.boxShadow  = 'none';
          cell.style.outline    = val === 2 ? '2px dashed ' + color + '55' : '';
          cell.style.outlineOffset = '-3px';
        }
      }

      var cursor = document.getElementById('pc-' + v.key);
      if (cursor) cursor.style.left = ((beatInPat / cells.length) * 100) + '%';
    });
  }

  _clearHighlights() {
    var self = this;
    this.voices.forEach(function(v, vi) {
      var color = self.voices[vi].color;
      self.patterns[vi].forEach(function(val, bi) {
        var cell = document.getElementById('pbc-' + v.key + '-' + bi);
        if (cell) {
          cell.style.background    = val ? color + '33' : 'transparent';
          cell.style.transform     = 'none';
          cell.style.boxShadow     = 'none';
          cell.style.outline       = val === 2 ? '2px dashed ' + color + '55' : '';
          cell.style.outlineOffset = '-3px';
          cell.style.filter        = '';
        }
      });
      var cursor = document.getElementById('pc-' + v.key);
      if (cursor) cursor.style.left = '0%';
    });
  }

  _clearTimers() {
    if (this._timer)    { clearTimeout(this._timer);    this._timer    = null; }
    if (this._subTimer) { clearTimeout(this._subTimer); this._subTimer = null; }
  }
}

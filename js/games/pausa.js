/* ===========================
   INDOVINA LA PAUSA
   Schema ritmico visivo con pause di
   lunghezza variabile; il coro deve restare
   in silenzio e ripartire al momento giusto.
   =========================== */

class PausaGame {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.bpm = state.bpm;

    // Config per livello
    // Schema: array di oggetti { type: 'beat'|'rest', len: N }
    // 'beat' = il coro canta (N battute), 'rest' = silenzio (N battute)
    const sequences = {
      principiante: [
        { type: 'beat', len: 4 },
        { type: 'rest', len: 2 },
        { type: 'beat', len: 4 },
        { type: 'rest', len: 3 },
        { type: 'beat', len: 4 },
        { type: 'rest', len: 1 },
        { type: 'beat', len: 4 },
      ],
      intermedio: [
        { type: 'beat', len: 4 },
        { type: 'rest', len: 3 },
        { type: 'beat', len: 3 },
        { type: 'rest', len: 5 },
        { type: 'beat', len: 4 },
        { type: 'rest', len: 2 },
        { type: 'beat', len: 2 },
        { type: 'rest', len: 4 },
        { type: 'beat', len: 4 },
      ],
      avanzato: [
        { type: 'beat', len: 4 },
        { type: 'rest', len: 5 },
        { type: 'beat', len: 2 },
        { type: 'rest', len: 7 },
        { type: 'beat', len: 3 },
        { type: 'rest', len: 3 },
        { type: 'beat', len: 4 },
        { type: 'rest', len: 6 },
        { type: 'beat', len: 4 },
      ],
    };

    // Sequenze casuali extra (generate dinamicamente)
    const base = sequences[state.level] || sequences.intermedio;
    this.sequence = this._randomizeSequence(base, state.level);

    // Espandi la sequenza in un array piatto di celle
    this.cells = this._expandSequence(this.sequence);

    this._cellIdx  = 0;
    this._timer    = null;
    this._playing  = false;

    this._build();
  }

  /* ---- RANDOMIZZA SEQUENZA ---- */
  _randomizeSequence(base, level) {
    // Mescola le lunghezze delle pause mantenendo il pattern beat/rest
    return base.map(seg => {
      if (seg.type === 'rest') {
        const variations = {
          principiante: [1,2,3,4],
          intermedio:   [2,3,4,5,6],
          avanzato:     [3,4,5,6,7,8],
        };
        const pool = variations[level] || variations.intermedio;
        const len  = pool[Math.floor(Math.random() * pool.length)];
        return { ...seg, len };
      }
      return { ...seg };
    });
  }

  /* ---- ESPANDI IN CELLE ---- */
  _expandSequence(seq) {
    const cells = [];
    for (const seg of seq) {
      for (let i = 0; i < seg.len; i++) {
        cells.push({
          type: seg.type,
          num:  i + 1,
          total: seg.len,
          isFirst: i === 0,
          isLast:  i === seg.len - 1,
        });
      }
    }
    return cells;
  }

  /* ---- BUILD UI ---- */
  _build() {
    this.container.innerHTML = `
      <div id="pausa-container">
        <div id="pausa-status">Premi ▶ Inizia</div>

        <div id="pausa-sequence">
          ${this.cells.map((c, i) => `
            <div class="pausa-cell ${c.type === 'beat' ? 'beat' : 'rest-cell'}"
                 id="pc-${i}"
                 title="${c.type === 'beat' ? '♩' : '—'}">
              ${c.type === 'beat' ? '♩' : '—'}
            </div>
          `).join('')}
        </div>

        <div id="pausa-big-rest"></div>

        <div id="pausa-countdown"></div>
      </div>
    `;
  }

  get _beatMs() {
    return Math.round(60000 / this.bpm);
  }

  /* ---- START / STOP ---- */
  start() {
    if (this._playing) return;
    this._playing = true;
    this._cellIdx = 0;
    this._tick();
  }

  pause() {
    this._playing = false;
    this._clearTimer();
    this._setStatus('In pausa');
    this._clearActive();
  }

  stop() {
    this._playing = false;
    this._clearTimer();
    this._clearActive();
  }

  updateBpm(bpm) {
    this.bpm = bpm;
  }

  /* ---- TICK ---- */
  _tick() {
    if (!this._playing) return;

    if (this._cellIdx >= this.cells.length) {
      this._finish();
      return;
    }

    const cell = this.cells[this._cellIdx];
    this._highlightCell(this._cellIdx);

    if (cell.type === 'beat') {
      this._setStatus('🎵 Cantate!');
      this._setBigRest('');
      this._setCountdown('');
    } else {
      // Pausa: mostra quante battute mancano
      const remaining = cell.total - cell.num + 1;
      if (cell.isFirst) {
        this._setStatus('🤫 SILENZIO!');
      }
      this._setBigRest(`Pausa: ${cell.total} battute`);
      this._setCountdown(remaining.toString());
    }

    this._cellIdx++;
    this._timer = setTimeout(() => this._tick(), this._beatMs);
  }

  /* ---- UI HELPERS ---- */
  _highlightCell(idx) {
    // Rimuove active dalle precedenti
    document.querySelectorAll('.pausa-cell').forEach((el, i) => {
      el.classList.remove('active');
      if (i < idx) el.classList.add('past');
    });
    const el = document.getElementById(`pc-${idx}`);
    if (el) {
      el.classList.add('active');
      el.classList.remove('past');
      // Scrolla verso la cella se la sequenza è lunga
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  _clearActive() {
    document.querySelectorAll('.pausa-cell').forEach(el => {
      el.classList.remove('active', 'past');
    });
  }

  _setStatus(txt) {
    const el = document.getElementById('pausa-status');
    if (el) el.textContent = txt;
  }

  _setBigRest(txt) {
    const el = document.getElementById('pausa-big-rest');
    if (el) el.textContent = txt;
  }

  _setCountdown(txt) {
    const el = document.getElementById('pausa-countdown');
    if (el) el.textContent = txt;
  }

  /* ---- FINE ---- */
  _finish() {
    this._playing = false;
    this._setStatus('🏆 Perfetto! Avete rispettato tutte le pause!');
    this._setBigRest('');
    this._setCountdown('✓');
    document.getElementById('btn-start-stop').textContent = '▶ Ricomincia';
  }

  _clearTimer() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }
}

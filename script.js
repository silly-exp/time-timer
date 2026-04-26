(() => {
  const $ = id => document.getElementById(id);
  const modeSelect   = $('modeSelect');
  const modeControls = $('modeControls');
  const sector       = $('sector');
  const timeLabel    = $('timeLabel');

  // Core timer state (mode-agnostic)
  let totalSeconds = 0;
  let remaining    = 0;
  let running      = false;
  let timerId      = null;
  let started      = false;
  let activeMode   = null;

  // ── Rendering (mode-agnostic) ────────────────────────────────────────────

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function polar(cx, cy, r, deg) {
    const rad = deg * Math.PI / 180;
    return { x: (cx + r * Math.cos(rad)).toFixed(6), y: (cy + r * Math.sin(rad)).toFixed(6) };
  }

  function sectorPath(fraction) {
    if (fraction <= 0) return '';
    if (fraction >= 1) return 'M 0 0 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0';
    const angle = fraction * 360;
    const large = angle > 180 ? 1 : 0;
    const start = polar(0, 0, 1, -90);
    const end   = polar(0, 0, 1, -90 + angle);
    return `M 0 0 L ${start.x} ${start.y} A 1 1 0 ${large} 1 ${end.x} ${end.y} Z`;
  }

  function render() {
    const frac = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 1;
    sector.setAttribute('d', sectorPath(frac));
    timeLabel.textContent = totalSeconds > 0 ? formatTime(Math.ceil(remaining)) : '--:--';
  }

  // ── Animation (mode-agnostic) ────────────────────────────────────────────

  function tick() {
    let last = performance.now();
    timerId = requestAnimationFrame(function loop(now) {
      const delta = (now - last) / 1000;
      last = now;
      if (running) {
        remaining -= delta;
        if (remaining <= 0) {
          remaining = 0;
          running   = false;
          render();
          timerId = null;
          activeMode.syncButtons({ running, started });
          return;
        }
        render();
      }
      timerId = requestAnimationFrame(loop);
    });
  }

  // ── Core actions ─────────────────────────────────────────────────────────

  function play() {
    if (running) return;
    if (!started || remaining <= 0 || activeMode.alwaysRecompute) {
      const secs = activeMode.computeTotalSeconds();
      if (secs <= 0) return;
      totalSeconds = secs;
      remaining    = secs;
    }
    started = true;
    running = true;
    render();
    if (!timerId) tick();
    activeMode.syncButtons({ running, started });
  }

  function pause() {
    if (!running) return;
    running = false;
    activeMode.syncButtons({ running, started });
  }

  function reset() {
    running = false;
    started = false;
    activeMode.onReset();
    render();
    activeMode.syncButtons({ running, started });
  }

  // ── Mode: Durée ──────────────────────────────────────────────────────────

  const modeDuree = {
    alwaysRecompute: false,

    init(container) {
      container.innerHTML = `
        <label>Minutes : <input id="minutes" type="number" min="0" value="0"></label>
        <label>Secondes : <input id="seconds" type="number" min="0" max="59" value="30"></label>
        <button id="btnPlay">▶</button>
        <button id="btnPause">⏸</button>
        <button id="btnReset">⏮</button>
      `;
      this._play    = $('btnPlay');
      this._pause   = $('btnPause');
      this._reset   = $('btnReset');
      this._minutes = $('minutes');
      this._seconds = $('seconds');

      this._play.addEventListener('click', play);
      this._pause.addEventListener('click', pause);
      this._reset.addEventListener('click', reset);

      const onInputChange = () => {
        if (!started) {
          totalSeconds = this.computeTotalSeconds();
          remaining    = totalSeconds;
          render();
        }
      };
      this._minutes.addEventListener('change', onInputChange);
      this._seconds.addEventListener('change', onInputChange);
    },

    computeTotalSeconds() {
      const m = Math.max(0, parseInt(this._minutes.value) || 0);
      const s = Math.max(0, Math.min(59, parseInt(this._seconds.value) || 0));
      return Math.max(1, m * 60 + s);
    },

    onReset() {
      totalSeconds = this.computeTotalSeconds();
      remaining    = totalSeconds;
    },

    syncButtons({ running, started }) {
      this._play.style.display  = running  ? 'none' : '';
      this._pause.style.display = running  ? ''     : 'none';
      this._reset.style.display = started  ? ''     : 'none';
    }
  };

  // ── Mode: Heure de fin ───────────────────────────────────────────────────

  const modeHeureFin = {
    alwaysRecompute: true,

    init(container) {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');

      container.innerHTML = `
        <label>Heure de fin : <input id="targetTime" type="time" value="${hh}:${mm}"></label>
        <button id="btnPlay">▶</button>
        <button id="btnReset">⏮</button>
      `;
      this._play       = $('btnPlay');
      this._reset      = $('btnReset');
      this._targetTime = $('targetTime');

      this._play.addEventListener('click', play);
      this._reset.addEventListener('click', reset);
    },

    computeTotalSeconds() {
      if (!this._targetTime.value) return 0;
      const [h, m] = this._targetTime.value.split(':').map(Number);
      const now    = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      // si l'heure cible est déjà passée, c'est pour demain
      if (target <= now) target.setDate(target.getDate() + 1);
      return Math.round((target - now) / 1000);
    },

    onReset() {
      totalSeconds = 0;
      remaining    = 0;
    },

    syncButtons({ running }) {
      this._play.style.display  = running ? 'none' : '';
      this._reset.style.display = running ? ''     : 'none';
    }
  };

  // ── Mode management ──────────────────────────────────────────────────────

  const MODES = { duree: modeDuree, heureFin: modeHeureFin };

  function activateMode(id) {
    running = false;
    started = false;
    if (timerId !== null) {
      cancelAnimationFrame(timerId);
      timerId = null;
    }
    activeMode = MODES[id];
    activeMode.init(modeControls);
    activeMode.onReset();
    render();
    activeMode.syncButtons({ running, started });
    tick();
  }

  modeSelect.addEventListener('change', () => activateMode(modeSelect.value));
  activateMode('duree');
})();

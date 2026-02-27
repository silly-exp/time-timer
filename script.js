(() => {
  const $ = id => document.getElementById(id);
  const minutesInput = $('minutes');
  const secondsInput = $('seconds');
  const toggleBtn = $('toggle');
  const resetBtn = $('reset');
  const sector = $('sector');
  const timeLabel = $('timeLabel');

  let totalSeconds = 30;
  let remaining = totalSeconds;
  let timerId = null;
  let running = false;

  function setFromInputs(){
    const m = Math.max(0, parseInt(minutesInput.value)||0);
    const s = Math.max(0, Math.min(59, parseInt(secondsInput.value)||0));
    totalSeconds = m*60 + s;
    if (totalSeconds<=0) totalSeconds = 1;
    remaining = totalSeconds;
    render();
  }

  function formatTime(sec){
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  // Draw sector as an SVG path (wedge) from top (12 o'clock) clockwise
  function sectorPath(fraction){
    // fraction in [0,1]
    if (fraction<=0) return '';
    // full circle: draw as two arcs from center
    if (fraction >= 1) {
      return 'M 0 0 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0';
    }
    const angle = fraction*360;
    const large = angle > 180 ? 1 : 0;
    // start at top (0,-1) in our viewBox centered at 0,0 radius 1
    const start = polar(0,0,1, -90);
    const end = polar(0,0,1, -90 + angle);
    return `M 0 0 L ${start.x} ${start.y} A 1 1 0 ${large} 1 ${end.x} ${end.y} Z`;
  }

  function polar(cx,cy,r,deg){
    const rad = deg * Math.PI/180;
    return {x:(cx + r*Math.cos(rad)).toFixed(6), y:(cy + r*Math.sin(rad)).toFixed(6)};
  }

  function render(){
    const frac = Math.max(0, Math.min(1, remaining / totalSeconds));
    sector.setAttribute('d', sectorPath(frac));
    timeLabel.textContent = formatTime(Math.ceil(remaining));
  }

  function tick(){
    const start = performance.now();
    let last = start;
    timerId = requestAnimationFrame(function loop(now){
      const delta = (now - last)/1000;
      last = now;
      if (running){
          remaining -= delta;
          if (remaining <= 0){
            remaining = 0;
            running = false;
            // final render
            render();
            if (toggleBtn) toggleBtn.textContent = 'Démarrer';
            cancelAnimationFrame(timerId);
            // optional: brief flash? keep simple for now
            return;
          }
          render();
        }
      timerId = requestAnimationFrame(loop);
    });
  }

  toggleBtn.addEventListener('click', ()=>{
    if (running){
      // pause
      running = false;
      toggleBtn.textContent = 'Démarrer';
      return;
    }
    // start / resume
    setFromInputs();
    if (remaining<=0) return;
    running = true;
    toggleBtn.textContent = 'Pause';
    if (!timerId) tick();
  });

  resetBtn.addEventListener('click', ()=>{
    running = false;
    setFromInputs();
    if (toggleBtn) toggleBtn.textContent = 'Démarrer';
  });

  minutesInput.addEventListener('change', setFromInputs);
  secondsInput.addEventListener('change', setFromInputs);

  // initialize
  setFromInputs();
  // start the RAF loop even if not running so pause/resume is immediate
  tick();

})();

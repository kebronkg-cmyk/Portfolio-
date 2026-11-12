/* Boot screen: percentage counter, dotted bar and a terminal log.
   Finishes with a CRT "power on" beam. */
export function createPreloader() {
  const count = document.querySelector('.js-count');
  const bar = document.querySelector('.js-bar');
  const log = document.querySelector('.js-log');
  let shown = 0;
  let target = 0;
  let raf = 0;
  const started = performance.now();

  const tick = () => {
    shown += (target - shown) * 0.12;
    if (target - shown < 0.002) shown = target;
    const pct = Math.round(shown * 100);
    count.textContent = String(pct).padStart(3, '0');
    bar.style.width = pct + '%';
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  function line(text) {
    const li = document.createElement('li');
    li.textContent = text;
    log.appendChild(li);
    while (log.children.length > 5) log.firstChild.remove();
  }

  return {
    set(p, msg) {
      target = Math.max(target, Math.min(1, p));
      if (msg) line(msg);
    },
    line,
    async done(minDuration = 1600) {
      target = 1;
      const wait = Math.max(0, minDuration - (performance.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      // wait for counter to catch up
      await new Promise((r) => {
        const check = () => (shown >= 0.999 ? r() : requestAnimationFrame(check));
        check();
      });
      line('signal locked');
      await new Promise((r) => setTimeout(r, 220));
      document.body.classList.add('is-booted');
      document.body.classList.remove('is-loading');
      setTimeout(() => cancelAnimationFrame(raf), 1200);
    },
  };
}

/* Loading screen: a counter whose colour runs from cold blue to warm ember
   as it fills, then the picture opens like an iris. */
export function createPreloader() {
  const root = document.querySelector('.preloader');
  const count = document.querySelector('.js-count');
  let shown = 0;
  let target = 0;
  let raf = 0;
  const started = performance.now();

  const tick = () => {
    shown += (target - shown) * 0.1;
    if (target - shown < 0.002) shown = target;
    count.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    root.style.setProperty('--p', shown.toFixed(3));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    set(p) {
      target = Math.max(target, Math.min(1, p));
    },
    async done(minDuration = 1500) {
      target = 1;
      await new Promise((r) => setTimeout(r, Math.max(0, minDuration - (performance.now() - started))));
      await new Promise((r) => {
        const check = () => (shown >= 0.999 ? r() : requestAnimationFrame(check));
        check();
      });
      await new Promise((r) => setTimeout(r, 180));
      document.body.classList.add('is-booted');
      document.body.classList.remove('is-loading');
      setTimeout(() => cancelAnimationFrame(raf), 1200);
    },
  };
}

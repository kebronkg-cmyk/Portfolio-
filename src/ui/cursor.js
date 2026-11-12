/* Crosshair cursor with a bracketed label ("[ open project ]"). */
export function createCursor() {
  const el = document.querySelector('.cursor');
  const label = el.querySelector('.cursor__label');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let x = innerWidth / 2,
    y = innerHeight / 2,
    cx = x,
    cy = y;
  let text = '';

  if (fine) {
    addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
    });
    document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const link = e.target.closest('a, button, label, [data-cursor]');
      el.classList.toggle('is-link', !!link);
    });
    const loop = () => {
      cx += (x - cx) * 0.35;
      cy += (y - cy) * 0.35;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  return {
    setLabel(t) {
      if (t === text) return;
      text = t;
      if (t) label.textContent = t;
      el.classList.toggle('has-label', !!t);
      document.body.style.cursor = t && !fine ? 'pointer' : '';
    },
  };
}

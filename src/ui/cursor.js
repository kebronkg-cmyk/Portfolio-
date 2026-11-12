/* The normal system cursor stays. Over a project panel a warm disc with a
   label ("Ansehen") follows the pointer. */
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
    const loop = () => {
      cx += (x - cx) * 0.3;
      cy += (y - cy) * 0.3;
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
      document.body.classList.toggle('has-pick', !!t);
    },
  };
}

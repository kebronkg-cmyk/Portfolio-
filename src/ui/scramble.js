/* Text settles out of flickering signs – the same family of glyphs the swarm is made of. */
const GLYPHS = '01{}[]<>/\\|#*+=_?!;:$%&@^~█▓▒░▚▞◆■□';

/**
 * @param el    element whose text should scramble in
 * @param text  new text (null = keep what is there; child <span>s are scrambled one by one)
 */
export function scramble(el, text = null, duration = 650) {
  if (!el) return;
  if (text === null && el.children.length) {
    [...el.children].forEach((c, i) => setTimeout(() => scramble(c, c.dataset.final ?? c.textContent, duration), i * 120));
    return;
  }
  const final = text ?? el.dataset.final ?? el.textContent;
  el.dataset.final = final;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = final;
    return;
  }
  cancelAnimationFrame(el._scr);
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      out += ch === ' ' || i / final.length < p * 1.2 - 0.15 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(tick);
    else el.textContent = final;
  };
  el._scr = requestAnimationFrame(tick);
}

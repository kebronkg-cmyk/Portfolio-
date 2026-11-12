/* Text scramble: letters flicker through glyphs before settling. */
const GLYPHS = '█▓▒░<>/\\[]{}—=+*^?#_01';

export function scramble(el, { duration = 420, text } = {}) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const final = text ?? el.dataset.scrambleText ?? el.textContent;
  el.dataset.scrambleText = final;
  const start = performance.now();
  cancelAnimationFrame(el._scr);
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      const reveal = i / final.length < p * 1.15 - 0.1;
      out += ch === ' ' || reveal ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(tick);
    else el.textContent = final;
  };
  el._scr = requestAnimationFrame(tick);
}

/* Attach to hover of every [data-scramble] / .glitch-hover element that holds plain text. */
export function bindScramble(root = document) {
  root.addEventListener(
    'pointerenter',
    (e) => {
      const el = e.target.closest?.('.glitch-hover, .menu__nav a, .work__list button, .btn-bracket span');
      if (!el || el._scrBusy) return;
      const target = el.matches('.menu__nav a') ? el.firstChild : el;
      if (!target) return;
      el._scrBusy = true;
      if (target.nodeType === 3) {
        // text node: wrap scramble on a temporary span
        const final = target.textContent;
        const span = document.createElement('span');
        span.textContent = final;
        target.replaceWith(span);
        scramble(span, { text: final });
        setTimeout(() => {
          span.replaceWith(document.createTextNode(final));
          el._scrBusy = false;
        }, 460);
      } else {
        delete target.dataset.scrambleText;
        scramble(target);
        setTimeout(() => (el._scrBusy = false), 460);
      }
    },
    true,
  );
}

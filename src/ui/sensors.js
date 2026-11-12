/* Mobile: ask for motion/orientation sensors and use device tilt as "pointer". */
const KEY = 'portfolio-sensors';

export function setupSensors(onTilt) {
  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isTouch || typeof DeviceOrientationEvent === 'undefined') return false;
  const box = document.querySelector('.sensors');
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {}

  let base = null;
  const handler = (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    const x = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25));
    const y = Math.max(-1, Math.min(1, -(e.beta - base.b) / 25));
    onTilt(x, y);
  };

  const enable = async () => {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') return false;
      }
      addEventListener('deviceorientation', handler);
      return true;
    } catch {
      return false;
    }
  };

  const close = (v) => {
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };

  if (stored === 'allow' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    enable();
    return true;
  }
  if (stored === 'decline') return false;

  setTimeout(() => {
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
  }, 2600);
  box.querySelector('.js-sensors-allow').addEventListener('click', async () => {
    const ok = await enable();
    close(ok ? 'allow' : 'decline');
  });
  box.querySelector('.js-sensors-decline').addEventListener('click', () => close('decline'));
  return true;
}

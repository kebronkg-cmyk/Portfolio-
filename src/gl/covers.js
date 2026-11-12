/* Generated placeholder artwork for projects without real images.
   Each project gets a small set of "screenshots" in its own palette:
   a landing page, a type poster, a UI grid and mobile screens. */

const W = 1600;
const H = 1000;
const SANS = '900 {s}px "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = '500 {s}px "JetBrains Mono", ui-monospace, monospace';
const DOT = '900 {s}px "Doto", ui-monospace, monospace';
const f = (tpl, s) => tpl.replace('{s}', Math.round(s));

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

function canvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function grain(ctx, w, h, amt = 18) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function navBar(ctx, p, fg, accent) {
  ctx.fillStyle = fg;
  ctx.font = f(SANS, 26);
  ctx.textBaseline = 'middle';
  ctx.fillText(p.title.split(' ')[0], 60, 60);
  ctx.font = f(MONO, 17);
  const items = ['WORK', 'STUDIO', 'JOURNAL', 'SHOP'];
  items.forEach((t, i) => ctx.fillText(t, W - 640 + i * 110, 60));
  ctx.fillStyle = accent;
  roundRect(ctx, W - 190, 38, 130, 44, 22);
  ctx.fill();
  ctx.fillStyle = p.palette[0];
  ctx.fillText('CONTACT', W - 168, 61);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function blob(ctx, r, cx, cy, rad, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad * (0.75 + r() * 0.45);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(x1, y1, (x1 + pts[(i + 2) % n][0]) / 2, (y1 + pts[(i + 2) % n][1]) / 2);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.1, 0, 0, rad * 1.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function landing(p) {
  const [c, ctx] = canvas();
  const [bg, accent, fg] = p.palette;
  const r = rng(seedOf(p.slug));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // big shape
  blob(ctx, r, W * 0.68, H * 0.56, 330, accent);
  // dotted orbit
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.56, 470, 170, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  navBar(ctx, p, fg, accent);
  // headline
  ctx.fillStyle = fg;
  ctx.textBaseline = 'alphabetic';
  const words = p.kicker.split(' ');
  const lines = [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')];
  let size = 150;
  ctx.font = f(SANS, size);
  while (Math.max(...lines.map((l) => ctx.measureText(l).width)) > W * 0.62) {
    size -= 6;
    ctx.font = f(SANS, size);
  }
  lines.forEach((l, i) => ctx.fillText(l, 60, 360 + i * size * 0.92));
  ctx.font = f(MONO, 20);
  ctx.globalAlpha = 0.7;
  ctx.fillText('— ' + p.title.toLowerCase() + ' / ' + p.year, 64, 360 + lines.length * size * 0.92 + 30);
  ctx.globalAlpha = 1;
  // CTA
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  roundRect(ctx, 60, H - 170, 230, 64, 32);
  ctx.stroke();
  ctx.font = f(MONO, 18);
  ctx.fillText('EXPLORE  →', 98, H - 131);
  // footer ticker
  ctx.globalAlpha = 0.5;
  ctx.font = f(MONO, 14);
  ctx.fillText('SCROLL ↓', W - 160, H - 50);
  ctx.globalAlpha = 1;
  grain(ctx, W, H, 14);
  return c;
}

function poster(p) {
  const [c, ctx] = canvas();
  const [bg, accent, fg] = p.palette;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.textBaseline = 'alphabetic';
  const word = p.title.split(' ')[0];
  let size = 560;
  ctx.font = f(SANS, size);
  while (ctx.measureText(word).width > W * 1.25) {
    size -= 10;
    ctx.font = f(SANS, size);
  }
  ctx.save();
  ctx.translate(-40, H * 0.82);
  ctx.fillText(word, 0, 0);
  ctx.restore();
  ctx.font = f(DOT, 64);
  ctx.fillStyle = bg;
  ctx.fillText(p.title.split(' ').slice(1).join(' ') || 'STUDIO', 60, 110);
  ctx.font = f(MONO, 18);
  ctx.fillText('(' + p.year + ')', W - 140, 100);
  // stripes
  ctx.fillStyle = fg;
  for (let i = 0; i < 6; i++) ctx.fillRect(W - 360 + i * 46, 170, 18, 240);
  grain(ctx, W, H, 20);
  return c;
}

function uiGrid(p) {
  const [c, ctx] = canvas();
  const [bg, accent, fg] = p.palette;
  const r = rng(seedOf(p.slug) + 3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  navBar(ctx, p, fg, accent);
  const cols = 4,
    gap = 24,
    x0 = 60,
    y0 = 140;
  const cw = (W - x0 * 2 - gap * (cols - 1)) / cols;
  for (let i = 0; i < 8; i++) {
    const cx = x0 + (i % cols) * (cw + gap);
    const cy = y0 + Math.floor(i / cols) * 400;
    ctx.save();
    roundRect(ctx, cx, cy, cw, 300, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(cx, cy, cx + cw, cy + 300);
    const t = r();
    g.addColorStop(0, t > 0.5 ? accent : fg);
    g.addColorStop(1, bg);
    ctx.fillStyle = g;
    ctx.fillRect(cx, cy, cw, 300);
    blob(ctx, r, cx + cw * (0.3 + r() * 0.4), cy + 150, 60 + r() * 60, t > 0.5 ? fg : accent);
    ctx.restore();
    ctx.fillStyle = fg;
    ctx.font = f(SANS, 22);
    ctx.fillText(['OBJ', 'NO.', 'ED.', 'VOL.'][i % 4] + ' ' + String(i + 1).padStart(2, '0'), cx, cy + 336);
    ctx.globalAlpha = 0.6;
    ctx.font = f(MONO, 14);
    ctx.fillText(Math.round(40 + r() * 400) + ' €', cx + cw - 70, cy + 336);
    ctx.globalAlpha = 1;
  }
  grain(ctx, W, H, 12);
  return c;
}

function mobile(p) {
  const [c, ctx] = canvas();
  const [bg, accent, fg] = p.palette;
  const r = rng(seedOf(p.slug) + 9);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, fg);
  g.addColorStop(1, accent);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const pw = 330,
    ph = 690;
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - pw * 1.5 - 50 + i * (pw + 50);
    const y = (H - ph) / 2 + (i === 1 ? -30 : 30);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 20;
    roundRect(ctx, x, y, pw, ph, 44);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, y, pw, ph, 44);
    ctx.clip();
    if (i === 1) blob(ctx, r, x + pw / 2, y + 300, 120, accent);
    else {
      ctx.fillStyle = accent;
      ctx.fillRect(x, y + 120 + i * 40, pw, 220);
    }
    ctx.fillStyle = fg;
    ctx.font = f(SANS, 40);
    ctx.fillText(p.title.split(' ')[0], x + 26, y + ph - 150);
    ctx.font = f(MONO, 13);
    ctx.globalAlpha = 0.6;
    ctx.fillText(p.kicker, x + 28, y + ph - 115);
    ctx.globalAlpha = 1;
    ctx.fillRect(x + pw / 2 - 50, y + ph - 26, 100, 5);
    ctx.restore();
  }
  grain(ctx, W, H, 12);
  return c;
}

export function generateCovers(project) {
  return [landing(project), poster(project), uiGrid(project), mobile(project)];
}

export function canvasToUrl(c) {
  return new Promise((res) => c.toBlob((b) => res(URL.createObjectURL(b)), 'image/jpeg', 0.86));
}

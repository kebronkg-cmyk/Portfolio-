/* Procedural placeholder portrait: a ray-marched SDF bust rendered on the CPU
   into a small luminance map. It is only used until a real /portrait.jpg exists. */

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function sdEllipsoid(px, py, pz, rx, ry, rz) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return (k0 * (k0 - 1)) / k1;
}
function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}
function smax(a, b, k) {
  return -smin(-a, -b, k);
}
function sdCapsuleY(px, py, pz, y0, y1, r) {
  const y = clamp(py, y0, y1);
  return Math.hypot(px, py - y, pz) - r;
}

function map(x, y, z) {
  // turn the head slightly (3/4 view) and tilt it
  const a = 0.32;
  const ca = Math.cos(a),
    sa = Math.sin(a);
  let hx = x * ca - z * sa;
  let hz = x * sa + z * ca;
  let hy = y;

  // skull + face
  let d = sdEllipsoid(hx, hy - 0.36, hz + 0.02, 0.36, 0.44, 0.4);
  d = smin(d, sdEllipsoid(hx, hy - 0.48, hz + 0.1, 0.38, 0.38, 0.42), 0.08); // back of the head / hair volume
  d = smin(d, sdEllipsoid(hx, hy - 0.08, hz - 0.07, 0.25, 0.24, 0.28), 0.16); // jaw
  d = smin(d, sdEllipsoid(hx, hy - 0.0, hz - 0.17, 0.11, 0.08, 0.12), 0.08); // chin
  // nose
  d = smin(d, sdEllipsoid(hx, hy - 0.26, hz - 0.37, 0.055, 0.11, 0.08), 0.05);
  // brow ridge
  d = smin(d, sdEllipsoid(hx, hy - 0.42, hz - 0.29, 0.27, 0.05, 0.08), 0.06);
  // eye sockets
  for (const s of [-1, 1]) {
    d = smax(d, -sdEllipsoid(hx - s * 0.13, hy - 0.335, hz - 0.37, 0.085, 0.05, 0.08), 0.05);
    // eyeballs
    d = smin(d, Math.hypot(hx - s * 0.13, hy - 0.335, hz - 0.285) - 0.045, 0.02);
    // cheekbones
    d = smin(d, sdEllipsoid(hx - s * 0.17, hy - 0.22, hz - 0.23, 0.09, 0.07, 0.08), 0.07);
    // ears
    d = smin(d, sdEllipsoid(hx - s * 0.355, hy - 0.3, hz + 0.02, 0.04, 0.1, 0.07), 0.03);
  }
  // lips
  d = smin(d, sdEllipsoid(hx, hy - 0.1, hz - 0.31, 0.1, 0.025, 0.05), 0.03);
  d = smin(d, sdEllipsoid(hx, hy - 0.055, hz - 0.3, 0.085, 0.022, 0.05), 0.03);
  d = smax(d, -sdEllipsoid(hx, hy - 0.078, hz - 0.35, 0.09, 0.006, 0.05), 0.01);

  // neck (not turned as much)
  const n = sdCapsuleY(x * 0.92, y, z + 0.05, -0.5, 0.0, 0.175);
  d = smin(d, n, 0.1);
  // torso / shoulders
  let t = sdEllipsoid(x, y + 0.92, z + 0.05, 0.9, 0.36, 0.28);
  t = smin(t, sdEllipsoid(x, y + 1.25, z + 0.05, 0.78, 0.4, 0.3), 0.2);
  t = smin(t, sdEllipsoid(x, y + 0.6, z + 0.03, 0.4, 0.16, 0.2), 0.22); // trapezius
  d = smin(d, t, 0.12);
  return d;
}

function normal(x, y, z) {
  const e = 0.002;
  const nx = map(x + e, y, z) - map(x - e, y, z);
  const ny = map(x, y + e, z) - map(x, y - e, z);
  const nz = map(x, y, z + e) - map(x, y, z - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

export function renderBust(width = 160, height = 200) {
  const lum = new Float32Array(width * height);
  const alpha = new Float32Array(width * height);
  const L = [-0.55, 0.55, 0.62];
  const ll = Math.hypot(...L);
  const key = L.map((v) => v / ll);
  const rim = [0.75, 0.15, -0.65];
  const top = -1.32,
    bottom = 0.98; // y range (flipped)
  const span = bottom - top;
  const xSpan = (span * width) / height;

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = ((i + 0.5) / width - 0.5) * xSpan;
      const y = bottom - ((j + 0.5) / height) * span;
      let z = 1.5,
        hit = false;
      for (let s = 0; s < 90; s++) {
        const d = map(x, y, z);
        if (d < 0.0015) {
          hit = true;
          break;
        }
        z -= d * 0.9;
        if (z < -1.2) break;
      }
      const k = j * width + i;
      if (!hit) continue;
      const n = normal(x, y, z);
      const dif = Math.max(0, n[0] * key[0] + n[1] * key[1] + n[2] * key[2]);
      const rl = Math.hypot(...rim);
      const r = Math.max(0, (n[0] * rim[0] + n[1] * rim[1] + n[2] * rim[2]) / rl);
      // cheap AO
      let ao = 0;
      for (let s = 1; s <= 4; s++) {
        const h = 0.025 * s;
        ao += (h - map(x + n[0] * h, y + n[1] * h, z + n[2] * h)) / s;
      }
      ao = clamp(1 - ao * 6, 0, 1);
      const fres = Math.pow(1 - Math.max(0, n[2]), 3);
      // fade out the torso towards the bottom
      const fade = clamp((y + 1.32) / 0.55, 0, 1);
      let v = (0.08 + dif * 0.85 + r * 0.55 + fres * 0.25) * ao;
      lum[k] = clamp(v, 0, 1) * fade;
      alpha[k] = fade;
    }
  }
  return { width, height, lum, alpha };
}

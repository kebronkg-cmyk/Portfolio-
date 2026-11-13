import { BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, Points, ShaderMaterial, Vector3, Vector4 } from 'three';

/* "Nanobots": a swarm that hangs in the room as dust and assembles into
   words – statements in front of the avatar, industry names behind him. */

/** Sample `count` points from text drawn in the page's display face. Coordinates: x in −0.5…0.5, y scaled alike. */
export function sampleText(lines, count, font = '"Geist Variable", sans-serif', weight = 800) {
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 1000;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  let size = 300;
  const setFont = () => (ctx.font = `${weight} ${size}px ${font}`);
  setFont();
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  size *= 1540 / widest;
  size = Math.min(size, 760 / (lines.length * 0.98));
  setFont();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const lh = size * 0.96;
  lines.forEach((l, i) => ctx.fillText(l, 800, 500 + (i - (lines.length - 1) / 2) * lh));
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (data[(y * c.width + x) * 4 + 3] > 128) pts.push(x, y);
  const out = new Float32Array(count * 3);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = n ? ((Math.random() * n) | 0) * 2 : 0;
    out[i * 3] = (pts[k] + Math.random() * 2 - 800) / 1600;
    out[i * 3 + 1] = -(pts[k + 1] + Math.random() * 2 - 500) / 1600;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
  }
  return out;
}

export function createParticles({ count }) {
  // dust: where the bots idle, in world units around the avatar
  const dust = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    dust[i * 3] = (Math.random() - 0.5) * 11;
    dust[i * 3 + 1] = -2.2 + Math.random() * 5.2;
    dust[i * 3 + 2] = -5.5 + Math.random() * 8.2;
    rnd[i] = Math.random();
  }
  const geo = new BufferGeometry();
  const aA = new Float32BufferAttribute(new Float32Array(dust), 3);
  const aB = new Float32BufferAttribute(new Float32Array(dust), 3);
  aA.setUsage(DynamicDrawUsage);
  aB.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', aA);
  geo.setAttribute('aB', aB);
  geo.setAttribute('aRnd', new Float32BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMix: { value: 0 },
    uXfA: { value: new Vector4(0, 0, 0, 1) }, // xyz centre, w scale
    uXfB: { value: new Vector4(0, 0, 0, 1) },
    uDustA: { value: 1 },
    uDustB: { value: 1 },
    uPink: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: 1 },
    uOpacity: { value: 1 },
  };
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aB;
      attribute float aRnd;
      uniform float uTime;
      uniform float uMix;
      uniform vec4 uXfA;
      uniform vec4 uXfB;
      uniform float uDustA;
      uniform float uDustB;
      uniform float uPixelRatio;
      uniform float uSize;
      varying float vA;
      varying float vR;
      float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
      void main() {
        vec3 a = position * uXfA.w + uXfA.xyz;
        vec3 b = aB * uXfB.w + uXfB.xyz;
        // each bot leaves a little later than the last: the word builds up, it doesn't just fade
        float m = clamp(uMix * 1.5 - aRnd * .5, 0., 1.);
        m = m * m * (3. - 2. * m);
        vec3 p = mix(a, b, m);
        // on the way they swirl around the straight line
        float mid = sin(m * 3.14159);
        vec3 r = vec3(h11(aRnd * 17.), h11(aRnd * 29.), h11(aRnd * 41.)) - .5;
        float ang = aRnd * 6.283 + uTime * .6;
        p += (vec3(cos(ang), sin(ang), cos(ang * 1.3)) * .5 + r) * mid * .9;
        // dust drifts; formed letters only shimmer
        float dusty = mix(uDustA, uDustB, m);
        p += vec3(sin(uTime * .31 + aRnd * 40.), cos(uTime * .27 + aRnd * 70.), sin(uTime * .22 + aRnd * 20.)) * mix(.006, .16, dusty);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float sz = mix(1., .55 + aRnd * .5, dusty);
        gl_PointSize = max(1.2, uSize * sz * uPixelRatio * 9. / -mv.z);
        vA = mix(1., .22 + aRnd * .3, dusty) * smoothstep(.2, 1., -mv.z);
        vR = aRnd;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uPink;
      uniform float uOpacity;
      varying float vA;
      varying float vR;
      void main() {
        vec2 q = abs(gl_PointCoord - .5);
        float m = 1. - smoothstep(.34, .5, max(q.x, q.y));
        vec3 pink = mix(vec3(.996, .718, .788), vec3(.992, .902, .918), vR);
        vec3 col = mix(pink, vec3(.027, .027, .031), uPink);
        gl_FragColor = vec4(col, m * vA * uOpacity);
        if (gl_FragColor.a < .01) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;

  let curA = null,
    curB = null;
  /** a / b: Float32Array of a text target, or null for dust */
  function setPair(a, b) {
    if (a !== curA) {
      aA.array.set(a || dust);
      aA.needsUpdate = true;
      curA = a;
      uniforms.uDustA.value = a ? 0 : 1;
    }
    if (b !== curB) {
      aB.array.set(b || dust);
      aB.needsUpdate = true;
      curB = b;
      uniforms.uDustB.value = b ? 0 : 1;
    }
  }
  const DUST_XF = new Vector4(0, 0, 0, 1);
  function setXf(which, centre, scale) {
    const u = which === 'a' ? uniforms.uXfA : uniforms.uXfB;
    if (centre) u.value.set(centre.x, centre.y, centre.z, scale);
    else u.value.copy(DUST_XF);
  }
  return { points, uniforms, setPair, setXf, tmp: new Vector3() };
}

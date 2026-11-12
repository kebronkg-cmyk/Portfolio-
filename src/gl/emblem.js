import { BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, Vector4 } from 'three';
import { U, GLSL_COMMON } from './shared.js';

/* A cloud of dots that morphs between four shapes:
   0 sphere (about me) · 1 globe rings (who I work with) · 2 torus knot (services) · 3 portal ring (contact) */
export function createEmblem({ count = 6000 } = {}) {
  const A = new Float32Array(count * 3);
  const B = new Float32Array(count * 3);
  const C = new Float32Array(count * 3);
  const D = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const k = i * 3;
    rnd[i] = Math.random();

    // sphere (fibonacci)
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const R = 1.7;
    A[k] = Math.cos(th) * r * R;
    A[k + 1] = y * R;
    A[k + 2] = Math.sin(th) * r * R;

    // globe: latitude + longitude rings
    const ringCount = 14;
    const ring = i % ringCount;
    const t = (i / count) * Math.PI * 2 * 37.0;
    if (ring < 7) {
      const lat = ((ring + 0.5) / 7 - 0.5) * Math.PI;
      B[k] = Math.cos(t) * Math.cos(lat) * 1.9;
      B[k + 1] = Math.sin(lat) * 1.9;
      B[k + 2] = Math.sin(t) * Math.cos(lat) * 1.9;
    } else {
      const lon = ((ring - 7) / 7) * Math.PI;
      B[k] = Math.cos(t) * Math.cos(lon) * 1.9;
      B[k + 1] = Math.sin(t) * 1.9;
      B[k + 2] = Math.cos(t) * Math.sin(lon) * 1.9;
    }

    // torus knot (p=2, q=3) with tube jitter
    const u = (i / count) * Math.PI * 2;
    const p = 2,
      q = 3;
    const cu = Math.cos(q * u);
    const tx = (2 + cu) * Math.cos(p * u);
    const ty = (2 + cu) * Math.sin(p * u);
    const tz = Math.sin(q * u);
    const a1 = Math.random() * Math.PI * 2;
    const tr = 0.32;
    C[k] = tx * 0.62 + Math.cos(a1) * tr;
    C[k + 1] = ty * 0.62 + Math.sin(a1) * tr;
    C[k + 2] = tz * 0.62 + Math.cos(a1 * 1.3) * tr;

    // portal ring (thin torus, large)
    const v = Math.random() * Math.PI * 2;
    const rr = 4.6 + (Math.random() - 0.5) * 0.35;
    D[k] = Math.cos(u * 1.0 + i) * rr;
    D[k + 1] = Math.sin(u * 1.0 + i) * rr;
    D[k + 2] = Math.cos(v) * 0.18;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(A, 3));
  geo.setAttribute('aB', new Float32BufferAttribute(B, 3));
  geo.setAttribute('aC', new Float32BufferAttribute(C, 3));
  geo.setAttribute('aD', new Float32BufferAttribute(D, 3));
  geo.setAttribute('aRnd', new Float32BufferAttribute(rnd, 1));

  const uniforms = {
    ...U,
    uW: { value: new Vector4(1, 0, 0, 0) },
    uScatter: { value: 0 },
    uOpacity: { value: 0 },
    uSize: { value: 1 },
  };
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      attribute vec3 aB;
      attribute vec3 aC;
      attribute vec3 aD;
      attribute float aRnd;
      uniform vec4 uW;
      uniform float uScatter;
      uniform float uSize;
      varying float vA;
      varying float vR;
      void main() {
        vec3 p = position * uW.x + aB * uW.y + aC * uW.z + aD * uW.w;
        // morph turbulence: dots get scattered while between shapes
        float between = 1. - max(max(uW.x, uW.y), max(uW.z, uW.w));
        float s = between * 2.2 + uScatter;
        p += (vec3(hash11(aRnd * 17.), hash11(aRnd * 29.), hash11(aRnd * 41.)) - .5) * s * 2.;
        p += normalize(p + 1e-4) * sin(uTime * 2. + aRnd * 30.) * .03;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1. + aRnd * 1.6) * uPixelRatio * 13. / -mv.z;
        vA = smoothstep(-14., -2., mv.z);
        vR = aRnd;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uOpacity;
      varying float vA;
      varying float vR;
      void main() {
        vec2 q = abs(gl_PointCoord - .5);
        float m = 1. - smoothstep(.3, .5, max(q.x, q.y));
        vec3 col = themeFg();
        col = mix(col, uAccent, step(.985, vR) * (1. - uInvert * .6));
        gl_FragColor = vec4(col, m * uOpacity * (.35 + vR * .5) * mix(1., .7, uInvert));
        if (gl_FragColor.a < .01) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms };
}

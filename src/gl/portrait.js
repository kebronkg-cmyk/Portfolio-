import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  ShaderMaterial,
  Vector2,
  NormalBlending,
} from 'three';
import { U, GLSL_COMMON, LAYOUT } from './shared.js';
import { renderBust } from './bust.js';

/* ---------------------------------------------------------------------------
   Dot-matrix portrait.
   The source (photo or procedural bust) is sampled into a grid. Each sample
   becomes a square "phosphor" dot whose size and depth follow its brightness,
   so the flat image turns into a relief that reacts to the pointer, glitches
   in horizontal slices, mirrors on the floor and dissolves toward the camera
   when you scroll.
   --------------------------------------------------------------------------- */

async function loadImageLum(url, cols, keyOut) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const aspect = img.naturalHeight / img.naturalWidth;
  const w = cols;
  const h = Math.round(cols * aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  const alpha = new Float32Array(w * h);

  // estimate background from the border pixels
  let bsum = 0,
    bn = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, 1, h - 1]) {
      const k = (y * w + x) * 4;
      bsum += (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
      bn++;
    }
  }
  const bgLum = bsum / bn;
  const mode = keyOut === 'auto' ? (bgLum < 0.3 ? 'dark' : bgLum > 0.7 ? 'light' : 'none') : keyOut;

  let min = 1,
    max = 0;
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    let l = (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
    let a = data[k + 3] / 255;
    if (mode === 'light') a *= Math.min(1, Math.max(0, (bgLum - 0.04 - l) / 0.12));
    if (mode === 'dark') a *= Math.min(1, Math.max(0, (l - bgLum - 0.03) / 0.1));
    lum[i] = l;
    alpha[i] = a;
    if (a > 0.5) {
      min = Math.min(min, l);
      max = Math.max(max, l);
    }
  }
  // normalise contrast of the subject
  const range = Math.max(0.15, max - min);
  for (let i = 0; i < w * h; i++) lum[i] = Math.min(1, Math.max(0, (lum[i] - min) / range)) * alpha[i];
  return { width: w, height: h, lum, alpha };
}

export async function createPortrait({ url, keyOut = 'auto', mobile = false }) {
  const cols = mobile ? 110 : 150;
  let src;
  let isPhoto = false;
  try {
    if (!url) throw new Error('no portrait');
    src = await loadImageLum(url, cols, keyOut);
    isPhoto = true;
  } catch {
    src = renderBust(cols, Math.round(cols * 1.25));
  }

  const { width: w, height: h, lum, alpha } = src;
  const worldH = 5.4;
  const cell = worldH / h;
  const pos = [];
  const aLum = [];
  const aRnd = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const l = lum[k];
      if (alpha[k] < 0.2 || l < 0.035) continue;
      pos.push((i - w / 2) * cell, (h / 2 - j) * cell, 0);
      aLum.push(l);
      aRnd.push(Math.random());
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('aLum', new Float32BufferAttribute(aLum, 1));
  geo.setAttribute('aRnd', new Float32BufferAttribute(aRnd, 1));

  const local = {
    uMouse: { value: new Vector2(99, 99) },
    uMouseStrength: { value: 0 },
    uDissolve: { value: 0 },
    uGlitch: { value: 0 },
    uCell: { value: cell },
    uIntro: { value: 0 },
  };

  const makeMat = (mirror) =>
    new ShaderMaterial({
      uniforms: {
        ...U,
        ...local,
        uMirror: { value: mirror ? 1 : 0 },
        uFloor: { value: LAYOUT.floorY },
        uHalfH: { value: worldH / 2 },
      },
      vertexShader: /* glsl */ `
        ${GLSL_COMMON}
        attribute float aLum;
        attribute float aRnd;
        uniform vec2 uMouse;
        uniform float uMouseStrength;
        uniform float uDissolve;
        uniform float uGlitch;
        uniform float uCell;
        uniform float uMirror;
        uniform float uFloor;
        uniform float uHalfH;
        uniform float uIntro;
        varying float vLum;
        varying float vAlpha;
        varying float vHot;

        void main() {
          vec3 p = position;

          // intro: dots rain in from above, row by row
          float row = (p.y + uHalfH) / (2. * uHalfH);
          float intro = clamp(uIntro * 1.8 - (1. - row) * .6 - aRnd * .2, 0., 1.);
          intro = 1. - pow(1. - intro, 3.);
          p.y += (1. - intro) * (2.5 + aRnd * 3.);

          // relief: bright = closer
          p.z += aLum * .55;

          // pointer: push dots away + forward
          vec2 d = p.xy - uMouse;
          float dist = length(d);
          float f = smoothstep(.85, 0., dist) * uMouseStrength;
          p.xy += normalize(d + 1e-4) * f * .22;
          p.z += f * .6;
          vHot = f;

          // slice glitch
          float band = floor(p.y * 5. + floor(uTime * 3.));
          float g = step(1. - (.04 + uGlitch * .35), hash11(band + floor(uTime * 12.) * 7.13));
          p.x += g * (hash11(band * 1.7) - .5) * (.5 + uGlitch);

          // breathing scanline wave
          p.x += sin(p.y * 14. + uTime * 2.) * .008;

          // dissolve toward the camera
          float dz = uDissolve * (3. + aRnd * 22.);
          p.z += dz;
          p.xy += (vec2(hash11(aRnd * 91.), hash11(aRnd * 37.)) - .5) * uDissolve * 6.;

          // floor reflection
          if (uMirror > .5) {
            p.y = 2. * uFloor - p.y - .1;
            p.x += sin(p.y * 9. + uTime * 3.) * .04;
          }

          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          float size = uCell * (.35 + aLum * .95) * (1. + f * .5);
          gl_PointSize = min(size * uPixelRatio * 900. / -mv.z, 18. * uPixelRatio);
          vLum = aLum;
          vAlpha = intro * smoothstep(.3, 2.5, -mv.z) * (1. - smoothstep(.4, 1., uDissolve)) * (uMirror > .5 ? .22 * smoothstep(uFloor - 2.4, uFloor, p.y) : 1.);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        varying float vLum;
        varying float vAlpha;
        varying float vHot;
        void main() {
          // square phosphor with soft edge
          vec2 q = abs(gl_PointCoord - .5);
          float m = 1. - smoothstep(.36, .5, max(q.x, q.y));
          vec3 fg = themeFg();
          vec3 tint = mix(vec3(.62, .93, .92), fg, uInvert);
          vec3 col = mix(tint * .55, tint * 1.15, vLum);
          col = mix(col, uAccent, smoothstep(.15, 1., vHot) * .55);
          gl_FragColor = vec4(col, m * vAlpha);
          if (gl_FragColor.a < .01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

  const group = new Group();
  const points = new Points(geo, makeMat(false));
  const mirror = new Points(geo, makeMat(true));
  points.frustumCulled = false;
  mirror.frustumCulled = false;
  group.add(points, mirror);
  // feet of the bust sit a little above the floor
  group.position.set(0, LAYOUT.floorY + worldH / 2 + 0.35, LAYOUT.portraitZ);
  mirror.position.y = 0;
  // mirror is computed in group space: floor relative to group origin
  mirror.material.uniforms.uFloor.value = -worldH / 2 - 0.35;

  return { group, uniforms: local, height: worldH, isPhoto };
}

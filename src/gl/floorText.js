import { CanvasTexture, Mesh, PlaneGeometry, ShaderMaterial, RepeatWrapping, LinearFilter } from 'three';
import { U, GLSL_COMMON, LAYOUT } from './shared.js';

/* A terminal log printed onto the floor of the work corridor. */
const LINES = [
  'boot sequence ............................... ok',
  'mount /dev/imagination ...................... ok',
  'loading shaders [crt, mosaic, phosphor] .... ok',
  '$ npm run build -- --mode=obsessive',
  'compiled 1024 modules in 2.31s',
  'warn: too many details (ignored)',
  'fps: 120 · draw calls: 14 · vibes: high',
  '$ git commit -m "make it feel alive"',
  'ssh studio@portfolio',
  'last login: tonight, from somewhere creative',
  'welcome. type `help` to see projects.',
  '> render --motion --3d --smooth',
  '[████████████████████████] 100%',
  'lighthouse: perf 98 · a11y 100 · seo 100',
  'deploying to edge ......................... done',
  '$ open ./selected-work',
  'kerning ........................................ 1px',
  'easing: cubic-bezier(.22, 1, .36, 1)',
  'coffee level: critical',
  '$ echo "hello, you"',
];

function makeTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 2048;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.font = '500 30px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'top';
  let y = 20;
  let i = 0;
  while (y < c.height - 40) {
    const l = LINES[i % LINES.length];
    ctx.globalAlpha = l.startsWith('$') || l.startsWith('>') ? 1 : 0.7;
    ctx.fillText(l, 30, y);
    y += 46 + (i % 5 === 4 ? 30 : 0);
    i++;
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearFilter;
  t.anisotropy = 8;
  return t;
}

export function createFloorText({ fromZ, toZ }) {
  const length = Math.abs(toZ - fromZ);
  const geo = new PlaneGeometry(9, length, 1, 1);
  const mat = new ShaderMaterial({
    uniforms: { ...U, tText: { value: makeTexture() }, uRepeat: { value: length / 14 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D tText;
      uniform float uRepeat;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vec2 uv = vec2(vUv.x, vUv.y * uRepeat + uTime * .02);
        // slight skew so it looks typed in perspective
        float t = texture2D(tText, uv).r;
        float d = abs(vW.z - uCamZ);
        float fog = smoothstep(34., 3., d);
        float edge = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x);
        float a = t * fog * edge * mix(.5, .38, uInvert) * uOpacity;
        gl_FragColor = vec4(themeFg(), a);
        if (a < .005) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = 0.06;
  mesh.position.set(0, LAYOUT.floorY + 0.01, (fromZ + toZ) / 2);
  mesh.frustumCulled = false;
  return { mesh, material: mat };
}

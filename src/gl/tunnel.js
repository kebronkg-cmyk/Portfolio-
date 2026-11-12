import { BufferGeometry, Float32BufferAttribute, LineSegments, ShaderMaterial } from 'three';
import { U, GLSL_COMMON, LAYOUT } from './shared.js';

/* A wireframe "data room": floor, walls and ceiling made of grid lines that
   stretch along the whole camera path. Lines fade with distance (fog) and
   swap colour with the theme. */
export function createTunnel({ length = 260, width = 15, height = 9.5, step = 1.6, ring = 3.2 }) {
  const pos = [];
  const y0 = LAYOUT.floorY;
  const y1 = y0 + height;
  const x0 = -width / 2;
  const x1 = width / 2;
  const zA = 12;
  const zB = -length;

  const push = (a, b) => pos.push(...a, ...b);

  // longitudinal lines on floor + ceiling
  for (let x = x0; x <= x1 + 1e-3; x += step) {
    push([x, y0, zA], [x, y0, zB]);
    push([x, y1, zA], [x, y1, zB]);
  }
  // longitudinal lines on walls
  for (let y = y0 + step; y < y1 - 1e-3; y += step) {
    push([x0, y, zA], [x0, y, zB]);
    push([x1, y, zA], [x1, y, zB]);
  }
  // rings
  for (let z = zA; z >= zB; z -= ring) {
    push([x0, y0, z], [x1, y0, z]);
    push([x0, y1, z], [x1, y1, z]);
    push([x0, y0, z], [x0, y1, z]);
    push([x1, y0, z], [x1, y1, z]);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));

  const mat = new ShaderMaterial({
    uniforms: { ...U, uOpacity: { value: 1 }, uPulse: { value: 0 } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uOpacity;
      uniform float uPulse;
      varying vec3 vW;
      void main() {
        float d = abs(vW.z - uCamZ);
        float fog = smoothstep(46., 4., d) * smoothstep(-1., 3., uCamZ - vW.z + 4.);
        // travelling pulse along the floor
        float pulse = smoothstep(1.2, 0., abs(fract((vW.z - uTime * 6.) / 40.) - .5) * 40.) * uPulse;
        vec3 fg = themeFg();
        vec3 col = mix(fg, uAccent, pulse * (1. - uInvert));
        float a = (mix(.34, .2, uInvert) + pulse * .6) * fog * uOpacity;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const lines = new LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { mesh: lines, material: mat };
}

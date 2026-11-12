import {
  CanvasTexture,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  LinearFilter,
  Vector2,
} from 'three';
import { U, GLSL_COMMON, LAYOUT } from './shared.js';

/* Curved CRT screens that float along the corridor, one per project.
   Their "signal" resolves from a coarse mosaic to full resolution as the
   camera approaches; hovering adds RGB tearing. */

const SW = 5.2; // screen width (world)
const SH = 3.25;

function bentPlane() {
  const g = new PlaneGeometry(SW, SH, 48, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (SW / 2);
    const y = p.getY(i) / (SH / 2);
    // convex tube face + slight horizontal wrap
    p.setZ(i, (1 - x * x) * 0.22 + (1 - y * y) * 0.12);
  }
  g.computeVertexNormals();
  return g;
}

export function screenZ(i) {
  return LAYOUT.workStart - i * LAYOUT.workSpacing;
}

export function createScreens({ projects, textures, mobile }) {
  const group = new Group();
  const geo = bentPlane();
  const loader = new TextureLoader();
  const items = projects.map((p, i) => {
    const src = textures[i];
    const tex = src instanceof HTMLCanvasElement ? new CanvasTexture(src) : loader.load(src);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.generateMipmaps = false;

    const uniforms = {
      ...U,
      tMap: { value: tex },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uActive: { value: 0 },
      uAspect: { value: new Vector2(SW, SH) },
      uImgAspect: { value: 1.6 },
      uSeed: { value: i * 13.37 },
    };
    if (src instanceof HTMLCanvasElement) uniforms.uImgAspect.value = src.width / src.height;
    else
      tex.onUpdate = () => {
        if (tex.image) uniforms.uImgAspect.value = tex.image.width / tex.image.height;
      };

    const mat = new ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        ${GLSL_COMMON}
        uniform float uHover;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        varying float vWz;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += uHover * .12 * (1. - abs(uv.x - .5) * 2.);
          vec4 w = modelMatrix * vec4(p, 1.);
          vN = normalize(mat3(modelMatrix) * normal);
          vWz = w.z;
          vView = normalize(cameraPosition - w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        uniform sampler2D tMap;
        uniform float uReveal;
        uniform float uHover;
        uniform float uActive;
        uniform vec2 uAspect;
        uniform float uImgAspect;
        uniform float uSeed;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        varying float vWz;

        float sdRound(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
        }

        void main() {
          vec2 p = (vUv - .5) * uAspect;
          float outer = sdRound(p, uAspect * .5, .32);
          float bezel = .13;
          float inner = sdRound(p, uAspect * .5 - bezel, .2);
          float aa = fwidth(outer) * 1.5;
          float mOuter = 1. - smoothstep(-aa, aa, outer);
          float mInner = 1. - smoothstep(-aa, aa, inner);

          // image uv (cover-fit inside the inner area)
          vec2 innerSize = uAspect - bezel * 2.;
          vec2 uv = (p + innerSize * .5) / innerSize;
          float sa = innerSize.x / innerSize.y;
          if (uImgAspect > sa) uv.x = (uv.x - .5) * sa / uImgAspect + .5;
          else uv.y = (uv.y - .5) * uImgAspect / sa + .5;
          // tube bulge
          vec2 c = uv - .5;
          uv = .5 + c * (1. - .06 * dot(c, c));

          // mosaic → full res reveal
          float r = clamp(uReveal, 0., 1.);
          float blocks = mix(6., 1600., r * r * r);
          vec2 bq = vec2(blocks, blocks / uImgAspect);
          vec2 qu = (floor(uv * bq) + .5) / bq;
          float flick = step(.985, hash21(floor(uv * bq) + floor(uTime * 10.) + uSeed)) * (1. - r);
          uv = mix(qu, uv, smoothstep(.85, 1., r));

          // hover tearing
          float tear = step(.86, hash11(floor(uv.y * 30.) + floor(uTime * 16.))) * uHover;
          uv.x += tear * .02;
          float ca = .004 + uHover * .01;
          vec3 img;
          img.r = texture2D(tMap, uv + vec2(ca, 0.)).r;
          img.g = texture2D(tMap, uv).g;
          img.b = texture2D(tMap, uv - vec2(ca, 0.)).b;

          // scanlines + phosphor mask
          float sl = .9 + .1 * sin(vUv.y * 560.);
          float mask = .94 + .06 * sin(gl_FragCoord.x * 2.094);
          img *= sl * mask;
          img += flick * .4;
          // inner glass vignette + reflection
          img *= mix(.55, 1., smoothstep(.0, -.5, inner));
          float refl = smoothstep(.45, .0, abs(vUv.y - .78 + vUv.x * .25)) * .08;
          img += refl;
          // dimmed when not active
          img *= mix(.55, 1., max(uActive, uHover));
          // signal "off": black + noise until revealed a bit
          float on = smoothstep(.0, .12, r);
          img = mix(vec3(hash21(vUv * 400. + uTime) * .15), img, on);

          // bezel
          vec3 bez = mix(vec3(.07), vec3(.94, .945, .935), uInvert);
          float fres = pow(1. - max(dot(normalize(vN), vView), 0.), 2.);
          bez += fres * .15;
          // edge highlight
          bez += smoothstep(aa * 3., 0., abs(outer)) * .25;
          vec3 col = mix(bez, img, mInner);
          float far = smoothstep(30., 21., distance(cameraPosition.z, vWz));
          gl_FragColor = vec4(col, mOuter * far);
          if (mOuter < .01) discard;
        }
      `,
      transparent: true,
    });

    const mesh = new Mesh(geo, mat);
    const side = i % 2 === 0 ? -1 : 1;
    const x = mobile ? 0 : side * 1.15;
    mesh.position.set(x, LAYOUT.floorY + 2.75 + (mobile ? 0.55 : 0), screenZ(i));
    mesh.rotation.y = mobile ? 0 : -side * 0.14;
    mesh.rotation.z = mobile ? 0 : side * 0.012;
    if (mobile) mesh.scale.setScalar(0.68);
    mesh.userData.index = i;
    mesh.userData.base = { x, y: mesh.position.y, ry: mesh.rotation.y };
    group.add(mesh);
    return { mesh, uniforms };
  });

  return {
    group,
    items,
    meshes: items.map((i) => i.mesh),
    update(camZ, active, hovered, dt, time) {
      items.forEach(({ mesh, uniforms }, i) => {
        const z = mesh.position.z;
        const d = camZ - z; // distance in front of the screen
        // reveal as camera approaches (from ~26 units away to ~9)
        const target = Math.min(1, Math.max(0, (26 - d) / 15));
        uniforms.uReveal.value += (target - uniforms.uReveal.value) * Math.min(1, dt * 4);
        const h = hovered === i ? 1 : 0;
        uniforms.uHover.value += (h - uniforms.uHover.value) * Math.min(1, dt * 8);
        const a = active === i ? 1 : 0;
        uniforms.uActive.value += (a - uniforms.uActive.value) * Math.min(1, dt * 5);
        // idle float + swing aside when the camera flies past
        const b = mesh.userData.base;
        const side = b.x === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(b.x);
        const pass = Math.min(1, Math.max(0, (5.5 - d) / 5.5));
        const pe = pass * pass * (3 - 2 * pass);
        mesh.position.x = b.x + side * pe * (mobile ? 3.2 : 5.2);
        mesh.position.y = b.y + Math.sin(time * 0.8 + i * 1.7) * 0.06 + pe * 0.6;
        mesh.rotation.y = b.ry + Math.sin(time * 0.5 + i) * 0.02 - side * pe * 1.1;
        mesh.visible = d > -2;
      });
    },
  };
}

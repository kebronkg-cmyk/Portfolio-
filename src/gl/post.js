import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  HalfFloatType,
  LinearFilter,
} from 'three';
import { U, GLSL_COMMON } from './shared.js';

/* CRT / VHS post-processing:
   barrel distortion · RGB misconvergence · scanlines · rolling tracking bar ·
   slice glitch · grain · sparkles · vignette */
export function createPost(renderer) {
  const size = new Vector2();
  renderer.getDrawingBufferSize(size);
  const rt = new WebGLRenderTarget(size.x, size.y, {
    samples: 4,
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
  });

  const material = new ShaderMaterial({
    uniforms: {
      ...U,
      tScene: { value: rt.texture },
      uRes: { value: size.clone() },
      uDistort: { value: 0.11 },
      uGlitch: { value: 0 },
      uVelocity: { value: 0 },
      uFlash: { value: 0 },
      uPower: { value: 1 },
      uQuality: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D tScene;
      uniform vec2 uRes;
      uniform float uDistort;
      uniform float uGlitch;
      uniform float uVelocity;
      uniform float uFlash;
      uniform float uPower;
      uniform float uQuality;
      varying vec2 vUv;

      vec2 barrel(vec2 uv, float k) {
        vec2 c = uv * 2. - 1.;
        float r2 = dot(c, c);
        c *= 1. + k * r2 + k * .35 * r2 * r2;
        c /= 1. + k * 1.2;
        return c * .5 + .5;
      }

      void main() {
        float t = uTime;
        float g = clamp(uGlitch + abs(uVelocity) * .35, 0., 1.5);
        vec2 uv = barrel(vUv, uDistort);

        // ---- slice glitch (horizontal bands jump sideways)
        float rows = mix(18., 70., hash11(floor(t * 9.)));
        float band = floor(uv.y * rows);
        float bn = hash21(vec2(band, floor(t * 24.)));
        float hit = step(1. - g * .22, bn);
        uv.x += hit * (hash11(band + floor(t * 30.)) - .5) * .12 * g;

        // ---- tracking bar (slow roll + wobble)
        float roll = fract(t * .045);
        float bar = smoothstep(.06, 0., abs(uv.y - roll));
        uv.x += bar * .0035 * sin(uv.y * 900. + t * 40.);
        // velocity smear
        uv.y += uVelocity * .004 * sin(uv.x * 3.1415);

        // ---- RGB misconvergence (radial)
        vec2 dir = uv - .5;
        float ca = (.0018 + length(dir) * .006 + g * .012) * uQuality;
        vec3 col;
        col.r = texture2D(tScene, uv + dir * ca + vec2(g * .004, 0.)).r;
        col.g = texture2D(tScene, uv).g;
        col.b = texture2D(tScene, uv - dir * ca - vec2(g * .004, 0.)).b;

        vec3 bg = themeBg();
        vec3 fg = themeFg();

        // ---- bloom-ish glow from a cheap 4-tap (dark mode only)
        if (uQuality > .5) {
          vec2 px = 2.5 / uRes;
          vec3 b = texture2D(tScene, uv + vec2(px.x, 0.)).rgb + texture2D(tScene, uv - vec2(px.x, 0.)).rgb
                 + texture2D(tScene, uv + vec2(0., px.y)).rgb + texture2D(tScene, uv - vec2(0., px.y)).rgb;
          col += max(b * .25 - .45, 0.) * .5 * (1. - uInvert);
        }

        // ---- scanlines + rolling bar brightness
        float sl = .5 + .5 * sin(vUv.y * uRes.y * 1.5708);
        col *= mix(1., .86 + .14 * sl, mix(.9, .45, uInvert));
        col += bar * .035 * fg;

        // ---- grain
        float n = hash21(vUv * uRes + fract(t * 61.) * 100.) - .5;
        col += n * mix(.07, .05, uInvert);

        // ---- sparkles: short horizontal white dashes (tape dropout)
        vec2 cell = floor(vUv * vec2(48., 260.));
        float sp = hash21(cell + floor(t * 14.));
        float dash = step(.9988 - g * .004, sp);
        col = mix(col, mix(vec3(1.), vec3(.55), uInvert), dash * .85);

        // ---- outside the tube = background
        vec2 o = step(vec2(0.), uv) * step(uv, vec2(1.));
        float inside = o.x * o.y;
        col = mix(bg, col, inside);

        // ---- vignette
        vec2 vv = vUv - .5;
        float vig = smoothstep(.95, .25, length(vv * vec2(1., 1.15)));
        col = mix(bg * mix(.4, .92, uInvert), col, mix(.55, 1., vig));

        // ---- power on / flash
        col = mix(col, vec3(1.), uFlash);
        col *= uPower;

        gl_FragColor = vec4(col, 1.);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    material,
    target: rt,
    setSize(w, h) {
      rt.setSize(w, h);
      material.uniforms.uRes.value.set(w, h);
    },
    render(sceneToRender, cam) {
      renderer.setRenderTarget(rt);
      renderer.render(sceneToRender, cam);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    dispose() {
      rt.dispose();
      material.dispose();
    },
  };
}

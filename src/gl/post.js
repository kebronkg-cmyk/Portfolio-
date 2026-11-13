import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2 } from 'three';

/* The tube in front of everything: slight barrel bend, colour misconvergence,
   faint scanlines, grain, vignette – and slice glitches when scenes change. */
export function createPost(renderer, texture) {
  const material = new ShaderMaterial({
    uniforms: {
      tScene: { value: texture },
      uRes: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uDistort: { value: 0.07 },
      uGlitch: { value: 0 },
      uVelocity: { value: 0 },
      uFlash: { value: 0 },
      uPower: { value: 1 },
      uPink: { value: 0 },
      uQuality: { value: 1 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tScene;
      uniform vec2 uRes;
      uniform float uTime;
      uniform float uDistort;
      uniform float uGlitch;
      uniform float uVelocity;
      uniform float uFlash;
      uniform float uPower;
      uniform float uPink;
      uniform float uQuality;
      varying vec2 vUv;
      float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
      float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      vec2 barrel(vec2 uv, float k) {
        vec2 c = uv * 2. - 1.;
        float r2 = dot(c, c);
        c *= (1. + k * r2) / (1. + k * 1.35);
        return c * .5 + .5;
      }
      void main() {
        float t = uTime;
        float g = clamp(uGlitch + abs(uVelocity) * .25, 0., 1.5);
        vec2 uv = barrel(vUv, uDistort);

        // slice glitch: horizontal bands jump sideways for a moment
        float rows = mix(14., 60., h11(floor(t * 9.)));
        float band = floor(uv.y * rows);
        float hit = step(1. - g * .24, h21(vec2(band, floor(t * 24.))));
        uv.x += hit * (h11(band + floor(t * 30.)) - .5) * .12 * g;
        // slow tracking bar
        float roll = fract(t * .04);
        float bar = smoothstep(.05, 0., abs(uv.y - roll));
        uv.x += bar * .0025 * sin(uv.y * 900. + t * 40.);

        vec2 dir = uv - .5;
        float ca = (.0012 + dot(dir, dir) * .007 + g * .012) * uQuality;
        vec3 col;
        col.r = texture2D(tScene, uv + dir * ca + vec2(g * .004, 0.)).r;
        col.g = texture2D(tScene, uv).g;
        col.b = texture2D(tScene, uv - dir * ca - vec2(g * .004, 0.)).b;

        // glow on the bright phosphor (dark world only)
        if (uQuality > .5) {
          vec3 b = vec3(0.);
          for (int i = 0; i < 6; i++) {
            float a = float(i) * 1.0472;
            b += texture2D(tScene, uv + vec2(cos(a), sin(a)) * 4. / uRes).rgb;
          }
          col += max(b / 6. - .5, 0.) * .4 * (1. - uPink);
        }

        // faint scanlines + grain
        float sl = .5 + .5 * sin(vUv.y * uRes.y * 2.094);
        col *= mix(1., .9 + .1 * sl, mix(.8, .35, uPink));
        col += (h21(vUv * uRes + fract(t * 61.) * 100.) - .5) * mix(.06, .035, uPink);

        // outside the tube + vignette
        vec3 edgeCol = mix(vec3(0.), vec3(.93, .66, .73), uPink);
        vec2 o = step(vec2(0.), uv) * step(uv, vec2(1.));
        col = mix(edgeCol, col, o.x * o.y);
        float vig = smoothstep(1.02, .3, length((vUv - .5) * vec2(1., 1.15)));
        col = mix(edgeCol, col, mix(.62, 1., vig));

        col = mix(col, vec3(1., .86, .9), uFlash);
        gl_FragColor = vec4(col * uPower, 1.);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    material,
    render() {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
  };
}

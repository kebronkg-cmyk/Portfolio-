import { BufferGeometry, CanvasTexture, DynamicDrawUsage, Float32BufferAttribute, LinearFilter, NoColorSpace, Points, ShaderMaterial, Vector3, Vector4 } from 'three';

/* One swarm, one moment.
   Most of the time it is dust: small glyphs – brackets, slashes, digits, blocks –
   drifting in the room and flickering from one sign to the next. In the statement
   section they are pulled into a storm in front of the avatar and then, all at
   once, fall into place as a sentence. */

const GLYPHS = '01{}[]<>/\\|#*+=_?!;:$%&@^~ABCDEFXKZ█▓▒░▚▞▙▟◆●■□▪→←↑↓×÷¬∆∑πµ§¶';
const COLS = 8;

function glyphAtlas() {
  const cell = 64;
  const rows = Math.ceil(GLYPHS.length / COLS);
  const c = document.createElement('canvas');
  c.width = COLS * cell;
  c.height = rows * cell;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.font = `500 ${cell * 0.78}px "Geist Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...GLYPHS].forEach((g, i) => ctx.fillText(g, (i % COLS) * cell + cell / 2, Math.floor(i / COLS) * cell + cell / 2 + 2));
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  return { tex: t, rows, count: [...GLYPHS].length };
}

/** Sample `count` points from text. Coordinates: x in −0.5…0.5, y scaled alike. */
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
  const dust = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    dust[i * 3] = (Math.random() - 0.5) * 12;
    dust[i * 3 + 1] = -2.4 + Math.random() * 5.6;
    dust[i * 3 + 2] = -5.5 + Math.random() * 8.4;
    rnd[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(dust, 3));
  const aText = new Float32BufferAttribute(new Float32Array(count * 3), 3);
  aText.setUsage(DynamicDrawUsage);
  geo.setAttribute('aText', aText);
  geo.setAttribute('aRnd', new Float32BufferAttribute(rnd, 1));

  const atlas = glyphAtlas();
  const uniforms = {
    uTime: { value: 0 },
    uForm: { value: 0 }, // 0 dust · 0…0.5 storm gathers · 0.5…1 the sentence snaps together
    uXf: { value: new Vector4(0, 0, 0, 1) }, // xyz centre of the sentence, w its width
    uPixelRatio: { value: 1 },
    uSize: { value: 1 },
    tGlyph: { value: atlas.tex },
    uAtlas: { value: new Vector3(COLS, atlas.rows, atlas.count) },
  };
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aText;
      attribute float aRnd;
      uniform float uTime;
      uniform float uForm;
      uniform vec4 uXf;
      uniform float uPixelRatio;
      uniform float uSize;
      varying float vA;
      varying float vR;
      varying float vSolid;
      float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
      void main() {
        vec3 r = vec3(h11(aRnd * 17.), h11(aRnd * 29.), h11(aRnd * 41.)) - .5;
        // dust: slow drift
        vec3 dustP = position + vec3(sin(uTime * .31 + aRnd * 40.), cos(uTime * .27 + aRnd * 70.), sin(uTime * .22 + aRnd * 20.)) * .18;

        // storm: everything is pulled into a turning cloud around the sentence's place
        float gather = smoothstep(0., .45, uForm - aRnd * .08);
        float ang = aRnd * 6.283 + uTime * (1.6 + aRnd * 3.2);
        float rad = uXf.w * (.12 + .5 * h11(aRnd * 7.3));
        vec3 stormP = uXf.xyz + vec3(cos(ang) * rad, sin(ang * 1.3 + aRnd * 9.) * rad * .55, sin(ang) * rad * .6) + r * uXf.w * .18;

        // snap: each sign jumps to its spot, a few frames apart
        float snap = clamp((uForm - .5) / .5 * 1.35 - aRnd * .35, 0., 1.);
        snap = 1. - pow(1. - snap, 4.);
        vec3 textP = aText * uXf.w + uXf.xyz;

        vec3 p = mix(mix(dustP, stormP, gather), textP, snap);
        // a breath of life once it stands
        p.z += snap * sin(uTime * 1.4 + aText.x * 9.) * .012;

        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float big = mix(1.9 + aRnd * 1.6, 2.6, gather);       // glyphs are readable as signs
        gl_PointSize = max(1.5, uSize * mix(big, 1., snap) * uPixelRatio * 9. / -mv.z);
        vA = mix(mix(.2 + aRnd * .35, .8, gather), 1., snap) * smoothstep(.2, 1., -mv.z);
        vR = aRnd;
        vSolid = snap;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tGlyph;
      uniform vec3 uAtlas;
      uniform float uTime;
      varying float vA;
      varying float vR;
      varying float vSolid;
      void main() {
        // the sign changes a few times a second – faster in the storm
        float rate = mix(2., 9., step(.25, vA) * (1. - vSolid));
        float idx = floor(mod(vR * 997. + floor(uTime * rate + vR * 13.), uAtlas.z));
        vec2 cell = vec2(mod(idx, uAtlas.x), floor(idx / uAtlas.x));
        vec2 uv = (cell + vec2(gl_PointCoord.x, gl_PointCoord.y)) / uAtlas.xy;
        float glyph = texture2D(tGlyph, vec2(uv.x, 1. - uv.y)).r;
        vec2 q = abs(gl_PointCoord - .5);
        float block = 1. - smoothstep(.34, .5, max(q.x, q.y));
        float m = mix(glyph, block, vSolid);
        vec3 col = mix(vec3(.996, .718, .788), vec3(1., .96, .97), mix(vR, 1., vSolid * .5));
        gl_FragColor = vec4(col, m * vA);
        if (gl_FragColor.a < .02) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    uniforms,
    setText(arr) {
      aText.array.set(arr);
      aText.needsUpdate = true;
    },
  };
}

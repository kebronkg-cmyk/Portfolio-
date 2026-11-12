import {
  CanvasTexture,
  Color,
  LinearFilter,
  Matrix3,
  Matrix4,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { CAMERA_GLSL, FIGURE_FRAG } from './figureShader.js';
import { createRig } from './rig.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const MAX_T = 9;

/* Palettes per scene: paper white · soft rosé · black */
const PAL = {
  white: { bg: '#fbf7f5', ink: '#0b0b0c', fill: '#fbf7f5', name: '#f3c3d0', grid: 0.07 },
  rose: { bg: '#f3c3d0', ink: '#0b0b0c', fill: '#f3c3d0', name: '#f8dbe3', grid: 0.09 },
  black: { bg: '#0b0b0c', ink: '#f3c3d0', fill: '#0b0b0c', name: '#1c1517', grid: 0.1 },
};
const SCENE_PAL = { hero: 'white', work: 'rose', about: 'white', contact: 'black' };

const VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0., 1.); }`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  ${CAMERA_GLSL}
  uniform sampler2D tFig;
  uniform sampler2D tSheet;
  uniform sampler2D tName;
  uniform vec2 uRes;        // drawing buffer size in px
  uniform float uCell;      // cell size in px
  uniform vec2 uGrid;       // low-res size
  uniform mat4 uSheetInv;
  uniform vec2 uSheetSize;
  uniform float uSheetOn;
  uniform float uSheetDark; // 1 = black sheet (contact)
  uniform float uHover;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uFill;
  uniform vec3 uNameCol;
  uniform float uGridA;
  uniform vec4 uNameRect;   // x, y, w, h in screen uv
  uniform float uNameOn;
  uniform float uMaxT;
  uniform float uIntro;
  uniform float uTime;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
  }
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

  void main() {
    vec2 px = gl_FragCoord.xy;
    vec2 suv = px / uRes;
    vec2 cell = floor(px / uCell);
    vec2 cuv = fract(px / uCell) - .5;

    // ---- background: flat colour, faint pixel grid, the big name
    vec3 col = uBg;
    float gdot = 1. - smoothstep(.07, .11, max(abs(cuv.x), abs(cuv.y)));
    col = mix(col, uInk, gdot * uGridA);
    vec2 nuv = (suv - uNameRect.xy) / uNameRect.zw;
    if (uNameOn > .01 && nuv.x > 0. && nuv.x < 1. && nuv.y > 0. && nuv.y < 1.) {
      col = mix(col, uNameCol, texture2D(tName, nuv).r * uNameOn);
    }

    // ---- figure cell
    vec4 fig = texelFetch(tFig, ivec2(clamp(cell, vec2(0.), uGrid - 1.)), 0);
    bool figHit = fig.a > .5;
    float tF = figHit ? (fig.g * 255. * 256. + fig.b * 255.) / 65535. * uMaxT : 1e9;
    // the figure "prints" itself row by row on load
    float row = (cell.y + hash(vec2(cell.x, 7.)) * 6.) / uGrid.y;
    if (row > uIntro * 1.2) { figHit = false; tF = 1e9; }

    // ---- sheet of paper (exact, full resolution)
    vec3 rd = rayDir(suv * 2. - 1.);
    vec3 lo = (uSheetInv * vec4(uCamPos, 1.)).xyz;
    vec3 ld = mat3(uSheetInv) * rd;
    float tS = -lo.z / ld.z;
    vec2 pl = lo.xy + ld.xy * tS;
    float sd = sdRound(pl, uSheetSize * .5, .012);
    float aa = fwidth(sd) * 1.2;
    float sheetA = (1. - smoothstep(-aa, aa, sd)) * step(0., tS) * uSheetOn;

    if (sheetA > .001 && tS < tF) {
      // paper: white margin, the design printed inside, hairline edge
      float margin = min(uSheetSize.x, uSheetSize.y) * .035;
      vec2 inner = uSheetSize - margin * 2.;
      vec2 uv = pl / inner + .5;
      float img = 1. - smoothstep(-aa, aa, sdRound(pl, inner * .5, .004));
      vec3 paper = mix(vec3(1.), vec3(.045, .045, .05), uSheetDark);
      vec3 sc = mix(paper, texture2D(tSheet, uv).rgb, img);
      float edge = smoothstep(aa * 2.5, 0., abs(sd + aa));
      sc = mix(sc, mix(vec3(.04), uInk, uSheetDark), edge * .9);
      // lifts slightly when hovered
      sc = mix(sc, vec3(1.), uHover * .04 * (1. - uSheetDark));
      col = mix(col, sc, sheetA);
    } else if (figHit) {
      // halftone: one square per cell, bigger where the form is darker
      float lum = fig.r;
      float ink = mix(.2, 1., pow(1. - lum, 1.25));
      float half_ = sqrt(ink) * .5;
      float sq = 1. - smoothstep(half_ - .06, half_ + .02, max(abs(cuv.x), abs(cuv.y)));
      col = mix(uFill, uInk, sq);
    }

    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }
`;

function nameTexture(text) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  let size = 470;
  ctx.font = `900 ${size}px "Doto", monospace`;
  const w = ctx.measureText(text).width;
  if (w > 1980) size *= 1980 / w;
  ctx.font = `900 ${size}px "Doto", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 1024, 270);
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  return { tex: t, aspect: (Math.min(w, 1980) * (size / 470 > 1 ? 1 : 1)) / (size * 0.78) };
}

export async function createStage({ canvas, projects, sheets, contactSheet, name, mobile, reducedMotion, onProgress }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const N = projects.length;
  const rig = createRig({ mobile });
  onProgress?.(0.2);

  // ---- textures: one sheet per project + the contact card
  const loader = new TextureLoader();
  const texes = await Promise.all(
    sheets.map(
      (src) =>
        new Promise((res) => {
          loader.load(
            src,
            (t) => {
              t.colorSpace = SRGBColorSpace;
              t.minFilter = LinearFilter;
              t.generateMipmaps = false;
              t.anisotropy = 4;
              res(t);
            },
            undefined,
            () => res(null),
          );
        }),
    ),
  );
  const contactTex = new CanvasTexture(contactSheet);
  contactTex.colorSpace = SRGBColorSpace;
  contactTex.minFilter = LinearFilter;
  contactTex.generateMipmaps = false;
  texes.push(contactTex);
  const CONTACT = N;
  onProgress?.(0.6);

  const nameTex = nameTexture(name);

  // ---- passes
  const cam = { pos: new Vector3(), mat: new Matrix3(), tan: 0.36, aspect: 1 };
  const camU = {
    uCamPos: { value: cam.pos },
    uCamMat: { value: cam.mat },
    uTanFov: { value: cam.tan },
    uAspect: { value: 1 },
  };
  const figMat = new ShaderMaterial({
    uniforms: {
      ...camU,
      uRes: { value: new Vector2(1, 1) },
      uSh: { value: rig.state.sh },
      uEl: { value: rig.state.el },
      uWr: { value: rig.state.wr },
      uHand: { value: rig.state.hand },
      uLean: { value: 0 },
      uTwist: { value: 0 },
      uHead: { value: new Vector2() },
      uBreath: { value: 0 },
      uCurl: { value: 0.2 },
      uMaxT: { value: MAX_T },
    },
    vertexShader: VERT,
    fragmentShader: FIGURE_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const cur = { bg: new Color(PAL.white.bg), ink: new Color(PAL.white.ink), fill: new Color(PAL.white.fill), name: new Color(PAL.white.name), grid: PAL.white.grid };
  const compMat = new ShaderMaterial({
    uniforms: {
      ...camU,
      tFig: { value: null },
      tSheet: { value: texes[0] },
      tName: { value: nameTex.tex },
      uRes: { value: new Vector2(1, 1) },
      uCell: { value: 8 },
      uGrid: { value: new Vector2(1, 1) },
      uSheetInv: { value: new Matrix4() },
      uSheetSize: { value: new Vector2(rig.state.size[0], rig.state.size[1]) },
      uSheetOn: { value: 0 },
      uSheetDark: { value: 0 },
      uHover: { value: 0 },
      uBg: { value: cur.bg },
      uInk: { value: cur.ink },
      uFill: { value: cur.fill },
      uNameCol: { value: cur.name },
      uGridA: { value: cur.grid },
      uNameRect: { value: [0, 0, 1, 1] },
      uNameOn: { value: 1 },
      uMaxT: { value: MAX_T },
      uIntro: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: COMPOSITE_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), figMat);
  const scene = new Scene();
  scene.add(quad);
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const rt = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false });
  compMat.uniforms.tFig.value = rt.texture;

  let cellPx = 8;
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const s = new Vector2();
    renderer.getDrawingBufferSize(s);
    // cell size: ~7.5 CSS px on desktop, ~5.5 on phones → the figure's "resolution"
    cellPx = Math.max(3, Math.round((mobile ? 5.2 : Math.max(6, w / 190)) * (s.x / w)));
    const gx = Math.ceil(s.x / cellPx);
    const gy = Math.ceil(s.y / cellPx);
    rt.setSize(gx, gy);
    figMat.uniforms.uRes.value.set(gx, gy);
    compMat.uniforms.uRes.value.copy(s);
    compMat.uniforms.uCell.value = cellPx;
    compMat.uniforms.uGrid.value.set(gx, gy);
    // the low-res grid covers slightly more than the screen; use its true aspect for both passes
    cam.aspect = (gx * cellPx) / (gy * cellPx);
    camU.uAspect.value = cam.aspect;
    figMat.uniforms.uRes.value.set(gx, gy);
    compMat.uniforms.uRes.value.set(gx * cellPx, gy * cellPx);
    api.aspect = w / h;
  }

  const state = {
    hero: 0,
    work: 0,
    about: 0,
    contact: 0,
    section: 'hero',
    velocity: 0,
    pointer: new Vector2(),
    ps: new Vector2(),
    hovered: false,
    active: 0,
    introStart: -1,
    running: true,
    pan: 0,
    dolly: 0,
    nameOn: 1,
  };

  const R = new Vector3(),
    Uv = new Vector3(),
    F = new Vector3(),
    target = new Vector3();
  function setCamera() {
    const ps = state.ps;
    const z = (mobile ? 4.5 : 3.55) + state.dolly;
    cam.pos.set(state.pan + ps.x * 0.16, (mobile ? -0.62 : -0.32) + ps.y * 0.08, z);
    target.set(state.pan + ps.x * 0.04, mobile ? -0.78 : -0.3, 0);
    F.copy(target).sub(cam.pos).normalize();
    R.crossVectors(F, new Vector3(0, 1, 0)).normalize();
    Uv.crossVectors(R, F);
    cam.mat.set(R.x, Uv.x, F.x, R.y, Uv.y, F.y, R.z, Uv.z, F.z);
    cam.tan = Math.tan(((mobile ? 46 : 39) * Math.PI) / 360);
    camU.uTanFov.value = cam.tan;
  }

  // ray through a screen point (ndc) → sheet hit?
  const lo = new Vector3(),
    ld = new Vector3(),
    m3 = new Matrix3();
  function sheetHit(x, y) {
    ld.copy(F).addScaledVector(R, x * cam.aspect * cam.tan).addScaledVector(Uv, y * cam.tan).normalize();
    lo.copy(cam.pos).applyMatrix4(rig.state.sheetInverse);
    m3.setFromMatrix4(rig.state.sheetInverse);
    ld.applyMatrix3(m3);
    const t = -lo.z / ld.z;
    if (!(t > 0)) return false;
    const px = lo.x + ld.x * t;
    const py = lo.y + ld.y * t;
    return Math.abs(px) < rig.state.size[0] / 2 && Math.abs(py) < rig.state.size[1] / 2;
  }

  let last = performance.now();
  let time = 0;
  let raf = 0;
  let frames = 0,
    fpsT = 0,
    low = 0;
  const tc = new Color();

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    frames++;
    fpsT += dt;
    if (fpsT > 1) {
      const fps = frames / fpsT;
      api.fps = fps;
      frames = 0;
      fpsT = 0;
      if (fps < 40 && dpr > 1) {
        if (++low >= 2) {
          dpr = Math.max(1, dpr - 0.5);
          resize();
          low = 0;
        }
      } else low = 0;
    }

    state.ps.lerp(state.pointer, Math.min(1, dt * 4));

    // ---- which sheet, and where in its cycle
    let want = -1,
      s = 0;
    if (state.section === 'work') {
      const u = clamp(state.work, 0, 0.9999) * N;
      want = Math.floor(u);
      s = u - want;
    } else if (state.section === 'contact') {
      want = CONTACT;
      s = Math.min(0.8, state.contact * 1.15); // comes up and stays
    }
    const r = rig.update(reducedMotion ? 0.05 : dt, time, want, s, state.ps, want === CONTACT ? (mobile ? 0.3 : 0.24) : 0);

    // sheet texture follows what is actually on the paper
    const shown = r.shown;
    if (compMat.uniforms.tSheet.value !== texes[shown] && texes[shown]) compMat.uniforms.tSheet.value = texes[shown];
    compMat.uniforms.uSheetDark.value = shown === CONTACT ? 1 : 0;
    if (shown !== state.active && shown < N && state.section === 'work') {
      state.active = shown;
      api.onActive?.(shown);
    }

    // ---- camera: figure centred in hero, shifted aside for text-heavy scenes
    const wide = api.aspect > 1.05;
    const panT = !wide ? 0 : state.section === 'work' ? -0.42 : state.section === 'about' ? -1.15 : 0;
    state.pan += (panT - state.pan) * Math.min(1, dt * 2.6);
    const dollyT = state.section === 'hero' ? (wide ? 1.05 : 0.5) * (1 - smooth(0.35, 1, state.hero)) : state.section === 'about' ? 0.6 : 0;
    state.dolly += (dollyT - state.dolly) * Math.min(1, dt * 2.6);
    setCamera();

    // ---- colours cross-fade per scene
    const pal = PAL[SCENE_PAL[state.section] || 'white'];
    const k = Math.min(1, dt * 5);
    cur.bg.lerp(tc.set(pal.bg), k);
    cur.ink.lerp(tc.set(pal.ink), k);
    cur.fill.lerp(tc.set(pal.fill), k);
    cur.name.lerp(tc.set(pal.name), k);
    cur.grid += (pal.grid - cur.grid) * k;
    compMat.uniforms.uGridA.value = cur.grid;
    api.scene = SCENE_PAL[state.section] || 'white';

    // big name behind the figure (hero only)
    const nameT = state.section === 'hero' ? 1 - smooth(0.5, 0.95, state.hero) : 0;
    state.nameOn += (nameT - state.nameOn) * Math.min(1, dt * 5);
    const nw = wide ? 0.94 : 0.96;
    const nh = (nw * cam.aspect) / 4;
    compMat.uniforms.uNameRect.value = [0.5 - nw / 2 - state.ps.x * 0.012, (wide ? 0.6 : 0.7) - nh / 2 + state.hero * 0.12, nw, nh];
    compMat.uniforms.uNameOn.value = state.nameOn;

    // intro
    let intro = 1;
    if (state.introStart >= 0) intro = clamp((time - state.introStart) / 1.6);
    else intro = 0;
    compMat.uniforms.uIntro.value = intro;

    // ---- uniforms
    const fu = figMat.uniforms;
    fu.uLean.value = r.lean;
    fu.uTwist.value = r.twist;
    fu.uHead.value.set(r.head[0], r.head[1]);
    fu.uBreath.value = r.breath;
    fu.uCurl.value = r.curl;
    const cu = compMat.uniforms;
    cu.uSheetInv.value.copy(r.sheetInverse);
    cu.uSheetOn.value = r.sheetVisible;
    cu.uHover.value += ((state.hovered ? 1 : 0) - cu.uHover.value) * Math.min(1, dt * 8);
    cu.uTime.value = time;
    api.presenting = r.presenting;

    // pass 1: figure at grid resolution
    quad.material = figMat;
    renderer.setRenderTarget(rt);
    renderer.render(scene, ortho);
    // pass 2: composite at full resolution
    quad.material = compMat;
    renderer.setRenderTarget(null);
    renderer.render(scene, ortho);
  }

  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
    last = performance.now();
  });

  const api = {
    fps: 60,
    gyro: false,
    aspect: 1,
    scene: 'white',
    presenting: 0,
    onActive: null,
    start() {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    boot() {
      state.introStart = time;
    },
    setProgress(p) {
      Object.assign(state, p);
    },
    setPointer(x, y) {
      state.pointer.set(x, y);
    },
    /* index of the project whose sheet is under the point, or 'contact', or null */
    pick(x, y) {
      if (rig.state.sheetVisible < 0.9 || rig.state.presenting < 0.35) return null;
      if (!sheetHit(x, y)) return null;
      return rig.state.shown === CONTACT ? 'contact' : rig.state.shown;
    },
    setContactSheet(c) {
      contactTex.image = c;
      contactTex.needsUpdate = true;
    },
    setHovered(v) {
      state.hovered = !!v;
    },
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
  window.addEventListener('resize', resize);
  resize();
  setCamera();
  renderer.compile(scene, ortho);
  onProgress?.(1);
  return api;
}

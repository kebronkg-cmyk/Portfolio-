import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  Matrix4,
  Mesh,
  NearestFilter,
  NoColorSpace,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  AlwaysDepth,
  LinearSRGBColorSpace,
} from 'three';
import { FIGURE_FRAG } from './figureShader.js';
import { COMPOSITE_FRAG } from './compositeShader.js';
import { createRig } from './rig.js';
import { createParticles, sampleText } from './particles.js';
import { createPost } from './post.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const MAX_T = 12;
const NEAR = 0.1;
const FAR = 40;
const WALL_Z = -7;
const VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0., 1.); }`;

/* the three big words on the wall, each set to the full width */
function wordsTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  const font = (s) => `900 ${s}px "Geist Variable", sans-serif`;
  const rows = lines.map((l) => {
    ctx.font = font(100);
    const w = ctx.measureText(l).width;
    const size = (2040 / w) * 100;
    return { l, size, cap: size * 0.72 };
  });
  const gap = 34;
  const total = rows.reduce((a, r) => a + r.cap, 0) + gap * (rows.length - 1);
  const k = Math.min(1, 1010 / total);
  let y = (1024 - total * k) / 2;
  rows.forEach((r) => {
    ctx.font = font(r.size * k);
    y += r.cap * k;
    ctx.fillText(r.l, 4 + (2040 * (1 - k)) / 2 - r.size * k * 0.035, y);
    y += gap * k;
  });
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = true;
  return t;
}

export async function createStage({ canvas, projects, sheets, contactSheet, words, photo, texts, mobile, reducedMotion, instant, hq, onProgress }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace; // colours are authored display-referred
  let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.5);
  let figScale = 1; // lowered by the fps watchdog on weak devices

  const N = projects.length;
  const CONTACT = N;
  const rig = createRig({ mobile });
  onProgress?.(0.15);

  // ---- textures
  const loader = new TextureLoader();
  const load = (src) =>
    new Promise((res) =>
      loader.load(
        src,
        (t) => {
          t.colorSpace = NoColorSpace;
          t.minFilter = LinearFilter;
          t.generateMipmaps = false;
          t.anisotropy = 4;
          res(t);
        },
        undefined,
        () => res(null),
      ),
    );
  const [photoTex, ...texes] = await Promise.all([load(photo), ...sheets.map(load)]);
  const contactTex = new CanvasTexture(contactSheet);
  contactTex.colorSpace = NoColorSpace;
  contactTex.minFilter = LinearFilter;
  contactTex.generateMipmaps = false;
  texes.push(contactTex);
  onProgress?.(0.55);

  // ---- camera shared by both ray passes and the particle camera
  const cam = { pos: new Vector3(), mat: new Matrix3(), tan: 0.354, aspect: 1 };
  const camU = { uCamPos: { value: cam.pos }, uCamMat: { value: cam.mat }, uTanFov: { value: cam.tan }, uAspect: { value: 1 } };
  const cam3 = new PerspectiveCamera(40, 1, NEAR, FAR);

  const figMat = new ShaderMaterial({
    uniforms: {
      ...camU,
      uRes: { value: new Vector2(1, 1) },
      uSh: { value: rig.state.sh },
      uEl: { value: rig.state.el },
      uWr: { value: rig.state.wr },
      uHand: { value: rig.state.hand },
      uFing: { value: rig.state.fing },
      uBody: { value: rig.state.body },
      uLean: { value: 0 },
      uTwist: { value: 0 },
      uHead: { value: new Vector2() },
      uBreath: { value: 0 },
      uMaxT: { value: MAX_T },
      tPhoto: { value: photoTex },
      uPhotoOn: { value: photoTex ? 1 : 0 },
    },
    vertexShader: VERT,
    fragmentShader: FIGURE_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const compMat = new ShaderMaterial({
    uniforms: {
      ...camU,
      tFig: { value: null },
      tSheet: { value: texes[0] },
      tWords: { value: wordsTexture(words) },
      uRes: { value: new Vector2(1, 1) },
      uFigRes: { value: new Vector2(1, 1) },
      uPitch: { value: 4 },
      uSheetInv: { value: new Matrix4() },
      uSheetSize: { value: new Vector2(rig.state.size[0], rig.state.size[1]) },
      uSheetOn: { value: 0 },
      uHover: { value: 0 },
      uPink: { value: 0 },
      uFigDim: { value: 1 },
      uWordsRect: { value: [0, 0, 1, 1] },
      uWordsOn: { value: 1 },
      uWallZ: { value: WALL_Z },
      uMaxT: { value: MAX_T },
      uNear: { value: NEAR },
      uFar: { value: FAR },
      uIntro: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: COMPOSITE_FRAG,
    depthTest: true,
    depthFunc: AlwaysDepth,
    depthWrite: true,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), figMat);
  quad.frustumCulled = false;
  const quadScene = new Scene();
  quadScene.add(quad);
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const figRT = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  figRT.texture.colorSpace = NoColorSpace;
  compMat.uniforms.tFig.value = figRT.texture;
  const mainRT = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  mainRT.texture.colorSpace = NoColorSpace;

  // ---- particles
  const particles = createParticles({ count: mobile ? 6000 : 12000 });
  const pScene = new Scene();
  pScene.add(particles.points);
  let targets = { pitch: [], sectors: [], process: [] };
  function setTexts(t) {
    const n = particles.points.geometry.attributes.position.count;
    targets = {
      pitch: t.pitch.map((lines) => sampleText(lines, n)),
      sectors: t.sectors.map((w) => sampleText([w], n, '"Geist Variable", sans-serif', 900)),
      process: t.process.map((w) => sampleText([w], n, '"Doto", monospace', 900)),
    };
    particles.setPair(null, null);
  }
  setTexts(texts);
  onProgress?.(0.8);

  const post = createPost(renderer, mainRT.texture);
  post.material.uniforms.uQuality.value = mobile ? 0.6 : 1;
  post.material.uniforms.uPower.value = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const s = new Vector2();
    renderer.getDrawingBufferSize(s);
    mainRT.setSize(s.x, s.y);
    // the avatar is ray-marched at a fixed, modest height – the scanline print hides the upscale
    const fh = Math.round((mobile ? 400 : 430) * figScale);
    const fw = Math.max(8, Math.round((fh * s.x) / s.y));
    figRT.setSize(fw, fh);
    figMat.uniforms.uRes.value.set(fw, fh);
    compMat.uniforms.uFigRes.value.set(fw, fh);
    compMat.uniforms.uRes.value.copy(s);
    compMat.uniforms.uPitch.value = Math.max(3, Math.round(3.4 * (s.y / h)));
    post.material.uniforms.uRes.value.copy(s);
    cam.aspect = s.x / s.y;
    camU.uAspect.value = cam.aspect;
    particles.uniforms.uPixelRatio.value = s.y / h;
    api.aspect = cam.aspect;
  }

  const state = {
    hero: 0,
    pitch: 0,
    work: 0,
    sectors: 0,
    process: 0,
    contact: 0,
    section: 'hero',
    velocity: 0,
    pointer: new Vector2(),
    ps: new Vector2(),
    pointerAt: -10,
    hovered: false,
    active: 0,
    introStart: -1,
    running: true,
    glitch: 0,
    flash: 0,
    pink: 0,
    // smoothed camera parameters
    phi: 0,
    dist: mobile ? 5.2 : 4.7,
    pan: 0,
    look: mobile ? -0.55 : -0.3,
    dim: 1,
    wordsOn: 1,
  };

  /* where the camera wants to be for each moment of the page */
  function cameraGoal() {
    const s = state;
    const wide = cam.aspect > 1.05;
    const g = { phi: 0, dist: wide ? 4.7 : 5.2, pan: 0, look: wide ? -0.3 : -0.55, dim: 1, words: 0 };
    switch (s.section) {
      case 'hero':
        g.words = 1 - ramp(s.hero, 0.7, 1) * 0.4;
        g.dist += -s.hero * 0.3;
        break;
      case 'pitch':
        g.phi = lerp(-0.2, 0.2, s.pitch);
        g.dist = wide ? 5.2 : 5.9;
        g.dim = lerp(1, 0.3, ramp(s.pitch, 0.02, 0.14)) + ramp(s.pitch, 0.9, 1) * 0.7;
        g.words = (1 - ramp(s.pitch, 0.02, 0.16)) * 0.6;
        break;
      case 'work': {
        const u = clamp(s.work, 0, 0.9999) * N;
        const c = u - Math.floor(u);
        // wide and low while he catches and spins, close and frontal when he shows
        const show = ease(ramp(c, 0.42, 0.6)) * (1 - ease(ramp(c, 0.93, 1)));
        g.phi = lerp(-0.2, 0, show);
        g.dist = lerp(wide ? 4.6 : 5.6, wide ? 4.35 : 4.6, show);
        g.look = lerp(wide ? -0.05 : 0.0, wide ? -0.36 : -0.74, show);
        g.pan = lerp(0, wide ? -0.5 : 0, show);
        break;
      }
      case 'sectors':
        g.phi = wide ? 0.16 : 0;
        g.pan = wide ? -1.25 : 0;
        g.dist = wide ? 4.6 : 6.0;
        g.look = wide ? -0.3 : -1.25;
        g.dim = wide ? 1 : 0.75;
        break;
      case 'process':
        g.phi = wide ? -0.1 : 0;
        g.pan = wide ? -1.25 : 0;
        g.dist = wide ? 4.6 : 6.0;
        g.look = wide ? -0.3 : -1.25;
        g.dim = wide ? 1 : 0.75;
        break;
      default: {
        const show = ease(ramp(s.contact, 0.35, 0.6));
        g.phi = lerp(-0.18, 0, show);
        g.dist = lerp(wide ? 4.6 : 5.6, wide ? 4.15 : 4.7, show);
        g.look = lerp(wide ? -0.05 : 0, wide ? -0.46 : -0.78, show);
      }
    }
    return g;
  }

  const R = new Vector3(),
    Uv = new Vector3(),
    F = new Vector3(),
    target = new Vector3(),
    UP = new Vector3(0, 1, 0);
  function setCamera() {
    const ps = state.ps;
    const phi = state.phi + ps.x * 0.06;
    target.set(state.pan + ps.x * 0.03, state.look, 0);
    cam.pos.set(target.x + Math.sin(phi) * state.dist, state.look - 0.02 + ps.y * 0.1, Math.cos(phi) * state.dist);
    F.copy(target).sub(cam.pos).normalize();
    R.crossVectors(F, UP).normalize();
    Uv.crossVectors(R, F);
    cam.mat.set(R.x, Uv.x, F.x, R.y, Uv.y, F.y, R.z, Uv.z, F.z);
    cam.tan = Math.tan(((cam.aspect > 1.05 ? 39 : 46) * Math.PI) / 360);
    camU.uTanFov.value = cam.tan;
    cam3.position.copy(cam.pos);
    cam3.up.copy(UP);
    cam3.lookAt(target);
    cam3.fov = (Math.atan(cam.tan) * 360) / Math.PI;
    cam3.aspect = cam.aspect;
    cam3.updateProjectionMatrix();
    cam3.updateMatrixWorld();
  }

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
    return Math.abs(lo.x + ld.x * t) < rig.state.size[0] / 2 && Math.abs(lo.y + ld.y * t) < rig.state.size[1] / 2;
  }

  /* particles: which two formations are we between, and how far */
  const centre = new Vector3();
  function sequence(list, p, inAt, outAt) {
    // dust → list[0] → … → list[n-1] → dust, spread over inAt … outAt
    const n = list.length;
    const u = ramp(p, inAt, outAt) * (n + 1); // 0..n+1
    const i = Math.min(n, Math.floor(u));
    const f = u - i;
    const m = ease(ramp(f, 0.0, 0.42)); // move in the first part of each slot, then hold
    return { a: i === 0 ? null : list[i - 1], b: i === n ? null : list[i], m, index: i === n ? n - 1 : m > 0.5 ? i : i - 1 };
  }
  function viewWidth(dist) {
    return 2 * dist * cam.tan * cam.aspect;
  }
  function updateParticles(dt, time) {
    const s = state;
    const wide = cam.aspect > 1.05;
    let seq = { a: null, b: null, m: 0 };
    let place = null;
    if (s.section === 'pitch') {
      seq = sequence(targets.pitch, s.pitch, 0.04, 1.0);
      const z = 1.5;
      const vw = viewWidth((wide ? 5.2 : 5.9) - z);
      place = { x: 0, y: state.look + (wide ? 0.12 : 0.35), z, scale: vw * (wide ? 0.8 : 0.9) };
    } else if (s.section === 'sectors') {
      seq = sequence(targets.sectors, s.sectors, 0.03, 1.0);
      const z = wide ? -1.4 : 1.1; // phones: across the chest, in front of him
      const vw = viewWidth((wide ? 4.6 : 6.0) - z);
      place = wide ? { x: state.pan - vw * 0.17, y: state.look + vw * 0.13, z, scale: vw * 0.58 } : { x: 0, y: state.look + 0.55, z, scale: vw * 0.88 };
    } else if (s.section === 'process') {
      seq = sequence(targets.process, s.process, 0.03, 1.0);
      const z = wide ? -1.4 : 1.1;
      const vw = viewWidth((wide ? 4.6 : 6.0) - z);
      place = wide ? { x: state.pan - vw * 0.2, y: state.look + vw * 0.1, z, scale: vw * 0.42 } : { x: 0, y: state.look + 0.55, z, scale: vw * 0.6 };
    }
    particles.setPair(seq.a, seq.b);
    if (place) centre.set(place.x, place.y, place.z);
    particles.setXf('a', seq.a ? centre : null, place?.scale || 1);
    particles.setXf('b', seq.b ? centre : null, place?.scale || 1);
    const u = particles.uniforms;
    u.uMix.value = seq.m;
    u.uTime.value = time;
    u.uPink.value = state.pink;
    u.uSize.value = mobile ? 0.9 : 1;
    api.formation = seq.index ?? -1;
  }

  let last = performance.now();
  let time = 0;
  let raf = 0;
  let frames = 0,
    fpsT = 0,
    low = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!state.running) return;
    const real = (now - last) / 1000;
    const dt = Math.min(0.05, real);
    last = now;
    time += dt;

    // fps watchdog (real time): first lower the avatar's resolution, then the screen's
    frames++;
    fpsT += real;
    if (fpsT > 1) {
      const fps = frames / fpsT;
      api.fps = fps;
      frames = 0;
      fpsT = 0;
      if (fps < 38 && !hq) {
        if (++low >= 2 || fps < 12) {
          if (figScale > 0.5) figScale = Math.max(0.45, figScale - (fps < 12 ? 0.3 : 0.15));
          else if (dpr > 1) dpr = Math.max(1, dpr - 0.5);
          resize();
          low = 0;
        }
      } else low = 0;
    }

    // pointer; when nobody moves it the avatar looks around on his own
    const idle = time - state.pointerAt > 3.5;
    if (idle) state.pointer.set(Math.sin(time * 0.42) * 0.4, Math.sin(time * 0.27 + 1) * 0.22);
    state.ps.lerp(state.pointer, Math.min(1, dt * (idle ? 1.2 : 4)));

    // ---- which poster, and where in its cycle
    let want = -1,
      s = 0,
      extra = null;
    if (state.section === 'work') {
      const u = clamp(state.work, 0, 0.9999) * N;
      want = Math.floor(u);
      s = u - want;
    } else if (state.section === 'contact') {
      want = CONTACT;
      s = Math.min(0.8, state.contact * 1.25); // comes in, gets shown, stays
      extra = { show: mobile ? [0, 0.12, 0.12] : [0, 0.06, 0.16], step: 0.1 };
    }
    const present = state.section === 'sectors' || state.section === 'process' ? 1 : 0;
    const r = rig.update(reducedMotion ? 0.05 : dt, time, want, s, state.ps, extra, present);
    const shown = r.shown;
    if (texes[shown] && compMat.uniforms.tSheet.value !== texes[shown]) compMat.uniforms.tSheet.value = texes[shown];
    if (shown !== state.active && shown < N && state.section === 'work') {
      state.active = shown;
      api.onActive?.(shown);
    }

    // ---- camera + world
    const g = cameraGoal();
    const k = reducedMotion ? 1 : Math.min(1, dt * 2.8);
    state.phi += (g.phi - state.phi) * k;
    state.dist += (g.dist - state.dist) * k;
    state.pan += (g.pan - state.pan) * k;
    state.look += (g.look - state.look) * k;
    state.dim += (g.dim - state.dim) * Math.min(1, dt * 4);
    state.wordsOn += (g.words - state.wordsOn) * Math.min(1, dt * 4);
    const pinkT = state.section === 'work' ? 1 : 0;
    state.pink += (pinkT - state.pink) * Math.min(1, dt * 5);
    setCamera();

    const wide = cam.aspect > 1.05;
    const ww = wide ? 12.4 : 4.9;
    const wh = ww * 0.5;
    const cu = compMat.uniforms;
    cu.uWordsRect.value = [-ww / 2, (wide ? 0.0 : 1.5) - wh / 2, ww, wh];
    cu.uWordsOn.value = state.wordsOn;
    cu.uPink.value = state.pink;
    cu.uFigDim.value = state.dim;
    cu.uSheetInv.value.copy(r.sheetInverse);
    cu.uSheetOn.value = r.sheetAlpha;
    cu.uHover.value += ((state.hovered ? 1 : 0) - cu.uHover.value) * Math.min(1, dt * 8);
    cu.uTime.value = time;
    let intro = 0;
    if (state.introStart >= 0) intro = instant ? 1 : clamp((time - state.introStart) / 1.5);
    cu.uIntro.value = intro;

    const fu = figMat.uniforms;
    fu.uLean.value = r.lean;
    fu.uTwist.value = r.twist;
    fu.uHead.value.set(r.head[0], r.head[1]);
    fu.uBreath.value = r.breath;

    updateParticles(dt, time);
    api.presenting = r.presenting * r.sheetAlpha;
    api.scene = state.section === 'work' ? 'pink' : 'black';

    // ---- post
    state.glitch *= Math.pow(0.02, dt);
    state.flash *= Math.pow(0.004, dt);
    if (!reducedMotion && Math.random() < dt * 0.18) state.glitch = Math.max(state.glitch, 0.2 + Math.random() * 0.25);
    const pu = post.material.uniforms;
    pu.uTime.value = time;
    pu.uGlitch.value = reducedMotion ? 0 : state.glitch;
    pu.uFlash.value = reducedMotion ? 0 : state.flash;
    pu.uPink.value = state.pink;
    const vel = reducedMotion ? 0 : clamp(state.velocity / 60, -1, 1);
    pu.uVelocity.value += (vel - pu.uVelocity.value) * Math.min(1, dt * 6);
    if (state.introStart >= 0) pu.uPower.value = clamp((time - state.introStart) / 0.35);

    // pass 1: avatar, small
    quad.material = figMat;
    renderer.setRenderTarget(figRT);
    renderer.render(quadScene, ortho);
    // pass 2: wall + avatar print + poster (writes depth), then the swarm on top of it
    quad.material = compMat;
    renderer.setRenderTarget(mainRT);
    renderer.autoClear = true;
    renderer.render(quadScene, ortho);
    renderer.autoClear = false;
    renderer.render(pScene, cam3);
    renderer.autoClear = true;
    // pass 3: the tube
    post.render();
  }

  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
    last = performance.now();
  });

  const api = {
    fps: 60,
    aspect: 1,
    scene: 'black',
    presenting: 0,
    formation: -1,
    onActive: null,
    start() {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    boot() {
      state.introStart = time;
      state.flash = 0.9;
      state.glitch = 1;
    },
    setProgress(p) {
      if (p.section !== state.section) {
        state.glitch = Math.max(state.glitch, 0.9);
        if (p.section === 'work' || state.section === 'work') state.flash = Math.max(state.flash, 0.35);
      }
      Object.assign(state, p);
    },
    setPointer(x, y) {
      state.pointer.set(x, y);
      state.pointerAt = time;
    },
    glitch(a = 0.6) {
      state.glitch = Math.max(state.glitch, a);
    },
    /* index of the project whose poster is under the point, 'contact', or null */
    pick(x, y) {
      if (rig.state.sheetAlpha < 0.9 || rig.state.presenting < 0.6) return null;
      if (!sheetHit(x, y)) return null;
      return rig.state.shown === CONTACT ? 'contact' : rig.state.shown;
    },
    setHovered(v) {
      state.hovered = !!v;
    },
    setContactSheet(c) {
      contactTex.image = c;
      contactTex.needsUpdate = true;
    },
    setTexts,
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
  window.addEventListener('resize', resize);
  resize();
  setCamera();
  onProgress?.(1);
  return api;
}

import {
  AlwaysDepth,
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Matrix3,
  Matrix4,
  Mesh,
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
} from 'three';
import { COMPOSITE_FRAG } from './compositeShader.js';
import { createFigure } from './figure.js';
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

/* how each poster enters, and when its "held out" phase begins within the cycle */
const SHOW_AT = { spin: 0.52, side: 0.46, below: 0.44 };

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

export async function createStage({ canvas, projects, sheets, contactSheet, words, photo, body, statement, mobile, reducedMotion, instant, onProgress }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace; // colours are authored display-referred
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let figScale = 1; // lowered by the fps watchdog on weak devices

  const N = projects.length;
  const CONTACT = N;
  const kinds = projects.map((p, i) => p.entrance || (i === 0 ? 'spin' : i % 2 ? 'side' : 'below'));
  const rig = createRig({ mobile });
  onProgress?.(0.15);

  // ---- textures
  const loader = new TextureLoader();
  // a server can hiccup (e.g. right after a deploy): try each picture up to three times
  const load = (src, tries = 3) =>
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
        () => (tries > 1 ? setTimeout(() => load(src + (src.includes('?') ? '&' : '?') + 'r=' + tries, tries - 1).then(res), 700) : res(null)),
      ),
    );
  const [photoTex, bodyTex, ...texes] = await Promise.all([load(photo), load(body), ...sheets.map(load)]);
  if (!photoTex || !bodyTex) throw new Error('avatar textures missing');
  const contactTex = new CanvasTexture(contactSheet);
  contactTex.colorSpace = NoColorSpace;
  contactTex.minFilter = LinearFilter;
  contactTex.generateMipmaps = false;
  texes.push(contactTex);
  onProgress?.(0.55);

  // ---- one camera for everything
  const cam = { pos: new Vector3(), mat: new Matrix3(), tan: 0.354, aspect: 1 };
  const camU = { uCamPos: { value: cam.pos }, uCamMat: { value: cam.mat }, uTanFov: { value: cam.tan }, uAspect: { value: 1 } };
  const cam3 = new PerspectiveCamera(40, 1, NEAR, FAR);

  const figure = createFigure({ photoTex, bodyTex, maxT: MAX_T });

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
      uGlow: { value: 0 },
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
  const quad = new Mesh(new PlaneGeometry(2, 2), compMat);
  quad.frustumCulled = false;
  const quadScene = new Scene();
  quadScene.add(quad);
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const figRT = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  figRT.texture.colorSpace = NoColorSpace;
  compMat.uniforms.tFig.value = figRT.texture;
  const mainRT = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  mainRT.texture.colorSpace = NoColorSpace;

  // ---- the swarm and its one sentence
  const particles = createParticles({ count: mobile ? 7000 : 13000 });
  const pScene = new Scene();
  pScene.add(particles.points);
  function setStatement(lines) {
    particles.setText(sampleText(lines, particles.points.geometry.attributes.position.count));
  }
  setStatement(statement);
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
    // the avatar is drawn at a modest height – the scanline print hides the upscale
    const fh = Math.round(Math.min(s.y, mobile ? 640 : 720) * figScale);
    const fw = Math.max(8, Math.round((fh * s.x) / s.y));
    figRT.setSize(fw, fh);
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
    glow: 0,
    form: 0,
    // smoothed camera parameters
    phi: 0,
    dist: mobile ? 5.0 : 4.7,
    pan: 0,
    look: mobile ? -0.7 : -0.3,
    dim: 1,
    wordsOn: 1,
  };

  /* where the camera wants to be for each moment of the page */
  function cameraGoal() {
    const s = state;
    const wide = cam.aspect > 1.05;
    const g = { phi: 0, dist: wide ? 4.7 : 5.0, pan: 0, look: wide ? -0.3 : -0.7, dim: 1, words: 0 };
    switch (s.section) {
      case 'hero':
        g.words = 1 - ramp(s.hero, 0.6, 1) * 0.5;
        g.dist -= s.hero * 0.35;
        g.phi = (s.hero - 0.5) * 0.12;
        break;
      case 'pitch':
        g.phi = lerp(-0.16, 0.16, s.pitch);
        g.dist = wide ? 5.2 : 5.9;
        g.look = wide ? -0.3 : -0.5;
        g.dim = lerp(1, 0.28, ramp(s.pitch, 0.04, 0.16)) + ramp(s.pitch, 0.88, 1) * 0.72;
        g.words = (1 - ramp(s.pitch, 0.02, 0.14)) * 0.5;
        break;
      case 'work': {
        const u = clamp(s.work, 0, 0.9999) * N;
        const i = Math.floor(u);
        const c = u - i;
        const kind = kinds[i];
        const at = SHOW_AT[kind];
        const show = ease(ramp(c, at, at + 0.16)) * (1 - ease(ramp(c, 0.92, 1)));
        // the entrance decides the wide shot; the close shot is the same for all
        const entry =
          kind === 'spin'
            ? { phi: -0.2, dist: wide ? 4.6 : 5.6, look: wide ? -0.05 : 0.0, pan: 0 }
            : kind === 'side'
              ? { phi: 0.1, dist: wide ? 5.0 : 5.8, look: wide ? -0.35 : -0.55, pan: wide ? 0.55 : 0.25 }
              : { phi: 0, dist: wide ? 4.8 : 5.6, look: wide ? -0.6 : -0.9, pan: 0 };
        g.phi = lerp(entry.phi, 0, show);
        g.dist = lerp(entry.dist, wide ? 4.35 : 4.6, show);
        g.look = lerp(entry.look, wide ? -0.36 : -0.74, show);
        g.pan = lerp(entry.pan, wide ? -0.5 : 0, show);
        break;
      }
      case 'sectors':
      case 'process':
        g.phi = wide ? (s.section === 'sectors' ? 0.16 : -0.08) : 0;
        g.pan = wide ? -1.25 : 0;
        g.dist = wide ? 4.6 : 6.4;
        g.look = wide ? -0.3 : -0.78;
        break;
      default: {
        const at = SHOW_AT.below;
        const c = Math.min(0.8, s.contact * 1.25);
        const show = ease(ramp(c, at, at + 0.16));
        g.dist = lerp(wide ? 4.8 : 5.6, wide ? 4.15 : 4.7, show);
        g.look = lerp(wide ? -0.6 : -0.9, wide ? -0.46 : -0.78, show);
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
      if (fps < 40) {
        if (++low >= 2 || fps < 12) {
          if (figScale > 0.6) figScale = Math.max(0.55, figScale - 0.2);
          else if (dpr > 1) dpr = Math.max(1, dpr - 0.25);
          resize();
          low = 0;
        }
      } else low = 0;
    }

    // pointer; when nobody moves it the avatar looks around on his own
    const idle = time - state.pointerAt > 3.5;
    if (idle) state.pointer.set(Math.sin(time * 0.42) * 0.4, Math.sin(time * 0.27 + 1) * 0.22);
    state.ps.lerp(state.pointer, Math.min(1, dt * (idle ? 1.2 : 4)));

    // ---- which poster, how it enters, and where in its cycle
    let want = -1,
      s = 0,
      kind = 'below',
      extra = null;
    if (state.section === 'work') {
      const u = clamp(state.work, 0, 0.9999) * N;
      want = Math.floor(u);
      s = u - want;
      kind = kinds[want];
    } else if (state.section === 'contact') {
      want = CONTACT;
      s = Math.min(0.8, state.contact * 1.25); // comes up, gets shown, stays
      extra = { show: mobile ? [0, 0.12, 0.12] : [0, 0.06, 0.16], step: 0.1 };
    }
    const present = state.section === 'sectors' || state.section === 'process' ? 1 : 0;
    const r = rig.update(reducedMotion ? 0.05 : dt, time, want, s, kind, state.ps, extra, present);
    figure.update(r);
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
    state.glow += ((state.section === 'work' ? 1 : 0) - state.glow) * Math.min(1, dt * 3);
    setCamera();

    const wide = cam.aspect > 1.05;
    const cu = compMat.uniforms;
    // desktop: three lines across the wall; phones: the same block, stretched tall, filling the screen
    cu.uWordsRect.value = wide ? [-6.2, -3.1, 12.4, 6.2] : [-2.35, -2.6, 4.7, 7.2];
    cu.uWordsOn.value = state.wordsOn;
    cu.uGlow.value = state.glow;
    cu.uFigDim.value = state.dim;
    cu.uSheetInv.value.copy(r.sheetInverse);
    cu.uSheetOn.value = r.sheetAlpha;
    cu.uHover.value += ((state.hovered ? 1 : 0) - cu.uHover.value) * Math.min(1, dt * 8);
    cu.uTime.value = time;
    let intro = 0;
    if (state.introStart >= 0) intro = instant ? 1 : clamp((time - state.introStart) / 1.5);
    cu.uIntro.value = intro;

    // ---- the one sentence: it assembles by itself once you are there (and lets go when you leave)
    const here = state.section === 'pitch' && state.pitch > 0.1 && state.pitch < 0.86;
    state.form = clamp(state.form + (here ? dt / (reducedMotion ? 0.3 : 2.4) : -dt / 0.7));
    const z = 1.4;
    const vw = 2 * ((wide ? 5.2 : 5.9) - z) * cam.tan * cam.aspect;
    const pu = particles.uniforms;
    pu.uXf.value.set(0, (wide ? -0.3 : -0.5) + (wide ? 0.1 : 0.45), z, vw * (wide ? 0.78 : 0.9));
    pu.uForm.value = state.form;
    pu.uTime.value = time;
    pu.uSize.value = mobile ? 0.9 : 1;
    api.formed = state.form > 0.86;

    api.presenting = r.presenting * r.sheetAlpha;

    // ---- post
    state.glitch *= Math.pow(0.02, dt);
    state.flash *= Math.pow(0.004, dt);
    if (!reducedMotion && Math.random() < dt * 0.15) state.glitch = Math.max(state.glitch, 0.2 + Math.random() * 0.25);
    const po = post.material.uniforms;
    po.uTime.value = time;
    po.uGlitch.value = reducedMotion ? 0 : state.glitch;
    po.uFlash.value = reducedMotion ? 0 : state.flash;
    const vel = reducedMotion ? 0 : clamp(state.velocity / 60, -1, 1);
    po.uVelocity.value += (vel - po.uVelocity.value) * Math.min(1, dt * 6);
    if (state.introStart >= 0) po.uPower.value = clamp((time - state.introStart) / 0.35);

    // pass 1: avatar (plain geometry) into its own small picture
    renderer.setRenderTarget(figRT);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(figure.scene, cam3);
    // pass 2: wall + avatar print + poster (writes depth), then the swarm on top of it
    renderer.setRenderTarget(mainRT);
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
    presenting: 0,
    formed: false,
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
      if (p.section !== state.section) state.glitch = Math.max(state.glitch, 0.8);
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
    setStatement,
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

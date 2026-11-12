import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  Plane,
  SRGBColorSpace,
  NoToneMapping,
} from 'three';
import { U, LAYOUT } from './shared.js';
import { createPost } from './post.js';
import { createPortrait } from './portrait.js';
import { createTunnel } from './tunnel.js';
import { createScreens, screenZ } from './screens.js';
import { createFloorText } from './floorText.js';
import { createEmblem } from './emblem.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const DWELL = 7.4;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function createStage({ canvas, projects, textures, portraitUrl, keyOut, mobile, reducedMotion, onProgress }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  U.uPixelRatio.value = dpr;

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 120);
  const post = createPost(renderer);
  post.material.uniforms.uQuality.value = mobile ? 0.6 : 1;
  post.material.uniforms.uPower.value = 0;

  const N = projects.length;
  const lastScreenZ = screenZ(N - 1);
  const aboutZ = lastScreenZ - LAYOUT.aboutGap;
  const contactZ = aboutZ - LAYOUT.contactGap;

  // ---- build world
  onProgress?.(0.1, 'mount tunnel');
  const tunnel = createTunnel({ length: Math.abs(contactZ) + 40 });
  scene.add(tunnel.mesh);

  onProgress?.(0.25, 'sampling portrait');
  const portrait = await createPortrait({ url: portraitUrl, keyOut, mobile });
  scene.add(portrait.group);

  onProgress?.(0.55, 'tuning screens');
  const screens = createScreens({ projects, textures, mobile });
  scene.add(screens.group);

  const floor = createFloorText({ fromZ: screenZ(0) + 20, toZ: lastScreenZ - 12 });
  scene.add(floor.mesh);

  onProgress?.(0.75, 'growing emblem');
  const emblem = createEmblem({ count: mobile ? 3500 : 7000 });
  emblem.points.position.set(0, LAYOUT.floorY + 3.1, aboutZ);
  scene.add(emblem.points);

  // compile shaders up-front so the first scroll doesn't stutter
  onProgress?.(0.9, 'compiling shaders');
  renderer.compile(scene, camera);

  // ---- state
  const state = {
    hero: 0,
    work: 0,
    about: 0,
    contact: 0,
    velocity: 0,
    pointer: new Vector2(),
    pointerSmooth: new Vector2(),
    hovered: null,
    active: 0,
    glitch: 0.6,
    invert: 0,
    section: 'hero',
    introStart: -1,
    running: true,
  };

  const ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), -LAYOUT.portraitZ);
  const tmpV = new Vector3();
  const lookTarget = new Vector3();
  const camPos = new Vector3(0, 0.6, 2);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? clamp((45 / camera.aspect) * 0.62, 45, 72) : 45;
    camera.updateProjectionMatrix();
    const s = new Vector2();
    renderer.getDrawingBufferSize(s);
    post.setSize(s.x, s.y);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- camera path from the section progress values
  function cameraZ() {
    const { hero, work, about, contact } = state;
    const workEntry = screenZ(0) + 16;
    if (state.section === 'hero' || (work <= 0 && about <= 0 && contact <= 0)) {
      return lerp(2, workEntry, easeIO(hero));
    }
    if (state.section === 'work' || (about <= 0 && contact <= 0)) {
      const lead = 0.1;
      if (work < lead) return lerp(workEntry, screenZ(0) + DWELL, easeIO(work / lead));
      const u = ((work - lead) / (1 - lead)) * (N - 1);
      const i = Math.min(N - 2, Math.floor(u));
      if (N < 2) return screenZ(0) + DWELL;
      const f = u - i;
      const fe = lerp(f, easeIO(f), 0.75);
      return lerp(screenZ(i) + DWELL, screenZ(i + 1) + DWELL, fe);
    }
    if (state.section === 'about' || contact <= 0) {
      if (about < 0.22) return lerp(lastScreenZ + DWELL, aboutZ + 9, easeIO(about / 0.22));
      return lerp(aboutZ + 9, aboutZ + 7.2, (about - 0.22) / 0.78);
    }
    return lerp(aboutZ + 7.2, contactZ + 10, easeIO(clamp(contact / 0.4)));
  }

  function activeIndex(camZ) {
    let best = 0,
      bd = 1e9;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(camZ - (screenZ(i) + DWELL));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  // ---- loop
  let last = performance.now();
  let time = 0;
  let frames = 0,
    fpsT = 0,
    fps = 60,
    lowFor = 0;
  let raf = 0;
  let emblemSpin = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    U.uTime.value = time;

    // fps watchdog → lower resolution on weak devices
    frames++;
    fpsT += dt;
    if (fpsT > 1) {
      fps = frames / fpsT;
      frames = 0;
      fpsT = 0;
      api.fps = fps;
      if (fps < 42 && dpr > 0.85) {
        lowFor++;
        if (lowFor >= 2) {
          dpr = Math.max(0.75, dpr - 0.25);
          renderer.setPixelRatio(dpr);
          U.uPixelRatio.value = dpr;
          resize();
          lowFor = 0;
        }
      } else lowFor = 0;
    }

    // intro
    let intro = 1;
    if (state.introStart >= 0) {
      intro = clamp((time - state.introStart) / 2.6);
      const pw = clamp((time - state.introStart) / 0.5);
      post.material.uniforms.uPower.value = pw;
      post.material.uniforms.uFlash.value = Math.max(0, 1 - (time - state.introStart) * 3) * 0.6;
    }
    portrait.uniforms.uIntro.value = intro;

    // pointer smoothing
    state.pointerSmooth.lerp(state.pointer, Math.min(1, dt * 5));
    const ps = state.pointerSmooth;
    U.uPointer.value.copy(ps);

    // camera
    const z = cameraZ();
    camPos.z += (z - camPos.z) * (reducedMotion ? 1 : Math.min(1, dt * 7));
    const sway = mobile ? 0.25 : 0.45;
    camera.position.set(ps.x * sway, 0.6 + ps.y * sway * 0.5, camPos.z);
    lookTarget.set(ps.x * 0.25, 0.55 + ps.y * 0.1, camPos.z - 10);
    camera.lookAt(lookTarget);
    camera.rotation.z += -ps.x * 0.015;
    U.uCamZ.value = camPos.z;

    // theme: dark hero → light work/about → dark contact
    const inv = clamp(smooth(0.5, 0.78, state.hero) - smooth(0.0, 0.3, state.contact));
    state.invert += (inv - state.invert) * Math.min(1, dt * 6);
    U.uInvert.value = state.invert;
    renderer.setClearColor(state.invert > 0.5 ? 0xf3f4f1 : 0x030405);

    // portrait
    portrait.uniforms.uDissolve.value = smooth(0.12, 0.62, state.hero);
    portrait.group.visible = state.hero < 0.98 || state.section === 'hero';
    portrait.group.rotation.y = ps.x * 0.18;
    portrait.group.rotation.x = -ps.y * 0.05;
    // pointer on portrait plane
    ray.setFromCamera(ps, camera);
    if (ray.ray.intersectPlane(plane, tmpV)) {
      portrait.group.worldToLocal(tmpV);
      portrait.uniforms.uMouse.value.set(tmpV.x, tmpV.y);
    }
    const targetMS = mobile && !api.gyro ? 0 : 1;
    portrait.uniforms.uMouseStrength.value += (targetMS - portrait.uniforms.uMouseStrength.value) * Math.min(1, dt * 3);
    portrait.uniforms.uGlitch.value = state.glitch;

    // work screens
    const act = activeIndex(camPos.z);
    if (act !== state.active && state.section === 'work') {
      state.active = act;
      api.onActive?.(act);
      kick(0.35);
    }
    screens.update(camPos.z, state.section === 'work' ? state.active : -1, state.hovered, dt, time);
    floor.material.uniforms.uOpacity.value = smooth(0.4, 1, state.hero) * (1 - smooth(0.1, 0.5, state.about));

    // emblem
    const a = state.about;
    const c = state.contact;
    const w = new Float32Array(4);
    const s1 = smooth(0.36, 0.48, a);
    const s2 = smooth(0.68, 0.8, a);
    const s3 = smooth(0.02, 0.32, c);
    w[0] = (1 - s1) * (1 - s3);
    w[1] = s1 * (1 - s2) * (1 - s3);
    w[2] = s2 * (1 - s3);
    w[3] = s3;
    emblem.uniforms.uW.value.set(w[0], w[1], w[2], w[3]);
    emblem.uniforms.uOpacity.value = smooth(0.0, 0.25, a);
    emblem.uniforms.uScatter.value = (1 - smooth(0.05, 0.3, a)) * 3 + Math.abs(state.velocity) * 0.4;
    const shift = mobile ? 0 : a < 0.42 ? 1.6 : a < 0.72 ? -1.6 : 0;
    emblem.points.position.x += (shift * (1 - s3) - emblem.points.position.x) * Math.min(1, dt * 2.5);
    emblem.points.position.z = lerp(aboutZ, contactZ, s3);
    emblem.points.position.y = lerp(LAYOUT.floorY + 3.1 + (mobile ? 1.5 : 0), 0.6, s3);
    emblem.points.scale.setScalar(mobile ? lerp(0.62, 0.8, s3) : 1);
    emblemSpin += dt * (0.25 + Math.abs(state.velocity) * 0.5);
    emblem.points.rotation.y = lerp(emblemSpin, Math.round(emblemSpin / Math.PI) * Math.PI, s3);
    emblem.points.rotation.x = lerp(0.3, 0, s3);
    emblem.points.rotation.z += dt * 0.05 * s3;
    emblem.uniforms.uSize.value = lerp(1, mobile ? 1.1 : 1.35, s3);
    emblem.points.visible = a > 0 || c > 0;

    tunnel.material.uniforms.uPulse.value = smooth(0.2, 0.6, c) + (1 - smooth(0.02, 0.3, state.hero)) * 0.6;

    // glitch decay + random micro glitches
    if (!reducedMotion && Math.random() < dt * 0.25) kick(0.25 + Math.random() * 0.3);
    state.glitch *= Math.pow(0.04, dt);
    post.material.uniforms.uGlitch.value = reducedMotion ? 0 : state.glitch;
    const vel = reducedMotion ? 0 : clamp(state.velocity / 40, -1, 1);
    post.material.uniforms.uVelocity.value += (vel - post.material.uniforms.uVelocity.value) * Math.min(1, dt * 8);

    post.render(scene, camera);
  }

  function kick(amount) {
    state.glitch = Math.max(state.glitch, amount);
  }

  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
    last = performance.now();
  });

  const api = {
    fps: 60,
    gyro: false,
    onActive: null,
    portraitIsPhoto: portrait.isPhoto,
    get invert() {
      return state.invert;
    },
    start() {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    boot() {
      state.introStart = time;
      kick(1);
    },
    setProgress(p) {
      Object.assign(state, p);
    },
    setPointer(x, y) {
      state.pointer.set(x, y);
    },
    glitch: kick,
    pick(x, y) {
      if (state.section !== 'work') return null;
      ray.setFromCamera(new Vector2(x, y), camera);
      const hit = ray.intersectObjects(screens.meshes, false)[0];
      return hit ? hit.object.userData.index : null;
    },
    setHovered(i) {
      if (i !== state.hovered && i !== null) kick(0.2);
      state.hovered = i;
    },
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
  onProgress?.(1, 'ready');
  return api;
}

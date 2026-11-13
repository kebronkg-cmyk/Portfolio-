import { Euler, Matrix3, Matrix4, Quaternion, Vector3 } from 'three';

/* The avatar's choreography.

   Each poster has one "cycle" (s = 0 … 1, driven by scroll) and one of three entrances:
     'spin'   it flies in, lands on the index finger and spins like a pizza (only the pizzeria gets this)
     'side'   he reaches out to the right and pulls it into the picture
     'below'  he bends down and lifts it up from under the frame
   After the entrance every poster is held in both hands, pushed toward the viewer and shown
   for a long plateau; it leaves the way it came (the pizza is flung away).

   Everything is a pure function of s, so scrolling back plays it backwards. Springs on top
   give weight and a little overshoot. Hands are solved with two-bone IK from the poster's
   actual (sprung) position, so they never detach. */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TAU = Math.PI * 2;

const PIVOT = new Vector3(0, -1.9, 0);
const SHOULDER = [new Vector3(-0.7, -0.62, -0.1), new Vector3(0.7, -0.62, -0.1)]; // tucked behind the shirt
const L1 = 0.88; // upper arm
const L2 = 0.84; // forearm
const HAND = 1.14;
const FINGER = (0.19 + 0.135 * 0.9 + 0.11 * 0.9) * HAND; // wrist → tip of the straight index finger

class Spring {
  constructor(v = 0, stiffness = 60, damping = 11) {
    this.x = v;
    this.v = 0;
    this.k = stiffness;
    this.c = damping;
  }
  set(v) {
    this.x = v;
    this.v = 0;
  }
  step(target, dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * (this.x - target) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

export function createRig({ mobile }) {
  // poster size in world units (landscape on desktop, portrait on phones)
  const size = mobile ? [0.9, 1.5] : [1.95, 1.22];

  /* key poses of the poster: position, rotation (YXZ euler) */
  const K = mobile
    ? {
        far: { p: [1.6, 3.4, -6], r: [-0.4, 2.2, 0.6] },
        spin: { p: [0.4, 0.5, 0.75], r: [-2.02, 0, 0] },
        gone: { p: [-2.2, 3.2, -2.5], r: [-0.9, -1.4, 1.2] },
        sideOut: { p: [2.6, -0.5, 0.95], r: [-0.1, -1.0, 0.12] },
        sideIn: { p: [0.5, -0.6, 0.85], r: [-0.25, -0.45, 0.07] },
        below: { p: [0, -4.1, 0.5], r: [-0.8, 0, 0] },
        hold: { p: [0, -0.7, 0.72], r: [-0.42, 0.1, 0.05] },
        show: { p: [0, -0.52, 1.72], r: [-0.05, -0.02, -0.01] },
      }
    : {
        far: { p: [2.6, 3.0, -6.5], r: [-0.4, 2.2, 0.6] },
        spin: { p: [0.9, 0.46, 0.62], r: [-2.02, 0, 0] },
        gone: { p: [-3.4, 2.6, -2.2], r: [-0.9, -1.4, 1.2] },
        sideOut: { p: [4.9, -0.35, 0.95], r: [-0.1, -1.05, 0.12] },
        sideIn: { p: [0.95, -0.5, 0.85], r: [-0.25, -0.5, 0.07] },
        below: { p: [0, -3.7, 0.5], r: [-0.8, 0, 0] },
        hold: { p: [0, -0.66, 0.7], r: [-0.42, 0.1, 0.05] },
        show: { p: [0, -0.4, 1.62], r: [-0.07, -0.03, -0.012] },
      };

  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const blank = () => ({ p: K.hold.p, r: K.hold.r, spin: 0, wFinger: 0, wG: [0, 0], lean: 0, twist: 0, step: 0, lookSheet: 0, curl: 0.3 });

  /* the part every poster shares: hold → push → show (s from `a` to the plateau's end) */
  function present(o, s, a) {
    if (s < a + 0.06) {
      o.p = [...K.hold.p];
      o.r = [...K.hold.r];
      o.lean = 0.08;
      o.lookSheet = 1;
      o.curl = 0.08;
    } else if (s < a + 0.22) {
      const u = easeInOut((s - a - 0.06) / 0.16);
      o.p = mix3(K.hold.p, K.show.p, u);
      o.r = mix3(K.hold.r, K.show.r, u);
      o.lean = lerp(0.08, 0.1, u);
      o.step = u;
      o.lookSheet = 1 - u;
      o.curl = 0.06;
    } else {
      o.p = [...K.show.p];
      o.r = [...K.show.r];
      o.lean = 0.1;
      o.step = 1;
      o.curl = 0.06;
    }
    o.wG = [1, 1];
  }

  const cycles = {
    /* the pizza: fly in · spin on the finger · flip into both hands · show · fling away */
    spin(s) {
      const o = blank();
      if (s < 0.2) {
        const u = easeOut(s / 0.2);
        o.p = mix3(K.far.p, K.spin.p, u);
        o.p[1] += Math.sin(u * Math.PI) * 0.5;
        const tumble = (1 - u) * (1 - u);
        o.r = [lerp(K.far.r[0], K.spin.r[0], u), tumble * TAU * 1.6, tumble * 1.2];
        o.spin = -(1 - u) * TAU * 0.6;
        o.wFinger = ease(ramp(s, 0.05, 0.19));
        o.twist = -0.14 * o.wFinger;
        o.lean = -0.05 * o.wFinger;
        o.lookSheet = ease(ramp(s, 0.02, 0.14));
      } else if (s < 0.4) {
        const u = (s - 0.2) / 0.2;
        o.p = [...K.spin.p];
        o.r = [...K.spin.r];
        o.spin = (1 - Math.pow(1 - u, 2.2)) * TAU * 2;
        const wob = (1 - u) * 0.07;
        o.r[0] += Math.sin(o.spin) * wob;
        o.r[2] = Math.cos(o.spin) * wob;
        o.wFinger = 1;
        o.twist = -0.14;
        o.lean = -0.05;
        o.lookSheet = 1;
      } else if (s < 0.52) {
        const u = easeInOut((s - 0.4) / 0.12);
        o.p = mix3(K.spin.p, K.hold.p, u);
        o.p[2] += Math.sin(u * Math.PI) * 0.25;
        o.r = mix3(K.spin.r, K.hold.r, u);
        o.spin = TAU * 2;
        o.wFinger = 1 - ease(ramp(s, 0.4, 0.46));
        const g = ease(ramp(s, 0.42, 0.51));
        o.wG = [g, g];
        o.twist = -0.14 * (1 - u);
        o.lean = lerp(-0.05, 0.08, u);
        o.lookSheet = 1;
        o.curl = 0.1;
      } else if (s < 0.92) {
        present(o, s, 0.46);
        o.spin = TAU * 2;
      } else {
        const u = (s - 0.92) / 0.08;
        const e = easeIn(u);
        o.p = mix3(K.show.p, K.gone.p, e);
        o.p[0] += Math.sin(u * Math.PI) * 0.25;
        o.r = mix3(K.show.r, K.gone.r, e);
        o.spin = TAU * 2 + e * TAU * 1.5;
        const g = 1 - ease(ramp(u, 0.25, 0.55));
        o.wG = [g, g];
        o.lean = lerp(0.1, -0.04, ease(u));
        o.twist = 0.16 * Math.sin(u * Math.PI);
        o.step = 1 - ease(u);
        o.lookSheet = 0.6 * Math.sin(u * Math.PI);
      }
      return o;
    },

    /* from the right: reach out, pull it in, take it in both hands */
    side(s) {
      const o = blank();
      if (s < 0.24) {
        const u = easeOut(s / 0.24);
        o.p = mix3(K.sideOut.p, K.sideIn.p, u);
        o.r = mix3(K.sideOut.r, K.sideIn.r, u);
        o.wG = [0, ease(ramp(s, 0.0, 0.07))];
        o.twist = -0.34 * (1 - u * 0.5) * ease(ramp(s, 0, 0.06));
        o.lean = 0.04;
        o.lookSheet = ease(ramp(s, 0.0, 0.08));
        o.curl = 0.1;
      } else if (s < 0.4) {
        const u = easeInOut((s - 0.24) / 0.16);
        o.p = mix3(K.sideIn.p, K.hold.p, u);
        o.r = mix3(K.sideIn.r, K.hold.r, u);
        o.wG = [ease(ramp(s, 0.25, 0.37)), 1];
        o.twist = -0.17 * (1 - u);
        o.lean = lerp(0.04, 0.08, u);
        o.lookSheet = 1;
        o.curl = 0.08;
      } else if (s < 0.91) {
        present(o, s, 0.4);
      } else {
        // back out to the right, the left hand lets go first
        const u = (s - 0.91) / 0.09;
        const e = easeIn(u);
        o.p = mix3(K.show.p, K.sideOut.p, e);
        o.r = mix3(K.show.r, K.sideOut.r, ease(u));
        o.wG = [1 - ease(ramp(u, 0.05, 0.3)), 1 - ease(ramp(u, 0.75, 1))];
        o.twist = -0.3 * Math.sin(u * Math.PI * 0.8);
        o.lean = lerp(0.1, 0.02, u);
        o.step = 1 - ease(u);
        o.lookSheet = 0.7 * Math.sin(u * Math.PI);
      }
      return o;
    },

    /* from below: bend down, lift it up */
    below(s) {
      const o = blank();
      if (s < 0.1) {
        const u = ease(s / 0.1);
        o.p = [...K.below.p];
        o.r = [...K.below.r];
        o.wG = [u, u];
        o.lean = 0.5 * u;
        o.lookSheet = u;
        o.curl = 0.1;
      } else if (s < 0.38) {
        const u = easeOut((s - 0.1) / 0.28);
        o.p = mix3(K.below.p, K.hold.p, u);
        o.r = mix3(K.below.r, K.hold.r, u);
        o.wG = [1, 1];
        o.lean = lerp(0.5, 0.08, ease(u));
        o.lookSheet = 1;
        o.curl = 0.1;
      } else if (s < 0.91) {
        present(o, s, 0.38);
      } else {
        const u = (s - 0.91) / 0.09;
        const e = easeIn(u);
        o.p = mix3(K.show.p, K.below.p, e);
        o.r = mix3(K.show.r, K.below.r, ease(u));
        o.wG = [1, 1];
        o.lean = lerp(0.1, 0.45, ease(u));
        o.step = 1 - ease(u);
        o.lookSheet = ease(u);
      }
      return o;
    },
  };

  const first = cycles.spin(0);
  const sp = {
    x: new Spring(first.p[0], 70, 13),
    y: new Spring(first.p[1], 70, 13),
    z: new Spring(first.p[2], 70, 13),
    rx: new Spring(first.r[0], 60, 11),
    ry: new Spring(first.r[1], 60, 11),
    rz: new Spring(first.r[2], 60, 11),
    spin: new Spring(0, 90, 17),
    lean: new Spring(0, 34, 9),
    twist: new Spring(0, 30, 9),
    step: new Spring(0, 30, 9.5),
    pitch: new Spring(0, 36, 9),
    yaw: new Spring(0, 36, 9),
    wF: new Spring(0, 60, 14),
    wG: [new Spring(0, 70, 15), new Spring(0, 70, 15)],
    wP: new Spring(0, 26, 8),
    curl: new Spring(0.3, 50, 12),
    alpha: 0,
  };

  const out = {
    size,
    shown: 0,
    sheetMatrix: new Matrix4(),
    sheetInverse: new Matrix4(),
    sh: [new Vector3(), new Vector3()],
    el: [new Vector3(), new Vector3()],
    wr: [new Vector3(), new Vector3()],
    hand: [new Matrix3(), new Matrix3()],
    fing: [new Vector3(0.3, 0, 0.3), new Vector3(0.3, 0, 0.3)],
    body: new Vector3(),
    lean: 0,
    twist: 0,
    head: [0, 0],
    breath: 0,
    sheetAlpha: 0,
    presenting: 0,
  };

  const q = new Quaternion();
  const qs = new Quaternion();
  const e = new Euler();
  const vPos = new Vector3();
  const one = new Vector3(1, 1, 1);
  const ax = new Vector3(),
    ay = new Vector3(),
    az = new Vector3();
  const t1 = new Vector3(),
    t2 = new Vector3(),
    t3 = new Vector3(),
    dir = new Vector3(),
    pole = new Vector3();
  const rest = { p: new Vector3(), x: new Vector3(), y: new Vector3(), z: new Vector3() };
  const fing = { p: new Vector3(), x: new Vector3(), y: new Vector3(), z: new Vector3() };
  const grip = { p: new Vector3(), x: new Vector3(), y: new Vector3(), z: new Vector3() };
  const Zax = new Vector3(0, 0, 1);

  function teleport(o) {
    sp.x.set(o.p[0]);
    sp.y.set(o.p[1]);
    sp.z.set(o.p[2]);
    sp.rx.set(o.r[0]);
    sp.ry.set(o.r[1]);
    sp.rz.set(o.r[2]);
    sp.spin.set(o.spin);
  }

  /**
   * @param want    index of the poster that should be in play (−1 = none)
   * @param s       progress of its cycle, 0..1
   * @param kind    'spin' | 'side' | 'below' – how that poster enters
   * @param pointer {x,y} −1..1
   * @param extra   { show: [dx,dy,dz], step } optional offset of the held-out pose (the contact sign comes closer)
   * @param present 0..1 – offer the open left hand (used beside the big words)
   */
  let lastKind = 'spin';
  function update(dt, time, want, s, kind, pointer, extra, present = 0) {
    let o;
    const visible = want >= 0 && want === out.shown && s > 0.012 && s < 0.99;
    if (want >= 0 && want !== out.shown) {
      // another poster is still around: let it leave the way it does, then swap out of sight
      if (sp.alpha < 0.04) {
        out.shown = want;
        lastKind = kind;
        o = cycles[kind](s);
        teleport(o);
      } else o = { ...cycles[lastKind](1), wG: [0, 0], wFinger: 0 };
    } else if (want < 0) {
      o = { ...cycles[lastKind](1), wG: [0, 0], wFinger: 0, lookSheet: 0, twist: 0, lean: 0 };
    } else {
      lastKind = kind;
      o = cycles[kind](s);
      if (sp.alpha < 0.04 && !visible) teleport(o);
    }
    sp.alpha += ((visible ? 1 : 0) - sp.alpha) * Math.min(1, dt * 9);
    out.sheetAlpha = sp.alpha;

    const held = o.step;
    const ex = extra?.show || [0, 0, 0];
    const x = sp.x.step(o.p[0] + ex[0] * held, dt);
    const y = sp.y.step(o.p[1] + ex[1] * held, dt);
    const z = sp.z.step(o.p[2] + ex[2] * held, dt);
    const rx = sp.rx.step(o.r[0], dt);
    const ry = sp.ry.step(o.r[1] + pointer.x * 0.05 * held, dt);
    const rz = sp.rz.step(o.r[2] + Math.sin(time * 0.9) * 0.008 * held, dt);
    const spin = sp.spin.step(o.spin, dt);

    e.set(rx, ry, rz, 'YXZ');
    q.setFromEuler(e);
    qs.setFromAxisAngle(Zax, spin);
    q.multiply(qs); // spin about the poster's own normal
    vPos.set(x, y + Math.sin(time * 1.1) * 0.006, z);
    out.sheetMatrix.compose(vPos, q, one);
    out.sheetInverse.copy(out.sheetMatrix).invert();
    // un-spun frame: where "right / up / front" of the resting poster are
    qs.setFromEuler(e);
    ax.set(1, 0, 0).applyQuaternion(qs);
    ay.set(0, 1, 0).applyQuaternion(qs);
    az.set(0, 0, 1).applyQuaternion(qs);

    // ---- body
    const lean = sp.lean.step(o.lean, dt);
    const twist = sp.twist.step(o.twist + pointer.x * 0.04, dt);
    const step = sp.step.step(o.step, dt);
    out.lean = lean;
    out.twist = twist;
    out.breath = Math.sin(time * 1.25);
    out.body.set(0, 0, step * (mobile ? 0.32 : 0.36) + (extra?.step || 0) * step);

    // ---- head: watches the poster, otherwise looks at you (and follows the pointer a little)
    const hx = x - out.body.x,
      hy = y - 0.3,
      hz = z - out.body.z + 1.6;
    const sheetYaw = clamp(Math.atan2(hx, hz), -0.42, 0.42);
    const sheetPitch = clamp(Math.atan2(-hy, Math.hypot(hx, hz)) * 0.9, -0.25, 0.4);
    const ls = o.lookSheet * sp.alpha;
    out.head[0] = sp.yaw.step(lerp(pointer.x * 0.26, sheetYaw, ls), dt);
    out.head[1] = sp.pitch.step(lerp(-pointer.y * 0.1, sheetPitch, ls), dt);

    const on = visible ? 1 : 0;
    const wF = clamp(sp.wF.step(o.wFinger * on, dt));
    const wGs = [clamp(sp.wG[0].step(o.wG[0] * on, dt)), clamp(sp.wG[1].step(o.wG[1] * on, dt))];
    const wP = clamp(sp.wP.step(present, dt));
    const curl = sp.curl.step(o.curl, dt);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const wG = wGs[i];
      // shoulder: rest position carried by step/lean/twist, lifted a little when the hand is high
      const s0 = out.sh[i].copy(SHOULDER[i]);
      const active = side === 1 ? Math.max(wF, wG) : wG;
      s0.y += active * clamp((y + 0.9) * 0.05, 0, 0.07) + out.breath * 0.004;
      s0.sub(PIVOT);
      const ct = Math.cos(-twist),
        st = Math.sin(-twist);
      const X = s0.x * ct + s0.z * st;
      let Zz = -s0.x * st + s0.z * ct;
      const cl = Math.cos(-lean),
        sl = Math.sin(-lean);
      const Y = s0.y * cl + Zz * sl;
      Zz = -s0.y * sl + Zz * cl;
      s0.set(X, Y, Zz).add(PIVOT).add(out.body);

      // -- rest: like in the photo – arms down, hands toward the pockets
      rest.p.set(s0.x - side * 0.14 + Math.sin(time * 0.7 + i) * 0.01, s0.y - 1.64, s0.z + 0.14);
      rest.x.set(-side * 0.2, -1, 0.1).normalize();
      rest.y.set(-side, 0, 0.15);
      rest.y.addScaledVector(rest.x, -rest.y.dot(rest.x)).normalize();
      rest.z.crossVectors(rest.x, rest.y).multiplyScalar(-side); // thumbs forward
      if (side === -1 && wP > 0.001) {
        // open hand, palm up, offered toward the word beside him
        const beat = Math.sin(time * 1.6) * 0.02;
        t1.set(s0.x - 0.55, s0.y - 0.5 + beat, s0.z + 0.7);
        rest.p.lerp(t1, wP);
        t1.set(-0.72, 0.28, 0.5).normalize();
        rest.x.lerp(t1, wP).normalize();
        t2.set(0.25, 1, 0.2);
        rest.y.lerp(t2, wP);
        rest.y.addScaledVector(rest.x, -rest.y.dot(rest.x)).normalize();
        rest.z.crossVectors(rest.x, rest.y).multiplyScalar(-side);
      }

      // -- finger: index straight up into the centre of the poster's back
      fing.x.copy(az);
      fing.p.copy(vPos).addScaledVector(az, -(FINGER + 0.012));
      t1.set(0.25 * -side, -0.35, 1);
      fing.y.copy(t1).addScaledVector(fing.x, -t1.dot(fing.x)).normalize(); // palm toward the viewer
      fing.z.crossVectors(fing.x, fing.y).multiplyScalar(-side); // thumb toward the body

      // -- grip: side edge of the poster, palm behind the paper, thumb in front
      const gripY = -size[1] * (mobile ? 0.22 : 0.18);
      grip.p
        .copy(vPos)
        .addScaledVector(ax, side * (size[0] / 2 + 0.075))
        .addScaledVector(ay, gripY)
        .addScaledVector(az, -0.055);
      grip.x.copy(ax).multiplyScalar(-side);
      grip.y.copy(az);
      grip.z.copy(ay);

      // -- blend the three
      const wf = side === 1 ? wF * (1 - wG) : 0;
      const wg = wG;
      const wr = 1 - Math.max(wf, wg);
      const total = wr + wf + wg;
      const wrist = out.wr[i];
      wrist.set(0, 0, 0).addScaledVector(rest.p, wr / total).addScaledVector(fing.p, wf / total).addScaledVector(grip.p, wg / total);
      t1.set(0, 0, 0).addScaledVector(rest.x, wr).addScaledVector(fing.x, wf).addScaledVector(grip.x, wg).normalize();
      t2.set(0, 0, 0).addScaledVector(rest.y, wr).addScaledVector(fing.y, wf).addScaledVector(grip.y, wg);
      t2.addScaledVector(t1, -t2.dot(t1)).normalize();
      t3.crossVectors(t1, t2);
      const zsign = t3.dot(dir.set(0, 0, 0).addScaledVector(rest.z, wr).addScaledVector(fing.z, wf).addScaledVector(grip.z, wg)) < 0 ? -1 : 1;
      t3.multiplyScalar(zsign);

      // keep the wrist within reach (a poster still out of reach is simply reached for)
      dir.copy(wrist).sub(s0);
      const maxR = L1 + L2 - 0.015;
      if (dir.length() > maxR) wrist.copy(s0).addScaledVector(dir.normalize(), maxR);

      out.hand[i].set(t1.x, t2.x, t3.x, t1.y, t2.y, t3.y, t1.z, t2.z, t3.z);
      const open = side === -1 ? wP * wr : 0;
      out.fing[i].set(lerp(lerp(lerp(0.32, 0.08, open), 0.95, wf), curl, wg), wf, lerp(lerp(lerp(0.25, 0.9, open), 0.1, wf), 1, wg));

      // two-bone IK; at rest the elbow bends back, in action out and down
      dir.copy(wrist).sub(s0);
      const d = clamp(dir.length(), Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.001);
      dir.normalize();
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
      const hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const act = Math.max(wf, wg, side === -1 ? wP : 0);
      pole.set(side * lerp(0.35, 0.8, act), lerp(-0.1, -1, act), lerp(-1, -0.3, act));
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      out.el[i].copy(s0).addScaledVector(dir, a).addScaledVector(pole, hh);
    }

    out.presenting = clamp(step);
    return out;
  }

  return { update, state: out };
}

import { Euler, Matrix3, Matrix4, Quaternion, Vector3 } from 'three';

/* The giant's "skeleton".
   Everything follows the sheet of paper: scroll decides where the sheet should
   be (parked below the screen → pulled up → held out to the viewer), springs
   carry it there with weight and a little overshoot, and the hands simply hold
   on to it. Arms are solved with two-bone IK, the torso leans into the reach,
   the head follows the sheet and then looks up at you. */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const PIVOT = new Vector3(0, -1.7, 0);
const SHOULDER = [new Vector3(-0.8, -0.74, 0), new Vector3(0.8, -0.74, 0)];
const L1 = 0.78; // upper arm
const L2 = 0.74; // forearm

/* A critically-damped-ish spring for one number. */
class Spring {
  constructor(v = 0, stiffness = 60, damping = 11) {
    this.x = v;
    this.v = 0;
    this.k = stiffness;
    this.c = damping;
  }
  step(target, dt) {
    // semi-implicit Euler, sub-stepped for stability
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * (this.x - target) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

function pose(pos, rot, lean, headPitch) {
  return { pos, rot, lean, headPitch };
}
function mixPose(a, b, t) {
  return {
    pos: a.pos.map((v, i) => lerp(v, b.pos[i], t)),
    rot: a.rot.map((v, i) => lerp(v, b.rot[i], t)),
    lean: lerp(a.lean, b.lean, t),
    headPitch: lerp(a.headPitch, b.headPitch, t),
  };
}

export function createRig({ mobile }) {
  // sheet size in world units (landscape on desktop, portrait on phones)
  const size = mobile ? [0.78, 1.3] : [1.72, 1.075];

  const P = mobile
    ? {
        idle: pose([0, -2.3, 0.45], [-0.75, 0, 0], 0.0, 0.0),
        park: pose([0, -2.3, 0.45], [-0.75, 0, 0], 0.3, 0.42),
        hold: pose([0, -0.78, 0.7], [-0.45, 0.12, 0.06], 0.06, 0.36),
        show: pose([0, -0.5, 1.35], [-0.1, -0.03, -0.012], -0.02, 0.06),
      }
    : {
        idle: pose([0, -2.15, 0.45], [-0.75, 0, 0], 0.0, 0.0),
        park: pose([0, -2.15, 0.45], [-0.75, 0, 0], 0.3, 0.42),
        hold: pose([0, -0.72, 0.68], [-0.45, 0.12, 0.06], 0.06, 0.36),
        show: pose([0.0, -0.55, 1.22], [-0.12, -0.04, -0.015], -0.02, 0.06),
      };

  /* scroll → where the sheet wants to be, for one "show a sheet" cycle (s: 0..1) */
  function cycle(s) {
    if (s < 0.1) return mixPose(P.idle, P.park, ease(s / 0.1)); // look down, lean in
    if (s < 0.4) return mixPose(P.park, P.hold, easeOut((s - 0.1) / 0.3)); // pull it up
    if (s < 0.48) return P.hold; // a beat: look at it
    if (s < 0.72) return mixPose(P.hold, P.show, easeInOut((s - 0.48) / 0.24)); // hold it out
    if (s < 0.9) return P.show;
    return mixPose(P.show, P.park, ease((s - 0.9) / 0.1)); // and down again
  }

  const sp = {
    x: new Spring(P.idle.pos[0], 46, 10.5),
    y: new Spring(P.idle.pos[1], 46, 10.5),
    z: new Spring(P.idle.pos[2], 46, 10.5),
    rx: new Spring(P.idle.rot[0], 38, 8.5),
    ry: new Spring(P.idle.rot[1], 38, 8.5),
    rz: new Spring(P.idle.rot[2], 30, 6.5),
    lean: new Spring(0, 30, 9),
    pitch: new Spring(0, 34, 9),
    yaw: new Spring(0, 34, 9),
    twist: new Spring(0, 24, 8),
    shrugL: new Spring(0, 40, 9),
    shrugR: new Spring(0, 40, 9),
  };

  const out = {
    size,
    shown: 0, // which sheet texture is on the paper
    sheetMatrix: new Matrix4(),
    sheetInverse: new Matrix4(),
    sh: [new Vector3(), new Vector3()],
    el: [new Vector3(), new Vector3()],
    wr: [new Vector3(), new Vector3()],
    hand: [new Matrix3(), new Matrix3()],
    lean: 0,
    twist: 0,
    head: [0, 0],
    breath: 0,
    curl: 0.25,
    sheetVisible: 0,
    presenting: 0,
  };

  const q = new Quaternion();
  const e = new Euler();
  const vPos = new Vector3();
  const one = new Vector3(1, 1, 1);
  const ax = new Vector3(),
    ay = new Vector3(),
    az = new Vector3();
  const tmp = new Vector3(),
    tmp2 = new Vector3(),
    dir = new Vector3(),
    pole = new Vector3();
  let lastY = P.idle.pos[1];

  /**
   * @param want  index of the sheet that should be up (−1 = none)
   * @param s     progress of its cycle, 0..1
   * @param pointer {x,y} −1..1
   */
  function update(dt, time, want, s, pointer, lift = 0) {
    // If another sheet is on the paper, it first has to go down and be swapped below the screen.
    let target;
    const below = sp.y.x < P.park.pos[1] + 0.22;
    if (want < 0) target = P.idle;
    else if (want !== out.shown) {
      if (below) {
        out.shown = want;
        target = cycle(s);
      } else target = P.park;
    } else target = cycle(s);

    const x = sp.x.step(target.pos[0], dt);
    // `lift` raises the held-out sheet (used for the contact card, so the button fits below it)
    const held = clamp((target.pos[2] - P.hold.pos[2]) / (P.show.pos[2] - P.hold.pos[2]));
    const y = sp.y.step(target.pos[1] + lift * held, dt);
    const z = sp.z.step(target.pos[2], dt);
    const vy = (y - lastY) / Math.max(dt, 1e-3);
    lastY = y;
    // the paper lags behind the hands: it tips back while rising, forward while dropping
    const rx = sp.rx.step(target.rot[0] - clamp(vy * 0.06, -0.25, 0.25), dt);
    const ry = sp.ry.step(target.rot[1] + pointer.x * 0.05, dt);
    const rz = sp.rz.step(target.rot[2] + Math.sin(time * 0.9) * 0.008, dt);

    e.set(rx, ry, rz, 'YXZ');
    q.setFromEuler(e);
    vPos.set(x, y + Math.sin(time * 1.1) * 0.006, z);
    out.sheetMatrix.compose(vPos, q, one);
    out.sheetInverse.copy(out.sheetMatrix).invert();
    ax.set(1, 0, 0).applyQuaternion(q);
    ay.set(0, 1, 0).applyQuaternion(q);
    az.set(0, 0, 1).applyQuaternion(q);

    // body
    const lean = sp.lean.step(target.lean, dt);
    const twist = sp.twist.step(pointer.x * 0.05 + ry * 0.4, dt);
    out.lean = lean;
    out.twist = twist;
    out.breath = Math.sin(time * 1.25);
    // head: watches the sheet while it comes up, then looks at you (and follows the pointer a little)
    out.head[0] = sp.yaw.step(pointer.x * 0.32 * (1 - clamp(target.headPitch * 2)), dt);
    out.head[1] = sp.pitch.step(target.headPitch - pointer.y * 0.12, dt);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      // shoulder: rest position carried by lean/twist, lifted a little when the hand is high
      const wantShrug = clamp((y + 0.9) * 0.09, 0, 0.09);
      const shrug = (i === 0 ? sp.shrugL : sp.shrugR).step(wantShrug, dt);
      const s0 = out.sh[i].copy(SHOULDER[i]);
      s0.y += shrug + out.breath * 0.006;
      s0.sub(PIVOT);
      // inverse of the shader's toBody(): undo twist, then lean
      const ct = Math.cos(-twist),
        st = Math.sin(-twist);
      const X = s0.x * ct + s0.z * st;
      let Z = -s0.x * st + s0.z * ct;
      const cl = Math.cos(-lean),
        sl = Math.sin(-lean);
      const Y = s0.y * cl + Z * sl;
      Z = -s0.y * sl + Z * cl;
      s0.set(X, Y, Z).add(PIVOT);

      // hand: grips the side edge of the sheet, palm behind the paper, thumb in front
      const gripY = -size[1] * (mobile ? 0.2 : 0.16);
      const wr = out.wr[i];
      wr.copy(vPos)
        .addScaledVector(ax, side * (size[0] / 2 + 0.085))
        .addScaledVector(ay, gripY)
        .addScaledVector(az, -0.045);
      // keep the wrist within reach
      tmp.copy(wr).sub(s0);
      const maxR = L1 + L2 - 0.02;
      if (tmp.length() > maxR) wr.copy(s0).addScaledVector(tmp.normalize(), maxR);

      // hand basis: fingers point inward along the sheet, palm faces the sheet's front, thumb side = sheet up
      const m = out.hand[i];
      tmp.copy(ax).multiplyScalar(-side); // fingers
      m.set(tmp.x, az.x, ay.x, tmp.y, az.y, ay.y, tmp.z, az.z, ay.z);

      // two-bone IK, elbows out and down (more "out" when the hands are high and close)
      dir.copy(wr).sub(s0);
      const d = clamp(dir.length(), Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.001);
      dir.normalize();
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      pole.set(side * 0.75, -1, -0.35);
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      out.el[i].copy(s0).addScaledVector(dir, a).addScaledVector(pole, h);
    }

    // fingers relax when the sheet is parked, tighten while carrying it
    out.curl = 0.16 + clamp(Math.abs(vy) * 0.25, 0, 0.3);
    out.sheetVisible = clamp((y - (P.park.pos[1] + 0.05)) / 0.25);
    out.presenting = clamp((z - P.hold.pos[2]) / (P.show.pos[2] - P.hold.pos[2]));
    return out;
  }

  return { update, state: out, poses: P };
}

import { BoxGeometry, CylinderGeometry, Matrix4, Mesh, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

/* The avatar, drawn with ordinary (cheap) geometry:
   • head, neck and torso are the user's cut-out photo, inflated into a soft relief
     – so outline and proportions are exactly his;
   • arms are tapered tubes wearing the fabric of his real shirt sleeve;
   • hands are small jointed pieces.
   Every fragment writes: R = brightness, G/B = 16-bit distance to the camera, A = 1. */

const PIVOT = new Vector3(0, -1.9, 0);
const HAND = 1.14;

const COMMON = /* glsl */ `
  uniform float uMaxT;
  uniform sampler2D tPhoto;
  varying vec3 vWorld;
  varying vec3 vN;
  vec4 pack(float lum) {
    float dn = clamp(length(vWorld - cameraPosition) / uMaxT, 0., 1.) * 65535.;
    float hi = floor(dn / 256.);
    return vec4(clamp(lum, 0., 1.), hi / 255., (dn - hi * 256.) / 255., 1.);
  }
  float shade() {
    vec3 n = normalize(vN);
    float dif = max(dot(n, normalize(vec3(-.45, .6, .66))), 0.);
    float rim = max(dot(n, normalize(vec3(.8, .2, -.56))), 0.);
    return clamp(.25 + dif * .75 + rim * .3, 0., 1.);
  }
  // the fabric of the real sleeve: a strip of the photo, wrapped round the arm
  float sleeve(float around, float along) {
    float u = abs(fract(around) * 2. - 1.);
    vec2 px = vec2(mix(36., 118., u), mix(575., 985., clamp(along, 0., 1.)));
    return texture2D(tPhoto, vec2(px.x / 577., 1. - px.y / 1024.)).r;
  }
`;

/* photo pixel ↔ figure units (x right, y up, face centred on x = 0, eyes at y = 0.345) */
const PHOTO_UV = /* glsl */ `
  vec2 photoUv(vec2 xy) {
    return vec2((300. + xy.x * 268.) / 577., 1. - (262. + (.345 - xy.y) * 268.) / 1024.);
  }
`;

export function createFigure({ photoTex, bodyTex, maxT }) {
  const scene = new Scene();
  const shared = { uMaxT: { value: maxT }, tPhoto: { value: photoTex } };

  // ------------------------------------------------------------------ body relief
  const top = 0.345 + 262 / 268; // top edge of the photo in figure units
  const bottom = -6; // continues below the picture (trousers)
  const w = 577 / 268;
  const bodyGeo = new PlaneGeometry(w, top - bottom, 120, 300);
  bodyGeo.translate((288.5 - 300) / 268, (top + bottom) / 2, 0);
  const bodyU = {
    ...shared,
    tBody: { value: bodyTex },
    uBody: { value: new Vector3() },
    uLean: { value: 0 },
    uTwist: { value: 0 },
    uHead: { value: [0, 0] },
    uBreath: { value: 0 },
  };
  const bodyMat = new ShaderMaterial({
    uniforms: bodyU,
    vertexShader: /* glsl */ `
      uniform sampler2D tBody;
      uniform vec3 uBody;
      uniform float uLean;
      uniform float uTwist;
      uniform vec2 uHead;
      uniform float uBreath;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec2 vXY;
      ${PHOTO_UV}
      const vec3 PIVOT = vec3(0., -1.9, 0.);
      const vec3 NECK = vec3(0., -.2, 0.);
      mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      float relief(vec2 xy) {
        float sd = (texture2D(tBody, clamp(photoUv(xy), vec2(.002), vec2(.998))).r - .5) * .8;
        float full = mix(.2, .3, smoothstep(-.3, .1, xy.y));
        return full * smoothstep(0., .34, sd);
      }
      // body space → world: head turns and nods above the collar, then twist, lean, step
      vec3 place(vec3 q) {
        float wgt = smoothstep(-.34, -.1, q.y);
        vec3 h = q - NECK;
        h.yz = rot(uHead.y * wgt) * h.yz;
        h.xz = rot(-uHead.x * wgt) * h.xz;
        q = h + NECK - PIVOT;
        q.xz = rot(-uTwist) * q.xz;
        q.yz = rot(-uLean) * q.yz;
        return q + PIVOT + uBody;
      }
      void main() {
        vec2 xy = position.xy;
        vXY = xy;
        vec3 p = vec3(xy, relief(xy));
        p.y += uBreath * .008 * smoothstep(-2., -.7, xy.y) * step(xy.y, -.4);
        // normal from neighbouring relief heights
        float e = .02;
        float dx = relief(xy + vec2(e, 0.)) - relief(xy - vec2(e, 0.));
        float dy = relief(xy + vec2(0., e)) - relief(xy - vec2(0., e));
        vec3 n = normalize(vec3(-dx, -dy, 2. * e));
        vec3 wp = place(p);
        vec3 wn = place(p + n * .01) - wp;
        vWorld = wp;
        vN = normalize(wn);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tBody;
      varying vec2 vXY;
      ${COMMON}
      ${PHOTO_UV}
      void main() {
        vec2 uv = photoUv(vXY);
        if (uv.x < 0. || uv.x > 1. || uv.y > 1.) discard;
        float sd = texture2D(tBody, clamp(uv, vec2(.002), vec2(.998))).r - .5;
        if (sd < 0.) discard;
        float lum;
        if (vXY.y < -2.46) lum = .03 + shade() * .04;                   // trousers
        else lum = texture2D(tPhoto, uv).r * mix(.6, 1., smoothstep(0., .1, sd)) * (.92 + .1 * shade());
        gl_FragColor = pack(lum);
      }
    `,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.frustumCulled = false;
  scene.add(body);

  // ------------------------------------------------------------------ limbs (tapered tubes between two points)
  const tubeGeo = new CylinderGeometry(1, 1, 1, 20, 6, true);
  const ballGeo = new SphereGeometry(1, 16, 12);
  const LIMB_VERT = /* glsl */ `
    uniform vec3 uA;
    uniform vec3 uB;
    uniform float uR0;
    uniform float uR1;
    varying vec3 vWorld;
    varying vec3 vN;
    varying vec2 vAA;   // around, along
    void main() {
      float t = position.y + .5;
      vec3 ax = normalize(uB - uA + vec3(1e-5));
      vec3 u = normalize(cross(ax, vec3(.31, .2, .93)));
      vec3 v = cross(ax, u);
      vec3 radial = u * position.x + v * position.z;
      vWorld = mix(uA, uB, t) + radial * mix(uR0, uR1, t);
      vN = normalize(radial);
      vAA = vec2(atan(position.z, position.x) / 6.2832 + .5, t);
      gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
    }
  `;
  const BALL_VERT = /* glsl */ `
    uniform vec3 uA;
    uniform float uR0;
    varying vec3 vWorld;
    varying vec3 vN;
    varying vec2 vAA;
    void main() {
      vWorld = uA + position * uR0;
      vN = normalize(position);
      vAA = vec2(atan(position.z, position.x) / 6.2832 + .5, .5 - position.y * .5);
      gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
    }
  `;
  const LIMB_FRAG = /* glsl */ `
    precision highp float;
    uniform float uSkin;     // 1 = skin, 0 = sleeve
    uniform vec2 uAlong;     // which stretch of the sleeve strip this piece shows
    varying vec2 vAA;
    ${COMMON}
    void main() {
      float s = shade();
      float cloth = sleeve(vAA.x, mix(uAlong.x, uAlong.y, vAA.y)) * (.8 + .65 * s);
      gl_FragColor = pack(mix(cloth, .14 + s * .42, uSkin));
    }
  `;
  function piece(geo, vert, { r0, r1 = r0, skin = 0, along = [0, 1] }) {
    const uniforms = { ...shared, uA: { value: new Vector3() }, uB: { value: new Vector3() }, uR0: { value: r0 }, uR1: { value: r1 }, uSkin: { value: skin }, uAlong: { value: along } };
    const m = new Mesh(geo, new ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: LIMB_FRAG }));
    m.frustumCulled = false;
    scene.add(m);
    return uniforms;
  }
  const tube = (o) => piece(tubeGeo, LIMB_VERT, o);
  const ball = (o) => piece(ballGeo, BALL_VERT, o);

  // palm: a rounded slab that follows the hand's frame
  const palmGeo = new BoxGeometry(0.2 * HAND, 0.062 * HAND, 0.166 * HAND, 1, 1, 1);
  const palmMat = () =>
    new ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying vec3 vN;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.);
          vWorld = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        ${COMMON}
        void main() { gl_FragColor = pack(.14 + shade() * .42); }
      `,
    });

  const arms = [0, 1].map(() => {
    const a = {
      shoulder: ball({ r0: 0.19, along: [0.02, 0.14] }),
      upper: tube({ r0: 0.2, r1: 0.165, along: [0.04, 0.5] }),
      elbow: ball({ r0: 0.165, along: [0.46, 0.54] }),
      fore: tube({ r0: 0.16, r1: 0.105, along: [0.5, 0.96] }),
      cuff: tube({ r0: 0.112, r1: 0.112, along: [0.94, 1] }),
      wrist: ball({ r0: 0.068 * HAND, skin: 1 }),
      palm: new Mesh(palmGeo, palmMat()),
      fingers: [],
      thumb: [],
    };
    a.palm.matrixAutoUpdate = false;
    a.palm.frustumCulled = false;
    scene.add(a.palm);
    for (let k = 0; k < 4; k++) {
      a.fingers.push({
        s1: tube({ r0: 0.0235 * HAND, r1: 0.0215 * HAND, skin: 1 }),
        j: ball({ r0: 0.0218 * HAND, skin: 1 }),
        s2: tube({ r0: 0.0212 * HAND, r1: 0.0195 * HAND, skin: 1 }),
        tip: ball({ r0: 0.0197 * HAND, skin: 1 }),
        base: ball({ r0: 0.0238 * HAND, skin: 1 }),
      });
    }
    a.thumb = {
      s1: tube({ r0: 0.031 * HAND, r1: 0.028 * HAND, skin: 1 }),
      j: ball({ r0: 0.0283 * HAND, skin: 1 }),
      s2: tube({ r0: 0.027 * HAND, r1: 0.024 * HAND, skin: 1 }),
      tip: ball({ r0: 0.0243 * HAND, skin: 1 }),
    };
    return a;
  });

  const X = new Vector3(),
    Y = new Vector3(),
    Z = new Vector3(),
    t = new Vector3(),
    m4 = new Matrix4();
  // hand-space point → world
  const hp = (out, wr, x, y, z) => out.copy(wr).addScaledVector(X, x * HAND).addScaledVector(Y, y * HAND).addScaledVector(Z, z * HAND);

  function update(r) {
    bodyU.uBody.value.copy(r.body);
    bodyU.uLean.value = r.lean;
    bodyU.uTwist.value = r.twist;
    bodyU.uHead.value = r.head;
    bodyU.uBreath.value = r.breath;

    for (let i = 0; i < 2; i++) {
      const a = arms[i];
      const sh = r.sh[i],
        el = r.el[i],
        wr = r.wr[i];
      a.shoulder.uA.value.copy(sh);
      a.upper.uA.value.copy(sh);
      a.upper.uB.value.copy(el);
      a.elbow.uA.value.copy(el);
      a.fore.uA.value.copy(el);
      a.fore.uB.value.copy(wr);
      t.copy(wr).sub(el).normalize();
      a.cuff.uA.value.copy(wr).addScaledVector(t, -0.1);
      a.cuff.uB.value.copy(wr).addScaledVector(t, -0.02);
      a.wrist.uA.value.copy(wr);

      const e = r.hand[i].elements; // columns: fingers, palm normal, thumb side
      X.set(e[0], e[1], e[2]);
      Y.set(e[3], e[4], e[5]);
      Z.set(e[6], e[7], e[8]);
      hp(t, wr, 0.1, 0, 0);
      m4.makeBasis(X, Y, Z).setPosition(t);
      a.palm.matrix.copy(m4);
      a.palm.matrixWorldNeedsUpdate = true;

      const f = r.fing[i];
      for (let k = 0; k < 4; k++) {
        const z = 0.062 - k * 0.041;
        const len = k === 0 || k === 3 ? 0.9 : 1;
        const c = f.x * (k === 0 ? 1 - f.y : 1);
        const c1 = c,
          c2 = c * 1.35;
        const g = a.fingers[k];
        const ax = 0.19,
          bx = ax + Math.cos(c1) * 0.135 * len,
          by = Math.sin(c1) * 0.135 * len;
        const ex = bx + Math.cos(c1 + c2) * 0.11 * len,
          ey = by + Math.sin(c1 + c2) * 0.11 * len;
        hp(g.base.uA.value, wr, ax, 0, z);
        hp(g.s1.uA.value, wr, ax, 0, z);
        hp(g.s1.uB.value, wr, bx, by, z);
        hp(g.j.uA.value, wr, bx, by, z);
        hp(g.s2.uA.value, wr, bx, by, z);
        hp(g.s2.uB.value, wr, ex, ey, z);
        hp(g.tip.uA.value, wr, ex, ey, z);
      }
      const ts = f.z;
      const t1 = [0.1, 0.03 + 0.05 * ts, 0.125 + 0.02 * ts];
      const t2 = [t1[0] + 0.09, t1[1] + 0.03 * ts, t1[2] - 0.03 * (1 - ts)];
      hp(a.thumb.s1.uA.value, wr, 0.03, 0.005, 0.07);
      hp(a.thumb.s1.uB.value, wr, ...t1);
      hp(a.thumb.j.uA.value, wr, ...t1);
      hp(a.thumb.s2.uA.value, wr, ...t1);
      hp(a.thumb.s2.uB.value, wr, ...t2);
      hp(a.thumb.tip.uA.value, wr, ...t2);
    }
  }

  return { scene, update };
}

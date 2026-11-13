/* The avatar: a ray-marched figure whose head and torso carry the user's
   photo (projected from the front), with a procedural afro, striped shirt
   sleeves and articulated hands. Rendered to a small target:
   R = brightness, G/B = 16-bit depth along the ray, A = hit. */

export const CAMERA_GLSL = /* glsl */ `
  uniform vec3 uCamPos;
  uniform mat3 uCamMat;   // columns: right, up, forward
  uniform float uTanFov;
  uniform float uAspect;
  vec3 rayDir(vec2 ndc) {
    return normalize(uCamMat[2] + ndc.x * uAspect * uTanFov * uCamMat[0] + ndc.y * uTanFov * uCamMat[1]);
  }
`;

export const FIGURE_FRAG = /* glsl */ `
  precision highp float;
  ${CAMERA_GLSL}
  uniform vec2 uRes;
  uniform vec3 uSh[2];
  uniform vec3 uEl[2];
  uniform vec3 uWr[2];
  uniform mat3 uHand[2];   // columns: fingers, palm normal, thumb side
  uniform vec3 uFing[2];   // x: curl of all fingers, y: index finger stays straight, z: thumb spread
  uniform vec3 uBody;      // whole body offset (a step toward the viewer)
  uniform float uLean;
  uniform float uTwist;
  uniform vec2 uHead;      // yaw, pitch
  uniform float uBreath;
  uniform float uMaxT;
  uniform sampler2D tPhoto;
  uniform float uPhotoOn;

  const vec3 PIVOT = vec3(0., -1.9, 0.);
  const vec3 NECK = vec3(0., -.06, -.02);

  float smin(float a, float b, float k) {
    float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
    return mix(b, a, h) - k * h * (1. - h);
  }
  float smax(float a, float b, float k) { return -smin(-a, -b, k); }
  float sdEll(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.) / k1;
  }
  float sdCap(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    return length(pa - ba * h) - r;
  }
  float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    return length(pa - ba * h) - mix(r1, r2, h);
  }
  float sdBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b + r;
    return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r;
  }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  // world → body space (step, lean forward around the hips, slight twist)
  vec3 toBody(vec3 p) {
    vec3 q = p - uBody - PIVOT;
    q.yz = rot(uLean) * q.yz;
    q.xz = rot(uTwist) * q.xz;
    return q + PIVOT;
  }
  vec3 toHead(vec3 q) {
    vec3 h = q - NECK;
    h.xz = rot(uHead.x) * h.xz;
    h.yz = rot(-uHead.y) * h.yz;
    return h + NECK;
  }

  // ---- head
  float sdHair(vec3 h) {
    float d = sdEll(h - vec3(0., .5, -.1), vec3(.56, .47, .5));
    d += .016 * sin(h.x * 37.) * sin(h.y * 41.) * sin(h.z * 35.);
    d = smax(d, -sdEll(h - vec3(0., .2, .52), vec3(.33, .52, .55)), .07);
    return d;
  }
  float sdSkull(vec3 h) {
    float d = sdEll(h - vec3(0., .36, -.02), vec3(.33, .43, .39));
    d = smin(d, sdEll(h - vec3(0., .06, .06), vec3(.23, .26, .27)), .16);    // jaw
    d = smin(d, sdEll(h - vec3(0., -.07, .15), vec3(.11, .1, .12)), .08);    // chin
    d = smin(d, sdEll(h - vec3(0., .25, .36), vec3(.055, .11, .075)), .05);  // nose
    d = smin(d, sdEll(h - vec3(0., .43, .28), vec3(.25, .045, .08)), .06);   // brow
    vec3 m = vec3(abs(h.x), h.y, h.z);
    d = smax(d, -sdEll(m - vec3(.125, .345, .37), vec3(.08, .038, .07)), .05);
    d = smin(d, sdEll(m - vec3(.16, .21, .23), vec3(.085, .07, .08)), .07);
    d = smin(d, sdEll(m - vec3(.335, .29, -.02), vec3(.035, .09, .06)), .03); // ears
    return d;
  }
  float sdHead(vec3 q) {
    vec3 h = toHead(q);
    float bound = length(h - vec3(0., .42, -.03)) - .74;
    if (bound > .25) return bound;
    return min(sdSkull(h), sdHair(h));
  }

  // ---- torso in a loose shirt
  float sdTorso(vec3 q) {
    q.y -= uBreath * .01 * smoothstep(-1.8, -.6, q.y);
    float d = sdEll(q - vec3(0., -.98, .0), vec3(.57, .5, .27));
    d = smin(d, sdEll(q - vec3(0., -1.9, 0.), vec3(.5, 1.05, .25)), .28);
    d = smin(d, sdCap(q, vec3(0., -2.4, 0.), vec3(0., -6., 0.), .44), .2);
    d = smin(d, sdEll(q - vec3(0., -.58, .0), vec3(.62, .2, .2)), .16);        // shoulders' slope
    d = smin(d, sdCap(q, vec3(0., -.5, .01), vec3(0., .0, -.01), .135), .06); // neck
    return d;
  }

  // ---- hand: palm, four two-segment fingers, thumb
  float sdHand(vec3 p, int i) {
    vec3 w = p - uWr[i];
    float bound = length(w) - .5;
    if (bound > .2) return bound;
    vec3 h = w * uHand[i];
    float d = sdBox(h - vec3(.1, 0., 0.), vec3(.1, .03, .082), .03);
    d = smin(d, length(h - vec3(.0, 0., 0.)) - .062, .04);                    // wrist
    for (int k = 0; k < 4; k++) {
      float z = .062 - float(k) * .041;                                       // k = 0: index
      float len = k == 0 || k == 3 ? .9 : 1.;
      float c = uFing[i].x * (k == 0 ? 1. - uFing[i].y : 1.);
      float c1 = c * 1.0, c2 = c * 1.35;
      vec3 a = vec3(.19, 0., z);
      vec3 b = a + vec3(cos(c1), sin(c1), 0.) * .135 * len;
      vec3 e = b + vec3(cos(c1 + c2), sin(c1 + c2), 0.) * .11 * len;
      d = smin(d, sdCap(h, a, b, .0225), .012);
      d = min(d, sdCap(h, b, e, .0205));
    }
    // thumb: opposes the fingers on the palm side
    float ts = uFing[i].z;
    vec3 t0 = vec3(.03, .005, .07);
    vec3 t1 = vec3(.1, .03 + .05 * ts, .125 + .02 * ts);
    vec3 t2 = t1 + vec3(.09, .03 * ts, -.03 * (1. - ts));
    d = smin(d, sdCap(h, t0, t1, .03), .02);
    d = min(d, sdCap(h, t1, t2, .026));
    return d;
  }

  float sdArm(vec3 p, int i) {
    // sleeve: upper arm blends softly into the forearm at the elbow
    float d = sdCone(p, uSh[i], uEl[i], .138, .112);
    d = smin(d, sdCone(p, uEl[i], uWr[i], .115, .078), .05);
    // cuff
    vec3 ax = normalize(uWr[i] - uEl[i]);
    d = smin(d, sdCap(p, uWr[i] - ax * .07, uWr[i] - ax * .02, .086), .015);
    return d;
  }

  float map(vec3 p) {
    vec3 q = toBody(p);
    float d = sdTorso(q);
    d = smin(d, sdHead(q), .04);
    for (int i = 0; i < 2; i++) {
      d = smin(d, sdArm(p, i), .14);
      d = min(d, sdHand(p, i));
    }
    return d;
  }

  vec3 normalAt(vec3 p) {
    const vec2 e = vec2(1., -1.) * .004;
    return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
  }

  // the photo, addressed in figure units (x right, y up, face centred on x = 0)
  float photo(vec2 xy) {
    vec2 uv = vec2((300. + xy.x * 268.) / 577., 1. - (262. + (.345 - xy.y) * 268.) / 1024.);
    return texture2D(tPhoto, clamp(uv, 0., 1.)).r;
  }

  // light / dark stripes of the shirt, running along a limb
  float stripes(float a, float n) {
    float f = abs(fract(a * n) - .5);
    return smoothstep(.12, .2, f);
  }

  void main() {
    vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1.;
    vec3 rd = rayDir(ndc);
    float t = .5;
    bool hit = false;
    for (int i = 0; i < 72; i++) {
      float d = map(uCamPos + rd * t);
      if (d < .0035) { hit = true; break; }
      t += d * .92;
      if (t > uMaxT) break;
    }
    if (!hit) { gl_FragColor = vec4(0.); return; }
    vec3 p = uCamPos + rd * t;
    vec3 n = normalAt(p);
    float dif = max(dot(n, normalize(vec3(-.45, .6, .66))), 0.);
    float rim = max(dot(n, normalize(vec3(.8, .2, -.56))), 0.);
    float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
    float ao = clamp(map(p + n * .1) / .1, 0., 1.);
    float shade = clamp((.1 + dif * .8 + rim * .5 + fres * .25) * mix(.5, 1., ao), 0., 1.);

    vec3 q = toBody(p);
    vec3 h = toHead(q);
    float dHands = min(sdHand(p, 0), sdHand(p, 1));
    float dArms = min(sdArm(p, 0), sdArm(p, 1));
    float dBody = min(sdTorso(q), sdHead(q));
    float lum;

    if (dHands < .012 && dHands <= dArms) {
      lum = shade * .5;                                               // hands: skin
    } else if (dArms < dBody) {
      // sleeves: stripes run along the arm
      int i = sdArm(p, 0) < sdArm(p, 1) ? 0 : 1;
      vec3 a = uSh[i], b = uEl[i];
      if (sdCone(p, uEl[i], uWr[i], .115, .078) < sdCone(p, uSh[i], uEl[i], .138, .112)) { a = uEl[i]; b = uWr[i]; }
      vec3 ax = normalize(b - a);
      vec3 u = normalize(cross(ax, vec3(.31, .2, .93)));
      vec3 v = cross(ax, u);
      vec3 r = p - a;
      float ang = atan(dot(r, v), dot(r, u)) / 6.2832;
      lum = mix(.16, .8, stripes(ang, 15.)) * (.35 + .75 * shade);
    } else if (q.y > -.2 && sdHair(h) < sdSkull(h) + .004) {
      lum = .02 + shade * .09;                                        // afro
    } else if (q.y > -.3) {
      // face and neck: the photo, straight on
      float front = smoothstep(.0, .14, h.z) * smoothstep(.36, .29, abs(h.x));
      lum = mix(shade * .4, photo(h.xy) * (.8 + .25 * dif), front * uPhotoOn);
    } else {
      // torso: photo on the front, procedural stripes on the sides and back
      float front = smoothstep(-.02, .08, n.z) * smoothstep(-2.5, -2.3, q.y) * smoothstep(.62, .5, abs(q.x));
      float side = mix(.16, .78, stripes(q.x * 1.1 + q.z * .6, 8.)) * (.35 + .75 * shade);
      lum = mix(side, photo(q.xy) * (.82 + .22 * dif), front * uPhotoOn);
      lum = mix(.03 + shade * .05, lum, smoothstep(-2.62, -2.42, q.y));   // trousers
    }

    float dn = clamp(t / uMaxT, 0., 1.) * 65535.;
    float hi = floor(dn / 256.);
    gl_FragColor = vec4(clamp(lum, 0., 1.), hi / 255., (dn - hi * 256.) / 255., 1.);
  }
`;

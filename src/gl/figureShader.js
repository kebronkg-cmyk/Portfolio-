/* The giant: a ray-marched figure (head, torso, jointed arms, hands) rendered
   at very low resolution. One low-res pixel later becomes one halftone square.
   Output: R = brightness, G/B = 16-bit depth along the ray, A = hit. */

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
  uniform float uLean;
  uniform float uTwist;
  uniform vec2 uHead;      // yaw, pitch
  uniform float uBreath;
  uniform float uCurl;
  uniform float uMaxT;

  const vec3 PIVOT = vec3(0., -1.7, 0.);
  const vec3 NECK = vec3(0., -.05, -.02);

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
  // capsule whose radius runs from r1 (at a) to r2 (at b)
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

  // world → body space (lean forward around the hips, slight twist)
  vec3 toBody(vec3 p) {
    vec3 q = p - PIVOT;
    q.yz = rot(uLean) * q.yz;
    q.xz = rot(uTwist) * q.xz;
    return q + PIVOT;
  }

  float sdHead(vec3 q) {
    vec3 h = q - NECK;
    h.xz = rot(uHead.x) * h.xz;
    h.yz = rot(-uHead.y) * h.yz;
    h += NECK;
    float bound = length(h - vec3(0., .36, 0.)) - .62;
    if (bound > .25) return bound;
    float d = sdEll(h - vec3(0., .36, -.02), vec3(.36, .44, .40));
    d = smin(d, sdEll(h - vec3(0., .48, -.10), vec3(.38, .38, .42)), .08);
    d = smin(d, sdEll(h - vec3(0., .08, .07), vec3(.25, .24, .28)), .16);
    d = smin(d, sdEll(h - vec3(0., .00, .17), vec3(.11, .08, .12)), .08);
    d = smin(d, sdEll(h - vec3(0., .26, .37), vec3(.055, .11, .08)), .05);   // nose
    d = smin(d, sdEll(h - vec3(0., .42, .29), vec3(.27, .05, .08)), .06);    // brow
    vec3 m = vec3(abs(h.x), h.y, h.z);
    d = smax(d, -sdEll(m - vec3(.13, .335, .37), vec3(.085, .05, .08)), .05); // eye sockets
    d = smin(d, length(m - vec3(.13, .335, .285)) - .045, .02);
    d = smin(d, sdEll(m - vec3(.17, .22, .23), vec3(.09, .07, .08)), .07);    // cheekbones
    d = smin(d, sdEll(m - vec3(.355, .30, -.02), vec3(.04, .10, .07)), .03);  // ears
    d = smin(d, sdEll(h - vec3(0., .10, .31), vec3(.10, .025, .05)), .03);
    d = smin(d, sdEll(h - vec3(0., .055, .30), vec3(.085, .022, .05)), .03);
    d = smax(d, -sdEll(h - vec3(0., .078, .35), vec3(.09, .006, .05)), .01);
    return d;
  }

  float sdHand(vec3 p, int i) {
    vec3 w = p - uWr[i];
    float bound = length(w) - .5;
    if (bound > .2) return bound;
    vec3 h = w * uHand[i];             // into hand space (basis is orthonormal)
    float d = sdBox(h - vec3(.105, 0., 0.), vec3(.105, .034, .088), .03);       // palm
    float c1 = uCurl * .9, c2 = uCurl * 1.3;
    vec3 d1 = vec3(cos(c1), -sin(c1), 0.) * .14;
    vec3 d2 = vec3(cos(c1 + c2), -sin(c1 + c2), 0.) * .115;
    for (int k = 0; k < 4; k++) {
      float z = -.066 + float(k) * .044;
      float len = k == 0 || k == 3 ? .88 : 1.;
      vec3 a = vec3(.2, 0., z);
      vec3 b = a + d1 * len;
      d = min(d, sdCap(h, a, b, .024));
      d = min(d, sdCap(h, b, b + d2 * len, .022));
    }
    // thumb reaches around to the front (the side the palm faces)
    vec3 t0 = vec3(.035, .0, .075);
    vec3 t1 = vec3(.11, .075, .135);
    vec3 t2 = vec3(.2, .085, .11);
    d = min(d, sdCap(h, t0, t1, .032));
    d = min(d, sdCap(h, t1, t2, .028));
    return d;
  }

  float map(vec3 p) {
    vec3 q = toBody(p);
    q.y -= uBreath * .012 * smoothstep(-1.6, -.6, q.y);
    // torso
    float d = sdEll(q - vec3(0., -.95, .02), vec3(.78, .47, .33));
    d = smin(d, sdEll(q - vec3(0., -1.75, 0.), vec3(.56, .95, .3)), .25);
    d = smin(d, sdEll(q - vec3(0., -.6, .01), vec3(.42, .17, .2)), .2);
    // chest plate seam: a shallow groove makes it read as built, not grown
    d = smax(d, -(abs(q.y + 1.22 - abs(q.x) * .12) - .012), .02);
    // neck with two rings
    float neck = sdCap(q, vec3(0., -.52, .02), vec3(0., .02, -.01), .165);
    neck += .012 * smoothstep(.02, .0, abs(fract(q.y * 9. + .3) - .5) - .22);
    d = smin(d, neck, .06);
    d = smin(d, sdHead(q), .05);

    // arms (world space joints)
    for (int i = 0; i < 2; i++) {
      d = min(d, length(p - uSh[i]) - .215);                         // shoulder joint
      d = min(d, sdCone(p, uSh[i], uEl[i], .165, .125));
      d = min(d, length(p - uEl[i]) - .14);                          // elbow joint
      d = min(d, sdCone(p, uEl[i], uWr[i], .12, .078));
      d = min(d, length(p - uWr[i]) - .088);                         // wrist joint
      d = min(d, sdHand(p, i));
    }
    return d;
  }

  vec3 normalAt(vec3 p) {
    const vec2 e = vec2(1., -1.) * .004;
    return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
  }

  void main() {
    vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1.;
    vec3 rd = rayDir(ndc);
    float t = .6;
    bool hit = false;
    for (int i = 0; i < 64; i++) {
      float d = map(uCamPos + rd * t);
      if (d < .004) { hit = true; break; }
      t += d * .92;
      if (t > uMaxT) break;
    }
    if (!hit) { gl_FragColor = vec4(0.); return; }
    vec3 p = uCamPos + rd * t;
    vec3 n = normalAt(p);
    float dif = max(dot(n, normalize(vec3(-.5, .62, .6))), 0.);
    float rim = max(dot(n, normalize(vec3(.75, .15, -.65))), 0.);
    float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
    float ao = clamp(map(p + n * .12) / .12, 0., 1.);
    float lum = clamp((.07 + dif * .86 + rim * .42 + fres * .2) * mix(.45, 1., ao), 0., 1.);
    float dn = clamp(t / uMaxT, 0., 1.) * 65535.;
    float hi = floor(dn / 256.);
    gl_FragColor = vec4(lum, hi / 255., (dn - hi * 256.) / 255., 1.);
  }
`;

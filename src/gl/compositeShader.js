const CAMERA_GLSL = /* glsl */ `
  uniform vec3 uCamPos;
  uniform mat3 uCamMat;   // columns: right, up, forward
  uniform float uTanFov;
  uniform float uAspect;
  vec3 rayDir(vec2 ndc) {
    return normalize(uCamMat[2] + ndc.x * uAspect * uTanFov * uCamMat[0] + ndc.y * uTanFov * uCamMat[1]);
  }
`;

/* Full-resolution picture: the wall behind the avatar (a quadtree of nested
   rectangles that also spells the big words; or flowing pink marble), the
   avatar printed in phosphor scanlines, and the poster in his hands.
   Writes real depth so the particle swarm can pass in front of and behind it. */
export const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  ${CAMERA_GLSL}
  uniform sampler2D tFig;
  uniform sampler2D tSheet;
  uniform sampler2D tWords;
  uniform vec2 uRes;
  uniform vec2 uFigRes;
  uniform float uPitch;       // scanline pitch in px
  uniform mat4 uSheetInv;
  uniform vec2 uSheetSize;
  uniform float uSheetOn;
  uniform float uHover;
  uniform float uGlow;        // 0…1: how alive the wall's grid is (rises in the work section)
  uniform float uFigDim;
  uniform vec4 uWordsRect;    // x, y (lower left), w, h on the wall
  uniform float uWordsOn;
  uniform float uWallZ;
  uniform float uMaxT;
  uniform float uNear;
  uniform float uFar;
  uniform float uIntro;
  uniform float uTime;

  const vec3 INK = vec3(.027, .027, .031);
  const vec3 PINK = vec3(1., .8, .847);
  const vec3 PALE = vec3(.992, .902, .918);
  const vec3 DEEP = vec3(.996, .718, .788);

  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
  }

  // ---- quadtree wall: cells split where the words' edges are (and here and there at random)
  vec3 wall(vec2 p, out float lit) {
    float size = 2.4;
    vec2 cell;
    float cov = 0.;
    for (int i = 0; i < 6; i++) {
      cell = floor(p / size);
      vec2 c = (cell + .5) * size;
      vec2 muv = (c - uWordsRect.xy) / uWordsRect.zw;
      cov = 0.;
      if (muv.x > 0. && muv.x < 1. && muv.y > 0. && muv.y < 1.) {
        float lod = log2(max(size / uWordsRect.z * 2048., 1.));
        cov = textureLod(tWords, muv, lod).r * uWordsOn;
      }
      float h = hash(cell + float(i) * 17.3);
      bool split = (cov > .05 && cov < .95) || h < .2 - float(i) * .02;
      if (!split || i == 5) break;
      size *= .5;
    }
    vec2 f = fract(p / size);
    float d = min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)) * size;
    float lw = .012 + fwidth(p.x) * 1.2;
    float edge = 1. - smoothstep(lw * .5, lw, d);
    float id = hash(cell * 1.37 + size);
    float fill = step(.5, cov);
    // letters: solid pink blocks that breathe a little; elsewhere a few dim cells
    float flick = .82 + .18 * sin(uTime * (1. + id * 3.) + id * 40.);
    float body = fill * flick + (1. - fill) * step(.93, id) * .07;
    lit = fill;
    float scan = smoothstep(.9, 0., abs(fract(p.y * .06 - uTime * .07) - .5) * 9.);
    float grid = edge * mix(.16, .0, fill) * (1. + uGlow * 1.4 + scan * 1.6);
    vec3 col = INK + PINK * (body * (1. - edge * .55) * (1. + scan * .25) + grid) + PINK * scan * (1. - fill) * step(.8, id) * .1;
    return col;
  }

  float toDepth(float t, vec3 rd) {
    float zv = max(t * dot(rd, uCamMat[2]), uNear);
    float ndc = (uFar + uNear) / (uFar - uNear) - (2. * uFar * uNear) / ((uFar - uNear) * zv);
    return clamp(ndc * .5 + .5, 0., 1.);
  }

  void main() {
    vec2 px = gl_FragCoord.xy;
    vec2 suv = px / uRes;
    vec3 rd = rayDir(suv * 2. - 1.);

    // ---- the wall
    float tW = (uWallZ - uCamPos.z) / rd.z;
    vec2 wp = uCamPos.xy + rd.xy * tW;
    float lit;
    vec3 col = wall(wp, lit);
    float tBest = 1e9;

    // ---- avatar: phosphor scanlines, thicker where the picture is brighter
    vec4 fig = texture2D(tFig, suv);
    vec4 figN = texelFetch(tFig, ivec2(clamp(suv * uFigRes, vec2(0.), uFigRes - 1.)), 0);
    float fa = smoothstep(.4, .6, fig.a);
    float row = suv.y + hash(vec2(floor(px.x / 6.), 3.)) * .05;
    fa *= step(1. - uIntro * 1.1, 1. - row);          // prints itself from the top on load
    if (fa > .001) {
      float lum = clamp(fig.r / max(fig.a, .001), 0., 1.) * uFigDim;
      float ph = fract(px.y / uPitch) - .5;
      float w = .5 * pow(lum, .7) * 1.08;
      float aa = 1. / uPitch;
      float line = smoothstep(w + aa, w - aa, abs(ph));
      float mask = .88 + .12 * sin(px.x * 2.094);
      vec3 light = mix(DEEP, PALE, smoothstep(.2, .9, lum));
      vec3 fc = INK + light * (line * (.5 + .7 * lum) + lum * lum * .1) * mask;
      col = mix(col, fc, fa);
      if (figN.a > .5) tBest = (figN.g * 255. * 256. + figN.b * 255.) / 65535. * uMaxT;
      else tBest = min(tBest, uMaxT * .6);
    }

    // ---- poster (exact, full resolution, two-sided)
    vec3 lo = (uSheetInv * vec4(uCamPos, 1.)).xyz;
    vec3 ld = mat3(uSheetInv) * rd;
    float tS = -lo.z / ld.z;
    vec2 pl = lo.xy + ld.xy * tS;
    float sd = sdRound(pl, uSheetSize * .5, .014);
    float aa2 = fwidth(sd) * 1.2;
    float sheetA = (1. - smoothstep(-aa2, aa2, sd)) * step(0., tS) * uSheetOn;
    if (sheetA > .001 && tS < tBest) {
      vec2 uv = pl / uSheetSize + .5;
      vec3 sc;
      if (lo.z > 0.) {
        sc = texture2D(tSheet, uv).rgb;
        sc = mix(sc, vec3(1.), uHover * .05);
      } else {
        // the back: pink paper with a black frame and a mark
        sc = PINK;
        float fr = abs(sdRound(pl, uSheetSize * .5 - .07, .0)) - .006;
        sc = mix(sc, INK, 1. - smoothstep(0., aa2, fr));
        vec2 m = abs(pl) - vec2(.11);
        sc = mix(sc, INK, 1. - smoothstep(0., aa2, max(m.x, m.y)));
        vec2 m2 = abs(pl) - vec2(.05);
        sc = mix(sc, PINK, 1. - smoothstep(0., aa2, max(m2.x, m2.y)));
      }
      // rim: pink on black, black on pink
      float rim = smoothstep(aa2 * 3., 0., abs(sd + aa2 * 1.5));
      sc = mix(sc, PINK, rim);
      col = mix(col, sc, sheetA);
      tBest = tS;
    }

    gl_FragColor = vec4(col, 1.);
    gl_FragDepth = tBest > 1e8 ? 1. : toDepth(tBest, rd);
  }
`;

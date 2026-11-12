import { Color, Vector2 } from 'three';

/* Uniforms shared by every material, updated once per frame. */
export const U = {
  uTime: { value: 0 },
  uInvert: { value: 0 }, // 0 = dark scene, 1 = light scene
  uBgDark: { value: new Color('#030405') },
  uBgLight: { value: new Color('#f3f4f1') },
  uFgDark: { value: new Color('#e3f1ee') },
  uFgLight: { value: new Color('#0d0f10') },
  uAccent: { value: new Color('#c6ff3d') },
  uPointer: { value: new Vector2() },
  uPixelRatio: { value: 1 },
  uCamZ: { value: 0 },
};

export const GLSL_COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uInvert;
  uniform vec3 uBgDark;
  uniform vec3 uBgLight;
  uniform vec3 uFgDark;
  uniform vec3 uFgLight;
  uniform vec3 uAccent;
  uniform vec2 uPointer;
  uniform float uPixelRatio;
  uniform float uCamZ;

  vec3 themeBg() { return mix(uBgDark, uBgLight, uInvert); }
  vec3 themeFg() { return mix(uFgDark, uFgLight, uInvert); }

  float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

/* Layout of the world along -Z (camera travels forward while scrolling). */
export const LAYOUT = {
  floorY: -2.4,
  portraitZ: -7,
  workStart: -30,
  workSpacing: 15,
  aboutGap: 22,
  contactGap: 26,
};

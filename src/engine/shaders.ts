/**
 * WebGL2 shaders for the animated gradient.
 * Two-pass architecture: flow map (low-res noise) + composite (full-res color).
 * External uniform contract matches architecture spec section 6.2.
 */

export const VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Pass A — Flow map shader (runs at low resolution, e.g. 384x384).
 * All expensive noise/FBM/domain-warp lives here.
 * Output: vec4(q * 0.5 + 0.5, length(r), n) encoded for [0,1] range.
 */
export const FLOW_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform float uniform_time_seconds;
uniform float uniform_display_aspect;
uniform float uniform_seed;
uniform float uniform_motion_speed;
uniform vec2 uniform_flow_rotation_cs;
uniform float uniform_flow_drift_speed_x;
uniform float uniform_flow_drift_speed_y;
uniform float uniform_warp_strength;
uniform float uniform_warp_scale;
uniform float uniform_turbulence;
uniform int uniform_reduce_motion_enabled;

out vec4 out_flow;

vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.27);
  return fract(p);
}

float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  i += uniform_seed;
  float a = dot(hash33(i + vec3(0,0,0)) - 0.5, f - vec3(0,0,0));
  float b = dot(hash33(i + vec3(1,0,0)) - 0.5, f - vec3(1,0,0));
  float c = dot(hash33(i + vec3(0,1,0)) - 0.5, f - vec3(0,1,0));
  float d = dot(hash33(i + vec3(1,1,0)) - 0.5, f - vec3(1,1,0));
  float e = dot(hash33(i + vec3(0,0,1)) - 0.5, f - vec3(0,0,1));
  float g = dot(hash33(i + vec3(1,0,1)) - 0.5, f - vec3(1,0,1));
  float h = dot(hash33(i + vec3(0,1,1)) - 0.5, f - vec3(0,1,1));
  float j = dot(hash33(i + vec3(1,1,1)) - 0.5, f - vec3(1,1,1));
  return mix(
    mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
    mix(mix(e, g, u.x), mix(h, j, u.x), u.y),
    u.z
  ) * 2.0;
}

float fbm4(vec3 p) {
  float v = 0.0, a = 0.5, freq = 1.0;
  for (int i = 0; i < 4; i++) {
    v += a * noise3d(p * freq);
    freq *= 2.0; a *= 0.5;
  }
  return v;
}

float fbm5(vec3 p) {
  float v = 0.0, a = 0.5, freq = 1.0;
  for (int i = 0; i < 5; i++) {
    v += a * noise3d(p * freq);
    freq *= 2.0; a *= 0.5;
  }
  return v;
}

void main() {
  float time = uniform_time_seconds * float(1 - uniform_reduce_motion_enabled) * uniform_motion_speed;

  vec2 ndc = v_uv * 2.0 - 1.0;
  ndc.x *= uniform_display_aspect;
  // Drift in screen space (X = left/right, Y = up/down), independent of rotation
  ndc -= vec2(uniform_flow_drift_speed_x, uniform_flow_drift_speed_y) * time;

  vec2 rotated = vec2(
    ndc.x * uniform_flow_rotation_cs.x - ndc.y * uniform_flow_rotation_cs.y,
    ndc.x * uniform_flow_rotation_cs.y + ndc.y * uniform_flow_rotation_cs.x
  );

  vec2 p = rotated * uniform_warp_scale;
  p.x *= 0.45;

  float qx = fbm4(vec3(p, time * 0.12));
  float qy = fbm4(vec3(p + vec2(5.2, 1.3), time * 0.12));
  vec2 q = vec2(qx, qy);

  float w = uniform_warp_strength * 2.5;
  float rx = fbm4(vec3(p + w * q + vec2(1.7, 9.2), time * 0.15));
  float ry = fbm4(vec3(p + w * q + vec2(8.3, 2.8), time * 0.15));
  vec2 r = vec2(rx, ry);

  float turb = uniform_turbulence * 2.0;
  float n = fbm5(vec3(p + w * r * turb, time * 0.1));
  n = n * 0.5 + 0.5;
  n = clamp(n, 0.0, 1.0);

  out_flow = vec4(q * 0.5 + 0.5, length(r), n);
}
`;

/**
 * Pass B — Composite shader (runs at full display resolution).
 * Samples the low-res flow map and applies palette + post-processing.
 * No noise functions — extremely lightweight.
 */
export const COMPOSITE_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D uniform_flow_map;
uniform vec2 uniform_canvas_resolution_pixels;
uniform float uniform_device_pixel_ratio;
uniform float uniform_seed;

uniform int uniform_palette_color_count;
uniform vec3 uniform_palette_colors_rgb[6];

uniform float uniform_brightness;
uniform float uniform_contrast;
uniform float uniform_saturation;

uniform float uniform_grain_amount;
uniform float uniform_grain_size;

out vec4 out_color;

vec3 palette(float t, int N) {
  if (N <= 0) return uniform_palette_colors_rgb[0];
  float s = t * float(N - 1);
  int idx = int(floor(s));
  int next = min(idx + 1, N - 1);
  float f = fract(s);
  f = f * f * (3.0 - 2.0 * f);
  return mix(uniform_palette_colors_rgb[idx], uniform_palette_colors_rgb[next], f);
}

vec3 adjustSaturation(vec3 col, float sat) {
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  return mix(vec3(lum), col, sat);
}

void main() {
  vec4 flow = texture(uniform_flow_map, v_uv);
  vec2 q = flow.xy * 2.0 - 1.0;
  float ri = flow.z;
  float n = flow.w;

  n = smoothstep(0.0, 1.0, n);
  float colorT = clamp(n + (length(q) + ri) * 0.08, 0.0, 1.0);

  int count = min(uniform_palette_color_count, 6);
  vec3 rgb = palette(colorT, count);

  float riClamped = clamp(ri, 0.0, 1.0);
  float glow = riClamped * riClamped * riClamped * 0.1;
  rgb += glow;

  rgb *= uniform_brightness;
  rgb = (rgb - 0.5) * uniform_contrast + 0.5;
  rgb = adjustSaturation(rgb, uniform_saturation);
  rgb = clamp(rgb, 0.0, 1.0);

  vec2 px = floor(v_uv * uniform_canvas_resolution_pixels * uniform_device_pixel_ratio / uniform_grain_size);
  vec3 p3 = fract(vec3(px.xyx) * 0.1031 + uniform_seed);
  p3 += dot(p3, p3.yzx + 33.33);
  float grain = fract((p3.x + p3.y) * p3.z);
  grain = (grain - 0.5) * 2.0 * uniform_grain_amount;
  rgb += grain;
  rgb = clamp(rgb, 0.0, 1.0);

  out_color = vec4(rgb, 1.0);
}
`;


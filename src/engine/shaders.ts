/**
 * WebGL2 shaders for the animated gradient.
 * Contract: uniforms match architecture spec section 6.2.
 */

export const VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform float uniform_time_seconds;
uniform vec2 uniform_canvas_resolution_pixels;
uniform float uniform_device_pixel_ratio;
uniform float uniform_seed;

uniform int uniform_palette_color_count;
uniform vec3 uniform_palette_colors_rgb[6];

uniform float uniform_motion_speed;
uniform float uniform_flow_rotation_radians;

uniform float uniform_warp_strength;
uniform float uniform_warp_scale;
uniform float uniform_turbulence;

uniform float uniform_brightness;
uniform float uniform_contrast;
uniform float uniform_saturation;

uniform float uniform_grain_amount;
uniform float uniform_grain_size;

uniform int uniform_reduce_motion_enabled;

out vec4 out_color;

vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.27);
  return fract(p);
}

// Gradient noise — quintic interpolation for C2 continuity (no grid artifacts)
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
  float time = uniform_time_seconds * float(1 - uniform_reduce_motion_enabled) * uniform_motion_speed;

  vec2 res = uniform_canvas_resolution_pixels;
  vec2 ndc = v_uv * 2.0 - 1.0;
  float aspect = res.x / max(res.y, 1.0);
  ndc.x *= aspect;

  float cr = cos(uniform_flow_rotation_radians);
  float sr = sin(uniform_flow_rotation_radians);
  vec2 rotated = vec2(ndc.x * cr - ndc.y * sr, ndc.x * sr + ndc.y * cr);

  // Anisotropic stretch — elongates noise along the flow direction
  vec2 p = rotated * uniform_warp_scale;
  p.x *= 0.45;

  // === Cascaded domain warping (Quilez-style) ===

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
  n = smoothstep(0.0, 1.0, n);

  float qi = length(q);
  float ri = length(r);
  float colorT = clamp(n + (qi + ri) * 0.08, 0.0, 1.0);

  int count = min(uniform_palette_color_count, 6);
  vec3 rgb = palette(colorT, count);

  float glow = pow(clamp(ri, 0.0, 1.0), 3.0) * 0.1;
  rgb += glow;

  rgb *= uniform_brightness;
  rgb = (rgb - 0.5) * uniform_contrast + 0.5;
  rgb = adjustSaturation(rgb, uniform_saturation);
  rgb = clamp(rgb, 0.0, 1.0);

  vec2 px = floor(v_uv * res * uniform_device_pixel_ratio / uniform_grain_size);
  float grain = fract(sin(dot(px, vec2(12.9898, 78.233)) + uniform_seed) * 43758.5453);
  grain = (grain - 0.5) * 2.0 * uniform_grain_amount;
  rgb += grain;
  rgb = clamp(rgb, 0.0, 1.0);

  out_color = vec4(rgb, 1.0);
}
`;

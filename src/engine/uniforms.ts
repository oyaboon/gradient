/**
 * Upload gradient params to WebGL uniforms.
 * Supports both two-pass (flow + composite) and legacy single-pass modes.
 */

import type { GradientParams } from "@/types/preset";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return [r, g, b];
}

// ---------------------------------------------------------------------------
// Flow shader (Pass A) uniforms
// ---------------------------------------------------------------------------

export interface FlowUniformLocations {
  uniform_time_seconds: WebGLUniformLocation | null;
  uniform_display_aspect: WebGLUniformLocation | null;
  uniform_seed: WebGLUniformLocation | null;
  uniform_motion_speed: WebGLUniformLocation | null;
  uniform_flow_rotation_cs: WebGLUniformLocation | null;
  uniform_warp_strength: WebGLUniformLocation | null;
  uniform_warp_scale: WebGLUniformLocation | null;
  uniform_turbulence: WebGLUniformLocation | null;
  uniform_reduce_motion_enabled: WebGLUniformLocation | null;
}

const FLOW_UNIFORM_NAMES: (keyof FlowUniformLocations)[] = [
  "uniform_time_seconds",
  "uniform_display_aspect",
  "uniform_seed",
  "uniform_motion_speed",
  "uniform_flow_rotation_cs",
  "uniform_warp_strength",
  "uniform_warp_scale",
  "uniform_turbulence",
  "uniform_reduce_motion_enabled",
];

export function getFlowUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): FlowUniformLocations {
  const loc = {} as FlowUniformLocations;
  for (const name of FLOW_UNIFORM_NAMES) {
    (loc as unknown as Record<string, WebGLUniformLocation | null>)[name] =
      gl.getUniformLocation(program, name);
  }
  return loc;
}

export function setFlowUniforms(
  gl: WebGL2RenderingContext,
  loc: FlowUniformLocations,
  params: GradientParams,
  timeSeconds: number,
  displayAspect: number,
  flowRotationCs?: [number, number]
): void {
  if (loc.uniform_time_seconds) gl.uniform1f(loc.uniform_time_seconds, timeSeconds);
  if (loc.uniform_display_aspect) gl.uniform1f(loc.uniform_display_aspect, displayAspect);
  if (loc.uniform_seed) gl.uniform1f(loc.uniform_seed, params.uniform_seed);
  if (loc.uniform_motion_speed) gl.uniform1f(loc.uniform_motion_speed, params.uniform_motion_speed);
  if (loc.uniform_flow_rotation_cs) {
    const [cr, sr] =
      flowRotationCs ?? [
        Math.cos(params.uniform_flow_rotation_radians),
        Math.sin(params.uniform_flow_rotation_radians),
      ];
    gl.uniform2f(loc.uniform_flow_rotation_cs, cr, sr);
  }
  if (loc.uniform_warp_strength) gl.uniform1f(loc.uniform_warp_strength, params.uniform_warp_strength);
  if (loc.uniform_warp_scale) gl.uniform1f(loc.uniform_warp_scale, params.uniform_warp_scale);
  if (loc.uniform_turbulence) gl.uniform1f(loc.uniform_turbulence, params.uniform_turbulence);
  if (loc.uniform_reduce_motion_enabled) gl.uniform1i(loc.uniform_reduce_motion_enabled, params.uniform_reduce_motion_enabled);
}

// ---------------------------------------------------------------------------
// Composite shader (Pass B) uniforms
// ---------------------------------------------------------------------------

export interface CompositeUniformLocations {
  uniform_flow_map: WebGLUniformLocation | null;
  uniform_canvas_resolution_pixels: WebGLUniformLocation | null;
  uniform_device_pixel_ratio: WebGLUniformLocation | null;
  uniform_seed: WebGLUniformLocation | null;
  uniform_palette_color_count: WebGLUniformLocation | null;
  uniform_palette_colors_rgb: WebGLUniformLocation | null;
  uniform_brightness: WebGLUniformLocation | null;
  uniform_contrast: WebGLUniformLocation | null;
  uniform_saturation: WebGLUniformLocation | null;
  uniform_grain_amount: WebGLUniformLocation | null;
  uniform_grain_size: WebGLUniformLocation | null;
}

const COMPOSITE_UNIFORM_NAMES: (keyof CompositeUniformLocations)[] = [
  "uniform_flow_map",
  "uniform_canvas_resolution_pixels",
  "uniform_device_pixel_ratio",
  "uniform_seed",
  "uniform_palette_color_count",
  "uniform_palette_colors_rgb",
  "uniform_brightness",
  "uniform_contrast",
  "uniform_saturation",
  "uniform_grain_amount",
  "uniform_grain_size",
];

export function getCompositeUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): CompositeUniformLocations {
  const loc = {} as CompositeUniformLocations;
  for (const name of COMPOSITE_UNIFORM_NAMES) {
    (loc as unknown as Record<string, WebGLUniformLocation | null>)[name] =
      gl.getUniformLocation(program, name);
  }
  return loc;
}

export function setCompositeUniforms(
  gl: WebGL2RenderingContext,
  loc: CompositeUniformLocations,
  params: GradientParams,
  width: number,
  height: number,
  devicePixelRatio: number
): void {
  if (loc.uniform_flow_map) gl.uniform1i(loc.uniform_flow_map, 0);
  if (loc.uniform_canvas_resolution_pixels) gl.uniform2f(loc.uniform_canvas_resolution_pixels, width, height);
  if (loc.uniform_device_pixel_ratio) gl.uniform1f(loc.uniform_device_pixel_ratio, devicePixelRatio);
  if (loc.uniform_seed) gl.uniform1f(loc.uniform_seed, params.uniform_seed);

  const count = Math.min(6, Math.max(0, params.uniform_palette_colors_hex.length));
  if (loc.uniform_palette_color_count) gl.uniform1i(loc.uniform_palette_color_count, count);

  if (loc.uniform_palette_colors_rgb) {
    const rgb = params.uniform_palette_colors_hex.slice(0, 6).map(hexToRgb);
    while (rgb.length < 6) rgb.push([0, 0, 0]);
    gl.uniform3fv(loc.uniform_palette_colors_rgb, rgb.flat());
  }

  if (loc.uniform_brightness) gl.uniform1f(loc.uniform_brightness, params.uniform_brightness);
  if (loc.uniform_contrast) gl.uniform1f(loc.uniform_contrast, params.uniform_contrast);
  if (loc.uniform_saturation) gl.uniform1f(loc.uniform_saturation, params.uniform_saturation);
  if (loc.uniform_grain_amount) gl.uniform1f(loc.uniform_grain_amount, params.uniform_grain_amount);
  if (loc.uniform_grain_size) gl.uniform1f(loc.uniform_grain_size, params.uniform_grain_size);
}


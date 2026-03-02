/**
 * Upload gradient params to WebGL uniforms.
 * Converts hex palette to vec3[] and sets all spec-defined uniforms.
 */

import type { GradientParams } from "@/types/preset";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return [r, g, b];
}

export interface UniformLocations {
  uniform_time_seconds: WebGLUniformLocation | null;
  uniform_canvas_resolution_pixels: WebGLUniformLocation | null;
  uniform_device_pixel_ratio: WebGLUniformLocation | null;
  uniform_seed: WebGLUniformLocation | null;
  uniform_palette_color_count: WebGLUniformLocation | null;
  uniform_palette_colors_rgb: WebGLUniformLocation | null;
  uniform_motion_speed: WebGLUniformLocation | null;
  uniform_flow_rotation_radians: WebGLUniformLocation | null;
  uniform_warp_strength: WebGLUniformLocation | null;
  uniform_warp_scale: WebGLUniformLocation | null;
  uniform_turbulence: WebGLUniformLocation | null;
  uniform_brightness: WebGLUniformLocation | null;
  uniform_contrast: WebGLUniformLocation | null;
  uniform_saturation: WebGLUniformLocation | null;
  uniform_grain_amount: WebGLUniformLocation | null;
  uniform_grain_size: WebGLUniformLocation | null;
  uniform_reduce_motion_enabled: WebGLUniformLocation | null;
}

const UNIFORM_NAMES = [
  "uniform_time_seconds",
  "uniform_canvas_resolution_pixels",
  "uniform_device_pixel_ratio",
  "uniform_seed",
  "uniform_palette_color_count",
  "uniform_palette_colors_rgb",
  "uniform_motion_speed",
  "uniform_flow_rotation_radians",
  "uniform_warp_strength",
  "uniform_warp_scale",
  "uniform_turbulence",
  "uniform_brightness",
  "uniform_contrast",
  "uniform_saturation",
  "uniform_grain_amount",
  "uniform_grain_size",
  "uniform_reduce_motion_enabled",
] as const;

export function getUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): UniformLocations {
  const locations = {} as UniformLocations;
  for (const name of UNIFORM_NAMES) {
    (locations as unknown as Record<string, WebGLUniformLocation | null>)[name] =
      gl.getUniformLocation(program, name);
  }
  return locations;
}

export function setUniforms(
  gl: WebGL2RenderingContext,
  loc: UniformLocations,
  params: GradientParams,
  timeSeconds: number,
  width: number,
  height: number,
  devicePixelRatio: number
): void {
  const setf = (name: keyof UniformLocations, v: number) => {
    const l = loc[name];
    if (l) gl.uniform1f(l, v);
  };
  const set2f = (name: keyof UniformLocations, x: number, y: number) => {
    const l = loc[name];
    if (l) gl.uniform2f(l, x, y);
  };
  const seti = (name: keyof UniformLocations, v: number) => {
    const l = loc[name];
    if (l) gl.uniform1i(l, v);
  };

  setf("uniform_time_seconds", timeSeconds);
  set2f("uniform_canvas_resolution_pixels", width, height);
  setf("uniform_device_pixel_ratio", devicePixelRatio);
  setf("uniform_seed", params.uniform_seed);

  const count = Math.min(6, Math.max(0, params.uniform_palette_colors_hex.length));
  seti("uniform_palette_color_count", count);

  const paletteLoc = loc.uniform_palette_colors_rgb;
  if (paletteLoc) {
    const rgb = params.uniform_palette_colors_hex.slice(0, 6).map(hexToRgb);
    while (rgb.length < 6) rgb.push([0, 0, 0]);
    gl.uniform3fv(paletteLoc, rgb.flat());
  }

  setf("uniform_motion_speed", params.uniform_motion_speed);
  setf("uniform_flow_rotation_radians", params.uniform_flow_rotation_radians);
  setf("uniform_warp_strength", params.uniform_warp_strength);
  setf("uniform_warp_scale", params.uniform_warp_scale);
  setf("uniform_turbulence", params.uniform_turbulence);
  setf("uniform_brightness", params.uniform_brightness);
  setf("uniform_contrast", params.uniform_contrast);
  setf("uniform_saturation", params.uniform_saturation);
  setf("uniform_grain_amount", params.uniform_grain_amount);
  setf("uniform_grain_size", params.uniform_grain_size);
  seti("uniform_reduce_motion_enabled", params.uniform_reduce_motion_enabled);
}

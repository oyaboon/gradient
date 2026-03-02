/**
 * Build a ZIP containing: index.html, gradient.js, preset.json, fallback.png.
 * Self-contained; no CDN dependency.
 */

import JSZip from "jszip";
import type { Preset } from "@/types/preset";
import { VERTEX_SOURCE, FRAGMENT_SOURCE } from "./shaders";

/** Generate gradient.js content: same as embed script but as a standalone IIFE that uses a global __GRADIENT_PRESET__. */
function generateGradientJsContent(): string {
  return `// Self-contained gradient renderer. Load after preset in index.html.
(function() {
  var preset = typeof __GRADIENT_PRESET__ !== 'undefined' ? __GRADIENT_PRESET__ : null;
  if (!preset) return;
  var params = {
    uniform_seed: preset.uniform_seed,
    uniform_palette_colors_hex: preset.uniform_palette_colors_hex,
    uniform_motion_speed: preset.uniform_motion_speed,
    uniform_flow_rotation_radians: preset.uniform_flow_rotation_radians,
    uniform_warp_strength: preset.uniform_warp_strength,
    uniform_warp_scale: preset.uniform_warp_scale,
    uniform_turbulence: preset.uniform_turbulence,
    uniform_brightness: preset.uniform_brightness,
    uniform_contrast: preset.uniform_contrast,
    uniform_saturation: preset.uniform_saturation,
    uniform_grain_amount: preset.uniform_grain_amount,
    uniform_grain_size: preset.uniform_grain_size,
    uniform_reduce_motion_enabled: preset.uniform_reduce_motion_enabled
  };
  var vertexSource = ${JSON.stringify(VERTEX_SOURCE)};
  var fragmentSource = ${JSON.stringify(FRAGMENT_SOURCE)};
  var fallbackDataUrl = preset.export_fallback_image_data_url || null;
  var container = document.getElementById('gradient-embed-container');
  if (!container) { container = document.createElement('div'); container.id = 'gradient-embed-container'; container.style.cssText = 'position:relative;width:100%;height:100%;min-height:100vh'; document.body.appendChild(container); }
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  container.appendChild(canvas);
  var gl = canvas.getContext('webgl2', { alpha: false, depth: false });
  if (!gl) {
    if (fallbackDataUrl) { var img = document.createElement('img'); img.src = fallbackDataUrl; img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'; container.appendChild(img); }
    return;
  }
  function hexToRgb(hex) { var h = hex.replace(/^#/, ''); var n = parseInt(h, 16); return [(n>>16)/255, ((n>>8)&255)/255, (n&255)/255]; }
  function setUniforms(gl, loc, params, time, w, h, dpr) {
    gl.uniform1f(loc.u_time, time); gl.uniform2f(loc.u_res, w, h); gl.uniform1f(loc.u_dpr, dpr);
    gl.uniform1f(loc.u_seed, params.uniform_seed);
    var count = Math.min(6, params.uniform_palette_colors_hex.length);
    gl.uniform1i(loc.u_palette_count, count);
    var rgb = params.uniform_palette_colors_hex.slice(0, 6).map(hexToRgb);
    while (rgb.length < 6) rgb.push([0,0,0]);
    gl.uniform3fv(loc.u_palette, rgb.flat());
    gl.uniform1f(loc.u_motion_speed, params.uniform_motion_speed);
    gl.uniform1f(loc.u_flow_rot, params.uniform_flow_rotation_radians);
    gl.uniform1f(loc.u_warp_str, params.uniform_warp_strength);
    gl.uniform1f(loc.u_warp_scale, params.uniform_warp_scale);
    gl.uniform1f(loc.u_turbulence, params.uniform_turbulence);
    gl.uniform1f(loc.u_brightness, params.uniform_brightness);
    gl.uniform1f(loc.u_contrast, params.uniform_contrast);
    gl.uniform1f(loc.u_saturation, params.uniform_saturation);
    gl.uniform1f(loc.u_grain_amt, params.uniform_grain_amount);
    gl.uniform1f(loc.u_grain_size, params.uniform_grain_size);
    gl.uniform1i(loc.u_reduce_motion, params.uniform_reduce_motion_enabled);
  }
  function compileShader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var vs = compileShader(gl.VERTEX_SHADER, vertexSource);
  var fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  var program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs); gl.deleteShader(fs);
  var quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  var loc = { u_time: gl.getUniformLocation(program, 'uniform_time_seconds'), u_res: gl.getUniformLocation(program, 'uniform_canvas_resolution_pixels'), u_dpr: gl.getUniformLocation(program, 'uniform_device_pixel_ratio'), u_seed: gl.getUniformLocation(program, 'uniform_seed'), u_palette_count: gl.getUniformLocation(program, 'uniform_palette_color_count'), u_palette: gl.getUniformLocation(program, 'uniform_palette_colors_rgb'), u_motion_speed: gl.getUniformLocation(program, 'uniform_motion_speed'), u_flow_rot: gl.getUniformLocation(program, 'uniform_flow_rotation_radians'), u_warp_str: gl.getUniformLocation(program, 'uniform_warp_strength'), u_warp_scale: gl.getUniformLocation(program, 'uniform_warp_scale'), u_turbulence: gl.getUniformLocation(program, 'uniform_turbulence'), u_brightness: gl.getUniformLocation(program, 'uniform_brightness'), u_contrast: gl.getUniformLocation(program, 'uniform_contrast'), u_saturation: gl.getUniformLocation(program, 'uniform_saturation'), u_grain_amt: gl.getUniformLocation(program, 'uniform_grain_amount'), u_grain_size: gl.getUniformLocation(program, 'uniform_grain_size'), u_reduce_motion: gl.getUniformLocation(program, 'uniform_reduce_motion_enabled') };
  var startTime = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
  function resize() { var w = container.clientWidth || window.innerWidth; var h = container.clientHeight || window.innerHeight; var dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr); gl.viewport(0, 0, canvas.width, canvas.height); }
  resize();
  window.addEventListener('resize', resize);
  function draw() { var time = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000 - startTime; gl.useProgram(program); var posLoc = gl.getAttribLocation(program, 'a_position'); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0); setUniforms(gl, loc, params, time, canvas.width, canvas.height, window.devicePixelRatio || 1); gl.drawArrays(gl.TRIANGLES, 0, 6); requestAnimationFrame(draw); }
  draw();
})();
`;
}

export async function createGradientZip(
  preset: Preset,
  fallbackDataUrl?: string | null
): Promise<Blob> {
  const zip = new JSZip();
  const presetWithFallback = fallbackDataUrl
    ? { ...preset, export_fallback_image_data_url: fallbackDataUrl }
    : preset;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gradient</title>
  <style>*{margin:0;padding:0}html,body{width:100%;height:100%}</style>
</head>
<body>
  <div id="gradient-embed-container" style="position:relative;width:100%;height:100%;min-height:100vh"></div>
  <script>var __GRADIENT_PRESET__ = ${JSON.stringify(presetWithFallback)};</script>
  <script src="gradient.js"></script>
</body>
</html>
`;

  zip.file("index.html", indexHtml);
  zip.file("gradient.js", generateGradientJsContent());
  zip.file("preset.json", JSON.stringify(presetWithFallback, null, 2));

  if (fallbackDataUrl && fallbackDataUrl.startsWith("data:image/png")) {
    const base64 = fallbackDataUrl.split(",")[1];
    if (base64) zip.file("fallback.png", base64, { base64: true });
  }

  return zip.generateAsync({ type: "blob" });
}

/**
 * Build a ZIP for Wallpaper Engine (Web Wallpaper).
 * Same content as createGradientZip plus project.json and README.
 * User extracts the zip, then in Wallpaper Engine: Create Wallpaper → drag index.html.
 * @see https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
 */
export async function createWallpaperEngineZip(
  preset: Preset,
  fallbackDataUrl?: string | null
): Promise<Blob> {
  const zip = new JSZip();
  const presetWithFallback = fallbackDataUrl
    ? { ...preset, export_fallback_image_data_url: fallbackDataUrl }
    : preset;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gradient</title>
  <style>*{margin:0;padding:0}html,body{width:100%;height:100%}</style>
</head>
<body>
  <div id="gradient-embed-container" style="position:relative;width:100%;height:100%;min-height:100vh"></div>
  <script>var __GRADIENT_PRESET__ = ${JSON.stringify(presetWithFallback)};</script>
  <script src="gradient.js"></script>
</body>
</html>
`;

  const title = preset.preset_name || "Gradient";
  const projectJson = {
    file: "index.html",
    title,
    type: "web",
    general: { properties: {} },
  };

  const readme = `Wallpaper Engine - Web Wallpaper
===============================

1. Extract this folder somewhere (e.g. Desktop).
2. Open Wallpaper Engine.
3. Click "Create Wallpaper" and choose "Create wallpaper from file".
4. Select the "index.html" file from this folder.

All files (HTML, JS, images) are bundled locally; no internet required.
Docs: https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
`;

  zip.file("index.html", indexHtml);
  zip.file("gradient.js", generateGradientJsContent());
  zip.file("preset.json", JSON.stringify(presetWithFallback, null, 2));
  zip.file("project.json", JSON.stringify(projectJson, null, 2));
  zip.file("README.txt", readme);

  if (fallbackDataUrl && fallbackDataUrl.startsWith("data:image/png")) {
    const base64 = fallbackDataUrl.split(",")[1];
    if (base64) zip.file("fallback.png", base64, { base64: true });
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadZip(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "gradient-export.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}

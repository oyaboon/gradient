/**
 * Generate self-contained embed: a div + script that runs the gradient in any HTML page.
 * Two-pass flow-map architecture: low-res noise → full-res composite.
 * No external imports; works in a blank index.html.
 */

import type { GradientParams } from "@/types/preset";
import { VERTEX_SOURCE, FLOW_FRAGMENT_SOURCE, COMPOSITE_FRAGMENT_SOURCE } from "./shaders";

export function generateEmbedCode(
  params: GradientParams,
  fallbackDataUrl?: string | null
): string {
  const paramsJson = JSON.stringify(params);
  const vertexStr = JSON.stringify(VERTEX_SOURCE);
  const flowFragStr = JSON.stringify(FLOW_FRAGMENT_SOURCE);
  const compositeFragStr = JSON.stringify(COMPOSITE_FRAGMENT_SOURCE);
  const fallbackStr = fallbackDataUrl ? JSON.stringify(fallbackDataUrl) : "null";

  const scriptContent = `
(function() {
  var params = ${paramsJson};
  var vertexSource = ${vertexStr};
  var flowFragSource = ${flowFragStr};
  var compositeFragSource = ${compositeFragStr};
  var fallbackDataUrl = ${fallbackStr};
  var FLOW_MAP_SIZE = 384;

  var container = document.getElementById('gradient-embed-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'gradient-embed-container';
    container.style.cssText = 'position:relative;width:100%;height:100%;min-height:100vh';
    document.body.appendChild(container);
  }

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  container.appendChild(canvas);

  var gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false });
  if (!gl) {
    if (fallbackDataUrl) {
      var img = document.createElement('img');
      img.src = fallbackDataUrl;
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      container.appendChild(img);
    }
    return;
  }

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function buildProgram(vsSource, fsSource) {
    var vs = compileShader(gl.VERTEX_SHADER, vsSource);
    var fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  var flowProg = buildProgram(vertexSource, flowFragSource);
  var compositeProg = buildProgram(vertexSource, compositeFragSource);

  var quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  // Flow map FBO
  gl.getExtension('EXT_color_buffer_float');
  var flowTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, flowTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, FLOW_MAP_SIZE, FLOW_MAP_SIZE, 0, gl.RGBA, gl.HALF_FLOAT, null);

  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowTex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FLOW_MAP_SIZE, FLOW_MAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowTex, 0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // Flow shader uniforms
  var flowLoc = {
    u_time: gl.getUniformLocation(flowProg, 'uniform_time_seconds'),
    u_aspect: gl.getUniformLocation(flowProg, 'uniform_display_aspect'),
    u_seed: gl.getUniformLocation(flowProg, 'uniform_seed'),
    u_motion_speed: gl.getUniformLocation(flowProg, 'uniform_motion_speed'),
    u_flow_cs: gl.getUniformLocation(flowProg, 'uniform_flow_rotation_cs'),
    u_drift_x: gl.getUniformLocation(flowProg, 'uniform_flow_drift_speed_x'),
    u_drift_y: gl.getUniformLocation(flowProg, 'uniform_flow_drift_speed_y'),
    u_warp_str: gl.getUniformLocation(flowProg, 'uniform_warp_strength'),
    u_warp_scale: gl.getUniformLocation(flowProg, 'uniform_warp_scale'),
    u_turbulence: gl.getUniformLocation(flowProg, 'uniform_turbulence'),
    u_reduce_motion: gl.getUniformLocation(flowProg, 'uniform_reduce_motion_enabled')
  };

  // Composite shader uniforms
  function hexToRgb(hex) {
    var h = hex.replace(/^#/, '');
    var n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  var compLoc = {
    u_flow_map: gl.getUniformLocation(compositeProg, 'uniform_flow_map'),
    u_res: gl.getUniformLocation(compositeProg, 'uniform_canvas_resolution_pixels'),
    u_dpr: gl.getUniformLocation(compositeProg, 'uniform_device_pixel_ratio'),
    u_seed: gl.getUniformLocation(compositeProg, 'uniform_seed'),
    u_palette_count: gl.getUniformLocation(compositeProg, 'uniform_palette_color_count'),
    u_palette: gl.getUniformLocation(compositeProg, 'uniform_palette_colors_rgb'),
    u_brightness: gl.getUniformLocation(compositeProg, 'uniform_brightness'),
    u_contrast: gl.getUniformLocation(compositeProg, 'uniform_contrast'),
    u_saturation: gl.getUniformLocation(compositeProg, 'uniform_saturation'),
    u_grain_amt: gl.getUniformLocation(compositeProg, 'uniform_grain_amount'),
    u_grain_size: gl.getUniformLocation(compositeProg, 'uniform_grain_size')
  };

  var startTime = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
  var displayW = 1, displayH = 1;
  var lastFlowTimeMs = -100;
  var flowIntervalMs = 1000 / 30;

  function resize() {
    displayW = container.clientWidth || window.innerWidth;
    displayH = container.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, displayW * dpr);
    canvas.height = Math.max(1, displayH * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawQuad(prog) {
    var posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function draw() {
    var nowMs = (typeof performance !== 'undefined' ? performance.now() : 0);
    var time = nowMs / 1000 - startTime;
    var aspect = displayW / Math.max(displayH, 1);
    var flowDue = (nowMs - lastFlowTimeMs) >= flowIntervalMs;

    if (flowDue) {
      var rad = params.uniform_flow_rotation_radians;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, FLOW_MAP_SIZE, FLOW_MAP_SIZE);
      gl.useProgram(flowProg);
      gl.uniform1f(flowLoc.u_time, time);
      gl.uniform1f(flowLoc.u_aspect, aspect);
      gl.uniform1f(flowLoc.u_seed, params.uniform_seed);
      gl.uniform1f(flowLoc.u_motion_speed, params.uniform_motion_speed);
      gl.uniform2f(flowLoc.u_flow_cs, Math.cos(rad), Math.sin(rad));
      if (flowLoc.u_drift_x != null) gl.uniform1f(flowLoc.u_drift_x, params.uniform_flow_drift_speed_x ?? 0);
      if (flowLoc.u_drift_y != null) gl.uniform1f(flowLoc.u_drift_y, params.uniform_flow_drift_speed_y ?? 0);
      gl.uniform1f(flowLoc.u_warp_str, params.uniform_warp_strength);
      gl.uniform1f(flowLoc.u_warp_scale, params.uniform_warp_scale);
      gl.uniform1f(flowLoc.u_turbulence, params.uniform_turbulence);
      gl.uniform1i(flowLoc.u_reduce_motion, params.uniform_reduce_motion_enabled);
      drawQuad(flowProg);
      lastFlowTimeMs = nowMs;
    }

    // Pass B: composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(compositeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flowTex);
    gl.uniform1i(compLoc.u_flow_map, 0);
    gl.uniform2f(compLoc.u_res, canvas.width, canvas.height);
    gl.uniform1f(compLoc.u_dpr, window.devicePixelRatio || 1);
    gl.uniform1f(compLoc.u_seed, params.uniform_seed);
    var count = Math.min(6, params.uniform_palette_colors_hex.length);
    gl.uniform1i(compLoc.u_palette_count, count);
    var rgb = params.uniform_palette_colors_hex.slice(0, 6).map(hexToRgb);
    while (rgb.length < 6) rgb.push([0,0,0]);
    gl.uniform3fv(compLoc.u_palette, rgb.flat());
    gl.uniform1f(compLoc.u_brightness, params.uniform_brightness);
    gl.uniform1f(compLoc.u_contrast, params.uniform_contrast);
    gl.uniform1f(compLoc.u_saturation, params.uniform_saturation);
    gl.uniform1f(compLoc.u_grain_amt, params.uniform_grain_amount);
    gl.uniform1f(compLoc.u_grain_size, params.uniform_grain_size);
    drawQuad(compositeProg);

    requestAnimationFrame(draw);
  }
  draw();
})();
`;

  return `<div id="gradient-embed-container" style="position:relative;width:100%;height:100%;min-height:100vh"></div>
<script>
${scriptContent.trim()}
</script>`;
}

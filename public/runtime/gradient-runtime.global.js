"use strict";
(() => {
  // src/engine/shaders.ts
  var VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
  var FLOW_FRAGMENT_SOURCE = `#version 300 es
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
  var COMPOSITE_FRAGMENT_SOURCE = `#version 300 es
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

  // src/engine/uniforms.ts
  function hexToRgb(hex) {
    const h = hex.replace(/^#/, "");
    const n = parseInt(h, 16);
    const r = (n >> 16 & 255) / 255;
    const g = (n >> 8 & 255) / 255;
    const b = (n & 255) / 255;
    return [r, g, b];
  }
  var FLOW_UNIFORM_NAMES = [
    "uniform_time_seconds",
    "uniform_display_aspect",
    "uniform_seed",
    "uniform_motion_speed",
    "uniform_flow_rotation_cs",
    "uniform_flow_drift_speed_x",
    "uniform_flow_drift_speed_y",
    "uniform_warp_strength",
    "uniform_warp_scale",
    "uniform_turbulence",
    "uniform_reduce_motion_enabled"
  ];
  function getFlowUniformLocations(gl, program) {
    const loc = {};
    for (const name of FLOW_UNIFORM_NAMES) {
      loc[name] = gl.getUniformLocation(program, name);
    }
    return loc;
  }
  function setFlowUniforms(gl, loc, params, timeSeconds, displayAspect, flowRotationCs) {
    if (loc.uniform_time_seconds) gl.uniform1f(loc.uniform_time_seconds, timeSeconds);
    if (loc.uniform_display_aspect) gl.uniform1f(loc.uniform_display_aspect, displayAspect);
    if (loc.uniform_seed) gl.uniform1f(loc.uniform_seed, params.uniform_seed);
    if (loc.uniform_motion_speed) gl.uniform1f(loc.uniform_motion_speed, params.uniform_motion_speed);
    if (loc.uniform_flow_rotation_cs) {
      const [cr, sr] = flowRotationCs != null ? flowRotationCs : [
        Math.cos(params.uniform_flow_rotation_radians),
        Math.sin(params.uniform_flow_rotation_radians)
      ];
      gl.uniform2f(loc.uniform_flow_rotation_cs, cr, sr);
    }
    if (loc.uniform_flow_drift_speed_x) gl.uniform1f(loc.uniform_flow_drift_speed_x, params.uniform_flow_drift_speed_x);
    if (loc.uniform_flow_drift_speed_y) gl.uniform1f(loc.uniform_flow_drift_speed_y, params.uniform_flow_drift_speed_y);
    if (loc.uniform_warp_strength) gl.uniform1f(loc.uniform_warp_strength, params.uniform_warp_strength);
    if (loc.uniform_warp_scale) gl.uniform1f(loc.uniform_warp_scale, params.uniform_warp_scale);
    if (loc.uniform_turbulence) gl.uniform1f(loc.uniform_turbulence, params.uniform_turbulence);
    if (loc.uniform_reduce_motion_enabled) gl.uniform1i(loc.uniform_reduce_motion_enabled, params.uniform_reduce_motion_enabled);
  }
  var COMPOSITE_UNIFORM_NAMES = [
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
    "uniform_grain_size"
  ];
  function getCompositeUniformLocations(gl, program) {
    const loc = {};
    for (const name of COMPOSITE_UNIFORM_NAMES) {
      loc[name] = gl.getUniformLocation(program, name);
    }
    return loc;
  }
  function setCompositeUniforms(gl, loc, params, width, height, devicePixelRatio) {
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

  // src/engine/renderer.ts
  var QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  var DEFAULT_CONFIG = {
    resolutionScale: 1,
    fpsCap: 60,
    flowMapSize: 384,
    flowFps: 30
  };
  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || "Unknown error";
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return shader;
  }
  function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Unknown error";
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${log}`);
    }
    return program;
  }
  function buildProgram(gl, vertexSource, fragmentSource) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }
  function createFlowMap(gl, size) {
    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create flow map texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.getExtension("EXT_color_buffer_float");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size, size, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error("Failed to create flow map framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { framebuffer, texture, size };
  }
  var GradientRenderer = class _GradientRenderer {
    constructor(gl, flowProgram, compositeProgram, flowUniforms, compositeUniforms, flowMap, positionBuffer, quadVao, config) {
      this.quadVao = null;
      this.startTime = 0;
      this.rafId = null;
      this.destroyed = false;
      this.lastFrameTime = 0;
      this.frameInterval = 1e3 / 60;
      this.lastFlowUpdateTimeMs = 0;
      this.flowFrameIntervalMs = 1e3 / 30;
      this.displayWidth = 1;
      this.displayHeight = 1;
      this.lastCompositeParamsRef = null;
      this.lastCompositeCanvasW = 0;
      this.lastCompositeCanvasH = 0;
      this.lastCompositeDpr = 0;
      this.cachedFlowRotationRadians = NaN;
      this.cachedFlowRotationCs = [1, 0];
      var _a;
      this.gl = gl;
      this.flowProgram = flowProgram;
      this.compositeProgram = compositeProgram;
      this.flowUniforms = flowUniforms;
      this.compositeUniforms = compositeUniforms;
      this.flowMap = flowMap;
      this.positionBuffer = positionBuffer;
      this.quadVao = quadVao;
      this.config = config;
      this.frameInterval = 1e3 / config.fpsCap;
      this.flowFrameIntervalMs = 1e3 / ((_a = config.flowFps) != null ? _a : 30);
    }
    static create(canvas, config = {}) {
      const gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        antialias: false,
        powerPreference: "high-performance"
      });
      if (!gl) {
        throw new Error("WebGL2 not supported");
      }
      const fullConfig = { ...DEFAULT_CONFIG, ...config };
      const flowProgram = buildProgram(gl, VERTEX_SOURCE, FLOW_FRAGMENT_SOURCE);
      const compositeProgram = buildProgram(gl, VERTEX_SOURCE, COMPOSITE_FRAGMENT_SOURCE);
      const flowUniforms = getFlowUniformLocations(gl, flowProgram);
      const compositeUniforms = getCompositeUniformLocations(gl, compositeProgram);
      const flowMap = createFlowMap(gl, fullConfig.flowMapSize);
      const positionBuffer = gl.createBuffer();
      if (!positionBuffer) throw new Error("Failed to create buffer");
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);
      const quadVao = gl.createVertexArray();
      if (quadVao) {
        gl.bindVertexArray(quadVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const posLoc = gl.getAttribLocation(flowProgram, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
      }
      return new _GradientRenderer(
        gl,
        flowProgram,
        compositeProgram,
        flowUniforms,
        compositeUniforms,
        flowMap,
        positionBuffer,
        quadVao,
        fullConfig
      );
    }
    setConfig(config) {
      const needsFlowResize = config.flowMapSize != null && config.flowMapSize !== this.flowMap.size;
      this.config = { ...this.config, ...config };
      this.frameInterval = 1e3 / this.config.fpsCap;
      if (this.config.flowFps != null) {
        this.flowFrameIntervalMs = 1e3 / this.config.flowFps;
      }
      if (needsFlowResize) {
        this.rebuildFlowMap(this.config.flowMapSize);
      }
    }
    rebuildFlowMap(size) {
      const gl = this.gl;
      gl.deleteFramebuffer(this.flowMap.framebuffer);
      gl.deleteTexture(this.flowMap.texture);
      this.flowMap = createFlowMap(gl, size);
    }
    resize(width, height) {
      const gl = this.gl;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = this.config.resolutionScale;
      const w = Math.max(1, Math.floor(width * dpr * scale));
      const h = Math.max(1, Math.floor(height * dpr * scale));
      this.displayWidth = width;
      this.displayHeight = height;
      const canvas = gl.canvas;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    drawQuad() {
      const gl = this.gl;
      if (this.quadVao) {
        gl.bindVertexArray(this.quadVao);
      } else {
        const posLoc = gl.getAttribLocation(this.flowProgram, "a_position");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    draw(params, options) {
      var _a;
      if (this.destroyed) return;
      const gl = this.gl;
      const canvas = gl.canvas;
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      const nowMs = typeof performance !== "undefined" ? performance.now() : 0;
      const time = nowMs / 1e3 - this.startTime;
      const displayAspect = this.displayWidth / Math.max(this.displayHeight, 1);
      const forceFlowUpdate = (_a = options == null ? void 0 : options.forceFlowUpdate) != null ? _a : false;
      const flowDue = forceFlowUpdate || nowMs - this.lastFlowUpdateTimeMs >= this.flowFrameIntervalMs;
      if (flowDue) {
        if (params.uniform_flow_rotation_radians !== this.cachedFlowRotationRadians) {
          this.cachedFlowRotationRadians = params.uniform_flow_rotation_radians;
          const rad = params.uniform_flow_rotation_radians;
          this.cachedFlowRotationCs = [Math.cos(rad), Math.sin(rad)];
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.flowMap.framebuffer);
        gl.viewport(0, 0, this.flowMap.size, this.flowMap.size);
        gl.useProgram(this.flowProgram);
        setFlowUniforms(
          gl,
          this.flowUniforms,
          params,
          time,
          displayAspect,
          this.cachedFlowRotationCs
        );
        this.drawQuad();
        this.lastFlowUpdateTimeMs = nowMs;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasW, canvasH);
      gl.useProgram(this.compositeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.flowMap.texture);
      const compositeParamsUnchanged = this.lastCompositeParamsRef === params && this.lastCompositeCanvasW === canvasW && this.lastCompositeCanvasH === canvasH && this.lastCompositeDpr === dpr;
      if (!compositeParamsUnchanged) {
        setCompositeUniforms(
          gl,
          this.compositeUniforms,
          params,
          canvasW,
          canvasH,
          dpr
        );
        this.lastCompositeParamsRef = params;
        this.lastCompositeCanvasW = canvasW;
        this.lastCompositeCanvasH = canvasH;
        this.lastCompositeDpr = dpr;
      }
      this.drawQuad();
    }
    renderStillFrame(params) {
      this.lastFlowUpdateTimeMs = -this.flowFrameIntervalMs;
      this.draw(params, { forceFlowUpdate: true });
    }
    /** Seconds used for the last flow pass. Used so hover/pause can resume without a time jump. */
    getCurrentTime() {
      const nowMs = typeof performance !== "undefined" ? performance.now() : 0;
      return nowMs / 1e3 - this.startTime;
    }
    setTimeOffsetSeconds(timeOffsetSeconds = 0) {
      const nowSec = (typeof performance !== "undefined" ? performance.now() : 0) / 1e3;
      this.startTime = nowSec - timeOffsetSeconds;
    }
    startLoop(params, options) {
      const nowSec = (typeof performance !== "undefined" ? performance.now() : 0) / 1e3;
      this.startTime = (options == null ? void 0 : options.timeOffsetSeconds) != null ? nowSec - options.timeOffsetSeconds : nowSec;
      const tick = (now) => {
        if (this.destroyed) return;
        this.rafId = requestAnimationFrame(tick);
        const elapsed = now - this.lastFrameTime;
        if (elapsed >= this.frameInterval) {
          this.lastFrameTime = now - elapsed % this.frameInterval;
          this.draw(params());
        }
      };
      this.lastFrameTime = typeof performance !== "undefined" ? performance.now() : 0;
      this.lastFlowUpdateTimeMs = -this.flowFrameIntervalMs;
      this.rafId = requestAnimationFrame(tick);
    }
    start(params, options) {
      this.startLoop(params, options);
    }
    stopLoop() {
      if (this.rafId != null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    stop() {
      this.stopLoop();
    }
    capturePng(params, targetWidth, targetHeight) {
      const gl = this.gl;
      const canvas = gl.canvas;
      const origWidth = canvas.width;
      const origHeight = canvas.height;
      const origDisplayW = this.displayWidth;
      const origDisplayH = this.displayHeight;
      const needResize = canvas.width !== targetWidth || canvas.height !== targetHeight;
      if (needResize) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        this.displayWidth = targetWidth;
        this.displayHeight = targetHeight;
      }
      this.draw(params, { forceFlowUpdate: true });
      const dataUrl = canvas.toDataURL("image/png");
      if (needResize) {
        canvas.width = origWidth;
        canvas.height = origHeight;
        this.displayWidth = origDisplayW;
        this.displayHeight = origDisplayH;
      }
      return dataUrl;
    }
    getCanvas() {
      return this.gl.canvas;
    }
    destroy() {
      this.destroyed = true;
      this.stopLoop();
      const gl = this.gl;
      if (this.quadVao) {
        gl.deleteVertexArray(this.quadVao);
        this.quadVao = null;
      }
      gl.deleteProgram(this.flowProgram);
      gl.deleteProgram(this.compositeProgram);
      gl.deleteFramebuffer(this.flowMap.framebuffer);
      gl.deleteTexture(this.flowMap.texture);
      gl.deleteBuffer(this.positionBuffer);
    }
  };

  // src/types/preset.ts
  var PRESET_VERSION = 1;
  var LEGACY_PRESET_VERSION = "1.0";
  var GRADIENT_ENGINE_ID = "grain-v1";
  var DEFAULT_PRESET_NAME = "Exported";
  var DEFAULT_GRADIENT_PARAMS = {
    uniform_seed: 42,
    uniform_palette_colors_hex: ["#0a0a12", "#1a1a2e", "#2563eb", "#f97316", "#fbbf24"],
    uniform_motion_speed: 0.6,
    uniform_flow_rotation_radians: 0.9,
    uniform_flow_drift_speed_x: 0,
    uniform_flow_drift_speed_y: 0,
    uniform_warp_strength: 0.5,
    uniform_warp_scale: 2.2,
    uniform_turbulence: 0.4,
    uniform_brightness: 1.05,
    uniform_contrast: 1.12,
    uniform_saturation: 1.2,
    uniform_grain_amount: 0.12,
    uniform_grain_size: 1.3,
    uniform_reduce_motion_enabled: 0
  };
  var DEFAULT_PRESET_QUALITY = {
    qualityResolutionScale: 0.75,
    qualityFpsCap: 60,
    qualityFlowMapSize: 384,
    qualityFlowFps: 30
  };

  // src/lib/compact-preset.ts
  var COMPACT_PRESET_PREFIX_G1 = "g1:";
  var COMPACT_PRESET_PREFIX_G2 = "g2:";
  var SCALE = 1e3;
  var QUALITY_DEFAULTS = {
    resolutionScale: DEFAULT_PRESET_QUALITY.qualityResolutionScale,
    fpsCap: DEFAULT_PRESET_QUALITY.qualityFpsCap,
    flowMapSize: DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
    flowFps: DEFAULT_PRESET_QUALITY.qualityFlowFps,
    maxRenderPixels: 35e5
  };
  var FLOW_MAP_SIZE_VALUES = [256, 384, 512];
  var FLOW_FPS_VALUES = [15, 30, 60];
  function decodeUtf8(input) {
    return new TextDecoder().decode(input);
  }
  function fromBase64(input) {
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(input, "base64"));
    }
    const binary = atob(input);
    const output = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      output[index] = binary.charCodeAt(index);
    }
    return output;
  }
  function fromBase64Url(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
    return fromBase64(padded);
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function isCompactPresetString(value) {
    return typeof value === "string" && (value.startsWith(COMPACT_PRESET_PREFIX_G1) || value.startsWith(COMPACT_PRESET_PREFIX_G2));
  }
  function isCompactPresetG1(value) {
    return typeof value === "string" && value.startsWith(COMPACT_PRESET_PREFIX_G1);
  }
  function isCompactPresetG2(value) {
    return typeof value === "string" && value.startsWith(COMPACT_PRESET_PREFIX_G2);
  }
  function decodeCompactPresetV1(compactPreset) {
    if (!isCompactPresetG1(compactPreset)) {
      throw new Error("Unsupported compact preset format.");
    }
    const payloadText = decodeUtf8(
      fromBase64Url(compactPreset.slice(COMPACT_PRESET_PREFIX_G1.length))
    );
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      throw new Error("Invalid compact preset payload.");
    }
    if (!payload || typeof payload !== "object" || !payload.p) {
      throw new Error("Compact preset payload is incomplete.");
    }
    return {
      presetVersion: PRESET_VERSION,
      engineId: GRADIENT_ENGINE_ID,
      name: payload.n,
      params: payload.p,
      exportDefaults: payload.q ? { quality: payload.q } : void 0
    };
  }
  function intToHex(n) {
    const r = (n >> 16 & 255).toString(16).padStart(2, "0");
    const g = (n >> 8 & 255).toString(16).padStart(2, "0");
    const b = (n & 255).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  function decodeQuality(arr) {
    return {
      resolutionScale: clamp(arr[0] / SCALE, 0.5, 1),
      fpsCap: arr[1] >= 1 ? 60 : 30,
      flowMapSize: FLOW_MAP_SIZE_VALUES[clamp(arr[2], 0, 2)],
      flowFps: FLOW_FPS_VALUES[clamp(arr[3], 0, 2)],
      maxRenderPixels: clamp(arr[4], 25e4, 16e6)
    };
  }
  function decodeCompactPresetV2(compactPreset) {
    if (!isCompactPresetG2(compactPreset)) {
      throw new Error("Unsupported compact preset format.");
    }
    const payloadText = decodeUtf8(
      fromBase64Url(compactPreset.slice(COMPACT_PRESET_PREFIX_G2.length))
    );
    let raw;
    try {
      raw = JSON.parse(payloadText);
    } catch (e) {
      throw new Error("Invalid compact preset payload.");
    }
    if (!Array.isArray(raw) || raw.length < 16) {
      throw new Error("Compact preset payload is incomplete.");
    }
    const arr = raw;
    const paletteInts = Array.isArray(arr[1]) ? arr[1] : [];
    const hexColors = paletteInts.slice(0, 6).map(intToHex);
    if (hexColors.length < 3) {
      throw new Error("Compact preset must have at least 3 palette colors.");
    }
    const qualityArr = raw[15] != null && Array.isArray(raw[15]) ? raw[15] : null;
    const params = {
      uniform_seed: clamp(Number(arr[0]), 0, 1e6),
      uniform_palette_colors_hex: hexColors,
      uniform_motion_speed: clamp(Number(arr[2]) / SCALE, 0, 2),
      uniform_flow_rotation_radians: clamp(Number(arr[3]) / SCALE, 0, Math.PI * 2),
      uniform_flow_drift_speed_x: clamp(Number(arr[4]) / SCALE, -0.3, 0.3),
      uniform_flow_drift_speed_y: clamp(Number(arr[5]) / SCALE, -0.3, 0.3),
      uniform_warp_strength: clamp(Number(arr[6]) / SCALE, 0, 1.2),
      uniform_warp_scale: clamp(Number(arr[7]) / SCALE, 0.2, 6),
      uniform_turbulence: clamp(Number(arr[8]) / SCALE, 0, 1),
      uniform_brightness: clamp(Number(arr[9]) / SCALE, 0, 2),
      uniform_contrast: clamp(Number(arr[10]) / SCALE, 0, 2),
      uniform_saturation: clamp(Number(arr[11]) / SCALE, 0, 2),
      uniform_grain_amount: clamp(Number(arr[12]) / SCALE, 0, 0.25),
      uniform_grain_size: clamp(Number(arr[13]) / SCALE, 0.5, 1.6),
      uniform_reduce_motion_enabled: Number(arr[14]) >= 0.5 ? 1 : 0
    };
    return {
      presetVersion: PRESET_VERSION,
      engineId: GRADIENT_ENGINE_ID,
      params,
      exportDefaults: qualityArr != null ? { quality: decodeQuality(qualityArr) } : void 0
    };
  }
  function decodeCompactPreset(compactPreset) {
    if (isCompactPresetG2(compactPreset)) {
      return decodeCompactPresetV2(compactPreset);
    }
    if (isCompactPresetG1(compactPreset)) {
      return decodeCompactPresetV1(compactPreset);
    }
    throw new Error("Unsupported compact preset format.");
  }

  // src/lib/preset.ts
  function isRecord(value) {
    return typeof value === "object" && value !== null;
  }
  function clamp2(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function readString(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  function readRequiredFiniteNumber(value, key) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Preset field "${key}" must be a finite number.`);
    }
    return value;
  }
  function readClampedNumber(value, key, fallback, min, max) {
    if (value == null) {
      return fallback;
    }
    return clamp2(readRequiredFiniteNumber(value, key), min, max);
  }
  function readPaletteColors(value) {
    if (value == null) {
      return [...DEFAULT_GRADIENT_PARAMS.uniform_palette_colors_hex];
    }
    if (!Array.isArray(value)) {
      throw new Error('Preset field "uniform_palette_colors_hex" must be an array.');
    }
    const normalized = value.filter((item) => typeof item === "string").map((color) => color.trim()).filter((color) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)).slice(0, 6);
    if (normalized.length < 3) {
      throw new Error(
        'Preset field "uniform_palette_colors_hex" must contain at least 3 valid hex colors.'
      );
    }
    return normalized;
  }
  function normalizeParams(source) {
    return {
      uniform_seed: readClampedNumber(
        source.uniform_seed,
        "uniform_seed",
        DEFAULT_GRADIENT_PARAMS.uniform_seed,
        0,
        1e6
      ),
      uniform_palette_colors_hex: readPaletteColors(source.uniform_palette_colors_hex),
      uniform_motion_speed: readClampedNumber(
        source.uniform_motion_speed,
        "uniform_motion_speed",
        DEFAULT_GRADIENT_PARAMS.uniform_motion_speed,
        0,
        2
      ),
      uniform_flow_rotation_radians: readClampedNumber(
        source.uniform_flow_rotation_radians,
        "uniform_flow_rotation_radians",
        DEFAULT_GRADIENT_PARAMS.uniform_flow_rotation_radians,
        0,
        Math.PI * 2
      ),
      uniform_flow_drift_speed_x: readClampedNumber(
        source.uniform_flow_drift_speed_x,
        "uniform_flow_drift_speed_x",
        DEFAULT_GRADIENT_PARAMS.uniform_flow_drift_speed_x,
        -0.3,
        0.3
      ),
      uniform_flow_drift_speed_y: readClampedNumber(
        source.uniform_flow_drift_speed_y,
        "uniform_flow_drift_speed_y",
        DEFAULT_GRADIENT_PARAMS.uniform_flow_drift_speed_y,
        -0.3,
        0.3
      ),
      uniform_warp_strength: readClampedNumber(
        source.uniform_warp_strength,
        "uniform_warp_strength",
        DEFAULT_GRADIENT_PARAMS.uniform_warp_strength,
        0,
        1.2
      ),
      uniform_warp_scale: readClampedNumber(
        source.uniform_warp_scale,
        "uniform_warp_scale",
        DEFAULT_GRADIENT_PARAMS.uniform_warp_scale,
        0.2,
        6
      ),
      uniform_turbulence: readClampedNumber(
        source.uniform_turbulence,
        "uniform_turbulence",
        DEFAULT_GRADIENT_PARAMS.uniform_turbulence,
        0,
        1
      ),
      uniform_brightness: readClampedNumber(
        source.uniform_brightness,
        "uniform_brightness",
        DEFAULT_GRADIENT_PARAMS.uniform_brightness,
        0,
        2
      ),
      uniform_contrast: readClampedNumber(
        source.uniform_contrast,
        "uniform_contrast",
        DEFAULT_GRADIENT_PARAMS.uniform_contrast,
        0,
        2
      ),
      uniform_saturation: readClampedNumber(
        source.uniform_saturation,
        "uniform_saturation",
        DEFAULT_GRADIENT_PARAMS.uniform_saturation,
        0,
        2
      ),
      uniform_grain_amount: readClampedNumber(
        source.uniform_grain_amount,
        "uniform_grain_amount",
        DEFAULT_GRADIENT_PARAMS.uniform_grain_amount,
        0,
        0.25
      ),
      uniform_grain_size: readClampedNumber(
        source.uniform_grain_size,
        "uniform_grain_size",
        DEFAULT_GRADIENT_PARAMS.uniform_grain_size,
        0.5,
        1.6
      ),
      uniform_reduce_motion_enabled: readClampedNumber(
        source.uniform_reduce_motion_enabled,
        "uniform_reduce_motion_enabled",
        DEFAULT_GRADIENT_PARAMS.uniform_reduce_motion_enabled,
        0,
        1
      ) >= 0.5 ? 1 : 0
    };
  }
  function normalizeQuality(source) {
    const flowMapSize = readClampedNumber(
      source.flowMapSize,
      "flowMapSize",
      DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
      256,
      512
    );
    const flowFps = readClampedNumber(
      source.flowFps,
      "flowFps",
      DEFAULT_PRESET_QUALITY.qualityFlowFps,
      15,
      60
    );
    return {
      qualityResolutionScale: readClampedNumber(
        source.resolutionScale,
        "resolutionScale",
        DEFAULT_PRESET_QUALITY.qualityResolutionScale,
        0.5,
        1
      ),
      qualityFpsCap: readClampedNumber(
        source.fpsCap,
        "fpsCap",
        DEFAULT_PRESET_QUALITY.qualityFpsCap,
        30,
        60
      ) >= 45 ? 60 : 30,
      qualityFlowMapSize: flowMapSize >= 448 ? 512 : flowMapSize >= 320 ? 384 : 256,
      qualityFlowFps: flowFps >= 45 ? 60 : flowFps >= 22.5 ? 30 : 15
    };
  }
  function normalizeCanonicalPreset(source) {
    const presetVersion = source.presetVersion;
    if (presetVersion !== PRESET_VERSION) {
      throw new Error(
        `Unsupported presetVersion "${String(presetVersion)}". Expected "${PRESET_VERSION}".`
      );
    }
    const engineId = source.engineId;
    if (engineId !== GRADIENT_ENGINE_ID) {
      throw new Error(
        `Unsupported engineId "${String(engineId)}". Expected "${GRADIENT_ENGINE_ID}".`
      );
    }
    const paramsSource = source.params;
    if (!isRecord(paramsSource)) {
      throw new Error('Preset field "params" must be an object.');
    }
    const exportDefaults = isRecord(source.exportDefaults) ? source.exportDefaults : {};
    const qualitySource = isRecord(exportDefaults.quality) ? exportDefaults.quality : {};
    const quality = normalizeQuality(qualitySource);
    return {
      presetVersion: PRESET_VERSION,
      engineId: GRADIENT_ENGINE_ID,
      name: readString(source.name, DEFAULT_PRESET_NAME),
      params: normalizeParams(paramsSource),
      exportDefaults: {
        quality: {
          resolutionScale: quality.qualityResolutionScale,
          fpsCap: quality.qualityFpsCap,
          flowMapSize: quality.qualityFlowMapSize,
          flowFps: quality.qualityFlowFps,
          maxRenderPixels: readClampedNumber(
            qualitySource.maxRenderPixels,
            "maxRenderPixels",
            35e5,
            25e4,
            16e6
          )
        }
      }
    };
  }
  function normalizeLegacyPreset(source) {
    const presetVersion = readString(source.preset_version, LEGACY_PRESET_VERSION);
    if (presetVersion !== LEGACY_PRESET_VERSION) {
      throw new Error(
        `Unsupported preset_version "${presetVersion}". Expected "${LEGACY_PRESET_VERSION}".`
      );
    }
    const legacySource = {
      resolutionScale: source.quality_resolution_scale,
      fpsCap: source.quality_fps_cap,
      flowMapSize: source.quality_flow_map_size,
      flowFps: source.quality_flow_fps
    };
    const quality = normalizeQuality(legacySource);
    return {
      presetVersion: PRESET_VERSION,
      engineId: GRADIENT_ENGINE_ID,
      name: readString(source.preset_name, DEFAULT_PRESET_NAME),
      params: normalizeParams(source),
      exportDefaults: {
        quality: {
          resolutionScale: quality.qualityResolutionScale,
          fpsCap: quality.qualityFpsCap,
          flowMapSize: quality.qualityFlowMapSize,
          flowFps: quality.qualityFlowFps
        }
      }
    };
  }
  function normalizePreset(rawPreset) {
    if (isCompactPresetString(rawPreset)) {
      return normalizeCanonicalPreset(
        decodeCompactPreset(rawPreset)
      );
    }
    if (!isRecord(rawPreset)) {
      throw new Error("Preset JSON must be an object.");
    }
    if ("presetVersion" in rawPreset || "params" in rawPreset || "engineId" in rawPreset) {
      return normalizeCanonicalPreset(rawPreset);
    }
    return normalizeLegacyPreset(rawPreset);
  }
  function getPresetQualityDefaults(preset) {
    var _a, _b, _c, _d, _e;
    const quality = (_a = preset == null ? void 0 : preset.exportDefaults) == null ? void 0 : _a.quality;
    return {
      qualityResolutionScale: (_b = quality == null ? void 0 : quality.resolutionScale) != null ? _b : DEFAULT_PRESET_QUALITY.qualityResolutionScale,
      qualityFpsCap: (_c = quality == null ? void 0 : quality.fpsCap) != null ? _c : DEFAULT_PRESET_QUALITY.qualityFpsCap,
      qualityFlowMapSize: (_d = quality == null ? void 0 : quality.flowMapSize) != null ? _d : DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
      qualityFlowFps: (_e = quality == null ? void 0 : quality.flowFps) != null ? _e : DEFAULT_PRESET_QUALITY.qualityFlowFps
    };
  }

  // src/engine/runtime-modes.ts
  var DEFAULT_MAX_RENDER_PIXELS = 35e5;
  function clamp3(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function quantizeFlowMapSize(size) {
    if (size >= 448) {
      return 512;
    }
    if (size >= 320) {
      return 384;
    }
    return 256;
  }
  function quantizeFlowFps(flowFps) {
    if (flowFps >= 45) {
      return 60;
    }
    if (flowFps >= 22.5) {
      return 30;
    }
    return 15;
  }
  function resolveBaseMountOptions(preset, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const presetQuality = getPresetQualityDefaults(preset);
    const presetMaxRenderPixels = (_b = (_a = preset.exportDefaults) == null ? void 0 : _a.quality) == null ? void 0 : _b.maxRenderPixels;
    return {
      mode: "animated",
      resolutionScale: clamp3(
        (_c = options == null ? void 0 : options.resolutionScale) != null ? _c : presetQuality.qualityResolutionScale,
        0.5,
        1
      ),
      fpsCap: ((_d = options == null ? void 0 : options.fpsCap) != null ? _d : presetQuality.qualityFpsCap) >= 45 ? 60 : 30,
      flowMapSize: quantizeFlowMapSize(
        clamp3((_e = options == null ? void 0 : options.flowMapSize) != null ? _e : presetQuality.qualityFlowMapSize, 256, 512)
      ),
      flowFps: quantizeFlowFps(
        clamp3((_f = options == null ? void 0 : options.flowFps) != null ? _f : presetQuality.qualityFlowFps, 15, 60)
      ),
      maxRenderPixels: Math.round(
        clamp3((_h = (_g = options == null ? void 0 : options.maxRenderPixels) != null ? _g : presetMaxRenderPixels) != null ? _h : DEFAULT_MAX_RENDER_PIXELS, 25e4, 16e6)
      ),
      respectReducedMotion: (_i = options == null ? void 0 : options.respectReducedMotion) != null ? _i : true,
      pauseWhenHidden: (_j = options == null ? void 0 : options.pauseWhenHidden) != null ? _j : true,
      pauseWhenOffscreen: (_k = options == null ? void 0 : options.pauseWhenOffscreen) != null ? _k : true
    };
  }
  function resolveMountOptions(preset, options) {
    var _a;
    const baseOptions = resolveBaseMountOptions(preset, options);
    return {
      ...baseOptions,
      mode: (_a = options == null ? void 0 : options.mode) != null ? _a : "animated"
    };
  }
  function resolveSharedMountOptions(preset, options) {
    var _a, _b;
    const baseOptions = resolveBaseMountOptions(preset, options);
    return {
      ...baseOptions,
      mode: (_a = options == null ? void 0 : options.mode) != null ? _a : "animated",
      frameTransport: (_b = options == null ? void 0 : options.frameTransport) != null ? _b : "auto"
    };
  }
  function shouldAnimate(mode, state, options) {
    if (state.manuallyPaused) {
      return false;
    }
    if (options.respectReducedMotion && state.reducedMotion) {
      return false;
    }
    if (options.pauseWhenHidden && !state.visible) {
      return false;
    }
    if (mode === "static") {
      return false;
    }
    if (options.pauseWhenOffscreen && !state.inView) {
      return false;
    }
    if (mode === "hover") {
      return state.hovered;
    }
    return true;
  }

  // src/engine/runtime-dom.ts
  function restoreInlineStyle(style, property, previousValue) {
    if (previousValue) {
      style[property] = previousValue;
      return;
    }
    style.removeProperty(property);
  }
  function resolveTarget(target) {
    if (typeof target === "string") {
      const element = document.querySelector(target);
      if (!element) {
        throw new Error(`Gradient target "${target}" was not found.`);
      }
      return element;
    }
    return target;
  }
  function ensureContainerStyles(target) {
    const computed = window.getComputedStyle(target);
    const previousPosition = target.style.position;
    const previousOverflow = target.style.overflow;
    const changedPosition = computed.position === "static";
    const changedOverflow = computed.overflow === "visible";
    if (changedPosition) {
      target.style.position = "relative";
    }
    if (changedOverflow) {
      target.style.overflow = "hidden";
    }
    return {
      restore() {
        if (changedPosition) {
          restoreInlineStyle(target.style, "position", previousPosition);
        }
        if (changedOverflow) {
          restoreInlineStyle(target.style, "overflow", previousOverflow);
        }
      }
    };
  }
  function createLayer(target) {
    const layer = document.createElement("div");
    layer.dataset.gradientLayer = "true";
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;";
    target.prepend(layer);
    return layer;
  }
  function createCanvas(layer) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    layer.appendChild(canvas);
    return canvas;
  }
  function readTargetSize(target) {
    const rect = target.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width || target.clientWidth || window.innerWidth)),
      height: Math.max(1, Math.round(rect.height || target.clientHeight || window.innerHeight))
    };
  }

  // src/engine/shared-gradient-runtime.ts
  function isIterable(value) {
    return !!value && typeof value[Symbol.iterator] === "function";
  }
  function isArrayLike(value) {
    return !!value && typeof value === "object" && "length" in value;
  }
  function normalizeElements(elements) {
    return Array.from(elements).filter((element) => element instanceof HTMLElement);
  }
  function resolveSharedTargets(targetInput) {
    if (typeof targetInput === "string") {
      return {
        elements: normalizeElements(document.querySelectorAll(targetInput)),
        selector: targetInput
      };
    }
    if (targetInput instanceof HTMLElement) {
      return { elements: [targetInput], selector: null };
    }
    if (isIterable(targetInput) || isArrayLike(targetInput)) {
      return { elements: normalizeElements(targetInput), selector: null };
    }
    return { elements: [], selector: null };
  }
  function getGroupState(manuallyPaused, slots) {
    const inView = slots.some((slot) => slot.inView);
    return {
      hovered: false,
      inView,
      visible: !document.hidden,
      reducedMotion: typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
      manuallyPaused
    };
  }
  function createSharedSource() {
    var _a;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas2 = new OffscreenCanvas(1, 1);
      const renderer2 = GradientRenderer.create(canvas2);
      return {
        backend: "offscreen",
        canvas: canvas2,
        renderer: renderer2,
        destroy() {
          renderer2.destroy();
        }
      };
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.dataset.gradientSharedSource = "true";
    canvas.style.cssText = "position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    (_a = document.body) == null ? void 0 : _a.appendChild(canvas);
    const renderer = GradientRenderer.create(canvas);
    return {
      backend: "dom",
      canvas,
      renderer,
      destroy() {
        renderer.destroy();
        canvas.remove();
      }
    };
  }
  function readBucketedSize(slot) {
    const width = Math.max(1, Math.ceil(slot.width / 64) * 64);
    const height = Math.max(1, Math.ceil(slot.height / 64) * 64);
    return { width, height };
  }
  function createSlot(target) {
    const styleCleanup = ensureContainerStyles(target);
    const layer = createLayer(target);
    const canvas = createCanvas(layer);
    const context2d = canvas.getContext("2d");
    const size = readTargetSize(target);
    return {
      target,
      layer,
      canvas,
      context2d,
      bitmapRenderer: null,
      width: size.width,
      height: size.height,
      inView: true,
      styleCleanup,
      resizeObserver: null,
      intersectionObserver: null,
      presentationMode: "2d"
    };
  }
  function destroySlot(slot) {
    var _a, _b;
    (_a = slot.resizeObserver) == null ? void 0 : _a.disconnect();
    (_b = slot.intersectionObserver) == null ? void 0 : _b.disconnect();
    slot.layer.remove();
    slot.styleCleanup.restore();
  }
  function ensureSlotCanvasMode(slot, mode) {
    if (slot.presentationMode === mode) {
      return;
    }
    slot.canvas.remove();
    const nextCanvas = createCanvas(slot.layer);
    slot.canvas = nextCanvas;
    slot.presentationMode = mode;
    slot.context2d = null;
    slot.bitmapRenderer = null;
    if (mode === "bitmaprenderer") {
      slot.bitmapRenderer = nextCanvas.getContext("bitmaprenderer");
      if (slot.bitmapRenderer) {
        return;
      }
    }
    slot.presentationMode = "2d";
    slot.context2d = nextCanvas.getContext("2d");
  }
  function resizeSlotCanvas(slot) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(slot.width * dpr));
    const height = Math.max(1, Math.round(slot.height * dpr));
    if (slot.canvas.width !== width || slot.canvas.height !== height) {
      slot.canvas.width = width;
      slot.canvas.height = height;
    }
  }
  function resolveFrameTransport(strategy, source, slots) {
    if (strategy === "2d") {
      return "2d";
    }
    if (source.backend === "offscreen" && slots.length === 1) {
      return "bitmaprenderer";
    }
    return "2d";
  }
  function mountSharedGradient(targetInput, presetInput, initialOptions) {
    const source = createSharedSource();
    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let preset = normalizePreset(presetInput);
    let options = resolveSharedMountOptions(preset, initialOptions);
    let currentTargets = resolveSharedTargets(targetInput);
    const slots = /* @__PURE__ */ new Map();
    let destroyed = false;
    let manuallyPaused = false;
    let loopActive = false;
    let rafId = null;
    let refreshRafId = null;
    let lastFrameTimeMs = 0;
    let lastAnimationTimeSeconds = 0;
    let hasPresentedFrame = false;
    let pendingRender = true;
    let sourceWidth = 1;
    let sourceHeight = 1;
    const warnIfEmpty = () => {
      if (currentTargets.selector && slots.size === 0) {
        console.warn(`Gradient shared target "${currentTargets.selector}" was not found.`);
      }
    };
    const getSlots = () => Array.from(slots.values()).filter((slot) => slot.target.isConnected);
    const getEffectiveMode = () => options.mode;
    const computeSourceSize = (candidateSlots) => {
      const measuredSlots = candidateSlots.length > 0 ? candidateSlots : getSlots();
      if (measuredSlots.length === 0) {
        return { width: 1, height: 1 };
      }
      const largest = measuredSlots.reduce(
        (max, slot) => {
          const bucketed = readBucketedSize(slot);
          return {
            width: Math.max(max.width, bucketed.width),
            height: Math.max(max.height, bucketed.height)
          };
        },
        { width: 1, height: 1 }
      );
      return largest;
    };
    const ensureSourceSize = (candidateSlots) => {
      const nextSize = computeSourceSize(candidateSlots);
      const shouldGrow = nextSize.width > sourceWidth || nextSize.height > sourceHeight;
      const shouldShrink = nextSize.width < sourceWidth * 0.75 || nextSize.height < sourceHeight * 0.75;
      if (!shouldGrow && !shouldShrink && hasPresentedFrame) {
        return;
      }
      sourceWidth = nextSize.width;
      sourceHeight = nextSize.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scaledWidth = sourceWidth * dpr * options.resolutionScale;
      const scaledHeight = sourceHeight * dpr * options.resolutionScale;
      const pixelCount = scaledWidth * scaledHeight;
      const safetyScale = pixelCount > options.maxRenderPixels ? Math.sqrt(options.maxRenderPixels / pixelCount) : 1;
      source.renderer.setConfig({
        resolutionScale: Math.max(0.25, options.resolutionScale * safetyScale),
        fpsCap: options.fpsCap,
        flowMapSize: options.flowMapSize,
        flowFps: options.flowFps
      });
      source.renderer.resize(sourceWidth, sourceHeight);
    };
    const getDisplaySlots = () => {
      const connectedSlots = getSlots();
      if (connectedSlots.length === 0) {
        return connectedSlots;
      }
      const visibleSlots = connectedSlots.filter((slot) => slot.inView);
      const preferredSlots = visibleSlots.length > 0 ? visibleSlots : connectedSlots;
      return preferredSlots;
    };
    const renderToSlots = (displaySlots) => {
      var _a;
      if (displaySlots.length === 0) {
        return;
      }
      const desiredMode = resolveFrameTransport(options.frameTransport, source, displaySlots);
      for (const slot of displaySlots) {
        ensureSlotCanvasMode(slot, desiredMode);
        resizeSlotCanvas(slot);
      }
      if (desiredMode === "bitmaprenderer" && source.backend === "offscreen" && displaySlots.length === 1) {
        const slot = displaySlots[0];
        const bitmapRenderer = slot.bitmapRenderer;
        if (bitmapRenderer) {
          const bitmap = source.canvas.transferToImageBitmap();
          bitmapRenderer.transferFromImageBitmap(bitmap);
          return;
        }
      }
      for (const slot of displaySlots) {
        const context = (_a = slot.context2d) != null ? _a : slot.canvas.getContext("2d");
        slot.context2d = context;
        if (!context) {
          continue;
        }
        context.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
        context.drawImage(
          source.canvas,
          0,
          0,
          slot.canvas.width,
          slot.canvas.height
        );
      }
    };
    const renderFrame = (forceFlowUpdate) => {
      const displaySlots = getDisplaySlots();
      const sizeSlots = displaySlots.length > 0 ? displaySlots : getSlots();
      ensureSourceSize(sizeSlots);
      source.renderer.draw(preset.params, { forceFlowUpdate });
      renderToSlots(displaySlots);
      hasPresentedFrame = true;
    };
    const stopLoop = () => {
      if (loopActive) {
        lastAnimationTimeSeconds = source.renderer.getCurrentTime();
      }
      loopActive = false;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const shouldLoop = (mode) => {
      const activeSlots = getSlots();
      if (activeSlots.length === 0) {
        return false;
      }
      return shouldAnimate(mode, getGroupState(manuallyPaused, activeSlots), options);
    };
    const scheduleTick = () => {
      if (!loopActive || rafId != null || destroyed) {
        return;
      }
      rafId = requestAnimationFrame((now) => {
        rafId = null;
        if (destroyed || !loopActive) {
          return;
        }
        const effectiveMode = getEffectiveMode();
        if (!shouldLoop(effectiveMode)) {
          stopLoop();
          return;
        }
        const frameInterval = 1e3 / options.fpsCap;
        if (lastFrameTimeMs === 0 || now - lastFrameTimeMs >= frameInterval) {
          lastFrameTimeMs = now;
          renderFrame(false);
        }
        scheduleTick();
      });
    };
    const startLoop = () => {
      if (loopActive) {
        scheduleTick();
        return;
      }
      loopActive = true;
      lastFrameTimeMs = 0;
      source.renderer.setTimeOffsetSeconds(lastAnimationTimeSeconds);
      scheduleTick();
    };
    const removeMissingSlots = (nextElements) => {
      const nextSet = new Set(nextElements);
      for (const [element, slot] of slots.entries()) {
        if (nextSet.has(element) && element.isConnected) {
          continue;
        }
        destroySlot(slot);
        slots.delete(element);
      }
    };
    const addNewSlots = (elements) => {
      for (const element of elements) {
        if (slots.has(element)) {
          continue;
        }
        const slot = createSlot(element);
        if (typeof ResizeObserver !== "undefined") {
          slot.resizeObserver = new ResizeObserver(() => {
            const size = readTargetSize(slot.target);
            slot.width = size.width;
            slot.height = size.height;
            pendingRender = true;
            scheduleRefresh();
          });
          slot.resizeObserver.observe(slot.target);
        }
        if (typeof IntersectionObserver !== "undefined") {
          slot.intersectionObserver = new IntersectionObserver(
            (entries) => {
              var _a;
              slot.inView = !!((_a = entries[0]) == null ? void 0 : _a.isIntersecting);
              scheduleRefresh();
            },
            { threshold: 0.01 }
          );
          slot.intersectionObserver.observe(slot.target);
        }
        slots.set(element, slot);
      }
    };
    const syncTargets = () => {
      currentTargets = resolveSharedTargets(targetInput);
      removeMissingSlots(currentTargets.elements);
      addNewSlots(currentTargets.elements);
      for (const slot of slots.values()) {
        const size = readTargetSize(slot.target);
        slot.width = size.width;
        slot.height = size.height;
      }
      warnIfEmpty();
    };
    function scheduleRefresh() {
      if (destroyed || refreshRafId != null) {
        return;
      }
      refreshRafId = requestAnimationFrame(() => {
        refreshRafId = null;
        if (destroyed) {
          return;
        }
        syncTargets();
        const effectiveMode = getEffectiveMode();
        if (shouldLoop(effectiveMode)) {
          startLoop();
          if (pendingRender || !hasPresentedFrame) {
            renderFrame(true);
            pendingRender = false;
          }
          return;
        }
        stopLoop();
        if (pendingRender || !hasPresentedFrame) {
          source.renderer.setTimeOffsetSeconds(lastAnimationTimeSeconds);
          renderFrame(true);
          pendingRender = false;
        }
      });
    }
    const handleVisibilityChange = () => {
      scheduleRefresh();
    };
    const handleReducedMotionChange = () => {
      scheduleRefresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleReducedMotionChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleReducedMotionChange);
      }
    }
    syncTargets();
    scheduleRefresh();
    return {
      updatePreset(nextPreset) {
        preset = normalizePreset(nextPreset);
        options = resolveSharedMountOptions(preset, options);
        pendingRender = true;
        scheduleRefresh();
      },
      updateOptions(nextOptions) {
        options = resolveSharedMountOptions(preset, { ...options, ...nextOptions });
        pendingRender = true;
        syncTargets();
        scheduleRefresh();
      },
      rescan() {
        pendingRender = true;
        syncTargets();
        scheduleRefresh();
      },
      resize() {
        for (const slot of slots.values()) {
          const size = readTargetSize(slot.target);
          slot.width = size.width;
          slot.height = size.height;
        }
        pendingRender = true;
        scheduleRefresh();
      },
      renderStill() {
        stopLoop();
        source.renderer.setTimeOffsetSeconds(lastAnimationTimeSeconds);
        renderFrame(true);
        pendingRender = false;
      },
      pause() {
        manuallyPaused = true;
        scheduleRefresh();
      },
      resume() {
        manuallyPaused = false;
        pendingRender = true;
        scheduleRefresh();
      },
      /**
       * Tear down the shared renderer and every presentation slot in one pass.
       */
      destroy() {
        if (destroyed) {
          return;
        }
        destroyed = true;
        stopLoop();
        if (refreshRafId != null) {
          cancelAnimationFrame(refreshRafId);
          refreshRafId = null;
        }
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (mediaQuery) {
          if (typeof mediaQuery.removeEventListener === "function") {
            mediaQuery.removeEventListener("change", handleReducedMotionChange);
          } else if (typeof mediaQuery.removeListener === "function") {
            mediaQuery.removeListener(handleReducedMotionChange);
          }
        }
        for (const slot of slots.values()) {
          destroySlot(slot);
        }
        slots.clear();
        source.destroy();
      }
    };
  }

  // src/engine/gradient-runtime.ts
  function getRuntimeState() {
    return {
      hovered: false,
      inView: true,
      visible: !document.hidden,
      reducedMotion: typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
      manuallyPaused: false
    };
  }
  function mountGradient(targetInput, presetInput, initialOptions) {
    const target = resolveTarget(targetInput);
    const styleCleanup = ensureContainerStyles(target);
    const layer = createLayer(target);
    const canvas = createCanvas(layer);
    const renderer = GradientRenderer.create(canvas);
    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let preset = normalizePreset(presetInput);
    let options = resolveMountOptions(preset, initialOptions);
    let state = getRuntimeState();
    let resizeObserver = null;
    let intersectionObserver = null;
    let destroyed = false;
    let hoverListenersAttached = false;
    let lastAnimationTimeSeconds = 0;
    const applyRendererConfig = () => {
      const { width, height } = readTargetSize(target);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scaledWidth = width * dpr * options.resolutionScale;
      const scaledHeight = height * dpr * options.resolutionScale;
      const pixelCount = scaledWidth * scaledHeight;
      const safetyScale = pixelCount > options.maxRenderPixels ? Math.sqrt(options.maxRenderPixels / pixelCount) : 1;
      renderer.setConfig({
        resolutionScale: Math.max(0.25, options.resolutionScale * safetyScale),
        fpsCap: options.fpsCap,
        flowMapSize: options.flowMapSize,
        flowFps: options.flowFps
      });
      renderer.resize(width, height);
    };
    const syncHoverListeners = () => {
      const needsHoverListeners = options.mode === "hover";
      if (needsHoverListeners && !hoverListenersAttached) {
        target.addEventListener("pointerenter", handlePointerEnter);
        target.addEventListener("pointerleave", handlePointerLeave);
        target.addEventListener("focusin", handleFocusIn);
        target.addEventListener("focusout", handleFocusOut);
        hoverListenersAttached = true;
        return;
      }
      if (!needsHoverListeners && hoverListenersAttached) {
        target.removeEventListener("pointerenter", handlePointerEnter);
        target.removeEventListener("pointerleave", handlePointerLeave);
        target.removeEventListener("focusin", handleFocusIn);
        target.removeEventListener("focusout", handleFocusOut);
        hoverListenersAttached = false;
        state.hovered = false;
      }
    };
    const syncLoopState = () => {
      if (destroyed) {
        return;
      }
      applyRendererConfig();
      syncHoverListeners();
      const animate = shouldAnimate(options.mode, state, options);
      if (!animate && options.mode === "hover") {
        lastAnimationTimeSeconds = renderer.getCurrentTime();
      }
      renderer.stop();
      if (animate) {
        renderer.start(() => preset.params, {
          timeOffsetSeconds: options.mode === "hover" ? lastAnimationTimeSeconds : void 0
        });
        return;
      }
      renderer.renderStillFrame(preset.params);
    };
    const handleResize = () => {
      syncLoopState();
    };
    function handlePointerEnter() {
      state = { ...state, hovered: true };
      syncLoopState();
    }
    function handlePointerLeave() {
      state = { ...state, hovered: false };
      syncLoopState();
    }
    function handleFocusIn() {
      state = { ...state, hovered: true };
      syncLoopState();
    }
    function handleFocusOut() {
      state = { ...state, hovered: false };
      syncLoopState();
    }
    const handleVisibilityChange = () => {
      state = { ...state, visible: !document.hidden };
      syncLoopState();
    };
    const handleReducedMotionChange = (event) => {
      state = { ...state, reducedMotion: event.matches };
      syncLoopState();
    };
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(target);
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          var _a;
          state = { ...state, inView: !!((_a = entries[0]) == null ? void 0 : _a.isIntersecting) };
          syncLoopState();
        },
        { threshold: 0.01 }
      );
      intersectionObserver.observe(target);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleReducedMotionChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleReducedMotionChange);
      }
    }
    syncLoopState();
    return {
      updatePreset(nextPreset) {
        preset = normalizePreset(nextPreset);
        options = resolveMountOptions(preset, options);
        syncLoopState();
      },
      updateOptions(nextOptions) {
        options = resolveMountOptions(preset, { ...options, ...nextOptions });
        syncLoopState();
      },
      resize() {
        syncLoopState();
      },
      renderStill() {
        renderer.stop();
        renderer.renderStillFrame(preset.params);
      },
      pause() {
        state = { ...state, manuallyPaused: true };
        syncLoopState();
      },
      resume() {
        state = { ...state, manuallyPaused: false };
        syncLoopState();
      },
      /**
       * Disconnect observers, remove listeners, and release the WebGL renderer.
       */
      destroy() {
        if (destroyed) {
          return;
        }
        destroyed = true;
        renderer.stop();
        renderer.destroy();
        resizeObserver == null ? void 0 : resizeObserver.disconnect();
        intersectionObserver == null ? void 0 : intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (hoverListenersAttached) {
          target.removeEventListener("pointerenter", handlePointerEnter);
          target.removeEventListener("pointerleave", handlePointerLeave);
          target.removeEventListener("focusin", handleFocusIn);
          target.removeEventListener("focusout", handleFocusOut);
        }
        if (mediaQuery) {
          if (typeof mediaQuery.removeEventListener === "function") {
            mediaQuery.removeEventListener("change", handleReducedMotionChange);
          } else if (typeof mediaQuery.removeListener === "function") {
            mediaQuery.removeListener(handleReducedMotionChange);
          }
        }
        layer.remove();
        styleCleanup.restore();
      }
    };
  }
  var Gradient = {
    mount: mountGradient,
    mountShared(targetInput, presetInput, initialOptions) {
      return mountSharedGradient(targetInput, presetInput, initialOptions);
    }
  };

  // src/builds/global.ts
  if (typeof window !== "undefined") {
    window.Gradient = Gradient;
  }
})();

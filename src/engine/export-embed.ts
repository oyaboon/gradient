/**
 * Generate the shared browser runtime distributed to developer exports.
 * The runtime is downloaded once per project and reused by short mount snippets.
 */

import {
  VERTEX_SOURCE,
  FLOW_FRAGMENT_SOURCE,
  COMPOSITE_FRAGMENT_SOURCE,
} from "./shaders";

export const RUNTIME_FILENAME = "gradient-runtime.js";

export function generateRuntimeJavascript(): string {
  const vertexStr = JSON.stringify(VERTEX_SOURCE);
  const flowFragStr = JSON.stringify(FLOW_FRAGMENT_SOURCE);
  const compositeFragStr = JSON.stringify(COMPOSITE_FRAGMENT_SOURCE);

  const scriptContent = `
(function() {
  var vertexSource = ${vertexStr};
  var flowFragSource = ${flowFragStr};
  var compositeFragSource = ${compositeFragStr};
  var DEFAULT_MAX_RENDER_PIXELS = 3500000;

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function ensureMountStyles(container) {
    if (!(container instanceof HTMLElement)) return;
    var computed = window.getComputedStyle(container);
    if (computed.position === "static") {
      container.style.position = "relative";
    }
    if (computed.overflow === "visible") {
      container.style.overflow = "hidden";
    }
  }

  function createLayer(container) {
    var layer = document.createElement("div");
    layer.setAttribute("data-gradient-layer", "true");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;";
    container.prepend(layer);
    return layer;
  }

  function createCanvas(layer) {
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    layer.appendChild(canvas);
    return canvas;
  }

  function chooseAutoMode(width, height) {
    var area = width * height;
    if (area <= 140000) return "static";
    if (area <= 700000) return "inView";
    return "animated";
  }

  function quantizeFlowMapSize(value) {
    if (value >= 448) return 512;
    if (value >= 320) return 384;
    return 256;
  }

  function quantizeFlowFps(value) {
    if (value >= 45) return 60;
    if (value >= 22.5) return 30;
    return 15;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizePreset(rawPreset) {
    if (!rawPreset || typeof rawPreset !== "object") {
      throw new Error("Preset must be an object.");
    }

    if (rawPreset.presetVersion !== 1 || rawPreset.engineId !== "grain-v1" || !rawPreset.params) {
      throw new Error("Unsupported preset format.");
    }

    return rawPreset;
  }

  function resolveMountOptions(preset, userOptions) {
    var exportDefaults = (preset.exportDefaults && preset.exportDefaults.quality) || {};
    var options = userOptions || {};
    return {
      mode: options.mode || "auto",
      resolutionScale: clamp(
        options.resolutionScale != null ? options.resolutionScale : (exportDefaults.resolutionScale != null ? exportDefaults.resolutionScale : 0.75),
        0.5,
        1
      ),
      fpsCap: (options.fpsCap != null ? options.fpsCap : exportDefaults.fpsCap) >= 45 ? 60 : 30,
      flowMapSize: quantizeFlowMapSize(clamp(
        options.flowMapSize != null ? options.flowMapSize : (exportDefaults.flowMapSize != null ? exportDefaults.flowMapSize : 384),
        256,
        512
      )),
      flowFps: quantizeFlowFps(clamp(
        options.flowFps != null ? options.flowFps : (exportDefaults.flowFps != null ? exportDefaults.flowFps : 30),
        15,
        60
      )),
      maxRenderPixels: Math.round(clamp(
        options.maxRenderPixels != null ? options.maxRenderPixels : (exportDefaults.maxRenderPixels != null ? exportDefaults.maxRenderPixels : DEFAULT_MAX_RENDER_PIXELS),
        250000,
        16000000
      )),
      respectReducedMotion: options.respectReducedMotion !== false,
      pauseWhenHidden: options.pauseWhenHidden !== false,
      pauseWhenOffscreen: options.pauseWhenOffscreen !== false
    };
  }

  function resolveSharedMountOptions(preset, userOptions) {
    var base = resolveMountOptions(preset, userOptions);
    var options = userOptions || {};
    return Object.assign({}, base, {
      copyStrategy: options.copyStrategy || "auto",
      updateTargetsOnMutation: options.updateTargetsOnMutation === true,
      selectorRoot: options.selectorRoot || document,
      onlyVisibleSlots: options.onlyVisibleSlots !== false,
      maxActiveSlots:
        options.maxActiveSlots != null && isFinite(options.maxActiveSlots)
          ? Math.max(1, Math.round(options.maxActiveSlots))
          : Infinity
    });
  }

  function resolveTargetList(targetInput, selectorRoot) {
    if (typeof targetInput === "string") {
      var root = selectorRoot && typeof selectorRoot.querySelectorAll === "function"
        ? selectorRoot
        : document;
      return Array.prototype.slice.call(root.querySelectorAll(targetInput)).filter(function(node) {
        return node && node.nodeType === 1;
      });
    }

    if (targetInput && targetInput.nodeType === 1) {
      return [targetInput];
    }

    if (!targetInput) {
      return [];
    }

    try {
      return Array.prototype.slice.call(targetInput).filter(function(node) {
        return node && node.nodeType === 1;
      });
    } catch (_error) {
      return [];
    }
  }

  function readElementSize(target) {
    var rect = target.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width || target.clientWidth || window.innerWidth)),
      height: Math.max(1, Math.round(rect.height || target.clientHeight || window.innerHeight))
    };
  }

  function mountGradient(targetInput, rawPreset, userOptions) {
    var target = resolveTarget(targetInput);
    if (!target) throw new Error("Gradient target was not found.");
    ensureMountStyles(target);

    var preset = normalizePreset(rawPreset);
    var params = preset.params;
    var options = resolveMountOptions(preset, userOptions);
    var layer = createLayer(target);
    var canvas = createCanvas(layer);

    var gl = canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      antialias: false
    });

    if (!gl) {
      throw new Error("WebGL2 is unavailable.");
    }

    function compileShader(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed.");
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
        throw new Error(gl.getProgramInfoLog(prog) || "Program link failed.");
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return prog;
    }

    function hexToRgb(hex) {
      var normalized = hex.replace(/^#/, "");
      if (normalized.length === 3) {
        normalized = normalized[0] + normalized[0] +
          normalized[1] + normalized[1] +
          normalized[2] + normalized[2];
      }
      var n = parseInt(normalized, 16);
      return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    var flowProgram = buildProgram(vertexSource, flowFragSource);
    var compositeProgram = buildProgram(vertexSource, compositeFragSource);
    var quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    gl.getExtension("EXT_color_buffer_float");
    var flowMapSize = options.flowMapSize;
    var flowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, flowTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, flowMapSize, flowMapSize, 0, gl.RGBA, gl.HALF_FLOAT, null);

    var flowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, flowFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, flowMapSize, flowMapSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowTexture, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    var flowLoc = {
      u_time: gl.getUniformLocation(flowProgram, "uniform_time_seconds"),
      u_aspect: gl.getUniformLocation(flowProgram, "uniform_display_aspect"),
      u_seed: gl.getUniformLocation(flowProgram, "uniform_seed"),
      u_motion_speed: gl.getUniformLocation(flowProgram, "uniform_motion_speed"),
      u_flow_cs: gl.getUniformLocation(flowProgram, "uniform_flow_rotation_cs"),
      u_drift_x: gl.getUniformLocation(flowProgram, "uniform_flow_drift_speed_x"),
      u_drift_y: gl.getUniformLocation(flowProgram, "uniform_flow_drift_speed_y"),
      u_warp_str: gl.getUniformLocation(flowProgram, "uniform_warp_strength"),
      u_warp_scale: gl.getUniformLocation(flowProgram, "uniform_warp_scale"),
      u_turbulence: gl.getUniformLocation(flowProgram, "uniform_turbulence"),
      u_reduce_motion: gl.getUniformLocation(flowProgram, "uniform_reduce_motion_enabled")
    };

    var compLoc = {
      u_flow_map: gl.getUniformLocation(compositeProgram, "uniform_flow_map"),
      u_res: gl.getUniformLocation(compositeProgram, "uniform_canvas_resolution_pixels"),
      u_dpr: gl.getUniformLocation(compositeProgram, "uniform_device_pixel_ratio"),
      u_seed: gl.getUniformLocation(compositeProgram, "uniform_seed"),
      u_palette_count: gl.getUniformLocation(compositeProgram, "uniform_palette_color_count"),
      u_palette: gl.getUniformLocation(compositeProgram, "uniform_palette_colors_rgb"),
      u_brightness: gl.getUniformLocation(compositeProgram, "uniform_brightness"),
      u_contrast: gl.getUniformLocation(compositeProgram, "uniform_contrast"),
      u_saturation: gl.getUniformLocation(compositeProgram, "uniform_saturation"),
      u_grain_amt: gl.getUniformLocation(compositeProgram, "uniform_grain_amount"),
      u_grain_size: gl.getUniformLocation(compositeProgram, "uniform_grain_size")
    };

    var state = {
      displayWidth: 1,
      displayHeight: 1,
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      effectiveMode: options.mode,
      isHovered: false,
      isInView: true,
      isVisible: !document.hidden,
      isPaused: false,
      lastFlowTimeMs: -Infinity,
      lastFrameTimeMs: 0,
      rafId: null,
      lastUsedShaderTimeSeconds: 0,
      animationStartRealMs: 0,
      animationStartShaderTimeSeconds: 0
    };

    var reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    var prefersReducedMotion = reducedMotionQuery ? reducedMotionQuery.matches : false;

    function drawQuad(program) {
      var posLoc = gl.getAttribLocation(program, "a_position");
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function resizeCanvas() {
      var rect = target.getBoundingClientRect();
      state.displayWidth = Math.max(1, Math.round(rect.width || target.clientWidth || window.innerWidth));
      state.displayHeight = Math.max(1, Math.round(rect.height || target.clientHeight || window.innerHeight));
      state.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      state.effectiveMode = options.mode === "auto"
        ? chooseAutoMode(state.displayWidth, state.displayHeight)
        : options.mode;

      var scaledWidth = state.displayWidth * state.devicePixelRatio * options.resolutionScale;
      var scaledHeight = state.displayHeight * state.devicePixelRatio * options.resolutionScale;
      var pixelCount = scaledWidth * scaledHeight;
      var safetyScale = pixelCount > options.maxRenderPixels
        ? Math.sqrt(options.maxRenderPixels / pixelCount)
        : 1;

      canvas.width = Math.max(1, Math.round(scaledWidth * safetyScale));
      canvas.height = Math.max(1, Math.round(scaledHeight * safetyScale));
    }

    function canAnimate() {
      if (state.isPaused) return false;
      if (options.respectReducedMotion && prefersReducedMotion) return false;
      if (options.pauseWhenHidden && !state.isVisible) return false;
      if (state.effectiveMode === "static") return false;
      if ((state.effectiveMode === "inView" || options.pauseWhenOffscreen) && !state.isInView) return false;
      if (state.effectiveMode === "hover" && !state.isHovered) return false;
      return true;
    }

    function drawFrame(nowMs, forceFlowUpdate) {
      var time = state.animationStartRealMs
        ? state.animationStartShaderTimeSeconds + (nowMs - state.animationStartRealMs) / 1000
        : nowMs / 1000;
      var aspect = state.displayWidth / Math.max(state.displayHeight, 1);
      var flowDue =
        forceFlowUpdate ||
        (nowMs - state.lastFlowTimeMs) >= (1000 / options.flowFps);

      if (flowDue) {
        state.lastUsedShaderTimeSeconds = time;
        var rad = params.uniform_flow_rotation_radians;
        gl.bindFramebuffer(gl.FRAMEBUFFER, flowFramebuffer);
        gl.viewport(0, 0, flowMapSize, flowMapSize);
        gl.useProgram(flowProgram);
        gl.uniform1f(flowLoc.u_time, time);
        gl.uniform1f(flowLoc.u_aspect, aspect);
        gl.uniform1f(flowLoc.u_seed, params.uniform_seed);
        gl.uniform1f(flowLoc.u_motion_speed, params.uniform_motion_speed);
        gl.uniform2f(flowLoc.u_flow_cs, Math.cos(rad), Math.sin(rad));
        if (flowLoc.u_drift_x != null) gl.uniform1f(flowLoc.u_drift_x, params.uniform_flow_drift_speed_x || 0);
        if (flowLoc.u_drift_y != null) gl.uniform1f(flowLoc.u_drift_y, params.uniform_flow_drift_speed_y || 0);
        gl.uniform1f(flowLoc.u_warp_str, params.uniform_warp_strength);
        gl.uniform1f(flowLoc.u_warp_scale, params.uniform_warp_scale);
        gl.uniform1f(flowLoc.u_turbulence, params.uniform_turbulence);
        gl.uniform1i(flowLoc.u_reduce_motion, params.uniform_reduce_motion_enabled);
        drawQuad(flowProgram);
        state.lastFlowTimeMs = nowMs;
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compositeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, flowTexture);
      gl.uniform1i(compLoc.u_flow_map, 0);
      gl.uniform2f(compLoc.u_res, canvas.width, canvas.height);
      gl.uniform1f(compLoc.u_dpr, state.devicePixelRatio);
      gl.uniform1f(compLoc.u_seed, params.uniform_seed);
      var count = Math.min(6, params.uniform_palette_colors_hex.length);
      gl.uniform1i(compLoc.u_palette_count, count);
      var rgb = params.uniform_palette_colors_hex.slice(0, 6).map(hexToRgb);
      while (rgb.length < 6) rgb.push([0, 0, 0]);
      gl.uniform3fv(compLoc.u_palette, rgb.flat());
      gl.uniform1f(compLoc.u_brightness, params.uniform_brightness);
      gl.uniform1f(compLoc.u_contrast, params.uniform_contrast);
      gl.uniform1f(compLoc.u_saturation, params.uniform_saturation);
      gl.uniform1f(compLoc.u_grain_amt, params.uniform_grain_amount);
      gl.uniform1f(compLoc.u_grain_size, params.uniform_grain_size);
      drawQuad(compositeProgram);

    }

    function stopLoop() {
      if (state.rafId != null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    }

    function tick(nowMs) {
      if (!canAnimate()) {
        stopLoop();
        return;
      }

      state.rafId = requestAnimationFrame(tick);
      if ((nowMs - state.lastFrameTimeMs) < (1000 / options.fpsCap)) {
        return;
      }

      state.lastFrameTimeMs = nowMs;
      drawFrame(nowMs, false);
    }

    function drawStillFrame() {
      drawFrame(typeof performance !== "undefined" ? performance.now() : Date.now(), true);
    }

    function syncLoopState() {
      stopLoop();
      if (canAnimate()) {
        state.animationStartRealMs = typeof performance !== "undefined" ? performance.now() : 0;
        state.animationStartShaderTimeSeconds = state.lastUsedShaderTimeSeconds;
        state.lastFrameTimeMs = 0;
        state.lastFlowTimeMs = -Infinity;
        state.rafId = requestAnimationFrame(tick);
        return;
      }
      state.animationStartRealMs = typeof performance !== "undefined" ? performance.now() : 0;
      state.animationStartShaderTimeSeconds = state.lastUsedShaderTimeSeconds;
      drawStillFrame();
    }

    function handleVisibilityChange() {
      state.isVisible = !document.hidden;
      syncLoopState();
    }

    function handlePointerEnter() {
      state.isHovered = true;
      syncLoopState();
    }

    function handlePointerLeave() {
      state.isHovered = false;
      syncLoopState();
    }

    function handleResize() {
      resizeCanvas();
      syncLoopState();
    }

    var resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : null;
    if (resizeObserver) resizeObserver.observe(target);
    else window.addEventListener("resize", handleResize);

    var intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(function(entries) {
            state.isInView = !!(entries[0] && entries[0].isIntersecting);
            syncLoopState();
          }, { threshold: 0.01 })
        : null;
    if (intersectionObserver) intersectionObserver.observe(target);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    function syncPointerListeners() {
      target.removeEventListener("pointerenter", handlePointerEnter);
      target.removeEventListener("pointerleave", handlePointerLeave);
      if (state.effectiveMode === "hover") {
        target.addEventListener("pointerenter", handlePointerEnter);
        target.addEventListener("pointerleave", handlePointerLeave);
      } else {
        state.isHovered = false;
      }
    }

    var handleReducedMotionChange = function(event) {
      prefersReducedMotion = !!event.matches;
      handleResize();
    };
    if (reducedMotionQuery) {
      if (typeof reducedMotionQuery.addEventListener === "function") {
        reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
      } else if (typeof reducedMotionQuery.addListener === "function") {
        reducedMotionQuery.addListener(handleReducedMotionChange);
      }
    }

    resizeCanvas();
    syncPointerListeners();
    syncLoopState();

    return {
      updatePreset: function(nextPreset) {
        preset = normalizePreset(nextPreset);
        params = preset.params;
        options = resolveMountOptions(preset, options);
        resizeCanvas();
        syncPointerListeners();
        syncLoopState();
      },
      updateOptions: function(nextOptions) {
        options = resolveMountOptions(preset, Object.assign({}, options, nextOptions || {}));
        resizeCanvas();
        syncPointerListeners();
        syncLoopState();
      },
      resize: function() {
        resizeCanvas();
        syncPointerListeners();
        syncLoopState();
      },
      renderStill: function() {
        stopLoop();
        drawStillFrame();
      },
      pause: function() {
        state.isPaused = true;
        syncLoopState();
      },
      resume: function() {
        state.isPaused = false;
        syncLoopState();
      },
      destroy: function() {
        stopLoop();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        target.removeEventListener("pointerenter", handlePointerEnter);
        target.removeEventListener("pointerleave", handlePointerLeave);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", handleResize);
        if (intersectionObserver) intersectionObserver.disconnect();
        if (reducedMotionQuery) {
          if (typeof reducedMotionQuery.removeEventListener === "function") {
            reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
          } else if (typeof reducedMotionQuery.removeListener === "function") {
            reducedMotionQuery.removeListener(handleReducedMotionChange);
          }
        }
        gl.deleteProgram(flowProgram);
        gl.deleteProgram(compositeProgram);
        gl.deleteFramebuffer(flowFramebuffer);
        gl.deleteTexture(flowTexture);
        gl.deleteBuffer(positionBuffer);
        layer.remove();
      }
    };
  }

  function mountSharedGradient(targetInput, rawPreset, userOptions) {
    var preset = normalizePreset(rawPreset);
    var options = resolveSharedMountOptions(preset, userOptions);
    var selector = typeof targetInput === "string" ? targetInput : null;
    var hiddenHost = document.createElement("div");
    hiddenHost.setAttribute("aria-hidden", "true");
    hiddenHost.style.cssText =
      "position:fixed;left:-99999px;top:0;width:1px;height:1px;pointer-events:none;opacity:0;";
    document.body.appendChild(hiddenHost);

    var sourceOptions = Object.assign({}, options, {
      mode: "animated",
      pauseWhenHidden: false,
      pauseWhenOffscreen: false,
      respectReducedMotion: false
    });
    var sourceInstance = mountGradient(hiddenHost, preset, sourceOptions);
    var sourceCanvas = hiddenHost.querySelector("canvas");
    var slots = new Map();
    var resizeObservers = new Map();
    var intersectionObservers = new Map();
    var mutationObserver = null;
    var mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    var manuallyPaused = false;
    var destroyed = false;
    var rafId = null;
    var lastFrameTimeMs = 0;

    function ensureSlot(target) {
      if (slots.has(target)) return slots.get(target);
      ensureMountStyles(target);
      var layer = createLayer(target);
      var canvas = createCanvas(layer);
      var ctx = canvas.getContext("2d");
      var size = readElementSize(target);
      var slot = {
        target: target,
        layer: layer,
        canvas: canvas,
        ctx: ctx,
        width: size.width,
        height: size.height,
        hovered: false,
        focused: false,
        inView: true,
        pointerEnter: function() {
          slot.hovered = true;
          syncLoopState(true);
        },
        pointerLeave: function() {
          slot.hovered = false;
          syncLoopState(false);
        },
        focusIn: function() {
          slot.focused = true;
          syncLoopState(true);
        },
        focusOut: function() {
          slot.focused = false;
          syncLoopState(false);
        }
      };
      slots.set(target, slot);
      var resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(function() {
              var nextSize = readElementSize(target);
              slot.width = nextSize.width;
              slot.height = nextSize.height;
              syncLoopState(true);
            })
          : null;
      if (resizeObserver) resizeObserver.observe(target);
      resizeObservers.set(target, resizeObserver);
      var intersectionObserver =
        typeof IntersectionObserver !== "undefined"
          ? new IntersectionObserver(function(entries) {
              slot.inView = !!(entries[0] && entries[0].isIntersecting);
              syncLoopState(false);
            }, { threshold: 0.01 })
          : null;
      if (intersectionObserver) intersectionObserver.observe(target);
      intersectionObservers.set(target, intersectionObserver);
      return slot;
    }

    function destroySlot(target) {
      var slot = slots.get(target);
      if (!slot) return;
      target.removeEventListener("pointerenter", slot.pointerEnter);
      target.removeEventListener("pointerleave", slot.pointerLeave);
      target.removeEventListener("focusin", slot.focusIn);
      target.removeEventListener("focusout", slot.focusOut);
      var resizeObserver = resizeObservers.get(target);
      if (resizeObserver) resizeObserver.disconnect();
      resizeObservers.delete(target);
      var intersectionObserver = intersectionObservers.get(target);
      if (intersectionObserver) intersectionObserver.disconnect();
      intersectionObservers.delete(target);
      slot.layer.remove();
      slots.delete(target);
    }

    function getSlotList() {
      return Array.from(slots.values()).filter(function(slot) {
        return slot.target && slot.target.isConnected;
      });
    }

    function syncSlotListeners(effectiveMode) {
      getSlotList().forEach(function(slot) {
        slot.target.removeEventListener("pointerenter", slot.pointerEnter);
        slot.target.removeEventListener("pointerleave", slot.pointerLeave);
        slot.target.removeEventListener("focusin", slot.focusIn);
        slot.target.removeEventListener("focusout", slot.focusOut);
        if (effectiveMode === "hover") {
          slot.target.addEventListener("pointerenter", slot.pointerEnter);
          slot.target.addEventListener("pointerleave", slot.pointerLeave);
          slot.target.addEventListener("focusin", slot.focusIn);
          slot.target.addEventListener("focusout", slot.focusOut);
        } else {
          slot.hovered = false;
          slot.focused = false;
        }
      });
    }

    function syncTargets() {
      var nextTargets = resolveTargetList(targetInput, options.selectorRoot);
      var nextSet = new Set(nextTargets);
      slots.forEach(function(_slot, target) {
        if (!nextSet.has(target)) destroySlot(target);
      });
      nextTargets.forEach(function(target) {
        ensureSlot(target);
      });
      if (selector && slots.size === 0) {
        console.warn('Gradient shared target "' + selector + '" was not found.');
      }
    }

    function getEffectiveMode() {
      if (options.mode !== "auto") return options.mode;
      var largestArea = 0;
      var largest = { width: 1, height: 1 };
      getSlotList().forEach(function(slot) {
        var area = slot.width * slot.height;
        if (area > largestArea) {
          largestArea = area;
          largest = { width: slot.width, height: slot.height };
        }
      });
      return chooseAutoMode(largest.width, largest.height);
    }

    function getSourceSize(slotsToMeasure) {
      var list = slotsToMeasure && slotsToMeasure.length ? slotsToMeasure : getSlotList();
      var maxWidth = 1;
      var maxHeight = 1;
      list.forEach(function(slot) {
        maxWidth = Math.max(maxWidth, Math.ceil(slot.width / 64) * 64);
        maxHeight = Math.max(maxHeight, Math.ceil(slot.height / 64) * 64);
      });
      return { width: maxWidth, height: maxHeight };
    }

    function getDisplaySlots() {
      var allSlots = getSlotList();
      var visibleSlots = options.onlyVisibleSlots
        ? allSlots.filter(function(slot) { return slot.inView; })
        : allSlots;
      var preferred = visibleSlots.length ? visibleSlots : allSlots;
      return isFinite(options.maxActiveSlots)
        ? preferred.slice(0, options.maxActiveSlots)
        : preferred;
    }

    function shouldAnimateGroup(effectiveMode) {
      var slotList = getSlotList();
      if (!slotList.length || manuallyPaused) return false;
      var prefersReducedMotion = mediaQuery ? mediaQuery.matches : false;
      if (options.respectReducedMotion && prefersReducedMotion) return false;
      if (options.pauseWhenHidden && document.hidden) return false;
      if (effectiveMode === "static") return false;
      var anyInView = slotList.some(function(slot) { return slot.inView; });
      if ((effectiveMode === "inView" || options.pauseWhenOffscreen) && !anyInView) return false;
      if (effectiveMode === "hover") {
        return slotList.some(function(slot) { return slot.hovered || slot.focused; });
      }
      return true;
    }

    function resizeSourceHost() {
      var sourceSize = getSourceSize(getDisplaySlots());
      hiddenHost.style.width = sourceSize.width + "px";
      hiddenHost.style.height = sourceSize.height + "px";
      sourceInstance.resize();
      sourceCanvas = hiddenHost.querySelector("canvas");
    }

    function presentToSlots() {
      if (!sourceCanvas) return;
      getDisplaySlots().forEach(function(slot) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var width = Math.max(1, Math.round(slot.width * dpr));
        var height = Math.max(1, Math.round(slot.height * dpr));
        if (slot.canvas.width !== width || slot.canvas.height !== height) {
          slot.canvas.width = width;
          slot.canvas.height = height;
        }
        if (!slot.ctx) return;
        slot.ctx.clearRect(0, 0, width, height);
        slot.ctx.drawImage(sourceCanvas, 0, 0, width, height);
      });
    }

    function stopPresentLoop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function tick(now) {
      if (destroyed) return;
      var effectiveMode = getEffectiveMode();
      if (!shouldAnimateGroup(effectiveMode)) {
        sourceInstance.pause();
        stopPresentLoop();
        return;
      }
      rafId = requestAnimationFrame(tick);
      if ((now - lastFrameTimeMs) < (1000 / options.fpsCap)) {
        return;
      }
      lastFrameTimeMs = now;
      presentToSlots();
    }

    function syncLoopState(forceRender) {
      if (destroyed) return;
      syncTargets();
      resizeSourceHost();
      var effectiveMode = getEffectiveMode();
      syncSlotListeners(effectiveMode);
      if (shouldAnimateGroup(effectiveMode)) {
        sourceInstance.resume();
        if (forceRender) {
          sourceInstance.renderStill();
          presentToSlots();
        }
        if (rafId == null) {
          lastFrameTimeMs = 0;
          rafId = requestAnimationFrame(tick);
        }
        return;
      }
      sourceInstance.pause();
      stopPresentLoop();
      if (forceRender || !document.hidden) {
        sourceInstance.renderStill();
        presentToSlots();
      }
    }

    function handleVisibilityChange() {
      syncLoopState(false);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleVisibilityChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleVisibilityChange);
      }
    }

    if (selector && options.updateTargetsOnMutation && typeof MutationObserver !== "undefined") {
      var observedTarget =
        options.selectorRoot === document
          ? document.documentElement
          : options.selectorRoot;
      if (observedTarget) {
        mutationObserver = new MutationObserver(function() {
          syncLoopState(true);
        });
        mutationObserver.observe(observedTarget, {
          childList: true,
          subtree: true
        });
      }
    }

    syncLoopState(true);

    return {
      updatePreset: function(nextPreset) {
        preset = normalizePreset(nextPreset);
        options = resolveSharedMountOptions(preset, options);
        sourceOptions = Object.assign({}, options, {
          mode: "animated",
          pauseWhenHidden: false,
          pauseWhenOffscreen: false,
          respectReducedMotion: false
        });
        sourceInstance.updatePreset(preset);
        sourceInstance.updateOptions(sourceOptions);
        syncLoopState(true);
      },
      updateOptions: function(nextOptions) {
        options = resolveSharedMountOptions(preset, Object.assign({}, options, nextOptions || {}));
        sourceOptions = Object.assign({}, options, {
          mode: "animated",
          pauseWhenHidden: false,
          pauseWhenOffscreen: false,
          respectReducedMotion: false
        });
        sourceInstance.updateOptions(sourceOptions);
        syncLoopState(true);
      },
      rescan: function() {
        syncLoopState(true);
      },
      resize: function() {
        syncTargets();
        getSlotList().forEach(function(slot) {
          var size = readElementSize(slot.target);
          slot.width = size.width;
          slot.height = size.height;
        });
        syncLoopState(true);
      },
      renderStill: function() {
        sourceInstance.renderStill();
        presentToSlots();
      },
      pause: function() {
        manuallyPaused = true;
        syncLoopState(false);
      },
      resume: function() {
        manuallyPaused = false;
        syncLoopState(true);
      },
      destroy: function() {
        destroyed = true;
        stopPresentLoop();
        mutationObserver && mutationObserver.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (mediaQuery) {
          if (typeof mediaQuery.removeEventListener === "function") {
            mediaQuery.removeEventListener("change", handleVisibilityChange);
          } else if (typeof mediaQuery.removeListener === "function") {
            mediaQuery.removeListener(handleVisibilityChange);
          }
        }
        slots.forEach(function(_slot, target) {
          destroySlot(target);
        });
        sourceInstance.destroy();
        hiddenHost.remove();
      }
    };
  }

  window.Gradient = { mount: mountGradient, mountShared: mountSharedGradient };
})();
`;

  return scriptContent.trim() + "\n";
}

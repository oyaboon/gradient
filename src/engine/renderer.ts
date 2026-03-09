/**
 * WebGL2 gradient renderer: two-pass flow-map architecture.
 * Pass A: low-res FBO computes noise/FBM/warp → flow map texture.
 * Pass B: full-res quad samples flow map → palette + post-processing.
 * Standalone (no React) so it can be inlined in self-contained exports.
 */

import type { GradientParams } from "@/types/preset";
import { VERTEX_SOURCE, FLOW_FRAGMENT_SOURCE, COMPOSITE_FRAGMENT_SOURCE } from "./shaders";
import {
  getFlowUniformLocations,
  setFlowUniforms,
  getCompositeUniformLocations,
  setCompositeUniforms,
  type FlowUniformLocations,
  type CompositeUniformLocations,
} from "./uniforms";

const QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

export interface RendererConfig {
  resolutionScale: number;
  fpsCap: 30 | 60;
  flowMapSize: number;
  /** Flow map update rate (fps). Composite still runs at fpsCap. Default 30. */
  flowFps?: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  resolutionScale: 1,
  fpsCap: 60,
  flowMapSize: 384,
  flowFps: 30,
};

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
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

function createProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader
): WebGLProgram {
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

function buildProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(gl, vs, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

interface FlowMapResources {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  size: number;
}

function createFlowMap(gl: WebGL2RenderingContext, size: number): FlowMapResources {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create flow map texture");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Try RGBA16F first (better precision), fall back to RGBA8
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

export class GradientRenderer {
  private gl: WebGL2RenderingContext;

  private flowProgram: WebGLProgram;
  private compositeProgram: WebGLProgram;
  private flowUniforms: FlowUniformLocations;
  private compositeUniforms: CompositeUniformLocations;
  private flowMap: FlowMapResources;

  private positionBuffer: WebGLBuffer;
  private quadVao: WebGLVertexArrayObject | null = null;
  private config: RendererConfig;
  private startTime = 0;
  private rafId: number | null = null;
  private destroyed = false;
  private lastFrameTime = 0;
  private frameInterval = 1000 / 60;
  private lastFlowUpdateTimeMs = 0;
  private flowFrameIntervalMs = 1000 / 30;

  private displayWidth = 1;
  private displayHeight = 1;

  private lastCompositeParamsRef: GradientParams | null = null;
  private lastCompositeCanvasW = 0;
  private lastCompositeCanvasH = 0;
  private lastCompositeDpr = 0;
  private cachedFlowRotationRadians = NaN;
  private cachedFlowRotationCs: [number, number] = [1, 0];

  private constructor(
    gl: WebGL2RenderingContext,
    flowProgram: WebGLProgram,
    compositeProgram: WebGLProgram,
    flowUniforms: FlowUniformLocations,
    compositeUniforms: CompositeUniformLocations,
    flowMap: FlowMapResources,
    positionBuffer: WebGLBuffer,
    quadVao: WebGLVertexArrayObject | null,
    config: RendererConfig
  ) {
    this.gl = gl;
    this.flowProgram = flowProgram;
    this.compositeProgram = compositeProgram;
    this.flowUniforms = flowUniforms;
    this.compositeUniforms = compositeUniforms;
    this.flowMap = flowMap;
    this.positionBuffer = positionBuffer;
    this.quadVao = quadVao;
    this.config = config;
    this.frameInterval = 1000 / config.fpsCap;
    this.flowFrameIntervalMs = 1000 / (config.flowFps ?? 30);
  }

  static create(
    canvas: HTMLCanvasElement,
    config: Partial<RendererConfig> = {}
  ): GradientRenderer {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      antialias: false,
      powerPreference: "high-performance",
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

    return new GradientRenderer(
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

  setConfig(config: Partial<RendererConfig>): void {
    const needsFlowResize =
      config.flowMapSize != null && config.flowMapSize !== this.flowMap.size;

    this.config = { ...this.config, ...config };
    this.frameInterval = 1000 / this.config.fpsCap;
    if (this.config.flowFps != null) {
      this.flowFrameIntervalMs = 1000 / this.config.flowFps;
    }

    if (needsFlowResize) {
      this.rebuildFlowMap(this.config.flowMapSize);
    }
  }

  private rebuildFlowMap(size: number): void {
    const gl = this.gl;
    gl.deleteFramebuffer(this.flowMap.framebuffer);
    gl.deleteTexture(this.flowMap.texture);
    this.flowMap = createFlowMap(gl, size);
  }

  resize(width: number, height: number): void {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.config.resolutionScale;
    const w = Math.max(1, Math.floor(width * dpr * scale));
    const h = Math.max(1, Math.floor(height * dpr * scale));

    this.displayWidth = width;
    this.displayHeight = height;

    const canvas = gl.canvas as HTMLCanvasElement;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  private drawQuad(): void {
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

  draw(params: GradientParams, options?: { forceFlowUpdate?: boolean }): void {
    if (this.destroyed) return;
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const nowMs = typeof performance !== "undefined" ? performance.now() : 0;
    const time = nowMs / 1000 - this.startTime;
    const displayAspect = this.displayWidth / Math.max(this.displayHeight, 1);
    const forceFlowUpdate = options?.forceFlowUpdate ?? false;
    const flowDue =
      forceFlowUpdate ||
      nowMs - this.lastFlowUpdateTimeMs >= this.flowFrameIntervalMs;

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

    const compositeParamsUnchanged =
      this.lastCompositeParamsRef === params &&
      this.lastCompositeCanvasW === canvasW &&
      this.lastCompositeCanvasH === canvasH &&
      this.lastCompositeDpr === dpr;

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

  renderStillFrame(params: GradientParams): void {
    this.lastFlowUpdateTimeMs = -this.flowFrameIntervalMs;
    this.draw(params, { forceFlowUpdate: true });
  }

  startLoop(params: () => GradientParams): void {
    this.startTime =
      (typeof performance !== "undefined" ? performance.now() : 0) / 1000;

    const tick = (now: number) => {
      if (this.destroyed) return;
      this.rafId = requestAnimationFrame(tick);
      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = now - (elapsed % this.frameInterval);
        this.draw(params());
      }
    };

    this.lastFrameTime =
      typeof performance !== "undefined" ? performance.now() : 0;
    this.lastFlowUpdateTimeMs = -this.flowFrameIntervalMs;
    this.rafId = requestAnimationFrame(tick);
  }

  start(params: () => GradientParams): void {
    this.startLoop(params);
  }

  stopLoop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop(): void {
    this.stopLoop();
  }

  capturePng(
    params: GradientParams,
    targetWidth: number,
    targetHeight: number
  ): string {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const origWidth = canvas.width;
    const origHeight = canvas.height;
    const origDisplayW = this.displayWidth;
    const origDisplayH = this.displayHeight;

    const needResize =
      canvas.width !== targetWidth || canvas.height !== targetHeight;
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

  getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  destroy(): void {
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
}

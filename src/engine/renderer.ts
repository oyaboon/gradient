/**
 * WebGL2 gradient renderer: init, compile, render loop, resize, fps cap, resolution scale.
 * Standalone (no React) so it can be inlined in self-contained exports.
 */

import type { GradientParams } from "@/types/preset";
import { FRAGMENT_SOURCE, VERTEX_SOURCE } from "./shaders";
import { getUniformLocations, setUniforms, type UniformLocations } from "./uniforms";

const QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

export interface RendererConfig {
  resolutionScale: number;
  fpsCap: 30 | 60;
}

const DEFAULT_CONFIG: RendererConfig = {
  resolutionScale: 1,
  fpsCap: 60,
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

export class GradientRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniformLocations: UniformLocations;
  private positionBuffer: WebGLBuffer;
  private config: RendererConfig;
  private startTime = 0;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameInterval = 1000 / 60;

  private constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    uniformLocations: UniformLocations,
    positionBuffer: WebGLBuffer,
    config: RendererConfig
  ) {
    this.gl = gl;
    this.program = program;
    this.uniformLocations = uniformLocations;
    this.positionBuffer = positionBuffer;
    this.config = config;
    this.frameInterval = 1000 / config.fpsCap;
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
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    const program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uniformLocations = getUniformLocations(gl, program);

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) throw new Error("Failed to create buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);

    return new GradientRenderer(
      gl,
      program,
      uniformLocations,
      positionBuffer,
      fullConfig
    );
  }

  setConfig(config: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...config };
    this.frameInterval = 1000 / this.config.fpsCap;
  }

  resize(width: number, height: number): void {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.config.resolutionScale;
    const w = Math.max(1, Math.floor(width * dpr * scale));
    const h = Math.max(1, Math.floor(height * dpr * scale));

    const canvas = gl.canvas as HTMLCanvasElement;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  /**
   * Draw one frame. Call from requestAnimationFrame loop.
   */
  draw(params: GradientParams): void {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const time = (typeof performance !== "undefined" ? performance.now() : 0) / 1000 - this.startTime;

    gl.useProgram(this.program);

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    setUniforms(
      gl,
      this.uniformLocations,
      params,
      time,
      width,
      height,
      dpr
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Start the render loop. Stores start time and uses fps cap.
   */
  startLoop(params: () => GradientParams): void {
    this.startTime =
      (typeof performance !== "undefined" ? performance.now() : 0) / 1000;

    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = now - (elapsed % this.frameInterval);
        this.draw(params());
      }
    };

    this.lastFrameTime = typeof performance !== "undefined" ? performance.now() : 0;
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Render a single frame at the given resolution and return PNG data URL.
   * Does not change canvas size if already correct; otherwise temporarily resizes.
   */
  capturePng(params: GradientParams, targetWidth: number, targetHeight: number): string {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const origWidth = canvas.width;
    const origHeight = canvas.height;

    const needResize = canvas.width !== targetWidth || canvas.height !== targetHeight;
    if (needResize) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      gl.viewport(0, 0, targetWidth, targetHeight);
    }

    this.draw(params);

    const dataUrl = canvas.toDataURL("image/png");

    if (needResize) {
      canvas.width = origWidth;
      canvas.height = origHeight;
      gl.viewport(0, 0, origWidth, origHeight);
    }

    return dataUrl;
  }

  /**
   * Get the WebGL canvas for reading pixels or displaying.
   */
  getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  destroy(): void {
    this.stopLoop();
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.positionBuffer);
  }
}

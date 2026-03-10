"use client";

import type { GradientPresetInput } from "@/types/preset";

export type GradientMountMode = "animated" | "static" | "hover";
export type GradientSharedMode = "animated" | "static";
export type GradientFrameTransport = "auto" | "2d" | "bitmaprenderer";

export type GradientMountTarget = string | HTMLElement;
export type GradientSharedMountTarget =
  | string
  | HTMLElement
  | ArrayLike<Element>
  | Iterable<Element>;

export interface BaseGradientMountOptions {
  resolutionScale?: number;
  fpsCap?: 30 | 60;
  flowMapSize?: number;
  flowFps?: number;
  maxRenderPixels?: number;
}

export interface GradientMountOptions extends BaseGradientMountOptions {
  mode?: GradientMountMode;
}

export interface GradientSharedMountOptions extends BaseGradientMountOptions {
  mode?: GradientSharedMode;
  frameTransport?: GradientFrameTransport;
}

export interface ResolvedGradientMountOptions extends Required<GradientMountOptions> {
  mode: GradientMountMode;
  respectReducedMotion: boolean;
  pauseWhenHidden: boolean;
  pauseWhenOffscreen: boolean;
}

export interface ResolvedGradientSharedMountOptions extends Required<GradientSharedMountOptions> {
  mode: GradientSharedMode;
  respectReducedMotion: boolean;
  pauseWhenHidden: boolean;
  pauseWhenOffscreen: boolean;
}

export interface GradientRuntimeInstance<TOptions extends BaseGradientMountOptions> {
  updatePreset(nextPreset: GradientPresetInput): void;
  updateOptions(nextOptions: Partial<TOptions>): void;
  resize(): void;
  renderStill(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface GradientInstance extends GradientRuntimeInstance<GradientMountOptions> {}

export interface GradientSharedInstance
  extends GradientRuntimeInstance<GradientSharedMountOptions> {
  rescan(): void;
}

export interface RuntimeModeState {
  hovered: boolean;
  inView: boolean;
  visible: boolean;
  reducedMotion: boolean;
  manuallyPaused: boolean;
}

"use client";

import type { GradientPreset } from "@/types/preset";

export type GradientMountMode = "auto" | "animated" | "static" | "hover" | "inView";

export type GradientMountTarget = string | HTMLElement;

export interface GradientMountOptions {
  mode?: GradientMountMode;
  resolutionScale?: number;
  fpsCap?: 30 | 60;
  flowMapSize?: number;
  flowFps?: number;
  maxRenderPixels?: number;
  respectReducedMotion?: boolean;
  pauseWhenHidden?: boolean;
  pauseWhenOffscreen?: boolean;
}

export interface ResolvedGradientMountOptions extends Required<GradientMountOptions> {
  mode: GradientMountMode;
}

export interface GradientInstance {
  updatePreset(nextPreset: GradientPreset): void;
  updateOptions(nextOptions: Partial<GradientMountOptions>): void;
  resize(): void;
  renderStill(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface RuntimeModeState {
  hovered: boolean;
  inView: boolean;
  visible: boolean;
  reducedMotion: boolean;
  manuallyPaused: boolean;
}

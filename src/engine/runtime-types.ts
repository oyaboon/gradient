"use client";

import type { GradientPreset } from "@/types/preset";

export type GradientMountMode = "auto" | "animated" | "static" | "hover" | "inView";
export type GradientCopyStrategy = "auto" | "2d" | "bitmaprenderer";

export type GradientMountTarget = string | HTMLElement;
export type GradientSharedMountTarget =
  | string
  | HTMLElement
  | ArrayLike<Element>
  | Iterable<Element>;

export interface BaseGradientMountOptions {
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

export interface GradientMountOptions extends BaseGradientMountOptions {}

export interface GradientSharedMountOptions extends BaseGradientMountOptions {
  copyStrategy?: GradientCopyStrategy;
  updateTargetsOnMutation?: boolean;
  selectorRoot?: ParentNode;
  onlyVisibleSlots?: boolean;
  maxActiveSlots?: number;
}

export interface ResolvedGradientMountOptions extends Required<GradientMountOptions> {
  mode: GradientMountMode;
}

export interface ResolvedGradientSharedMountOptions
  extends Required<Omit<GradientSharedMountOptions, "selectorRoot">> {
  mode: GradientMountMode;
  selectorRoot: ParentNode;
}

export interface GradientRuntimeInstance<TOptions extends BaseGradientMountOptions> {
  updatePreset(nextPreset: GradientPreset): void;
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

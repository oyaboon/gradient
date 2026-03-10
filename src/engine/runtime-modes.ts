"use client";

import { getPresetQualityDefaults } from "@/lib/preset";
import type { GradientPreset } from "@/types/preset";
import type {
  BaseGradientMountOptions,
  GradientMountMode,
  GradientMountOptions,
  GradientSharedMountOptions,
  ResolvedGradientMountOptions,
  ResolvedGradientSharedMountOptions,
  RuntimeModeState,
} from "./runtime-types";

const DEFAULT_MAX_RENDER_PIXELS = 3_500_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function quantizeFlowMapSize(size: number): number {
  if (size >= 448) {
    return 512;
  }

  if (size >= 320) {
    return 384;
  }

  return 256;
}

function quantizeFlowFps(flowFps: number): number {
  if (flowFps >= 45) {
    return 60;
  }

  if (flowFps >= 22.5) {
    return 30;
  }

  return 15;
}

export function resolveAutoMode(width: number, height: number): GradientMountMode {
  const area = Math.max(1, width) * Math.max(1, height);

  if (area <= 140_000) {
    return "static";
  }

  if (area <= 700_000) {
    return "inView";
  }

  return "animated";
}

function resolveBaseMountOptions<TOptions extends BaseGradientMountOptions>(
  preset: GradientPreset,
  options?: Partial<TOptions>
): ResolvedGradientMountOptions {
  const presetQuality = getPresetQualityDefaults(preset);
  const presetMaxRenderPixels = preset.exportDefaults?.quality?.maxRenderPixels;

  return {
    mode: options?.mode ?? "auto",
    resolutionScale: clamp(
      options?.resolutionScale ?? presetQuality.qualityResolutionScale,
      0.5,
      1
    ),
    fpsCap: (options?.fpsCap ?? presetQuality.qualityFpsCap) >= 45 ? 60 : 30,
    flowMapSize: quantizeFlowMapSize(
      clamp(options?.flowMapSize ?? presetQuality.qualityFlowMapSize, 256, 512)
    ),
    flowFps: quantizeFlowFps(
      clamp(options?.flowFps ?? presetQuality.qualityFlowFps, 15, 60)
    ),
    maxRenderPixels: Math.round(
      clamp(options?.maxRenderPixels ?? presetMaxRenderPixels ?? DEFAULT_MAX_RENDER_PIXELS, 250_000, 16_000_000)
    ),
    respectReducedMotion: options?.respectReducedMotion ?? true,
    pauseWhenHidden: options?.pauseWhenHidden ?? true,
    pauseWhenOffscreen: options?.pauseWhenOffscreen ?? true,
  };
}

export function resolveMountOptions(
  preset: GradientPreset,
  options?: Partial<GradientMountOptions>
): ResolvedGradientMountOptions {
  return resolveBaseMountOptions(preset, options);
}

export function resolveSharedMountOptions(
  preset: GradientPreset,
  options?: Partial<GradientSharedMountOptions>
): ResolvedGradientSharedMountOptions {
  const baseOptions = resolveBaseMountOptions(preset, options);

  return {
    ...baseOptions,
    copyStrategy: options?.copyStrategy ?? "auto",
    updateTargetsOnMutation: options?.updateTargetsOnMutation ?? false,
    selectorRoot: options?.selectorRoot ?? document,
    onlyVisibleSlots: options?.onlyVisibleSlots ?? true,
    maxActiveSlots: Math.max(1, Math.round(options?.maxActiveSlots ?? Number.POSITIVE_INFINITY)),
  };
}

export function shouldAnimate(
  mode: GradientMountMode,
  state: RuntimeModeState,
  options: ResolvedGradientMountOptions
): boolean {
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

  if ((mode === "inView" || options.pauseWhenOffscreen) && !state.inView) {
    return false;
  }

  if (mode === "hover") {
    return state.hovered;
  }

  return true;
}

"use client";

import { GradientRenderer } from "@/engine/renderer";
import { normalizePreset } from "@/lib/preset";
import type { GradientPreset } from "@/types/preset";
import { resolveAutoMode, resolveMountOptions, shouldAnimate } from "./runtime-modes";
import { mountSharedGradient } from "./shared-gradient-runtime";
import type {
  GradientInstance,
  GradientMountMode,
  GradientMountOptions,
  GradientMountTarget,
  GradientSharedInstance,
  GradientSharedMountOptions,
  GradientSharedMountTarget,
  ResolvedGradientMountOptions,
  RuntimeModeState,
} from "./runtime-types";
import {
  createCanvas,
  createLayer,
  ensureContainerStyles,
  readTargetSize,
  resolveTarget,
} from "./runtime-dom";

function getRuntimeState(): RuntimeModeState {
  return {
    hovered: false,
    inView: true,
    visible: !document.hidden,
    reducedMotion:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    manuallyPaused: false,
  };
}

function getEffectiveMode(
  target: HTMLElement,
  options: ResolvedGradientMountOptions
): GradientMountMode {
  if (options.mode !== "auto") {
    return options.mode;
  }

  const { width, height } = readTargetSize(target);
  return resolveAutoMode(width, height);
}

export function mountGradient(
  targetInput: GradientMountTarget,
  presetInput: GradientPreset,
  initialOptions?: Partial<GradientMountOptions>
): GradientInstance {
  const target = resolveTarget(targetInput);
  const styleCleanup = ensureContainerStyles(target);

  const layer = createLayer(target);
  const canvas = createCanvas(layer);
  const renderer = GradientRenderer.create(canvas);
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  let preset = normalizePreset(presetInput);
  let options = resolveMountOptions(preset, initialOptions);
  let state = getRuntimeState();
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let destroyed = false;
  let hoverListenersAttached = false;
  /** In hover mode, freeze animation time when not hovered so resume has no jump. */
  let lastAnimationTimeSeconds = 0;

  const applyRendererConfig = () => {
    const { width, height } = readTargetSize(target);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scaledWidth = width * dpr * options.resolutionScale;
    const scaledHeight = height * dpr * options.resolutionScale;
    const pixelCount = scaledWidth * scaledHeight;
    const safetyScale =
      pixelCount > options.maxRenderPixels
        ? Math.sqrt(options.maxRenderPixels / pixelCount)
        : 1;

    renderer.setConfig({
      resolutionScale: Math.max(0.25, options.resolutionScale * safetyScale),
      fpsCap: options.fpsCap,
      flowMapSize: options.flowMapSize,
      flowFps: options.flowFps,
    });
    renderer.resize(width, height);
  };

  const syncHoverListeners = () => {
    const effectiveMode = getEffectiveMode(target, options);
    const needsHoverListeners = effectiveMode === "hover";

    if (needsHoverListeners && !hoverListenersAttached) {
      target.addEventListener("pointerenter", handlePointerEnter);
      target.addEventListener("pointerleave", handlePointerLeave);
      hoverListenersAttached = true;
      return;
    }

    if (!needsHoverListeners && hoverListenersAttached) {
      target.removeEventListener("pointerenter", handlePointerEnter);
      target.removeEventListener("pointerleave", handlePointerLeave);
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

    const effectiveMode = getEffectiveMode(target, options);
    const animate = shouldAnimate(effectiveMode, state, options);

    if (!animate && effectiveMode === "hover") {
      lastAnimationTimeSeconds = renderer.getCurrentTime();
    }
    renderer.stop();

    if (animate) {
      renderer.start(() => preset.params, {
        timeOffsetSeconds: effectiveMode === "hover" ? lastAnimationTimeSeconds : undefined,
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

  const handleVisibilityChange = () => {
    state = { ...state, visible: !document.hidden };
    syncLoopState();
  };

  const handleReducedMotionChange = (event: MediaQueryListEvent | MediaQueryList) => {
    state = { ...state, reducedMotion: event.matches };
    syncLoopState();
  };

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(target);

  if (typeof IntersectionObserver !== "undefined") {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        state = { ...state, inView: !!entries[0]?.isIntersecting };
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
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      renderer.stop();
      renderer.destroy();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (hoverListenersAttached) {
        target.removeEventListener("pointerenter", handlePointerEnter);
        target.removeEventListener("pointerleave", handlePointerLeave);
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
    },
  };
}

export const Gradient = {
  mount: mountGradient,
  mountShared(
    targetInput: GradientSharedMountTarget,
    presetInput: GradientPreset,
    initialOptions?: Partial<GradientSharedMountOptions>
  ): GradientSharedInstance {
    return mountSharedGradient(targetInput, presetInput, initialOptions);
  },
};

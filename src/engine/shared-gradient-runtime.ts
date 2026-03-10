"use client";

import { GradientRenderer } from "@/engine/renderer";
import { normalizePreset } from "@/lib/preset";
import type { GradientPresetInput } from "@/types/preset";
import { resolveSharedMountOptions, shouldAnimate } from "./runtime-modes";
import type {
  GradientFrameTransport,
  GradientSharedMode,
  GradientSharedInstance,
  GradientSharedMountOptions,
  GradientSharedMountTarget,
  ResolvedGradientSharedMountOptions,
  RuntimeModeState,
} from "./runtime-types";
import {
  createCanvas,
  createLayer,
  ensureContainerStyles,
  readTargetSize,
} from "./runtime-dom";

type SourceCanvas = HTMLCanvasElement | OffscreenCanvas;
type SlotPresentationMode = "2d" | "bitmaprenderer";

interface SharedSource {
  backend: "dom" | "offscreen";
  canvas: SourceCanvas;
  renderer: GradientRenderer;
  destroy(): void;
}

interface SharedSlot {
  target: HTMLElement;
  layer: HTMLDivElement;
  canvas: HTMLCanvasElement;
  context2d: CanvasRenderingContext2D | null;
  bitmapRenderer: ImageBitmapRenderingContext | null;
  width: number;
  height: number;
  inView: boolean;
  styleCleanup: { restore(): void };
  resizeObserver: ResizeObserver | null;
  intersectionObserver: IntersectionObserver | null;
  presentationMode: SlotPresentationMode;
}

interface ResolvedTargets {
  elements: HTMLElement[];
  selector: string | null;
}

function isIterable(value: unknown): value is Iterable<Element> {
  return !!value && typeof (value as Iterable<Element>)[Symbol.iterator] === "function";
}

function isArrayLike(value: unknown): value is ArrayLike<Element> {
  return !!value && typeof value === "object" && "length" in value;
}

function normalizeElements(elements: Iterable<Element> | ArrayLike<Element>): HTMLElement[] {
  return Array.from(elements).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

function resolveSharedTargets(
  targetInput: GradientSharedMountTarget
): ResolvedTargets {
  if (typeof targetInput === "string") {
    return {
      elements: normalizeElements(document.querySelectorAll(targetInput)),
      selector: targetInput,
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

function getGroupState(manuallyPaused: boolean, slots: SharedSlot[]): RuntimeModeState {
  const inView = slots.some((slot) => slot.inView);

  return {
    hovered: false,
    inView,
    visible: !document.hidden,
    reducedMotion:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    manuallyPaused,
  };
}

/**
 * Shared rendering prefers OffscreenCanvas, but falls back to a hidden DOM canvas
 * so the runtime keeps working in browsers without OffscreenCanvas support.
 */
function createSharedSource(): SharedSource {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(1, 1);
    const renderer = GradientRenderer.create(canvas);

    return {
      backend: "offscreen",
      canvas,
      renderer,
      destroy() {
        renderer.destroy();
      },
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  canvas.dataset.gradientSharedSource = "true";
  canvas.style.cssText =
    "position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body?.appendChild(canvas);
  const renderer = GradientRenderer.create(canvas);

  return {
    backend: "dom",
    canvas,
    renderer,
    destroy() {
      renderer.destroy();
      canvas.remove();
    },
  };
}

function readBucketedSize(slot: SharedSlot): { width: number; height: number } {
  const width = Math.max(1, Math.ceil(slot.width / 64) * 64);
  const height = Math.max(1, Math.ceil(slot.height / 64) * 64);
  return { width, height };
}

function createSlot(target: HTMLElement): SharedSlot {
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
    presentationMode: "2d",
  };
}

function destroySlot(slot: SharedSlot): void {
  slot.resizeObserver?.disconnect();
  slot.intersectionObserver?.disconnect();
  slot.layer.remove();
  slot.styleCleanup.restore();
}

function ensureSlotCanvasMode(slot: SharedSlot, mode: SlotPresentationMode): void {
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

function resizeSlotCanvas(slot: SharedSlot): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(slot.width * dpr));
  const height = Math.max(1, Math.round(slot.height * dpr));

  if (slot.canvas.width !== width || slot.canvas.height !== height) {
    slot.canvas.width = width;
    slot.canvas.height = height;
  }
}

/**
 * `bitmaprenderer` can only safely own a single ImageBitmap at a time,
 * so multi-slot presentation falls back to the 2D path.
 */
function resolveFrameTransport(
  strategy: GradientFrameTransport,
  source: SharedSource,
  slots: SharedSlot[]
): SlotPresentationMode {
  if (strategy === "2d") {
    return "2d";
  }

  if (source.backend === "offscreen" && slots.length === 1) {
    return "bitmaprenderer";
  }

  return "2d";
}

/**
 * Mount one shared source renderer and present frames into many target slots.
 */
export function mountSharedGradient(
  targetInput: GradientSharedMountTarget,
  presetInput: GradientPresetInput,
  initialOptions?: Partial<GradientSharedMountOptions>
): GradientSharedInstance {
  const source = createSharedSource();
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  let preset = normalizePreset(presetInput);
  let options = resolveSharedMountOptions(preset, initialOptions);
  let currentTargets = resolveSharedTargets(targetInput);
  const slots = new Map<HTMLElement, SharedSlot>();
  let destroyed = false;
  let manuallyPaused = false;
  let loopActive = false;
  let rafId: number | null = null;
  let refreshRafId: number | null = null;
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

  const getSlots = (): SharedSlot[] => Array.from(slots.values()).filter((slot) => slot.target.isConnected);

  const getEffectiveMode = (): GradientSharedMode => options.mode;

  const computeSourceSize = (candidateSlots: SharedSlot[]): { width: number; height: number } => {
    const measuredSlots = candidateSlots.length > 0 ? candidateSlots : getSlots();
    if (measuredSlots.length === 0) {
      return { width: 1, height: 1 };
    }

    const largest = measuredSlots.reduce(
      (max, slot) => {
        const bucketed = readBucketedSize(slot);
        return {
          width: Math.max(max.width, bucketed.width),
          height: Math.max(max.height, bucketed.height),
        };
      },
      { width: 1, height: 1 }
    );

    return largest;
  };

  const ensureSourceSize = (candidateSlots: SharedSlot[]) => {
    const nextSize = computeSourceSize(candidateSlots);
    const shouldGrow = nextSize.width > sourceWidth || nextSize.height > sourceHeight;
    const shouldShrink =
      nextSize.width < sourceWidth * 0.75 || nextSize.height < sourceHeight * 0.75;

    if (!shouldGrow && !shouldShrink && hasPresentedFrame) {
      return;
    }

    sourceWidth = nextSize.width;
    sourceHeight = nextSize.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scaledWidth = sourceWidth * dpr * options.resolutionScale;
    const scaledHeight = sourceHeight * dpr * options.resolutionScale;
    const pixelCount = scaledWidth * scaledHeight;
    const safetyScale =
      pixelCount > options.maxRenderPixels
        ? Math.sqrt(options.maxRenderPixels / pixelCount)
        : 1;

    source.renderer.setConfig({
      resolutionScale: Math.max(0.25, options.resolutionScale * safetyScale),
      fpsCap: options.fpsCap,
      flowMapSize: options.flowMapSize,
      flowFps: options.flowFps,
    });
    source.renderer.resize(sourceWidth, sourceHeight);
  };

  const getDisplaySlots = (): SharedSlot[] => {
    const connectedSlots = getSlots();
    if (connectedSlots.length === 0) {
      return connectedSlots;
    }

    const visibleSlots = connectedSlots.filter((slot) => slot.inView);
    const preferredSlots = visibleSlots.length > 0 ? visibleSlots : connectedSlots;
    return preferredSlots;
  };

  const renderToSlots = (displaySlots: SharedSlot[]) => {
    if (displaySlots.length === 0) {
      return;
    }

    const desiredMode = resolveFrameTransport(options.frameTransport, source, displaySlots);

    for (const slot of displaySlots) {
      ensureSlotCanvasMode(slot, desiredMode);
      resizeSlotCanvas(slot);
    }

    if (
      desiredMode === "bitmaprenderer" &&
      source.backend === "offscreen" &&
      displaySlots.length === 1
    ) {
      const slot = displaySlots[0];
      const bitmapRenderer = slot.bitmapRenderer;

      if (bitmapRenderer) {
        const bitmap = (source.canvas as OffscreenCanvas).transferToImageBitmap();
        bitmapRenderer.transferFromImageBitmap(bitmap);
        return;
      }
    }

    for (const slot of displaySlots) {
      const context = slot.context2d ?? slot.canvas.getContext("2d");
      slot.context2d = context;
      if (!context) {
        continue;
      }

      context.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
      context.drawImage(
        source.canvas as CanvasImageSource,
        0,
        0,
        slot.canvas.width,
        slot.canvas.height
      );
    }
  };

  const renderFrame = (forceFlowUpdate: boolean) => {
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

  const shouldLoop = (mode: GradientSharedMode) => {
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

      const frameInterval = 1000 / options.fpsCap;
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

  const removeMissingSlots = (nextElements: HTMLElement[]) => {
    const nextSet = new Set(nextElements);

    for (const [element, slot] of slots.entries()) {
      if (nextSet.has(element) && element.isConnected) {
        continue;
      }

      destroySlot(slot);
      slots.delete(element);
    }
  };

  const addNewSlots = (elements: HTMLElement[]) => {
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
            slot.inView = !!entries[0]?.isIntersecting;
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

  function scheduleRefresh(): void {
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
    },
  };
}

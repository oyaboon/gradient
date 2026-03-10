"use client";

import type { GradientMountTarget } from "./runtime-types";

export interface TargetSize {
  width: number;
  height: number;
}

export interface ContainerStyleCleanup {
  restore(): void;
}

function restoreInlineStyle(
  style: CSSStyleDeclaration,
  property: "position" | "overflow",
  previousValue: string
): void {
  if (previousValue) {
    style[property] = previousValue;
    return;
  }

  style.removeProperty(property);
}

export function resolveTarget(target: GradientMountTarget): HTMLElement {
  if (typeof target === "string") {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) {
      throw new Error(`Gradient target "${target}" was not found.`);
    }

    return element;
  }

  return target;
}

export function ensureContainerStyles(target: HTMLElement): ContainerStyleCleanup {
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
    },
  };
}

export function createLayer(target: HTMLElement): HTMLDivElement {
  const layer = document.createElement("div");
  layer.dataset.gradientLayer = "true";
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText =
    "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;";
  target.prepend(layer);
  return layer;
}

export function createCanvas(layer: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
  layer.appendChild(canvas);
  return canvas;
}

export function readTargetSize(target: HTMLElement): TargetSize {
  const rect = target.getBoundingClientRect();

  return {
    width: Math.max(1, Math.round(rect.width || target.clientWidth || window.innerWidth)),
    height: Math.max(1, Math.round(rect.height || target.clientHeight || window.innerHeight)),
  };
}

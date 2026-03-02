/**
 * Export current frame as PNG at a given resolution.
 * Uses the renderer's capturePng; caller triggers download.
 */

import type { GradientParams } from "@/types/preset";
import type { GradientRenderer } from "./renderer";

export const PNG_SIZES = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "3840 × 2160", width: 3840, height: 2160 },
] as const;

export function capturePngAsDataUrl(
  renderer: GradientRenderer,
  params: GradientParams,
  width: number,
  height: number
): string {
  return renderer.capturePng(params, width, height);
}

export function downloadPng(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "gradient.png";
  a.click();
}

"use client";

import { useState, useEffect, useRef } from "react";
import { getPresetName } from "@/lib/preset";
import type { GradientPreset } from "@/types/preset";
import { GradientRenderer } from "@/engine/renderer";

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 96;

/**
 * Generates static (one-frame) shader thumbnails for presets using a single
 * offscreen renderer. Yields between presets to keep UI responsive.
 */
export function usePresetThumbnails(presets: GradientPreset[]): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const cancelledRef = useRef(false);
  const presetKey = presets.map((preset) => getPresetName(preset)).join(",");

  useEffect(() => {
    if (typeof document === "undefined" || presets.length === 0) return;

    const list = presets;
    cancelledRef.current = false;
    setThumbnails({});

    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH;
    canvas.height = THUMB_HEIGHT;

    let renderer: GradientRenderer | null = null;
    try {
      renderer = GradientRenderer.create(canvas, {
        resolutionScale: 0.5,
        fpsCap: 60,
        flowMapSize: 192,
      });
    } catch {
      return;
    }

    let index = 0;

    const captureNext = () => {
      if (cancelledRef.current || !renderer || index >= list.length) {
        renderer?.destroy();
        return;
      }
      const preset = list[index];
      try {
        const dataUrl = renderer.capturePng(
          preset.params,
          THUMB_WIDTH,
          THUMB_HEIGHT
        );
        if (!cancelledRef.current) {
          setThumbnails((prev) => ({ ...prev, [getPresetName(preset)]: dataUrl }));
        }
      } catch {
        // skip this preset
      }
      index += 1;
      if (index < list.length) {
        requestAnimationFrame(captureNext);
      } else {
        renderer.destroy();
      }
    };

    requestAnimationFrame(captureNext);

    return () => {
      cancelledRef.current = true;
      if (renderer) {
        renderer.destroy();
      }
    };
  }, [presetKey]); // list captured from presets at effect run

  return thumbnails;
}

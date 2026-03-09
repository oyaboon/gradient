"use client";

import type { GradientPreset } from "@/types/preset";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";

interface PresetPreviewCanvasProps {
  preset: GradientPreset;
}

/** Small live shader preview for a single preset (e.g. in PresetStrip). */
export function PresetPreviewCanvas({ preset }: PresetPreviewCanvasProps) {
  return (
    <div className="relative w-20 h-12 rounded overflow-hidden bg-neutral-900">
      <GradientCanvas
        params={preset.params}
        config={{ resolutionScale: 0.5, fpsCap: 30 }}
        className="absolute inset-0"
      />
    </div>
  );
}

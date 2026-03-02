"use client";

import type { Preset } from "@/types/preset";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";

interface PresetPreviewCanvasProps {
  preset: Preset;
}

/** Small live shader preview for a single preset (e.g. in PresetStrip). */
export function PresetPreviewCanvas({ preset }: PresetPreviewCanvasProps) {
  return (
    <div className="relative w-20 h-12 rounded overflow-hidden bg-neutral-900">
      <GradientCanvas
        params={{
          uniform_seed: preset.uniform_seed,
          uniform_palette_colors_hex: preset.uniform_palette_colors_hex,
          uniform_motion_speed: preset.uniform_motion_speed,
          uniform_flow_rotation_radians: preset.uniform_flow_rotation_radians,
          uniform_warp_strength: preset.uniform_warp_strength,
          uniform_warp_scale: preset.uniform_warp_scale,
          uniform_turbulence: preset.uniform_turbulence,
          uniform_brightness: preset.uniform_brightness,
          uniform_contrast: preset.uniform_contrast,
          uniform_saturation: preset.uniform_saturation,
          uniform_grain_amount: preset.uniform_grain_amount,
          uniform_grain_size: preset.uniform_grain_size,
          uniform_reduce_motion_enabled: preset.uniform_reduce_motion_enabled,
        }}
        config={{ resolutionScale: 0.5, fpsCap: 30 }}
        className="absolute inset-0"
      />
    </div>
  );
}

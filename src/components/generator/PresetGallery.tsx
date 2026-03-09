"use client";

import { useCallback } from "react";
import { getPresetName } from "@/lib/preset";
import { useGradientStore } from "@/store/useGradientStore";
import { getAllPresets } from "@/presets";
import { usePresetThumbnails } from "@/hooks/usePresetThumbnails";
import { ScrollArea } from "@/components/ui/ScrollArea";

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function PresetGallery() {
  const presets = getAllPresets();
  const thumbnails = usePresetThumbnails(presets);
  const activePreset = useGradientStore((s) => s.activePreset);
  const applyPreset = useGradientStore((s) => s.applyPreset);
  const setParamsPartial = useGradientStore((s) => s.setParamsPartial);
  const setActivePreset = useGradientStore((s) => s.setActivePreset);

  const randomize = useCallback(() => {
    const paletteCount = 3 + Math.floor(Math.random() * 4);
    const hex = () =>
      "#" +
      [0, 1, 2]
        .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
        .join("");
    const colors = Array.from({ length: paletteCount }, hex);
    setParamsPartial({
      uniform_seed: Math.random() * 400,
      uniform_palette_colors_hex: colors,
      uniform_motion_speed: randomInRange(0.2, 1.5),
      uniform_flow_rotation_radians: randomInRange(0, Math.PI * 2),
      uniform_flow_drift_speed_x: (Math.random() * 2 - 1) * 0.2,
      uniform_flow_drift_speed_y: (Math.random() * 2 - 1) * 0.2,
      uniform_warp_strength: randomInRange(0.2, 1.0),
      uniform_warp_scale: randomInRange(0.5, 4),
      uniform_turbulence: randomInRange(0.1, 0.7),
      uniform_brightness: randomInRange(0.9, 1.2),
      uniform_contrast: randomInRange(1.0, 1.3),
      uniform_saturation: randomInRange(0.9, 1.3),
      uniform_grain_amount: randomInRange(0.05, 0.25),
      uniform_grain_size: randomInRange(0.8, 2),
    });
    setActivePreset(null);
  }, [setParamsPartial, setActivePreset]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Presets</h3>
        <button
          type="button"
          onClick={randomize}
          className="px-3 py-1.5 text-xs rounded bg-white/10 text-white/90 hover:bg-white/20"
        >
          Randomize
        </button>
      </div>
      <ScrollArea className="h-48" type="scroll">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pr-2">
          {presets.map((preset) => {
          const presetName = getPresetName(preset);
          const isActive = getPresetName(activePreset) === presetName;
          return (
            <button
              key={presetName}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`
                flex flex-col rounded-lg border overflow-hidden transition-colors
                ${isActive ? "border-white/60 ring-1 ring-white/40" : "border-white/20 hover:border-white/40"}
              `}
            >
              <div className="aspect-video w-full shrink-0 bg-neutral-900 overflow-hidden">
                {thumbnails[presetName] ? (
                  <img
                    src={thumbnails[presetName]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${preset.params.uniform_palette_colors_hex
                        .slice(0, 3)
                        .join(", ")})`,
                    }}
                  />
                )}
              </div>
              <span className="p-1.5 text-xs text-white/80 truncate text-center">
                {presetName}
              </span>
            </button>
          );
        })}
        </div>
      </ScrollArea>
    </div>
  );
}

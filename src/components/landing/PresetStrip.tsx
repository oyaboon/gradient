"use client";

import type { Preset } from "@/types/preset";

interface PresetStripProps {
  presets: Preset[];
  activePresetName: string | null;
  onSelect: (preset: Preset) => void;
  /** Optional: render a small preview for each preset. */
  renderPreview?: (preset: Preset) => React.ReactNode;
}

export function PresetStrip({
  presets,
  activePresetName,
  onSelect,
  renderPreview,
}: PresetStripProps) {
  return (
    <section className="relative z-10 py-16 px-6 border-t border-white/10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-white mb-8">
          Try a preset
        </h2>
        <div className="flex flex-wrap gap-4 justify-center">
          {presets.map((preset) => {
            const isActive = activePresetName === preset.preset_name;
            return (
              <button
                key={preset.preset_name}
                type="button"
                onClick={() => onSelect(preset)}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors
                  ${isActive
                    ? "border-white/60 bg-white/10"
                    : "border-white/20 hover:border-white/40 hover:bg-white/5"}
                `}
              >
                {renderPreview?.(preset) ?? (
                  <div
                    className="w-20 h-12 rounded bg-white/10"
                    style={{
                      background: `linear-gradient(90deg, ${preset.uniform_palette_colors_hex.slice(0, 3).join(", ")})`,
                    }}
                  />
                )}
                <span className="text-xs text-white/80 font-medium">
                  {preset.preset_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

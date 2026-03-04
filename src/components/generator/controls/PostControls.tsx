"use client";

import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface PostControlsProps {
  params: Pick<
    GradientParams,
    "uniform_brightness" | "uniform_contrast" | "uniform_saturation"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function PostControls({ params, onChange }: PostControlsProps) {
  const handleRandomizeColor = () => {
    onChange({
      uniform_brightness: randomInRange(0.9, 1.2),
      uniform_contrast: randomInRange(1.0, 1.3),
      uniform_saturation: randomInRange(0.9, 1.3),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white">Color correction</span>
        <button
          type="button"
          onClick={handleRandomizeColor}
          title="Randomize brightness, contrast, saturation"
          className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
        >
          Randomize
        </button>
      </div>
      <Slider
        label="Brightness"
        value={params.uniform_brightness}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_brightness: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
      <Slider
        label="Contrast"
        value={params.uniform_contrast}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_contrast: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
      <Slider
        label="Saturation"
        value={params.uniform_saturation}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_saturation: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
    </div>
  );
}

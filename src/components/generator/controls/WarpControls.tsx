"use client";

import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface WarpControlsProps {
  params: Pick<
    GradientParams,
    "uniform_warp_strength" | "uniform_warp_scale" | "uniform_turbulence"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function WarpControls({ params, onChange }: WarpControlsProps) {
  const handleRandomizeWarp = () => {
    onChange({
      uniform_warp_strength: randomInRange(0.2, 1.0),
      uniform_warp_scale: randomInRange(0.5, 4),
      uniform_turbulence: randomInRange(0.1, 0.7),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white">Warp</span>
        <button
          type="button"
          onClick={handleRandomizeWarp}
          title="Randomize warp"
          className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
        >
          Randomize
        </button>
      </div>
      <Slider
        label="Warp strength"
        value={params.uniform_warp_strength}
        min={0}
        max={1.2}
        step={0.05}
        onChange={(v) => onChange({ uniform_warp_strength: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
      <Slider
        label="Warp scale"
        value={params.uniform_warp_scale}
        min={0.2}
        max={6}
        step={0.1}
        onChange={(v) => onChange({ uniform_warp_scale: v })}
        showValue
        valueFormat={(v) => v.toFixed(1)}
      />
      <Slider
        label="Turbulence"
        value={params.uniform_turbulence}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => onChange({ uniform_turbulence: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
    </div>
  );
}

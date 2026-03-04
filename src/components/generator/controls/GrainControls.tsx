"use client";

import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface GrainControlsProps {
  params: Pick<
    GradientParams,
    "uniform_grain_amount" | "uniform_grain_size"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function GrainControls({ params, onChange }: GrainControlsProps) {
  const handleRandomizeGrain = () => {
    onChange({
      uniform_grain_amount: randomInRange(0.05, 0.25),
      uniform_grain_size: randomInRange(0.8, 1.6),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white">Grain</span>
        <button
          type="button"
          onClick={handleRandomizeGrain}
          title="Randomize grain"
          className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
        >
          Randomize
        </button>
      </div>
      <Slider
        label="Grain amount"
        value={params.uniform_grain_amount}
        min={0}
        max={0.25}
        step={0.01}
        onChange={(v) => onChange({ uniform_grain_amount: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
      <Slider
        label="Grain size"
        value={params.uniform_grain_size}
        min={0.5}
        max={1.6}
        step={0.1}
        onChange={(v) => onChange({ uniform_grain_size: v })}
        showValue
        valueFormat={(v) => v.toFixed(1)}
      />
    </div>
  );
}

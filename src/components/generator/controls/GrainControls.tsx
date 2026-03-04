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

export function GrainControls({ params, onChange }: GrainControlsProps) {
  return (
    <div className="space-y-4">
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

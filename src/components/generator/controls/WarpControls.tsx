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

export function WarpControls({ params, onChange }: WarpControlsProps) {
  return (
    <div className="space-y-4">
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

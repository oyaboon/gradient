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

export function PostControls({ params, onChange }: PostControlsProps) {
  return (
    <div className="space-y-4">
      <Slider
        label="Brightness"
        value={params.uniform_brightness}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_brightness: v })}
      />
      <Slider
        label="Contrast"
        value={params.uniform_contrast}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_contrast: v })}
      />
      <Slider
        label="Saturation"
        value={params.uniform_saturation}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_saturation: v })}
      />
    </div>
  );
}

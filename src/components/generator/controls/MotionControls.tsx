"use client";

import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface MotionControlsProps {
  params: Pick<
    GradientParams,
    "uniform_motion_speed" | "uniform_flow_rotation_radians"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

export function MotionControls({ params, onChange }: MotionControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ uniform_seed: Math.random() * 400 })}
          className="px-3 py-1.5 rounded text-sm bg-white/10 text-white/80 hover:bg-white/20"
          title="Новый случайный паттерн"
        >
          Randomize
        </button>
      </div>
      <Slider
        label="Speed"
        value={params.uniform_motion_speed}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ uniform_motion_speed: v })}
        showValue
        valueFormat={(v) => v.toFixed(2)}
      />
      <Slider
        label="Rotation (°)"
        value={(params.uniform_flow_rotation_radians * 180) / Math.PI}
        min={0}
        max={360}
        step={1}
        onChange={(v) =>
          onChange({ uniform_flow_rotation_radians: (v * Math.PI) / 180 })
        }
        showValue
        valueFormat={(v) => Math.round(v).toString()}
      />
    </div>
  );
}

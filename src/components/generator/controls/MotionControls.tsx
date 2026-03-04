"use client";

import { useState, useCallback, useEffect } from "react";
import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface MotionControlsProps {
  params: Pick<
    GradientParams,
    | "uniform_seed"
    | "uniform_motion_speed"
    | "uniform_flow_rotation_radians"
    | "uniform_flow_drift_speed_x"
    | "uniform_flow_drift_speed_y"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

export function MotionControls({ params, onChange }: MotionControlsProps) {
  const [seedInput, setSeedInput] = useState<string>(() =>
    String(params.uniform_seed)
  );
  useEffect(() => {
    setSeedInput(String(params.uniform_seed));
  }, [params.uniform_seed]);
  const commitSeed = useCallback(
    (raw: string) => {
      const n = parseFloat(raw.replace(",", "."));
      if (!Number.isNaN(n) && isFinite(n)) {
        const value = Math.max(0, Math.min(1e6, n));
        onChange({ uniform_seed: value });
        setSeedInput(String(value));
      } else {
        setSeedInput(String(params.uniform_seed));
      }
    },
    [onChange, params.uniform_seed]
  );

  const handleRandomizeSeed = () => {
    const value = Math.random() * 400;
    onChange({ uniform_seed: value });
    setSeedInput(String(value));
  };

  const handleRandomizeWave = () => {
    const speed = 0.2 + Math.random() * 1.3;
    const rotation = Math.random() * Math.PI * 2;
    onChange({
      uniform_motion_speed: speed,
      uniform_flow_rotation_radians: rotation,
    });
  };

  const handleRandomizeDrift = () => {
    const driftRange = 0.2;
    const driftX = (Math.random() * 2 - 1) * driftRange;
    const driftY = (Math.random() * 2 - 1) * driftRange;
    onChange({
      uniform_flow_drift_speed_x: driftX,
      uniform_flow_drift_speed_y: driftY,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white">Seed</span>
        <button
          type="button"
          onClick={handleRandomizeSeed}
          title="Randomize seed"
          className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
        >
          Randomize
        </button>
      </div>
      <input
        type="text"
        value={seedInput}
        onChange={(e) => setSeedInput(e.target.value)}
        onBlur={() => commitSeed(seedInput)}
        onKeyDown={(e) => e.key === "Enter" && commitSeed(seedInput)}
        className="w-full min-w-0 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm font-mono"
      />
      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-white">Wave</span>
          <button
            type="button"
            onClick={handleRandomizeWave}
            title="Randomize speed and rotation"
            className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
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
          label="Rotation"
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
      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-white">Drift</span>
          <button
            type="button"
            onClick={handleRandomizeDrift}
            title="Randomize drift X and Y"
            className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
          >
            Randomize
          </button>
        </div>
        <Slider
          label="X"
          value={params.uniform_flow_drift_speed_x}
          min={-0.3}
          max={0.3}
          step={0.01}
          onChange={(v) => onChange({ uniform_flow_drift_speed_x: v })}
          showValue
          valueFormat={(v) => v.toFixed(2)}
        />
        <Slider
          label="Y"
          value={params.uniform_flow_drift_speed_y}
          min={-0.3}
          max={0.3}
          step={0.01}
          onChange={(v) => onChange({ uniform_flow_drift_speed_y: v })}
          showValue
          valueFormat={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  );
}

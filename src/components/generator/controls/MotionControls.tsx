"use client";

import { useState, useCallback, useEffect } from "react";
import type { GradientParams } from "@/types/preset";
import { Slider } from "@/components/ui/Slider";

interface MotionControlsProps {
  params: Pick<
    GradientParams,
    "uniform_seed" | "uniform_motion_speed" | "uniform_flow_rotation_radians"
  >;
  onChange: (partial: Partial<GradientParams>) => void;
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
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

  const handleRandomize = () => {
    const value = Math.random() * 400;
    onChange({ uniform_seed: value });
    setSeedInput(String(value));
  };

  return (
    <div className="space-y-4">
      <span className="text-xs text-white/70 block">Seed</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRandomize}
          title="Randomize seed"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded border border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
        >
          <RefreshIcon />
        </button>
        <input
          type="text"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          onBlur={() => commitSeed(seedInput)}
          onKeyDown={(e) => e.key === "Enter" && commitSeed(seedInput)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm font-mono"
        />
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
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
    </div>
  );
}

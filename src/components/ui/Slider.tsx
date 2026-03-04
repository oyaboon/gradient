"use client";

import { useId } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  /** Show current value next to the label */
  showValue?: boolean;
  valueFormat?: (v: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  className = "",
  showValue = false,
  valueFormat = (v) => v.toFixed(2),
}: SliderProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs text-white/70 flex items-center justify-between gap-2">
        <span>{label}</span>
        {showValue && <span className="text-white/90 tabular-nums">{valueFormat(value)}</span>}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-white/20 accent-white"
      />
    </div>
  );
}

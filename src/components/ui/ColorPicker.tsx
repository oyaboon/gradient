"use client";

import { useId } from "react";

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export function ColorPicker({
  label,
  value,
  onChange,
  className = "",
}: ColorPickerProps) {
  const id = useId();
  const hex = value.startsWith("#") ? value : `#${value}`;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        id={id}
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-white/20 cursor-pointer bg-transparent"
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#?[0-9A-Fa-f]{0,6}$/.test(v) || v === "") {
            onChange(v.startsWith("#") ? v : v ? `#${v}` : "#000000");
          }
        }}
        className="flex-1 min-w-0 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm font-mono"
      />
      {label && (
        <label htmlFor={id} className="text-xs text-white/60 shrink-0">
          {label}
        </label>
      )}
    </div>
  );
}

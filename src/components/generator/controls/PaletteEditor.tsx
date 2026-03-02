"use client";

import { useCallback } from "react";
import type { GradientParams } from "@/types/preset";
import { ColorPicker } from "@/components/ui/ColorPicker";

interface PaletteEditorProps {
  colors: string[];
  onChange: (partial: Partial<GradientParams>) => void;
}

const MIN_COLORS = 3;
const MAX_COLORS = 6;

export function PaletteEditor({ colors, onChange }: PaletteEditorProps) {
  const update = useCallback(
    (index: number, hex: string) => {
      const next = [...(colors.length ? colors : ["#000000", "#333333", "#666666"])];
      while (next.length <= index) next.push("#000000");
      next[index] = hex.startsWith("#") ? hex : `#${hex}`;
      onChange({ uniform_palette_colors_hex: next });
    },
    [colors, onChange]
  );

  const add = useCallback(() => {
    const next = [...colors];
    if (next.length >= MAX_COLORS) return;
    next.push("#808080");
    onChange({ uniform_palette_colors_hex: next });
  }, [colors, onChange]);

  const remove = useCallback(() => {
    if (colors.length <= MIN_COLORS) return;
    const next = colors.slice(0, -1);
    onChange({ uniform_palette_colors_hex: next });
  }, [colors, onChange]);

  const list = colors.length >= MIN_COLORS ? colors : ["#0B1020", "#2A6BFF", "#00FFD1"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Palette</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={remove}
            disabled={list.length <= MIN_COLORS}
            className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 disabled:opacity-50 hover:bg-white/20"
          >
            −
          </button>
          <button
            type="button"
            onClick={add}
            disabled={list.length >= MAX_COLORS}
            className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 disabled:opacity-50 hover:bg-white/20"
          >
            +
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {list.map((hex, i) => (
          <ColorPicker
            key={i}
            value={hex}
            onChange={(h) => update(i, h)}
          />
        ))}
      </div>
    </div>
  );
}

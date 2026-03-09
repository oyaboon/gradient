import type { GradientPreset } from "@/types/preset";
import { PRESETS } from "./data";

/** Demo presets shown on landing (3–6). */
export const DEMO_PRESET_IDS = [0, 1, 2, 3, 4] as const;

export function getDemoPresets(): GradientPreset[] {
  return DEMO_PRESET_IDS.map((i) => PRESETS[i]).filter(Boolean);
}

export function getAllPresets(): GradientPreset[] {
  return [...PRESETS];
}

export function getPresetById(index: number): GradientPreset | undefined {
  return PRESETS[index];
}

export { PRESETS };

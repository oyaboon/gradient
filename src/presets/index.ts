import type { Preset } from "@/types/preset";
import { PRESETS } from "./data";

/** Demo presets shown on landing (3–6). */
export const DEMO_PRESET_IDS = [0, 1, 2, 3, 4] as const;

export function getDemoPresets(): Preset[] {
  return DEMO_PRESET_IDS.map((i) => PRESETS[i]).filter(Boolean);
}

export function getAllPresets(): Preset[] {
  return [...PRESETS];
}

export function getPresetById(index: number): Preset | undefined {
  return PRESETS[index];
}

export { PRESETS };

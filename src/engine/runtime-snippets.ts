"use client";

import { encodeCompactPreset } from "@/lib/compact-preset";
import type { GradientPreset } from "@/types/preset";
import { RUNTIME_FILENAME } from "./export-embed";

/**
 * Returns only the readable preset JSON. Use for "Copy readable preset" — no script, no mount call.
 */
export function createReadablePresetExport(preset: GradientPreset): string {
  return JSON.stringify(preset, null, 2);
}

/**
 * Returns only the compact key (g2:...). Use for "Copy compact key" — no script, no mount call.
 */
export function createCompactPresetExport(preset: GradientPreset): string {
  return encodeCompactPreset(preset);
}

export interface UsageExampleOptions {
  selector?: string;
  runtimeFilename?: string;
  presetExpression: string;
  mode?: string;
}

/**
 * Builds a full HTML/script usage example. For documentation/preview only — not for copy-preset buttons.
 */
export function createUsageExample(options: UsageExampleOptions): string {
  const selector = options.selector ?? ".gradient-runtime-target";
  const runtimeFilename = options.runtimeFilename ?? RUNTIME_FILENAME;
  const presetExpression = options.presetExpression;
  const mode = options.mode ?? "animated";

  return `<script src="./${runtimeFilename}"></script>
<script>
  const preset = ${presetExpression};

  Gradient.mount(${JSON.stringify(selector)}, preset, {
    mode: ${JSON.stringify(mode)}
  });
</script>`;
}

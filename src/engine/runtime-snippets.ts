"use client";

import { encodeCompactPreset } from "@/lib/compact-preset";
import type { GradientPreset } from "@/types/preset";
import type { DeveloperExportOptions } from "@/types/export";
import { RUNTIME_FILENAME } from "./export-embed";

export interface RuntimeSnippetOptions {
  selector?: string;
  runtimeFilename?: string;
  exportOptions: DeveloperExportOptions;
}

const DEFAULT_SELECTOR = ".gradient-runtime-target";
const DEFAULT_RUNTIME_FILENAME = RUNTIME_FILENAME;

function formatPresetForSnippet(
  preset: GradientPreset,
  options: DeveloperExportOptions
): string {
  if (options.presetFormat === "compact") {
    return JSON.stringify(encodeCompactPreset(preset));
  }

  return JSON.stringify(preset, null, 2);
}

export function createMountSnippet(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const selector = options.selector ?? DEFAULT_SELECTOR;
  const runtimeFilename = options.runtimeFilename ?? DEFAULT_RUNTIME_FILENAME;
  const presetExpression = formatPresetForSnippet(preset, options.exportOptions);

  return `<script src="./${runtimeFilename}"></script>
<script>
  const preset = ${presetExpression};

  Gradient.mount(${JSON.stringify(selector)}, preset, {
    mode: "animated"
  });
</script>`;
}

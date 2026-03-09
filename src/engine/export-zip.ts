/**
 * Build ZIP exports using the shared runtime artifact plus canonical preset JSON.
 */

import JSZip from "jszip";
import { generateRuntimeJavascript, RUNTIME_FILENAME } from "./export-embed";
import type { GradientPreset } from "@/types/preset";
import { getPresetName } from "@/lib/preset";

function createHtmlDocument(
  preset: GradientPreset,
  runtimeFilename: string,
  mountOptions?: Record<string, unknown>
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${getPresetName(preset)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #050816; }
    #gradient-runtime-container { position: relative; width: 100%; height: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="gradient-runtime-container"></div>
  <script src="${runtimeFilename}"></script>
  <script>
    const preset = ${JSON.stringify(preset, null, 2)};
    window.addEventListener("load", function () {
      window.Gradient.mount("#gradient-runtime-container", preset, ${JSON.stringify(
        mountOptions ?? { mode: "animated" },
        null,
        2
      )});
    });
  </script>
</body>
</html>
`;
}

export async function createGradientZip(
  preset: GradientPreset,
  _fallbackDataUrl?: string | null
): Promise<Blob> {
  const zip = new JSZip();

  zip.file("index.html", createHtmlDocument(preset, RUNTIME_FILENAME));
  zip.file(RUNTIME_FILENAME, generateRuntimeJavascript());
  zip.file("preset.json", JSON.stringify(preset, null, 2));

  return zip.generateAsync({ type: "blob" });
}

/**
 * Build a ZIP for Wallpaper Engine (Web Wallpaper).
 * Same content as createGradientZip plus project.json and README.
 * @see https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
 */
export async function createWallpaperEngineZip(
  preset: GradientPreset,
  _fallbackDataUrl?: string | null
): Promise<Blob> {
  const zip = new JSZip();
  const title = getPresetName(preset);
  const projectJson = {
    file: "index.html",
    title,
    type: "web",
    general: { properties: {} },
  };

  const readme = `Wallpaper Engine - Web Wallpaper
===============================

1. Extract this folder somewhere (e.g. Desktop).
2. Open Wallpaper Engine.
3. Click "Create Wallpaper" and choose "Create wallpaper from file".
4. Select the "index.html" file from this folder.

All files (HTML, JS, images) are bundled locally; no internet required.
Docs: https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
`;

  zip.file("index.html", createHtmlDocument(preset, RUNTIME_FILENAME, { mode: "animated" }));
  zip.file(RUNTIME_FILENAME, generateRuntimeJavascript());
  zip.file("preset.json", JSON.stringify(preset, null, 2));
  zip.file("project.json", JSON.stringify(projectJson, null, 2));
  zip.file("README.txt", readme);

  return zip.generateAsync({ type: "blob" });
}

export function downloadZip(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "gradient-export.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}

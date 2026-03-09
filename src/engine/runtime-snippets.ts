"use client";

import type { GradientPreset } from "@/types/preset";
import type { GradientMountOptions } from "./runtime-types";

export interface RuntimeSnippetOptions {
  selector: string;
  mountOptions?: Partial<GradientMountOptions>;
  runtimeFilename?: string;
}

const DEFAULT_RUNTIME_FILENAME = "gradient-runtime.js";

function createTargetMarkup(selector: string): string {
  if (/^#[A-Za-z][\w-]*$/.test(selector)) {
    return `<div id="${selector.slice(1)}"></div>`;
  }

  if (/^\.[A-Za-z][\w-]*$/.test(selector)) {
    return `<div class="${selector.slice(1)}"></div>`;
  }

  return `<div id="gradient-runtime-target"></div>`;
}

function getHtmlSelector(selector: string): string {
  if (/^#[A-Za-z][\w-]*$/.test(selector) || /^\.[A-Za-z][\w-]*$/.test(selector)) {
    return selector;
  }

  return "#gradient-runtime-target";
}

function formatMountOptions(options?: Partial<GradientMountOptions>): string {
  if (!options || Object.keys(options).length === 0) {
    return "{}";
  }

  return JSON.stringify(options, null, 2);
}

export function createMountSnippet(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const mountOptions = formatMountOptions(options.mountOptions);

  return `const preset = ${JSON.stringify(preset, null, 2)};

Gradient.mount(${JSON.stringify(options.selector)}, preset, ${mountOptions});`;
}

export function createHtmlExample(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const runtimeFilename = options.runtimeFilename ?? DEFAULT_RUNTIME_FILENAME;
  const htmlSelector = getHtmlSelector(options.selector);
  const mountSnippet = createMountSnippet(preset, { ...options, selector: htmlSelector });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gradient Runtime Example</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #050816;
      }

      ${htmlSelector} {
        position: relative;
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    ${createTargetMarkup(options.selector)}
    <script src="./${runtimeFilename}"></script>
    <script>
${mountSnippet
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </script>
  </body>
</html>`;
}

export function createReactExample(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const mountOptions = formatMountOptions(options.mountOptions);

  return `import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Gradient: {
      mount: (
        target: string | HTMLElement,
        preset: unknown,
        options?: unknown
      ) => { destroy: () => void };
    };
  }
}

const preset = ${JSON.stringify(preset, null, 2)};

export function GradientSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const instance = window.Gradient.mount(containerRef.current, preset, ${mountOptions});
    return () => instance.destroy();
  }, []);

  return <div ref={containerRef} style={{ position: "relative", minHeight: "100vh" }} />;
}`;
}

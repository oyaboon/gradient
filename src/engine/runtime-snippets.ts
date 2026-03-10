"use client";

import type { DeveloperRuntimeMethod } from "@/types/export";
import type { GradientPreset } from "@/types/preset";
import type { GradientSharedMountOptions } from "./runtime-types";

export interface RuntimeSnippetOptions {
  selector: string;
  mountMethod?: DeveloperRuntimeMethod;
  mountOptions?: Partial<GradientSharedMountOptions>;
  runtimeFilename?: string;
}

const DEFAULT_RUNTIME_FILENAME = "gradient-runtime.js";

function createTargetMarkup(selector: string, mountMethod: DeveloperRuntimeMethod): string {
  if (mountMethod === "mountShared" && /^\.[A-Za-z][\w-]*$/.test(selector)) {
    const className = selector.slice(1);

    return `<section class="gradient-runtime-grid">
      <div class="${className}"></div>
      <div class="${className}"></div>
      <div class="${className}"></div>
    </section>`;
  }

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

function formatMountOptions(options?: Partial<GradientSharedMountOptions>): string {
  if (!options || Object.keys(options).length === 0) {
    return "{}";
  }

  return JSON.stringify(options, null, 2);
}

function getRuntimeMethodName(method?: DeveloperRuntimeMethod): DeveloperRuntimeMethod {
  return method ?? "mount";
}

export function createMountSnippet(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const runtimeMethod = getRuntimeMethodName(options.mountMethod);
  const mountOptions = formatMountOptions(options.mountOptions);

  return `const preset = ${JSON.stringify(preset, null, 2)};

Gradient.${runtimeMethod}(${JSON.stringify(options.selector)}, preset, ${mountOptions});`;
}

export function createHtmlExample(
  preset: GradientPreset,
  options: RuntimeSnippetOptions
): string {
  const runtimeMethod = getRuntimeMethodName(options.mountMethod);
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

      .gradient-runtime-grid {
        display: grid;
        gap: 24px;
        padding: 32px;
      }

      ${htmlSelector} {
        position: relative;
        min-height: ${runtimeMethod === "mountShared" ? "180px" : "100vh"};
        border-radius: 18px;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    ${createTargetMarkup(options.selector, runtimeMethod)}
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
  const runtimeMethod = getRuntimeMethodName(options.mountMethod);
  const mountOptions = formatMountOptions(options.mountOptions);
  const usesSharedSelector = runtimeMethod === "mountShared" && /^\.[A-Za-z][\w-]*$/.test(options.selector);
  const targetMarkup = usesSharedSelector
    ? `  return (
    <div style={{ display: "grid", gap: 24, padding: 32 }}>
      <div className="${options.selector.slice(1)}" style={{ position: "relative", minHeight: 180 }} />
      <div className="${options.selector.slice(1)}" style={{ position: "relative", minHeight: 180 }} />
      <div className="${options.selector.slice(1)}" style={{ position: "relative", minHeight: 180 }} />
    </div>
  );`
    : `  return <div ref={containerRef} style={{ position: "relative", minHeight: "100vh" }} />;`;

  return `import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Gradient: {
      mount: (
        target: string | HTMLElement,
        preset: unknown,
        options?: unknown
      ) => { destroy: () => void };
      mountShared: (
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
    if (${JSON.stringify(runtimeMethod)} === "mount" && !containerRef.current) {
      return;
    }

    const target = ${JSON.stringify(runtimeMethod)} === "mount"
      ? containerRef.current
      : ${JSON.stringify(options.selector)};
    const instance = window.Gradient.${runtimeMethod}(target, preset, ${mountOptions});
    return () => instance.destroy();
  }, []);

${targetMarkup}
}`;
}

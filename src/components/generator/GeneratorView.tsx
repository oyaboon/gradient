"use client";

import { useRef, useCallback } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";
import { PresetGallery } from "./PresetGallery";
import { ControlsPanel } from "./ControlsPanel";
import { ExportPanel } from "./ExportPanel";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { GradientRenderer } from "@/engine/renderer";
import type { DeveloperExportOptions, PngExportOptions } from "@/types/export";
import { generateRuntimeJavascript, RUNTIME_FILENAME } from "@/engine/export-embed";
import {
  capturePngAsDataUrl,
  downloadPng,
} from "@/engine/export-png";
import {
  createWallpaperEngineZip,
  downloadZip,
} from "@/engine/export-zip";
import {
  createHtmlExample,
  createMountSnippet,
  createReactExample,
} from "@/engine/runtime-snippets";
import { buildPresetFromStore, getPresetName, parsePresetJson } from "@/lib/preset";
import { useToastStore } from "@/store/useToastStore";

export function GeneratorView() {
  const params = useGradientStore((s) => s.params);
  const activePreset = useGradientStore((s) => s.activePreset);
  const applyPreset = useGradientStore((s) => s.applyPreset);
  const qualityResolutionScale = useGradientStore((s) => s.qualityResolutionScale);
  const qualityFpsCap = useGradientStore((s) => s.qualityFpsCap);
  const qualityFlowMapSize = useGradientStore((s) => s.qualityFlowMapSize);
  const qualityFlowFps = useGradientStore((s) => s.qualityFlowFps);
  const fallbackDataUrl = useGradientStore((s) => s.fallbackDataUrl);
  const setFallbackDataUrl = useGradientStore((s) => s.setFallbackDataUrl);
  const setMode = useGradientStore((s) => s.setMode);

  const rendererRef = useRef<GradientRenderer | null>(null);
  const showToast = useToastStore((s) => s.show);

  const buildPresetForExport = useCallback(() => {
    return buildPresetFromStore({
      params,
      activePreset,
      qualityResolutionScale,
      qualityFpsCap,
      qualityFlowMapSize,
      qualityFlowFps,
    });
  }, [
    activePreset,
    params,
    qualityResolutionScale,
    qualityFpsCap,
    qualityFlowMapSize,
    qualityFlowFps,
  ]);

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          showToast(successMessage);
          return;
        } catch {
          // Fall through to execCommand fallback
        }
      }

      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error("Copy failed");
      }

      showToast(successMessage);
    },
    [showToast]
  );

  const downloadText = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const getSnippetPayload = useCallback(
    (options: DeveloperExportOptions) => {
      const preset = buildPresetForExport();
      const { selector, mountMethod, ...mountOptions } = options;
      const filteredMountOptions = Object.fromEntries(
        Object.entries(mountOptions).filter(([, value]) => value != null)
      );

      return {
        preset,
        selector,
        mountMethod,
        mountOptions: filteredMountOptions,
      };
    },
    [buildPresetForExport]
  );

  const handleDownloadWallpaperEngine = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      const blob = await createWallpaperEngineZip(preset, fallbackDataUrl);
      const name = getPresetName(activePreset).replace(/\s+/g, "-").toLowerCase();
      downloadZip(blob, `gradient-wallpaper-engine-${name}.zip`);
      showToast("Wallpaper Engine pack downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [buildPresetForExport, fallbackDataUrl, activePreset, showToast]);

  const handleDownloadPng = useCallback((options: PngExportOptions) => {
    const renderer = rendererRef.current;
    if (!renderer) {
      showToast("Canvas not ready");
      return;
    }
    try {
      const { width, height } = options;
      const dataUrl = capturePngAsDataUrl(renderer, params, width, height);
      const name = getPresetName(activePreset);
      downloadPng(dataUrl, `${name.replace(/\s+/g, "-").toLowerCase()}.png`);
      showToast("PNG downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [params, activePreset, showToast]);

  const handleCopyPresetJson = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      await copyText(JSON.stringify(preset, null, 2), "Preset JSON copied");
    } catch {
      showToast("Copy failed");
    }
  }, [buildPresetForExport, copyText, showToast]);

  const handleDownloadPresetJson = useCallback(() => {
    try {
      const preset = buildPresetForExport();
      downloadText(
        JSON.stringify(preset, null, 2),
        `${getPresetName(preset).replace(/\s+/g, "-").toLowerCase()}.json`,
        "application/json"
      );
      showToast("Preset JSON exported");
    } catch {
      showToast("Export failed");
    }
  }, [buildPresetForExport, downloadText, showToast]);

  const handleImportPresetJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = reader.result as string;
          const preset = parsePresetJson(raw);
          applyPreset(preset);
          showToast("Preset imported");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid preset JSON";
          showToast(message);
        }
      };
      reader.readAsText(file);
    },
    [applyPreset, showToast]
  );

  const handleDownloadRuntimeJs = useCallback(() => {
    try {
      downloadText(generateRuntimeJavascript(), RUNTIME_FILENAME, "text/javascript");
      showToast("Runtime JS downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [downloadText, showToast]);

  const handleCopyMountSnippet = useCallback(
    async (options: DeveloperExportOptions) => {
      try {
        const payload = getSnippetPayload(options);
        await copyText(
          createMountSnippet(payload.preset, payload),
          "Mount snippet copied"
        );
      } catch {
        showToast("Copy failed");
      }
    },
    [copyText, getSnippetPayload, showToast]
  );

  const handleCopyHtmlExample = useCallback(
    async (options: DeveloperExportOptions) => {
      try {
        const payload = getSnippetPayload(options);
        await copyText(
          createHtmlExample(payload.preset, {
            ...payload,
            runtimeFilename: RUNTIME_FILENAME,
          }),
          "HTML example copied"
        );
      } catch {
        showToast("Copy failed");
      }
    },
    [copyText, getSnippetPayload, showToast]
  );

  const handleCopyReactExample = useCallback(
    async (options: DeveloperExportOptions) => {
      try {
        const payload = getSnippetPayload(options);
        await copyText(
          createReactExample(payload.preset, payload),
          "React example copied"
        );
      } catch {
        showToast("Copy failed");
      }
    },
    [copyText, getSnippetPayload, showToast]
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 min-h-[50vh] md:min-h-screen relative">
        <GradientCanvas
          params={params}
          config={{
            resolutionScale: qualityResolutionScale,
            fpsCap: qualityFpsCap,
            flowMapSize: qualityFlowMapSize,
            flowFps: qualityFlowFps,
          }}
          rendererRef={rendererRef}
          onFallbackCapture={setFallbackDataUrl}
          className="absolute inset-0"
        />
      </div>
      <ScrollArea
        type="scroll"
        className="w-full md:w-96 lg:w-[28rem] flex-shrink-0 bg-neutral-950/95 border-t md:border-t-0 md:border-l border-white/10 h-screen"
      >
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              Generator
            </h2>
            <button
              type="button"
              onClick={() => setMode("landing")}
              className="text-xs text-white/60 hover:text-white"
            >
              Back to landing
            </button>
          </div>
          <PresetGallery />
          <ControlsPanel />
          <ExportPanel
            onDownloadWallpaperEngine={handleDownloadWallpaperEngine}
            onDownloadPng={handleDownloadPng}
            onCopyPresetJson={handleCopyPresetJson}
            onDownloadPresetJson={handleDownloadPresetJson}
            onImportPresetJson={handleImportPresetJson}
            onDownloadRuntimeJs={handleDownloadRuntimeJs}
            onCopyMountSnippet={handleCopyMountSnippet}
            onCopyHtmlExample={handleCopyHtmlExample}
            onCopyReactExample={handleCopyReactExample}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useRef, useCallback } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";
import { PresetGallery } from "./PresetGallery";
import { ControlsPanel } from "./ControlsPanel";
import { ExportPanel } from "./ExportPanel";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { GradientRenderer } from "@/engine/renderer";
import type { PngExportOptions } from "@/types/export";
import {
  capturePngAsDataUrl,
  downloadPng,
} from "@/engine/export-png";
import {
  createWallpaperEngineZip,
  downloadZip,
} from "@/engine/export-zip";
import {
  createReadablePresetExport,
  createCompactPresetExport,
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

  const handleCopyPngToClipboard = useCallback(
    async (options: PngExportOptions) => {
      const renderer = rendererRef.current;
      if (!renderer) {
        showToast("Canvas not ready");
        return;
      }
      try {
        const { width, height } = options;
        const dataUrl = capturePngAsDataUrl(renderer, params, width, height);
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("Copied to clipboard — paste in Figma");
      } catch {
        showToast("Copy failed");
      }
    },
    [params, showToast]
  );

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

  const handleCopyReadablePreset = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      await copyText(createReadablePresetExport(preset), "Readable preset copied");
    } catch {
      showToast("Copy failed");
    }
  }, [buildPresetForExport, copyText, showToast]);

  const handleCopyCompactKey = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      await copyText(createCompactPresetExport(preset), "Compact key copied");
    } catch {
      showToast("Copy failed");
    }
  }, [buildPresetForExport, copyText, showToast]);

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
            onCopyPngToClipboard={handleCopyPngToClipboard}
            onCopyPresetJson={handleCopyPresetJson}
            onDownloadPresetJson={handleDownloadPresetJson}
            onImportPresetJson={handleImportPresetJson}
            onCopyReadablePreset={handleCopyReadablePreset}
            onCopyCompactKey={handleCopyCompactKey}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useRef, useState, useCallback } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";
import { PresetGallery } from "./PresetGallery";
import { ControlsPanel } from "./ControlsPanel";
import { ExportPanel } from "./ExportPanel";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { GradientRenderer } from "@/engine/renderer";
import type { Preset } from "@/types/preset";
import { generateEmbedCode } from "@/engine/export-embed";
import {
  capturePngAsDataUrl,
  downloadPng,
  PNG_SIZES,
} from "@/engine/export-png";
import {
  createGradientZip,
  createWallpaperEngineZip,
  downloadZip,
} from "@/engine/export-zip";
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
  const setQualityResolutionScale = useGradientStore((s) => s.setQualityResolutionScale);
  const setQualityFpsCap = useGradientStore((s) => s.setQualityFpsCap);
  const setQualityFlowMapSize = useGradientStore((s) => s.setQualityFlowMapSize);
  const setQualityFlowFps = useGradientStore((s) => s.setQualityFlowFps);

  const rendererRef = useRef<GradientRenderer | null>(null);
  const [copyEmbedLoading, setCopyEmbedLoading] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const buildPresetForExport = useCallback((): Preset => {
    const name = activePreset?.preset_name ?? "Exported";
    return {
      preset_version: "1.0",
      preset_name: name,
      ...params,
      quality_resolution_scale: qualityResolutionScale,
      quality_fps_cap: qualityFpsCap,
      quality_flow_map_size: qualityFlowMapSize,
      quality_flow_fps: qualityFlowFps,
      export_fallback_image_data_url: fallbackDataUrl ?? undefined,
    };
  }, [
    activePreset?.preset_name,
    params,
    qualityResolutionScale,
    qualityFpsCap,
    qualityFlowMapSize,
    qualityFlowFps,
    fallbackDataUrl,
  ]);

  const handleCopyEmbed = useCallback(async () => {
    setCopyEmbedLoading(true);
    try {
      const code = generateEmbedCode(params, fallbackDataUrl);
      await navigator.clipboard.writeText(code);
      showToast("Embed code copied");
    } catch {
      showToast("Copy failed");
    } finally {
      setCopyEmbedLoading(false);
    }
  }, [params, fallbackDataUrl, showToast]);

  const handleDownloadZip = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      const blob = await createGradientZip(preset, fallbackDataUrl);
      downloadZip(blob, "gradient-export.zip");
      showToast("ZIP downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [buildPresetForExport, fallbackDataUrl, showToast]);

  const handleDownloadWallpaperEngine = useCallback(async () => {
    try {
      const preset = buildPresetForExport();
      const blob = await createWallpaperEngineZip(preset, fallbackDataUrl);
      const name = (activePreset?.preset_name ?? "gradient").replace(/\s+/g, "-").toLowerCase();
      downloadZip(blob, `gradient-wallpaper-engine-${name}.zip`);
      showToast("Wallpaper Engine pack downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [buildPresetForExport, fallbackDataUrl, activePreset?.preset_name, showToast]);

  const handleDownloadPng = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      showToast("Canvas not ready");
      return;
    }
    try {
      const { width, height } = PNG_SIZES[0];
      const dataUrl = capturePngAsDataUrl(renderer, params, width, height);
      const name = activePreset?.preset_name ?? "gradient";
      downloadPng(dataUrl, `${name.replace(/\s+/g, "-").toLowerCase()}.png`);
      showToast("PNG downloaded");
    } catch {
      showToast("Export failed");
    }
  }, [params, activePreset?.preset_name, showToast]);

  const handleExportPresetJson = useCallback(() => {
    try {
      const preset = buildPresetForExport();
      const blob = new Blob([JSON.stringify(preset, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(preset.preset_name || "preset").replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Preset JSON exported");
    } catch {
      showToast("Export failed");
    }
  }, [buildPresetForExport, showToast]);

  const handleImportPresetJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = reader.result as string;
          const data = JSON.parse(raw) as unknown;
          if (!data || typeof data !== "object" || !Array.isArray((data as Preset).uniform_palette_colors_hex)) {
            showToast("Invalid preset JSON");
            return;
          }
          const preset = data as Preset;
          applyPreset({
            preset_version: preset.preset_version || "1.0",
            preset_name: preset.preset_name || "Imported",
            uniform_seed: preset.uniform_seed,
            uniform_palette_colors_hex: preset.uniform_palette_colors_hex,
            uniform_motion_speed: preset.uniform_motion_speed,
            uniform_flow_rotation_radians: preset.uniform_flow_rotation_radians,
            uniform_flow_drift_speed_x: preset.uniform_flow_drift_speed_x ?? 0,
            uniform_flow_drift_speed_y: preset.uniform_flow_drift_speed_y ?? 0,
            uniform_warp_strength: preset.uniform_warp_strength,
            uniform_warp_scale: preset.uniform_warp_scale,
            uniform_turbulence: preset.uniform_turbulence,
            uniform_brightness: preset.uniform_brightness,
            uniform_contrast: preset.uniform_contrast,
            uniform_saturation: preset.uniform_saturation,
            uniform_grain_amount: preset.uniform_grain_amount,
            uniform_grain_size: preset.uniform_grain_size,
            uniform_reduce_motion_enabled: (preset.uniform_reduce_motion_enabled ?? 0) as 0 | 1,
            quality_resolution_scale: preset.quality_resolution_scale ?? 0.75,
            quality_fps_cap: (preset.quality_fps_cap ?? 60) as 30 | 60,
            quality_flow_map_size: preset.quality_flow_map_size,
            quality_flow_fps: preset.quality_flow_fps,
          });
          setQualityResolutionScale(preset.quality_resolution_scale ?? 0.75);
          setQualityFpsCap((preset.quality_fps_cap ?? 60) as 30 | 60);
          if (preset.quality_flow_map_size != null) setQualityFlowMapSize(preset.quality_flow_map_size);
          if (preset.quality_flow_fps != null) setQualityFlowFps(preset.quality_flow_fps);
          showToast("Preset imported");
        } catch {
          showToast("Invalid preset JSON");
        }
      };
      reader.readAsText(file);
    },
    [applyPreset, setQualityResolutionScale, setQualityFpsCap, setQualityFlowMapSize, setQualityFlowFps, showToast]
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
            onCopyEmbed={handleCopyEmbed}
            onDownloadZip={handleDownloadZip}
            onDownloadWallpaperEngine={handleDownloadWallpaperEngine}
            onDownloadPng={handleDownloadPng}
            onExportPresetJson={handleExportPresetJson}
            onImportPresetJson={handleImportPresetJson}
            copyEmbedLoading={copyEmbedLoading}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PNG_SIZES } from "@/engine/export-png";
import type {
  DeveloperExportOptions,
  DeveloperPresetFormat,
  ExportTab,
  PngExportOptions,
} from "@/types/export";
import { DEVELOPER_PRESET_FORMATS, EXPORT_TABS } from "@/types/export";

const RUNTIME_DOWNLOAD_URL = "/api/gradient-runtime";

interface ExportPanelProps {
  onDownloadWallpaperEngine: () => void;
  onDownloadPng: (options: PngExportOptions) => void;
  onCopyPresetJson: () => void | Promise<void>;
  onDownloadPresetJson: () => void;
  onImportPresetJson: (file: File) => void;
  runtimeDownloadUrl?: string;
  runtimeFilename?: string;
  onCopySnippet: (options: DeveloperExportOptions) => void | Promise<void>;
}

type PngSizeMode = "hd" | "uhd" | "custom";

const MAX_CUSTOM_PNG_SIZE = 8192;

export function ExportPanel({
  onDownloadWallpaperEngine,
  onDownloadPng,
  onCopyPresetJson,
  onDownloadPresetJson,
  onImportPresetJson,
  runtimeDownloadUrl = RUNTIME_DOWNLOAD_URL,
  runtimeFilename = "gradient-runtime.global.js",
  onCopySnippet,
}: ExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ExportTab>("developer");
  const [pngSizeMode, setPngSizeMode] = useState<PngSizeMode>("hd");
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");
  const [presetFormat, setPresetFormat] = useState<DeveloperPresetFormat>("readable");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportPresetJson(file);
    e.target.value = "";
  };

  const resolvedPngOptions = useMemo<PngExportOptions | null>(() => {
    if (pngSizeMode === "hd") {
      const size = PNG_SIZES[0];
      return { width: size.width, height: size.height };
    }
    if (pngSizeMode === "uhd") {
      const size = PNG_SIZES[1];
      return { width: size.width, height: size.height };
    }

    const width = Number.parseInt(customWidth, 10);
    const height = Number.parseInt(customHeight, 10);

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 64 ||
      height < 64 ||
      width > MAX_CUSTOM_PNG_SIZE ||
      height > MAX_CUSTOM_PNG_SIZE
    ) {
      return null;
    }

    return { width, height };
  }, [customHeight, customWidth, pngSizeMode]);

  const pngError =
    pngSizeMode === "custom" && resolvedPngOptions == null
      ? `Use values from 64 to ${MAX_CUSTOM_PNG_SIZE}px.`
      : null;

  const buildDeveloperOptions = (): DeveloperExportOptions => ({
    presetFormat,
  });

  const tabButtonClass = (isActive: boolean) =>
    `rounded-md px-3 py-2 text-xs font-medium transition-colors ${
      isActive
        ? "bg-white text-black"
        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="space-y-3 border border-white/10 rounded-lg p-4 bg-neutral-900/80">
      <h3 className="text-sm font-medium text-white">Export</h3>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1">
        {EXPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={tabButtonClass(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "developer" && (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-white/60">
            Download the runtime once, then paste a minimal snippet with either a readable
            preset object or a compact `g1:` string.
          </p>
          <div className="space-y-2">
            <span className="block text-xs text-white/70">Preset format</span>
            <div className="space-y-2">
              {DEVELOPER_PRESET_FORMATS.map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setPresetFormat(format.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    presetFormat === format.value
                      ? "border-white/50 bg-white/10"
                      : "border-white/10 bg-black/10 hover:border-white/30"
                  }`}
                >
                  <div className="text-sm text-white">{format.label}</div>
                  <div className="text-[11px] text-white/55">{format.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <a
              href={runtimeDownloadUrl}
              download={runtimeFilename}
              className="font-display font-medium rounded-lg transition-colors px-4 py-2 text-sm w-full text-center bg-transparent text-white border border-white/40 hover:border-white/70 hover:bg-white/5"
            >
              Download Runtime JS
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCopySnippet(buildDeveloperOptions())}
              className="w-full"
            >
              Copy Snippet
            </Button>
          </div>
        </div>
      )}

      {activeTab === "png" && (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-white/60">
            Static frame export for slides, previews, and backgrounds.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setPngSizeMode("hd")}
              className={tabButtonClass(pngSizeMode === "hd")}
            >
              1920 × 1080
            </button>
            <button
              type="button"
              onClick={() => setPngSizeMode("uhd")}
              className={tabButtonClass(pngSizeMode === "uhd")}
            >
              3840 × 2160
            </button>
            <button
              type="button"
              onClick={() => setPngSizeMode("custom")}
              className={tabButtonClass(pngSizeMode === "custom")}
            >
              Custom
            </button>
          </div>

          {pngSizeMode === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="block text-xs text-white/70">Width</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={64}
                  max={MAX_CUSTOM_PNG_SIZE}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-white/70">Height</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={64}
                  max={MAX_CUSTOM_PNG_SIZE}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
                />
              </label>
            </div>
          )}

          {pngError && <p className="text-[11px] text-amber-300">{pngError}</p>}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => resolvedPngOptions && onDownloadPng(resolvedPngOptions)}
            disabled={resolvedPngOptions == null}
            className="w-full"
          >
            Download PNG
          </Button>
        </div>
      )}

      {activeTab === "preset" && (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-white/60">
            Copy, download, or import the canonical preset JSON.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCopyPresetJson}
            className="w-full"
          >
            Copy preset JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownloadPresetJson}
            className="w-full"
          >
            Download preset JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Import preset JSON
          </Button>
        </div>
      )}

      {activeTab === "more" && (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-white/60">
            Additional export targets built on the same preset/runtime contract.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownloadWallpaperEngine}
            className="w-full"
          >
            Wallpaper Engine
          </Button>
        </div>
      )}
      </div>
  );
}

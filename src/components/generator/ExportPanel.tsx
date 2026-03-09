"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PNG_SIZES } from "@/engine/export-png";
import type {
  DeveloperExportOptions,
  ExportTab,
  PngExportOptions,
} from "@/types/export";
import { DEVELOPER_MOUNT_MODES, EXPORT_TABS } from "@/types/export";

const RUNTIME_DOWNLOAD_URL = "/api/gradient-runtime";
const RUNTIME_FILENAME = "gradient-runtime.js";

interface ExportPanelProps {
  onDownloadWallpaperEngine: () => void;
  onDownloadPng: (options: PngExportOptions) => void;
  onCopyPresetJson: () => void | Promise<void>;
  onDownloadPresetJson: () => void;
  onImportPresetJson: (file: File) => void;
  /** When set, "Download runtime JS" uses this URL (same-origin) so the browser won't block as insecure. */
  runtimeDownloadUrl?: string;
  onDownloadRuntimeJs: () => void;
  onCopyMountSnippet: (options: DeveloperExportOptions) => void | Promise<void>;
  onCopyHtmlExample: (options: DeveloperExportOptions) => void | Promise<void>;
  onCopyReactExample: (options: DeveloperExportOptions) => void | Promise<void>;
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
  onDownloadRuntimeJs,
  onCopyMountSnippet,
  onCopyHtmlExample,
  onCopyReactExample,
}: ExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ExportTab>("developer");
  const [pngSizeMode, setPngSizeMode] = useState<PngSizeMode>("hd");
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");
  const [selector, setSelector] = useState(".gradient-runtime-target");
  const [mode, setMode] = useState<DeveloperExportOptions["mode"]>("auto");
  const [resolutionScale, setResolutionScale] = useState("");
  const [fpsCap, setFpsCap] = useState("");
  const [flowMapSize, setFlowMapSize] = useState("");
  const [flowFps, setFlowFps] = useState("");
  const [maxRenderPixels, setMaxRenderPixels] = useState("");

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
  const selectorError = !selector.trim() ? "Selector is required for runtime snippets." : null;

  const buildDeveloperOptions = (): DeveloperExportOptions | null => {
    const trimmedSelector = selector.trim();
    if (!trimmedSelector) {
      return null;
    }

    const parseOptionalNumber = (value: string): number | undefined => {
      if (!value.trim()) {
        return undefined;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const parsedFpsCap = parseOptionalNumber(fpsCap);

    return {
      selector: trimmedSelector,
      mode,
      resolutionScale: parseOptionalNumber(resolutionScale),
      fpsCap:
        parsedFpsCap === 30 || parsedFpsCap === 60
          ? (parsedFpsCap as 30 | 60)
          : undefined,
      flowMapSize: parseOptionalNumber(flowMapSize),
      flowFps: parseOptionalNumber(flowFps),
      maxRenderPixels: parseOptionalNumber(maxRenderPixels),
    };
  };

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
            Download the shared runtime once, then mount presets with short snippets.
          </p>
          <div className="space-y-1">
            <label className="block text-xs text-white/70" htmlFor="developer-selector">
              Target selector
            </label>
            <input
              id="developer-selector"
              type="text"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              placeholder=".hero-gradient"
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
            />
            {selectorError && <p className="text-[11px] text-amber-300">{selectorError}</p>}
          </div>

          <div className="space-y-2">
            <span className="block text-xs text-white/70">Runtime mode</span>
            <div className="space-y-2">
              {DEVELOPER_MOUNT_MODES.map((modeOption) => (
                <button
                  key={modeOption.value}
                  type="button"
                  onClick={() => setMode(modeOption.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    mode === modeOption.value
                      ? "border-white/50 bg-white/10"
                      : "border-white/10 bg-black/10 hover:border-white/30"
                  }`}
                >
                  <div className="text-sm text-white">{modeOption.label}</div>
                  <div className="text-[11px] text-white/55">{modeOption.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="block text-xs text-white/70">Resolution scale</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.05"
                min={0.5}
                max={1}
                value={resolutionScale}
                onChange={(e) => setResolutionScale(e.target.value)}
                placeholder="Use preset default"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-white/70">FPS cap</span>
              <input
                type="number"
                inputMode="numeric"
                step="30"
                min={30}
                max={60}
                value={fpsCap}
                onChange={(e) => setFpsCap(e.target.value)}
                placeholder="30 or 60"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-white/70">Flow map size</span>
              <input
                type="number"
                inputMode="numeric"
                min={256}
                max={512}
                step="64"
                value={flowMapSize}
                onChange={(e) => setFlowMapSize(e.target.value)}
                placeholder="256 / 384 / 512"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-white/70">Flow FPS</span>
              <input
                type="number"
                inputMode="numeric"
                min={15}
                max={60}
                step="15"
                value={flowFps}
                onChange={(e) => setFlowFps(e.target.value)}
                placeholder="15 / 30 / 60"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="block text-xs text-white/70">Max render pixels</span>
            <input
              type="number"
              inputMode="numeric"
              min={250000}
              value={maxRenderPixels}
              onChange={(e) => setMaxRenderPixels(e.target.value)}
              placeholder="Use runtime default"
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
            />
          </label>

          <div className="grid gap-2">
            {runtimeDownloadUrl ? (
              <a
                href={runtimeDownloadUrl}
                download={RUNTIME_FILENAME}
                className="font-display font-medium rounded-lg transition-colors px-4 py-2 text-sm w-full text-center bg-transparent text-white border border-white/40 hover:border-white/70 hover:bg-white/5"
              >
                Download runtime JS
              </a>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDownloadRuntimeJs}
                className="w-full"
              >
                Download runtime JS
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const options = buildDeveloperOptions();
                if (options) onCopyMountSnippet(options);
              }}
              disabled={Boolean(selectorError)}
              className="w-full"
            >
              Copy mount snippet
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const options = buildDeveloperOptions();
                if (options) onCopyHtmlExample(options);
              }}
              disabled={Boolean(selectorError)}
              className="w-full"
            >
              Copy HTML example
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const options = buildDeveloperOptions();
                if (options) onCopyReactExample(options);
              }}
              disabled={Boolean(selectorError)}
              className="w-full"
            >
              Copy React example
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

"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";

interface ExportPanelProps {
  onCopyEmbed: () => void;
  onDownloadZip: () => void;
  onDownloadWallpaperEngine: () => void;
  onDownloadPng: () => void;
  onExportPresetJson: () => void;
  onImportPresetJson: (file: File) => void;
  copyEmbedLoading?: boolean;
}

export function ExportPanel({
  onCopyEmbed,
  onDownloadZip,
  onDownloadWallpaperEngine,
  onDownloadPng,
  onExportPresetJson,
  onImportPresetJson,
  copyEmbedLoading = false,
}: ExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportPresetJson(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 border border-white/10 rounded-lg p-4 bg-neutral-900/80">
      <h3 className="text-sm font-medium text-white">Export</h3>
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onCopyEmbed}
          disabled={copyEmbedLoading}
        >
          {copyEmbedLoading ? "Copying…" : "Copy embed"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownloadZip}>
          Download ZIP
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownloadWallpaperEngine}>
          Wallpaper Engine
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownloadPng}>
          Download PNG
        </Button>
        <Button variant="secondary" size="sm" onClick={onExportPresetJson}>
          Export preset JSON
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
        >
          Import preset JSON
        </Button>
      </div>
    </div>
  );
}

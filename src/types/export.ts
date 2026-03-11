export type ExportTab = "png" | "preset" | "developer" | "more";
export type DeveloperPresetFormat = "readable" | "compact";

export interface DeveloperExportOptions {
  presetFormat: DeveloperPresetFormat;
}

export interface PngExportOptions {
  width: number;
  height: number;
}

export const EXPORT_TABS: Array<{ id: ExportTab; label: string }> = [
  { id: "developer", label: "Developer" },
  { id: "png", label: "Designer" },
  { id: "preset", label: "Preset" },
  { id: "more", label: "More" },
];

export const DEVELOPER_PRESET_FORMATS: Array<{
  value: DeveloperPresetFormat;
  label: string;
  description: string;
}> = [
  {
    value: "readable",
    label: "Readable preset",
    description: "Exports a canonical preset object for self-hosted usage.",
  },
  {
    value: "compact",
    label: "Compact preset",
    description: 'Exports a short `g1:` preset string for smaller snippets.',
  },
];

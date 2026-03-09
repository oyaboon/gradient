import type { GradientMountMode, GradientMountOptions } from "@/engine/runtime-types";

export type ExportTab = "png" | "preset" | "developer" | "more";

export interface DeveloperExportOptions extends Partial<GradientMountOptions> {
  selector: string;
}

export interface PngExportOptions {
  width: number;
  height: number;
}

export const EXPORT_TABS: Array<{ id: ExportTab; label: string }> = [
  { id: "png", label: "PNG" },
  { id: "preset", label: "Preset" },
  { id: "developer", label: "Developer" },
  { id: "more", label: "More" },
];

export const DEVELOPER_MOUNT_MODES: Array<{
  value: GradientMountMode;
  label: string;
  description: string;
}> = [
  { value: "auto", label: "Auto", description: "Adaptive runtime mode by container size." },
  { value: "animated", label: "Animated", description: "Always animate while active." },
  { value: "static", label: "Static", description: "Render a single still frame." },
  { value: "hover", label: "Hover", description: "Animate only while hovered." },
  { value: "inView", label: "In view", description: "Animate only when visible." },
];

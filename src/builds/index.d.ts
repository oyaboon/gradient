export type GradientMountMode = "animated" | "static" | "hover";
export type GradientSharedMode = "animated" | "static";
export type GradientFrameTransport = "auto" | "bitmaprenderer" | "2d";

export type GradientMountTarget = string | Element;
export type GradientSharedMountTarget =
  | string
  | Element
  | Element[]
  | NodeListOf<Element>
  | Iterable<Element>;

export interface GradientParams {
  uniform_seed: number;
  uniform_palette_colors_hex: string[];
  uniform_motion_speed: number;
  uniform_flow_rotation_radians: number;
  uniform_flow_drift_speed_x: number;
  uniform_flow_drift_speed_y: number;
  uniform_warp_strength: number;
  uniform_warp_scale: number;
  uniform_turbulence: number;
  uniform_brightness: number;
  uniform_contrast: number;
  uniform_saturation: number;
  uniform_grain_amount: number;
  uniform_grain_size: number;
  uniform_reduce_motion_enabled: 0 | 1;
}

export interface GradientQualityDefaults {
  resolutionScale?: number;
  fpsCap?: 30 | 60;
  flowMapSize?: number;
  flowFps?: number;
  maxRenderPixels?: number;
}

export interface GradientPreset {
  presetVersion: 1;
  engineId: "grain-v1";
  name?: string;
  params: GradientParams;
  exportDefaults?: {
    quality?: GradientQualityDefaults;
  };
}

export interface LegacyPreset extends GradientParams {
  preset_version: "1.0";
  preset_name: string;
  quality_resolution_scale: number;
  quality_fps_cap: 30 | 60;
  quality_flow_map_size?: number;
  quality_flow_fps?: number;
  export_fallback_image_data_url?: string;
}

export type GradientPresetInput = GradientPreset | LegacyPreset | string;

export interface GradientRuntimeQualityOptions {
  resolutionScale?: number;
  fpsCap?: 30 | 60;
  flowMapSize?: number;
  flowFps?: number;
  maxRenderPixels?: number;
}

export interface GradientMountOptions extends GradientRuntimeQualityOptions {
  mode?: GradientMountMode;
}

export interface GradientSharedMountOptions extends GradientRuntimeQualityOptions {
  mode?: GradientSharedMode;
  frameTransport?: GradientFrameTransport;
}

export interface GradientInstance {
  updatePreset(nextPreset: GradientPresetInput): void;
  updateOptions(nextOptions: Partial<GradientMountOptions>): void;
  resize(): void;
  renderStill(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface GradientSharedInstance {
  updatePreset(nextPreset: GradientPresetInput): void;
  updateOptions(nextOptions: Partial<GradientSharedMountOptions>): void;
  rescan(): void;
  resize(): void;
  renderStill(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export declare const Gradient: {
  mount(
    target: GradientMountTarget,
    preset: GradientPresetInput,
    options?: GradientMountOptions
  ): GradientInstance;
  mountShared(
    target: GradientSharedMountTarget,
    preset: GradientPresetInput,
    options?: GradientSharedMountOptions
  ): GradientSharedInstance;
};

export declare function mountGradient(
  target: GradientMountTarget,
  preset: GradientPresetInput,
  options?: GradientMountOptions
): GradientInstance;

export declare function mountSharedGradient(
  target: GradientSharedMountTarget,
  preset: GradientPresetInput,
  options?: GradientSharedMountOptions
): GradientSharedInstance;

export const PRESET_VERSION = 1 as const;
export const LEGACY_PRESET_VERSION = "1.0" as const;
export const GRADIENT_ENGINE_ID = "grain-v1" as const;
export const DEFAULT_PRESET_NAME = "Exported";

/**
 * Gradient parameters matching the shader uniform contract.
 * Used by the renderer and canonical preset params.
 */
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
  /** 0 or 1. When 1, time is effectively frozen or very slow. */
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
  presetVersion: typeof PRESET_VERSION;
  engineId: typeof GRADIENT_ENGINE_ID;
  name?: string;
  params: GradientParams;
  exportDefaults?: {
    quality?: GradientQualityDefaults;
  };
}

export interface LegacyPreset extends GradientParams {
  preset_version: typeof LEGACY_PRESET_VERSION;
  preset_name: string;
  quality_resolution_scale: number;
  quality_fps_cap: 30 | 60;
  quality_flow_map_size?: number;
  quality_flow_fps?: number;
  export_fallback_image_data_url?: string;
}

export interface StorePresetQuality {
  qualityResolutionScale: number;
  qualityFpsCap: 30 | 60;
  qualityFlowMapSize: number;
  qualityFlowFps: number;
}

export const DEFAULT_GRADIENT_PARAMS: GradientParams = {
  uniform_seed: 42,
  uniform_palette_colors_hex: ["#0a0a12", "#1a1a2e", "#2563eb", "#f97316", "#fbbf24"],
  uniform_motion_speed: 0.6,
  uniform_flow_rotation_radians: 0.9,
  uniform_flow_drift_speed_x: 0,
  uniform_flow_drift_speed_y: 0,
  uniform_warp_strength: 0.5,
  uniform_warp_scale: 2.2,
  uniform_turbulence: 0.4,
  uniform_brightness: 1.05,
  uniform_contrast: 1.12,
  uniform_saturation: 1.2,
  uniform_grain_amount: 0.12,
  uniform_grain_size: 1.3,
  uniform_reduce_motion_enabled: 0,
};

export const DEFAULT_PRESET_QUALITY: Required<StorePresetQuality> = {
  qualityResolutionScale: 0.75,
  qualityFpsCap: 60,
  qualityFlowMapSize: 384,
  qualityFlowFps: 30,
};

/**
 * Gradient parameters matching the shader uniform contract (architecture spec 6.2).
 * Used by the engine and by preset JSON.
 */
export interface GradientParams {
  uniform_seed: number;

  /** Hex colors, 3–6 entries. Engine uses first uniform_palette_color_count. */
  uniform_palette_colors_hex: string[];
  uniform_motion_speed: number;
  uniform_flow_rotation_radians: number;
  /** Drift speed in X and Y (pattern movement). */
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

/** Quality options (UI only; not in shader). */
export interface QualityParams {
  quality_resolution_scale: number;
  quality_fps_cap: 30 | 60;
  /** Flow map texture size (advanced). Default 384. */
  quality_flow_map_size?: number;
  /** Flow pass update rate in fps (advanced). Default 30. */
  quality_flow_fps?: number;
}

/** Full preset: params + name + optional fallback image for export. */
export interface Preset extends GradientParams, QualityParams {
  preset_version: string;
  preset_name: string;
  /** Data URL of a static frame for fallback / thumbnail. */
  export_fallback_image_data_url?: string;
}

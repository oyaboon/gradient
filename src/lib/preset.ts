"use client";

import {
  DEFAULT_GRADIENT_PARAMS,
  DEFAULT_PRESET_NAME,
  DEFAULT_PRESET_QUALITY,
  GRADIENT_ENGINE_ID,
  LEGACY_PRESET_VERSION,
  PRESET_VERSION,
  type GradientPresetInput,
  type GradientParams,
  type GradientPreset,
  type LegacyPreset,
  type StorePresetQuality,
} from "@/types/preset";
import { decodeCompactPreset, isCompactPresetString } from "./compact-preset";

export interface GradientPresetStoreSnapshot extends StorePresetQuality {
  params: GradientParams;
  activePreset: GradientPreset | null;
}

export interface GradientPresetStoreUpdate extends StorePresetQuality {
  params: GradientParams;
  activePreset: GradientPreset | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function readRequiredFiniteNumber(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Preset field "${key}" must be a finite number.`);
  }

  return value;
}

function readClampedNumber(
  value: unknown,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  if (value == null) {
    return fallback;
  }

  return clamp(readRequiredFiniteNumber(value, key), min, max);
}

function readPaletteColors(value: unknown): GradientParams["uniform_palette_colors_hex"] {
  if (value == null) {
    return [...DEFAULT_GRADIENT_PARAMS.uniform_palette_colors_hex];
  }

  if (!Array.isArray(value)) {
    throw new Error('Preset field "uniform_palette_colors_hex" must be an array.');
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((color) => color.trim())
    .filter((color) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color))
    .slice(0, 6);

  if (normalized.length < 3) {
    throw new Error(
      'Preset field "uniform_palette_colors_hex" must contain at least 3 valid hex colors.'
    );
  }

  return normalized;
}

function normalizeParams(source: Record<string, unknown>): GradientParams {
  return {
    uniform_seed: readClampedNumber(
      source.uniform_seed,
      "uniform_seed",
      DEFAULT_GRADIENT_PARAMS.uniform_seed,
      0,
      1e6
    ),
    uniform_palette_colors_hex: readPaletteColors(source.uniform_palette_colors_hex),
    uniform_motion_speed: readClampedNumber(
      source.uniform_motion_speed,
      "uniform_motion_speed",
      DEFAULT_GRADIENT_PARAMS.uniform_motion_speed,
      0,
      2
    ),
    uniform_flow_rotation_radians: readClampedNumber(
      source.uniform_flow_rotation_radians,
      "uniform_flow_rotation_radians",
      DEFAULT_GRADIENT_PARAMS.uniform_flow_rotation_radians,
      0,
      Math.PI * 2
    ),
    uniform_flow_drift_speed_x: readClampedNumber(
      source.uniform_flow_drift_speed_x,
      "uniform_flow_drift_speed_x",
      DEFAULT_GRADIENT_PARAMS.uniform_flow_drift_speed_x,
      -0.3,
      0.3
    ),
    uniform_flow_drift_speed_y: readClampedNumber(
      source.uniform_flow_drift_speed_y,
      "uniform_flow_drift_speed_y",
      DEFAULT_GRADIENT_PARAMS.uniform_flow_drift_speed_y,
      -0.3,
      0.3
    ),
    uniform_warp_strength: readClampedNumber(
      source.uniform_warp_strength,
      "uniform_warp_strength",
      DEFAULT_GRADIENT_PARAMS.uniform_warp_strength,
      0,
      1.2
    ),
    uniform_warp_scale: readClampedNumber(
      source.uniform_warp_scale,
      "uniform_warp_scale",
      DEFAULT_GRADIENT_PARAMS.uniform_warp_scale,
      0.2,
      6
    ),
    uniform_turbulence: readClampedNumber(
      source.uniform_turbulence,
      "uniform_turbulence",
      DEFAULT_GRADIENT_PARAMS.uniform_turbulence,
      0,
      1
    ),
    uniform_brightness: readClampedNumber(
      source.uniform_brightness,
      "uniform_brightness",
      DEFAULT_GRADIENT_PARAMS.uniform_brightness,
      0,
      2
    ),
    uniform_contrast: readClampedNumber(
      source.uniform_contrast,
      "uniform_contrast",
      DEFAULT_GRADIENT_PARAMS.uniform_contrast,
      0,
      2
    ),
    uniform_saturation: readClampedNumber(
      source.uniform_saturation,
      "uniform_saturation",
      DEFAULT_GRADIENT_PARAMS.uniform_saturation,
      0,
      2
    ),
    uniform_grain_amount: readClampedNumber(
      source.uniform_grain_amount,
      "uniform_grain_amount",
      DEFAULT_GRADIENT_PARAMS.uniform_grain_amount,
      0,
      0.25
    ),
    uniform_grain_size: readClampedNumber(
      source.uniform_grain_size,
      "uniform_grain_size",
      DEFAULT_GRADIENT_PARAMS.uniform_grain_size,
      0.5,
      1.6
    ),
    uniform_reduce_motion_enabled:
      readClampedNumber(
        source.uniform_reduce_motion_enabled,
        "uniform_reduce_motion_enabled",
        DEFAULT_GRADIENT_PARAMS.uniform_reduce_motion_enabled,
        0,
        1
      ) >= 0.5
        ? 1
        : 0,
  };
}

function normalizeQuality(source: Record<string, unknown>): StorePresetQuality {
  const flowMapSize = readClampedNumber(
    source.flowMapSize,
    "flowMapSize",
    DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
    256,
    512
  );
  const flowFps = readClampedNumber(
    source.flowFps,
    "flowFps",
    DEFAULT_PRESET_QUALITY.qualityFlowFps,
    15,
    60
  );

  return {
    qualityResolutionScale: readClampedNumber(
      source.resolutionScale,
      "resolutionScale",
      DEFAULT_PRESET_QUALITY.qualityResolutionScale,
      0.5,
      1
    ),
    qualityFpsCap:
      readClampedNumber(
        source.fpsCap,
        "fpsCap",
        DEFAULT_PRESET_QUALITY.qualityFpsCap,
        30,
        60
      ) >= 45
        ? 60
        : 30,
    qualityFlowMapSize: flowMapSize >= 448 ? 512 : flowMapSize >= 320 ? 384 : 256,
    qualityFlowFps: flowFps >= 45 ? 60 : flowFps >= 22.5 ? 30 : 15,
  };
}

function normalizeCanonicalPreset(source: Record<string, unknown>): GradientPreset {
  const presetVersion = source.presetVersion;
  if (presetVersion !== PRESET_VERSION) {
    throw new Error(
      `Unsupported presetVersion "${String(presetVersion)}". Expected "${PRESET_VERSION}".`
    );
  }

  const engineId = source.engineId;
  if (engineId !== GRADIENT_ENGINE_ID) {
    throw new Error(
      `Unsupported engineId "${String(engineId)}". Expected "${GRADIENT_ENGINE_ID}".`
    );
  }

  const paramsSource = source.params;
  if (!isRecord(paramsSource)) {
    throw new Error('Preset field "params" must be an object.');
  }

  const exportDefaults = isRecord(source.exportDefaults) ? source.exportDefaults : {};
  const qualitySource = isRecord(exportDefaults.quality) ? exportDefaults.quality : {};
  const quality = normalizeQuality(qualitySource);

  return {
    presetVersion: PRESET_VERSION,
    engineId: GRADIENT_ENGINE_ID,
    name: readString(source.name, DEFAULT_PRESET_NAME),
    params: normalizeParams(paramsSource),
    exportDefaults: {
      quality: {
        resolutionScale: quality.qualityResolutionScale,
        fpsCap: quality.qualityFpsCap,
        flowMapSize: quality.qualityFlowMapSize,
        flowFps: quality.qualityFlowFps,
        maxRenderPixels: readClampedNumber(
          qualitySource.maxRenderPixels,
          "maxRenderPixels",
          3_500_000,
          250_000,
          16_000_000
        ),
      },
    },
  };
}

function normalizeLegacyPreset(source: Record<string, unknown>): GradientPreset {
  const presetVersion = readString(source.preset_version, LEGACY_PRESET_VERSION);
  if (presetVersion !== LEGACY_PRESET_VERSION) {
    throw new Error(
      `Unsupported preset_version "${presetVersion}". Expected "${LEGACY_PRESET_VERSION}".`
    );
  }

  const legacySource: Record<string, unknown> = {
    resolutionScale: source.quality_resolution_scale,
    fpsCap: source.quality_fps_cap,
    flowMapSize: source.quality_flow_map_size,
    flowFps: source.quality_flow_fps,
  };
  const quality = normalizeQuality(legacySource);

  return {
    presetVersion: PRESET_VERSION,
    engineId: GRADIENT_ENGINE_ID,
    name: readString(source.preset_name, DEFAULT_PRESET_NAME),
    params: normalizeParams(source),
    exportDefaults: {
      quality: {
        resolutionScale: quality.qualityResolutionScale,
        fpsCap: quality.qualityFpsCap,
        flowMapSize: quality.qualityFlowMapSize,
        flowFps: quality.qualityFlowFps,
      },
    },
  };
}

export function normalizePreset(rawPreset: GradientPresetInput): GradientPreset {
  /**
   * Runtime accepts either the canonical/readable preset object or a compact `g1:` string.
   * Compact input is decoded back into the canonical shape before normal validation runs.
   */
  if (isCompactPresetString(rawPreset)) {
    return normalizeCanonicalPreset(
      decodeCompactPreset(rawPreset) as unknown as Record<string, unknown>
    );
  }

  if (!isRecord(rawPreset)) {
    throw new Error("Preset JSON must be an object.");
  }

  if ("presetVersion" in rawPreset || "params" in rawPreset || "engineId" in rawPreset) {
    return normalizeCanonicalPreset(rawPreset);
  }

  return normalizeLegacyPreset(rawPreset);
}

export function parsePresetJson(raw: string): GradientPreset {
  const trimmed = raw.trim();
  if (isCompactPresetString(trimmed)) {
    return normalizePreset(trimmed);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid preset JSON syntax.");
  }

  return normalizePreset(parsed as GradientPresetInput);
}

export function buildPresetFromStore(state: GradientPresetStoreSnapshot): GradientPreset {
  const quality = {
    resolutionScale: state.qualityResolutionScale,
    fpsCap: state.qualityFpsCap,
    flowMapSize: state.qualityFlowMapSize,
    flowFps: state.qualityFlowFps,
  };

  return normalizePreset({
    presetVersion: PRESET_VERSION,
    engineId: GRADIENT_ENGINE_ID,
    name: state.activePreset?.name ?? DEFAULT_PRESET_NAME,
    params: state.params,
    exportDefaults: {
      quality,
    },
  });
}

export function applyPresetToStore(preset: GradientPreset): GradientPresetStoreUpdate {
  const normalized = normalizePreset(preset);
  const quality = normalized.exportDefaults?.quality;

  return {
    params: normalized.params,
    activePreset: normalized,
    qualityResolutionScale:
      quality?.resolutionScale ?? DEFAULT_PRESET_QUALITY.qualityResolutionScale,
    qualityFpsCap: quality?.fpsCap ?? DEFAULT_PRESET_QUALITY.qualityFpsCap,
    qualityFlowMapSize: quality?.flowMapSize ?? DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
    qualityFlowFps: quality?.flowFps ?? DEFAULT_PRESET_QUALITY.qualityFlowFps,
  };
}

export function getPresetName(preset: GradientPreset | null | undefined): string {
  return preset?.name?.trim() || DEFAULT_PRESET_NAME;
}

export function getPresetQualityDefaults(
  preset: GradientPreset | null | undefined
): Required<StorePresetQuality> {
  const quality = preset?.exportDefaults?.quality;

  return {
    qualityResolutionScale:
      quality?.resolutionScale ?? DEFAULT_PRESET_QUALITY.qualityResolutionScale,
    qualityFpsCap: quality?.fpsCap ?? DEFAULT_PRESET_QUALITY.qualityFpsCap,
    qualityFlowMapSize: quality?.flowMapSize ?? DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
    qualityFlowFps: quality?.flowFps ?? DEFAULT_PRESET_QUALITY.qualityFlowFps,
  };
}

export function toLegacyPreset(preset: GradientPreset): LegacyPreset {
  const normalized = normalizePreset(preset);
  const quality = getPresetQualityDefaults(normalized);

  return {
    preset_version: LEGACY_PRESET_VERSION,
    preset_name: getPresetName(normalized),
    ...normalized.params,
    quality_resolution_scale: quality.qualityResolutionScale,
    quality_fps_cap: quality.qualityFpsCap,
    quality_flow_map_size: quality.qualityFlowMapSize,
    quality_flow_fps: quality.qualityFlowFps,
  };
}

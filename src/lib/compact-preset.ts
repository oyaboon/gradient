import {
  DEFAULT_PRESET_QUALITY,
  GRADIENT_ENGINE_ID,
  PRESET_VERSION,
  type GradientParams,
  type GradientPreset,
  type GradientQualityDefaults,
} from "@/types/preset";

/** Legacy compact format: g1: + base64url(JSON { n?, p, q? }). Decode-only. */
const COMPACT_PRESET_PREFIX_G1 = "g1:";
/** New short compact format: g2: + base64url(JSON array). Default for export. */
const COMPACT_PRESET_PREFIX_G2 = "g2:";

/**
 * Numeric scale for encoding floats as ints in g2. Documented single scale for all params.
 * Decode: intValue / SCALE, then clamp to allowed range.
 */
const SCALE = 1000;

/** Quality defaults used to decide whether to include quality in g2 payload. */
const QUALITY_DEFAULTS = {
  resolutionScale: DEFAULT_PRESET_QUALITY.qualityResolutionScale,
  fpsCap: DEFAULT_PRESET_QUALITY.qualityFpsCap,
  flowMapSize: DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
  flowFps: DEFAULT_PRESET_QUALITY.qualityFlowFps,
  maxRenderPixels: 3_500_000,
} as const;

const FPS_CAP_VALUES = [30, 60] as const;
const FLOW_MAP_SIZE_VALUES = [256, 384, 512] as const;
const FLOW_FPS_VALUES = [15, 30, 60] as const;

// --- g1 legacy (decode-only) ---

interface CompactPresetPayloadV1 {
  n?: string;
  p: GradientParams;
  q?: GradientQualityDefaults;
}

function encodeUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function decodeUtf8(input: Uint8Array): string {
  return new TextDecoder().decode(input);
}

function toBase64(input: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input).toString("base64");
  }
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(input: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(input, "base64"));
  }
  const binary = atob(input);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

function toBase64Url(input: Uint8Array): string {
  return toBase64(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
  return fromBase64(padded);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isCompactPresetString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith(COMPACT_PRESET_PREFIX_G1) || value.startsWith(COMPACT_PRESET_PREFIX_G2))
  );
}

export function isCompactPresetG1(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(COMPACT_PRESET_PREFIX_G1);
}

export function isCompactPresetG2(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(COMPACT_PRESET_PREFIX_G2);
}

/** Legacy g1 encode (object + base64url). Kept for backward compatibility. */
export function encodeCompactPresetV1(preset: GradientPreset): string {
  const payload: CompactPresetPayloadV1 = {
    n: preset.name,
    p: preset.params,
    q: preset.exportDefaults?.quality,
  };
  return `${COMPACT_PRESET_PREFIX_G1}${toBase64Url(
    encodeUtf8(JSON.stringify(payload))
  )}`;
}

/** Legacy g1 decode. */
export function decodeCompactPresetV1(compactPreset: string): GradientPreset {
  if (!isCompactPresetG1(compactPreset)) {
    throw new Error("Unsupported compact preset format.");
  }
  const payloadText = decodeUtf8(
    fromBase64Url(compactPreset.slice(COMPACT_PRESET_PREFIX_G1.length))
  );
  let payload: CompactPresetPayloadV1;
  try {
    payload = JSON.parse(payloadText) as CompactPresetPayloadV1;
  } catch {
    throw new Error("Invalid compact preset payload.");
  }
  if (!payload || typeof payload !== "object" || !payload.p) {
    throw new Error("Compact preset payload is incomplete.");
  }
  return {
    presetVersion: PRESET_VERSION,
    engineId: GRADIENT_ENGINE_ID,
    name: payload.n,
    params: payload.p,
    exportDefaults: payload.q ? { quality: payload.q } : undefined,
  };
}

// --- g2: array payload, quantized numbers, no name/version/engineId ---

/** g2 payload: [seed, palette[], motionSpeed, flowRotation, driftX, driftY, warpStrength, warpScale, turbulence, brightness, contrast, saturation, grainAmount, grainSize, reduceMotion, qualityOrNull] */
type G2Payload = [
  number,
  number[],
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  0 | 1,
  G2QualityArray | null,
];

/** quality array: [resolutionScaleInt, fpsCapCode, flowMapSizeCode, flowFpsCode, maxRenderPixelsInt] or omitted when all defaults */
type G2QualityArray = [
  number,
  number,
  number,
  number,
  number,
];

function hexToInt(hex: string): number {
  const h = hex.replace(/^#/, "");
  return parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h, 16);
}

function intToHex(n: number): string {
  const r = ((n >> 16) & 255).toString(16).padStart(2, "0");
  const g = ((n >> 8) & 255).toString(16).padStart(2, "0");
  const b = (n & 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function qualityEqualsDefault(q: GradientQualityDefaults): boolean {
  const r = q.resolutionScale ?? QUALITY_DEFAULTS.resolutionScale;
  const f = q.fpsCap ?? QUALITY_DEFAULTS.fpsCap;
  const s = q.flowMapSize ?? QUALITY_DEFAULTS.flowMapSize;
  const fp = q.flowFps ?? QUALITY_DEFAULTS.flowFps;
  const m = q.maxRenderPixels ?? QUALITY_DEFAULTS.maxRenderPixels;
  return (
    r === QUALITY_DEFAULTS.resolutionScale &&
    f === QUALITY_DEFAULTS.fpsCap &&
    s === QUALITY_DEFAULTS.flowMapSize &&
    fp === QUALITY_DEFAULTS.flowFps &&
    m === QUALITY_DEFAULTS.maxRenderPixels
  );
}

function encodeQuality(q: GradientQualityDefaults): G2QualityArray {
  const resolutionScaleInt = Math.round(
    (q.resolutionScale ?? QUALITY_DEFAULTS.resolutionScale) * SCALE
  );
  const fpsCapCode = (q.fpsCap ?? QUALITY_DEFAULTS.fpsCap) === 60 ? 1 : 0;
  const flowMapSize = q.flowMapSize ?? QUALITY_DEFAULTS.flowMapSize;
  const flowMapSizeCode =
    flowMapSize >= 448 ? 2 : flowMapSize >= 320 ? 1 : 0;
  const flowFps = q.flowFps ?? QUALITY_DEFAULTS.flowFps;
  const flowFpsCode = flowFps >= 45 ? 2 : flowFps >= 22.5 ? 1 : 0;
  const maxRenderPixels = q.maxRenderPixels ?? QUALITY_DEFAULTS.maxRenderPixels;
  return [
    resolutionScaleInt,
    fpsCapCode,
    flowMapSizeCode,
    flowFpsCode,
    maxRenderPixels,
  ];
}

function decodeQuality(arr: G2QualityArray): GradientQualityDefaults {
  return {
    resolutionScale: clamp(arr[0] / SCALE, 0.5, 1),
    fpsCap: arr[1] >= 1 ? 60 : 30,
    flowMapSize: FLOW_MAP_SIZE_VALUES[clamp(arr[2], 0, 2)],
    flowFps: FLOW_FPS_VALUES[clamp(arr[3], 0, 2)],
    maxRenderPixels: clamp(arr[4], 250_000, 16_000_000),
  };
}

/** New g2 encode: short array payload, quantized numbers, palette as ints. */
export function encodeCompactPresetV2(preset: GradientPreset): string {
  const p = preset.params;
  const payload: G2Payload = [
    Math.round(clamp(p.uniform_seed, 0, 1e6)),
    p.uniform_palette_colors_hex.map(hexToInt),
    Math.round(clamp(p.uniform_motion_speed, 0, 2) * SCALE),
    Math.round(clamp(p.uniform_flow_rotation_radians, 0, Math.PI * 2) * SCALE),
    Math.round(clamp(p.uniform_flow_drift_speed_x, -0.3, 0.3) * SCALE),
    Math.round(clamp(p.uniform_flow_drift_speed_y, -0.3, 0.3) * SCALE),
    Math.round(clamp(p.uniform_warp_strength, 0, 1.2) * SCALE),
    Math.round(clamp(p.uniform_warp_scale, 0.2, 6) * SCALE),
    Math.round(clamp(p.uniform_turbulence, 0, 1) * SCALE),
    Math.round(clamp(p.uniform_brightness, 0, 2) * SCALE),
    Math.round(clamp(p.uniform_contrast, 0, 2) * SCALE),
    Math.round(clamp(p.uniform_saturation, 0, 2) * SCALE),
    Math.round(clamp(p.uniform_grain_amount, 0, 0.25) * SCALE),
    Math.round(clamp(p.uniform_grain_size, 0.5, 1.6) * SCALE),
    p.uniform_reduce_motion_enabled,
    preset.exportDefaults?.quality && !qualityEqualsDefault(preset.exportDefaults.quality)
      ? encodeQuality(preset.exportDefaults.quality)
      : null,
  ];
  return `${COMPACT_PRESET_PREFIX_G2}${toBase64Url(
    encodeUtf8(JSON.stringify(payload))
  )}`;
}

/** New g2 decode: array → GradientPreset (presetVersion/engineId restored). */
export function decodeCompactPresetV2(compactPreset: string): GradientPreset {
  if (!isCompactPresetG2(compactPreset)) {
    throw new Error("Unsupported compact preset format.");
  }
  const payloadText = decodeUtf8(
    fromBase64Url(compactPreset.slice(COMPACT_PRESET_PREFIX_G2.length))
  );
  let raw: unknown;
  try {
    raw = JSON.parse(payloadText);
  } catch {
    throw new Error("Invalid compact preset payload.");
  }
  if (!Array.isArray(raw) || raw.length < 16) {
    throw new Error("Compact preset payload is incomplete.");
  }
  const arr = raw as unknown[];
  const paletteInts = Array.isArray(arr[1]) ? (arr[1] as number[]) : [];
  const hexColors = paletteInts.slice(0, 6).map(intToHex);
  if (hexColors.length < 3) {
    throw new Error("Compact preset must have at least 3 palette colors.");
  }
  const qualityArr = raw[15] != null && Array.isArray(raw[15])
    ? (raw[15] as G2QualityArray)
    : null;

  const params: GradientParams = {
    uniform_seed: clamp(Number(arr[0]), 0, 1e6),
    uniform_palette_colors_hex: hexColors,
    uniform_motion_speed: clamp(Number(arr[2]) / SCALE, 0, 2),
    uniform_flow_rotation_radians: clamp(Number(arr[3]) / SCALE, 0, Math.PI * 2),
    uniform_flow_drift_speed_x: clamp(Number(arr[4]) / SCALE, -0.3, 0.3),
    uniform_flow_drift_speed_y: clamp(Number(arr[5]) / SCALE, -0.3, 0.3),
    uniform_warp_strength: clamp(Number(arr[6]) / SCALE, 0, 1.2),
    uniform_warp_scale: clamp(Number(arr[7]) / SCALE, 0.2, 6),
    uniform_turbulence: clamp(Number(arr[8]) / SCALE, 0, 1),
    uniform_brightness: clamp(Number(arr[9]) / SCALE, 0, 2),
    uniform_contrast: clamp(Number(arr[10]) / SCALE, 0, 2),
    uniform_saturation: clamp(Number(arr[11]) / SCALE, 0, 2),
    uniform_grain_amount: clamp(Number(arr[12]) / SCALE, 0, 0.25),
    uniform_grain_size: clamp(Number(arr[13]) / SCALE, 0.5, 1.6),
    uniform_reduce_motion_enabled: Number(arr[14]) >= 0.5 ? 1 : 0,
  };

  return {
    presetVersion: PRESET_VERSION,
    engineId: GRADIENT_ENGINE_ID,
    params,
    exportDefaults:
      qualityArr != null
        ? { quality: decodeQuality(qualityArr) }
        : undefined,
  };
}

/** Encode preset as compact key. Default is g2. */
export function encodeCompactPreset(preset: GradientPreset): string {
  return encodeCompactPresetV2(preset);
}

/** Decode compact key: g1: or g2: → GradientPreset. */
export function decodeCompactPreset(compactPreset: string): GradientPreset {
  if (isCompactPresetG2(compactPreset)) {
    return decodeCompactPresetV2(compactPreset);
  }
  if (isCompactPresetG1(compactPreset)) {
    return decodeCompactPresetV1(compactPreset);
  }
  throw new Error("Unsupported compact preset format.");
}

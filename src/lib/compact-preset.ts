import {
  GRADIENT_ENGINE_ID,
  PRESET_VERSION,
  type GradientPreset,
  type GradientQualityDefaults,
} from "@/types/preset";

const COMPACT_PRESET_PREFIX = "g1:";

interface CompactPresetPayload {
  n?: string;
  p: GradientPreset["params"];
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

export function isCompactPresetString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(COMPACT_PRESET_PREFIX);
}

export function encodeCompactPreset(preset: GradientPreset): string {
  const payload: CompactPresetPayload = {
    n: preset.name,
    p: preset.params,
    q: preset.exportDefaults?.quality,
  };

  return `${COMPACT_PRESET_PREFIX}${toBase64Url(
    encodeUtf8(JSON.stringify(payload))
  )}`;
}

export function decodeCompactPreset(compactPreset: string): GradientPreset {
  if (!isCompactPresetString(compactPreset)) {
    throw new Error("Unsupported compact preset format.");
  }

  const payloadText = decodeUtf8(
    fromBase64Url(compactPreset.slice(COMPACT_PRESET_PREFIX.length))
  );

  let payload: CompactPresetPayload;
  try {
    payload = JSON.parse(payloadText) as CompactPresetPayload;
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

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GradientParams, Preset } from "@/types/preset";

export type AppMode = "landing" | "generator";

const DEFAULT_PARAMS: GradientParams = {
  uniform_seed: 42,
  uniform_palette_colors_hex: ["#0a0a12", "#1a1a2e", "#2563eb", "#f97316", "#fbbf24"],
  uniform_motion_speed: 0.6,
  uniform_flow_rotation_radians: 0.9,
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

export interface GradientState {
  params: GradientParams;
  activePreset: Preset | null;
  mode: AppMode;
  licenseValid: boolean;
  qualityResolutionScale: number;
  qualityFpsCap: 30 | 60;
  fallbackDataUrl: string | null;

  setParams: (params: GradientParams) => void;
  setParamsPartial: (partial: Partial<GradientParams>) => void;
  setActivePreset: (preset: Preset | null) => void;
  applyPreset: (preset: Preset) => void;
  setMode: (mode: AppMode) => void;
  setLicenseValid: (valid: boolean) => void;
  enterGenerator: () => void;
  setQualityResolutionScale: (v: number) => void;
  setQualityFpsCap: (v: 30 | 60) => void;
  setFallbackDataUrl: (v: string | null) => void;
}

export const useGradientStore = create<GradientState>()(
  persist(
    (set) => ({
      params: DEFAULT_PARAMS,
      activePreset: null,
      mode: "landing",
      licenseValid: false,
      qualityResolutionScale: 0.75,
      qualityFpsCap: 60,
      fallbackDataUrl: null,

      setParams: (params) => set({ params }),
      setParamsPartial: (partial) =>
        set((state) => ({ params: { ...state.params, ...partial } })),

      setActivePreset: (activePreset) => set({ activePreset }),

      applyPreset: (preset) =>
        set({
          params: {
            uniform_seed: preset.uniform_seed,
            uniform_palette_colors_hex: [...preset.uniform_palette_colors_hex],
            uniform_motion_speed: preset.uniform_motion_speed,
            uniform_flow_rotation_radians: preset.uniform_flow_rotation_radians,
            uniform_warp_strength: preset.uniform_warp_strength,
            uniform_warp_scale: preset.uniform_warp_scale,
            uniform_turbulence: preset.uniform_turbulence,
            uniform_brightness: preset.uniform_brightness,
            uniform_contrast: preset.uniform_contrast,
            uniform_saturation: preset.uniform_saturation,
            uniform_grain_amount: preset.uniform_grain_amount,
            uniform_grain_size: preset.uniform_grain_size,
            uniform_reduce_motion_enabled: preset.uniform_reduce_motion_enabled,
          },
          activePreset: preset,
          qualityResolutionScale: preset.quality_resolution_scale,
          qualityFpsCap: preset.quality_fps_cap,
        }),

      setMode: (mode) => set({ mode }),

      setLicenseValid: (valid) => set({ licenseValid: valid }),

      enterGenerator: () => set({ mode: "generator" }),

      setQualityResolutionScale: (qualityResolutionScale) =>
        set({ qualityResolutionScale }),
      setQualityFpsCap: (qualityFpsCap) => set({ qualityFpsCap }),
      setFallbackDataUrl: (fallbackDataUrl) => set({ fallbackDataUrl }),
    }),
    {
      name: "gradient-store",
      partialize: (state) => ({
        licenseValid: state.licenseValid,
        mode: state.mode,
      }),
    }
  )
);

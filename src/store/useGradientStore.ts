"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyPresetToStore } from "@/lib/preset";
import {
  DEFAULT_GRADIENT_PARAMS,
  DEFAULT_PRESET_QUALITY,
  type GradientParams,
  type GradientPreset,
} from "@/types/preset";

export type AppMode = "landing" | "generator";

export interface GradientState {
  params: GradientParams;
  activePreset: GradientPreset | null;
  mode: AppMode;
  licenseValid: boolean;
  qualityResolutionScale: number;
  qualityFpsCap: 30 | 60;
  qualityFlowMapSize: number;
  qualityFlowFps: number;
  fallbackDataUrl: string | null;

  setParams: (params: GradientParams) => void;
  setParamsPartial: (partial: Partial<GradientParams>) => void;
  setActivePreset: (preset: GradientPreset | null) => void;
  applyPreset: (preset: GradientPreset) => void;
  setMode: (mode: AppMode) => void;
  setLicenseValid: (valid: boolean) => void;
  enterGenerator: () => void;
  setQualityResolutionScale: (v: number) => void;
  setQualityFpsCap: (v: 30 | 60) => void;
  setQualityFlowMapSize: (v: number) => void;
  setQualityFlowFps: (v: number) => void;
  setFallbackDataUrl: (v: string | null) => void;
}

export const useGradientStore = create<GradientState>()(
  persist(
    (set) => ({
      params: DEFAULT_GRADIENT_PARAMS,
      activePreset: null,
      mode: "landing",
      licenseValid: false,
      qualityResolutionScale: DEFAULT_PRESET_QUALITY.qualityResolutionScale,
      qualityFpsCap: DEFAULT_PRESET_QUALITY.qualityFpsCap,
      qualityFlowMapSize: DEFAULT_PRESET_QUALITY.qualityFlowMapSize,
      qualityFlowFps: DEFAULT_PRESET_QUALITY.qualityFlowFps,
      fallbackDataUrl: null,

      setParams: (params) => set({ params }),
      setParamsPartial: (partial) =>
        set((state) => ({ params: { ...state.params, ...partial } })),

      setActivePreset: (activePreset) => set({ activePreset }),

      applyPreset: (preset) => set(applyPresetToStore(preset)),

      setMode: (mode) => set({ mode }),

      setLicenseValid: (valid) => set({ licenseValid: valid }),

      enterGenerator: () => set({ mode: "generator" }),

      setQualityResolutionScale: (qualityResolutionScale) =>
        set({ qualityResolutionScale }),
      setQualityFpsCap: (qualityFpsCap) => set({ qualityFpsCap }),
      setQualityFlowMapSize: (qualityFlowMapSize) => set({ qualityFlowMapSize }),
      setQualityFlowFps: (qualityFlowFps) => set({ qualityFlowFps }),
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

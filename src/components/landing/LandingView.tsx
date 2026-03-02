"use client";

import { useCallback } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { getDemoPresets } from "@/presets";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { PresetStrip } from "./PresetStrip";
import { PresetPreviewCanvas } from "./PresetPreviewCanvas";
import { Pricing } from "./Pricing";
import type { Preset } from "@/types/preset";

interface LandingViewProps {
  onOpenLicenseModal: () => void;
  onPurchaseClick: () => void;
}

export function LandingView({
  onOpenLicenseModal,
  onPurchaseClick,
}: LandingViewProps) {
  const params = useGradientStore((s) => s.params);
  const activePreset = useGradientStore((s) => s.activePreset);
  const applyPreset = useGradientStore((s) => s.applyPreset);

  const demoPresets = getDemoPresets();

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      applyPreset(preset);
    },
    [applyPreset]
  );

  return (
    <div className="min-h-screen">
      <Hero
        background={
          <GradientCanvas
            params={params}
            config={{ resolutionScale: 0.75, fpsCap: 60 }}
            className="absolute inset-0"
          />
        }
        onCtaClick={onPurchaseClick}
        onLicenseKeyClick={onOpenLicenseModal}
      />
      <Features />
      <PresetStrip
        presets={demoPresets}
        activePresetName={activePreset?.preset_name ?? null}
        onSelect={handlePresetSelect}
        renderPreview={(preset) => <PresetPreviewCanvas preset={preset} />}
      />
      <HowItWorks />
      <Pricing onPurchase={onPurchaseClick} />
    </div>
  );
}

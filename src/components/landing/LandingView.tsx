"use client";

import { useCallback } from "react";
import { getPresetName } from "@/lib/preset";
import { useGradientStore } from "@/store/useGradientStore";
import { getDemoPresets } from "@/presets";
import { usePresetThumbnails } from "@/hooks/usePresetThumbnails";
import { GradientCanvas } from "@/components/canvas/GradientCanvas";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { PresetStrip } from "./PresetStrip";
import { Pricing } from "./Pricing";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { GradientPreset } from "@/types/preset";

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
  const thumbnails = usePresetThumbnails(demoPresets);

  const handlePresetSelect = useCallback(
    (preset: GradientPreset) => {
      applyPreset(preset);
    },
    [applyPreset]
  );

  return (
    <ScrollArea type="scroll" className="h-screen">
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
          activePresetName={activePreset?.name ?? null}
          onSelect={handlePresetSelect}
          renderPreview={(preset) => {
            const presetName = getPresetName(preset);

            return thumbnails[presetName] ? (
              <img
                src={thumbnails[presetName]}
                alt=""
                className="w-20 h-12 rounded object-cover bg-neutral-900"
              />
            ) : (
              <div
                className="w-20 h-12 rounded bg-white/10"
                style={{
                  background: `linear-gradient(90deg, ${preset.params.uniform_palette_colors_hex
                    .slice(0, 3)
                    .join(", ")})`,
                }}
              />
            );
          }}
        />
        <HowItWorks />
        <Pricing onPurchase={onPurchaseClick} />
      </div>
    </ScrollArea>
  );
}

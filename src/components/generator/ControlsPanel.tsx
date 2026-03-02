"use client";

import { useState } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { PaletteEditor } from "./controls/PaletteEditor";
import { MotionControls } from "./controls/MotionControls";
import { WarpControls } from "./controls/WarpControls";
import { PostControls } from "./controls/PostControls";
import { GrainControls } from "./controls/GrainControls";
import { QualityControls } from "./controls/QualityControls";

const SECTIONS = [
  { id: "palette", label: "Palette", Component: PaletteEditor },
  { id: "motion", label: "Motion", Component: MotionControls },
  { id: "warp", label: "Warp", Component: WarpControls },
  { id: "post", label: "Post", Component: PostControls },
  { id: "grain", label: "Grain", Component: GrainControls },
  { id: "quality", label: "Quality", Component: QualityControls },
] as const;

export function ControlsPanel() {
  const [openId, setOpenId] = useState<string | null>("palette");
  const params = useGradientStore((s) => s.params);
  const setParamsPartial = useGradientStore((s) => s.setParamsPartial);
  const qualityResolutionScale = useGradientStore((s) => s.qualityResolutionScale);
  const qualityFpsCap = useGradientStore((s) => s.qualityFpsCap);
  const setQualityResolutionScale = useGradientStore((s) => s.setQualityResolutionScale);
  const setQualityFpsCap = useGradientStore((s) => s.setQualityFpsCap);
  const reduceMotion = params.uniform_reduce_motion_enabled;

  return (
    <div className="flex flex-col gap-1 border border-white/10 rounded-lg overflow-hidden bg-neutral-900/80">
      {SECTIONS.map(({ id, label, Component }) => {
        const isOpen = openId === id;
        return (
          <div key={id} className="border-b border-white/10 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-white hover:bg-white/5"
            >
              {label}
              <span className="text-white/50">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-0">
                {id === "palette" && (
                  <PaletteEditor
                    colors={params.uniform_palette_colors_hex}
                    onChange={setParamsPartial}
                  />
                )}
                {id === "motion" && (
                  <MotionControls params={params} onChange={setParamsPartial} />
                )}
                {id === "warp" && (
                  <WarpControls params={params} onChange={setParamsPartial} />
                )}
                {id === "post" && (
                  <PostControls params={params} onChange={setParamsPartial} />
                )}
                {id === "grain" && (
                  <GrainControls params={params} onChange={setParamsPartial} />
                )}
                {id === "quality" && (
                  <QualityControls
                    resolutionScale={qualityResolutionScale}
                    fpsCap={qualityFpsCap}
                    reduceMotion={reduceMotion}
                    onResolutionChange={setQualityResolutionScale}
                    onFpsChange={setQualityFpsCap}
                    onReduceMotionChange={(v) =>
                      setParamsPartial({ uniform_reduce_motion_enabled: v })
                    }
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

interface QualityControlsProps {
  resolutionScale: number;
  fpsCap: 30 | 60;
  reduceMotion: 0 | 1;
  onResolutionChange: (v: number) => void;
  onFpsChange: (v: 30 | 60) => void;
  onReduceMotionChange: (v: 0 | 1) => void;
  flowMapSize?: number;
  flowFps?: number;
  onFlowMapSizeChange?: (v: number) => void;
  onFlowFpsChange?: (v: number) => void;
}

const FLOW_MAP_SIZES = [256, 384, 512] as const;
const FLOW_FPS_OPTIONS = [15, 30, 60] as const;

export function QualityControls({
  resolutionScale,
  fpsCap,
  reduceMotion,
  onResolutionChange,
  onFpsChange,
  onReduceMotionChange,
  flowMapSize,
  flowFps,
  onFlowMapSizeChange,
  onFlowFpsChange,
}: QualityControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-white/70 block mb-2">Reduce motion</span>
        <button
          type="button"
          onClick={() => onReduceMotionChange(reduceMotion ? 0 : 1)}
          className={`px-3 py-1.5 rounded text-sm ${
            reduceMotion ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
          }`}
        >
          {reduceMotion ? "On" : "Off"}
        </button>
      </div>
      <div>
        <span className="text-xs text-white/70 block mb-2">Resolution scale</span>
        <div className="flex gap-2">
          {([0.5, 0.75, 1] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onResolutionChange(v)}
              className={`px-3 py-1.5 rounded text-sm ${
                resolutionScale === v
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {v === 1 ? "100%" : `${v * 100}%`}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs text-white/70 block mb-2">FPS cap</span>
        <div className="flex gap-2">
          {([30, 60] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onFpsChange(v)}
              className={`px-3 py-1.5 rounded text-sm ${
                fpsCap === v
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {(onFlowMapSizeChange != null || onFlowFpsChange != null) && (
        <div className="pt-2 border-t border-white/10 space-y-3">
          <span className="text-xs text-white/50 block">Advanced</span>
          {onFlowMapSizeChange != null && flowMapSize != null && (
            <div>
              <span className="text-xs text-white/70 block mb-2">Flow map size</span>
              <div className="flex gap-2 flex-wrap">
                {FLOW_MAP_SIZES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onFlowMapSizeChange(v)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      flowMapSize === v
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          {onFlowFpsChange != null && flowFps != null && (
            <div>
              <span className="text-xs text-white/70 block mb-2">Flow FPS</span>
              <div className="flex gap-2 flex-wrap">
                {FLOW_FPS_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onFlowFpsChange(v)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      flowFps === v
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

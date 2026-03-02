"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { GradientParams } from "@/types/preset";
import type { GradientRenderer, RendererConfig } from "@/engine/renderer";
import { GradientRenderer as RendererClass } from "@/engine/renderer";
import { FallbackImage } from "./FallbackImage";

export interface GradientCanvasProps {
  /** Current gradient params (from store or preset). */
  params: GradientParams;
  /** Resolution scale and fps cap. */
  config?: Partial<RendererConfig>;
  /** Optional ref to receive the renderer instance (e.g. for export). */
  rendererRef?: MutableRefObject<GradientRenderer | null>;
  /** Called when WebGL is ready and loop has started. Parent can hide fallback. */
  onReady?: () => void;
  /** Called when WebGL init or compile fails. */
  onError?: (error: Error) => void;
  /** Called with data URL of first frame for fallback/thumbnail. */
  onFallbackCapture?: (dataUrl: string) => void;
  className?: string;
}

export function GradientCanvas({
  params,
  config,
  onReady,
  onError,
  onFallbackCapture,
  rendererRef: externalRendererRef,
  className = "",
}: GradientCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalRendererRef = useRef<GradientRenderer | null>(null);
  const rendererRef = externalRendererRef ?? internalRendererRef;
  const [glReady, setGlReady] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const getParams = useCallback(() => paramsRef.current, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: GradientRenderer | null = null;

    try {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);

      renderer = RendererClass.create(canvas, config);
      rendererRef.current = renderer;
      externalRendererRef && (externalRendererRef.current = renderer);

      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w && h) renderer?.resize(w, h);
      };

      const ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      renderer.startLoop(getParams);
      setGlReady(true);
      onReady?.();

      // Capture first frame for fallback after a short delay
      const t = setTimeout(() => {
        try {
          const r = rendererRef.current;
          if (r) {
            const dataUrl = r.capturePng(getParams(), 640, 360);
            setFallbackSrc(dataUrl);
            onFallbackCapture?.(dataUrl);
          }
        } catch {
          // ignore
        }
      }, 500);

      return () => {
        clearTimeout(t);
        ro.disconnect();
        renderer?.stopLoop();
        renderer?.destroy();
        rendererRef.current = null;
        externalRendererRef && (externalRendererRef.current = null);
        container.removeChild(canvas);
      };
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      if (renderer) {
        renderer.destroy();
        rendererRef.current = null;
        externalRendererRef && (externalRendererRef.current = null);
      }
    }
  }, [config?.resolutionScale, config?.fpsCap, getParams, onReady, onError, onFallbackCapture]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <FallbackImage visible={!glReady} src={fallbackSrc} />
      {/* Canvas is appended by effect; it sits above FallbackImage in DOM order */}
    </div>
  );
}


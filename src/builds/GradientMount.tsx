"use client";

import { useEffect, useRef } from "react";
import { Gradient } from "../engine/gradient-runtime";
import type { GradientPresetInput } from "../types/preset";
import type { GradientMountOptions } from "../engine/runtime-types";

export interface GradientMountProps {
  /** Preset object or compact string (g1: / g2:). Prefer a stable reference (e.g. constant or useMemo). */
  preset: GradientPresetInput;
  /** Mount options. mode: "animated" | "static" | "hover" (default "hover" for buttons). */
  options?: Partial<GradientMountOptions>;
  /** ClassName for the wrapper div (gradient fills it; use for size/radius). */
  className?: string;
  /** Inline style for the wrapper div. */
  style?: React.CSSProperties;
  /** Content rendered above the gradient (z-index 1). Use for Button, text, etc. */
  children?: React.ReactNode;
}

/**
 * React wrapper for gradient-runtime. Mounts the gradient on a div and destroys it on unmount.
 * Use as a drop-in background for buttons, cards, or any block — no ref/useEffect in your code.
 */
export function GradientMount({
  preset,
  options,
  className,
  style,
  children,
}: GradientMountProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const instance = Gradient.mount(el, preset, {
      mode: "hover",
      resolutionScale: 0.75,
      fpsCap: 60,
      ...options,
    });
    return () => instance.destroy();
  }, [preset, options?.mode, options?.resolutionScale, options?.fpsCap]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {children != null ? (
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      ) : null}
    </div>
  );
}

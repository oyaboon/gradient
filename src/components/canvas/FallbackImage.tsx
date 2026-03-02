"use client";

/**
 * Static fallback shown until WebGL is ready or when WebGL fails.
 * Opacity transition when visibility changes.
 */

interface FallbackImageProps {
  /** When true, fallback is visible (opacity 1). When false, fades out. */
  visible: boolean;
  /** Optional data URL for thumbnail/fallback. If not set, shows a dark placeholder. */
  src?: string | null;
  className?: string;
}

export function FallbackImage({ visible, src, className = "" }: FallbackImageProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${className}`}
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
      aria-hidden={!visible}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-neutral-950" />
      )}
    </div>
  );
}

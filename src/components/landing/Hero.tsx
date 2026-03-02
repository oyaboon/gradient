"use client";

import { Button } from "@/components/ui/Button";

interface HeroProps {
  onCtaClick: () => void;
  onLicenseKeyClick: () => void;
  /** Rendered behind the content as fullscreen background. */
  background: React.ReactNode;
}

export function Hero({ onCtaClick, onLicenseKeyClick, background }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="absolute inset-0 z-0">{background}</div>
      <div className="relative z-10 max-w-2xl">
        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white">
          gradient
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/80 font-light max-w-md mx-auto">
          Animated gradients. Self-contained. One price. No subscriptions.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="primary" size="lg" onClick={onCtaClick}>
            Full access — $5
          </Button>
          <button
            type="button"
            onClick={onLicenseKeyClick}
            className="text-white/60 hover:text-white text-sm underline underline-offset-2 transition-colors"
          >
            Already have a key?
          </button>
        </div>
      </div>
    </section>
  );
}

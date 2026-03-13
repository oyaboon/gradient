"use client";

import Link from "next/link";
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
          Animated gradients for web UIs. Self-hosted. One price.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Button variant="primary" size="lg" onClick={onCtaClick}>
            Full access — $5
          </Button>
          <div className="flex flex-row items-center gap-6 text-sm">
            <button
              type="button"
              onClick={onLicenseKeyClick}
              className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              Already have a key?
            </button>
            <Link
              href="/docs"
              className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              Documentation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Button } from "@/components/ui/Button";

interface PricingProps {
  onPurchase: () => void;
  onLicenseKeyClick: () => void;
}

export function Pricing({ onPurchase, onLicenseKeyClick }: PricingProps) {
  return (
    <section className="relative z-10 py-24 px-6 border-t border-white/10">
      <div className="max-w-md mx-auto text-center flex flex-col items-center">
        <h2 className="font-display text-3xl font-bold text-white mb-4">
          Full access
        </h2>
        <p className="text-white/70 text-lg mb-8">
          $5 one-time.
        </p>
        <ul className="text-white/80 text-sm space-y-2 mb-10">
          <li>✓ Full generator access</li>
          <li>✓ Export for code and design</li>
          <li>✓ One-time payment</li>
        </ul>
        <div className="flex flex-col items-center gap-4">
          <Button variant="primary" size="lg" onClick={onPurchase}>
            Get access — $5
          </Button>
          <div className="flex flex-row items-center gap-6 text-sm">
            <button
              type="button"
              onClick={onLicenseKeyClick}
              className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              Already have a key?
            </button>
            <a
              href="/docs"
              className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

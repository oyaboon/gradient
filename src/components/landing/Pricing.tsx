"use client";

import { Button } from "@/components/ui/Button";

interface PricingProps {
  onPurchase: () => void;
}

export function Pricing({ onPurchase }: PricingProps) {
  return (
    <section className="relative z-10 py-24 px-6 border-t border-white/10">
      <div className="max-w-md mx-auto text-center">
        <h2 className="font-display text-3xl font-bold text-white mb-4">
          Full access
        </h2>
        <p className="text-white/70 text-lg mb-8">
          $5 one-time. All presets. Generator. Export embed, PNG, and preset JSON.
        </p>
        <ul className="text-left text-white/80 text-sm space-y-2 mb-10">
          <li>✓ Unlimited exports</li>
          <li>✓ Self-contained HTML + JS (no CDN)</li>
          <li>✓ PNG at 1080p and 4K</li>
          <li>✓ Import / export preset JSON</li>
        </ul>
        <Button variant="primary" size="lg" onClick={onPurchase}>
          Get access — $5
        </Button>
      </div>
    </section>
  );
}

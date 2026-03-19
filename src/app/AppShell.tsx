"use client";

import { useState, useEffect, useCallback } from "react";
import Script from "next/script";
import { useGradientStore } from "@/store/useGradientStore";
import { useToastStore } from "@/store/useToastStore";
import { LandingView } from "@/components/landing/LandingView";
import { LicenseGate } from "@/components/license/LicenseGate";
import { GeneratorView } from "@/components/generator/GeneratorView";
import { Toast } from "@/components/ui/Toast";

interface PaddleCheckoutEvent {
  name: string;
  data?: { transaction_id?: string };
}

declare global {
  interface Window {
    Paddle?: {
      Initialize: (options: {
        token: string;
        eventCallback?: (event: PaddleCheckoutEvent) => void;
      }) => void;
      Checkout: {
        open: (options: {
          transactionId?: string;
          items?: Array<{ priceId: string; quantity: number }>;
          settings?: {
            displayMode?: "overlay" | "inline";
            variant?: "multi-page" | "one-page";
            theme?: "light" | "dark";
          };
        }) => void;
      };
    };
    __gradientPaddleInitialized?: boolean;
  }
}

export function AppShell() {
  const mode = useGradientStore((s) => s.mode);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [paddleScriptLoaded, setPaddleScriptLoaded] = useState(false);
  const toastMessage = useToastStore((s) => s.message);
  const dismissToast = useToastStore((s) => s.dismiss);
  const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) useGradientStore.getState().setParamsPartial({ uniform_reduce_motion_enabled: 1 });
  }, []);

  useEffect(() => {
    if (!paddleScriptLoaded || !paddleClientToken || typeof window === "undefined") {
      return;
    }

    if (!window.Paddle || window.__gradientPaddleInitialized) {
      return;
    }

    window.Paddle.Initialize({
      token: paddleClientToken,
      eventCallback: (event) => {
        if (event.name === "checkout.completed" && event.data?.transaction_id) {
          window.location.href = `/checkout/success?transaction_id=${event.data.transaction_id}`;
        }
      },
    });
    window.__gradientPaddleInitialized = true;
  }, [paddleClientToken, paddleScriptLoaded]);

  const handlePurchaseClick = useCallback(() => {
    const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;

    if (!window.Paddle) {
      console.error("Paddle.js not loaded yet");
      return;
    }

    if (!priceId) {
      console.error("NEXT_PUBLIC_PADDLE_PRICE_ID is not configured");
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        theme: "light",
      },
    });
  }, []);

  const showGenerator = mounted && mode === "generator";

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => setPaddleScriptLoaded(true)}
      />
      {showGenerator ? (
        <GeneratorView />
      ) : (
        <LandingView
          onOpenLicenseModal={() => setLicenseModalOpen(true)}
          onPurchaseClick={handlePurchaseClick}
        />
      )}
      <LicenseGate
        open={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        onSuccess={() => setLicenseModalOpen(false)}
      />
      <Toast message={toastMessage} onDismiss={dismissToast} />
    </>
  );
}

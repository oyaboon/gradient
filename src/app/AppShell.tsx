"use client";

import { useState, useEffect } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { useToastStore } from "@/store/useToastStore";
import { LandingView } from "@/components/landing/LandingView";
import { LicenseGate } from "@/components/license/LicenseGate";
import { GeneratorView } from "@/components/generator/GeneratorView";
import { Toast } from "@/components/ui/Toast";

export function AppShell() {
  const mode = useGradientStore((s) => s.mode);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toastMessage = useToastStore((s) => s.message);
  const dismissToast = useToastStore((s) => s.dismiss);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) useGradientStore.getState().setParamsPartial({ uniform_reduce_motion_enabled: 1 });
  }, []);

  const showGenerator = mounted && mode === "generator";

  return (
    <>
      {showGenerator ? (
        <GeneratorView />
      ) : (
        <LandingView
          onOpenLicenseModal={() => setLicenseModalOpen(true)}
          onPurchaseClick={() => setLicenseModalOpen(true)}
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

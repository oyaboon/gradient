"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SuccessPageState =
  | { status: "loading" }
  | { status: "processing" }
  | { status: "ready"; licenseKey: string }
  | { status: "error"; message: string };

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transaction_id") ?? searchParams.get("_ptxn");
  const sessionId = searchParams.get("session_id");
  const lookupId = transactionId ?? sessionId;
  const isTransactionLookup = Boolean(transactionId);

  const [successPageState, setSuccessPageState] = useState<SuccessPageState>({
    status: "loading",
  });

  useEffect(() => {
    if (!lookupId) {
      setSuccessPageState({
        status: "error",
        message: "Missing transaction or session ID",
      });
      return;
    }

    let pollingTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let requestWasCancelled = false;

    const pollUrl = isTransactionLookup
      ? `/api/license/by-transaction?transaction_id=${encodeURIComponent(transactionId!)}`
      : `/api/license/by-session?session_id=${encodeURIComponent(sessionId!)}`;

    async function pollLicense() {
      try {
        const responseObject = await fetch(pollUrl, { cache: "no-store" });

        const responseData = await responseObject.json();

        if (requestWasCancelled) return;

        if (responseData.status === "processing") {
          setSuccessPageState({ status: "processing" });
          pollingTimeoutId = setTimeout(pollLicense, 1500);
          return;
        }

        if (responseData.status === "active" && responseData.license_key) {
          setSuccessPageState({
            status: "ready",
            licenseKey: responseData.license_key,
          });
          return;
        }

        if (responseData.status === "refunded") {
          setSuccessPageState({
            status: "error",
            message: "Payment was refunded",
          });
          return;
        }

        setSuccessPageState({
          status: "error",
          message: "Unexpected response",
        });
      } catch {
        if (requestWasCancelled) return;

        setSuccessPageState({
          status: "error",
          message: "Failed to load license",
        });
      }
    }

    pollLicense();

    return () => {
      requestWasCancelled = true;
      if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
    };
  }, [lookupId, isTransactionLookup, transactionId, sessionId]);

  if (successPageState.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/70 text-lg">Loading…</p>
      </div>
    );
  }

  if (successPageState.status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-white text-lg font-medium">Payment received</p>
          <p className="text-white/60 text-sm">
            Waiting for license activation…
          </p>
        </div>
      </div>
    );
  }

  if (successPageState.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{successPageState.message}</p>
          <a
            href="/"
            className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-white/70 hover:text-white transition-colors"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 space-y-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-white">
          Payment successful
        </h1>
        <p className="text-white/70">Your license key:</p>
        <pre className="rounded-lg border border-white/10 bg-black/30 p-4 text-white font-mono text-sm break-all select-all">
          {successPageState.licenseKey}
        </pre>
        <p className="text-white/50 text-xs">
          Copy and save this key. You can use it to unlock the generator.
        </p>
        <a
          href="/"
          className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-white/70 hover:text-white transition-colors"
        >
          Back to app
        </a>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-white/70 text-lg">Loading…</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

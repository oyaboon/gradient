"use client";

import { useState, useCallback } from "react";
import { useGradientStore } from "@/store/useGradientStore";
import { Button } from "@/components/ui/Button";

interface LicenseGateProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Status = "idle" | "loading" | "invalid" | "expired" | "refunded" | "valid";

export function LicenseGate({ open, onClose, onSuccess }: LicenseGateProps) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const setLicenseValid = useGradientStore((s) => s.setLicenseValid);
  const enterGenerator = useGradientStore((s) => s.enterGenerator);

  const verify = useCallback(async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: trimmed }),
      });
      const data = await res.json();

      if (data.is_valid) {
        setLicenseValid(true);
        enterGenerator();
        setStatus("valid");
        onSuccess?.();
        onClose();
        return;
      }

      const s = (data.license_status as string) || "invalid";
      if (s === "expired") setStatus("expired");
      else if (s === "refunded") setStatus("refunded");
      else setStatus("invalid");
    } catch {
      setStatus("invalid");
    }
  }, [key, setLicenseValid, enterGenerator, onSuccess, onClose]);

  if (!open) return null;

  const statusMessage =
    status === "invalid"
      ? "Invalid key. Check and try again."
      : status === "expired"
        ? "This key has expired."
        : status === "refunded"
          ? "This key is no longer valid."
          : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/20 rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="license-modal-title" className="font-display text-xl font-semibold text-white mb-4">
          Enter license key
        </h2>
        <p className="text-white/70 text-sm mb-4">
          Paste the key you received after purchase to unlock the full generator.
        </p>
        <input
          type="text"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 mb-4"
          disabled={status === "loading"}
          autoFocus
        />
        {statusMessage && (
          <p className="text-red-400 text-sm mb-4" role="alert">
            {statusMessage}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={verify}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Verifying…" : "Verify"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { DocsView } from "@/components/doc-page/DocsView";

export const metadata: Metadata = {
  title: "gradient docs — Install, API, modes, presets, export",
  description:
    "Install gradient-runtime, mount gradients in your UI, and learn the API, modes, presets, and export flow.",
  alternates: { canonical: "https://gradient.oyaboon.com/docs" },
  openGraph: {
    title: "gradient docs — Install, API, modes, presets, export",
    description:
      "Install gradient-runtime, mount gradients in your UI, and learn the API, modes, presets, and export flow.",
    url: "https://gradient.oyaboon.com/docs",
  },
  twitter: {
    title: "gradient docs — Install, API, modes, presets, export",
    description:
      "Install gradient-runtime, mount gradients in your UI, and learn the API, modes, presets, and export flow.",
  },
};

export default function DocsPage() {
  return <DocsView />;
}

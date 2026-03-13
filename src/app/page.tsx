import type { Metadata } from "next";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "gradient — Animated gradients for web UIs",
  description:
    "Animated gradients for web UIs. Self-hosted. One price. Export for code or design.",
  alternates: { canonical: "https://gradient.oyaboon.com/" },
  openGraph: {
    title: "gradient — Animated gradients for web UIs",
    description:
      "Animated gradients for web UIs. Self-hosted. One price. Export for code or design.",
    url: "https://gradient.oyaboon.com/",
  },
  twitter: {
    title: "gradient — Animated gradients for web UIs",
    description:
      "Animated gradients for web UIs. Self-hosted. One price. Export for code or design.",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "gradient",
    url: "https://gradient.oyaboon.com/",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "gradient",
    url: "https://gradient.oyaboon.com/",
    logo: "https://gradient.oyaboon.com/icon-512.png",
    sameAs: [
      "https://github.com/oyaboon/gradient",
      "https://x.com/oyaboonx",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "gradient",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: "https://gradient.oyaboon.com/",
    offers: {
      "@type": "Offer",
      price: "5",
      priceCurrency: "USD",
    },
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppShell />
    </main>
  );
}

"use client";

import { CodeBlock } from "@/components/ui/CodeBlock";

const INSTALL_CODE = `npm install gradient-runtime`;

const MOUNT_CODE = `import { Gradient } from "gradient-runtime";

const preset = "g2:WzY4LFs5ODU2MDgsNDM5NjAzOSwx...";

const instance = Gradient.mount("#hero", preset, {
  mode: "animated"
});`;

const SHARED_MOUNT_CODE = `import { Gradient } from "gradient-runtime";

const preset = "g2:WzY4LFs5ODU2MDgsNDM5NjAzOSwx...";

const shared = Gradient.mountShared(".card", preset, {
  mode: "animated"
});

// New elements added to the DOM?
shared.rescan();`;

const TABS = [
  { label: "Install", language: "bash", code: INSTALL_CODE },
  { label: "Mount", language: "javascript", code: MOUNT_CODE },
  { label: "Shared mount", language: "javascript", code: SHARED_MOUNT_CODE },
];

export function CodePreview() {
  return (
    <section className="relative z-10 py-24 px-6 border-t border-white/10">
      <div className="max-w-2xl mx-auto">
        <p className="font-display text-3xl font-semibold text-white mb-6 text-center">
          Install it and use it your way.
        </p>
        <CodeBlock tabs={TABS} height="h-52" />
      </div>
    </section>
  );
}

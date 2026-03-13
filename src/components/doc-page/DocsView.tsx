"use client";

import { useState, useEffect, useMemo } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { GradientMount } from "@/builds/GradientMount";
import { useGradientStore } from "@/store/useGradientStore";
import Link from "next/link";
import {
  INSTALL_NPM,
  INSTALL_SCRIPT,
  MOUNT_GLOBAL,
  MOUNT_ESM,
  MOUNT_REACT,
  SHARED_GLOBAL,
  SHARED_ESM,
  SHARED_REACT,
  COMPACT_KEY_EXAMPLE,
  PRESET_OBJECT_EXAMPLE,
  MODES_EXAMPLE,
} from "@/lib/docs-code-examples";

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

const NAV = [
  { id: "install", label: "Install" },
  { id: "quick-start", label: "Quick start" },
  { id: "api", label: "API" },
  { id: "modes", label: "Modes" },
  { id: "presets", label: "Presets" },
  { id: "export", label: "Export" },
];

/* ------------------------------------------------------------------ */
/*  Scroll-position based nav tracking                                 */
/* ------------------------------------------------------------------ */

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // If near bottom, activate last section
      if (scrollY + viewportH >= docH - 60) {
        setActive(ids[ids.length - 1]);
        return;
      }

      // Find section whose top is closest above the trigger line (20% from top)
      const trigger = scrollY + viewportH * 0.2;
      let best = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= trigger) {
          best = id;
        }
      }
      setActive(best);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);

  return active;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

const FONT_STACK = "'Inter', system-ui, -apple-system, sans-serif";
const MONO_STACK = "'SF Mono', 'Fira Code', Menlo, Consolas, monospace";

export function DocsView() {
  const sectionIds = NAV.map((n) => n.id);
  const activeSection = useActiveSection(sectionIds);
  const params = useGradientStore((s) => s.params);

  const storePreset = useMemo(
    () => ({
      presetVersion: 1 as const,
      engineId: "grain-v1" as const,
      params,
    }),
    [params]
  );

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-white text-[15px] tracking-tight hover:opacity-70 transition-opacity"
          >
            gradient
          </Link>
          <span className="text-white/40 text-xs font-medium tracking-wide uppercase">
            Documentation
          </span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-44 shrink-0 sticky top-12 h-[calc(100vh-3rem)] py-8 pl-6">
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={"#" + item.id}
                className={
                  "block px-3 py-1.5 text-[13px] rounded-md transition-colors " +
                  (activeSection === item.id
                    ? "text-white bg-white/[0.07]"
                    : "text-white/40 hover:text-white/70")
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 lg:px-16 py-12 pb-32 max-w-[780px] mx-auto">
          {/* ── Install ─────────────────────────────────────────── */}
          <Section id="install" title="Install">
            <CodeBlock
              tabs={[
                { label: "npm", language: "bash", code: INSTALL_NPM },
                { label: "Script tag", language: "html", code: INSTALL_SCRIPT },
              ]}
              height="h-16"
            />
            <Muted>
              React projects also get{" "}
              <Mono>{"<GradientMount>"}</Mono>. Peer dep:{" "}
              <Mono>react &gt;= 17</Mono>.
            </Muted>
          </Section>

          {/* ── Quick start ─────────────────────────────────────── */}
          <Section id="quick-start" title="Quick start">
            <H3>Mount a single gradient</H3>
            <Muted>One element, one renderer.</Muted>

            <Preview>
              <GradientMount
                preset={storePreset}
                options={{ mode: "animated", resolutionScale: 0.5, fpsCap: 30 }}
                className="w-full h-full rounded-lg"
              />
            </Preview>

            <CodeBlock
              tabs={[
                { label: "Global (IIFE)", language: "html", code: MOUNT_GLOBAL },
                { label: "ESM", language: "javascript", code: MOUNT_ESM },
                { label: "React", language: "tsx", code: MOUNT_REACT },
              ]}
            />

            <Spacer />
            <H3>Shared mount</H3>
            <Muted>
              One renderer, many elements. Use for repeated cards, buttons, or
              tiles.
            </Muted>

            <Preview>
              <div className="flex gap-4 items-center justify-center h-full">
                {["Sign Up", "Learn More", "Contact"].map((label) => (
                  <GradientMount
                    key={label}
                    preset={storePreset}
                    options={{
                      mode: "hover",
                      resolutionScale: 0.5,
                      fpsCap: 30,
                    }}
                    className="rounded-full"
                    style={{ minWidth: 120 }}
                  >
                    <span className="block text-center px-6 py-2.5 text-sm text-white font-semibold tracking-tight">
                      {label}
                    </span>
                  </GradientMount>
                ))}
              </div>
            </Preview>

            <CodeBlock
              tabs={[
                { label: "Global (IIFE)", language: "html", code: SHARED_GLOBAL },
                { label: "ESM", language: "javascript", code: SHARED_ESM },
                { label: "React", language: "tsx", code: SHARED_REACT },
              ]}
            />
          </Section>

          {/* ── API ─────────────────────────────────────────────── */}
          <Section id="api" title="API">
            <H3>Gradient.mount(target, preset, options?)</H3>
            <Muted>Mount a dedicated renderer into one element.</Muted>
            <ParamTable
              rows={[
                ["target", "string | HTMLElement", "CSS selector or element"],
                [
                  "preset",
                  "GradientPreset | string",
                  "Preset object or compact key",
                ],
                [
                  "options.mode",
                  '"animated" | "static" | "hover"',
                  'Default: "animated"',
                ],
                [
                  "options.resolutionScale",
                  "number",
                  "0.5\u20131. Default from preset",
                ],
                ["options.fpsCap", "30 | 60", "Default from preset"],
              ]}
            />
            <Muted>
              Returns <Mono>GradientInstance</Mono>.
            </Muted>

            <Hr />

            <H3>Gradient.mountShared(target, preset, options?)</H3>
            <Muted>Mount one shared renderer across multiple elements.</Muted>
            <ParamTable
              rows={[
                [
                  "target",
                  "string | HTMLElement[] | NodeList",
                  "Selector, elements, or NodeList",
                ],
                [
                  "preset",
                  "GradientPreset | string",
                  "Preset object or compact key",
                ],
                [
                  "options.mode",
                  '"animated" | "static"',
                  'Default: "animated". No hover',
                ],
                [
                  "options.frameTransport",
                  '"auto" | "2d" | "bitmaprenderer"',
                  'Default: "auto"',
                ],
              ]}
            />
            <Muted>
              Returns <Mono>GradientSharedInstance</Mono>.
            </Muted>

            <Hr />

            <H3>{"<GradientMount>"} — React</H3>
            <Muted>
              Wrapper component. No refs or useEffect needed for single mounts.
            </Muted>
            <ParamTable
              rows={[
                [
                  "preset",
                  "GradientPreset | string",
                  "Keep reference stable (constant or useMemo)",
                ],
                [
                  "options",
                  "GradientMountOptions",
                  'Default mode: "hover"',
                ],
                ["className", "string", "Applied to wrapper div"],
                [
                  "children",
                  "ReactNode",
                  "Rendered above the gradient (z-index\u00a01)",
                ],
              ]}
            />

            <Hr />

            <H3>Instance methods</H3>
            <Muted>
              Shared by <Mono>GradientInstance</Mono> and{" "}
              <Mono>GradientSharedInstance</Mono>:
            </Muted>
            <MethodList
              methods={[
                ["updatePreset(preset)", "Swap preset without remounting"],
                ["updateOptions(opts)", "Change mode, resolution, etc."],
                ["pause()", "Pause animation loop"],
                ["resume()", "Resume animation loop"],
                ["resize()", "Force recalculate size"],
                ["renderStill()", "Render single frame"],
                ["destroy()", "Tear down, remove listeners"],
              ]}
            />
            <Muted>
              <Mono>GradientSharedInstance</Mono> also has:
            </Muted>
            <MethodList
              methods={[
                ["rescan()", "Re-query DOM for new matching elements"],
              ]}
            />
          </Section>

          {/* ── Modes ───────────────────────────────────────────── */}
          <Section id="modes" title="Modes">
            <div className="space-y-0 divide-y divide-white/[0.06] border border-white/[0.06] rounded-lg overflow-hidden">
              <ModeRow
                name="animated"
                desc="Continuous loop. Default for mount() and mountShared()."
              />
              <ModeRow
                name="static"
                desc="Renders one frame and stops."
              />
              <ModeRow
                name="hover"
                desc="Animates on hover/focus only. Single mount() only."
              />
            </div>
            <CodeBlock
              code={MODES_EXAMPLE}
              language="javascript"
              className="mt-4"
              height="h-24"
            />
          </Section>

          {/* ── Presets ─────────────────────────────────────────── */}
          <Section id="presets" title="Presets">
            <H3>Readable preset</H3>
            <Muted>Full JSON object. Copy from the generator.</Muted>
            <CodeBlock code={PRESET_OBJECT_EXAMPLE} language="javascript" />

            <Spacer />
            <H3>Compact key</H3>
            <Muted>
              Base64 string. Shorter, good for inline use.
            </Muted>
            <CodeBlock
              code={COMPACT_KEY_EXAMPLE}
              language="javascript"
              height="h-36"
            />
            <Muted>Both formats work anywhere a preset is accepted.</Muted>
          </Section>

          {/* ── Export ───────────────────────────────────────────── */}
          <Section id="export" title="Export from generator">
            <Muted>The generator has four export tabs.</Muted>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <H3>Developer</H3>
                <ul className="text-[#999] text-sm space-y-1.5 mt-2">
                  <li>Copy readable preset (JSON)</li>
                  <li>Copy compact key (string)</li>
                  <li>Download runtime bundle (.js)</li>
                </ul>
              </div>
              <div>
                <H3>Designer (PNG)</H3>
                <ul className="text-[#999] text-sm space-y-1.5 mt-2">
                  <li>Copy to Figma (clipboard PNG)</li>
                  <li>Download PNG — 1920×1080</li>
                  <li>Download PNG — 3840×2160</li>
                  <li>Download PNG — custom size (64–8192 px)</li>
                </ul>
              </div>
              <div>
                <H3>Preset</H3>
                <ul className="text-[#999] text-sm space-y-1.5 mt-2">
                  <li>Copy preset JSON</li>
                  <li>Download preset JSON</li>
                  <li>Import preset JSON</li>
                </ul>
              </div>
              <div>
                <H3>More</H3>
                <ul className="text-[#999] text-sm space-y-1.5 mt-2">
                  <li>Wallpaper Engine export (.zip)</li>
                </ul>
              </div>
            </div>
          </Section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <span className="text-white/30 text-xs">gradient</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/oyaboon/gradient"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white text-xs transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://x.com/oyaboonx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white text-xs transition-colors"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-20 scroll-mt-20">
      <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[15px] font-semibold text-white mt-10 mb-2 tracking-tight">
      {children}
    </h3>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#999] text-sm leading-relaxed mb-4">{children}</p>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="text-[#ccc] bg-white/[0.05] px-1.5 py-0.5 rounded text-xs"
      style={{ fontFamily: "'SF Mono', 'Fira Code', Menlo, Consolas, monospace" }}
    >
      {children}
    </code>
  );
}

function Spacer() {
  return <div className="h-6" />;
}

function Hr() {
  return <div className="border-t border-white/[0.06] my-8" />;
}

function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#111] overflow-hidden h-48 mb-4">
      {children}
    </div>
  );
}

function ParamTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto mb-4 mt-3 rounded-lg border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="text-left py-2.5 px-4 text-[#666] font-medium text-xs">
              Param
            </th>
            <th className="text-left py-2.5 px-4 text-[#666] font-medium text-xs">
              Type
            </th>
            <th className="text-left py-2.5 px-4 text-[#666] font-medium text-xs">
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([param, type, note]) => (
            <tr
              key={param}
              className="border-b border-white/[0.04] last:border-0"
            >
              <td
                className="py-2.5 px-4 text-xs text-[#ccc]"
                style={{ fontFamily: MONO_STACK }}
              >
                {param}
              </td>
              <td
                className="py-2.5 px-4 text-xs text-[#888]"
                style={{ fontFamily: MONO_STACK }}
              >
                {type}
              </td>
              <td className="py-2.5 px-4 text-xs text-[#888]">{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MethodList({ methods }: { methods: [string, string][] }) {
  return (
    <div className="space-y-0 mb-4 mt-3 rounded-lg border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
      {methods.map(([name, desc]) => (
        <div key={name} className="flex items-baseline gap-4 px-4 py-2.5">
          <code
            className="text-[#ccc] text-xs shrink-0 whitespace-nowrap"
            style={{ fontFamily: MONO_STACK }}
          >
            {name}
          </code>
          <span className="text-[#777] text-xs">{desc}</span>
        </div>
      ))}
    </div>
  );
}

function ModeRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-4 px-4 py-3 bg-white/[0.01]">
      <code
        className="text-white text-sm font-medium shrink-0 w-20"
        style={{ fontFamily: MONO_STACK }}
      >
        {name}
      </code>
      <span className="text-[#888] text-sm">{desc}</span>
    </div>
  );
}

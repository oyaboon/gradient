"use client";

import { useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ScrollArea } from "@/components/ui/ScrollArea";

interface CodeTab {
  label: string;
  language: string;
  code: string;
}

interface CodeBlockProps {
  /** Single code block (no tabs). */
  code?: string;
  language?: string;
  /** Multiple tabs — overrides code/language. */
  tabs?: CodeTab[];
  className?: string;
  /** Fixed height for the code area (enables scroll). e.g. "h-72" */
  height?: string;
}

const MONO_FONT = "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace";

const baseStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: "1.6",
  padding: "16px 20px",
  background: "transparent",
};

function HighlightedCode({ code, language }: { code: string; language: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      customStyle={baseStyle}
      codeTagProps={{ style: { fontFamily: MONO_FONT } }}
    >
      {code.trim()}
    </SyntaxHighlighter>
  );
}

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const ok = copyToClipboard(text.trim());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 z-20 px-2 py-1 rounded text-[11px] font-medium bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({ code, language = "typescript", tabs, className = "", height = "h-72" }: CodeBlockProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (tabs && tabs.length > 0) {
    const active = tabs[activeTab] ?? tabs[0];
    return (
      <div className={`group rounded-lg border border-white/10 overflow-hidden bg-[#0d0d0d] ${className}`}>
        <div className="flex gap-0 bg-white/[0.03] border-b border-white/10">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                i === activeTab
                  ? "text-white bg-white/[0.06] border-b border-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <CopyButton text={active.code} />
          <ScrollArea type="scroll" className={height}>
            <HighlightedCode code={active.code} language={active.language} />
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className={`group rounded-lg border border-white/10 overflow-hidden bg-[#0d0d0d] ${className}`}>
      <div className="relative">
        <CopyButton text={code ?? ""} />
        <ScrollArea type="scroll" className={height}>
          <HighlightedCode code={code ?? ""} language={language} />
        </ScrollArea>
      </div>
    </div>
  );
}

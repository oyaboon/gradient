"use client";

export function BottomLine() {
  return (
    <section className="relative z-10 py-10 px-6 border-t border-white/10">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="text-white/50 text-sm">
          Want to wire it up yourself?{" "}
          <a
            href="https://github.com/oyaboon/gradient"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline underline-offset-2 hover:text-white transition-colors"
          >
            It&apos;s open source.
          </a>
        </p>
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
    </section>
  );
}

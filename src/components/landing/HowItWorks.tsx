"use client";

const STEPS = [
  { step: 1, title: "Pick a preset", desc: "Pick one you like or hit random." },
  { step: 2, title: "Customize", desc: "Tweak palette, motion, warp, and post-processing." },
  {
    step: 3,
    title: "Export",
    desc: "Export for code or design.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative z-10 py-24 px-6 border-t border-white/10">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-white mb-12 text-center">
          How it works
        </h2>
        <ol className="space-y-10">
          {STEPS.map((s) => (
            <li key={s.step} className="flex gap-6">
              <span className="font-display text-4xl text-white/40 shrink-0">
                {s.step}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-1 text-white/70 text-sm">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

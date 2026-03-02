"use client";

const FEATURES = [
  { id: "01", title: "INSTANT", desc: "Runs in the browser. No loading spinners, no CDN." },
  { id: "02", title: "SELF-HOSTED", desc: "Export HTML + JS. Host anywhere. No dependency on us." },
  { id: "03", title: "ONE-TIME", desc: "$5 once. No recurring fees, no seat counts." },
  { id: "04", title: "NO BULLSHIT", desc: "Just the generator, presets, and export. Nothing else." },
];

export function Features() {
  return (
    <section className="relative z-10 py-24 px-6 border-t border-white/10">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {FEATURES.map((f) => (
            <div key={f.id} className="flex gap-6">
              <span className="font-display text-2xl text-white/50 shrink-0">
                /{f.id}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-white/70 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

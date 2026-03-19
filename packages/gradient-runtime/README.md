<p align="center">
  <img src="https://gradient.oyaboon.com/og-image.png" alt="gradient" width="800" />
</p>

<h1 align="center">gradient-runtime</h1>

<p align="center">Standalone gradient animation runtime for the browser. Works with vanilla JS, React, Next.js, or any UI (e.g. shadcn/ui).</p>

<p align="center">
  <a href="https://www.npmjs.com/package/gradient-runtime"><img src="https://img.shields.io/npm/v/gradient-runtime.svg" alt="npm version" /></a>
  <a href="https://github.com/oyaboon/gradient/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
</p>

<p align="center">
  <a href="https://gradient.oyaboon.com">Website &amp; generator</a> ·
  <a href="https://gradient.oyaboon.com/docs">Docs</a> ·
  <a href="https://github.com/oyaboon/gradient">GitHub</a> ·
  <a href="https://x.com/oyaboonx">X</a>
</p>

---

## Install

```bash
npm install gradient-runtime
```

**React:** requires `react` as a peer dependency (you already have it in React/Next projects).

---

## Usage

### React (recommended for Next / Vite / CRA)

Use the `<GradientMount>` component — no refs or useEffect. Wrap any content (e.g. a button) to use the gradient as background:

```tsx
import { GradientMount } from "gradient-runtime/react";
import type { GradientPreset } from "gradient-runtime/react";

const preset: GradientPreset = {
  presetVersion: 1,
  engineId: "grain-v1",
  params: {
    uniform_seed: 42,
    uniform_palette_colors_hex: ["#0a0a12", "#1a1a2e", "#2563eb", "#f97316"],
    uniform_motion_speed: 0.6,
    uniform_flow_rotation_radians: 0.9,
    uniform_flow_drift_speed_x: 0,
    uniform_flow_drift_speed_y: 0,
    uniform_warp_strength: 0.5,
    uniform_warp_scale: 2.2,
    uniform_turbulence: 0.4,
    uniform_brightness: 1.05,
    uniform_contrast: 1.12,
    uniform_saturation: 1.2,
    uniform_grain_amount: 0.12,
    uniform_grain_size: 1.3,
    uniform_reduce_motion_enabled: 0,
  },
};

// In your component — e.g. with shadcn Button
<GradientMount preset={preset} options={{ mode: "hover" }} className="rounded-lg">
  <Button variant="primary" className="relative z-10 bg-transparent">
    Withdraw ETH
  </Button>
</GradientMount>
```

Define the preset once (constant or `useMemo`) so the reference is stable. `options.mode`: `"animated"` (always on), `"static"` (one frame), `"hover"` (animate on hover, default for the component).

---

### ESM (vanilla / bundlers)

```js
import { Gradient, mountGradient, mountSharedGradient } from "gradient-runtime";
```

### Global script (IIFE)

```html
<script src="node_modules/gradient-runtime/dist/gradient-runtime.global.js"></script>
<script>
  window.Gradient.mount("#target", preset, options);
</script>
```

---

## Links

| Resource | URL |
|----------|-----|
| Generator | [gradient.oyaboon.com](https://gradient.oyaboon.com) |
| Documentation | [gradient.oyaboon.com/docs](https://gradient.oyaboon.com/docs) |
| Source (monorepo) | [github.com/oyaboon/gradient](https://github.com/oyaboon/gradient) |
| Issues | [github.com/oyaboon/gradient/issues](https://github.com/oyaboon/gradient/issues) |
| X | [@oyaboonx](https://x.com/oyaboonx) |

## License

MIT — see [LICENSE](https://github.com/oyaboon/gradient/blob/main/LICENSE).

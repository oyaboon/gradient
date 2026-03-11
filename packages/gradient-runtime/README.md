# gradient-runtime

Standalone gradient animation runtime for the browser.

## Install

```bash
npm install gradient-runtime
```

## Usage

**ESM (bundlers / type="module"):**

```js
import { Gradient, mountGradient, mountSharedGradient } from "gradient-runtime";
```

**Global script (IIFE):**

```html
<script src="node_modules/gradient-runtime/dist/gradient-runtime.global.js"></script>
<script>
  window.Gradient.mount("#target", preset, options);
</script>
```

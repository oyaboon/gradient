import { Gradient } from "../engine/gradient-runtime";

declare global {
  interface Window {
    Gradient: typeof Gradient;
  }
}

if (typeof window !== "undefined") {
  window.Gradient = Gradient;
}

export { Gradient };

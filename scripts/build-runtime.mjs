import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "public", "runtime");
const srcDir = path.join(rootDir, "src");

const alias = { "@": srcDir };

async function buildRuntimeArtifacts() {
  await mkdir(outDir, { recursive: true });

  await Promise.all([
    build({
      entryPoints: [path.join(rootDir, "src", "builds", "global.ts")],
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "es2018",
      outfile: path.join(outDir, "gradient-runtime.global.js"),
      sourcemap: false,
      minify: false,
      legalComments: "none",
      logLevel: "info",
      tsconfig: path.join(rootDir, "tsconfig.json"),
      alias,
    }),
    build({
      entryPoints: [path.join(rootDir, "src", "builds", "esm.ts")],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2018",
      outfile: path.join(outDir, "gradient-runtime.esm.js"),
      sourcemap: false,
      minify: false,
      legalComments: "none",
      logLevel: "info",
      tsconfig: path.join(rootDir, "tsconfig.json"),
      alias,
    }),
    build({
      entryPoints: [path.join(rootDir, "src", "builds", "react.tsx")],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2018",
      outfile: path.join(outDir, "gradient-runtime.react.js"),
      sourcemap: false,
      minify: false,
      legalComments: "none",
      logLevel: "info",
      tsconfig: path.join(rootDir, "tsconfig.json"),
      alias,
      jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime"],
    }),
    copyFile(
      path.join(rootDir, "src", "builds", "index.d.ts"),
      path.join(outDir, "index.d.ts")
    ),
    copyFile(
      path.join(rootDir, "src", "builds", "react.d.ts"),
      path.join(outDir, "react.d.ts")
    ),
  ]);
}

buildRuntimeArtifacts().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

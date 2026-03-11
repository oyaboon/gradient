import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const from = path.join(rootDir, "public", "runtime");
const to = path.join(__dirname, "dist");

mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });

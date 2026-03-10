import { promises as fs } from "node:fs";
import path from "node:path";
import {
  RUNTIME_ESM_FILENAME,
  RUNTIME_GLOBAL_FILENAME,
  RUNTIME_PUBLIC_DIRECTORY,
  RUNTIME_TYPES_FILENAME,
} from "./runtime-artifacts";

function getRuntimeArtifactPath(filename: string): string {
  return path.join(process.cwd(), "public", RUNTIME_PUBLIC_DIRECTORY, filename);
}

export async function readRuntimeGlobalArtifact(): Promise<string> {
  return fs.readFile(getRuntimeArtifactPath(RUNTIME_GLOBAL_FILENAME), "utf8");
}

export async function readRuntimeEsmArtifact(): Promise<string> {
  return fs.readFile(getRuntimeArtifactPath(RUNTIME_ESM_FILENAME), "utf8");
}

export async function readRuntimeTypesArtifact(): Promise<string> {
  return fs.readFile(getRuntimeArtifactPath(RUNTIME_TYPES_FILENAME), "utf8");
}

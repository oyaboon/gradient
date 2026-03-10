import {
  RUNTIME_GLOBAL_FILENAME as RUNTIME_FILENAME,
  RUNTIME_GLOBAL_PUBLIC_PATH,
} from "@/runtime/runtime-artifacts";

/**
 * Fetch the built browser runtime artifact that is produced from the shared core.
 * ZIP exports use the same file the download endpoint serves.
 */
export async function fetchRuntimeJavascript(): Promise<string> {
  const response = await fetch(RUNTIME_GLOBAL_PUBLIC_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load runtime artifact.");
  }

  return response.text();
}

export { RUNTIME_FILENAME };

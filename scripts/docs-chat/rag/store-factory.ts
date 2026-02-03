/**
 * Factory for docs-chat vector store.
 * Auto-selects Upstash (cloud) or LanceDB (local) based on environment.
 *
 * Priority:
 * 1. If UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are set → Upstash
 * 2. Otherwise → LanceDB (local file-based store)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

// Common interfaces shared by both stores
export interface DocsChunk {
  id: string;
  path: string;
  title: string;
  content: string;
  url: string;
  vector: number[];
}

export interface SearchResult {
  chunk: DocsChunk;
  distance: number;
  similarity: number;
}

export interface IDocsStore {
  replaceAll(chunks: DocsChunk[]): Promise<void>;
  search(vector: number[], limit?: number): Promise<SearchResult[]>;
  count(): Promise<number>;
}

export type StoreMode = "upstash" | "lancedb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LANCEDB_PATH = path.resolve(__dirname, "../.lancedb");
const VECTOR_DIM = 3072; // text-embedding-3-large

/**
 * Detect which store backend to use based on environment.
 */
export function detectStoreMode(): StoreMode {
  const hasUpstash =
    process.env.UPSTASH_VECTOR_REST_URL &&
    process.env.UPSTASH_VECTOR_REST_TOKEN;
  return hasUpstash ? "upstash" : "lancedb";
}

/**
 * Create the appropriate store based on environment.
 * Returns the store instance and which mode was selected.
 */
export async function createStore(
  mode?: StoreMode,
  lancedbPath?: string,
): Promise<{ store: IDocsStore; mode: StoreMode }> {
  const selectedMode = mode ?? detectStoreMode();

  if (selectedMode === "upstash") {
    const { DocsStore } = await import("./store-upstash.js");
    return { store: new DocsStore(), mode: "upstash" };
  }

  // LanceDB (local)
  const { DocsStore } = await import("./store.js");
  const dbPath = lancedbPath ?? DEFAULT_LANCEDB_PATH;
  return { store: new DocsStore(dbPath, VECTOR_DIM), mode: "lancedb" };
}

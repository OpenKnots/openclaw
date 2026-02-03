/**
 * LanceDB storage layer for docs-chat RAG pipeline.
 * Stores document chunks with vector embeddings for semantic search.
 */
import * as lancedb from "@lancedb/lancedb";

const TABLE_NAME = "docs_chunks";
/** LanceDB uses L2 (Euclidean) distance by default; similarity conversion below assumes this. */
const _DISTANCE_METRIC = "L2" as const;

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

export class DocsStore {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly dbPath: string,
    private readonly vectorDim: number,
  ) { }

  private async ensureInitialized(): Promise<void> {
    if (this.table) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.db = await lancedb.connect(this.dbPath);
    const tables = await this.db.tableNames();

    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    }
    // Table will be created when first storing chunks
  }

  /**
   * Drop existing table and create fresh with new chunks.
   * Used during index rebuild.
   */
  async replaceAll(chunks: DocsChunk[]): Promise<void> {
    if (!this.db) {
      this.db = await lancedb.connect(this.dbPath);
    }

    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      await this.db.dropTable(TABLE_NAME);
    }

    if (chunks.length === 0) {
      // Create empty table with schema
      this.table = await this.db.createTable(TABLE_NAME, [
        {
          id: "__schema__",
          path: "",
          title: "",
          content: "",
          url: "",
          vector: Array.from({ length: this.vectorDim }).fill(0),
        },
      ]);
      await this.table.delete('id = "__schema__"');
      return;
    }

    this.table = await this.db.createTable(TABLE_NAME, chunks.map(chunk => ({
      id: chunk.id,
      path: chunk.path,
      title: chunk.title,
      content: chunk.content,
      url: chunk.url,
      vector: chunk.vector,
    })));
  }

  /**
   * Search for similar chunks using vector similarity.
   */
  async search(vector: number[], limit: number = 8): Promise<SearchResult[]> {
    await this.ensureInitialized();

    if (!this.table) {
      return [];
    }

    const results = await this.table.vectorSearch(vector).limit(limit).toArray();

    // Convert L2 distance to similarity: sim = 1 / (1 + d), bounded [0, 1].
    // This assumes DISTANCE_METRIC is L2 (non-negative). If metric changes,
    // update this conversion or use raw distance for ranking.
    return results.map((row) => {
      const distance = (row._distance as number) ?? 0;
      const similarity = 1 / (1 + distance);
      return {
        chunk: {
          id: row.id as string,
          path: row.path as string,
          title: row.title as string,
          content: row.content as string,
          url: row.url as string,
          vector: row.vector as number[],
        },
        distance,
        similarity,
      };
    });
  }

  /**
   * Get count of stored chunks.
   */
  async count(): Promise<number> {
    await this.ensureInitialized();
    if (!this.table) {
      return 0;
    }
    return this.table.countRows();
  }
}

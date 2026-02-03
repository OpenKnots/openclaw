# Docs Chat

Docs chatbot that uses RAG (Retrieval-Augmented Generation) to answer questions
from the OpenClaw documentation via semantic search.

## Architecture

```
docs/**/*.md
    │
    ▼
┌─────────────────┐
│ build-vector-   │  Chunking + OpenAI Embeddings
│ index.ts        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector Store    │  Upstash (cloud) or LanceDB (local)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Server      │  Hybrid Retrieval (Vector + Keyword Boost)
│ serve.ts        │  → GPT-4o-mini Streaming Response
└─────────────────┘
```

## Storage Backends

The pipeline supports two vector storage backends, auto-detected based on
environment variables:

| Backend     | When Used                                     | Best For                  |
| ----------- | --------------------------------------------- | ------------------------- |
| **LanceDB** | Default (no Upstash credentials)              | Local dev, POC, testing   |
| **Upstash** | When `UPSTASH_VECTOR_REST_*` env vars are set | Production, Vercel deploy |

**Recommendation:** For production deployments, use Upstash Vector for its
serverless scalability and Vercel compatibility. LanceDB is great for local
development and proof-of-concept work without external dependencies.

## Quick Start (Local with LanceDB)

For local development without external services:

```bash
# Only OPENAI_API_KEY is required - uses LanceDB automatically
OPENAI_API_KEY=sk-... pnpm docs:chat:index:vector
OPENAI_API_KEY=sk-... pnpm docs:chat:serve:vector
```

The index is stored locally in `scripts/docs-chat/.lancedb/`.

## Production Setup (Upstash Vector)

### 1. Create Upstash Vector Index

**Go to [Upstash Console](https://console.upstash.com/) and create a new Vector index with these settings**:

```
| Setting                   | Value  | Why                                           |
| ------------------------- | ------ | --------------------------------------------- |
| **Index Type**            | DENSE  | We generate embeddings externally with OpenAI |
| **Dense Embedding Model** | None   | We provide pre-computed vectors from OpenAI   |
| **Dimensions**            | 3072   | Matches `text-embedding-3-large` output       |
| **Similarity Metric**     | Cosine | Standard for semantic similarity              |
```

> **Important:** Select "None" for the embedding model. If you select a BGE model,
> Upstash will expect raw text and generate embeddings itself, which conflicts
> with our architecture that uses OpenAI's `text-embedding-3-large`.

### 2. Copy `REST URL` and token from the index details page

### 3. Setup Environment

```md
| Variable                    | Required | Description                          |
| --------------------------- | -------- | ------------------------------------ |
| `OPENAI_API_KEY`            | Yes      | OpenAI API key for embeddings + chat |
| `UPSTASH_VECTOR_REST_URL`   | No\*     | Upstash Vector REST endpoint         |
| `UPSTASH_VECTOR_REST_TOKEN` | No\*     | Upstash Vector REST token            |
```

> _\* Required for Upstash mode; omit both for LanceDB mode._

### 4. Build Vector Index

```bash
OPENAI_API_KEY=sk-... \
UPSTASH_VECTOR_REST_URL=https://... \
UPSTASH_VECTOR_REST_TOKEN=... \
pnpm docs:chat:index:vector
```

> _This generates embeddings for all doc chunks and upserts them to Upstash Vector._

### 5. Deploy to Vercel

```bash
cd scripts/docs-chat
npm install
vercel
```

> _Set the environment variables in the Vercel dashboard._

## Local Development

### Run the API locally

```bash
# With Upstash (cloud):
OPENAI_API_KEY=sk-... \
UPSTASH_VECTOR_REST_URL=https://... \
UPSTASH_VECTOR_REST_TOKEN=... \
pnpm docs:chat:serve:vector

# With LanceDB (local):
OPENAI_API_KEY=sk-... pnpm docs:chat:serve:vector
```

> _Defaults to `http://localhost:3001`_

**Optional environment variables**:

| Variable          | Default | Description                                                      |
| ----------------- | ------- | ---------------------------------------------------------------- |
| `PORT`            | `3001`  | Server port                                                      |
| `RATE_LIMIT`      | `20`    | Max requests per window per IP (Upstash only)                    |
| `RATE_WINDOW_MS`  | `60000` | Rate limit window in milliseconds (Upstash only)                 |
| `TRUST_PROXY`     | `0`     | Set to `1` to trust `X-Forwarded-For` (behind a reverse proxy)   |
| `ALLOWED_ORIGINS` | (none)  | Comma-separated allowed origins for CORS (e.g. `https://docs.openclaw.ai,http://localhost:3000`). Use `*` for any (local dev only) |

> **Note:** Rate limiting is only enforced in Upstash (production) mode. Local
> development with LanceDB has no rate limits.

### Health Check

```bash
curl http://localhost:3001/health
# Returns: {"ok":true,"chunks":N,"mode":"upstash"}  # or "lancedb"
```

## Mintlify Widget

Mintlify loads `.js` files from the docs content directory on every page.

- `docs/assets/docs-chat-config.js` - Sets the API URL
- `docs/assets/docs-chat-widget.js` - The chat widget

To configure the production API URL, edit `docs/assets/docs-chat-config.js`:

```javascript
window.DOCS_CHAT_API_URL = "https://your-project.vercel.app";
```

## API Endpoints

### `POST /chat`

- Send a message and receive a streaming response.

#### **Request**

```json
{ "message": "How do I configure the gateway?" }
```

#### **Response:**

- Streaming `text/plain` with the AI response.

### `GET /health`

Check API health and vector count.

#### **Response:**

```json
{ "ok": true, "chunks": 847, "mode": "upstash-vector" }
```

## Legacy Pipelines

### Keyword-Based Search

**The keyword-based implementation is still available for backward compatibility**:

```bash
pnpm docs:chat:index    # Build keyword index
pnpm docs:chat:serve    # Run keyword API
```

## File Structure

```
scripts/docs-chat/
├── api/
│   ├── chat.ts              # Vercel serverless function for chat
│   └── health.ts            # Vercel serverless function for health check
├── rag/
│   ├── embeddings.ts        # OpenAI embeddings wrapper
│   ├── retriever-factory.ts # Unified retriever (works with any store)
│   ├── retriever-upstash.ts # Legacy Upstash-specific retriever
│   ├── retriever.ts         # Legacy LanceDB retriever
│   ├── store-factory.ts     # Auto-selects Upstash or LanceDB
│   ├── store-upstash.ts     # Upstash Vector store
│   └── store.ts             # LanceDB store (local)
├── build-vector-index.ts    # Index builder script
├── serve.ts                 # Local dev server
├── package.json             # Standalone package for Vercel
├── tsconfig.json            # TypeScript config
├── vercel.json              # Vercel deployment config
└── README.md
```

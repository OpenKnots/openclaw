#!/usr/bin/env bun
/**
 * Docs-chat API with RAG (vector search).
 * Auto-detects Upstash Vector (cloud) or LanceDB (local) based on environment.
 *
 * Env: OPENAI_API_KEY (required)
 *      UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN (optional, for cloud)
 *      PORT, RATE_LIMIT, RATE_WINDOW_MS
 */
import http from "node:http";
import { Embeddings } from "./rag/embeddings.js";
import { createStore, type IDocsStore, type StoreMode } from "./rag/store-factory.js";
import { Retriever } from "./rag/retriever-factory.js";

const port = Number(process.env.PORT || 3001);

// Rate limiting configuration
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 20); // requests per window
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000); // 1 minute
const TRUST_PROXY = process.env.TRUST_PROXY === "1"; // only trust X-Forwarded-For behind a proxy
// CORS: comma-separated allowed origins, or "*" for any (local dev only)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
const MAX_MESSAGE_LENGTH = 2000; // characters
const MAX_BODY_SIZE = 8192; // bytes

// In-memory rate limit store (IP -> { count, resetAt })
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_WINDOW_MS);

/**
 * Check if an IP is rate limited. Returns remaining requests or -1 if blocked.
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetAt: record.resetAt };
}

/**
 * Extract client IP from request. Only trusts proxy headers when TRUST_PROXY=1.
 */
function getClientIP(req: http.IncomingMessage): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string") {
      return realIp.trim();
    }
  }
  return req.socket.remoteAddress || "unknown";
}

// Validate API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

// RAG components (initialized async before server starts)
let store: IDocsStore;
let storeMode: StoreMode;
let retriever: Retriever;
const embeddings = new Embeddings(apiKey);

/**
 * Build CORS headers for a request. Only allows origins in ALLOWED_ORIGINS.
 */
function getCorsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers.origin;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown>,
  req: http.IncomingMessage,
) {
  res.writeHead(status, { ...getCorsHeaders(req), "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function streamOpenAI(
  systemPrompt: string,
  userMessage: string,
  onToken: (token: string) => void,
) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errorText}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onToken(delta);
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }
}

async function handleChat(req: http.IncomingMessage, res: http.ServerResponse) {
  // Read body with size limit to prevent memory exhaustion
  let body = "";
  let bodySize = 0;
  for await (const chunk of req) {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      sendJson(res, 413, { error: "Request too large" }, req);
      return;
    }
    body += chunk;
  }

  let message = "";
  try {
    message = JSON.parse(body || "{}").message;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" }, req);
    return;
  }

  if (!message || typeof message !== "string") {
    sendJson(res, 400, { error: "message required" }, req);
    return;
  }

  // Validate message length to prevent token stuffing
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    sendJson(res, 400, { error: "message required" }, req);
    return;
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    sendJson(res, 400, {
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    }, req);
    return;
  }
  message = trimmedMessage;

  // Use RAG retriever instead of keyword matching
  const results = await retriever.retrieve(message, 8);

  if (results.length === 0) {
    res.writeHead(200, {
      ...getCorsHeaders(req),
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end(
      "I couldn't find relevant documentation excerpts for that question. Try rephrasing or search the docs.",
    );
    return;
  }

  // Build context from retrieved chunks
  const context = results
    .map(
      (result) =>
        `[${result.chunk.title}](${result.chunk.url})\n${result.chunk.content.slice(0, 1200)}`,
    )
    .join("\n\n---\n\n");

  const systemPrompt =
    "You are a helpful assistant for OpenClaw documentation. " +
    "Answer only from the provided documentation excerpts. " +
    "If the answer is not in the excerpts, say so and suggest checking the docs. " +
    "Cite sources by name or URL when relevant.\n\nDocumentation excerpts:\n" +
    context;

  res.writeHead(200, {
    ...getCorsHeaders(req),
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
  });

  try {
    await streamOpenAI(systemPrompt, message, (token) => {
      res.write(token);
    });
    res.end();
  } catch (err) {
    console.error(err);
    res.end("\n\n[Error contacting OpenAI]");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, getCorsHeaders(req));
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    const count = await store.count();
    sendJson(res, 200, { ok: true, chunks: count, mode: storeMode }, req);
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    // Only apply rate limiting in production (Upstash) mode
    if (storeMode === "upstash") {
      const clientIP = getClientIP(req);
      const rateCheck = checkRateLimit(clientIP);

      res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, rateCheck.remaining));
      res.setHeader("X-RateLimit-Reset", Math.ceil(rateCheck.resetAt / 1000));

      if (!rateCheck.allowed) {
        const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
        res.setHeader("Retry-After", retryAfter);
        sendJson(res, 429, {
          error: "Too many requests. Please wait before trying again.",
          retryAfter,
        }, req);
        return;
      }
    }

    await handleChat(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" }, req);
});

// Initialize store and start server
async function main() {
  const result = await createStore();
  store = result.store;
  storeMode = result.mode;
  retriever = new Retriever(store, embeddings);

  server.listen(port, async () => {
    const count = await store.count();
    const modeName = storeMode === "upstash" ? "Upstash Vector" : "LanceDB (local)";
    console.error(
      `docs-chat API (${modeName}) running at http://localhost:${port} (chunks: ${count})`,
    );
    if (storeMode === "upstash") {
      console.error(
        `Rate limit: ${RATE_LIMIT} requests per ${RATE_WINDOW_MS / 1000}s window`,
      );
    }
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

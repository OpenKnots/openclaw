#!/usr/bin/env node
/**
 * Minimal docs-chat API.
 * Env: OPENAI_API_KEY, DOCS_CHAT_INDEX, PORT
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultIndex = path.join(__dirname, "search-index.json");
const indexPath = process.env.DOCS_CHAT_INDEX || defaultIndex;
const port = Number(process.env.PORT || 3001);

let index = null;

function loadIndex() {
  if (index) return index;
  if (!fs.existsSync(indexPath)) {
    console.error(
      `Missing index at ${indexPath}. Run: node scripts/docs-chat/build-index.mjs --out ${defaultIndex}`
    );
    process.exit(1);
  }
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  return index;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, status, body) {
  res.writeHead(status, { ...corsHeaders, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function scoreChunk(query, chunk) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${chunk.title} ${chunk.content}`.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (word.length < 2) continue;
    if (text.includes(word)) score += 1;
  }
  return score;
}

function retrieve(query, limit = 8) {
  const { chunks } = loadIndex();
  const scored = chunks.map((chunk) => ({
    chunk,
    score: scoreChunk(query, chunk),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.chunk);
}

async function streamOpenAI(systemPrompt, userMessage, onToken) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for /chat");

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
  for await (const chunk of res.body) {
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

async function handleChat(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  let message = "";
  try {
    message = JSON.parse(body || "{}").message;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }
  if (!message || typeof message !== "string") {
    sendJson(res, 400, { error: "message required" });
    return;
  }

  const chunks = retrieve(message);
  if (chunks.length === 0) {
    res.writeHead(200, {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end(
      "I couldn't find relevant documentation excerpts for that question. Try rephrasing or search the docs."
    );
    return;
  }

  const context = chunks
    .map(
      (chunk) =>
        `[${chunk.title}](${chunk.url})\n${chunk.content.slice(0, 1200)}`
    )
    .join("\n\n---\n\n");

  const systemPrompt =
    "You are a helpful assistant for OpenClaw documentation. " +
    "Answer only from the provided documentation excerpts. " +
    "If the answer is not in the excerpts, say so and suggest checking the docs. " +
    "Cite sources by name or URL when relevant.\n\nDocumentation excerpts:\n" +
    context;

  res.writeHead(200, {
    ...corsHeaders,
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
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    loadIndex();
    sendJson(res, 200, { ok: true, chunks: index.chunks.length });
    return;
  }
  if (req.method === "POST" && req.url === "/chat") {
    await handleChat(req, res);
    return;
  }
  sendJson(res, 404, { error: "Not found" });
});

server.listen(port, () => {
  loadIndex();
  console.error(
    `docs-chat API running at http://localhost:${port} (chunks: ${index.chunks.length})`
  );
});

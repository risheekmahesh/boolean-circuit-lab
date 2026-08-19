import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "64kb" }));

  app.post("/api/assistant", async (req, res) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const page = typeof req.body?.page === "string" ? req.body.page : "Boolean Circuit Lab analyzer";
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
    const apiKey = process.env.ASSISTANT_API_KEY || process.env.OPENAI_API_KEY;
    const apiBase = (process.env.ASSISTANT_API_BASE || process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.ASSISTANT_MODEL || "gpt-5-mini";

    if (!question) return res.status(400).json({ error: "Please enter a question for the assistant." });
    if (!apiKey) return res.status(503).json({ error: "The assistant is not configured yet. Add ASSISTANT_API_KEY to the server environment." });

    try {
      const upstream = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: 700,
          messages: [
            { role: "system", content: "You are the Boolean Circuit Lab assistant. Explain digital logic accurately and plainly. Use the current page context. When explaining a circuit, name its inputs, intermediate signals, gate behavior, and outputs. If the user asks about a Boolean function, show concise reasoning and do not invent values that were not provided. Format answers with short paragraphs or markdown bullets." },
            { role: "system", content: `Current page context: ${page}` },
            ...history.filter((item: unknown): item is { role: "user" | "assistant"; content: string } => Boolean(item && typeof item === "object" && "role" in item && "content" in item && ((item as { role: string }).role === "user" || (item as { role: string }).role === "assistant") && typeof (item as { content: unknown }).content === "string")),
            { role: "user", content: question },
          ],
        }),
      });
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(502).json({ error: payload?.error?.message || "The assistant provider returned an error." });
      const answer = payload?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "The assistant provider returned an empty answer." });
      return res.json({ answer: answer.trim() });
    } catch (error) {
      console.error("[Assistant] Request failed:", error);
      return res.status(502).json({ error: "The assistant is temporarily unavailable." });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

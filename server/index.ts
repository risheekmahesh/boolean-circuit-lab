import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { askAssistant } from "./assistantProvider";

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

    if (!question) return res.status(400).json({ error: "Please enter a question for the assistant." });

    try {
      const answer = await askAssistant({ question, page, history });
      return res.json({ answer });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant is temporarily unavailable.";
      console.error("[Assistant] Request failed:", message);
      const status = message.includes("not configured") ? 503 : 502;
      return res.status(status).json({ error: message });
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

import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { askAssistant } from "./assistantProvider";
import { extractProblemText } from "./problemExtractor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "5mb" }));

  app.post("/api/problem-extract", async (req, res) => {
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim().slice(0, 180) : "uploaded-problem";
    const mimeType = req.body?.mimeType === "application/pdf" || req.body?.mimeType === "image/png" || req.body?.mimeType === "image/jpeg" ? req.body.mimeType : "";
    const data = typeof req.body?.data === "string" ? req.body.data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "") : "";
    if (!mimeType) return res.status(400).json({ error: "Only PDF, PNG, and JPEG files can be extracted." });
    if (!data) return res.status(400).json({ error: "The uploaded file did not contain readable data." });
    if (Math.floor((data.length * 3) / 4) > 3_000_000) return res.status(413).json({ error: "Please upload a file smaller than 3 MB for extraction." });
    try {
      const text = await extractProblemText({ fileName, mimeType, data });
      return res.json({ text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The uploaded problem could not be extracted.";
      console.error("[Problem Extractor] Request failed:", message);
      return res.status(message.includes("not configured") ? 503 : 502).json({ error: message });
    }
  });

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

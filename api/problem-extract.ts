type ExtractionBody = {
  fileName?: unknown;
  mimeType?: unknown;
  data?: unknown;
};

type VercelRequestLike = { method?: string; body?: unknown };
type VercelResponseLike = { status: (code: number) => VercelResponseLike; json: (payload: unknown) => void };

const EXTRACTION_PROMPT = "You are a digital-circuit problem transcription assistant. Read the uploaded PDF or image and transcribe the problem statement accurately. Preserve Boolean notation, subscripts, complements, minterm lists, truth-table values, and circuit labels. Return only the extracted problem text, with no preamble, guesses, or solution.";
const MAX_FILE_BYTES = 3_000_000;

function readBody(value: unknown): ExtractionBody {
  if (typeof value === "string") {
    try { return JSON.parse(value) as ExtractionBody; } catch { return {}; }
  }
  return value && typeof value === "object" ? value as ExtractionBody : {};
}

function normalizedGeminiModel(value: string) {
  const model = value.trim().replace(/^models\//, "");
  return model || "gemini-3.6-flash";
}

function decodedByteLength(base64: string) {
  return Math.floor((base64.replace(/\s/g, "").length * 3) / 4);
}

async function extractProblemText(fileName: string, mimeType: "application/pdf" | "image/png" | "image/jpeg", data: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The problem extractor is not configured yet. Add GEMINI_API_KEY to the server environment.");
  const explicitGoogleBase = process.env.ASSISTANT_GOOGLE_API_BASE;
  const configuredBase = process.env.ASSISTANT_API_BASE;
  const apiBase = (explicitGoogleBase || (configuredBase?.includes("generativelanguage.googleapis.com") ? configuredBase : "https://generativelanguage.googleapis.com/v1beta")).replace(/\/$/, "");
  const model = normalizedGeminiModel(process.env.ASSISTANT_MODEL || "gemini-3.6-flash");
  const upstream = await fetch(`${apiBase}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${EXTRACTION_PROMPT}\n\nFilename: ${fileName}` }, { inline_data: { mime_type: mimeType, data } }] }],
      generationConfig: { maxOutputTokens: 1600, temperature: 0.1 },
    }),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(payload?.error?.message || `Gemini extraction failed with HTTP ${upstream.status}.`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini could not find readable problem text in that file.");
  return text;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST /api/problem-extract." });
  const body = readBody(req.body);
  const fileName = typeof body.fileName === "string" ? body.fileName.trim().slice(0, 180) : "uploaded-problem";
  const mimeType = body.mimeType === "application/pdf" || body.mimeType === "image/png" || body.mimeType === "image/jpeg" ? body.mimeType : "";
  const data = typeof body.data === "string" ? body.data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "") : "";
  if (!mimeType) return res.status(400).json({ error: "Only PDF, PNG, and JPEG files can be extracted." });
  if (!data) return res.status(400).json({ error: "The uploaded file did not contain readable data." });
  if (decodedByteLength(data) > MAX_FILE_BYTES) return res.status(413).json({ error: "Please upload a file smaller than 3 MB for extraction." });

  try {
    const text = await extractProblemText(fileName, mimeType, data);
    return res.status(200).json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The uploaded problem could not be extracted.";
    console.error("[Problem Extractor] Vercel request failed:", message);
    return res.status(message.includes("not configured") ? 503 : 502).json({ error: message });
  }
}

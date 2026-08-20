export type ProblemExtractionRequest = {
  fileName: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  data: string;
};

const EXTRACTION_PROMPT = "You are a digital-circuit problem transcription assistant. Read the uploaded PDF or image and transcribe the problem statement accurately. Preserve Boolean notation, subscripts, complements, minterm lists, truth-table values, and circuit labels. Return only the extracted problem text, with no preamble, guesses, or solution.";

function normalizedGeminiModel(value: string) {
  const model = value.trim().replace(/^models\//, "");
  return model || "gemini-3.6-flash";
}

export async function extractProblemText(request: ProblemExtractionRequest) {
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
      contents: [{ role: "user", parts: [{ text: `${EXTRACTION_PROMPT}\n\nFilename: ${request.fileName}` }, { inline_data: { mime_type: request.mimeType, data: request.data } }] }],
      generationConfig: { maxOutputTokens: 1600, temperature: 0.1 },
    }),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(payload?.error?.message || `Gemini extraction failed with HTTP ${upstream.status}.`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini could not find readable problem text in that file.");
  return text;
}

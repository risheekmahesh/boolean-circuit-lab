type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type AssistantRequest = {
  question: string;
  page: string;
  history: ChatTurn[];
};

type RequestBody = Partial<AssistantRequest>;

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
};

const SYSTEM_PROMPT = "You are the Boolean Circuit Lab assistant. Explain digital logic accurately and plainly. Use the current page context. When explaining a circuit, name its inputs, intermediate signals, gate behavior, and outputs. If the user asks about a Boolean function, show concise reasoning and do not invent values that were not provided. Format answers with short paragraphs or markdown bullets.";

function readBody(value: unknown): RequestBody {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as RequestBody;
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value as RequestBody : {};
}

function safeHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ChatTurn => Boolean(
    entry &&
    typeof entry === "object" &&
    "role" in entry &&
    "content" in entry &&
    (((entry as { role?: unknown }).role === "user") || ((entry as { role?: unknown }).role === "assistant")) &&
    typeof (entry as { content?: unknown }).content === "string",
  )).filter((turn) => turn.content.trim()).slice(-6);
}

async function askOpenAICompatible(request: AssistantRequest, apiKey: string) {
  const apiBase = (process.env.ASSISTANT_API_BASE || process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.ASSISTANT_MODEL || "gpt-5-mini";
  const upstream = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_completion_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `Current page context: ${request.page}` },
        ...request.history,
        { role: "user", content: request.question },
      ],
    }),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(payload?.error?.message || `Provider request failed with HTTP ${upstream.status}.`);
  const answer = payload?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) throw new Error("The provider returned an empty answer.");
  return answer.trim();
}

async function askGoogle(request: AssistantRequest, apiKey: string) {
  const explicitGoogleBase = process.env.ASSISTANT_GOOGLE_API_BASE;
  const configuredBase = process.env.ASSISTANT_API_BASE;
  const apiBase = (explicitGoogleBase || (configuredBase?.includes("generativelanguage.googleapis.com") ? configuredBase : "https://generativelanguage.googleapis.com/v1beta")).replace(/\/$/, "");
  const model = process.env.ASSISTANT_MODEL || "gemini-2.0-flash";
  const contents = [
    { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nCurrent page context: ${request.page}` }] },
    ...request.history.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })),
    { role: "user", parts: [{ text: request.question }] },
  ];
  const upstream = await fetch(`${apiBase}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 700, temperature: 0.2 } }),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(payload?.error?.message || `Google provider request failed with HTTP ${upstream.status}.`);
  const answer = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!answer) throw new Error("The provider returned an empty answer.");
  return answer;
}

async function askAssistant(request: AssistantRequest) {
  const apiKey = process.env.ASSISTANT_API_KEY || process.env.OPENAI_API_KEY;
  const provider = (process.env.ASSISTANT_PROVIDER || "openai").toLowerCase();
  if (!apiKey) throw new Error("The assistant is not configured yet. Add ASSISTANT_API_KEY to the server environment.");
  return provider === "google" || provider === "gemini" ? askGoogle(request, apiKey) : askOpenAICompatible(request, apiKey);
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST /api/assistant." });

  const body = readBody(req.body);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const page = typeof body.page === "string" ? body.page : "Boolean Circuit Lab analyzer";
  if (!question) return res.status(400).json({ error: "Please enter a question for the assistant." });

  try {
    const answer = await askAssistant({ question, page, history: safeHistory(body.history) });
    return res.status(200).json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The assistant is temporarily unavailable.";
    console.error("[Assistant] Vercel request failed:", message);
    return res.status(message.includes("not configured") ? 503 : 502).json({ error: message });
  }
}

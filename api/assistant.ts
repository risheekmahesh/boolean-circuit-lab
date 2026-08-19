import { askAssistant, type AssistantRequest } from "../server/assistantProvider";

type RequestBody = Partial<AssistantRequest>;

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
};

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

function safeHistory(value: unknown): AssistantRequest["history"] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is AssistantRequest["history"][number] => Boolean(
    entry &&
    typeof entry === "object" &&
    "role" in entry &&
    "content" in entry &&
    (((entry as { role?: unknown }).role === "user") || ((entry as { role?: unknown }).role === "assistant")) &&
    typeof (entry as { content?: unknown }).content === "string",
  )).slice(-6);
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

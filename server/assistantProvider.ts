type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantRequest = {
  question: string;
  page: string;
  history: ChatTurn[];
};

const SYSTEM_PROMPT = "You are the Boolean Circuit Lab assistant. Explain digital logic accurately and plainly. Use the current page context. When explaining a circuit, name its inputs, intermediate signals, gate behavior, and outputs. If the user asks about a Boolean function, show concise reasoning and do not invent values that were not provided. Format answers with short paragraphs or markdown bullets.";

function normalizedHistory(history: ChatTurn[]) {
  return history.filter((turn) => turn.content.trim()).slice(-6);
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
        ...normalizedHistory(request.history),
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
    ...normalizedHistory(request.history).map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })),
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

export async function askAssistant(request: AssistantRequest) {
  const apiKey = process.env.ASSISTANT_API_KEY || process.env.OPENAI_API_KEY;
  const provider = (process.env.ASSISTANT_PROVIDER || "openai").toLowerCase();
  if (!apiKey) throw new Error("The assistant is not configured yet. Add ASSISTANT_API_KEY to the server environment.");
  return provider === "google" || provider === "gemini" ? askGoogle(request, apiKey) : askOpenAICompatible(request, apiKey);
}

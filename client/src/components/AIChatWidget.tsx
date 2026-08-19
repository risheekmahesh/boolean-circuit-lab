import { useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useLocation } from "wouter";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starter: ChatMessage = {
  role: "assistant",
  content: "I can explain Boolean minimization, gates, adders, subtractors, multipliers, and the circuit currently open on this page. What would you like to understand?",
};

export default function AIChatWidget() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starter]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageContext = useMemo(() => {
    if (location.startsWith("/modules")) return "Digital logic modules page: half adder, full adder, half subtractor, full subtractor, and 2-bit by 2-bit multiplier.";
    return "Boolean Circuit Lab analyzer page: Boolean expression minimization, don't-care terms, truth table, Karnaugh map, and gate-level implementations.";
  }, [location]);

  const sendMessage = async () => {
    const question = draft.trim();
    if (!question || loading) return;
    setDraft("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, page: pageContext, history: messages.slice(-6) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The assistant could not respond right now.");
      setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The assistant could not respond right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <aside className="assistant-panel" aria-label="Digital logic AI assistant">
          <div className="assistant-header">
            <div className="assistant-title"><span className="assistant-icon"><Bot size={18} /></span><span><strong>Logic assistant</strong><small>Context: {location.startsWith("/modules") ? "Modules" : "Boolean lab"}</small></span></div>
            <button type="button" className="assistant-close" aria-label="Close assistant" onClick={() => setOpen(false)}><X size={17} /></button>
          </div>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}
            {loading && <div className="assistant-message assistant">Thinking through the circuit…</div>}
          </div>
          {error && <p className="assistant-error">{error}</p>}
          <div className="assistant-composer"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask about this circuit…" aria-label="Ask the logic assistant" rows={2} /><button type="button" aria-label="Send question" onClick={() => void sendMessage()} disabled={loading || !draft.trim()}><Send size={16} /></button></div>
          <p className="assistant-context">{pageContext}</p>
        </aside>
      )}
      <button type="button" className={`assistant-launcher ${open ? "is-open" : ""}`} aria-label={open ? "Close logic assistant" : "Open logic assistant"} aria-expanded={open} onClick={() => setOpen((current) => !current)}><MessageCircle size={20} /><span>Ask AI</span></button>
    </>
  );
}

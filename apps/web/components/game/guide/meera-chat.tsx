"use client";

// "Ask Meera": chat with the guide about this game session. Her answers come from Claude
// (app/api/meera), which reads a plain-text summary of the session - no personal data.
import type { Locale } from "@toss/content";
import { Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { content } from "@/lib/content";
import { GAME_TEXT, INK, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import type { SavedSession } from "../store";
import { sessionContext } from "./coach-context";
import { GuideArt } from "./guide-art";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function MeeraChat({ session, onClose }: { session: SavedSession; onClose: () => void }) {
  const t = useTranslations("meeraChat");
  const locale = useLocale() as Locale;
  const context = useMemo(() => {
    try {
      return sessionContext(session, content, locale);
    } catch {
      return "";
    }
  }, [session, locale]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const show = (text: string) =>
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: text }]);
    try {
      const res = await fetch("/api/meera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20), context, locale }),
      });
      if (!res.ok || !res.body) {
        const code =
          res.status === 503 ? "notConfigured" : res.status === 429 ? "tooMany" : "error";
        show(t(code));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        show(text);
      }
      if (!text) show(t("error"));
    } catch {
      show(t("error"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  const suggestions = [t("suggest1"), t("suggest2"), t("suggest3"), t("suggest4")];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div
        className="flex h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-[3px] shadow-2xl"
        style={{ borderColor: INK, background: PANEL, color: INK }}
      >
        <header className="flex items-center gap-2 border-b-2 border-[#1e2a4a]/15 bg-[#d7f0ee] px-3 py-2">
          <GuideArt mood={busy ? "alert" : "happy"} className="size-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={cn(GAME_TEXT, "text-xl leading-tight")}>{t("title")}</p>
            <p className="truncate text-xs font-bold text-[#0f766e]">{t("subtitle")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="p-2">
            <X className="size-5" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
          <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white p-2.5 text-sm font-semibold shadow-sm">
            {t("hello")}
          </p>
          {messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl p-2.5 text-sm font-semibold shadow-sm",
                m.role === "user"
                  ? "ms-auto rounded-br-sm bg-[#2d7fe0] text-white"
                  : "rounded-bl-sm bg-white",
              )}
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </p>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-full border-2 border-[#0f766e]/40 bg-[#e6f7f5] px-3 py-1.5 text-start text-xs font-extrabold text-[#0f766e]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t-2 border-[#1e2a4a]/15 bg-white p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="min-h-11 flex-1 rounded-xl border-2 border-[#1e2a4a]/25 px-3 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={t("send")}
            className="grid size-11 place-items-center rounded-xl border-2 border-b-4 border-[#1d5aa6] bg-[#2d7fe0] text-white disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

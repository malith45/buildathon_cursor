"use client";

import { ChatMessage } from "@/lib/types";
import { btnPrimary, card, cardHeader, input, sectionTitle } from "@/lib/ui";
import { FormEvent, useRef, useEffect } from "react";

const STARTERS = [
  "Fever and sore throat for 2 days",
  "Mild headache after exercise",
  "Rash that appeared this morning",
];

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function Chat({ messages, onSend, loading, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text || loading) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className={`${card} flex min-h-[480px] flex-col`}>
      <div className={cardHeader}>
        <h2 className={sectionTitle}>Symptom chat</h2>
        <p className="mt-0.5 text-xs text-stone">
          Describe how you feel — we&apos;ll suggest next steps.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas/50 p-5">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-stone">
              Share your symptoms in your own words. The more context you give,
              the better the guidance.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => onSend(s)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-ink transition hover:border-brand/40 hover:bg-brand/5 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              m.role === "user"
                ? "ml-auto bg-brand text-white"
                : "border border-line/60 bg-white text-ink"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-stone">
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:300ms]" />
            </span>
            Getting guidance…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-5 mb-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-2.5 text-sm text-ink">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-3 border-t border-line/60 bg-white p-5"
      >
        <input
          ref={inputRef}
          name="message"
          type="text"
          disabled={loading}
          placeholder="Type your message…"
          className={input}
          autoComplete="off"
        />
        <button type="submit" disabled={loading} className={btnPrimary}>
          Send
        </button>
      </form>
    </section>
  );
}

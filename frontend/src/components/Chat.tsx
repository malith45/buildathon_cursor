"use client";

import { ChatMessage } from "@/lib/types";
import { FormEvent, useRef, useEffect } from "react";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function Chat({ messages, onSend, loading, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text || loading) return;
    onSend(text);
    input.value = "";
  }

  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Symptom chat</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Describe your symptoms or health concern. Example: &quot;I have had a
            fever and sore throat for two days.&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-teal-600 text-white"
                : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <p className="text-sm text-zinc-500">Getting guidance from Gemini…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          name="message"
          type="text"
          disabled={loading}
          placeholder="Type your message…"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}

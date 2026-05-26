"use client";

import { FormEvent, KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Send, Square } from "lucide-react";

interface Props {
  loading?: boolean;
  sendError?: string | null;
  onSend: (text: string) => void;
  onRetrySend?: () => void;
  onDismissSendError?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export default function ChatComposer({
  loading,
  sendError,
  onSend,
  onRetrySend,
  onDismissSendError,
  onCancel,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || loading || disabled) return;
    onSend(text);
    setValue("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <>
      {sendError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-2 flex flex-col gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-foreground/90">{sendError}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {onRetrySend ? (
              <Button type="button" size="sm" variant="outline" onClick={onRetrySend}>
                Try again
              </Button>
            ) : null}
            {onDismissSendError ? (
              <Button type="button" size="sm" variant="ghost" onClick={onDismissSendError}>
                Dismiss
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
        <div className="group/composer flex items-end gap-2 rounded-2xl border border-line/70 bg-background p-1.5 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || disabled}
            rows={1}
            placeholder="Describe your symptoms…"
            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-base leading-5 shadow-none outline-none focus-visible:ring-0 sm:min-h-9 sm:text-sm"
            style={{ boxShadow: "none" }}
          />
          {loading && onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-9 shrink-0 rounded-xl"
              aria-label="Stop generating"
              onClick={onCancel}
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || disabled || !value.trim()}
              size="icon-lg"
              className="size-9 shrink-0 rounded-xl shadow-sm"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

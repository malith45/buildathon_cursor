"use client";

import { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Brain,
  HeartPulse,
  Loader2,
  Send,
  Sparkles,
  Stethoscope,
  Thermometer,
  User as UserIcon,
} from "lucide-react";

const STARTERS = [
  {
    icon: Thermometer,
    title: "Fever & sore throat",
    detail: "Persistent fever and pain when swallowing for two days",
    text: "I've had a fever around 38.5°C and a sore throat for the past two days, with mild fatigue.",
  },
  {
    icon: Brain,
    title: "Headache after exercise",
    detail: "Throbbing headache that started during a workout",
    text: "I got a throbbing headache during a workout this morning. It's been about 3 hours and still hurts.",
  },
  {
    icon: HeartPulse,
    title: "Chest tightness",
    detail: "Mild chest tightness with no other symptoms",
    text: "I've felt mild chest tightness on and off this afternoon. No shortness of breath or pain in the arm.",
  },
  {
    icon: Stethoscope,
    title: "New rash",
    detail: "A red rash that appeared this morning on the arms",
    text: "A red, slightly itchy rash appeared on both arms this morning. No fever or known allergies.",
  },
];

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
}

function Avatar({ role }: { role: ChatMessage["role"] }) {
  if (role === "user") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
        <UserIcon className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm">
      <Bot className="size-4" />
    </div>
  );
}

export default function Chat({ messages, onSend, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || loading) return;
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

  const isEmpty = messages.length === 0;

  return (
    <Card className="relative flex h-full min-h-[480px] flex-col overflow-hidden border-line/70 bg-card/95 shadow-(--shadow-card)">
      <div className="flex shrink-0 items-center gap-3 border-b border-line/60 bg-linear-to-r from-primary/4 via-transparent to-mint/4 px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm">
          <Bot className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold leading-tight">
            MediAssist
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
            </span>
            Powered by OpenAI · Educational guidance only
          </p>
        </div>
      </div>

      <CardContent className="flex min-h-0 flex-1 flex-col px-0">
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-6">
            {isEmpty ? (
              <div className="animate-fade-up py-4">
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-mint/20 text-primary ring-1 ring-primary/20">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold tracking-tight">
                    How are you feeling today?
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                    Describe your symptoms in your own words. The more context
                    you share, the better the guidance.
                  </p>
                </div>

                <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Try an example
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {STARTERS.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.title}
                        type="button"
                        disabled={loading}
                        onClick={() => onSend(s.text)}
                        style={{ animationDelay: `${idx * 60}ms` }}
                        className="group/starter animate-fade-up flex items-start gap-3 rounded-xl border border-line/60 bg-card/50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/starter:bg-primary group-hover/starter:text-primary-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {s.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                            {s.detail}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-fade-up flex gap-3",
                    m.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar role={m.role} />
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm border border-line/60 bg-card"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="animate-fade-in flex gap-3">
                <Avatar role="model" />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line/60 bg-card px-4 py-3 text-muted-foreground shadow-sm">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-line/60 bg-card/95 px-5 py-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
            <div className="group/composer flex items-end gap-2 rounded-2xl border border-line/70 bg-background p-1.5 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder="Describe your symptoms…"
                className="min-h-9 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm leading-5 shadow-none outline-none focus-visible:ring-0"
                style={{ boxShadow: "none" }}
              />
              <Button
                type="submit"
                disabled={loading || !value.trim()}
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
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-line/60 bg-muted/60 px-1 py-px font-mono text-[10px]">
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd className="rounded border border-line/60 bg-muted/60 px-1 py-px font-mono text-[10px]">
                Shift + Enter
              </kbd>{" "}
              for a new line · Not a substitute for medical advice
            </p>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

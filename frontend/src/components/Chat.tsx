"use client";

import { ChatMessage, ChatSession } from "@/lib/types";
import {
  decisionForMessage,
  isFirstModelTurn,
} from "@/lib/chat-messages";
import DecisionMessage from "@/components/DecisionMessage";
import MessageSpeakToolbar from "@/components/MessageSpeakToolbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  AlertCircle,
  Loader2,
  PanelLeftOpen,
  Send,
  Sliders,
  Sparkles,
  SquarePen,
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
  activeSession?: ChatSession | null;
  onSend: (text: string) => void;
  loading?: boolean;
  profileIsDefault?: boolean;
  onOpenProfile?: () => void;
  sendError?: string | null;
  onRetrySend?: () => void;
  onDismissSendError?: () => void;
  onRequestFreshGuidance?: () => void;
  showMobileNav?: boolean;
  onOpenSidebar?: () => void;
  onNewChat?: () => void;
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

export default function Chat({
  messages,
  activeSession = null,
  onSend,
  loading,
  profileIsDefault = false,
  onOpenProfile,
  sendError,
  onRetrySend,
  onDismissSendError,
  onRequestFreshGuidance,
  showMobileNav = false,
  onOpenSidebar,
  onNewChat,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, sendError]);

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

  const composer = (
    <>
      {sendError ? (
        <div
          role="alert"
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
          disabled={loading}
          rows={1}
          placeholder="Describe your symptoms…"
          className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-base leading-5 shadow-none outline-none focus-visible:ring-0 sm:min-h-9 sm:text-sm"
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
    </form>
    </>
  );

  return (
    <Card className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden border-line/70 bg-card/95">
      {showMobileNav && onOpenSidebar ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-line/60 px-2 py-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-h-10 flex-1 gap-2"
            onClick={onOpenSidebar}
          >
            <PanelLeftOpen className="size-4 shrink-0" />
            Chats
          </Button>
          {onNewChat ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 min-h-10 shrink-0 gap-1.5 px-3"
              onClick={onNewChat}
            >
              <SquarePen className="size-4" />
              <span className="sr-only sm:not-sr-only sm:inline">New</span>
            </Button>
          ) : null}
        </div>
      ) : null}
      {isEmpty ? (
        /* Empty state â€” hero + starters + composer as one cohesive centered block */
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5 sm:py-6">
          <div className="w-full max-w-2xl space-y-6">
            <div className="animate-fade-up flex flex-col items-center text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-mint/20 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                How are you feeling today?
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                Describe your symptoms in your own words — the more context, the
                better the guidance.
              </p>
            </div>

            <div
              className="animate-fade-up"
              style={{ animationDelay: "60ms" }}
            >
              {composer}
            </div>

            {profileIsDefault && onOpenProfile ? (
              <div
                className="flex flex-col items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center sm:flex-row sm:text-left"
                role="note"
              >
                <Sliders className="size-4 shrink-0 text-primary" />
                <p className="flex-1 text-sm text-foreground/85">
                  Add age, conditions, and allergies for more tailored guidance.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={onOpenProfile}>
                  Edit profile
                </Button>
              </div>
            ) : null}

            <div
              className="animate-fade-up grid gap-2 sm:grid-cols-2"
              style={{ animationDelay: "120ms" }}
            >
              {STARTERS.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.title}
                    type="button"
                    disabled={loading}
                    onClick={() => onSend(s.text)}
                    style={{ animationDelay: `${160 + idx * 40}ms` }}
                    className="group/starter animate-fade-up flex items-start gap-2.5 rounded-xl border border-line/60 bg-card/50 p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/starter:bg-primary group-hover/starter:text-primary-foreground">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-tight">
                        {s.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {s.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Conversation — only the message list scrolls; composer stays pinned */
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const msgDecision = decisionForMessage(m, activeSession);
                const showDecisionCard = !isUser && msgDecision != null;
                return (
                  <div
                    key={i}
                    className={cn(
                      "animate-fade-up flex gap-2 sm:gap-3",
                      isUser && "flex-row-reverse"
                    )}
                  >
                    <Avatar role={m.role} />
                    {showDecisionCard ? (
                      <div className="min-w-0 flex-1">
                        <DecisionMessage
                          decision={msgDecision}
                          showLeadDisclaimer={isFirstModelTurn(messages, i)}
                          onRequestFreshGuidance={onRequestFreshGuidance}
                        />
                      </div>
                    ) : isUser ? (
                      <div className="max-w-[min(100%,20rem)] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm sm:max-w-[85%] sm:px-4">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex max-w-[min(100%,20rem)] flex-col overflow-hidden rounded-2xl rounded-tl-sm border border-line/60 bg-card text-sm leading-relaxed shadow-sm sm:max-w-[85%]">
                        <MessageSpeakToolbar
                          text={m.text}
                          className="bg-muted/20"
                        />
                        <p className="px-4 py-2.5">{m.text}</p>
                      </div>
                    )}
                  </div>
                );
              })}

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

          <div className="shrink-0 border-t border-line/60 bg-card/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-5">
            {composer}
          </div>
        </div>
      )}
    </Card>
  );
}

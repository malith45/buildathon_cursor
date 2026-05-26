"use client";

import { memo, useEffect, useRef } from "react";
import { ChatMessage, ChatSession } from "@/lib/types";
import {
  decisionForMessage,
  isFirstModelTurn,
} from "@/lib/chat-messages";
import DecisionMessage from "@/components/DecisionMessage";
import MessageSpeakToolbar from "@/components/MessageSpeakToolbar";
import { cn } from "@/lib/utils";
import { Bot, User as UserIcon } from "lucide-react";

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

function messageKey(m: ChatMessage, index: number): string {
  const tail = m.text.slice(0, 32);
  return `${m.role}-${index}-${tail.length}-${tail}`;
}

interface Props {
  messages: ChatMessage[];
  activeSession?: ChatSession | null;
  loading?: boolean;
  onRequestFreshGuidance?: () => void;
}

function ChatMessageList({
  messages,
  activeSession = null,
  loading,
  onRequestFreshGuidance,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length !== prevCountRef.current || loading) {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, loading]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
      {messages.map((m, i) => {
        const isUser = m.role === "user";
        const msgDecision = decisionForMessage(m, activeSession);
        const showDecisionCard = !isUser && msgDecision != null;
        return (
          <div
            key={messageKey(m, i)}
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

      {loading ? (
        <div
          className="animate-fade-in flex gap-3"
          aria-live="polite"
          aria-busy="true"
        >
          <Avatar role="model" />
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line/60 bg-card px-4 py-3 text-muted-foreground shadow-sm">
            <span className="sr-only">Generating guidance</span>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}

export default memo(ChatMessageList);

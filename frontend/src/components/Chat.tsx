"use client";

import { DecisionPartial } from "@/lib/decision-api";
import { ChatMessage, ChatSession } from "@/lib/types";
import ChatComposer from "@/components/ChatComposer";
import ChatMessageList from "@/components/ChatMessageList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Brain,
  HeartPulse,
  PanelLeftOpen,
  Sliders,
  Sparkles,
  SquarePen,
  Stethoscope,
  Thermometer,
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
  composerDisabled?: boolean;
  profileIsDefault?: boolean;
  onOpenProfile?: () => void;
  sendError?: string | null;
  onRetrySend?: () => void;
  onDismissSendError?: () => void;
  onRequestFreshGuidance?: () => void;
  onCancel?: () => void;
  streamPartial?: DecisionPartial | null;
  streamStage?: string;
  showMobileNav?: boolean;
  onOpenSidebar?: () => void;
  onNewChat?: () => void;
}

export default function Chat({
  messages,
  activeSession = null,
  onSend,
  loading,
  composerDisabled,
  profileIsDefault = false,
  onOpenProfile,
  sendError,
  onRetrySend,
  onDismissSendError,
  onRequestFreshGuidance,
  onCancel,
  streamPartial = null,
  streamStage,
  showMobileNav = false,
  onOpenSidebar,
  onNewChat,
}: Props) {
  const isEmpty = messages.length === 0;
  const disabled = Boolean(loading || composerDisabled);

  const composer = (
    <ChatComposer
      loading={loading}
      sendError={sendError}
      onSend={onSend}
      onRetrySend={onRetrySend}
      onDismissSendError={onDismissSendError}
      onCancel={loading ? onCancel : undefined}
      disabled={disabled}
    />
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
                    disabled={disabled}
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <ChatMessageList
              messages={messages}
              activeSession={activeSession}
              loading={loading}
              streamPartial={streamPartial}
              streamStage={streamStage}
              onRequestFreshGuidance={onRequestFreshGuidance}
            />
          </div>

          <div className="shrink-0 border-t border-line/60 bg-card/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-5">
            {composer}
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Chat from "@/components/Chat";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import HealthProfileForm from "@/components/HealthProfileForm";
import SessionList from "@/components/SessionList";
import TriageCard from "@/components/TriageCard";
import { checkBackendHealth, postHealthDecision } from "@/lib/apiClient";
import {
  createSession,
  loadSessions,
  saveSessions,
  updateSessionMessages,
  upsertSession,
  clearAllSessions,
} from "@/lib/chat-storage";
import { loadProfile, saveProfile } from "@/lib/profile-storage";
import {
  ChatMessage,
  ChatSession,
  DEFAULT_PROFILE,
  HealthDecisionResponse,
  HealthProfile,
} from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomeClient() {
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setSessions(loadSessions());
    checkBackendHealth().then(setBackendOk);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const persistProfile = useCallback((next: HealthProfile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  const persistSessions = useCallback((next: ChatSession[]) => {
    setSessions(next);
    saveSessions(next);
  }, []);

  const selectSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;
      setActiveId(id);
      setMessages(session.messages);
      setDecision(session.lastDecision ?? null);
      setError(null);
    },
    [sessions]
  );

  const startNewSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setDecision(null);
    setError(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearAllSessions();
    setSessions([]);
    startNewSession();
  }, [startNewSession]);

  const handleSend = useCallback(
    async (text: string) => {
      setError(null);
      setLoading(true);

      let session = activeSession;
      if (!session) {
        session = createSession(text);
        setActiveId(session.id);
      }

      const userMessage: ChatMessage = { role: "user", text };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        const result = await postHealthDecision({
          profile,
          messages: nextMessages,
        });

        const assistantSummary: ChatMessage = {
          role: "model",
          text: result.summary,
        };
        const withReply = [...nextMessages, assistantSummary];
        setMessages(withReply);
        setDecision(result);

        const updated = updateSessionMessages(session, withReply, result);
        persistSessions(upsertSession(sessions, updated));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to reach the backend. Is it running on port 4000?"
        );
      } finally {
        setLoading(false);
      }
    },
    [activeSession, messages, profile, sessions, persistSessions]
  );

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-line/70 shadow-[var(--shadow-card)]">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge
                variant="secondary"
                className="gap-2 rounded-full bg-primary/10 px-3 py-1 text-brand hover:bg-primary/10"
              >
                <span className="size-1.5 rounded-full bg-mint" aria-hidden />
                Calm Wellness · AI guidance
              </Badge>
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Health &amp; Care Decision System
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Thoughtful triage guidance, care steps, and education — powered
                by Gemini on a secure backend.
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-2 px-3 py-1.5",
                backendOk === false &&
                  "border-coral/40 bg-coral/10 text-coral",
                backendOk === true && "border-mint/40 bg-mint/10"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  backendOk === false && "bg-coral",
                  backendOk === true && "bg-mint",
                  backendOk === null && "animate-pulse bg-muted-foreground/40"
                )}
              />
              {backendOk === false
                ? "Backend offline"
                : backendOk === true
                  ? "Connected"
                  : "Checking…"}
            </Badge>
          </div>

          {backendOk === false && (
            <Alert variant="destructive" className="border-coral/30 bg-coral/10">
              <AlertDescription>
                Start the API:{" "}
                <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-xs">
                  cd backend &amp;&amp; npm run dev
                </code>
              </AlertDescription>
            </Alert>
          )}

          <DisclaimerBanner />
        </CardContent>
      </Card>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-2">
          <SessionList
            sessions={sessions}
            activeId={activeId}
            onSelect={selectSession}
            onNew={startNewSession}
            onClear={handleClearHistory}
          />
        </div>
        <div className="lg:col-span-3">
          <HealthProfileForm profile={profile} onChange={persistProfile} />
        </div>
        <div className="lg:col-span-4">
          <Chat
            messages={messages}
            onSend={handleSend}
            loading={loading}
            error={error}
          />
        </div>
        <div className="lg:col-span-3">
          <TriageCard decision={decision} loading={loading} />
        </div>
      </div>
    </main>
  );
}

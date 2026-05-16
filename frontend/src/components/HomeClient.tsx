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
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function HomeClient() {
  const { user, loading: authLoading, updateHealthProfile } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setProfile(user.healthProfile);
      setSessions(loadSessions(user.id));
    } else {
      setProfile(loadProfile());
      setSessions(loadSessions());
    }
    setActiveId(null);
    setMessages([]);
    setDecision(null);
  }, [user, authLoading]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const persistProfile = useCallback(
    (next: HealthProfile) => {
      setProfile(next);
      saveProfile(next, userId);
      if (user) {
        void updateHealthProfile(next).catch(() => {
          /* keep local state; user can save from /profile */
        });
      }
    },
    [user, userId, updateHealthProfile]
  );

  const persistSessions = useCallback(
    (next: ChatSession[]) => {
      setSessions(next);
      saveSessions(next, userId);
    },
    [userId]
  );

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
    clearAllSessions(userId);
    setSessions([]);
    startNewSession();
  }, [startNewSession, userId]);

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
                  cd backend &amp;&amp; python -m uvicorn app.main:app --reload --port 4000
                </code>
              </AlertDescription>
            </Alert>
          )}

          <DisclaimerBanner />

          {!authLoading && !user && (
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Log in to save your health profile and chat history to your
                  account.
                </span>
                <Link href="/login" className={buttonVariants({ size: "sm" })}>
                  Log in
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {user && (
            <Alert className="border-mint/30 bg-mint/10">
              <AlertDescription>
                Signed in as <strong>{user.name}</strong>. Profile changes sync
                to your account.{" "}
                <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
                  Edit profile
                </Link>
              </AlertDescription>
            </Alert>
          )}
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

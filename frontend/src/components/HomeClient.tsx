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
  HealthDecisionResponse,
  HealthProfile,
} from "@/lib/types";

export default function HomeClient() {
  const [profile, setProfile] = useState<HealthProfile>(() => loadProfile());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-teal-800 dark:text-teal-300">
          AI Health &amp; Care Decision System
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Powered by Gemini on the backend — triage guidance, care steps, and
          health education.
        </p>
        {backendOk === false && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Backend unreachable. Start the server:{" "}
            <code className="text-xs">cd backend &amp;&amp; npm run dev</code>
          </p>
        )}
        <DisclaimerBanner />
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[220px_280px_1fr_320px]">
        <SessionList
          sessions={sessions}
          activeId={activeId}
          onSelect={selectSession}
          onNew={startNewSession}
          onClear={handleClearHistory}
        />
        <HealthProfileForm profile={profile} onChange={persistProfile} />
        <Chat
          messages={messages}
          onSend={handleSend}
          loading={loading}
          error={error}
        />
        <TriageCard decision={decision} loading={loading} />
      </div>
    </div>
  );
}

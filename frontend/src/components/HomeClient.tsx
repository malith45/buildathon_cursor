"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Chat from "@/components/Chat";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ProfileDrawer from "@/components/ProfileDrawer";
import TriageCard from "@/components/TriageCard";
import { postHealthDecision } from "@/lib/apiClient";
import {
  clearChatSessions,
  fetchChatSessions,
  syncChatSessions,
} from "@/lib/chats-api";
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
import { errorMessage, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function HomeClient() {
  const { user, loading: authLoading, updateHealthProfile } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (user) {
        setProfile(user.healthProfile);
        const local = loadSessions(user.id);
        try {
          let remote = await fetchChatSessions();
          if (remote.length === 0 && local.length > 0) {
            remote = await syncChatSessions(local);
            toast.success(
              "Chats synced",
              "Your local history was saved to your account."
            );
          }
          if (!cancelled) {
            setSessions(remote);
            saveSessions(remote, user.id);
          }
        } catch (err) {
          if (!cancelled) {
            setSessions(local);
            toast.warning(
              "Could not load chats from server",
              errorMessage(err, "Showing local history only.")
            );
          }
        }
      } else {
        setProfile(loadProfile());
        if (!cancelled) setSessions(loadSessions());
      }
      if (!cancelled) {
        setActiveId(null);
        setMessages([]);
        setDecision(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const persistProfile = useCallback(
    (next: HealthProfile) => {
      setProfile(next);
      saveProfile(next, userId);
      if (user) {
        void updateHealthProfile(next).catch((err) => {
          toast.warning(
            "Profile not synced",
            errorMessage(err, "Save from your profile page when online.")
          );
        });
      }
    },
    [user, userId, updateHealthProfile]
  );

  const persistSessions = useCallback(
    async (next: ChatSession[]) => {
      setSessions(next);
      saveSessions(next, userId);
      if (!userId) return;
      try {
        const saved = await syncChatSessions(next);
        setSessions(saved);
        saveSessions(saved, userId);
      } catch (err) {
        toast.warning(
          "Chat not saved online",
          errorMessage(
            err,
            "Saved on this device only. Check database connection."
          )
        );
      }
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
    },
    [sessions]
  );

  const startNewSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setDecision(null);
    toast.info("New chat started");
  }, []);

  const handleClearHistory = useCallback(() => {
    clearAllSessions(userId);
    setSessions([]);
    setActiveId(null);
    setMessages([]);
    setDecision(null);
    if (userId) {
      void clearChatSessions().catch((err) => {
        toast.warning(
          "Server history not cleared",
          errorMessage(err, "Cleared on this device only.")
        );
      });
    }
    toast.success("Chat history cleared");
  }, [userId]);

  const handleSend = useCallback(
    async (text: string) => {
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
        await persistSessions(upsertSession(sessions, updated));
        if (result.fallback) {
          toast.warning(
            "Limited AI response",
            "Using safe fallback guidance. Check OpenAI status in the header."
          );
        }
      } catch (err) {
        toast.error(
          "Could not get guidance",
          errorMessage(
            err,
            "Failed to reach the backend. Is it running on port 4000?"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [activeSession, messages, profile, sessions, persistSessions]
  );

  const showTriage = Boolean(decision) || (loading && messages.length > 0);

  const profileSummary = useMemo(() => {
    const parts: string[] = [profile.ageRange];
    if (profile.sex) parts.push(profile.sex);
    if (profile.conditions.length) {
      parts.push(
        `${profile.conditions.length} condition${profile.conditions.length === 1 ? "" : "s"}`
      );
    }
    return parts.join(" · ");
  }, [profile]);

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-8 md:min-h-[calc(100vh-3.5rem)]">
      {/* Workspace shell — flex-1 fills available viewport, min-h floor keeps it usable on tiny screens */}
      <div className="flex min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-line/70 bg-card/60 shadow-sm backdrop-blur-sm">
        <ChatHistorySidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={selectSession}
          onNew={startNewSession}
          onClear={handleClearHistory}
          user={user ? { name: user.name, email: user.email } : null}
          profileSummary={profileSummary}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <div
          className={cn(
            "grid min-h-0 min-w-0 flex-1 gap-4 p-3 sm:p-4",
            showTriage
              ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]"
              : "grid-cols-1"
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-col">
            <Chat
              messages={messages}
              onSend={handleSend}
              loading={loading}
            />
          </div>
          {showTriage && (
            <aside className="scrollbar-thin animate-fade-in flex min-h-0 min-w-0 flex-col overflow-y-auto">
              <TriageCard decision={decision} loading={loading} />
            </aside>
          )}
        </div>
      </div>

      <DisclaimerBanner />

      <ProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onChange={persistProfile}
      />
    </main>
  );
}

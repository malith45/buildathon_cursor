"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chat from "@/components/Chat";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ProfileDrawer from "@/components/ProfileDrawer";
import { postHealthDecision } from "@/lib/apiClient";
import { normalizeDecisionResponse } from "@/lib/decision-normalize";
import { fetchChatSessions, syncChatSessions } from "@/lib/chats-api";
import {
  createSession,
  loadSessions,
  saveSessions,
  updateSessionMessages,
  upsertSession,
} from "@/lib/chat-storage";
import {
  guestProfileDiffersFromDefault,
  mergeGuestSessionsIntoAccount,
  resolveProfileAfterAuth,
} from "@/lib/guest-migration";
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

const PROFILE_SYNC_MS = 800;

export default function HomeClient() {
  const { user, loading: authLoading, updateHealthProfile } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGoodSessionsRef = useRef<ChatSession[]>([]);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (!cancelled) setHistoryLoading(true);
      if (user) {
        const mergedLocal = mergeGuestSessionsIntoAccount(user.id);
        const nextProfile = resolveProfileAfterAuth(
          user.healthProfile,
          user.id
        );
        if (!cancelled) setProfile(nextProfile);
        if (guestProfileDiffersFromDefault(nextProfile)) {
          void updateHealthProfile(nextProfile).catch(() => {
            /* local copy already saved in resolveProfileAfterAuth */
          });
        }

        try {
          // Show something immediately while cloud fetch resolves.
          if (!cancelled) setSessions(mergedLocal);
          let remote = await fetchChatSessions();
          if (remote.length === 0 && mergedLocal.length > 0) {
            remote = await syncChatSessions(mergedLocal);
            toast.success(
              "Chats synced",
              "Your local history was saved to your account."
            );
          }
          if (!cancelled) {
            lastGoodSessionsRef.current = remote;
            setSessions(remote);
            saveSessions(remote, user.id);
          }
        } catch (err) {
          if (!cancelled) {
            const safeFallback =
              mergedLocal.length > 0 ? mergedLocal : lastGoodSessionsRef.current;
            setSessions(safeFallback);
            if (safeFallback.length > 0) {
              lastGoodSessionsRef.current = safeFallback;
            }
            const fallbackCount = mergedLocal.length;
            toast.warning(
              "Could not load chats from server",
              errorMessage(
                err,
                safeFallback.length > 0
                  ? `Showing ${safeFallback.length} local/cached chat${
                      safeFallback.length === 1 ? "" : "s"
                    } only.`
                  : "Cloud chat history unavailable and no local chats found."
              )
            );
          }
        }
      } else {
        if (!cancelled) {
          setProfile(loadProfile());
          const local = loadSessions();
          lastGoodSessionsRef.current = local;
          setSessions(local);
        }
      }
      if (!cancelled) {
        setActiveId(null);
        setMessages([]);
        setDecision(null);
        setHistoryLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, updateHealthProfile]);

  useEffect(() => {
    return () => {
      if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const persistProfile = useCallback(
    (next: HealthProfile) => {
      setProfile(next);
      saveProfile(next, userId);
      if (!user) return;

      if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
      profileSyncTimer.current = setTimeout(() => {
        void updateHealthProfile(next).catch((err) => {
          toast.warning(
            "Profile not synced",
            errorMessage(err, "Changes saved on this device only.")
          );
        });
      }, PROFILE_SYNC_MS);
    },
    [user, userId, updateHealthProfile]
  );

  const persistSessions = useCallback(
    async (next: ChatSession[]) => {
      setSessions(next);
      lastGoodSessionsRef.current = next;
      saveSessions(next, userId);
      if (!userId) return;
      try {
        const saved = await syncChatSessions(next);
        lastGoodSessionsRef.current = saved;
        setSessions(saved);
        saveSessions(saved, userId);
      } catch (err) {
        toast.warning(
          "Chat not saved online",
          errorMessage(
            err,
            "Saved on this device only. Check storage in the header status panel."
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
      setDecision(
        session.lastDecision
          ? normalizeDecisionResponse(session.lastDecision, session.messages)
          : null
      );
    },
    [sessions]
  );

  const startNewSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setDecision(null);
    toast.info("New chat started");
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      const next = sessions.filter((s) => s.id !== id);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
        setDecision(null);
      }
      await persistSessions(next);
      toast.success("Chat deleted");
    },
    [sessions, activeId, persistSessions]
  );

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
            "Using safe fallback guidance. Check OPENAI_API_KEY in backend/.env and restart the API."
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

  const profileSummary = useMemo(() => {
    const parts: string[] = [profile.ageRange];
    if (profile.gender) parts.push(profile.gender);
    if (profile.conditions.length) {
      parts.push(
        `${profile.conditions.length} condition${profile.conditions.length === 1 ? "" : "s"}`
      );
    }
    return parts.join(" · ");
  }, [profile]);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-1 flex-col gap-2 overflow-hidden px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-line/70 bg-card/60 shadow-sm backdrop-blur-sm">
        <ChatHistorySidebar
          sessions={sessions}
          loading={historyLoading}
          activeId={activeId}
          onSelect={selectSession}
          onNew={startNewSession}
          onDeleteSession={handleDeleteSession}
          user={user ? { name: user.name, email: user.email } : null}
          profileSummary={profileSummary}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <Chat
            messages={messages}
            onSend={handleSend}
            loading={loading}
            decision={decision}
          />
        </div>
      </div>

      <ProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onChange={persistProfile}
      />
    </main>
  );
}

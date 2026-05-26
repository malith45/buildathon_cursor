"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/lib/use-media-query";
import Chat from "@/components/Chat";
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import ProfileDrawer from "@/components/ProfileDrawer";
import {
  DecisionAbortedError,
  formatDecisionError,
  formatFallbackNotice,
  postHealthDecisionStream,
  type DecisionPartial,
} from "@/lib/apiClient";
import { OPEN_PROFILE_DRAWER_EVENT } from "@/lib/ui-events";
import {
  hydrateAllSessions,
  hydrateSessionDecisions,
  messagesForApi,
  withModelReply,
} from "@/lib/chat-messages";
import {
  fetchChatSessions,
  syncChatSession,
  syncChatSessions,
} from "@/lib/chats-api";
import {
  clearAllSessions,
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
  HealthProfile,
} from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, toast } from "@/lib/toast";

const PROFILE_SYNC_MS = 800;
const CLOUD_SYNC_MS = 2000;

export default function HomeClient() {
  const { user, loading: authLoading, updateHealthProfile } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const retryTextRef = useRef<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGoodSessionsRef = useRef<ChatSession[]>([]);
  const migratedProfileForUserRef = useRef<string | null>(null);
  const loadedForUserIdRef = useRef<string | null | undefined>(undefined);
  const userId = user?.id ?? null;
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [streamPartial, setStreamPartial] = useState<DecisionPartial | null>(
    null
  );
  const [streamStage, setStreamStage] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const cloudSyncWarnedRef = useRef(false);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !mobileSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, mobileSidebarOpen]);

  useEffect(() => {
    const onOpenDrawer = () => setProfileOpen(true);
    window.addEventListener(OPEN_PROFILE_DRAWER_EVENT, onOpenDrawer);
    return () =>
      window.removeEventListener(OPEN_PROFILE_DRAWER_EVENT, onOpenDrawer);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (profileOpen) {
        setProfileOpen(false);
        return;
      }
      if (mobileSidebarOpen) setMobileSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profileOpen, mobileSidebarOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const uid = userId;
    const accountChanged = loadedForUserIdRef.current !== uid;
    loadedForUserIdRef.current = uid;

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      if (user) {
        const mergedLocal = mergeGuestSessionsIntoAccount(user.id);
        try {
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
            const hydrated = hydrateAllSessions(remote);
            lastGoodSessionsRef.current = hydrated;
            setSessions(hydrated);
            saveSessions(hydrated, user.id);
          }
        } catch (err) {
          if (!cancelled) {
            const safeFallback =
              mergedLocal.length > 0
                ? mergedLocal
                : lastGoodSessionsRef.current;
            setSessions(safeFallback);
            if (safeFallback.length > 0) {
              lastGoodSessionsRef.current = safeFallback;
            }
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
          const local = hydrateAllSessions(loadSessions());
          lastGoodSessionsRef.current = local;
          setSessions(local);
        }
      }

      if (!cancelled) {
        if (accountChanged) {
          setActiveId(null);
          setMessages([]);
          setSendError(null);
        }
        setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading, user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const nextProfile = resolveProfileAfterAuth(
        user.healthProfile,
        user.id
      );
      setProfile(nextProfile);
      const shouldSyncGuestProfile =
        guestProfileDiffersFromDefault(nextProfile) &&
        migratedProfileForUserRef.current !== user.id;
      if (shouldSyncGuestProfile) {
        migratedProfileForUserRef.current = user.id;
        void updateHealthProfile(nextProfile).catch(() => {
          /* local copy already saved */
        });
      }
    } else {
      migratedProfileForUserRef.current = null;
      setProfile(loadProfile());
    }
  }, [userId, user?.healthProfile, authLoading, user, updateHealthProfile]);

  useEffect(() => {
    return () => {
      if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
      if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
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

  const persistSessionsLocal = useCallback(
    (next: ChatSession[]) => {
      setSessions(next);
      lastGoodSessionsRef.current = next;
      saveSessions(next, userId);
    },
    [userId]
  );

  const syncSessionsToCloud = useCallback(
    async (next: ChatSession[]) => {
      if (!userId) return;
      try {
        const saved = await syncChatSessions(next);
        lastGoodSessionsRef.current = saved;
        setSessions(saved);
        saveSessions(saved, userId);
      } catch (err) {
        if (!cloudSyncWarnedRef.current) {
          cloudSyncWarnedRef.current = true;
          toast.warning(
            "Chat not saved online",
            errorMessage(
              err,
              "Saved on this device only. Sign in and check cloud storage settings if you need sync."
            )
          );
        }
      }
    },
    [userId]
  );

  const syncOneSessionToCloud = useCallback(
    async (session: ChatSession) => {
      if (!userId) return;
      try {
        const saved = await syncChatSession(session);
        setSessions((prev) => {
          const merged = upsertSession(prev, saved);
          lastGoodSessionsRef.current = merged;
          saveSessions(merged, userId);
          return merged;
        });
      } catch (err) {
        if (!cloudSyncWarnedRef.current) {
          cloudSyncWarnedRef.current = true;
          toast.warning(
            "Chat not saved online",
            errorMessage(err, "Saved on this device only.")
          );
        }
      }
    },
    [userId]
  );

  const scheduleCloudSync = useCallback(
    (session: ChatSession) => {
      if (!userId) return;
      if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
      cloudSyncTimer.current = setTimeout(() => {
        void syncOneSessionToCloud(session);
      }, CLOUD_SYNC_MS);
    },
    [userId, syncOneSessionToCloud]
  );

  const persistSessions = useCallback(
    async (next: ChatSession[]) => {
      persistSessionsLocal(next);
      await syncSessionsToCloud(next);
    },
    [persistSessionsLocal, syncSessionsToCloud]
  );

  const selectSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;
      const hydrated = hydrateSessionDecisions(session);
      setActiveId(id);
      setMessages(hydrated.messages);
      setSendError(null);
    },
    [sessions]
  );

  const startNewSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setSendError(null);
    toast.info("New chat started");
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      const next = sessions.filter((s) => s.id !== id);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
        setSendError(null);
      }
      await persistSessions(next);
      toast.success("Chat deleted");
    },
    [sessions, activeId, persistSessions]
  );

  const handleCancelSend = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamPartial(null);
    setStreamStage(undefined);
    setLoading(false);
  }, []);

  const runDecision = useCallback(
    async (
      session: ChatSession,
      transcript: ChatMessage[],
      options?: { appendUserText?: string }
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreamPartial(null);
      setStreamStage(undefined);

      const apiMessages =
        options?.appendUserText != null
          ? messagesForApi([
              ...transcript,
              { role: "user", text: options.appendUserText },
            ])
          : messagesForApi(transcript);

      const result = await postHealthDecisionStream(
        { profile, messages: apiMessages },
        {
          signal: controller.signal,
          onStage: (stage) => setStreamStage(stage),
          onPartial: (partial) =>
            setStreamPartial((prev) => ({ ...prev, ...partial })),
        }
      );

      const baseMessages =
        options?.appendUserText != null
          ? [...transcript, { role: "user" as const, text: options.appendUserText }]
          : transcript;

      const withReply = withModelReply(
        baseMessages,
        result.summary,
        result
      );
      setMessages(withReply);
      setStreamPartial(null);
      setStreamStage(undefined);

      const updated = updateSessionMessages(session, withReply, result);
      const merged = upsertSession(sessions, updated);
      persistSessionsLocal(merged);
      retryTextRef.current = null;
      const fallbackNotice = formatFallbackNotice(result);
      if (fallbackNotice.show) {
        toast.warning(fallbackNotice.title, fallbackNotice.message);
      }
      scheduleCloudSync(updated);
      abortRef.current = null;
      return withReply;
    },
    [profile, sessions, persistSessionsLocal, scheduleCloudSync]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (authLoading || historyLoading) return;
      setLoading(true);
      setSendError(null);
      retryTextRef.current = text;

      let session = activeSession;
      if (!session) {
        session = createSession(text);
        setActiveId(session.id);
      }

      const userMessage: ChatMessage = { role: "user", text };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        await runDecision(session, messages, { appendUserText: text });
      } catch (err) {
        if (err instanceof DecisionAbortedError) {
          return;
        }
        setMessages(messages);
        const { title, message } = formatDecisionError(err);
        setSendError(message);
        toast.error(title, message);
      } finally {
        setLoading(false);
        setStreamPartial(null);
        setStreamStage(undefined);
        abortRef.current = null;
      }
    },
    [
      activeSession,
      messages,
      runDecision,
      authLoading,
      historyLoading,
    ]
  );

  const handleRetrySend = useCallback(() => {
    const text = retryTextRef.current;
    if (text) void handleSend(text);
  }, [handleSend]);

  const handleRequestFreshGuidance = useCallback(async () => {
    if (!activeSession || loading || authLoading || historyLoading) return;
    const trimmed = [...messages];
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "model") {
      trimmed.pop();
    }
    const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    setLoading(true);
    setSendError(null);
    setMessages(trimmed);
    retryTextRef.current = lastUser.text;

    try {
      await runDecision(activeSession, trimmed);
    } catch (err) {
      if (err instanceof DecisionAbortedError) return;
      setMessages(messages);
      const { title, message } = formatDecisionError(err);
      setSendError(message);
      toast.error(title, message);
    } finally {
      setLoading(false);
      setStreamPartial(null);
      setStreamStage(undefined);
      abortRef.current = null;
    }
  }, [
    activeSession,
    messages,
    loading,
    authLoading,
    historyLoading,
    runDecision,
  ]);

  const handleClearAllChats = useCallback(async () => {
    clearAllSessions(userId);
    setSessions([]);
    setActiveId(null);
    setMessages([]);
    setSendError(null);
    if (userId) {
      try {
        await syncChatSessions([]);
      } catch (err) {
        toast.warning(
          "Cleared locally",
          errorMessage(err, "Could not clear chats on the server.")
        );
        return;
      }
    }
    toast.success("All chats cleared");
  }, [userId]);

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

  const profileIsDefault = !guestProfileDiffersFromDefault(profile);
  const chatReady = !authLoading && !historyLoading;

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-1 flex-col gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-6 md:py-4 lg:px-8">
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-line/70 bg-card/60 shadow-sm backdrop-blur-sm sm:rounded-2xl">
        <ChatHistorySidebar
          sessions={sessions}
          loading={historyLoading || authLoading}
          activeId={activeId}
          onSelect={selectSession}
          onNew={startNewSession}
          onDeleteSession={handleDeleteSession}
          onClearAll={sessions.length > 0 ? handleClearAllChats : undefined}
          user={user ? { name: user.name, email: user.email } : null}
          profileSummary={profileSummary}
          onOpenProfile={() => setProfileOpen(true)}
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 md:p-4">
          <Chat
            messages={messages}
            activeSession={activeSession}
            onSend={handleSend}
            loading={loading}
            composerDisabled={!chatReady}
            profileIsDefault={profileIsDefault}
            onOpenProfile={() => setProfileOpen(true)}
            sendError={sendError}
            onRetrySend={handleRetrySend}
            onDismissSendError={() => setSendError(null)}
            onRequestFreshGuidance={() => void handleRequestFreshGuidance()}
            onCancel={handleCancelSend}
            streamPartial={streamPartial}
            streamStage={streamStage}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            onNewChat={startNewSession}
            showMobileNav={isMobile}
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

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
import SystemStatusPanel from "@/components/SystemStatusPanel";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { ChevronRight, Sliders, Sparkles, X } from "lucide-react";

export default function HomeClient() {
  const { user, loading: authLoading, updateHealthProfile } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<HealthDecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(true);
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

  const profileChipDetail = useMemo(() => {
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
    <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* Hero: welcome + profile chip on one tidy row */}
      <section className="animate-fade-in flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-card/80 px-4 py-3.5 shadow-(--shadow-card) backdrop-blur-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold leading-tight sm:text-base">
              {user ? `Welcome back, ${user.name.split(" ")[0]}` : APP_NAME}
            </p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {user
                ? "Your profile and chats sync to your account."
                : "Confidential triage guidance powered by OpenAI."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setProfileOpen(true)}
          className="shrink-0 gap-1.5"
        >
          <Sliders className="size-3.5" />
          <span className="hidden sm:inline">Profile</span>
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            · {profileChipDetail}
          </span>
        </Button>
      </section>

      {/* System status: dedicated row so badges + detail can breathe */}
      <section className="flex w-full justify-end">
        <SystemStatusPanel />
      </section>

      {/* Sign-in prompt for guests (dismissible) */}
      {!authLoading && !user && showSignInPrompt && (
        <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/4 px-4 py-2.5">
          <p className="text-xs leading-relaxed text-foreground/80">
            <span className="font-medium">Sign in</span> to save your health
            profile and chat history across devices.
          </p>
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className={buttonVariants({ size: "sm", variant: "default" })}
            >
              Log in
              <ChevronRight className="size-3.5" />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSignInPrompt(false)}
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Workspace shell */}
      <div className="flex min-h-[640px] flex-1 overflow-hidden rounded-2xl border border-line/70 bg-card/70 shadow-(--shadow-card) backdrop-blur-sm">
        <ChatHistorySidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={selectSession}
          onNew={startNewSession}
          onClear={handleClearHistory}
        />

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col">
            <Chat
              messages={messages}
              onSend={handleSend}
              loading={loading}
            />
          </div>
          <aside className="flex min-w-0 flex-col">
            <TriageCard decision={decision} loading={loading} />
          </aside>
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

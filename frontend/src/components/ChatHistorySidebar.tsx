"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatSession } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  LogIn,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sliders,
  Trash2,
  User as UserIcon,
} from "lucide-react";

const STORAGE_KEY = "mediassist_chat_sidebar_expanded";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleteSession: (id: string) => void;
  user?: { name: string; email: string } | null;
  profileSummary?: string;
  onOpenProfile?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** First meaningful character for a tiny collapsed-list badge (no chat icon). */
function chatTitleInitial(title: string): string {
  const t = title.trim();
  const m = t.match(/[A-Za-z0-9]/);
  return m ? m[0]!.toUpperCase() : "?";
}

type GroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

const GROUP_LABELS: Record<GroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "Earlier this week",
  earlier: "Earlier",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getGroupKey(date: Date): GroupKey {
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = today - target;
  if (diff <= 0) return "today";
  if (diff === dayMs) return "yesterday";
  if (diff <= 6 * dayMs) return "thisWeek";
  return "earlier";
}

function formatTime(updatedAt: string): string {
  const d = new Date(updatedAt);
  const now = new Date();
  if (startOfDay(d) === startOfDay(now)) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ChatHistorySidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDeleteSession,
  user = null,
  profileSummary = "",
  onOpenProfile,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setExpanded(stored === "true");
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<GroupKey, ChatSession[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const s of sessions) {
      const key = getGroupKey(new Date(s.updatedAt));
      groups[key].push(s);
    }
    return groups;
  }, [sessions]);

  const widthClass = expanded ? "w-[268px]" : "w-[56px]";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-line/70 bg-sidebar/90 transition-[width] duration-200 ease-in-out",
        hydrated ? widthClass : "w-[268px]"
      )}
      aria-label="Chat history sidebar"
    >
      {/* Top chrome — fixed, does not scroll */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-line/60 bg-card/80",
          expanded ? "px-3 py-2.5" : "flex-col gap-1.5 px-1.5 py-2"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Minimize chat history" : "Expand chat history"}
          title={expanded ? "Minimize sidebar" : "Expand sidebar"}
          className={cn(
            "shrink-0",
            !expanded &&
              "size-9 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {expanded ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>

        {expanded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-semibold leading-tight">
                Chats
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {sessions.length === 0
                  ? "No conversations yet"
                  : `${sessions.length} conversation${sessions.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onNew}
              className="shrink-0 shadow-sm"
            >
              <Plus className="size-3.5" />
              New
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={onNew}
            aria-label="New chat"
            title="New chat"
            className="size-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 transition hover:bg-primary/90"
          >
            <Plus className="size-[18px] stroke-[2.5]" />
          </Button>
        )}
      </div>

      {/* Only this region scrolls — list / empty state */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "scrollbar-thin h-full min-h-0 overflow-y-auto overscroll-y-contain",
            !expanded && "px-1.5 py-2"
          )}
        >
        {expanded ? (
          sessions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/70">
                <MessagesSquare className="size-5" />
              </div>
              <p className="text-xs font-medium text-foreground/70">
                No chats yet
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Send your first symptom message to start a conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {(Object.keys(GROUP_LABELS) as GroupKey[]).map((key) => {
                const group = grouped[key];
                if (group.length === 0) return null;
                return (
                  <div key={key} className="space-y-0.5">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {GROUP_LABELS[key]}
                    </p>
                    <ul className="space-y-0.5 px-2">
                      {group.map((s) => (
                        <li key={s.id}>
                          <div
                            className={cn(
                              "group/row flex w-full items-stretch rounded-lg px-0.5 py-0.5 transition-colors",
                              activeId === s.id
                                ? "bg-primary/10 ring-1 ring-primary/25"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelect(s.id)}
                              className={cn(
                                "min-w-0 flex-1 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                                activeId === s.id
                                  ? "text-foreground"
                                  : "text-foreground/80"
                              )}
                            >
                              <p className="line-clamp-2 text-[13px] font-medium leading-tight">
                                {s.title}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatTime(s.updatedAt)} · {s.messages.length}{" "}
                                message
                                {s.messages.length === 1 ? "" : "s"}
                              </p>
                            </button>
                            <button
                              type="button"
                              className="shrink-0 rounded-md text-destructive opacity-100 transition-opacity hover:bg-destructive/15 sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100"
                              aria-label={`Delete chat: ${s.title}`}
                              title="Delete chat"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPendingDelete({
                                  id: s.id,
                                  title: s.title,
                                });
                              }}
                            >
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-md">
                                <Trash2 className="size-3.5" />
                              </span>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <ul
            className="flex flex-col items-stretch gap-1 px-1"
            aria-label="Chat sessions"
          >
            {sessions.length === 0 ? (
              <li className="flex justify-center py-6">
                <div className="flex size-9 items-center justify-center rounded-xl border border-dashed border-line/60 bg-muted/30 text-muted-foreground">
                  <MessagesSquare className="size-4 opacity-60" aria-hidden />
                </div>
              </li>
            ) : (
              sessions.map((s) => (
                <li
                  key={s.id}
                  className="group/session flex w-full items-center justify-between gap-1 px-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    aria-label={s.title}
                    title={s.title}
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold transition-colors",
                      activeId === s.id
                        ? "border-primary/35 bg-primary/15 text-primary ring-1 ring-primary/25"
                        : "border-transparent bg-muted/25 text-muted-foreground hover:border-line/50 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {chatTitleInitial(s.title)}
                  </button>
                  <button
                    type="button"
                    className="flex size-5 shrink-0 items-center justify-center rounded-md border border-line/60 bg-card text-destructive shadow-sm transition-opacity hover:bg-destructive/15 sm:opacity-0 sm:group-hover/session:opacity-100 sm:focus-visible:opacity-100"
                    aria-label={`Delete chat: ${s.title}`}
                    title="Delete chat"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPendingDelete({ id: s.id, title: s.title });
                    }}
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        </div>
      </div>

      {/* Bottom dock — profile / guest only */}
      <div
        className={cn(
          "mt-auto flex shrink-0 flex-col border-t border-line/60 bg-card/95 backdrop-blur-sm",
          !expanded && "items-center"
        )}
      >
        <div
          className={cn(
            expanded ? "p-2" : "flex flex-col items-center gap-1 px-1.5 pb-2 pt-1"
          )}
        >
        {user ? (
          expanded ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="group/me flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-hidden"
              aria-label="Edit health profile"
              title="Edit health profile"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-lavender text-[11px] font-semibold text-primary-foreground shadow-sm">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-tight">
                  {user.name}
                </span>
                {profileSummary && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {profileSummary}
                  </span>
                )}
              </span>
              <Sliders className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/me:text-foreground" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label={`Edit health profile (${user.name})`}
              title={user.name}
              className="flex size-9 items-center justify-center rounded-xl border border-transparent bg-muted/25 transition-colors hover:border-line/50 hover:bg-muted/60 focus-visible:outline-hidden"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-lavender text-[10px] font-semibold text-primary-foreground shadow-sm">
                {initials(user.name)}
              </span>
            </button>
          )
        ) : expanded ? (
          <Link
            href="/login"
            className="group/guest flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-hidden"
            title="Sign in to save chats"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-tight">
                Guest
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Sign in to save chats
              </span>
            </span>
            <LogIn className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/guest:text-foreground" />
          </Link>
        ) : (
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 rounded-xl border border-transparent bg-muted/25 text-muted-foreground hover:border-line/50 hover:bg-muted/60 hover:text-foreground"
            )}
            aria-label="Sign in"
            title="Sign in"
          >
            <UserIcon className="size-4" />
          </Link>
        )}
        </div>
      </div>

      <Modal
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <Trash2 className="size-4" />
          </div>
          <h2 className="font-heading text-base font-semibold">
            Delete this chat?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/90">
              {pendingDelete?.title ?? "This chat"}
            </span>{" "}
            will be removed from this device
            {user ? " and your account" : ""}. This cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line/60 bg-muted/30 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPendingDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              if (pendingDelete) onDeleteSession(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </aside>
  );
}

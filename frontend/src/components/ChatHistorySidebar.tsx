"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";

const STORAGE_KEY = "mediassist_chat_sidebar_expanded";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClear: () => void;
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
  onClear,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [hydrated, setHydrated] = useState(false);

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

  const widthClass = expanded ? "w-[268px]" : "w-14";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-line/70 bg-card/95 transition-[width] duration-200 ease-in-out",
        hydrated ? widthClass : "w-[268px]"
      )}
      aria-label="Chat history sidebar"
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-line/60",
          expanded ? "px-3 py-2.5" : "flex-col px-2 py-2.5"
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
          className="shrink-0"
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
            variant="default"
            size="icon-sm"
            onClick={onNew}
            aria-label="New chat"
            title="New chat"
            className="shadow-sm"
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
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
                          <button
                            type="button"
                            onClick={() => onSelect(s.id)}
                            className={cn(
                              "group/chat flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all",
                              activeId === s.id
                                ? "bg-primary/10 text-foreground ring-1 ring-primary/25"
                                : "text-foreground/80 hover:bg-muted/70 hover:text-foreground"
                            )}
                          >
                            <MessageSquare
                              className={cn(
                                "mt-0.5 size-3.5 shrink-0 transition-colors",
                                activeId === s.id
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover/chat:text-foreground"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[13px] font-medium leading-tight">
                                {s.title}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatTime(s.updatedAt)} ·{" "}
                                {s.messages.length} message
                                {s.messages.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <ul className="flex flex-col items-center gap-1 py-2">
            {sessions.length === 0 ? (
              <li className="px-1 py-4">
                <MessagesSquare
                  className="size-5 text-muted-foreground/50"
                  aria-hidden
                />
              </li>
            ) : (
              sessions.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    aria-label={s.title}
                    title={s.title}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition",
                      activeId === s.id
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {sessions.length > 0 && (
        <div
          className={cn(
            "shrink-0 border-t border-line/60",
            expanded ? "px-2 py-2" : "flex items-center justify-center px-1 py-2"
          )}
        >
          {expanded ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={onClear}
              aria-label="Clear all chats"
              title="Clear all chats"
            >
              <Trash2 className="size-3.5" />
              <span>Clear all</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onClear}
              aria-label="Clear all chats"
              title="Clear all chats"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

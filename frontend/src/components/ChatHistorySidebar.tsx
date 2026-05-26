"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  sessionDisplayTitle,
  sessionTooltipTitle,
} from "@/lib/session-title";
import { ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Trash2,
  UserRound,
} from "lucide-react";

const STORAGE_KEY = "mediassist_chat_sidebar_expanded";
const SIDEBAR_EXPANDED_EVENT = "mediassist-sidebar-expanded-change";

function readSidebarExpanded(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== null ? stored === "true" : true;
}

function subscribeSidebarExpanded(onStoreChange: () => void): () => void {
  window.addEventListener(SIDEBAR_EXPANDED_EVENT, onStoreChange);
  return () => window.removeEventListener(SIDEBAR_EXPANDED_EVENT, onStoreChange);
}

interface Props {
  sessions: ChatSession[];
  loading?: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleteSession: (id: string) => void;
  onClearAll?: () => void;
  user?: { name: string; email: string } | null;
  profileSummary?: string;
  onOpenProfile?: () => void;
  /** Mobile drawer: sidebar overlays chat instead of sitting inline. */
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type GroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

const GROUP_LABELS: Record<GroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "Previous 7 days",
  earlier: "Older",
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

function SidebarToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      title={expanded ? "Collapse sidebar" : "Expand sidebar"}
      className="size-9 shrink-0 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      {expanded ? (
        <PanelLeftClose className="size-[18px]" />
      ) : (
        <PanelLeftOpen className="size-[18px]" />
      )}
    </Button>
  );
}

function NewChatButton({
  expanded,
  onNew,
}: {
  expanded: boolean;
  onNew: () => void;
}) {
  if (expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onNew}
        className="h-10 w-full justify-start gap-2 rounded-lg border-sidebar-border bg-transparent px-3 text-sm font-normal shadow-none hover:bg-sidebar-accent"
      >
        <SquarePen className="size-4 shrink-0 opacity-80" />
        New chat
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onNew}
      aria-label="New chat"
      title="New chat"
      className="size-9 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <SquarePen className="size-[18px]" />
    </Button>
  );
}

export default function ChatHistorySidebar({
  sessions,
  loading = false,
  activeId,
  onSelect,
  onNew,
  onDeleteSession,
  onClearAll,
  user = null,
  profileSummary = "",
  onOpenProfile,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
}: Props) {
  const storedExpanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    readSidebarExpanded,
    () => true
  );
  const [sidebarReady, setSidebarReady] = useState(false);
  useEffect(() => setSidebarReady(true), []);
  const expanded = sidebarReady ? storedExpanded : true;
  const showExpanded = isMobile ? true : expanded;

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggle = useCallback(() => {
    if (isMobile) {
      onMobileClose?.();
      return;
    }
    const next = !readSidebarExpanded();
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(SIDEBAR_EXPANDED_EVENT));
  }, [isMobile, onMobileClose]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      if (isMobile) onMobileClose?.();
    },
    [onSelect, isMobile, onMobileClose]
  );

  const handleNew = useCallback(() => {
    onNew();
    if (isMobile) onMobileClose?.();
  }, [onNew, isMobile, onMobileClose]);

  const handleOpenProfile = useCallback(() => {
    onOpenProfile?.();
    if (isMobile) onMobileClose?.();
  }, [onOpenProfile, isMobile, onMobileClose]);

  const grouped = useMemo(() => {
    const groups: Record<GroupKey, ChatSession[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const s of sessions) {
      groups[getGroupKey(new Date(s.updatedAt))].push(s);
    }
    return groups;
  }, [sessions]);

  const renderExpandedRow = (s: ChatSession) => {
    const isActive = activeId === s.id;
    const label = sessionDisplayTitle(s);
    const tooltip = sessionTooltipTitle(s);
    return (
      <li key={s.id} className="group relative min-w-0">
        <button
          type="button"
          onClick={() => handleSelect(s.id)}
          title={tooltip !== label ? tooltip : undefined}
          className={cn(
            "flex h-8 min-w-0 w-full items-center rounded-md py-0 pl-2.5 pr-9 text-left text-[13px] leading-snug transition-colors",
            isActive
              ? "bg-sidebar-accent font-medium text-sidebar-foreground"
              : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70"
          )}
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <div className="pointer-events-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label={`Options for ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenId(menuOpenId === s.id ? null : s.id);
            }}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
          </div>
        </div>
        {menuOpenId === s.id ? (
          <div
            className="absolute right-2 top-full z-10 mt-0.5 min-w-[7.5rem] rounded-lg border border-border bg-card py-1 shadow-lg"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              onClick={() => {
                setMenuOpenId(null);
                setPendingDelete({ id: s.id, title: label });
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-[2px] md:hidden"
          aria-label="Close chat history"
          onClick={onMobileClose}
        />
      ) : null}
      <aside
        className={cn(
          "group/sidebar flex h-full min-h-0 flex-col border-border/60 bg-sidebar text-sidebar-foreground",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 z-40 w-[min(280px,88vw)] border-r shadow-xl transition-transform duration-200 ease-out md:hidden",
                mobileOpen
                  ? "translate-x-0"
                  : "-translate-x-full pointer-events-none"
              )
            : cn(
                "shrink-0 border-r transition-[width] duration-200 ease-out",
                showExpanded ? "w-[260px]" : "w-[52px] overflow-x-hidden"
              )
        )}
        aria-label="Chat history"
        aria-hidden={isMobile && !mobileOpen}
        inert={isMobile && !mobileOpen ? true : undefined}
        suppressHydrationWarning
        onClick={() => menuOpenId && setMenuOpenId(null)}
      >
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2 overflow-hidden p-2",
          !showExpanded && "items-center"
        )}
      >
        <div
          className={cn(
            "flex w-full items-center overflow-hidden",
            showExpanded ? "justify-between gap-1" : "flex-col"
          )}
        >
          <SidebarToggle
            expanded={isMobile ? true : expanded}
            onToggle={toggle}
          />
        </div>
        <NewChatButton expanded={showExpanded} onNew={handleNew} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {showExpanded ? (
          <div className="scrollbar-thin h-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 pb-2">
            {loading ? (
              <div
                className="flex flex-col items-center justify-center gap-2.5 px-4 py-12"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div
                  className="size-5 animate-spin rounded-full border-2 border-sidebar-accent border-t-primary/80"
                  aria-hidden
                />
                <p className="text-center text-xs font-medium tracking-wide text-muted-foreground">
                  Loading chats
                </p>
              </div>
            ) : sessions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No chats yet. Start with a new chat.
              </p>
            ) : (
              <div className="space-y-4">
                {(Object.keys(GROUP_LABELS) as GroupKey[]).map((key) => {
                  const group = grouped[key];
                  if (group.length === 0) return null;
                  return (
                    <div key={key}>
                      <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">
                        {GROUP_LABELS[key]}
                      </p>
                      <ul className="space-y-px">{group.map(renderExpandedRow)}</ul>
                    </div>
                  );
                })}
                {onClearAll ? (
                  <button
                    type="button"
                    className="mt-2 w-full px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmClearAll(true)}
                  >
                    Clear all chats
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {onOpenProfile ? (
        <div className="shrink-0 border-t border-border/60 p-2">
          <button
            type="button"
            onClick={handleOpenProfile}
            className={cn(
              "flex items-center rounded-lg transition-colors hover:bg-sidebar-accent",
              showExpanded
                ? "w-full gap-2.5 px-2 py-2"
                : "mx-auto size-9 shrink-0 justify-center"
            )}
            aria-label="Health profile"
            title={user ? user.name : "Health profile"}
          >
            {user ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-lavender text-[11px] font-semibold text-primary-foreground">
                {initials(user.name)}
              </span>
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-muted-foreground">
                <UserRound className="size-4" />
              </span>
            )}
            {showExpanded ? (
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium leading-tight">
                  {user ? user.name : "Health profile"}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {user
                    ? profileSummary || "Personalizes guidance"
                    : "Age, conditions, allergies…"}
                </span>
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      <Modal open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <h2 className="font-heading text-base font-semibold">Clear all chats?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every conversation will be removed
            {user ? " from this device and your account" : " from this device"}.
            This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line/60 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClearAll(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmClearAll(false);
              onClearAll?.();
            }}
          >
            Clear all
          </Button>
        </div>
      </Modal>

      <Modal
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <h2 className="font-heading text-base font-semibold">Delete this chat?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/90">
              {pendingDelete?.title ?? "This chat"}
            </span>{" "}
            will be removed from this device
            {user ? " and your account" : ""}. This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line/60 px-5 py-3 sm:px-6">
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
    </>
  );
}

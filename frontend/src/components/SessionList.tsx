"use client";

import { ChatSession } from "@/lib/types";
import { btnGhost, btnPrimarySm, card, cardHeader, sectionSubtitle, sectionTitle } from "@/lib/ui";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClear: () => void;
}

export default function SessionList({
  sessions,
  activeId,
  onSelect,
  onNew,
  onClear,
}: Props) {
  return (
    <aside className={`${card} flex max-h-[520px] flex-col lg:max-h-none lg:min-h-[480px]`}>
      <div className={`${cardHeader} flex items-center justify-between gap-2`}>
        <div>
          <p className={sectionSubtitle}>Chats</p>
          <h2 className={sectionTitle}>History</h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={onNew} className={btnPrimarySm}>
            New
          </button>
          {sessions.length > 0 && (
            <button type="button" onClick={onClear} className={btnGhost}>
              Clear
            </button>
          )}
        </div>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <li className="rounded-xl bg-sand/80 px-4 py-8 text-center">
            <p className="text-xs leading-relaxed text-stone">
              No saved chats yet.
              <br />
              Start a conversation to see history here.
            </p>
          </li>
        ) : (
          sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  activeId === s.id
                    ? "bg-brand/10 text-ink ring-2 ring-brand/25"
                    : "text-ink hover:bg-canvas"
                }`}
              >
                <span className="line-clamp-2 font-medium">{s.title}</span>
                <span className="mt-1 block text-xs text-stone">
                  {new Date(s.updatedAt).toLocaleString()}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}

"use client";

import { ChatSession } from "@/lib/types";

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
    <aside className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">History</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onNew}
            className="rounded-md bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700"
          >
            New
          </button>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-zinc-500">
            No saved chats yet
          </li>
        ) : (
          sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeId === s.id
                    ? "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="line-clamp-2 font-medium">{s.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">
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

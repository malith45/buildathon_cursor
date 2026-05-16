"use client";

import { ChatSession } from "@/lib/types";
import { sectionSubtitle, sectionTitle } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
    <Card className="flex max-h-[520px] flex-col shadow-[var(--shadow-card)] lg:max-h-none lg:min-h-[480px]">
      <CardHeader className="flex-row items-center justify-between gap-2 border-b">
        <div>
          <p className={sectionSubtitle}>Chats</p>
          <CardTitle className={sectionTitle}>History</CardTitle>
        </div>
        <CardAction className="col-start-auto row-start-auto flex shrink-0 gap-1.5 self-center">
          <Button type="button" size="sm" onClick={onNew}>
            New
          </Button>
          {sessions.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={onClear}>
              Clear
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-[380px] lg:h-[400px]">
          <ul className="space-y-1 p-3">
            {sessions.length === 0 ? (
              <li className="rounded-xl bg-muted/80 px-4 py-8 text-center">
                <p className="text-xs leading-relaxed text-muted-foreground">
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
                    className={cn(
                      "mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition",
                      activeId === s.id
                        ? "bg-primary/10 text-foreground ring-2 ring-primary/25"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="line-clamp-2 font-medium">{s.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {new Date(s.updatedAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

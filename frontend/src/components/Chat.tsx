"use client";

import { ChatMessage } from "@/lib/types";
import { sectionTitle } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FormEvent, useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";

const STARTERS = [
  "Fever and sore throat for 2 days",
  "Mild headache after exercise",
  "Rash that appeared this morning",
];

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
}

export default function Chat({ messages, onSend, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text || loading) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card className="flex min-h-[480px] flex-col shadow-[var(--shadow-card)]">
      <CardHeader className="border-b">
        <CardTitle className={sectionTitle}>Symptom chat</CardTitle>
        <CardDescription>
          Describe how you feel — we&apos;ll suggest next steps.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="min-h-[320px] flex-1 bg-canvas/50">
          <div className="space-y-3 p-5">
            {messages.length === 0 && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Share your symptoms in your own words. The more context you
                  give, the better the guidance.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="h-auto rounded-full px-3 py-1.5 text-left text-xs font-normal"
                      onClick={() => onSend(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "border bg-card text-card-foreground"
                )}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Getting guidance…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

      </CardContent>

      <CardFooter className="gap-3 border-t bg-card">
        <form onSubmit={handleSubmit} className="flex w-full gap-3">
          <Input
            ref={inputRef}
            name="message"
            disabled={loading}
            placeholder="Type your message…"
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

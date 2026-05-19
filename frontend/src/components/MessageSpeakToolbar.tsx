"use client";

import MessageSpeakButton from "@/components/MessageSpeakButton";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
  buttonClassName?: string;
}

/** Top-right read-aloud control row for chat bubbles and triage cards. */
export default function MessageSpeakToolbar({
  text,
  className,
  buttonClassName,
}: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end border-b border-line/50 px-2 py-1",
        className
      )}
    >
      <MessageSpeakButton text={text} className={buttonClassName} />
    </div>
  );
}

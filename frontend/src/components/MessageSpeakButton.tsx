"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const ACTIVE_EVENT = "mediassist-speech-active";

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function pickEnglishVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices();
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0]
  );
}

interface Props {
  text: string;
  className?: string;
}

export default function MessageSpeakButton({ text, className }: Props) {
  const instanceId = useId();
  const [speaking, setSpeaking] = useState(false);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    const onActive = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== instanceId) setSpeaking(false);
    };
    window.addEventListener(ACTIVE_EVENT, onActive);
    return () => {
      window.removeEventListener(ACTIVE_EVENT, onActive);
      const synth = getSynth();
      if (speaking) synth?.cancel();
    };
  }, [instanceId, speaking]);

  const stop = useCallback(() => {
    getSynth()?.cancel();
    setSpeaking(false);
    setWarming(false);
  }, []);

  const speak = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const synth = getSynth();
    if (!synth) {
      toast.error(
        "Read aloud unavailable",
        "Your browser does not support text-to-speech."
      );
      return;
    }

    if (speaking) {
      stop();
      return;
    }

    synth.cancel();
    window.dispatchEvent(new CustomEvent(ACTIVE_EVENT, { detail: instanceId }));

    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.rate = 0.95;
    utter.pitch = 1;

    const applyVoice = () => {
      const voice = pickEnglishVoice(synth);
      if (voice) utter.voice = voice;
    };
    applyVoice();
    if (synth.getVoices().length === 0) {
      setWarming(true);
      const onVoices = () => {
        applyVoice();
        setWarming(false);
        synth.removeEventListener("voiceschanged", onVoices);
      };
      synth.addEventListener("voiceschanged", onVoices);
    }

    const resumeTimer = window.setInterval(() => {
      if (!synth.speaking) {
        window.clearInterval(resumeTimer);
        return;
      }
      synth.pause();
      synth.resume();
    }, 10_000);

    const clearResume = () => window.clearInterval(resumeTimer);

    utter.onstart = () => {
      setWarming(false);
      setSpeaking(true);
    };
    utter.onend = () => {
      clearResume();
      setSpeaking(false);
    };
    utter.onerror = () => {
      clearResume();
      setSpeaking(false);
      setWarming(false);
    };

    synth.speak(utter);
  }, [text, speaking, stop, instanceId]);

  const busy = speaking || warming;
  const label = speaking ? "Stop reading aloud" : "Read aloud";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        className
      )}
      aria-label={label}
      title={label}
      onClick={speak}
      disabled={!text.trim()}
    >
      {warming && !speaking ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : speaking ? (
        <VolumeX className="size-4" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </Button>
  );
}

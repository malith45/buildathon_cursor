"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const ORDER: Mode[] = ["light", "dark", "system"];

const META: Record<Mode, { label: string; icon: typeof Sun }> = {
  light: { label: "Light mode", icon: Sun },
  dark: { label: "Dark mode", icon: Moon },
  system: { label: "System theme", icon: Monitor },
};

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: Mode = (theme as Mode) ?? "system";
  // Show the icon for the resolved theme so the icon matches the actual UI,
  // and we still cycle through the three modes on click.
  const displayMode: Mode =
    current === "system" ? ((resolvedTheme as Mode) ?? "light") : current;
  const { icon: Icon } = META[displayMode];

  function cycle() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={cycle}
      aria-label={`Switch theme (current: ${META[current].label})`}
      title={`${META[current].label} — click to switch`}
      className={cn("relative", className)}
      suppressHydrationWarning
    >
      {/* Render a placeholder before mount to avoid a hydration flash */}
      {mounted ? (
        <Icon className="size-4" />
      ) : (
        <span className="size-4" aria-hidden />
      )}
    </Button>
  );
}

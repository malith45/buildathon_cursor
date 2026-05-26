import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, { box: string; icon: string; name: string }> = {
  sm: {
    box: "size-8",
    icon: "size-4",
    name: "hidden sm:inline text-sm font-semibold",
  },
  md: {
    box: "size-9",
    icon: "size-4",
    name: "font-heading text-base font-semibold",
  },
  lg: {
    box: "size-11",
    icon: "size-5",
    name: "font-heading text-lg font-semibold",
  },
};

interface Props {
  showName?: boolean;
  size?: Size;
  className?: string;
}

/** In-app mark: gradient tile + pulse icon (no raster logo). */
export default function BrandLogo({
  showName = true,
  size = "sm",
  className,
}: Props) {
  const s = SIZE[size];
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm",
          s.box
        )}
        aria-hidden
      >
        <Activity className={s.icon} />
      </span>
      {showName ? (
        <span className={cn(s.name, "truncate text-foreground")}>{APP_NAME}</span>
      ) : null}
    </span>
  );
}

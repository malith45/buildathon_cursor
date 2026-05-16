"use client";

import { ComponentProps, forwardRef, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  icon: Icon,
  trailing,
  children,
}: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        {children}
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[11px] font-medium text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

interface IconInputProps
  extends Omit<ComponentProps<typeof Input>, "id" | "type"> {
  id: string;
  label: string;
  type?: ComponentProps<typeof Input>["type"];
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
}

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  function IconInput(
    { id, label, hint, error, icon: Icon, className, ...inputProps },
    ref
  ) {
    return (
      <FieldShell id={id} label={label} hint={hint} error={error} icon={Icon}>
        <Input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-10 text-sm",
            Icon && "pl-9",
            className
          )}
          {...inputProps}
        />
      </FieldShell>
    );
  }
);

interface PasswordInputProps
  extends Omit<ComponentProps<typeof Input>, "id" | "type"> {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { id, label, hint, error, icon: Icon, className, ...inputProps },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    return (
      <FieldShell
        id={id}
        label={label}
        hint={hint}
        error={error}
        icon={Icon}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
          >
            {visible ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        }
      >
        <Input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-10 pr-10 text-sm",
            Icon && "pl-9",
            className
          )}
          {...inputProps}
        />
      </FieldShell>
    );
  }
);

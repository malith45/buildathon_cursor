"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeNavigate } from "@/lib/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Activity, LogOut, User } from "lucide-react";

const NAV = [
  { href: "/", label: "Consult" },
  { href: "/profile", label: "Profile", auth: true },
] as const;

export default function AppHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const navigate = useSafeNavigate();

  function handleLogout() {
    logout();
    toast.info("Signed out");
    if (pathname !== "/") {
      navigate("/", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" />
          </span>
          <span className="hidden sm:inline">Calm Wellness</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            if ("auth" in item && item.auth && !user) return null;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({
                    variant: active ? "secondary" : "ghost",
                    size: "sm",
                  }),
                  active && "bg-primary/10 text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
                {user.name}
              </span>
              <Link
                href="/profile"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <User className="size-3.5" />
                Profile
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ size: "sm" })}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

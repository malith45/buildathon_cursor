"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeNavigate } from "@/lib/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { APP_NAME } from "@/lib/brand";
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
    <header className="sticky top-0 z-40 border-b border-line/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group/logo flex items-center gap-2.5 font-heading text-sm font-semibold text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm transition-transform group-hover/logo:scale-105">
            <Activity className="size-4" />
          </span>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
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

        <div className="ml-auto flex items-center gap-2">
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

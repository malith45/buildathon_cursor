"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeNavigate } from "@/lib/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { APP_NAME } from "@/lib/brand";
import ThemeToggle from "@/components/ThemeToggle";
import { Activity, LogOut, User } from "lucide-react";

const AUTH_ROUTES = new Set(["/login", "/signup"]);

export default function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navigate = useSafeNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const onAuthPage = AUTH_ROUTES.has(pathname);

  function performLogout() {
    setConfirmLogout(false);
    logout();
    toast.info("Signed out", "See you soon!");
    if (pathname !== "/") {
      navigate("/", { replace: true });
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-line/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group/logo flex items-center gap-2.5 font-heading text-sm font-semibold text-foreground"
            aria-label={`${APP_NAME} — home`}
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-primary to-lavender text-primary-foreground shadow-sm transition-transform group-hover/logo:scale-105">
              <Activity className="size-4" />
            </span>
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  href="/profile"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  title="Account & profile"
                >
                  <User className="size-3.5" />
                  <span className="hidden sm:inline">Account</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmLogout(true)}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </>
            ) : onAuthPage ? null : (
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

      <Modal open={confirmLogout} onOpenChange={setConfirmLogout}>
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LogOut className="size-4" />
          </div>
          <h2 className="font-heading text-base font-semibold">
            Sign out of {APP_NAME}?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can sign back in at any time — your chats and health profile
            stay safely in your account.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line/60 bg-muted/30 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmLogout(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={performLogout}>
            Yes, sign out
          </Button>
        </div>
      </Modal>
    </>
  );
}

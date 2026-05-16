"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center p-8">
        <Card className="w-full shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Log in to view and edit your saved health profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={buttonVariants()}>
              Log in
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: "outline" })}
            >
              Create account
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

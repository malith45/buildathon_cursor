"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Shared card chrome for login/signup. Brand mark, headline, body, footer.
 * Keeps both forms visually identical so the user feels no jolt switching
 * between them.
 */
export default function AuthPanel({ title, subtitle, children, footer }: Props) {
  return (
    <div className="animate-fade-up w-full max-w-md">
      <Link
        href="/"
        className="group/back mx-auto mb-5 flex w-fit transition-transform hover:scale-[1.02]"
        aria-label="Back to home"
      >
        <BrandLogo size="md" />
      </Link>

      <Card className="gap-0 overflow-hidden border-line/70 bg-card/95 py-0 shadow-(--shadow-card) backdrop-blur-sm">
        <div className="px-6 pt-6 sm:px-7 sm:pt-7">
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <CardContent className="px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
          {children}
        </CardContent>
        <div className="border-t border-line/60 bg-muted/30 px-6 py-3.5 sm:px-7">
          {footer}
        </div>
      </Card>
    </div>
  );
}

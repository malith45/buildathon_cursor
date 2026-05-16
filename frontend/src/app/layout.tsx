import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ShieldAlert } from "lucide-react";
import Providers from "@/components/Providers";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col"
        suppressHydrationWarning
      >
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-background"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed -bottom-24 left-0 -z-10 h-80 w-80 rounded-full bg-mint/15 blur-3xl"
          aria-hidden
        />
        <Providers>{children}</Providers>
        <footer className="mt-auto border-t border-line/60 bg-card/40 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1500px] flex-col items-center gap-1 text-center text-[11px] leading-relaxed">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldAlert
                className="size-3 shrink-0 text-lavender"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground/80">
                  Not medical advice.
                </span>{" "}
                In an emergency, call your local emergency number.
              </span>
            </p>
            <p className="text-muted-foreground/70">
              {APP_NAME} · Built by team{" "}
              <span className="font-medium text-foreground/70">Mcee</span> ·
              Educational use only
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

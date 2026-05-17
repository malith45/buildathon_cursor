import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import { BOOTSTRAP_SCRIPT } from "@/lib/bootstrap-script";
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
        className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
        suppressHydrationWarning
      >
        {/* First body child: theme + extension cleanup. Not in <head> — avoids hydration mismatch when AV extensions rewrite head scripts. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }}
        />
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
      </body>
    </html>
  );
}

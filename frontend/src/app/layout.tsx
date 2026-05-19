import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <Script
          src="/mediassist-hydration-guard.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/mediassist-theme-init.js"
          strategy="beforeInteractive"
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-background"
          aria-hidden
          suppressHydrationWarning
        />
        <div
          className="pointer-events-none fixed -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
          suppressHydrationWarning
        />
        <div
          className="pointer-events-none fixed -bottom-24 left-0 -z-10 h-80 w-80 rounded-full bg-mint/15 blur-3xl"
          aria-hidden
          suppressHydrationWarning
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

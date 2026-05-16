import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Health & Care Decision System",
  description:
    "Gemini-powered health triage, care guidance, and education — not medical advice.",
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
      style={{ colorScheme: "light" }}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[#fafaf7]"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-[#5b6cff]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed -bottom-24 left-0 -z-10 h-80 w-80 rounded-full bg-[#3ed6a0]/15 blur-3xl"
          aria-hidden
        />
        {children}
        <footer className="mt-auto border-t border-line/60 bg-white/50 px-4 py-5 text-center text-xs text-stone backdrop-blur-sm">
          Educational use only · Gemini runs on the backend only
        </footer>
      </body>
    </html>
  );
}

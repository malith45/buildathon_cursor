import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import "./globals.css";

// Strips attributes that browser extensions (Bitdefender TrafficLight, AdGuard,
// Wappalyzer, etc.) inject into the SSR HTML before React hydrates. Without
// this, every page render emits a "tree hydrated but some attributes... didn't
// match" console warning in dev. Production unaffected — Next never logs
// hydration warnings there — but the dev noise is annoying and obscures real
// bugs. The script is inlined synchronously as the first body child so it runs
// before any content-script timing.
const EXTENSION_ATTR_STRIPPER = `
(function() {
  var KILL = ['bis_skin_checked','bis_register','data-extension-installed','data-darkreader-inline-color','data-darkreader-inline-bgcolor'];
  function strip(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = KILL.length - 1; i >= 0; i--) {
      if (el.hasAttribute(KILL[i])) el.removeAttribute(KILL[i]);
    }
  }
  function walk(root) {
    strip(root);
    if (root.querySelectorAll) {
      var els = root.querySelectorAll('[' + KILL.join('],[') + ']');
      for (var i = 0; i < els.length; i++) strip(els[i]);
    }
  }
  try { walk(document.documentElement); } catch(e) {}
  if (typeof MutationObserver !== 'undefined') {
    try {
      new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'attributes') strip(m.target);
          for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
      }).observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: KILL
      });
    } catch(e) {}
  }
})();
`;

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
        className="flex h-dvh min-h-0 flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{ __html: EXTENSION_ATTR_STRIPPER }}
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

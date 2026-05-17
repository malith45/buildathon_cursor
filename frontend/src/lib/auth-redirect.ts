/**
 * Full-page navigation after auth — avoids Next.js dev/HMR cases where
 * deferred router.push/replace does not leave /login or /signup.
 */
export function authRedirect(href: string): void {
  if (typeof window === "undefined") return;
  window.location.replace(href);
}

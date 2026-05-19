/** Bump when welcome copy changes so users see the new dialog once. */
const DISMISS_VALUE = "2";

const KEY = "mediassist-onboarding-dismissed";

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) === DISMISS_VALUE;
}

export function dismissOnboarding(): void {
  localStorage.setItem(KEY, DISMISS_VALUE);
}

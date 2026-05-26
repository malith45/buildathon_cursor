const FROM_HEADER_KEY = "mediassist-profile-from-header";

export function markProfileFromHeader(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FROM_HEADER_KEY, "1");
}

export function consumeProfileFromHeader(): boolean {
  if (typeof window === "undefined") return false;
  const v = sessionStorage.getItem(FROM_HEADER_KEY);
  sessionStorage.removeItem(FROM_HEADER_KEY);
  return v === "1";
}

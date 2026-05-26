export const OPEN_PROFILE_DRAWER_EVENT = "mediassist-open-profile-drawer";

export function dispatchOpenProfileDrawer(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_DRAWER_EVENT));
}

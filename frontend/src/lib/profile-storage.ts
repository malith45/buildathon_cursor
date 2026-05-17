import { DEFAULT_PROFILE, HealthProfile, normalizeHealthProfile } from "./types";

const STORAGE_KEY = "healthcare_profile";

function profileKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

export function loadProfile(userId?: string | null): HealthProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(profileKey(userId));
    if (!raw) return DEFAULT_PROFILE;
    return normalizeHealthProfile(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(
  profile: HealthProfile,
  userId?: string | null
): void {
  localStorage.setItem(profileKey(userId), JSON.stringify(profile));
}

export function clearProfile(userId?: string | null): void {
  localStorage.removeItem(profileKey(userId));
}

import {
  clearAllSessions,
  loadSessions,
  saveSessions,
  upsertSession,
} from "@/lib/chat-storage";
import { loadProfile, saveProfile } from "@/lib/profile-storage";
import { ChatSession, DEFAULT_PROFILE, HealthProfile } from "@/lib/types";

/** True when the guest edited profile beyond factory defaults. */
export function guestProfileDiffersFromDefault(profile: HealthProfile): boolean {
  const d = DEFAULT_PROFILE;
  return (
    profile.ageRange !== d.ageRange ||
    profile.gender !== d.gender ||
    profile.pregnant !== d.pregnant ||
    profile.medications.trim() !== d.medications ||
    profile.conditions.length > 0 ||
    profile.allergies.length > 0
  );
}

/** Merge guest localStorage chats into the account namespace (newest first). */
export function mergeGuestSessionsIntoAccount(userId: string): ChatSession[] {
  const guest = loadSessions(null);
  if (guest.length === 0) return loadSessions(userId);

  let merged = loadSessions(userId);
  for (const session of guest) {
    merged = upsertSession(merged, session);
  }
  saveSessions(merged, userId);
  clearAllSessions(null);
  return merged;
}

/** Prefer guest-edited profile over server default when signing in. */
export function resolveProfileAfterAuth(
  serverProfile: HealthProfile,
  userId: string
): HealthProfile {
  const guest = loadProfile(null);
  if (!guestProfileDiffersFromDefault(guest)) {
    return serverProfile;
  }
  saveProfile(guest, userId);
  return guest;
}

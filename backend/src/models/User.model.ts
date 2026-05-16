import type { HealthProfile } from "./HealthProfile.model";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  healthProfile: HealthProfile;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  healthProfile: HealthProfile;
  createdAt: string;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    healthProfile: user.healthProfile,
    createdAt: user.createdAt,
  };
}

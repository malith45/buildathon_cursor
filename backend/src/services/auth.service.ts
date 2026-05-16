import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import type { HealthProfile } from "../models/HealthProfile.model";
import {
  toPublicUser,
  type PublicUser,
  type UserRecord,
} from "../models/User.model";

const usersById = new Map<string, UserRecord>();
const usersByEmail = new Map<string, UserRecord>();

const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  ageRange: "25-34",
  conditions: [],
  allergies: [],
  medications: "",
};

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.AUTH_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.AUTH_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    throw new AuthError("Invalid or expired session", 401);
  }
}

export async function signup(
  email: string,
  password: string,
  name: string
): Promise<{ user: PublicUser; token: string }> {
  const normalized = email.trim().toLowerCase();
  if (usersByEmail.has(normalized)) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: UserRecord = {
    id: randomUUID(),
    email: normalized,
    passwordHash,
    name: name.trim(),
    healthProfile: { ...DEFAULT_HEALTH_PROFILE },
    createdAt: new Date().toISOString(),
  };

  usersById.set(user.id, user);
  usersByEmail.set(normalized, user);

  return { user: toPublicUser(user), token: signToken(user.id) };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string }> {
  const normalized = email.trim().toLowerCase();
  const user = usersByEmail.get(normalized);
  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password", 401);
  }

  return { user: toPublicUser(user), token: signToken(user.id) };
}

export function getUserById(id: string): PublicUser | null {
  const user = usersById.get(id);
  return user ? toPublicUser(user) : null;
}

export function updateUserProfile(
  id: string,
  updates: { name?: string; healthProfile?: HealthProfile }
): PublicUser {
  const user = usersById.get(id);
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  if (updates.name !== undefined) {
    user.name = updates.name.trim();
  }
  if (updates.healthProfile !== undefined) {
    user.healthProfile = updates.healthProfile;
  }

  return toPublicUser(user);
}

import { parseApiError } from "./api-error";
import { getToken } from "./auth-storage";
import {
  normalizeHealthProfile,
  type AuthResponse,
  type HealthProfile,
  type User,
} from "./types";

function normalizeUser(user: User): User {
  return {
    ...user,
    healthProfile: normalizeHealthProfile(user.healthProfile),
  };
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return parseApiError(data);
}

export async function signup(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AuthResponse>;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as AuthResponse;
  return { ...data, user: normalizeUser(data.user) };
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { user: User };
  return normalizeUser(data.user);
}

export async function updateProfile(updates: {
  name?: string;
  healthProfile?: HealthProfile;
}): Promise<User> {
  const res = await fetch(`${BASE}/api/auth/profile`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { user: User };
  return normalizeUser(data.user);
}

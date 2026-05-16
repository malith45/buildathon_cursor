import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  AuthError,
  getUserById,
  login,
  signup,
  updateUserProfile,
} from "../services/auth.service";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  healthProfile: z
    .object({
      ageRange: z.string(),
      sex: z.string().optional(),
      conditions: z.array(z.string()),
      allergies: z.array(z.string()),
      medications: z.string(),
      pregnant: z.boolean().optional(),
    })
    .optional(),
});

export async function postSignup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = signupSchema.parse(req.body);
    const result = await signup(body.email, body.password, body.name);
    res.status(201).json(result);
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email, body.password);
    res.json(result);
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

export function getMe(req: Request, res: Response): void {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
}

export async function patchProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = profileSchema.parse(req.body);
    const user = updateUserProfile(req.userId!, body);
    res.json({ user });
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

function handleAuthError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }
  next(err);
}

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const decisionRequestSchema = z.object({
  profile: z.object({
    ageRange: z.string().min(1),
    sex: z.string().optional(),
    conditions: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    medications: z.string().default(""),
    pregnant: z.boolean().optional(),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().min(1),
      })
    )
    .min(1),
});

export type ValidatedDecisionRequest = z.infer<typeof decisionRequestSchema>;

export function validateDecisionRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = decisionRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: result.error.flatten(),
    });
    return;
  }
  res.locals.validatedBody = result.data;
  next();
}

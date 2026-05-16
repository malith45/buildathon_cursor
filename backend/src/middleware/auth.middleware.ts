import { Request, Response, NextFunction } from "express";
import { AuthError, verifyToken } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.userId = verifyToken(header.slice(7));
    next();
  } catch (err) {
    const message =
      err instanceof AuthError ? err.message : "Authentication required";
    res.status(401).json({ error: message });
  }
}

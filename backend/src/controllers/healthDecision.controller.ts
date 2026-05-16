import { Request, Response, NextFunction } from "express";
import { assertGeminiKey } from "../config/env";
import { ValidatedDecisionRequest } from "../middleware/validateRequest";
import { healthDecisionService } from "../services/healthDecision.service";
import { toHealthDecisionView } from "../views/healthDecision.view";

export async function postHealthDecision(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    assertGeminiKey();
    const body = res.locals.validatedBody as ValidatedDecisionRequest;
    const decision = await healthDecisionService.decide(
      body.profile,
      body.messages
    );
    res.json(toHealthDecisionView(decision));
  } catch (err) {
    next(err);
  }
}

import { Router } from "express";
import { postHealthDecision } from "../controllers/healthDecision.controller";
import { validateDecisionRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/decision", validateDecisionRequest, postHealthDecision);

export default router;

import { Router } from "express";
import {
  getMe,
  patchProfile,
  postLogin,
  postSignup,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", postSignup);
router.post("/login", postLogin);
router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, patchProfile);

export default router;

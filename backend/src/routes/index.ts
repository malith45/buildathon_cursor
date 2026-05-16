import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);

export default router;

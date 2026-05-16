import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/health", healthRoutes);

export default router;

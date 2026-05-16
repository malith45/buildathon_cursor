import express from "express";
import cors from "cors";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  })
);
app.use(express.json());

app.use("/api", apiRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend running at http://localhost:${env.PORT}`);
});

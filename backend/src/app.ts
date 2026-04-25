import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { rateLimit } from "express-rate-limit";

import { authRouter } from "./modules/auth/auth.routes";
import { myResultsRouter } from "./modules/my-results/my-results.routes";
import { importRouter } from "./modules/my-results/import.routes";
import { publicProfilesRouter } from "./modules/public-profiles/public-profiles.routes";

export function createApp() {
  const app = express();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Muitas requisições. Tente novamente em alguns minutos." },
  });

  app.use(cors());
  app.use(express.json());
  app.use(limiter);
  app.use("/certificates", express.static(path.resolve(process.cwd(), "src/uploads/certificates")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/me/results", importRouter);
  app.use("/me/results", myResultsRouter);
  app.use("/public", publicProfilesRouter);
  app.use(publicProfilesRouter); // monta /me/profile no root

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  });

  return app;
}

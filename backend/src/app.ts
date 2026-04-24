import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { rateLimit } from "express-rate-limit";

import { authRouter } from "./modules/auth/auth.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { checkpointsRouter } from "./modules/checkpoints/checkpoints.routes";
import { registrationsRouter } from "./modules/registrations/registrations.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { timingRouter } from "./modules/timing/timing.routes";
import { resultsRouter } from "./modules/results/results.routes";
import { medicalRouter } from "./modules/medical/medical.routes";
import { appealsRouter } from "./modules/appeals/appeals.routes";
import { myResultsRouter } from "./modules/my-results/my-results.routes";

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

  // Routes mounted with their own prefixes
  app.use("/auth", authRouter);
  app.use("/events", eventsRouter);
  app.use("/payments", paymentsRouter);
  app.use("/timing", timingRouter);
  app.use("/appeals", appealsRouter);
  app.use("/me/results", myResultsRouter);

  // Routes whose paths span multiple prefixes are mounted at root
  app.use(categoriesRouter);
  app.use(checkpointsRouter);
  app.use(registrationsRouter);
  app.use(resultsRouter);
  app.use(medicalRouter);

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  });

  return app;
}

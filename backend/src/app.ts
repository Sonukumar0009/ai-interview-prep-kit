import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import authRoutes from "./routes/authRoutes";
import kitRoutes from "./routes/kitRoutes";

export function createApp(): Express {
  const app = express();

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions",
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      },
    })
  );

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/kits", kitRoutes);

  // Error handler must be registered LAST, after all routes
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    });
  });

  return app;
}
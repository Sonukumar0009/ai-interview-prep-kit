import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "You must be logged in to do this" },
    });
    return;
  }
  next();
}
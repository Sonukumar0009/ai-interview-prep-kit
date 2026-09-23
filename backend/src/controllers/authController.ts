import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { registerSchema, loginSchema } from "../utils/authSchemas";

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
    return;
  }

  const { email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({
      error: { code: "EMAIL_TAKEN", message: "An account with this email already exists" },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });

  req.session.userId = user._id.toString();
  res.status(201).json({ id: user._id, email: user.email });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
    return;
  }

  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
    return;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
    return;
  }

  req.session.userId = user._id.toString();
  res.status(200).json({ id: user._id, email: user.email });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        error: { code: "LOGOUT_FAILED", message: "Failed to log out" },
      });
      return;
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out" });
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.session.userId).select("email");
  if (!user) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }
  res.status(200).json({ id: user._id, email: user.email });
}
import mongoose, { Schema, Document, Model } from "mongoose";
import { Kit as KitData } from "../services/validation/kitSchema";
import crypto from "crypto";

export type KitStatus = "pending" | "generating" | "completed" | "failed";

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;
  status: KitStatus;
  inputHash: string;
  input: {
    jobDescription: string;
    companyUrl: string;
    daysAvailable: number;
  };
  kit: KitData | null;
  researchCache: {
    companyName: string;
    pages: { url: string; title: string; text: string }[];
    researchContext: string;
  } | null;
  warnings: string[];
  error: { code: string; message: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema = new Schema<IKit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "generating", "completed", "failed"],
      default: "pending",
      required: true,
    },
    inputHash: { type: String, required: true, index: true },
    input: {
      jobDescription: { type: String, required: true },
      companyUrl: { type: String, required: true },
      daysAvailable: { type: Number, required: true },
    },
    kit: { type: Schema.Types.Mixed, default: null },
    researchCache: { type: Schema.Types.Mixed, default: null },
    warnings: { type: [String], default: [] },
    error: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

/**
 * Deterministic hash of (userId, jobDescription, companyUrl, daysAvailable),
 * used to detect duplicate submissions per Section 10 ("the same
 * description and company are submitted twice"). Scoped per-user so two
 * different users pasting the same JD don't collide.
 */
export function computeInputHash(
  userId: string,
  jobDescription: string,
  companyUrl: string,
  daysAvailable: number
): string {
  const normalized = `${userId}::${jobDescription.trim()}::${companyUrl.trim().toLowerCase()}::${daysAvailable}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export const Kit: Model<IKit> = mongoose.model<IKit>("Kit", KitSchema);
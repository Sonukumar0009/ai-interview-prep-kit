import { Request, Response } from "express";
import { Kit, computeInputHash } from "../models/Kit";
import { createKitSchema } from "../utils/kitSchemas";
import { generateKit } from "../services/kitOrchestrator";

/**
 * Runs the pipeline in the background and updates the kit document when
 * done. Not awaited by the request handler — the client polls status via
 * GET /api/kits/:id instead (Section 13: generation is slow and
 * failure-prone, so the interface needs to show progress rather than hold
 * a request open for ~90 seconds).
 */
async function runGenerationInBackground(kitId: string): Promise<void> {
  try {
    const kitDoc = await Kit.findById(kitId);
    if (!kitDoc) return;

    kitDoc.status = "generating";
    await kitDoc.save();

    const result = await generateKit(
      kitDoc.input.jobDescription,
      kitDoc.input.companyUrl,
      kitDoc.input.daysAvailable
    );

    if (result.ok && result.kit) {
      kitDoc.status = "completed";
      kitDoc.kit = result.kit;
      kitDoc.warnings = result.warnings;
      kitDoc.error = null;
    } else {
      kitDoc.status = "failed";
      kitDoc.error = result.error || { code: "UNKNOWN", message: "Kit generation failed" };
      kitDoc.warnings = result.warnings;
    }

    await kitDoc.save();
  } catch (err) {
    // Defensive: catch anything unexpected so a thrown error in the
    // background task doesn't leave the kit stuck in "generating" forever.
    const kitDoc = await Kit.findById(kitId);
    if (kitDoc) {
      kitDoc.status = "failed";
      kitDoc.error = { code: "INTERNAL_ERROR", message: (err as Error).message };
      await kitDoc.save();
    }
  }
}

export async function createKit(req: Request, res: Response): Promise<void> {
  const parsed = createKitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
    });
    return;
  }

  const { jobDescription, companyUrl, daysAvailable } = parsed.data;
  const userId = req.session.userId!;
  const inputHash = computeInputHash(userId, jobDescription, companyUrl, daysAvailable);

  // Idempotency (Section 10): if this exact input was already submitted by
  // this user and did not fail, return the existing kit instead of
  // starting a redundant generation run.
  const existing = await Kit.findOne({ userId, inputHash, status: { $ne: "failed" } });
  if (existing) {
    res.status(200).json({ id: existing._id, status: existing.status, duplicate: true });
    return;
  }

  const kitDoc = await Kit.create({
    userId,
    status: "pending",
    inputHash,
    input: { jobDescription, companyUrl, daysAvailable },
    kit: null,
    warnings: [],
    error: null,
  });

  // Fire-and-forget: intentionally not awaited so the request returns
  // immediately with the kit id for the client to poll.
  runGenerationInBackground(kitDoc._id.toString());

  res.status(202).json({ id: kitDoc._id, status: kitDoc.status });
}

export async function listKits(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const kits = await Kit.find({ userId })
    .select("status input.jobDescription input.companyUrl input.daysAvailable createdAt updatedAt")
    .sort({ createdAt: -1 });
  res.status(200).json(kits);
}

export async function getKit(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });

  if (!kitDoc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }

  res.status(200).json(kitDoc);
}

export async function deleteKit(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const result = await Kit.deleteOne({ _id: req.params.id, userId });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }

  res.status(200).json({ message: "Kit deleted" });
}
import { Request, Response } from "express";
import { Kit } from "../models/Kit";

/**
 * Records how confident the user felt about one flashcard (Section 7).
 * confidence: 1 = low, 2 = medium, 3 = high.
 */
export async function recordConfidence(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const flashcardId = req.params.flashcardId as string;
  const { confidence } = req.body;

  if (![1, 2, 3].includes(confidence)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "confidence must be 1, 2, or 3" } });
    return;
  }

  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });
  if (!kitDoc || !kitDoc.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }

  const cardExists = kitDoc.kit.flashcards.some((f) => f.id === flashcardId);
  if (!cardExists) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Flashcard not found in this kit" } });
    return;
  }

  kitDoc.practiceState = {
    ...kitDoc.practiceState,
    [flashcardId]: { confidence, lastReviewedAt: new Date().toISOString() },
  };
  await kitDoc.save();

  res.status(200).json({ flashcardId, confidence, practiceState: kitDoc.practiceState });
}

/**
 * Returns flashcards ordered for the next practice session: cards never
 * reviewed come first (nothing is known about them, so they need
 * attention), then reviewed cards sorted by lowest confidence first. This
 * is the "confidence-weighted sort" Section 7 explicitly allows as a
 * valid choice over a full spaced-repetition interval system.
 */
export async function getPracticeOrder(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });

  if (!kitDoc || !kitDoc.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }

  const practiceState = kitDoc.practiceState || {};

  const ordered = [...kitDoc.kit.flashcards].sort((a, b) => {
    const aState = practiceState[a.id];
    const bState = practiceState[b.id];

    if (!aState && !bState) return 0;
    if (!aState) return -1; // never-reviewed cards come first
    if (!bState) return 1;

    return aState.confidence - bState.confidence; // lowest confidence first
  });

  const covered = Object.keys(practiceState).length;
  const total = kitDoc.kit.flashcards.length;

  res.status(200).json({
    flashcards: ordered,
    practiceState,
    coverage: { covered, total },
  });
}
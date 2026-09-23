import { Request, Response } from "express";
import { Kit } from "../models/Kit";
import * as mutations from "../services/kitMutations";
import { QuestionCategory } from "../services/validation/questionSchema";
import { kitSchema, Kit as KitData } from "../services/validation/kitSchema";

/**
 * Shared helper: loads a kit the user owns and is in "completed" status
 * (editing only makes sense on a finished kit), applies a mutator
 * function to its kit.kit content, validates the result against
 * Appendix A before saving, and persists it. Centralizing this keeps
 * every edit endpoint consistently authorized, validated, and atomic.
 */
async function withKit(
  req: Request,
  res: Response,
  mutator: (kitData: KitData) => Promise<KitData> | KitData
): Promise<void> {
  const userId = req.session.userId!;
  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });

  if (!kitDoc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }
  if (kitDoc.status !== "completed" || !kitDoc.kit) {
    res.status(409).json({ error: { code: "KIT_NOT_READY", message: "Kit is not yet generated or failed to generate" } });
    return;
  }

  try {
    const updatedKitData = await mutator(kitDoc.kit as KitData);
    const validated = kitSchema.safeParse(updatedKitData);
    if (!validated.success) {
      res.status(500).json({
        error: { code: "STRUCTURE_VALIDATION_FAILED", message: "Edit produced an invalid kit structure" },
      });
      return;
    }
    kitDoc.kit = validated.data;
    await kitDoc.save();
    res.status(200).json(kitDoc.kit);
  } catch (err) {
    res.status(500).json({ error: { code: "MUTATION_FAILED", message: (err as Error).message } });
  }
}

export async function patchQuestion(req: Request, res: Response): Promise<void> {
  const questionId = req.params.questionId as string;
  const updates: Record<string, unknown> = {};
  if (req.body.prompt !== undefined) updates.prompt = req.body.prompt;
  if (req.body.answer_outline !== undefined) updates.answer_outline = req.body.answer_outline;
  if (req.body.difficulty !== undefined) updates.difficulty = req.body.difficulty;
  if (req.body.category !== undefined) updates.category = req.body.category;
  await withKit(req, res, (kit) => mutations.editQuestion(kit, questionId, updates));
}

export async function postQuestion(req: Request, res: Response): Promise<void> {
  const { requirement_ids, category, prompt, answer_outline, difficulty } = req.body;
  if (!Array.isArray(requirement_ids) || !category || !prompt || !answer_outline || ![1, 2, 3].includes(difficulty)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Missing or invalid question fields" } });
    return;
  }
  await withKit(req, res, (kit) =>
    mutations.addManualQuestion(kit, { requirement_ids, category, prompt, answer_outline, difficulty })
  );
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  const questionId = req.params.questionId as string;
  await withKit(req, res, (kit) => mutations.deleteQuestion(kit, questionId));
}

export async function reorderQuestions(req: Request, res: Response): Promise<void> {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "orderedIds must be an array" } });
    return;
  }
  await withKit(req, res, (kit) => mutations.reorderQuestions(kit, orderedIds));
}

export async function patchFlashcard(req: Request, res: Response): Promise<void> {
  const flashcardId = req.params.flashcardId as string;
  const updates: Record<string, unknown> = {};
  if (req.body.front !== undefined) updates.front = req.body.front;
  if (req.body.back !== undefined) updates.back = req.body.back;
  await withKit(req, res, (kit) => mutations.editFlashcard(kit, flashcardId, updates));
}

export async function postFlashcard(req: Request, res: Response): Promise<void> {
  const { front, back, requirement_ids } = req.body;
  if (!front || !back || !Array.isArray(requirement_ids)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Missing or invalid flashcard fields" } });
    return;
  }
  await withKit(req, res, (kit) => mutations.addManualFlashcard(kit, { front, back, requirement_ids }));
}

export async function deleteFlashcard(req: Request, res: Response): Promise<void> {
  const flashcardId = req.params.flashcardId as string;
  await withKit(req, res, (kit) => mutations.deleteFlashcard(kit, flashcardId));
}

export async function patchCompanyBrief(req: Request, res: Response): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (req.body.summary !== undefined) updates.summary = req.body.summary;
  if (req.body.what_they_do !== undefined) updates.what_they_do = req.body.what_they_do;
  await withKit(req, res, (kit) => mutations.editCompanyBrief(kit, updates));
}

export async function regenerateQuestionCategory(req: Request, res: Response): Promise<void> {
  const category = req.params.category as QuestionCategory;
  const validCategories: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid question category" } });
    return;
  }

  const userId = req.session.userId!;
  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });
  if (!kitDoc || kitDoc.status !== "completed" || !kitDoc.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found or not ready" } });
    return;
  }

  const researchContext = kitDoc.researchCache?.researchContext || "";

  await withKit(req, res, (kit) => mutations.regenerateQuestionCategory(kit, category, researchContext));
}

export async function regenerateCompanyBrief(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const kitDoc = await Kit.findOne({ _id: req.params.id, userId });
  if (!kitDoc || kitDoc.status !== "completed" || !kitDoc.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found or not ready" } });
    return;
  }

  const pages = (kitDoc.researchCache?.pages || []).map((p) => ({ ...p, links: [] }));

  await withKit(req, res, (kit) => mutations.regenerateCompanyBrief(kit, pages));
}

export async function regenerateSchedule(req: Request, res: Response): Promise<void> {
  const { daysAvailable } = req.body;
  if (typeof daysAvailable !== "number" || daysAvailable < 1 || daysAvailable > 60) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "daysAvailable must be between 1 and 60" } });
    return;
  }
  await withKit(req, res, (kit) => mutations.regenerateSchedule(kit, daysAvailable));
}
import { Router } from "express";
import { createKit, listKits, getKit, deleteKit } from "../controllers/kitController";
import {
  patchQuestion,
  postQuestion,
  deleteQuestion,
  reorderQuestions,
  patchFlashcard,
  postFlashcard,
  deleteFlashcard,
  patchCompanyBrief,
  regenerateQuestionCategory,
  regenerateCompanyBrief,
  regenerateSchedule,
} from "../controllers/kitEditController";
import { requireAuth } from "../middleware/requireAuth";
import { recordConfidence, getPracticeOrder } from "../controllers/practiceController";

const router = Router();

router.use(requireAuth);

router.post("/", createKit);
router.get("/", listKits);
router.get("/:id", getKit);
router.delete("/:id", deleteKit);

router.patch("/:id/questions/reorder", reorderQuestions);
router.patch("/:id/questions/:questionId", patchQuestion);
router.post("/:id/questions", postQuestion);
router.delete("/:id/questions/:questionId", deleteQuestion);

router.patch("/:id/flashcards/:flashcardId", patchFlashcard);
router.post("/:id/flashcards", postFlashcard);
router.delete("/:id/flashcards/:flashcardId", deleteFlashcard);

router.patch("/:id/company-brief", patchCompanyBrief);

router.post("/:id/regenerate/questions/:category", regenerateQuestionCategory);
router.post("/:id/regenerate/company-brief", regenerateCompanyBrief);
router.post("/:id/regenerate/schedule", regenerateSchedule);

router.get("/:id/practice", getPracticeOrder);
router.post("/:id/practice/:flashcardId/confidence", recordConfidence);

export default router;
import { Kit as KitData } from "./validation/kitSchema";
import { Question, QuestionCategory, ItemState } from "./validation/questionSchema";
import { Flashcard } from "./validation/flashcardSchema";
import { buildSchedule } from "./scheduling/scheduleAllocator";
import { checkCoverage } from "./validation/coverageChecker";
import { generateQuestionsForRequirement } from "./generation/questionGenerator";
import { generateFlashcardForRequirement } from "./generation/flashcardGenerator";
import { generateCompanyBrief } from "./generation/companyBriefGenerator";
import { FetchedPage } from "./retrieval/pageFetcher";

/**
 * Recomputes the schedule from the kit's current question set and
 * coverage from current requirements/questions. Called after every
 * mutation so schedule.days[].question_ids and coverage never drift out
 * of sync with the actual content — this is the core answer to "how you
 * represent generated, edited and pinned state": state lives on each
 * question/flashcard, but the schedule and coverage summary are always
 * DERIVED fresh from current content rather than mutated incrementally,
 * which eliminates an entire class of staleness bugs.
 */
function resync(kit: KitData): KitData {
  const schedule = buildSchedule(kit.role.requirements, kit.questions, kit.schedule.days_available);
  const coverage = checkCoverage(kit.role.requirements, kit.questions);
  return {
    ...kit,
    schedule,
    coverage: { uncovered_requirement_ids: coverage.uncoveredRequirementIds, passes: kit.coverage.passes },
  };
}

export function editQuestion(kit: KitData, questionId: string, updates: Partial<Pick<Question, "prompt" | "answer_outline" | "difficulty" | "category">>): KitData {
  const questions = kit.questions.map((q) => {
    if (q.id !== questionId) return q;
    const nextState: ItemState = q.state === "manual" ? "manual" : "edited";
    return { ...q, ...updates, state: nextState };
  });
  return resync({ ...kit, questions });
}

export function editFlashcard(kit: KitData, flashcardId: string, updates: Partial<Pick<Flashcard, "front" | "back">>): KitData {
  const flashcards = kit.flashcards.map((f) => {
    if (f.id !== flashcardId) return f;
    const nextState: ItemState = f.state === "manual" ? "manual" : "edited";
    return { ...f, ...updates, state: nextState };
  });
  return { ...kit, flashcards };
}

export function editCompanyBrief(kit: KitData, updates: Partial<KitData["company_brief"]>): KitData {
  return { ...kit, company_brief: { ...kit.company_brief, ...updates } };
}

export function reorderQuestions(kit: KitData, orderedIds: string[]): KitData {
  const byId = new Map(kit.questions.map((q) => [q.id, q]));
  const missing = kit.questions.filter((q) => !orderedIds.includes(q.id));
  const reordered = orderedIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  return resync({ ...kit, questions: [...reordered, ...missing] });
}

function nextManualId(prefix: string, existingIds: string[]): string {
  let n = 1;
  let candidate = `${prefix}-manual-${n}`;
  while (existingIds.includes(candidate)) {
    n++;
    candidate = `${prefix}-manual-${n}`;
  }
  return candidate;
}

export function addManualQuestion(
  kit: KitData,
  input: { requirement_ids: string[]; category: QuestionCategory; prompt: string; answer_outline: string; difficulty: 1 | 2 | 3 }
): KitData {
  const id = nextManualId("q", kit.questions.map((q) => q.id));
  const newQuestion: Question = { id, ...input, state: "manual" };
  return resync({ ...kit, questions: [...kit.questions, newQuestion] });
}

export function addManualFlashcard(kit: KitData, input: { front: string; back: string; requirement_ids: string[] }): KitData {
  const id = nextManualId("f", kit.flashcards.map((f) => f.id));
  const newFlashcard: Flashcard = { id, ...input, state: "manual" };
  return { ...kit, flashcards: [...kit.flashcards, newFlashcard] };
}

export function deleteQuestion(kit: KitData, questionId: string): KitData {
  const questions = kit.questions.filter((q) => q.id !== questionId);
  return resync({ ...kit, questions });
}

export function deleteFlashcard(kit: KitData, flashcardId: string): KitData {
  const flashcards = kit.flashcards.filter((f) => f.id !== flashcardId);
  return { ...kit, flashcards };
}

/**
 * Regenerates ONLY the "generated" questions within a single category,
 * leaving "edited" and "manual" questions in that category (and all
 * questions in other categories) completely untouched. This is the core
 * of Section 6's requirement: "a question the user wrote or edited by
 * hand must survive a regeneration of its category."
 */
export async function regenerateQuestionCategory(
  kit: KitData,
  category: QuestionCategory,
  researchContext: string
): Promise<KitData> {
  const toRegenerate = kit.questions.filter((q) => q.category === category && q.state === "generated");
  const toKeep = kit.questions.filter((q) => !(q.category === category && q.state === "generated"));

  // Group by unique requirement so each requirement triggers exactly ONE
  // generation call, regardless of how many old "generated" questions it
  // previously had — avoids doubling up when a requirement had multiple
  // generated questions in this category.
  const requirementIdsToRegenerate = Array.from(
    new Set(toRegenerate.flatMap((q) => q.requirement_ids))
  );

  const regeneratedGroups = await Promise.all(
    requirementIdsToRegenerate.map(async (reqId) => {
      const requirement = kit.role.requirements.find((r) => r.id === reqId);
      const oldQuestionsForThisReq = toRegenerate.filter((q) => q.requirement_ids.includes(reqId));
      if (!requirement) return oldQuestionsForThisReq; // requirement no longer exists; keep old questions as-is defensively

      const idPrefix = `${requirement.id}-regen-${Date.now()}`;
      const result = await generateQuestionsForRequirement(requirement, researchContext, idPrefix);
      return result.ok && result.questions.length > 0 ? result.questions : oldQuestionsForThisReq;
    })
  );

  const questions = [...toKeep, ...regeneratedGroups.flat()];
  return resync({ ...kit, questions });
}

/**
 * Regenerates the company brief from cached crawled pages. Only replaces
 * the brief if it is currently in "generated" state at the kit level —
 * since company_brief has no per-field state, we treat ANY prior manual
 * edit as pinning the whole brief, tracked by the caller (kitController)
 * checking a simple heuristic before calling this.
 */
export async function regenerateCompanyBrief(kit: KitData, pages: FetchedPage[]): Promise<KitData> {
  const result = await generateCompanyBrief(pages);
  if (!result.ok || !result.brief) return kit;
  return { ...kit, company_brief: result.brief };
}

/**
 * Regenerates the schedule using the current question set and a possibly
 * new days_available value. Always safe to call since the schedule is a
 * pure derived view (see resync above).
 */
export function regenerateSchedule(kit: KitData, daysAvailable: number): KitData {
  const schedule = buildSchedule(kit.role.requirements, kit.questions, daysAvailable);
  return { ...kit, schedule };
}
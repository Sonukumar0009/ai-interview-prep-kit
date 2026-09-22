import { callGroq } from "./groqClient";
import { flashcardsGenerationSchema, Flashcard } from "../validation/flashcardSchema";
import { Requirement } from "../validation/requirementSchema";

const FLASHCARDS_PER_REQUIREMENT = 1;
const DELAY_BETWEEN_CALLS_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYSTEM_PROMPT = `You generate a single flashcard for one interview-prep requirement.

Rules:
- Generate exactly ${FLASHCARDS_PER_REQUIREMENT} flashcard for the requirement given to you.
- "front" is a short prompt/question/term (quiz-style).
- "back" is a concise answer (a few sentences max, not an essay).
- "requirement_ids" must contain only the id of the requirement given to you.
- Output strict JSON only, no extra commentary:

{"flashcards":[{"id":"fX","front":"...","back":"...","requirement_ids":["rX"]}]}`;

export async function generateFlashcardForRequirement(
  requirement: Requirement,
  idPrefix: string
): Promise<{ ok: boolean; flashcards: Flashcard[]; error?: { code: string; message: string } }> {
  const userPrompt = `Requirement:\nid: ${requirement.id}\ntext: "${requirement.text}"\nkind: ${requirement.kind}\n\nUse id "${idPrefix}" for the flashcard.`;

  const result = await callGroq(SYSTEM_PROMPT, userPrompt);

  if (!result.ok || !result.content) {
    return { ok: false, flashcards: [], error: result.error || { code: "UNKNOWN", message: "No response from model" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    return { ok: false, flashcards: [], error: { code: "INVALID_JSON", message: "Model did not return valid JSON" } };
  }

  const validated = flashcardsGenerationSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, flashcards: [], error: { code: "SCHEMA_MISMATCH", message: "Model output did not match expected flashcard structure" } };
  }

  const flashcards = validated.data.flashcards.map((f) => ({ ...f, requirement_ids: [requirement.id] }));
  return { ok: true, flashcards };
}

export async function generateFlashcardsForRequirements(
  requirements: Requirement[]
): Promise<{ flashcards: Flashcard[]; errors: { requirementId: string; error: { code: string; message: string } }[] }> {
  const allFlashcards: Flashcard[] = [];
  const errors: { requirementId: string; error: { code: string; message: string } }[] = [];

  for (let i = 0; i < requirements.length; i++) {
    const requirement = requirements[i];
    const result = await generateFlashcardForRequirement(requirement, `f${i + 1}`);

    if (result.ok) {
      allFlashcards.push(...result.flashcards);
    } else if (result.error) {
      errors.push({ requirementId: requirement.id, error: result.error });
    }

    if (i < requirements.length - 1) {
      await delay(DELAY_BETWEEN_CALLS_MS);
    }
  }

  return { flashcards: allFlashcards, errors };
}
import { Requirement } from "../validation/requirementSchema";
import { Question } from "../validation/questionSchema";
import { checkCoverage } from "../validation/coverageChecker";
import { generateQuestionsForRequirement } from "./questionGenerator";

const MAX_COVERAGE_PASSES = 3;
const DELAY_BETWEEN_CALLS_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CoverageLoopResult {
  questions: Question[];
  uncoveredRequirementIds: string[];
  passesRun: number;
  gapFillErrors: { requirementId: string; error: { code: string; message: string } }[];
}

/**
 * Runs the coverage check-and-fill loop described in Section 4: after the
 * first draft of questions, any MUST requirement with no covering question
 * is a gap. We regenerate questions for exactly those gapped requirements
 * (not a full re-run) and re-check, up to MAX_COVERAGE_PASSES times.
 *
 * We cap passes rather than looping until zero gaps forever because a
 * requirement can genuinely be un-coverable by this model on this data
 * (e.g. vague/contradictory text) — an unbounded loop would burn the
 * free-tier token budget chasing something that will not resolve. Three
 * passes (one initial + two gap-fill attempts) is a defensible balance:
 * it gives the loop real room to succeed while keeping total LLM calls
 * bounded per kit. Any requirement still uncovered after the cap is
 * reported honestly in coverage.uncovered_requirement_ids rather than
 * silently dropped or fabricated a fit for.
 */
export async function runCoverageLoop(
  requirements: Requirement[],
  initialQuestions: Question[],
  researchContext: string
): Promise<CoverageLoopResult> {
  let questions = [...initialQuestions];
  let passesRun = 1; // the initial generation pass already happened before this loop
  const gapFillErrors: CoverageLoopResult["gapFillErrors"] = [];

  let coverage = checkCoverage(requirements, questions);

  while (coverage.uncoveredRequirementIds.length > 0 && passesRun < MAX_COVERAGE_PASSES) {
    const gappedRequirements = requirements.filter((r) => coverage.uncoveredRequirementIds.includes(r.id));

    for (let i = 0; i < gappedRequirements.length; i++) {
      const requirement = gappedRequirements[i];
      const idPrefix = `${requirement.id}-gap${passesRun}`;
      const result = await generateQuestionsForRequirement(requirement, researchContext, idPrefix);

      if (result.ok) {
        questions.push(...result.questions);
      } else if (result.error) {
        gapFillErrors.push({ requirementId: requirement.id, error: result.error });
      }

      if (i < gappedRequirements.length - 1) {
        await delay(DELAY_BETWEEN_CALLS_MS);
      }
    }

    passesRun += 1;
    coverage = checkCoverage(requirements, questions);
  }

  return {
    questions,
    uncoveredRequirementIds: coverage.uncoveredRequirementIds,
    passesRun,
    gapFillErrors,
  };
}
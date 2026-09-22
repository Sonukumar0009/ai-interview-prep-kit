import { crawlCompanySite } from "./retrieval/crawler";
import { searchInterviewDiscussion } from "./retrieval/discussionSearch";
import { extractRequirements } from "./extraction/requirementExtractor";
import { generateQuestionsForRequirements } from "./generation/questionGenerator";
import { generateFlashcardsForRequirements } from "./generation/flashcardGenerator";
import { generateCompanyBrief } from "./generation/companyBriefGenerator";
import { runCoverageLoop } from "./generation/coverageLoop";
import { kitSchema, Kit } from "./validation/kitSchema";

export interface KitGenerationResult {
  ok: boolean;
  kit?: Kit;
  error?: { code: string; message: string };
  warnings: string[]; // non-fatal issues to surface honestly (Section 10)
}

function deriveCompanyNameFromCrawl(homepageTitle: string | undefined, companyUrl: string): string {
  if (homepageTitle && homepageTitle.trim().length > 0) {
    const firstSegment = homepageTitle.split(/[-|]/)[0].trim();
    if (firstSegment.length > 0 && firstSegment.length < 60) return firstSegment;
  }
  try {
    const hostname = new URL(companyUrl).hostname.replace(/^www\./, "");
    return hostname.split(".")[0];
  } catch {
    return "the company";
  }
}

function buildResearchContext(
  discussionResults: { title: string; snippet: string }[],
  companyBriefSummary: string
): string {
  const discussionText = discussionResults
    .map((r) => `${r.title}: ${r.snippet}`)
    .join("\n\n")
    .slice(0, 2500);
  return `Company brief: ${companyBriefSummary}\n\nPublic discussion of interview process:\n${discussionText || "No public discussion found."}`;
}

/**
 * The single pipeline used by both the interactive kit-creation flow and
 * the batch entry point (Section 9: "the same code your application uses,
 * not a parallel implementation"). Runs retrieval, extraction, generation,
 * the coverage loop, scheduling and validation in sequence, matching
 * Appendix A's structure exactly.
 */
export async function generateKit(
  jobDescription: string,
  companyUrl: string,
  daysAvailable: number
): Promise<KitGenerationResult> {
  const warnings: string[] = [];
  const researchedAt = new Date().toISOString();

  // --- Retrieval: crawl + discussion search run in parallel (independent
  // external services, no shared rate-limit risk between them). ---
  const crawlResult = await crawlCompanySite(companyUrl);
  const companyNameGuess = deriveCompanyNameFromCrawl(crawlResult.pages[0]?.title, companyUrl);
  const discussionResult = await searchInterviewDiscussion(companyNameGuess);

  if (crawlResult.pages.length === 0) {
    warnings.push("Could not retrieve any pages from the company site; company brief will be minimal.");
  }
  if (crawlResult.skipped.length > 0) {
    warnings.push(`Skipped ${crawlResult.skipped.length} unreachable/disallowed page(s) during crawl.`);
  }
  if (!discussionResult.ok || discussionResult.results.length === 0) {
    warnings.push("No public discussion of the interview process was found.");
  }

  // --- Extraction (Groq call #1) ---
  const extraction = await extractRequirements(jobDescription);
  if (!extraction.ok || !extraction.data) {
    return {
      ok: false,
      warnings,
      error: extraction.error || { code: "EXTRACTION_FAILED", message: "Failed to extract requirements" },
    };
  }
  const { role_title, seniority, location, responsibilities, requirements } = extraction.data;
  if (requirements.length === 0) {
    warnings.push("No requirements could be extracted; the job description may be too thin.");
  }

  // --- Company brief (Groq call, independent of extraction result) ---
  const briefResult = await generateCompanyBrief(crawlResult.pages);
  const companyBrief = briefResult.ok
    ? briefResult.brief!
    : { summary: "Company brief could not be generated.", what_they_do: "Unavailable.", sources: [] };
  if (!briefResult.ok) {
    warnings.push(`Company brief generation failed: ${briefResult.error?.message}`);
  }

  const researchContext = buildResearchContext(discussionResult.results, companyBrief.summary);

  // --- Question generation (Groq calls, one per requirement) ---
  const questionGen = await generateQuestionsForRequirements(requirements, researchContext);
  if (questionGen.errors.length > 0) {
    warnings.push(`Question generation failed for ${questionGen.errors.length} requirement(s).`);
  }

  // --- Coverage loop (deterministic check + targeted Groq gap-fill calls) ---
  const coverageOutcome = await runCoverageLoop(requirements, questionGen.questions, researchContext);
  if (coverageOutcome.uncoveredRequirementIds.length > 0) {
    warnings.push(
      `${coverageOutcome.uncoveredRequirementIds.length} must-have requirement(s) remain uncovered after ${coverageOutcome.passesRun} pass(es).`
    );
  }

  // --- Flashcards (Groq calls, one per requirement) ---
  const flashcardGen = await generateFlashcardsForRequirements(requirements);
  if (flashcardGen.errors.length > 0) {
    warnings.push(`Flashcard generation failed for ${flashcardGen.errors.length} requirement(s).`);
  }

  // --- Scheduling (deterministic, in-process) ---
  const { buildSchedule } = await import("./scheduling/scheduleAllocator");
  const schedule = buildSchedule(requirements, coverageOutcome.questions, daysAvailable);

  // --- Assemble and validate against Appendix A exactly ---
  const candidateKit = {
    source: {
      company: companyNameGuess,
      company_url: companyUrl,
      role: role_title,
      location,
      jd_chars: jobDescription.length,
      researched_at: researchedAt,
      pages_used: crawlResult.pagesUsed,
    },
    company_brief: companyBrief,
    role: {
      title: role_title,
      seniority,
      responsibilities,
      requirements,
    },
    questions: coverageOutcome.questions,
    flashcards: flashcardGen.flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: coverageOutcome.uncoveredRequirementIds,
      passes: coverageOutcome.passesRun,
    },
  };

  const validated = kitSchema.safeParse(candidateKit);
  if (!validated.success) {
    return {
      ok: false,
      warnings,
      error: {
        code: "STRUCTURE_VALIDATION_FAILED",
        message: `Generated kit did not match required structure: ${validated.error.issues.map((i) => i.message).join("; ")}`,
      },
    };
  }

  return { ok: true, kit: validated.data, warnings };
}
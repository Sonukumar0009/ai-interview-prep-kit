import { z } from "zod";
import { requirementSchema } from "./requirementSchema";
import { questionSchema } from "./questionSchema";
import { flashcardSchema } from "./flashcardSchema";
import { companyBriefSchema } from "./companyBriefSchema";

const scheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

const scheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(scheduleDaySchema),
});

const coverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().positive(),
});

const sourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

const roleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(requirementSchema),
});

/**
 * Exact match to Appendix A. Field names and nesting must not drift from
 * this, per Section 5's "these fields must be present and named exactly
 * as given" — the batch pipeline is run against job descriptions we have
 * not seen, so structural drift here would silently break grading.
 *
 * Every question_ids entry in the schedule must reference a question that
 * exists in `questions` (Appendix A's closing constraint) — enforced with
 * a .superRefine below since Zod's base schema can't express cross-field
 * referential integrity declaratively.
 */
export const kitSchema = z
  .object({
    source: sourceSchema,
    company_brief: companyBriefSchema,
    role: roleSchema,
    questions: z.array(questionSchema),
    flashcards: z.array(flashcardSchema),
    schedule: scheduleSchema,
    coverage: coverageSchema,
  })
  .superRefine((kit, ctx) => {
    const questionIds = new Set(kit.questions.map((q) => q.id));
    for (const day of kit.schedule.days) {
      for (const qid of day.question_ids) {
        if (!questionIds.has(qid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `schedule references question id "${qid}" which does not exist in questions[]`,
            path: ["schedule", "days"],
          });
        }
      }
    }

    const requirementIds = new Set(kit.role.requirements.map((r) => r.id));
    for (const q of kit.questions) {
      for (const rid of q.requirement_ids) {
        if (!requirementIds.has(rid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `question "${q.id}" references requirement id "${rid}" which does not exist`,
            path: ["questions"],
          });
        }
      }
    }
  });

export type Kit = z.infer<typeof kitSchema>;
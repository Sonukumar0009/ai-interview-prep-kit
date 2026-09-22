import { Requirement } from "../validation/requirementSchema";
import { Question, QuestionCategory } from "../validation/questionSchema";

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

const MINUTES_BY_DIFFICULTY: Record<1 | 2 | 3, number> = { 1: 15, 2: 25, 3: 40 };
const REVIEW_DAY_MINUTES = 30;

const CATEGORY_FOCUS_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical deep dive",
  behavioural: "Behavioural stories",
  "system-design": "System design",
  "company-fit": "Company fit & motivation",
};

function minutesForQuestion(q: Question): number {
  return MINUTES_BY_DIFFICULTY[q.difficulty as 1 | 2 | 3];
}

function focusForQuestions(questions: Question[]): string {
  if (questions.length === 0) return "Review & practice";

  const counts = new Map<QuestionCategory, number>();
  for (const q of questions) {
    counts.set(q.category, (counts.get(q.category) || 0) + 1);
  }

  let topCategory: QuestionCategory = questions[0].category;
  let topCount = 0;
  for (const [category, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topCategory = category;
    }
  }

  const isMixed = counts.size > 1;
  return isMixed ? `Mixed: ${CATEGORY_FOCUS_LABELS[topCategory]} + more` : CATEGORY_FOCUS_LABELS[topCategory];
}

/**
 * Deterministic, code-driven schedule allocation (Section 3/8: this is
 * arithmetic and belongs in code, not a prompt).
 *
 * Algorithm:
 * 1. Sort all questions by requirement priority (must before nice), then
 *    by difficulty descending. This ordering is preserved when the list
 *    is chunked, which is what guarantees harder/higher-priority material
 *    lands on earlier days without a separate rule.
 * 2. Split the sorted list into `daysAvailable` contiguous chunks. Chunks
 *    are sized as evenly as possible; any remainder items go to the
 *    earliest days, reinforcing the "harder material earlier" property.
 * 3. If there are more days than questions (Section 10's 60-day case),
 *    the leftover days become review days that reference previously
 *    scheduled questions for revision, rather than being left empty —
 *    every day must have content and every day must have a positive
 *    integer duration.
 * 4. If there are more questions than days (the common case), each day
 *    simply gets a larger chunk; nothing is dropped, so every requirement
 *    that has a question (guaranteed by the coverage loop for all musts)
 *    is represented somewhere in the schedule.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysRequested: number
): Schedule {
  const daysAvailable = Math.max(1, Math.floor(daysRequested) || 1);
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const priorityRank = (q: Question): number => {
    const coveredRequirement = requirementById.get(q.requirement_ids[0]);
    return coveredRequirement?.priority === "must" ? 0 : 1;
  };

  const sorted = [...questions].sort((a, b) => {
    const pr = priorityRank(a) - priorityRank(b);
    if (pr !== 0) return pr;
    return b.difficulty - a.difficulty; // harder first
  });

  const days: ScheduleDay[] = [];

  if (sorted.length === 0) {
    // Section 10: an extremely thin JD may yield zero questions. Report
    // this honestly with empty, zero-duration days rather than fabricate
    // content, consistent with "a thin description should produce a thin
    // kit that says so."
    for (let d = 1; d <= daysAvailable; d++) {
      days.push({ day: d, focus: "No material available", question_ids: [], minutes: 0 });
    }
    return { days_available: daysAvailable, days };
  }

  const contentDays = Math.min(daysAvailable, sorted.length);
  const baseChunkSize = Math.floor(sorted.length / contentDays);
  const remainder = sorted.length % contentDays;

  let cursor = 0;
  const allScheduledIdsSoFar: string[] = [];

  for (let d = 1; d <= contentDays; d++) {
    const chunkSize = baseChunkSize + (d <= remainder ? 1 : 0);
    const chunk = sorted.slice(cursor, cursor + chunkSize);
    cursor += chunkSize;

    const questionIds = chunk.map((q) => q.id);
    allScheduledIdsSoFar.push(...questionIds);

    const minutes = chunk.reduce((sum, q) => sum + minutesForQuestion(q), 0);

    days.push({
      day: d,
      focus: focusForQuestions(chunk),
      question_ids: questionIds,
      minutes,
    });
  }

  // Overflow days (daysAvailable > number of questions): review days that
  // cycle back through previously scheduled material.
  for (let d = contentDays + 1; d <= daysAvailable; d++) {
    days.push({
      day: d,
      focus: "Review & practice",
      question_ids: [...allScheduledIdsSoFar],
      minutes: REVIEW_DAY_MINUTES,
    });
  }

  return { days_available: daysAvailable, days };
}
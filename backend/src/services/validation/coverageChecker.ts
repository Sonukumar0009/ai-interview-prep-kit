import { Requirement } from "./requirementSchema";
import { Question } from "./questionSchema";

export interface CoverageResult {
  uncoveredRequirementIds: string[];
}

export function checkCoverage(requirements: Requirement[], questions: Question[]): CoverageResult {
  const coveredIds = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) {
      coveredIds.add(rid);
    }
  }

  const uncoveredRequirementIds = requirements
    .filter((r) => r.priority === "must")
    .filter((r) => !coveredIds.has(r.id))
    .map((r) => r.id);

  return { uncoveredRequirementIds };
}
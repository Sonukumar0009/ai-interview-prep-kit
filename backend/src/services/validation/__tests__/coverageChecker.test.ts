import { describe, it, expect } from "vitest";
import { checkCoverage } from "../coverageChecker";
import { Requirement } from "../requirementSchema";
import { Question } from "../questionSchema";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function q(id: string, requirementIds: string[]): Question {
  return {
    id,
    requirement_ids: requirementIds,
    category: "technical",
    prompt: "p",
    answer_outline: "a",
    difficulty: 1,
  };
}

describe("checkCoverage", () => {
  it("returns no gaps when every must requirement has a question", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
  });

  it("flags a must requirement with zero questions", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual(["r2"]);
  });

  it("does not flag nice requirements even when uncovered", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [q("q1", ["r1"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
  });

  it("treats a requirement as covered if any question references it, even among multiple ids", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1", "r2"])];
    const result = checkCoverage(requirements, questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
  });

  it("returns all must ids as gaps when there are no questions at all", () => {
    const requirements = [req("r1"), req("r2")];
    const result = checkCoverage(requirements, []);
    expect(result.uncoveredRequirementIds).toEqual(["r1", "r2"]);
  });
});
import { describe, it, expect } from "vitest";
import { buildSchedule } from "../scheduleAllocator";
import { Requirement } from "../../validation/requirementSchema";
import { Question } from "../../validation/questionSchema";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `req ${id}`, kind: "technical", priority };
}

function q(id: string, requirementId: string, difficulty: 1 | 2 | 3, category: Question["category"] = "technical"): Question {
  return { id, requirement_ids: [requirementId], category, prompt: "p", answer_outline: "a", difficulty };
}

describe("buildSchedule", () => {
  it("produces exactly the number of days requested", () => {
    const requirements = [req("r1")];
    const questions = [q("q1", "r1", 1)];
    const schedule = buildSchedule(requirements, questions, 5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days_available).toBe(5);
  });

  it("includes every question somewhere in the schedule", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [q("q1", "r1", 1), q("q2", "r2", 2), q("q3", "r3", 3)];
    const schedule = buildSchedule(requirements, questions, 3);
    const allIds = schedule.days.flatMap((d) => d.question_ids);
    expect(allIds).toEqual(expect.arrayContaining(["q1", "q2", "q3"]));
  });

  it("puts higher-difficulty questions on earlier days", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q_easy", "r1", 1), q("q_hard", "r2", 3)];
    const schedule = buildSchedule(requirements, questions, 2);
    expect(schedule.days[0].question_ids).toContain("q_hard");
    expect(schedule.days[1].question_ids).toContain("q_easy");
  });

  it("puts must-priority questions on earlier days than nice-priority ones", () => {
    const requirements = [req("r1", "nice"), req("r2", "must")];
    const questions = [q("q_nice", "r1", 3), q("q_must", "r2", 1)];
    const schedule = buildSchedule(requirements, questions, 2);
    expect(schedule.days[0].question_ids).toContain("q_must");
    expect(schedule.days[1].question_ids).toContain("q_nice");
  });

  it("handles a 1-day schedule by putting everything on day 1", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", "r1", 1), q("q2", "r2", 2)];
    const schedule = buildSchedule(requirements, questions, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids).toEqual(expect.arrayContaining(["q1", "q2"]));
  });

  it("fills overflow days with review content when days exceed questions", () => {
    const requirements = [req("r1")];
    const questions = [q("q1", "r1", 1)];
    const schedule = buildSchedule(requirements, questions, 5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days[4].focus).toBe("Review & practice");
    expect(schedule.days[4].question_ids).toContain("q1");
    expect(schedule.days[4].minutes).toBeGreaterThan(0);
  });

  it("returns integer minutes for every day", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", "r1", 2), q("q2", "r2", 3)];
    const schedule = buildSchedule(requirements, questions, 2);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("handles zero questions honestly rather than fabricating content", () => {
    const schedule = buildSchedule([], [], 3);
    expect(schedule.days).toHaveLength(3);
    expect(schedule.days.every((d) => d.question_ids.length === 0)).toBe(true);
    expect(schedule.days.every((d) => d.minutes === 0)).toBe(true);
  });
});
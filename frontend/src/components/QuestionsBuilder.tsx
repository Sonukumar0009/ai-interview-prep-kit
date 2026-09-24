"use client";

import { useState } from "react";
import { kitApi, ApiError } from "@/lib/api";
import { FullKit, Question, CATEGORIES, CATEGORY_LABELS } from "@/lib/kitTypes";

const STATE_BADGE: Record<Question["state"], string> = {
  generated: "bg-gray-100 text-gray-600",
  edited: "bg-yellow-100 text-yellow-700",
  manual: "bg-blue-100 text-blue-700",
};

function QuestionCard({
  kitId,
  question,
  onUpdate,
  onMove,
  isFirst,
  isLast,
}: {
  kitId: string;
  question: Question;
  onUpdate: (kit: FullKit) => void;
  onMove: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answer_outline);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const updated = await kitApi.patchQuestion(kitId, question.id, {
        prompt,
        answer_outline: answerOutline,
        difficulty,
      });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this question?")) return;
    setBusy(true);
    try {
      const updated = await kitApi.deleteQuestion(kitId, question.id);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-md p-3 mb-2 bg-white">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_BADGE[question.state]}`}>
          {question.state}
        </span>
        <div className="flex items-center gap-1 text-gray-400">
          <button onClick={() => onMove("up")} disabled={isFirst || busy} className="disabled:opacity-30 px-1">
            ↑
          </button>
          <button onClick={() => onMove("down")} disabled={isLast || busy} className="disabled:opacity-30 px-1">
            ↓
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <textarea
            value={answerOutline}
            onChange={(e) => setAnswerOutline(e.target.value)}
            rows={3}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={1}>Difficulty 1 (warm-up)</option>
            <option value={2}>Difficulty 2 (standard)</option>
            <option value={3}>Difficulty 3 (advanced)</option>
          </select>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="bg-black text-white text-xs rounded px-3 py-1">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium mb-1">{question.prompt}</p>
          <p className="text-xs text-gray-600 whitespace-pre-line mb-2">{question.answer_outline}</p>
          <div className="flex gap-3 text-xs">
            <button onClick={() => setEditing(true)} className="underline">
              Edit
            </button>
            <button onClick={remove} disabled={busy} className="underline text-red-600">
              Delete
            </button>
            <span className="text-gray-400">Difficulty {question.difficulty}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AddQuestionForm({
  kitId,
  category,
  requirementIds,
  onAdded,
  onClose,
}: {
  kitId: string;
  category: Question["category"];
  requirementIds: string[];
  onAdded: (kit: FullKit) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [requirementId, setRequirementId] = useState(requirementIds[0] || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!prompt || !answerOutline || !requirementId) {
      setError("Prompt, answer outline, and requirement are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await kitApi.addQuestion(kitId, {
        requirement_ids: [requirementId],
        category,
        prompt,
        answer_outline: answerOutline,
        difficulty,
      });
      onAdded(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-dashed rounded-md p-3 mb-2 bg-gray-50 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Question prompt"
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <textarea
        value={answerOutline}
        onChange={(e) => setAnswerOutline(e.target.value)}
        placeholder="Answer outline"
        rows={2}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <select
          value={requirementId}
          onChange={(e) => setRequirementId(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {requirementIds.map((rid) => (
            <option key={rid} value={rid}>
              {rid}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={1}>Difficulty 1</option>
          <option value={2}>Difficulty 2</option>
          <option value={3}>Difficulty 3</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="bg-black text-white text-xs rounded px-3 py-1">
          Add
        </button>
        <button onClick={onClose} className="text-xs text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function QuestionsBuilder({ kitId, kit, onUpdate }: { kitId: string; kit: FullKit; onUpdate: (kit: FullKit) => void }) {
  const [addingCategory, setAddingCategory] = useState<Question["category"] | null>(null);
  const [regeneratingCategory, setRegeneratingCategory] = useState<Question["category"] | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);

  const requirementIds = kit.role.requirements.map((r) => r.id);

  async function regenerateCategory(category: Question["category"]) {
    setRegeneratingCategory(category);
    setRegenError(null);
    try {
      const updated = await kitApi.regenerateQuestionCategory(kitId, category);
      onUpdate(updated);
    } catch (err) {
      setRegenError(err instanceof ApiError ? err.message : "Failed to regenerate category.");
    } finally {
      setRegeneratingCategory(null);
    }
  }

  async function moveQuestion(category: Question["category"], index: number, direction: "up" | "down") {
    const inCategory = kit.questions.filter((q) => q.category === category);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= inCategory.length) return;

    const reordered = [...inCategory];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

    const otherCategories = kit.questions.filter((q) => q.category !== category);
    const fullOrderedIds = [...otherCategories, ...reordered].map((q) => q.id);

    try {
      const updated = await kitApi.reorderQuestions(kitId, fullOrderedIds);
      onUpdate(updated);
    } catch (err) {
      setRegenError(err instanceof ApiError ? err.message : "Failed to reorder.");
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Questions</h2>
      {regenError && <p className="text-sm text-red-600 mb-2">{regenError}</p>}

      {CATEGORIES.map((category) => {
        const inCategory = kit.questions.filter((q) => q.category === category);
        if (inCategory.length === 0 && addingCategory !== category) return null;

        return (
          <div key={category} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{CATEGORY_LABELS[category]}</h3>
              <div className="flex gap-3 text-xs">
                <button onClick={() => setAddingCategory(category)} className="underline">
                  + Add
                </button>
                <button
                  onClick={() => regenerateCategory(category)}
                  disabled={regeneratingCategory === category}
                  className="underline disabled:opacity-50"
                >
                  {regeneratingCategory === category ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>

            {inCategory.map((q, idx) => (
              <QuestionCard
                key={q.id}
                kitId={kitId}
                question={q}
                onUpdate={onUpdate}
                onMove={(dir) => moveQuestion(category, idx, dir)}
                isFirst={idx === 0}
                isLast={idx === inCategory.length - 1}
              />
            ))}

            {addingCategory === category && (
              <AddQuestionForm
                kitId={kitId}
                category={category}
                requirementIds={requirementIds}
                onAdded={onUpdate}
                onClose={() => setAddingCategory(null)}
              />
            )}
          </div>
        );
      })}

      {addingCategory === null && (
        <div className="flex gap-3 text-xs mt-2">
          {CATEGORIES.filter((c) => kit.questions.every((q) => q.category !== c)).map((c) => (
            <button key={c} onClick={() => setAddingCategory(c)} className="underline text-gray-500">
              + Add {CATEGORY_LABELS[c]} question
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
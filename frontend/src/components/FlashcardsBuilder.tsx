"use client";

import { useState } from "react";
import { kitApi, ApiError } from "@/lib/api";
import { FullKit, Flashcard } from "@/lib/kitTypes";

const STATE_BADGE: Record<Flashcard["state"], string> = {
  generated: "bg-gray-100 text-gray-600",
  edited: "bg-yellow-100 text-yellow-700",
  manual: "bg-blue-100 text-blue-700",
};

function FlashcardCard({
  kitId,
  card,
  onUpdate,
}: {
  kitId: string;
  card: Flashcard;
  onUpdate: (kit: FullKit) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const updated = await kitApi.patchFlashcard(kitId, card.id, { front, back });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this flashcard?")) return;
    setBusy(true);
    try {
      const updated = await kitApi.deleteFlashcard(kitId, card.id);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_BADGE[card.state]}`}>{card.state}</span>
      </div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      {editing ? (
        <div className="space-y-2">
          <input
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Front"
          />
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Back"
          />
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
          <p className="text-sm font-medium">{card.front}</p>
          <p className="text-xs text-gray-600 mt-1">{card.back}</p>
          <div className="flex gap-3 text-xs mt-2">
            <button onClick={() => setEditing(true)} className="underline">
              Edit
            </button>
            <button onClick={remove} disabled={busy} className="underline text-red-600">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddFlashcardForm({
  kitId,
  requirementIds,
  onAdded,
  onClose,
}: {
  kitId: string;
  requirementIds: string[];
  onAdded: (kit: FullKit) => void;
  onClose: () => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [requirementId, setRequirementId] = useState(requirementIds[0] || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!front || !back || !requirementId) {
      setError("Front, back, and requirement are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await kitApi.addFlashcard(kitId, { front, back, requirement_ids: [requirementId] });
      onAdded(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add flashcard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-dashed rounded-md p-3 bg-gray-50 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        value={front}
        onChange={(e) => setFront(e.target.value)}
        placeholder="Front"
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <textarea
        value={back}
        onChange={(e) => setBack(e.target.value)}
        placeholder="Back"
        rows={2}
        className="w-full border rounded px-2 py-1 text-sm"
      />
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

export function FlashcardsBuilder({ kitId, kit, onUpdate }: { kitId: string; kit: FullKit; onUpdate: (kit: FullKit) => void }) {
  const [adding, setAdding] = useState(false);
  const requirementIds = kit.role.requirements.map((r) => r.id);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Flashcards</h2>
        <button onClick={() => setAdding(true)} className="text-sm underline">
          + Add
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kit.flashcards.map((card) => (
          <FlashcardCard key={card.id} kitId={kitId} card={card} onUpdate={onUpdate} />
        ))}
      </div>
      {adding && (
        <div className="mt-3">
          <AddFlashcardForm kitId={kitId} requirementIds={requirementIds} onAdded={onUpdate} onClose={() => setAdding(false)} />
        </div>
      )}
    </section>
  );
}
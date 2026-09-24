"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/RequireAuth";
import { kitApi, ApiError } from "@/lib/api";
import { Flashcard } from "@/lib/kitTypes";

function PracticeSession({ kitId }: { kitId: string }) {
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [coverage, setCoverage] = useState<{ covered: number; total: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const result = await kitApi.getPractice(kitId);
      setCards(result.flashcards);
      setCoverage(result.coverage);
      setIndex(0);
      setRevealed(false);
    } catch {
      setError("Could not load flashcards.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId]);

  async function rate(confidence: 1 | 2 | 3) {
    if (!cards) return;
    setSubmitting(true);
    try {
      await kitApi.recordConfidence(kitId, cards[index].id, confidence);
      if (index < cards.length - 1) {
        setIndex(index + 1);
        setRevealed(false);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record rating.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-red-600 text-center mt-8">{error}</p>;
  if (!cards) return <p className="text-gray-500 text-center mt-8">Loading...</p>;

  if (cards.length === 0) {
    return (
      <div className="text-center mt-8">
        <p className="text-gray-500">No flashcards in this kit yet.</p>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>
          Card {Math.min(index + 1, cards.length)} of {cards.length}
        </span>
        {coverage && (
          <span>
            {coverage.covered} / {coverage.total} reviewed at least once
          </span>
        )}
      </div>

      <div className="border rounded-lg p-8 min-h-[200px] flex items-center justify-center text-center mb-4">
        <div>
          <p className="text-lg font-medium mb-4">{card.front}</p>
          {revealed && <p className="text-gray-600 border-t pt-4">{card.back}</p>}
        </div>
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full bg-black text-white rounded-md py-3 font-medium"
        >
          Reveal answer
        </button>
      ) : (
        <div>
          <p className="text-sm text-gray-500 text-center mb-3">How confident were you?</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => rate(1)}
              disabled={submitting}
              className="border border-red-300 text-red-700 rounded-md py-3 font-medium disabled:opacity-50"
            >
              Low
            </button>
            <button
              onClick={() => rate(2)}
              disabled={submitting}
              className="border border-yellow-300 text-yellow-700 rounded-md py-3 font-medium disabled:opacity-50"
            >
              Medium
            </button>
            <button
              onClick={() => rate(3)}
              disabled={submitting}
              className="border border-green-300 text-green-700 rounded-md py-3 font-medium disabled:opacity-50"
            >
              High
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PracticePageContent({ id }: { id: string }) {
  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
      <Link href={`/kits/${id}`} className="text-sm text-gray-500 underline mb-4 inline-block">
        ← Back to kit
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Practice Mode</h1>
      <PracticeSession kitId={id} />
    </main>
  );
}

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <PracticePageContent id={id} />
    </RequireAuth>
  );
}
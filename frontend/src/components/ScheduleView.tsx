"use client";

import { useState } from "react";
import { kitApi, ApiError } from "@/lib/api";
import { FullKit } from "@/lib/kitTypes";

export function ScheduleView({ kitId, kit, onUpdate }: { kitId: string; kit: FullKit; onUpdate: (kit: FullKit) => void }) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(kit.schedule.days_available);

  const questionById = new Map(kit.questions.map((q) => [q.id, q]));

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const updated = await kitApi.regenerateSchedule(kitId, days);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to regenerate schedule.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Study Schedule</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-16 border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="text-sm underline disabled:opacity-50"
          >
            {regenerating ? "Updating..." : "Update days"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="space-y-2">
        {kit.schedule.days.map((day) => (
          <div key={day.day} className="border rounded-md p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">
                Day {day.day}: {day.focus}
              </span>
              <span className="text-xs text-gray-500">{day.minutes} min</span>
            </div>
            <ul className="text-xs text-gray-600 list-disc list-inside">
              {day.question_ids.map((qid) => (
                <li key={qid}>{questionById.get(qid)?.prompt.slice(0, 80) || qid}...</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
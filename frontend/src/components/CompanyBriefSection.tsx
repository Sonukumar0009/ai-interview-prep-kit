"use client";

import { useState } from "react";
import { kitApi, ApiError } from "@/lib/api";
import { FullKit } from "@/lib/kitTypes";

export function CompanyBriefSection({
  kitId,
  brief,
  onUpdate,
}: {
  kitId: string;
  brief: FullKit["company_brief"];
  onUpdate: (kit: FullKit) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(brief.summary);
  const [whatTheyDo, setWhatTheyDo] = useState(brief.what_they_do);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await kitApi.patchCompanyBrief(kitId, { summary, what_they_do: whatTheyDo });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const updated = await kitApi.regenerateCompanyBrief(kitId);
      onUpdate(updated);
      setSummary(updated.company_brief.summary);
      setWhatTheyDo(updated.company_brief.what_they_do);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to regenerate.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section className="border rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Company Brief</h2>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm underline">
              Edit
            </button>
          )}
          <button onClick={regenerate} disabled={regenerating} className="text-sm underline disabled:opacity-50">
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">What they do</label>
            <textarea
              value={whatTheyDo}
              onChange={(e) => setWhatTheyDo(e.target.value)}
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-black text-white text-sm rounded-md px-4 py-1.5 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>{brief.summary}</p>
          <p className="text-gray-600">{brief.what_they_do}</p>
        </div>
      )}
    </section>
  );
}
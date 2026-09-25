"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/RequireAuth";
import { kitApi, KitListItem, ApiError } from "@/lib/api";

const STATUS_LABELS: Record<KitListItem["status"], string> = {
  pending: "Queued",
  generating: "Generating...",
  completed: "Ready",
  failed: "Failed",
};

const STATUS_COLORS: Record<KitListItem["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  generating: "bg-periwinkle/10 text-periwinkle",
  completed: "bg-forest-soft text-forest",
  failed: "bg-brick-soft text-brick",
};

function KitsDashboard() {
  const [kits, setKits] = useState<KitListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    kitApi
      .list()
      .then(setKits)
      .catch(() => setError("Could not load your kits."));
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); // don't navigate into the kit when clicking delete
    e.stopPropagation();

    if (!confirm("Delete this kit? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      await kitApi.remove(id);
      setKits((prev) => (prev ? prev.filter((k) => k._id !== id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete kit.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <h1 className="text-2xl font-semibold mb-8">Your prep kits</h1>

      {error && <p className="text-brick text-sm mb-4">{error}</p>}

      {kits === null && !error && <p className="text-ink-soft">Loading...</p>}

      {kits && kits.length === 0 && (
        <div className="border border-dashed border-line rounded-lg p-8 text-center text-ink-soft">
          <p>No kits yet.</p>
          <Link href="/kits/new" className="underline text-ink mt-2 inline-block">
            Create your first one
          </Link>
        </div>
      )}

      {kits && kits.length > 0 && (
        <ul className="space-y-3">
          {kits.map((kit) => (
            <li key={kit._id} className="relative">
              <Link
                href={`/kits/${kit._id}`}
                className="block border border-line rounded-lg p-4 hover:border-ink transition-colors bg-white"
              >
                <div className="flex items-center justify-between mb-1 pr-16">
                  <p className="font-medium truncate max-w-md">
                    {kit.input.jobDescription.split("\n")[0] || "Untitled role"}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[kit.status]}`}>
                    {STATUS_LABELS[kit.status]}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  {kit.input.companyUrl} · {kit.input.daysAvailable} day
                  {kit.input.daysAvailable !== 1 ? "s" : ""}
                </p>
              </Link>
              <button
                onClick={(e) => handleDelete(e, kit._id)}
                disabled={deletingId === kit._id}
                className="absolute top-4 right-4 text-xs text-ink-soft hover:text-brick underline disabled:opacity-50"
              >
                {deletingId === kit._id ? "Deleting..." : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function KitsPage() {
  return (
    <RequireAuth>
      <KitsDashboard />
    </RequireAuth>
  );
}
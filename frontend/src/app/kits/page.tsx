"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/RequireAuth";
import { useAuth } from "@/lib/AuthContext";
import { kitApi, KitListItem } from "@/lib/api";

const STATUS_LABELS: Record<KitListItem["status"], string> = {
  pending: "Queued",
  generating: "Generating...",
  completed: "Ready",
  failed: "Failed",
};

const STATUS_COLORS: Record<KitListItem["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  generating: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function KitsDashboard() {
  const { user, logout } = useAuth();
  const [kits, setKits] = useState<KitListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kitApi
      .list()
      .then(setKits)
      .catch(() => setError("Could not load your kits."));
  }, []);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Your prep kits</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/kits/new" className="bg-black text-white rounded-md px-4 py-2 text-sm font-medium">
            New kit
          </Link>
          <button onClick={() => logout()} className="text-sm text-gray-600 underline">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {kits === null && !error && <p className="text-gray-500">Loading...</p>}

      {kits && kits.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-gray-500">
          <p>No kits yet.</p>
          <Link href="/kits/new" className="underline text-black mt-2 inline-block">
            Create your first one
          </Link>
        </div>
      )}

      {kits && kits.length > 0 && (
        <ul className="space-y-3">
          {kits.map((kit) => (
            <li key={kit._id}>
              <Link
                href={`/kits/${kit._id}`}
                className="block border rounded-lg p-4 hover:border-black transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium truncate max-w-md">
                    {kit.input.jobDescription.split("\n")[0] || "Untitled role"}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[kit.status]}`}>
                    {STATUS_LABELS[kit.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {kit.input.companyUrl} · {kit.input.daysAvailable} day
                  {kit.input.daysAvailable !== 1 ? "s" : ""}
                </p>
              </Link>
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
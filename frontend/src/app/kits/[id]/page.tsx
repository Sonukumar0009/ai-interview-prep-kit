"use client";

import { use } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/RequireAuth";
import { useKitPolling } from "@/lib/useKitPolling";
import { FullKit } from "@/lib/kitTypes";
import { CompanyBriefSection } from "@/components/CompanyBriefSection";
import { QuestionsBuilder } from "@/components/QuestionsBuilder";
import { FlashcardsBuilder } from "@/components/FlashcardsBuilder";
import { ScheduleView } from "@/components/ScheduleView";

function GeneratingView({ status }: { status: "pending" | "generating" }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-1">
          {status === "pending" ? "Queued for generation..." : "Generating your prep kit..."}
        </h2>
        <p className="text-sm text-gray-500">
          Crawling the company site, extracting requirements, and generating questions. This usually
          takes under a minute.
        </p>
      </div>
    </div>
  );
}

function FailedView({ error }: { error: { code: string; message: string } | null }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-red-600 font-medium mb-2">Generation failed</p>
        <p className="text-sm text-gray-500 mb-4">{error?.message || "An unknown error occurred."}</p>
        <Link href="/kits/new" className="underline text-sm">
          Try creating a new kit
        </Link>
      </div>
    </div>
  );
}

function CompletedView({
  kitId,
  kit,
  warnings,
  onUpdate,
}: {
  kitId: string;
  kit: FullKit;
  warnings: string[];
  onUpdate: (kit: FullKit) => void;
}) {
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <Link href="/kits" className="text-sm text-gray-500 underline mb-4 inline-block">
        ← Back to kits
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{kit.role.title}</h1>
        <p className="text-gray-500">
          {kit.source.company} {kit.role.seniority && `· ${kit.role.seniority}`}
          {kit.source.location && ` · ${kit.source.location}`}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6 text-sm text-yellow-800">
          <p className="font-medium mb-1">Heads up:</p>
          <ul className="list-disc list-inside">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {kit.coverage.uncovered_requirement_ids.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6 text-sm text-red-800">
          {kit.coverage.uncovered_requirement_ids.length} must-have requirement(s) still have no question
          covering them after {kit.coverage.passes} pass(es).
        </div>
      )}

      <CompanyBriefSection kitId={kitId} brief={kit.company_brief} onUpdate={onUpdate} />

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Role Requirements</h2>
        <ul className="space-y-1">
          {kit.role.requirements.map((r) => (
            <li key={r.id} className="text-sm flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  r.priority === "must" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {r.priority}
              </span>
              <span className="text-xs text-gray-400">{r.kind}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <QuestionsBuilder kitId={kitId} kit={kit} onUpdate={onUpdate} />
      <FlashcardsBuilder kitId={kitId} kit={kit} onUpdate={onUpdate} />
      <ScheduleView kitId={kitId} kit={kit} onUpdate={onUpdate} />

      <div className="mt-6">
        <Link href={`/kits/${kitId}/practice`} className="bg-black text-white rounded-md px-4 py-2 text-sm font-medium">
          Start Practice Mode
        </Link>
      </div>
    </main>
  );
}

function KitDetailContent({ id }: { id: string }) {
  const { kit, error, setKit } = useKitPolling(id);

  function handleUpdate(updatedKitData: FullKit) {
    setKit((prev) => (prev ? { ...prev, kit: updatedKitData } : prev));
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (kit.status === "pending" || kit.status === "generating") {
    return <GeneratingView status={kit.status} />;
  }

  if (kit.status === "failed") {
    return <FailedView error={kit.error} />;
  }

  if (!kit.kit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Kit data unavailable.</p>
      </div>
    );
  }

  return <CompletedView kitId={id} kit={kit.kit as FullKit} warnings={kit.warnings} onUpdate={handleUpdate} />;
}

export default function KitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <KitDetailContent id={id} />
    </RequireAuth>
  );
}
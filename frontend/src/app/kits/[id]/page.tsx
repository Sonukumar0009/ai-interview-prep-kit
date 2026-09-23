"use client";

import { use } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/RequireAuth";
import { useKitPolling } from "@/lib/useKitPolling";

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

function KitDetailContent({ id }: { id: string }) {
  const { kit, error } = useKitPolling(id);

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

  // status === "completed" — placeholder for now, full Builder comes next
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <Link href="/kits" className="text-sm text-gray-500 underline mb-4 inline-block">
        ← Back to kits
      </Link>
      <h1 className="text-2xl font-semibold mb-2">{kit.kit?.role.title}</h1>
      <p className="text-gray-500 mb-6">{kit.kit?.source.company}</p>
      <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(kit.kit, null, 2)}
      </pre>
    </main>
  );
}

export default function KitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <KitDetailContent id={id} />
    </RequireAuth>
  );
}
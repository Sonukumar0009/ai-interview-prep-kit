"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/lib/RequireAuth";
import { kitApi, ApiError } from "@/lib/api";

function NewKitForm() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [daysAvailable, setDaysAvailable] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await kitApi.create(jobDescription, companyUrl, daysAvailable);
      router.push(`/kits/${result.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Create a new prep kit</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="jd" className="block text-sm font-medium mb-1">
            Job description
          </label>
          <textarea
            id="jd"
            required
            rows={12}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full border rounded-md px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="companyUrl" className="block text-sm font-medium mb-1">
            Company website
          </label>
          <input
            id="companyUrl"
            type="url"
            required
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="days" className="block text-sm font-medium mb-1">
            Days until interview
          </label>
          <input
            id="days"
            type="number"
            required
            min={1}
            max={60}
            value={daysAvailable}
            onChange={(e) => setDaysAvailable(Number(e.target.value))}
            className="w-32 border rounded-md px-3 py-2"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded-md px-6 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Starting..." : "Generate kit"}
        </button>
      </form>
    </main>
  );
}

export default function NewKitPage() {
  return (
    <RequireAuth>
      <NewKitForm />
    </RequireAuth>
  );
}
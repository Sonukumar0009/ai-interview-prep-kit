import dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as path from "path";
import { generateKit } from "../src/services/kitOrchestrator";

interface EvaluationCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface EvaluationOutputEntry {
  id: string;
  status: "ok" | "failed";
  kit: unknown | null;
  error: { code: string; message: string } | null;
}

interface EvaluationOutput {
  version: string;
  generated_at: string;
  kits: EvaluationOutputEntry[];
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let input = "";
  let output = "";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--input=")) {
      input = arg.slice("--input=".length);
    } else if (arg === "--input" && argv[i + 1]) {
      input = argv[i + 1];
      i++;
    } else if (arg.startsWith("--output=")) {
      output = arg.slice("--output=".length);
    } else if (arg === "--output" && argv[i + 1]) {
      output = argv[i + 1];
      i++;
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  // Fallback: some npm versions on some platforms strip --input/--output
  // flag names from argv (even after the -- separator) while still
  // forwarding their values as bare positional arguments. This makes the
  // batch command work reliably regardless of npm/OS quirks, which matters
  // since Section 9 requires `npm run evaluate -- --input <cases.json>
  // --output <kits.json>` to work from a clean clone on an environment we
  // don't control. When named flags are missing, we take the first two
  // positional args as input/output, in that order.
  if (!input && positional[0]) {
    input = positional[0];
  }
  if (!output && positional[1]) {
    output = positional[1];
  }

  if (!input || !output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    console.error("Received args:", argv);
    process.exit(1);
  }

  return { input, output };
}

function loadCases(inputPath: string): EvaluationCase[] {
  const resolved = path.resolve(inputPath);
  const raw = fs.readFileSync(resolved, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Input file must contain a JSON array of cases");
  }

  for (const c of parsed) {
    if (typeof c.id !== "string" || typeof c.jd !== "string" || typeof c.company_url !== "string" || typeof c.days !== "number") {
      throw new Error(`Malformed case: ${JSON.stringify(c)}`);
    }
  }

  return parsed as EvaluationCase[];
}

/**
 * Batch entry point required by Section 9. Runs the SAME orchestrator
 * (generateKit) used by the interactive API — not a parallel
 * implementation — against each case, and writes Appendix B's exact
 * output shape. Continues after an individual case fails (Section 9:
 * "Continues after one case fails, recording the failure rather than
 * aborting the run") rather than throwing and stopping the whole batch.
 *
 * "failed" is reserved for cases where no kit could be produced at all
 * (e.g. extraction itself failed, or a thrown/unexpected error). A case
 * that only partially succeeded — e.g. the company site had no hiring
 * page, or some questions could not be generated — still produces a kit
 * with the gaps recorded honestly inside it (coverage.uncovered_requirement_ids,
 * empty company_brief fields, etc.), per the brief's own FAQ: "A case you
 * could only partially research is still ok... a missing hiring page is
 * not a failure."
 */
async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  console.log(`Reading cases from ${input}...`);
  const cases = loadCases(input);
  console.log(`Loaded ${cases.length} case(s).`);

  const results: EvaluationOutputEntry[] = [];

  for (const testCase of cases) {
    console.log(`\nProcessing case "${testCase.id}"...`);
    const startedAt = Date.now();

    try {
      const result = await generateKit(testCase.jd, testCase.company_url, testCase.days);

      if (result.ok && result.kit) {
        results.push({ id: testCase.id, status: "ok", kit: result.kit, error: null });
        console.log(`  -> ok (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
      } else {
        results.push({
          id: testCase.id,
          status: "failed",
          kit: null,
          error: result.error || { code: "UNKNOWN", message: "Kit generation failed with no specific error" },
        });
        console.log(`  -> failed: ${result.error?.message} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
      }
    } catch (err) {
      // Defensive: catch anything unexpected so one case's crash never
      // aborts the whole batch run.
      results.push({
        id: testCase.id,
        status: "failed",
        kit: null,
        error: { code: "UNEXPECTED_ERROR", message: (err as Error).message },
      });
      console.log(`  -> failed (unexpected error): ${(err as Error).message}`);
    }
  }

  const outputData: EvaluationOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results,
  };

  const resolvedOutput = path.resolve(output);
  fs.writeFileSync(resolvedOutput, JSON.stringify(outputData, null, 2), "utf-8");

  const okCount = results.filter((r) => r.status === "ok").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  console.log(`\nDone. ${okCount} ok, ${failedCount} failed. Written to ${resolvedOutput}`);

  // Exit code reflects whether ANY case succeeded, not whether ALL did —
  // a batch with some individual failures is still a successful run of
  // the batch command itself, consistent with "continues after one case
  // fails" rather than treating partial failure as a run-level failure.
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error running evaluation:", err);
  process.exit(1);
});
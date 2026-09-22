import dotenv from "dotenv";
dotenv.config();

import { searchInterviewDiscussion } from "../src/services/retrieval/discussionSearch";

async function main() {
  const company = process.argv[2] || "GitLab";
  const result = await searchInterviewDiscussion(company);
  console.log("OK:", result.ok);
  console.log("Results found:", result.results.length);
  console.log(result.results);
  if (result.error) console.log("Error (non-fatal):", result.error);
}

main();
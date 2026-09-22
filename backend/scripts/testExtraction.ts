import dotenv from "dotenv";
dotenv.config();

import { extractRequirements } from "../src/services/extraction/requirementExtractor";

const SAMPLE_JD = `
Senior Backend Engineer - GitLab

We are looking for a Senior Backend Engineer to join our Core Platform team.

Requirements:
- 5+ years of experience with Ruby on Rails or a similar backend framework
- Strong understanding of PostgreSQL and database performance tuning
- Experience mentoring junior engineers
- Excellent written communication skills for our remote-first, async culture

Nice to have:
- Experience with Kubernetes
- Familiarity with GraphQL
`;

async function main() {
  const jd = process.argv[2] || SAMPLE_JD;
  const result = await extractRequirements(jd);
  console.log("OK:", result.ok);
  console.log(JSON.stringify(result.requirements, null, 2));
  if (result.error) console.log("Error:", result.error);
}

main();
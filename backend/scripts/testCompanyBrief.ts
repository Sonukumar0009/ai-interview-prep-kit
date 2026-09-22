import dotenv from "dotenv";
dotenv.config();

import { crawlCompanySite } from "../src/services/retrieval/crawler";
import { generateCompanyBrief } from "../src/services/generation/companyBriefGenerator";

async function main() {
  const url = process.argv[2] || "https://about.gitlab.com";
  const crawl = await crawlCompanySite(url);
  console.log(`Crawled ${crawl.pages.length} pages`);

  const result = await generateCompanyBrief(crawl.pages);
  console.log("OK:", result.ok);
  console.log(JSON.stringify(result.brief, null, 2));
  if (result.error) console.log("Error:", result.error);
}

main();
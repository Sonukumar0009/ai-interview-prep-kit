"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crawler_1 = require("../src/services/retrieval/crawler");
async function main() {
    const url = process.argv[2] || "https://about.gitlab.com";
    const result = await (0, crawler_1.crawlCompanySite)(url);
    console.log("Pages fetched:", result.pagesUsed);
    console.log("Skipped:", result.skipped);
    console.log("First page title:", result.pages[0]?.title);
    console.log("First page text sample:", result.pages[0]?.text.slice(0, 200));
}
main();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const crawler_1 = require("../src/services/retrieval/crawler");
const companyBriefGenerator_1 = require("../src/services/generation/companyBriefGenerator");
async function main() {
    const url = process.argv[2] || "https://about.gitlab.com";
    const crawl = await (0, crawler_1.crawlCompanySite)(url);
    console.log(`Crawled ${crawl.pages.length} pages`);
    const result = await (0, companyBriefGenerator_1.generateCompanyBrief)(crawl.pages);
    console.log("OK:", result.ok);
    console.log(JSON.stringify(result.brief, null, 2));
    if (result.error)
        console.log("Error:", result.error);
}
main();

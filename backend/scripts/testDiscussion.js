"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const discussionSearch_1 = require("../src/services/retrieval/discussionSearch");
async function main() {
    const company = process.argv[2] || "GitLab";
    const result = await (0, discussionSearch_1.searchInterviewDiscussion)(company);
    console.log("OK:", result.ok);
    console.log("Results found:", result.results.length);
    console.log(result.results);
    if (result.error)
        console.log("Error (non-fatal):", result.error);
}
main();

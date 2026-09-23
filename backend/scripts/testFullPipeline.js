"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const kitOrchestrator_1 = require("../src/services/kitOrchestrator");
const SAMPLE_JD = `
Senior Backend Engineer - GitLab

Requirements:
- 5+ years of experience with Ruby on Rails or a similar backend framework
- Strong understanding of PostgreSQL and database performance tuning
- Experience mentoring junior engineers
- Excellent written communication skills for our remote-first, async culture

Nice to have:
- Experience with Kubernetes
`;
async function main() {
    console.log("Starting full pipeline run (this will take a while — several sequential LLM calls)...");
    const result = await (0, kitOrchestrator_1.generateKit)(SAMPLE_JD, "https://about.gitlab.com", 5);
    console.log("OK:", result.ok);
    console.log("Warnings:", result.warnings);
    if (result.error)
        console.log("Error:", result.error);
    if (result.kit) {
        console.log("\n--- Kit summary ---");
        console.log("Company:", result.kit.source.company);
        console.log("Requirements:", result.kit.role.requirements.length);
        console.log("Questions:", result.kit.questions.length);
        console.log("Flashcards:", result.kit.flashcards.length);
        console.log("Schedule days:", result.kit.schedule.days.length);
        console.log("Uncovered must-haves:", result.kit.coverage.uncovered_requirement_ids);
        console.log("\nFull kit written to full-kit-output.json for inspection");
        require("fs").writeFileSync("full-kit-output.json", JSON.stringify(result.kit, null, 2));
    }
}
main();

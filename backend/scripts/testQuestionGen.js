"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requirementExtractor_1 = require("../src/services/extraction/requirementExtractor");
const questionGenerator_1 = require("../src/services/generation/questionGenerator");
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
const SAMPLE_RESEARCH_CONTEXT = `GitLab is a remote-first company. Their interviewing handbook explicitly recommends candidates use the STAR method for behavioural questions. Behavioural interviews are structured around their CREDIT values: Collaboration, Results, Efficiency, Diversity, Inclusion and Belonging, and Transparency.`;
async function main() {
    const extraction = await (0, requirementExtractor_1.extractRequirements)(SAMPLE_JD);
    if (!extraction.ok) {
        console.log("Extraction failed:", extraction.error);
        return;
    }
    console.log(`Extracted ${extraction.requirements.length} requirements`);
    const result = await (0, questionGenerator_1.generateQuestionsForRequirements)(extraction.requirements, SAMPLE_RESEARCH_CONTEXT);
    console.log("OK:", result.ok);
    console.log(`Generated ${result.questions.length} questions`);
    console.log(JSON.stringify(result.questions, null, 2));
    if (result.errors.length > 0)
        console.log("Errors:", result.errors);
}
main();

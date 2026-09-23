"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_fetch_1 = __importDefault(require("node-fetch"));
async function main() {
    const apiKey = process.env.GROQ_API_KEY;
    const response = await (0, node_fetch_1.default)("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await response.json());
    console.log("Status:", response.status);
    console.log("Available model IDs:");
    data.data?.forEach((m) => console.log(" -", m.id));
}
main();

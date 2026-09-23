"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
async function main() {
    const query = "GitLab interview process questions";
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await (0, node_fetch_1.default)(url, {
        headers: { "User-Agent": "AIInterviewPrepKitBot/1.0" },
    });
    console.log("Status:", response.status);
    const html = await response.text();
    console.log("HTML length:", html.length);
    console.log("Contains 'result__title':", html.includes("result__title"));
    console.log("Contains '<form':", html.includes("<form"));
    console.log("Contains 'No  results':", html.toLowerCase().includes("no results"));
    const formMatch = html.match(/<form[^>]*>/g);
    console.log("Forms found:", formMatch);
    console.log("Last 2000 chars:");
    console.log(html.slice(-2000));
}
main();

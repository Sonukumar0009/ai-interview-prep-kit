import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

async function main() {
  const apiKey = process.env.GROQ_API_KEY;
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = (await response.json()) as { data?: { id: string }[] };
  console.log("Status:", response.status);
  console.log("Available model IDs:");
  data.data?.forEach((m) => console.log(" -", m.id));
}

main();
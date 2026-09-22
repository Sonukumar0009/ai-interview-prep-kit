import fetch from "node-fetch";

async function main() {
  const query = "GitLab interview process questions";
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
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
import { readFileSync } from "fs";
import path from "path";

let documents = [];

export function loadData() {
  const filePath = path.join(process.cwd(), "data", "legal.txt");
  const text = readFileSync(filePath, "utf-8");


  documents = text.split("\n").filter(line => line.trim() !== "");
}

export function getRelevantContext(query) {
  const queryWords = query.toLowerCase().split(" ");

  let bestMatches = documents.filter(doc =>
    queryWords.some(word => doc.toLowerCase().includes(word))
  );

  return bestMatches.slice(0, 3).join("\n");
}
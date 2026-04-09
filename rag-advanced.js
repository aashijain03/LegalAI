import { readFileSync } from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

let vectorStore;

export async function setupRAG() {
  try {
    const filePath = path.join(process.cwd(), "data", "legal.txt");
    const text = readFileSync(filePath, "utf-8");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 50,
    });

    const docs = await splitter.createDocuments([text]);

    const embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HF_API_KEY,
      model: "BAAI/bge-base-en-v1.5",
    });

    vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
    console.log("RAG ready (using MemoryVectorStore)");
  } catch (err) {
    console.error("Failed to setup RAG:", err);
  }
}

export async function getRelevantContext(query) {
  if (!vectorStore) return "";
  const results = await vectorStore.similaritySearch(query, 3);
  return results.map(r => r.pageContent).join("\n");
}
import { readFileSync } from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

let vectorStore;

export async function setupRAG() {
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

  vectorStore = await FaissStore.fromDocuments(docs, embeddings);

  console.log("RAG ready");
}

export async function getRelevantContext(query) {
  const results = await vectorStore.similaritySearch(query, 3);

  return results.map(r => r.pageContent).join("\n");
}
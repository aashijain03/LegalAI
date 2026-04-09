import { readFileSync } from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

let documents = [];
let embeddingsInstance;
let documentEmbeddings = [];

export async function setupRAG() {
  try {
    const filePath = path.join(process.cwd(), "data", "legal.txt");
    const text = readFileSync(filePath, "utf-8");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 50,
    });

    const splitDocs = await splitter.createDocuments([text]);
    documents = splitDocs.map(doc => doc.pageContent);

    embeddingsInstance = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HF_API_KEY,
      model: "BAAI/bge-base-en-v1.5",
    });

    // Generate embeddings for all document chunks
    documentEmbeddings = await embeddingsInstance.embedDocuments(documents);

    console.log(`RAG ready. Indexed ${documents.length} chunks.`);
  } catch (err) {
    console.error("Failed to setup RAG:", err);
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function getRelevantContext(query) {
  if (documents.length === 0 || !embeddingsInstance) return "";

  try {
    const queryEmbedding = await embeddingsInstance.embedQuery(query);

    const scores = documents.map((doc, i) => ({
      content: doc,
      score: cosineSimilarity(queryEmbedding, documentEmbeddings[i])
    }));

    // Sort by score descending and take top 3
    const topResults = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return topResults.map(r => r.content).join("\n");
  } catch (err) {
    console.error("Error in similarity search:", err);
    return "";
  }
}
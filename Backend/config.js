import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required. Set it in Backend/.env (see .env.example)."
  );
}

let CORS_ORIGIN = process.env.CORS_ORIGIN;
if (!CORS_ORIGIN) {
  if (isProduction) {
    throw new Error(
      "CORS_ORIGIN environment variable is required in production. Set it to your deployed frontend's URL."
    );
  }
  CORS_ORIGIN = "http://localhost:5173";
}

export const config = {
  isProduction,
  isTest,
  port: process.env.PORT || 3001,
  jwtSecret: JWT_SECRET,
  corsOrigin: CORS_ORIGIN,
  hfApiKey: process.env.HF_API_KEY,
  hfModel: process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
  hfFallbackModels: (process.env.HF_FALLBACK_MODELS || "Qwen/Qwen2.5-Coder-32B-Instruct")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean),
  dbPath: process.env.DB_PATH || (isTest ? ":memory:" : undefined),
  maxCaseStorageBytes: Number(process.env.MAX_CASE_STORAGE_MB || 50) * 1024 * 1024,
  maxCaseDocumentsPerUpload: 5,
};

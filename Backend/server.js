import express from "express";
import cors from "cors";
import helmet from "helmet";

import { config } from "./config.js";
import { loadData } from "./rag.js";
import { setupRAG, getRelevantContext } from "./rag-advanced.js";
import authRoutes from "./auth.js";
import casesRoutes from "./cases.js";
import { callHuggingFaceChat, cleanAIResponse } from "./llm.js";
import { extractTextFromFile } from "./documentExtraction.js";
import { upload, handleUploadErrors } from "./upload.js";
import { authLimiter, llmLimiter } from "./rateLimiters.js";

// Lazy initialization
let isInitialized = false;
async function initialize() {
  if (!isInitialized) {
    console.log("Initializing systems...");
    loadData();
    await setupRAG();
    isInitialized = true;
    console.log("Systems initialized");
  }
}

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use("/auth/login", authLimiter);
app.use("/auth/signup", authLimiter);
app.use("/auth/change-password", authLimiter);
app.use("/auth", authRoutes);
app.use("/cases", casesRoutes);

const PORT = config.port;
console.log("API KEY LOADED:", config.hfApiKey ? "Yes" : "No");

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.post("/scan", llmLimiter, upload.single("document"), handleUploadErrors, async (req, res) => {
  try {
    await initialize();
    console.log("Scan request received");

    let text = "";
    if (req.file) {
      console.log("File received:", req.file.originalname, "Mime:", req.file.mimetype);
      text = await extractTextFromFile(req.file);
    } else if (req.body.text) {
      text = req.body.text;
    } else {
      console.error("No document provided in request");
      return res.status(400).json({ error: "No document provided" });
    }

    if (!text || text.trim().length === 0) {
      console.error("Extracted text is empty");
      return res.status(400).json({ error: "Failed to extract text from document" });
    }

    if (text.length > 15000) {
      text = text.substring(0, 15000);
    }

    console.log("Sending to HF API...");
    const response = await callHuggingFaceChat({
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `
          Analyze the following legal document (or excerpt) and identify key risks:

          "${text}"

          Return ONLY valid JSON in this format:
          {
            "overallRisk": "low" | "medium" | "high",
            "summary": "short explanation",
            "keyFindings": [
               {
                 "id": "1",
                 "title": "Clause name",
                 "description": "Explanation",
                 "riskLevel": "low" | "medium" | "high",
                 "section": "Section name/number"
               }
            ],
            "recommendations": ["suggestion1", "suggestion2"]
          }
          `
        }
      ]
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF API Error:", response.status, errText);
      return res.status(500).json({ error: "HF API failed" });
    }

    const rawData = await response.json();
    const resultContent = rawData.choices?.[0]?.message?.content;

    if (!resultContent) {
      console.error("Empty content from AI response");
      return res.status(500).json({ error: "Empty AI response" });
    }

    let result;
    try {
      const cleanedJSON = cleanAIResponse(resultContent);
      result = JSON.parse(cleanedJSON);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", resultContent);
      return res.status(500).json({ error: "AI response was not valid JSON format" });
    }

    console.log("Scan successful");
    res.json({ result });
  } catch (err) {
    console.error("Unexpected error in /scan:", err.stack || err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message || String(err),
    });
  }
});

app.post("/legal", llmLimiter, upload.single("document"), handleUploadErrors, async (req, res) => {
  await initialize();
  const { question } = req.body;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "A question is required" });
  }

  let fileText = "";
  if (req.file) {
    fileText = await extractTextFromFile(req.file);
  }

  let context = await getRelevantContext(question);
  if (fileText) {
    context = `[ATTACHED DOCUMENT CONTENT]:\n${fileText.substring(0, 10000)}\n\n[GENERAL LEGAL CONTEXT]:\n${context}`;
  }

  try {
    const response = await callHuggingFaceChat({
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `
                        You are an expert legal assistant for Indian users. Your task is to provide helpful, accurate, and detailed legal advice.

                        First, check if the provided Context is relevant to the Question.
                        - If it is relevant, use it to answer the question.
                        - If it is NOT relevant, ignore the Context entirely and answer the question using your general legal knowledge.

                        CRITICAL: DO NOT mention the context in your response. DO NOT say "The context provided does not contain...". Just answer the question directly.

                        Context:
                        ${context}

                        Return ONLY valid JSON in this exact structure:
                        {
                          "explanation": "Detailed explanation answering the user's question.",
                          "what_to_do": ["Actionable step 1", "Actionable step 2"],
                          "warnings": ["Warning 1", "Warning 2"],
                          "risk_level": "low"
                        }

                        Question: ${question}
                    `
        }
      ]
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error("HF API Error:", response.status, rawText);
      return res.status(500).json({ error: "HF API failed" });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Invalid JSON:", rawText);
      return res.status(500).json({ error: "Invalid AI response" });
    }

    const result =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      data.generated_text ||
      data[0]?.generated_text;

    if (!result) {
      console.error("Unexpected AI response:", rawText);
      return res.status(500).json({ error: "Unexpected AI response" });
    }

    let parsed;

    try {
      parsed = JSON.parse(cleanAIResponse(result));
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", result);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    res.json(parsed);

  } catch (err) {
    console.error("Unexpected error in /legal:", err.stack || err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message || String(err),
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Please kill the existing process and try again.`);
  } else {
    console.error("Server error:", err);
  }
});

export default app;

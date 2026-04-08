import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import multer from "multer";
import { createRequire } from "module";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";


import { loadData } from "./rag.js";
loadData();

import { setupRAG, getRelevantContext } from "./rag-advanced.js";
await setupRAG();

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Fetch failed, retrying... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function cleanAIResponse(text) {
  // Remove markdown code blocks if they exist
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, "");
    cleaned = cleaned.replace(/\n```$/i, "");
  }
  return cleaned.trim();
}

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const PORT = 3001;
const HF_API_KEY = process.env.HF_API_KEY;
console.log("API KEY LOADED:", HF_API_KEY ? "Yes" : "No");

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.post("/scan", upload.single("document"), async (req, res) => {
  try {
    console.log("Scan request received");
    let text = "";
    if (req.file) {
      console.log("File received:", req.file.originalname, "Mime:", req.file.mimetype);
      if (req.file.mimetype === "application/pdf") {
        const parser = new PDFParse({ data: req.file.buffer });
        const data = await parser.getText();
        text = data.text;
        await parser.destroy();
      } else if (
        req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.originalname.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (
        req.file.mimetype === "application/msword" ||
        req.file.originalname.endsWith(".doc")
      ) {
        // Basic support for older .doc might be limited with mammoth but let's try
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (
        req.file.mimetype.startsWith("image/")
      ) {
        console.log("Processing image with OCR...");
        const result = await Tesseract.recognize(req.file.buffer, "eng");
        text = result.data.text;
      } else {
        text = req.file.buffer.toString("utf8");
      }

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
    const response = await fetchWithRetry(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-Coder-32B-Instruct",
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
        })
      }
    );

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
    console.error("Unexpected error in /scan:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/legal", async (req, res) => {
  const { question } = req.body;
  const context = await getRelevantContext(question);

  try {
    const response = await fetchWithRetry(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-Coder-32B-Instruct",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: `
                        You are a legal assistant for Indian users.

                        Use ONLY the context below to answer.

                        Context:
                        ${context}

                        Return ONLY JSON:
                        {
                          "explanation": "...",
                          "what_to_do": [],
                          "warnings": [],
                          "risk_level": "low / medium / high"
                        }

                        Question: ${question}
                    `
            }
          ]
        }),
      }
    );

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Invalid JSON:", rawText);
      return res.status(500).json({ error: "Invalid AI response" });
    }

    const result = data.choices?.[0]?.message?.content;

    let parsed;

    try {
      parsed = JSON.parse(result);
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the existing process and try again.`);
  } else {
    console.error('Server error:', err);
  }
});
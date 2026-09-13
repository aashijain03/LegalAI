import express from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { config } from "./config.js";
import { requireAuth } from "./authMiddleware.js";
import { parseOrRespond } from "./validation.js";
import { upload, handleUploadErrors } from "./upload.js";
import { extractTextFromFile } from "./documentExtraction.js";
import { callHuggingFaceChat, cleanAIResponse } from "./llm.js";
import { casesLimiter, llmLimiter } from "./rateLimiters.js";
import {
  createCase,
  getCasesByUserId,
  getCaseById,
  updateCase,
  deleteCase,
  touchCaseUpdatedAt,
  createCaseDocument,
  getCaseDocumentsMeta,
  getCaseDocumentFile,
  getCaseDocumentsTextForAnalysis,
  deleteCaseDocument,
  getCaseStorageUsage,
  createCaseEvent,
  getCaseEventsByCaseId,
  getCaseEventById,
  createCaseAnalysis,
  getLatestCaseAnalysis,
  getCaseAnalysesHistory,
} from "./db.js";

const router = express.Router();
router.use(requireAuth);

const createCaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  case_type: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const updateCaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  case_type: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(["active", "closed", "archived"]).optional(),
});

const createEventSchema = z.object({
  event_date: z.string().trim().min(1, "Hearing date is required"),
  title: z.string().trim().optional(),
  description: z.string().trim().min(1, "A description of what happened is required"),
  next_hearing_date: z.string().trim().optional(),
});

const askQuestionSchema = z.object({
  question: z.string().trim().min(1, "A question is required"),
});

function requireOwnedCase(req, res) {
  const caseRow = getCaseById(req.params.id);
  if (!caseRow || caseRow.user_id !== req.userId) {
    res.status(404).json({ error: "Case not found" });
    return null;
  }
  return caseRow;
}

async function buildCaseContext(caseRow) {
  const documents = getCaseDocumentsTextForAnalysis(caseRow.id);
  const events = getCaseEventsByCaseId(caseRow.id);

  let docsSection = "No documents uploaded yet.";
  if (documents.length > 0) {
    let combined = "";
    for (const doc of documents) {
      const chunk = `--- ${doc.filename} ---\n${doc.extracted_text || ""}\n\n`;
      if (combined.length + chunk.length > 10000) break;
      combined += chunk;
    }
    docsSection = combined.trim() || "No text could be extracted from the uploaded documents.";
  }

  let timelineSection = "No hearings recorded yet.";
  if (events.length > 0) {
    timelineSection = events
      .map(
        (e) =>
          `${e.event_date}: ${e.description}${e.next_hearing_date ? ` (Next hearing: ${e.next_hearing_date})` : ""}`
      )
      .join("\n");
  }

  return `CASE TITLE: ${caseRow.title}
CASE TYPE: ${caseRow.case_type || "Not specified"}
CASE DESCRIPTION: ${caseRow.description || "None provided"}

UPLOADED DOCUMENTS (extracted text, truncated):
${docsSection}

HEARING TIMELINE (chronological):
${timelineSection}`;
}

async function generateCaseAnalysis(caseRow, triggerEventId) {
  const context = await buildCaseContext(caseRow);

  const response = await callHuggingFaceChat({
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `
        You are an expert legal assistant for Indian users, analyzing the ongoing progress of a legal case.

        ${context}

        Based on the case details, uploaded documents, and hearing timeline above, return ONLY valid JSON in this exact structure:
        {
          "case_stage": "e.g. Filing / Awaiting hearing / Evidence phase / Awaiting judgment / Closed",
          "overall_risk": "low" | "medium" | "high",
          "progress_summary": "Plain-language narrative of how the case has evolved so far.",
          "key_developments": [
            { "date": "YYYY-MM-DD", "description": "what happened", "impact": "positive" | "neutral" | "negative" }
          ],
          "recommendations": ["actionable next step", "..."],
          "warnings": ["risk or deadline to be aware of", "..."]
        }
        `,
      },
    ],
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF API failed: ${errText}`);
  }

  const rawData = await response.json();
  const resultContent = rawData.choices?.[0]?.message?.content;
  if (!resultContent) {
    throw new Error("Empty AI response");
  }

  const analysis = JSON.parse(cleanAIResponse(resultContent));

  createCaseAnalysis({
    id: randomUUID(),
    case_id: caseRow.id,
    trigger_event_id: triggerEventId || null,
    analysis_json: JSON.stringify(analysis),
  });

  return analysis;
}

router.post("/", casesLimiter, (req, res) => {
  const data = parseOrRespond(createCaseSchema, req.body, res);
  if (!data) return;

  const id = randomUUID();
  createCase({ id, user_id: req.userId, ...data });
  res.json({ case: getCaseById(id) });
});

router.get("/", (req, res) => {
  res.json({ cases: getCasesByUserId(req.userId) });
});

router.get("/:id", (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  res.json({
    case: caseRow,
    documents: getCaseDocumentsMeta(caseRow.id),
    events: getCaseEventsByCaseId(caseRow.id),
    analysis: getLatestCaseAnalysis(caseRow.id),
  });
});

router.patch("/:id", casesLimiter, (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  const data = parseOrRespond(updateCaseSchema, req.body, res);
  if (!data) return;

  updateCase(caseRow.id, data);
  res.json({ case: getCaseById(caseRow.id) });
});

router.delete("/:id", casesLimiter, (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  deleteCase(caseRow.id);
  res.json({ success: true });
});

router.post(
  "/:id/documents",
  casesLimiter,
  upload.array("documents", config.maxCaseDocumentsPerUpload),
  handleUploadErrors,
  async (req, res) => {
    const caseRow = requireOwnedCase(req, res);
    if (!caseRow) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No documents provided" });
    }

    const newBytes = req.files.reduce((sum, f) => sum + f.size, 0);
    if (getCaseStorageUsage(caseRow.id) + newBytes > config.maxCaseStorageBytes) {
      return res.status(400).json({ error: "Case storage limit reached" });
    }

    try {
      for (const file of req.files) {
        const extractedText = await extractTextFromFile(file);
        createCaseDocument({
          id: randomUUID(),
          case_id: caseRow.id,
          filename: file.originalname,
          mimetype: file.mimetype,
          size_bytes: file.size,
          file_data: file.buffer,
          extracted_text: extractedText,
        });
      }
      touchCaseUpdatedAt(caseRow.id);
      res.json({ documents: getCaseDocumentsMeta(caseRow.id) });
    } catch (err) {
      console.error("Unexpected error uploading case documents:", err.stack || err);
      res.status(500).json({ error: "Internal Server Error", details: err.message || String(err) });
    }
  }
);

router.get("/:id/documents/:docId/file", (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  const doc = getCaseDocumentFile(req.params.docId);
  if (!doc || doc.case_id !== caseRow.id) {
    return res.status(404).json({ error: "Document not found" });
  }

  res.set("Content-Type", doc.mimetype);
  res.set("Content-Disposition", `inline; filename="${doc.filename.replace(/"/g, "")}"`);
  res.send(doc.file_data);
});

router.delete("/:id/documents/:docId", casesLimiter, (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  const doc = getCaseDocumentFile(req.params.docId);
  if (!doc || doc.case_id !== caseRow.id) {
    return res.status(404).json({ error: "Document not found" });
  }

  deleteCaseDocument(req.params.docId);
  touchCaseUpdatedAt(caseRow.id);
  res.json({ success: true });
});

router.post("/:id/events", llmLimiter, async (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  const data = parseOrRespond(createEventSchema, req.body, res);
  if (!data) return;

  try {
    const eventId = randomUUID();
    createCaseEvent({ id: eventId, case_id: caseRow.id, ...data });
    touchCaseUpdatedAt(caseRow.id);

    let analysis = null;
    try {
      analysis = await generateCaseAnalysis(caseRow, eventId);
    } catch (err) {
      console.error("Failed to generate case analysis:", err);
    }

    res.json({ event: getCaseEventById(eventId), analysis });
  } catch (err) {
    console.error("Unexpected error in /cases/:id/events:", err.stack || err);
    res.status(500).json({ error: "Internal Server Error", details: err.message || String(err) });
  }
});

router.post("/:id/analyze", llmLimiter, async (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  try {
    const analysis = await generateCaseAnalysis(caseRow, null);
    res.json({ analysis });
  } catch (err) {
    console.error("Unexpected error in /cases/:id/analyze:", err.stack || err);
    res.status(500).json({ error: "Internal Server Error", details: err.message || String(err) });
  }
});

router.get("/:id/analyses", (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  res.json({ analyses: getCaseAnalysesHistory(caseRow.id) });
});

router.post("/:id/ask", llmLimiter, async (req, res) => {
  const caseRow = requireOwnedCase(req, res);
  if (!caseRow) return;

  const data = parseOrRespond(askQuestionSchema, req.body, res);
  if (!data) return;

  try {
    const context = await buildCaseContext(caseRow);
    const response = await callHuggingFaceChat({
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `
          You are an expert legal assistant for Indian users, answering a question about a specific ongoing case.

          ${context}

          Using the case details above as context, answer the user's question. Return ONLY valid JSON in this exact structure:
          {
            "explanation": "Detailed explanation answering the user's question.",
            "what_to_do": ["Actionable step 1", "Actionable step 2"],
            "warnings": ["Warning 1", "Warning 2"],
            "risk_level": "low"
          }

          Question: ${data.question}
          `,
        },
      ],
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF API Error:", response.status, errText);
      return res.status(500).json({ error: "HF API failed" });
    }

    const rawData = await response.json();
    const resultContent = rawData.choices?.[0]?.message?.content;
    if (!resultContent) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanAIResponse(resultContent));
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", resultContent);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    res.json(parsed);
  } catch (err) {
    console.error("Unexpected error in /cases/:id/ask:", err.stack || err);
    res.status(500).json({ error: "Internal Server Error", details: err.message || String(err) });
  }
});

export default router;

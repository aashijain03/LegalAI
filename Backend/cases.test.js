import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("./llm.js", () => ({
  callHuggingFaceChat: vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              case_stage: "Awaiting hearing",
              overall_risk: "medium",
              progress_summary: "The case is progressing normally.",
              key_developments: [],
              recommendations: ["Attend the next hearing"],
              warnings: [],
            }),
          },
        },
      ],
    }),
    text: async () => "",
  })),
  cleanAIResponse: (text) => text.trim(),
}));

const authRoutes = (await import("./auth.js")).default;
const casesRoutes = (await import("./cases.js")).default;

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/cases", casesRoutes);

async function signupAndGetToken(email) {
  const res = await request(app)
    .post("/auth/signup")
    .send({ name: "Test User", email, password: "password123" });
  return res.body.token;
}

describe("cases routes", () => {
  let token;

  beforeEach(async () => {
    token = await signupAndGetToken(`user-${Date.now()}-${Math.random()}@example.com`);
  });

  it("creates a case", async () => {
    const res = await request(app)
      .post("/cases")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Property Dispute", case_type: "Property", description: "Land boundary dispute" });

    expect(res.status).toBe(200);
    expect(res.body.case).toMatchObject({ title: "Property Dispute", status: "active" });
  });

  it("rejects case creation without a title", async () => {
    const res = await request(app).post("/cases").set("Authorization", `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it("lists only the current user's cases", async () => {
    await request(app).post("/cases").set("Authorization", `Bearer ${token}`).send({ title: "Case A" });

    const otherToken = await signupAndGetToken(`other-${Date.now()}@example.com`);
    await request(app).post("/cases").set("Authorization", `Bearer ${otherToken}`).send({ title: "Case B" });

    const res = await request(app).get("/cases").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.cases[0].title).toBe("Case A");
  });

  it("uploads a document, keeps the original bytes, and excludes them from the case payload", async () => {
    const createRes = await request(app)
      .post("/cases")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Case With Docs" });
    const caseId = createRes.body.case.id;

    const fileContent = Buffer.from("This is the original document content.");
    const uploadRes = await request(app)
      .post(`/cases/${caseId}/documents`)
      .set("Authorization", `Bearer ${token}`)
      .attach("documents", fileContent, { filename: "notice.txt", contentType: "text/plain" });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.documents).toHaveLength(1);
    const docId = uploadRes.body.documents[0].id;

    const getRes = await request(app).get(`/cases/${caseId}`).set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.documents[0].file_data).toBeUndefined();

    const fileRes = await request(app)
      .get(`/cases/${caseId}/documents/${docId}/file`)
      .set("Authorization", `Bearer ${token}`);
    expect(fileRes.status).toBe(200);
    expect(fileRes.text).toBe(fileContent.toString());
  });

  it("adds a hearing event and returns an auto-generated analysis", async () => {
    const createRes = await request(app)
      .post("/cases")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Case With Hearing" });
    const caseId = createRes.body.case.id;

    const res = await request(app)
      .post(`/cases/${caseId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({ event_date: "2026-01-15", description: "First hearing held, case adjourned." });

    expect(res.status).toBe(200);
    expect(res.body.event.description).toMatch(/adjourned/);
    expect(res.body.analysis).toMatchObject({ overall_risk: "medium" });
  });

  it("returns 404 for a case belonging to another user", async () => {
    const createRes = await request(app)
      .post("/cases")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Private Case" });
    const caseId = createRes.body.case.id;

    const otherToken = await signupAndGetToken(`intruder-${Date.now()}@example.com`);
    const res = await request(app).get(`/cases/${caseId}`).set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});

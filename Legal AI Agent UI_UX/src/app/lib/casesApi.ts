import { API_BASE_URL } from "../api";

export type CaseStatus = "active" | "closed" | "archived";

export type CaseAnalysis = {
  case_stage: string;
  overall_risk: "low" | "medium" | "high";
  progress_summary: string;
  key_developments: { date: string; description: string; impact: "positive" | "neutral" | "negative" }[];
  recommendations: string[];
  warnings: string[];
};

export type CaseRecord = {
  id: string;
  user_id: string;
  title: string;
  case_type: string | null;
  description: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  latest_analysis?: CaseAnalysis | null;
};

export type CaseDocumentMeta = {
  id: string;
  case_id: string;
  filename: string;
  mimetype: string;
  size_bytes: number;
  uploaded_at: string;
};

export type CaseEvent = {
  id: string;
  case_id: string;
  event_date: string;
  title: string | null;
  description: string;
  next_hearing_date: string | null;
  created_at: string;
};

export type CaseDetail = {
  case: CaseRecord;
  documents: CaseDocumentMeta[];
  events: CaseEvent[];
  analysis: CaseAnalysis | null;
};

export type LegalAdviceResponse = {
  explanation?: string;
  what_to_do?: string[];
  warnings?: string[];
  risk_level?: string;
};

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function listCases(token: string): Promise<CaseRecord[]> {
  const data = await request<{ cases: CaseRecord[] }>("/cases", token);
  return data.cases;
}

export async function createCase(
  token: string,
  input: { title: string; case_type?: string; description?: string }
): Promise<CaseRecord> {
  const data = await request<{ case: CaseRecord }>("/cases", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.case;
}

export async function getCase(token: string, id: string): Promise<CaseDetail> {
  return request<CaseDetail>(`/cases/${id}`, token);
}

export async function updateCase(
  token: string,
  id: string,
  patch: Partial<{ title: string; case_type: string; description: string; status: CaseStatus }>
): Promise<CaseRecord> {
  const data = await request<{ case: CaseRecord }>(`/cases/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return data.case;
}

export async function deleteCase(token: string, id: string): Promise<void> {
  await request<{ success: boolean }>(`/cases/${id}`, token, { method: "DELETE" });
}

export async function uploadCaseDocuments(
  token: string,
  id: string,
  files: File[]
): Promise<CaseDocumentMeta[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("documents", file));

  const data = await request<{ documents: CaseDocumentMeta[] }>(`/cases/${id}/documents`, token, {
    method: "POST",
    body: formData,
  });
  return data.documents;
}

export async function deleteCaseDocument(token: string, caseId: string, docId: string): Promise<void> {
  await request<{ success: boolean }>(`/cases/${caseId}/documents/${docId}`, token, {
    method: "DELETE",
  });
}

export async function downloadCaseDocument(
  token: string,
  caseId: string,
  doc: CaseDocumentMeta
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/cases/${caseId}/documents/${doc.id}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to download document");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function addCaseEvent(
  token: string,
  id: string,
  input: { event_date: string; title?: string; description: string; next_hearing_date?: string }
): Promise<{ event: CaseEvent; analysis: CaseAnalysis | null }> {
  return request(`/cases/${id}/events`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function analyzeCase(token: string, id: string): Promise<{ analysis: CaseAnalysis }> {
  return request(`/cases/${id}/analyze`, token, { method: "POST" });
}

export async function askCaseQuestion(
  token: string,
  id: string,
  question: string
): Promise<LegalAdviceResponse> {
  return request(`/cases/${id}/ask`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

# Cases feature — per-case documents, hearing timeline, AI progress tracking

## Context

The user wants a new "Case" section: a logged-in user creates a case (e.g. a property dispute), uploads all supporting documents to it, and logs court-hearing updates over time. After each hearing update the AI automatically re-assesses the case's progress (stage, risk, summary, next steps) using everything uploaded so far plus the full hearing history, and the user can also ask case-scoped advice questions.

This is the first entity in the app with per-user ownership beyond the `users` table, and the first place original file bytes need to persist (not just extracted text) — confirmed with the user:
- **Original uploaded files are kept** (raw bytes, not just extracted text), so they can be viewed/downloaded again later.
- **Progress analysis auto-regenerates immediately every time a hearing update is logged** — no manual "analyze" button for that path (a manual fallback endpoint still exists for the case of "documents uploaded, no hearing yet").

This reuses the SQLite (`better-sqlite3`) foundation, JWT auth, zod validation, rate limiting, and multer upload-hardening added in the previous "Backend production hardening" pass (`Backend/db.js`, `Backend/config.js`, `Backend/auth.js`, `Backend/server.js`).

## Backend refactor first (small, behavior-preserving)

`cases.js` becomes the **second** consumer of several things currently only living inline in `auth.js`/`server.js` — worth extracting now rather than duplicating a third time:

- **`Backend/authMiddleware.js`** — `requireAuth(req, res, next)`, moved out of `auth.js`'s inline `getTokenUserId` helper. Sets `req.userId`, else `401`. `auth.js`'s `/me` (GET/PUT) and `/change-password` switch to using it (response bodies unchanged).
- **`Backend/validation.js`** — `parseOrRespond(schema, body, res)`, moved verbatim out of `auth.js`.
- **`Backend/llm.js`** — `fetchWithRetry`, `callHuggingFaceChat`, `cleanAIResponse`, moved out of `server.js` (avoids a circular import once `server.js` also mounts `cases.js`, and lets tests mock the whole module instead of global `fetch`).
- **`Backend/documentExtraction.js`** — `extractTextFromFile(file)`, extracting the PDF/DOCX/DOC/image branch currently duplicated in `/scan` and `/legal`.
- **`Backend/upload.js`** — the existing `ALLOWED_MIMETYPES`, `upload` (multer instance), and `handleUploadErrors`, moved out of `server.js` so `cases.js` can reuse the identical size/type rules via `.array("documents", …)`.
- **`Backend/rateLimiters.js`** — `authLimiter`, `llmLimiter` moved out of `server.js`, plus a new `casesLimiter` (60/15min — non-LLM case CRUD/uploads), so `cases.js` can import the same shared `llmLimiter` bucket used by `/scan`/`/legal`.

`server.js` and `auth.js` are updated to import from these instead of defining locally — pure refactor, existing `auth.test.js` must still pass unchanged.

## Database schema (`Backend/db.js`)

Add `db.pragma("foreign_keys = ON")` right after the existing `journal_mode = WAL` line — **required** for the `ON DELETE CASCADE` foreign keys below to actually work (better-sqlite3 doesn't enforce FKs unless this is set, and the current file never sets it).

```sql
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  case_type TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

CREATE TABLE IF NOT EXISTS case_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_data BLOB NOT NULL,
  extracted_text TEXT,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);

CREATE TABLE IF NOT EXISTS case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  next_hearing_date TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);

CREATE TABLE IF NOT EXISTS case_analyses (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  trigger_event_id TEXT REFERENCES case_events(id) ON DELETE SET NULL,
  analysis_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_analyses_case_id ON case_analyses(case_id);
```

`case_analyses` is a history table (not a column on `cases`) so "track progress" has an actual trail — each row tags which hearing triggered it. `GET /cases/:id` surfaces only the latest row; a `GET /cases/:id/analyses` endpoint exposes full history for later use, matching the same plain-prepared-statement style as the existing `users` functions (no ORM): `createCase`, `getCasesByUserId` (includes latest analysis per case for list-view risk badges), `getCaseById`, `updateCase`, `deleteCase`, `touchCaseUpdatedAt`, `createCaseDocument`, `getCaseDocumentsMeta` (excludes `file_data`/`extracted_text` — keeps case payloads light), `getCaseDocumentFile` (used only by the file-download route), `getCaseDocumentsTextForAnalysis`, `deleteCaseDocument`, `getCaseStorageUsage`, `createCaseEvent`, `getCaseEventsByCaseId`, `createCaseAnalysis`, `getLatestCaseAnalysis`, `getCaseAnalysesHistory`.

## Backend API (`Backend/cases.js`, mounted at `/cases`, `requireAuth` applied first)

Every `:id` route loads the case and checks `case.user_id === req.userId`, returning **404** (not 403) either way so the API never reveals another user's case exists.

| Method & path | Limiter | Purpose |
|---|---|---|
| `POST /cases` | `casesLimiter` | Create case `{title, case_type?, description?}`, status defaults `"active"`. |
| `GET /cases` | — | List the user's cases, newest-updated first, each with its latest analysis (for a risk badge). |
| `GET /cases/:id` | — | `{case, documents (metadata only), events, analysis}` — no file bytes, no raw extracted text. |
| `PATCH /cases/:id` | `casesLimiter` | Partial update (title/case_type/description/status). |
| `DELETE /cases/:id` | `casesLimiter` | Deletes case; cascades documents/events/analyses via FK. |
| `POST /cases/:id/documents` | `casesLimiter` | `upload.array("documents", 5)` + `handleUploadErrors`; checks total case storage (`config.maxCaseStorageBytes`, default 50MB) before accepting; extracts text per file via `extractTextFromFile`, stores bytes + text; does **not** trigger analysis (see rationale below). |
| `GET /cases/:id/documents/:docId/file` | — | Streams the raw file bytes with correct `Content-Type`/`Content-Disposition` — kept separate from the JSON payload so blobs never ride along with `GET /cases/:id`. |
| `DELETE /cases/:id/documents/:docId` | `casesLimiter` | Removes one document. |
| `POST /cases/:id/events` | `llmLimiter` | Logs a hearing update `{event_date, description, title?, next_hearing_date?}`, then **immediately** regenerates the analysis and returns `{event, analysis}` — this is the auto-regenerate requirement. |
| `POST /cases/:id/analyze` | `llmLimiter` | On-demand regeneration (used when documents exist but no hearing has happened yet). |
| `GET /cases/:id/analyses` | — | Full analysis history. |
| `POST /cases/:id/ask` | `llmLimiter` | Case-scoped Q&A `{question}` → same response shape as `/legal` (`explanation`, `what_to_do`, `warnings`, `risk_level`) so the frontend can reuse `LegalAdvice.tsx`'s rendering. |

**Why upload doesn't itself trigger analysis:** the ask ties "progress" specifically to hearing updates; auto-analyzing on every one of up to 5 uploaded files would multiply LLM cost for no requested benefit. Uploaded documents still feed into context whenever an analysis *is* generated.

**`generateCaseAnalysis(caseRow, triggerEventId)`** builds a prompt from case title/type/description + concatenated document text (capped ~10k chars) + the full chronological hearing timeline, calls `callHuggingFaceChat` (`temperature: 0.2`, forced JSON), and expects:
```json
{
  "case_stage": "e.g. Filing / Awaiting hearing / Evidence phase / Awaiting judgment / Closed",
  "overall_risk": "low | medium | high",
  "progress_summary": "plain-language narrative of how the case has evolved",
  "key_developments": [{ "date": "YYYY-MM-DD", "description": "...", "impact": "positive | neutral | negative" }],
  "recommendations": ["..."],
  "warnings": ["..."]
}
```
This mirrors the existing `/scan` (`keyFindings`/`recommendations`) and `/legal` (`what_to_do`/`warnings`/`risk_level`) JSON shapes closely enough that `DocumentAnalysis.tsx`'s badge/card rendering and `LegalAdvice.tsx`'s list rendering patterns can be reused almost as-is. Parsed via the existing `cleanAIResponse` + `JSON.parse` pattern, persisted to `case_analyses`.

`Backend/config.js` gains `maxCaseStorageBytes` (default 50MB via `MAX_CASE_STORAGE_MB` env override) and `maxCaseDocumentsPerUpload: 5`.

## Frontend

- **`routes.tsx`**: add `{ path: "cases", Component: CasesList }` and `{ path: "cases/:id", Component: CaseDetail }`.
- **`Layout.tsx`**: add a "Cases" nav link (only rendered when `user` is present, like the profile link), and finally mount `<Toaster />` from the already-installed-but-unused `ui/sonner.tsx` — this feature is the first with several async actions (upload/save/delete) that benefit from toast confirmations instead of `alert()`.
- **`src/app/lib/casesApi.ts`** (new): a small typed fetch client (`listCases`, `createCase`, `getCase`, `updateCase`, `deleteCase`, `uploadCaseDocuments`, `deleteCaseDocument`, a helper to fetch a case file as a blob for viewing/downloading, `addCaseEvent`, `askCaseQuestion`), each attaching `Authorization: Bearer <token>`. This is a deliberate, scoped exception to the rest of the app's ad-hoc-`fetch`-per-component convention — a single case detail page needs 6+ authenticated calls, and repeating that boilerplate that many times in one file is worse than the 1-2 calls each existing page makes today. Not a project-wide migration.
- **`components/CasesList.tsx`** (new): guard redirect to `/login` if logged out (same pattern as `Profile.tsx`); grid of `Card`s with title/type/status/risk badge (reusing `DocumentAnalysis.tsx`'s risk-badge color mapping); "New Case" button opens a `Dialog` form.
- **`components/CaseDetail.tsx`** (new) with `Tabs` (`ui/tabs.tsx`):
  - **Overview** — renders the latest analysis using `DocumentAnalysis.tsx`/`LegalAdvice.tsx`'s existing badge/list rendering patterns; empty state offers the manual "Analyze" action.
  - **Documents** — multi-file drag-and-drop (styled like `ScanDocument.tsx` but accepting multiple files), list of uploaded documents with view/download and delete.
  - **Timeline** — `Accordion` of hearing events, newest first; "Add Hearing Update" dialog with a date picker (`ui/calendar.tsx` + `date-fns`, already installed) and description textarea; on success, updates the Overview tab's analysis and shows a toast.
  - **Ask AI** — reuses `LegalAdvice.tsx`'s chat-bubble rendering, posting to the case-scoped `/ask` endpoint instead of `/legal`.
  - Split into `components/cases/{CaseDocuments,CaseTimeline,CaseAdvice,NewCaseDialog,AddHearingDialog}.tsx` given the surface area.

## Files touched

**New:** `Backend/authMiddleware.js`, `Backend/validation.js`, `Backend/llm.js`, `Backend/documentExtraction.js`, `Backend/upload.js`, `Backend/rateLimiters.js`, `Backend/cases.js`, `Backend/cases.test.js`, `Legal AI Agent UI_UX/src/app/lib/casesApi.ts`, `Legal AI Agent UI_UX/src/app/components/CasesList.tsx`, `.../CaseDetail.tsx`, `.../cases/{CaseDocuments,CaseTimeline,CaseAdvice,NewCaseDialog,AddHearingDialog}.tsx`

**Modified:** `Backend/db.js` (tables + pragma), `Backend/config.js` (new limits), `Backend/auth.js` (use extracted middleware/validation), `Backend/server.js` (use extracted modules, mount `/cases`), `Legal AI Agent UI_UX/src/app/routes.tsx`, `.../components/Layout.tsx`

## Verification

- `npm test` in `Backend/` — existing `auth.test.js` still passes after the refactor (no behavior change), plus new `cases.test.js` (mocking `Backend/llm.js`'s `callHuggingFaceChat` so tests don't need a real `HF_API_KEY`): create case → upload a small file → confirm metadata-only in `GET /cases/:id` → fetch the file endpoint and confirm byte-identical → add a hearing event and confirm an `analysis` comes back → confirm a second user gets 404 on the first user's case/file/event/ask endpoints.
- Manual walkthrough via the running frontend: create a case, upload a real PDF, download it back, add a hearing update and watch the Overview tab update without a manual button, add a second hearing update and confirm the analysis changes, ask a case-scoped question, confirm oversized/disallowed uploads get the same clean 400 as `/scan` already does, and confirm exceeding the case storage cap returns a clean 400.

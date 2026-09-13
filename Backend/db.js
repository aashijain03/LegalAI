import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "./config.js";

const DB_PATH = config.dbPath || path.join(process.cwd(), "data", "app.db");
const USERS_JSON_PATH = path.join(process.cwd(), "users.json");

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

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
`);

function migrateFromUsersJsonIfNeeded() {
  if (DB_PATH === ":memory:") {
    return;
  }

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  if (count > 0 || !fs.existsSync(USERS_JSON_PATH)) {
    return;
  }

  const users = JSON.parse(fs.readFileSync(USERS_JSON_PATH, "utf-8"));
  const insert = db.prepare(
    "INSERT INTO users (id, name, email, password, created_at) VALUES (@id, @name, @email, @password, @created_at)"
  );

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        created_at: new Date(Number(row.id) || Date.now()).toISOString(),
      });
    }
  });

  if (users.length > 0) {
    insertMany(users);
    console.log(`Migrated ${users.length} user(s) from users.json into SQLite`);
  }
}

migrateFromUsersJsonIfNeeded();

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function createUser({ id, name, email, password }) {
  db.prepare(
    "INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, email, password, new Date().toISOString());
}

export function updateUserName(id, name) {
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
}

export function updateUserPassword(id, password) {
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, id);
}

const getLatestCaseAnalysisStmt = db.prepare(
  "SELECT analysis_json FROM case_analyses WHERE case_id = ? ORDER BY created_at DESC LIMIT 1"
);

export function createCase({ id, user_id, title, case_type, description }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO cases (id, user_id, title, case_type, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(id, user_id, title, case_type || null, description || null, now, now);
}

export function getCasesByUserId(user_id) {
  const cases = db
    .prepare("SELECT * FROM cases WHERE user_id = ? ORDER BY updated_at DESC")
    .all(user_id);

  return cases.map((c) => {
    const row = getLatestCaseAnalysisStmt.get(c.id);
    return { ...c, latest_analysis: row ? JSON.parse(row.analysis_json) : null };
  });
}

export function getCaseById(id) {
  return db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
}

export function updateCase(id, { title, case_type, description, status }) {
  const existing = getCaseById(id);
  if (!existing) return;

  db.prepare(
    `UPDATE cases SET title = ?, case_type = ?, description = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    title ?? existing.title,
    case_type ?? existing.case_type,
    description ?? existing.description,
    status ?? existing.status,
    new Date().toISOString(),
    id
  );
}

export function deleteCase(id) {
  db.prepare("DELETE FROM cases WHERE id = ?").run(id);
}

export function touchCaseUpdatedAt(id) {
  db.prepare("UPDATE cases SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

export function createCaseDocument({ id, case_id, filename, mimetype, size_bytes, file_data, extracted_text }) {
  db.prepare(
    `INSERT INTO case_documents (id, case_id, filename, mimetype, size_bytes, file_data, extracted_text, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, case_id, filename, mimetype, size_bytes, file_data, extracted_text || null, new Date().toISOString());
}

export function getCaseDocumentsMeta(case_id) {
  return db
    .prepare(
      "SELECT id, case_id, filename, mimetype, size_bytes, uploaded_at FROM case_documents WHERE case_id = ? ORDER BY uploaded_at ASC"
    )
    .all(case_id);
}

export function getCaseDocumentFile(id) {
  return db
    .prepare("SELECT id, case_id, filename, mimetype, file_data FROM case_documents WHERE id = ?")
    .get(id);
}

export function getCaseDocumentsTextForAnalysis(case_id) {
  return db
    .prepare(
      "SELECT filename, extracted_text FROM case_documents WHERE case_id = ? ORDER BY uploaded_at DESC"
    )
    .all(case_id);
}

export function deleteCaseDocument(id) {
  db.prepare("DELETE FROM case_documents WHERE id = ?").run(id);
}

export function getCaseStorageUsage(case_id) {
  const row = db
    .prepare("SELECT COALESCE(SUM(size_bytes), 0) AS total FROM case_documents WHERE case_id = ?")
    .get(case_id);
  return row.total;
}

export function createCaseEvent({ id, case_id, event_date, title, description, next_hearing_date }) {
  db.prepare(
    `INSERT INTO case_events (id, case_id, event_date, title, description, next_hearing_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, case_id, event_date, title || null, description, next_hearing_date || null, new Date().toISOString());
}

export function getCaseEventsByCaseId(case_id) {
  return db
    .prepare("SELECT * FROM case_events WHERE case_id = ? ORDER BY event_date ASC, created_at ASC")
    .all(case_id);
}

export function getCaseEventById(id) {
  return db.prepare("SELECT * FROM case_events WHERE id = ?").get(id);
}

export function createCaseAnalysis({ id, case_id, trigger_event_id, analysis_json }) {
  db.prepare(
    `INSERT INTO case_analyses (id, case_id, trigger_event_id, analysis_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, case_id, trigger_event_id || null, analysis_json, new Date().toISOString());
}

export function getLatestCaseAnalysis(case_id) {
  const row = getLatestCaseAnalysisStmt.get(case_id);
  return row ? JSON.parse(row.analysis_json) : null;
}

export function getCaseAnalysesHistory(case_id) {
  return db
    .prepare("SELECT * FROM case_analyses WHERE case_id = ? ORDER BY created_at DESC")
    .all(case_id)
    .map((row) => ({ ...row, analysis: JSON.parse(row.analysis_json) }));
}

export default db;

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = (process.env.DB_PATH && process.env.DB_PATH.trim())
  ? process.env.DB_PATH
  : path.join(__dirname, "data.db");
const db = new Database(DB_PATH);

// Performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL,
    plan        TEXT DEFAULT 'free',         -- free | base | pro | studio
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    computi_used INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS computi (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titolo      TEXT NOT NULL,
    regione     TEXT NOT NULL,
    anno        TEXT NOT NULL,
    rows_json   TEXT NOT NULL,              -- JSON array delle voci
    totale      REAL NOT NULL,
    note        TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stripe_events (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    processed_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Plan limits ───────────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free:   3,
  base:   30,
  pro:    9999,
  studio: 9999,
};

module.exports = { db, PLAN_LIMITS };

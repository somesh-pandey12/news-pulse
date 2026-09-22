// Uses Node's built-in SQLite module (available from Node 22.5+) instead of
// better-sqlite3. This means there's no native addon to compile, so no
// Visual Studio / build tools are needed on Windows. It prints one
// "experimental" warning on startup the first time - that's expected.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, process.env.DB_PATH)
  : path.resolve(__dirname, '../data/news_pulse.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    full_text TEXT,
    link TEXT NOT NULL UNIQUE,
    published_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    extraction_status TEXT DEFAULT 'ok'
  );

  CREATE TABLE IF NOT EXISTS clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cluster_articles (
    cluster_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    PRIMARY KEY (cluster_id, article_id),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ingest_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    message TEXT,
    started_at TEXT,
    finished_at TEXT
  );
`);

module.exports = db;
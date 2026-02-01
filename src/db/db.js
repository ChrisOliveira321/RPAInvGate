const Database = require('better-sqlite3');

const db = new Database('tickets.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  titulo TEXT,
  local TEXT,
  url TEXT,
  collected_at TEXT
)
`).run();

module.exports = db;

const Database = require('better-sqlite3');

const db = new Database('tickets.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  titulo TEXT,
  local TEXT,
  url TEXT,
  collected_at TEXT,

  has_activity INTEGER NOT NULL DEFAULT 0,

  -- status calculado do ticket (seu repo já usa)
  status TEXT,

  -- descrição completa do detalhe
  description_text TEXT,

  -- ✅ classificação CFTV (nova etapa)
  issue_type TEXT,
  camera_id TEXT,

  details_collected INTEGER NOT NULL DEFAULT 0,
  details_collected_at TEXT
)
`).run();


// -----------------------------
// Migração segura pra quem já tem tabela antiga
// -----------------------------
function ensureColumn(name, ddl) {
  const cols = db.prepare(`PRAGMA table_info(tickets)`)
    .all()
    .map(c => c.name);

  if (!cols.includes(name)) {
    db.prepare(ddl).run();
  }
}

ensureColumn(
  'has_activity',
  `ALTER TABLE tickets ADD COLUMN has_activity INTEGER NOT NULL DEFAULT 0`
);

ensureColumn(
  'status',
  `ALTER TABLE tickets ADD COLUMN status TEXT`
);

ensureColumn(
  'description_text',
  `ALTER TABLE tickets ADD COLUMN description_text TEXT`
);

// ✅ novas colunas
ensureColumn(
  'issue_type',
  `ALTER TABLE tickets ADD COLUMN issue_type TEXT`
);

ensureColumn(
  'camera_id',
  `ALTER TABLE tickets ADD COLUMN camera_id TEXT`
);

ensureColumn(
  'details_collected',
  `ALTER TABLE tickets ADD COLUMN details_collected INTEGER NOT NULL DEFAULT 0`
);

ensureColumn(
  'details_collected_at',
  `ALTER TABLE tickets ADD COLUMN details_collected_at TEXT`
);

module.exports = db;

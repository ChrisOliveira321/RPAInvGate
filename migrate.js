// migrate.js
const Database = require('better-sqlite3');

const db = new Database('tickets.db');

function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function ensureColumn(table, column, ddl) {
  if (!hasColumn(table, column)) {
    console.log(`➕ Adicionando coluna ${table}.${column}...`);
    db.prepare(ddl).run();
  } else {
    console.log(`✅ Coluna ${table}.${column} já existe`);
  }
}
 
function hasTable(table) {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);
  return !!row;
}

console.log('🛠️ Iniciando migração...');

if (!hasTable('tickets')) {
  console.log('🆕 Criando tabela tickets...');
  db.prepare(`
    CREATE TABLE tickets (
      ticket_id TEXT PRIMARY KEY,
      titulo TEXT,
      local TEXT,
      url TEXT,
      collected_at TEXT
    )
  `).run();
  console.log('✅ Tabela tickets criada');
} else {
  console.log('✅ Tabela tickets já existe');
}

// Colunas novas (safe)
ensureColumn(
  'tickets',
  'has_activity',
  `ALTER TABLE tickets ADD COLUMN has_activity INTEGER NOT NULL DEFAULT 0`
);

ensureColumn(
  'tickets',
  'status',
  `ALTER TABLE tickets ADD COLUMN status TEXT`
);

ensureColumn(
  'tickets',
  'details_collected',
  `ALTER TABLE tickets ADD COLUMN details_collected INTEGER NOT NULL DEFAULT 0`
);

ensureColumn(
  'tickets',
  'details_collected_at',
  `ALTER TABLE tickets ADD COLUMN details_collected_at TEXT`
);

// Opcional: preencher status para registros antigos baseado em has_activity
if (hasColumn('tickets', 'status') && hasColumn('tickets', 'has_activity')) {
  console.log('🧠 Preenchendo status para registros existentes (se estiver null)...');
  db.prepare(`
    UPDATE tickets
    SET status = CASE
      WHEN has_activity = 1 THEN 'Em Tratativa'
      ELSE 'Primeiro Atendimento Pendente'
    END
    WHERE status IS NULL
  `).run();
  console.log('✅ Status preenchido');
}

db.close();
console.log('🎉 Migração concluída com sucesso!');

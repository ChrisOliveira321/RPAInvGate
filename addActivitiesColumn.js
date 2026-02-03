const db = require('./src/db/db');

try {
  db.prepare(`
    ALTER TABLE tickets
    ADD COLUMN activities_text TEXT
  `).run();

  console.log('✅ Coluna activities_text criada');
} catch (e) {
  if (String(e.message).includes('duplicate column')) {
    console.log('ℹ️ Coluna activities_text já existe');
  } else {
    throw e;
  }
}

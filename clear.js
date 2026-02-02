const db = require('./src/db/db');

db.prepare('DELETE FROM tickets').run();

console.log('🧹 Tabela tickets limpa');

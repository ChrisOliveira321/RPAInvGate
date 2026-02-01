const db = require('./src/db/db');

const rows = db.prepare('SELECT * FROM tickets ORDER BY collected_at DESC').all();
console.log(rows);

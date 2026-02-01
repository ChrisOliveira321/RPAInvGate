const db = require('./db');

const upsert = db.prepare(`
INSERT INTO tickets (ticket_id, titulo, local, url, collected_at)
VALUES (@ticket_id, @titulo, @local, @url, @collected_at)
ON CONFLICT(ticket_id) DO UPDATE SET
  titulo=excluded.titulo,
  local=excluded.local,
  url=excluded.url,
  collected_at=excluded.collected_at
`);

function saveTicket(t) {
  upsert.run(t);
}

module.exports = { saveTicket };

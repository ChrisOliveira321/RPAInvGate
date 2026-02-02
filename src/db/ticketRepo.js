const db = require('./db');

const upsertTriage = db.prepare(`
INSERT INTO tickets (ticket_id, titulo, local, url, collected_at, has_activity)
VALUES (@ticket_id, @titulo, @local, @url, @collected_at, @has_activity)
ON CONFLICT(ticket_id) DO UPDATE SET
  titulo = COALESCE(excluded.titulo, tickets.titulo),
  url = COALESCE(excluded.url, tickets.url),
  collected_at = excluded.collected_at,
  has_activity = excluded.has_activity,
  local = COALESCE(tickets.local, excluded.local)
`);

const upsertDetails = db.prepare(`
INSERT INTO tickets (ticket_id, titulo, local, url, collected_at, has_activity, details_collected, details_collected_at)
VALUES (@ticket_id, @titulo, @local, @url, @collected_at, @has_activity, 1, @details_collected_at)
ON CONFLICT(ticket_id) DO UPDATE SET
  titulo = COALESCE(excluded.titulo, tickets.titulo),
  local = COALESCE(NULLIF(excluded.local, ''), tickets.local),
  url = COALESCE(excluded.url, tickets.url),
  collected_at = excluded.collected_at,
  has_activity = excluded.has_activity,
  details_collected = 1,
  details_collected_at = excluded.details_collected_at
`);

function saveTicketTriage(t) {
  upsertTriage.run(t);
}

function saveTicketDetails(t) {
  upsertDetails.run({
    ...t,
    details_collected_at: new Date().toISOString()
  });
}

module.exports = { saveTicketTriage, saveTicketDetails };

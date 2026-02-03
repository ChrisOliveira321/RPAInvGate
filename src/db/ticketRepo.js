// ./src/db/ticketRepo.js
const db = require('./db');

function computeStatus(has_activity) {
  // 0/1
  return has_activity ? 'Em Tratativa' : 'Primeiro Atendimento Pendente';
}

// ✅ TRIAGEM (NÃO grava status)
const upsertTriage = db.prepare(`
INSERT INTO tickets (ticket_id, titulo, local, url, collected_at, has_activity)
VALUES (@ticket_id, @titulo, @local, @url, @collected_at, @has_activity)
ON CONFLICT(ticket_id) DO UPDATE SET
  titulo = COALESCE(excluded.titulo, tickets.titulo),
  url = COALESCE(excluded.url, tickets.url),
  collected_at = excluded.collected_at,
  has_activity = excluded.has_activity,
  local = COALESCE(tickets.local, NULLIF(excluded.local, ''))
`);

// ✅ DETALHE (grava status + descrição + marca details_collected)
const upsertDetails = db.prepare(`
INSERT INTO tickets (
  ticket_id, titulo, local, url, collected_at,
  has_activity, status, description_text,
  details_collected, details_collected_at
)
VALUES (
  @ticket_id, @titulo, @local, @url, @collected_at,
  @has_activity, @status, @description_text,
  1, @details_collected_at
)
ON CONFLICT(ticket_id) DO UPDATE SET
  titulo = COALESCE(excluded.titulo, tickets.titulo),
  local  = COALESCE(NULLIF(excluded.local, ''), tickets.local),
  url    = COALESCE(excluded.url, tickets.url),
  collected_at = excluded.collected_at,
  has_activity = excluded.has_activity,
  status = excluded.status,
  description_text = COALESCE(excluded.description_text, tickets.description_text),
  details_collected = 1,
  details_collected_at = excluded.details_collected_at
`);

function saveTicketTriage(t) {
  const has_activity = t.has_activity ? 1 : 0;

  upsertTriage.run({
    ticket_id: String(t.ticket_id),
    titulo: t.titulo ?? null,
    local: t.local ?? null,
    url: t.url ?? null,
    collected_at: t.collected_at ?? new Date().toISOString(),
    has_activity,
  });
}

function saveTicketDetails(t) {
  const has_activity = t.has_activity ? 1 : 0;
  const status = computeStatus(has_activity);

  if (!t.ticket_id) throw new Error('saveTicketDetails: ticket_id ausente');

  upsertDetails.run({
    ticket_id: String(t.ticket_id),
    titulo: t.titulo ?? null,
    local: t.local ?? null,
    url: t.url ?? null,
    collected_at: t.collected_at ?? new Date().toISOString(),
    has_activity,
    status,
    // aceita tanto description_text quanto descriptionText (pra não quebrar)
    description_text: t.description_text ?? t.descriptionText ?? null,
    details_collected_at: new Date().toISOString(),
  });
}

module.exports = { saveTicketTriage, saveTicketDetails };

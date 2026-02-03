// ./src/db/ticketRepo.js
const db = require('./db');

/**
 * Status de negócio:
 * 1) se activities_text tiver "worksystem" -> "Enviado para WorkSystem"
 * 2) senão, lógica antiga via has_activity
 */
function computeStatus({ has_activity, activities_text }) {
  const a = (activities_text || '').toLowerCase();

  if (a.includes('worksystem')) {
    return 'Enviado para WorkSystem';
  }

  return has_activity ? 'Em Tratativa' : 'Primeiro Atendimento Pendente';
}

// ✅ TRIAGEM
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

// ✅ DETALHE
// ✅ NOVO: activities_text
const upsertDetails = db.prepare(`
INSERT INTO tickets (
  ticket_id, titulo, local, url, collected_at,
  has_activity, status,
  description_text,
  activities_text,
  issue_type, camera_id,
  details_collected, details_collected_at
)
VALUES (
  @ticket_id, @titulo, @local, @url, @collected_at,
  @has_activity, @status,
  @description_text,
  @activities_text,
  @issue_type, @camera_id,
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
  activities_text  = COALESCE(excluded.activities_text, tickets.activities_text),
  issue_type = COALESCE(excluded.issue_type, tickets.issue_type),
  camera_id  = COALESCE(excluded.camera_id, tickets.camera_id),
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
  if (!t.ticket_id) throw new Error('saveTicketDetails: ticket_id ausente');

  const has_activity = t.has_activity ? 1 : 0;

  // ✅ recebe activities_text do TicketPage (já em minúsculo)
  const activities_text =
    t.activities_text ??
    (Array.isArray(t.activities_list) ? t.activities_list.join('\n---\n').toLowerCase() : null);

  const status = computeStatus({ has_activity, activities_text });

  upsertDetails.run({
    ticket_id: String(t.ticket_id),
    titulo: t.titulo ?? t.title ?? null,
    local: t.local ?? null,
    url: t.url ?? null,
    collected_at: t.collected_at ?? new Date().toISOString(),
    has_activity,
    status,

    description_text: t.description_text ?? t.descriptionText ?? null,

    // ✅ novo campo no DB
    activities_text,

    issue_type: t.issue_type ?? null,
    camera_id: t.camera_id ?? null,

    details_collected_at: new Date().toISOString(),
  });
}

module.exports = { saveTicketTriage, saveTicketDetails };

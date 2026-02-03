// src/rules/ticketStatus.js

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapBusinessStatus(invGateStatusText, activityText) {
  const s = normalize(invGateStatusText);
  const a = normalize(activityText);

  // ✅ Regra principal: pelo DOM do status
  if (s.includes('worksystem') || s.includes('entidade externa')) {
    return 'Enviado para WorkSystem';
  }

  if (s.includes('ao agente') || s.includes('agente')) {
    return 'Primeiro Atendimento Pendente';
  }

  // 🛟 Fallback: activity (quando o DOM falhar)
  if (a.includes('worksystem') && (a.includes('encaminhado') || a.includes('enviado') || a.includes('terceir'))) {
    return 'Enviado para WorkSystem';
  }

  return 'Em Tratativa';
}

module.exports = { mapBusinessStatus };

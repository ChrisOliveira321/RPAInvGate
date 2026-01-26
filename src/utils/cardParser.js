function parseCardNumberFromIdAttr(idAttr) {
  const m = (idAttr || '').match(/^card_(\d+)$/)
  return m ? m[1] : null
}

function parseFooterTicketNumber(text) {
  const m = (text || '').match(/#(\d+)/)
  return m ? m[1] : null
}

function pickCategoryFromText(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean)
  return lines.find(l => l.includes('»')) || null
}

function pickTitleFromBodyText(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean)

  const banned = [
    /^sem atribuir$/i,
    /^m[eé]dia$/i,
    /^urgente$/i,
    /^p\.\s*resp/i,
    /^res\./i,
  ]

  for (const l of lines) {
    if (l.length < 4) continue
    if (l.includes('»')) continue
    if (banned.some(r => r.test(l))) continue
    return l
  }

  return lines[0] || null
}

function pickRequesterFromFooter(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean)

  for (const l of lines) {
    if (l.includes('#')) continue
    if (/^(matriz|gimpo|gexpo|rio grande|sem empresas)$/i.test(l)) continue
    return l
  }

  return null
}

// ✅ função “final” pra montar o objeto do card (deixa MyWorkPage limpo)
function parseCardData({ idAttr, bodyText, footerText, priority, url }) {
  const numberFromId = parseCardNumberFromIdAttr(idAttr)
  const numberFromFooter = parseFooterTicketNumber(footerText)
  const number = numberFromId || numberFromFooter

  return {
    number,
    title: pickTitleFromBodyText(bodyText),
    category: pickCategoryFromText(bodyText),
    requester: pickRequesterFromFooter(footerText),
    priority: priority || null,
    url: url || null,
  }
}

module.exports = {
  parseCardNumberFromIdAttr,
  pickCategoryFromText,
  pickTitleFromBodyText,
  parseFooterTicketNumber,
  pickRequesterFromFooter,
  parseCardData,
}

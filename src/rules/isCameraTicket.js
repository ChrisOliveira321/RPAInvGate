function isCameraTicket(ticket) {
  const cat = (ticket.category || '').toUpperCase()

  // cobre "CFTV»CAMERAS", "CFTV»CÂMERAS", etc.
  if (cat.includes('CFTV') && cat.includes('CAMER')) return true

  // fallback: às vezes a categoria vem diferente mas ainda é câmera
  if (cat.includes('CAMER')) return true

  return false
}

module.exports = { isCameraTicket }

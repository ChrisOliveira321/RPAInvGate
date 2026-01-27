function isCftvTicket(ticket) {
  const category = (ticket.category || '').toUpperCase()
  return category.includes('CFTV')
}

module.exports = { isCftvTicket }

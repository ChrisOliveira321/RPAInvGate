const { isCftvTicket } = require('../rules/isCftvTicket')

function selectTicketsToOpen(cards, limit = 10) {
  return cards
    .filter(isCftvTicket)
    .filter(c => c.url)
    .slice(0, limit)
}

module.exports = { selectTicketsToOpen }

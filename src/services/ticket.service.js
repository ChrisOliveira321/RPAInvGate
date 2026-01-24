async function extractTicketData(ticket) {
  let numero = 'Número não encontrado'
  let url = ''

  const link = await ticket.$(
    'a[href*="/requests/show/index/id/"]'
  )

  if (link) {
    const href = await link.getAttribute('href')
    const match = href.match(/id\/(\d+)/)

    if (match) {
      numero = `#${match[1]}`
      url = `https://rochalog.sd.cloud.invgate.net${href}`
    }
  }

  const tituloEl = await ticket.$('.item-title')
  const titulo = tituloEl
    ? (await tituloEl.innerText()).trim()
    : 'Sem título'

  const breadcrumbEl = await ticket.$('.card-breadcrumb-text')
  const breadcrumb = breadcrumbEl
    ? await breadcrumbEl.innerText()
    : ''

  return { numero, url, titulo, breadcrumb }
}

module.exports = { extractTicketData }

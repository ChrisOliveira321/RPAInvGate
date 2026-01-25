class MyWorkPage {
  constructor(page) {
    this.page = page
  }

  async open() {
    await this.page.goto(
      'https://rochalog.sd.cloud.invgate.net/mywork',
      { waitUntil: 'domcontentloaded' }
    )
    console.log('🌐 Página MyWork aberta')
  }

  async waitLogin() {
    await this.page.waitForSelector(
      'div.section-head-tab-content',
      { timeout: 0 }
    )
    console.log('✅ Login detectado')
  }

  async openUnassignedTab() {
    console.log('🔍 Abrindo aba "Sem atribuir"...')

    const aba = this.page
      .locator('div.section-head-tab-content:has-text("Sem atribuir")')
      .first()

    await aba.waitFor({ state: 'visible', timeout: 10000 })
    await aba.click({ force: true })

    console.log('✅ Aba "Sem atribuir" aberta')
    await this.page.waitForTimeout(3000)
  }

  async scrollToLoadAllCards() {
    console.log('⏳ Scrollando para carregar todos os cards...')
    let lastHeight = 0

    while (true) {
      const height = await this.page.evaluate(
        () => document.body.scrollHeight
      )

      if (height === lastHeight) break
      lastHeight = height

      await this.page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight)
      )

      await this.page.waitForTimeout(1200)
    }

    console.log('✅ Todos os cards carregados')
  }

  async getTicketsCount() {
    return await this.page.locator('.card').count()
  }

  getTicketByIndex(index) {
    return this.page.locator('.card').nth(index)
  }

  async openTicket(ticketEl) {
    await ticketEl.click()
    console.log('🎯 Ticket aberto')
  }

  async readTicketByIndex(index) {
  const ticket = this.page.locator('.card').nth(index)

  // 🔹 TÍTULO
  const titleEl = ticket.locator('.item-title').first()
  const title = await titleEl.count()
    ? (await titleEl.innerText()).trim()
    : 'Sem título'

  // 🔹 CATEGORIA / BREADCRUMB
  const breadcrumbEl = ticket.locator('.card-breadcrumb-text').first()
  const breadcrumb = await breadcrumbEl.count()
    ? (await breadcrumbEl.innerText())
        .toUpperCase()
        .replace(/\s+/g, '')
    : ''

  // 🔹 LINK / ID
  const linkEl = ticket.locator(
    'a[href*="/requests/show/index/id/"]'
  ).first()

  let id = 'N/A'
  let url = ''

  if (await linkEl.count()) {
    const href = await linkEl.getAttribute('href')
    const match = href.match(/id\/(\d+)/)

    if (match) {
      id = `#${match[1]}`
      url = `https://rochalog.sd.cloud.invgate.net${href}`
    }
  }

  return { id, url, title, breadcrumb }
}

}

module.exports = { MyWorkPage }

class TicketPage {
  constructor(page) {
    this.page = page
  }

  // Aguarda o ticket carregar
  async waitLoaded() {
    await this.page.waitForSelector(
      'div.ticket-header',
      { timeout: 15000 }
    )
    console.log('📄 Ticket carregado')
  }

  // Extrai dados principais do ticket
  async readData() {
    const ticketNumber = await this.page.locator(
      '.ticket-id'
    ).innerText()

    const title = await this.page.locator(
      '.ticket-title'
    ).innerText()

    console.log(`👁️ Ticket ${ticketNumber} - ${title}`)

    // 🔥 aqui depois entram:
    // - atividades
    // - CF
    // - SLA
    // - prioridade
  }

  // Volta para a fila
  async goBack() {
    await this.page.goBack()
    await this.page.waitForTimeout(2000)
    console.log('↩️ Voltou para MyWork')
  }
}

module.exports = { TicketPage }

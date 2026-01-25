class TicketPage {
  constructor(page) {
    this.page = page
  }

  async waitLoaded() {
    console.log('⏳ Aguardando TicketPage carregar...')
    await this.page.waitForSelector('.item-title', { timeout: 15000 })
    console.log('📄 TicketPage carregado')
  }

  // 🔮 FUTURO: atividade, comentários, SLA
  async readLastActivity() {
    // exemplo futuro
  }

  async goBack() {
    console.log('↩️ Voltando para MyWork...')
    await this.page.goBack()
    await this.page.waitForTimeout(2000)
  }
}

module.exports = { TicketPage }

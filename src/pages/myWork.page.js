class MyWorkPage {
  constructor(page) {
    this.page = page
  }

  // Abre a página MyWork
  async open() {
    await this.page.goto(
      'https://rochalog.sd.cloud.invgate.net/mywork',
      { waitUntil: 'domcontentloaded' }
    )
    console.log('🌐 Página MyWork aberta')
  }

  // Aguarda o login manual
  async waitLogin() {
    await this.page.waitForSelector(
      'div.section-head-tab-content',
      { timeout: 0 }
    )
    console.log('✅ Login detectado')
  }

  // Abre a aba "Sem atribuir" (mesma lógica do código antigo que funcionava)
  async openUnassignedTab() {
    console.log('🔍 Tentando abrir aba "Sem atribuir" (modo humano)...')

    const aba = this.page.locator(
      'div.section-head-tab-content:has-text("Sem atribuir")'
    ).first()

    await aba.waitFor({ state: 'visible', timeout: 10000 })

    const box = await aba.boundingBox()
    if (!box) {
      throw new Error('❌ Não foi possível obter posição da aba')
    }

    const x = box.x + box.width / 2
    const y = box.y + box.height / 2

    // 🧠 simula mouse humano
    await this.page.mouse.move(x, y)
    await this.page.mouse.down()
    await this.page.waitForTimeout(100)
    await this.page.mouse.up()

    console.log('🟡 Clique humano realizado')

    // espera longa pro SPA reagir
    await this.page.waitForTimeout(4000)
  }




  // Scroll infinito para garantir que todos os cards carreguem
  async scrollToLoadAllCards() {
    console.log('⏳ Fazendo scroll para carregar todos os cards...')
    let previousHeight = 0

    while (true) {
      const currentHeight = await this.page.evaluate(
        () => document.body.scrollHeight
      )

      if (currentHeight === previousHeight) break

      previousHeight = currentHeight
      await this.page.evaluate(
        () => window.scrollTo(0, document.body.scrollHeight)
      )

      await this.page.waitForTimeout(1200)
    }

    console.log('✅ Todos os cards carregados')
  }

  // Captura todos os tickets
  async getTickets() {
    const tickets = await this.page.$$('.card')
    console.log(`🎫 Total de cards encontrados: ${tickets.length}`)
    return tickets
  }

  // Abre um ticket específico
  async openTicket(ticketEl) {
    await ticketEl.click()
    console.log('🎯 Ticket aberto')
  }
}

module.exports = { MyWorkPage }

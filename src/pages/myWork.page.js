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
    const abaSemAtribuir = this.page.locator(
      'div.section-head-tab-content:has-text("Sem atribuir")'
    )

    // 🔹 garante que a aba exista e esteja visível
    await abaSemAtribuir.first().waitFor({
      state: 'visible',
      timeout: 10000
    })

    const count = await abaSemAtribuir.count()
    console.log(`🟡 Abas "Sem atribuir" encontradas: ${count}`)

    if (count === 0) {
      throw new Error('Aba "Sem atribuir" não encontrada')
    }

    // 🔹 clique FORÇADO (igual ao código antigo)
    await abaSemAtribuir.first().click({ force: true })
    console.log('🟡 Clique realizado em "Sem atribuir"')

    // 🔥 espera real de troca de conteúdo
    console.log('⏳ Aguardando lista de chamados carregar...')
    await this.page.waitForFunction(() => {
      return document.querySelectorAll('.card').length > 0
    }, { timeout: 15000 })

    // pequena pausa pra estabilizar DOM (InvGate precisa disso)
    await this.page.waitForTimeout(2000)
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
}

module.exports = { MyWorkPage }

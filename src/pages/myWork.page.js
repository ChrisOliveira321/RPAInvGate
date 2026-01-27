// src/pages/myWork.page.js
const { parseCardData } = require('../utils/cardParser')

class MyWorkPage {
  constructor(page) {
    this.page = page
  }

  // Abre MyWork (o filter ajuda, mas NÃO dependemos dele)
  async open() {
    await this.page.goto(
      'https://rochalog.sd.cloud.invgate.net/mywork?filter=toAssign',
      { waitUntil: 'domcontentloaded' }
    )
    console.log('🌐 MyWork aberto')
  }

  // Pega o título da aba ativa de verdade
  async getActiveTabTitle() {
    return await this.page.evaluate(() => {
      const el = document.querySelector(
        '.section-head-tab.active .section-head-tab-text'
      )
      return el?.getAttribute('title') || el?.textContent?.trim() || null
    })
  }

  // ✅ ÚNICA forma que vamos usar: clique DOM + validação (com retries)
  async openUnassignedTab() {
    console.log('🎯 Indo para aba "Sem atribuir" (clique DOM + validação)...')

    const tabText = this.page
      .locator('div.section-head-tab-text[title="Sem atribuir"]')
      .first()

    await tabText.waitFor({ state: 'visible', timeout: 30000 })
    await tabText.scrollIntoViewIfNeeded()

    for (let attempt = 1; attempt <= 5; attempt++) {
      const activeBefore = await this.getActiveTabTitle()
      console.log(`🧠 Aba ativa antes (tentativa ${attempt}): ${activeBefore}`)

      if (activeBefore === 'Sem atribuir') {
        console.log('✅ Já está em "Sem atribuir"')
        return
      }

      await tabText.click({ timeout: 10000 })
      console.log(`🖱️ Clique em "Sem atribuir" (texto) feito`)

      try {
        await this.page.waitForFunction(() => {
          const el = document.querySelector(
            '.section-head-tab.active .section-head-tab-text'
          )
          const title = el?.getAttribute('title') || el?.textContent?.trim()
          return title === 'Sem atribuir'
        }, { timeout: 8000 })

        console.log('✅ Aba "Sem atribuir" ativou!')
        return
      } catch (e) {
        console.log('⚠️ Não ativou, tentando clique no container pai...')

        const tabContainer = this.page
          .locator(
            '.section-head-tab-content:has(.section-head-tab-text[title="Sem atribuir"])'
          )
          .first()

        await tabContainer.scrollIntoViewIfNeeded()
        await tabContainer.click({ timeout: 10000 })

        try {
          await this.page.waitForFunction(() => {
            const el = document.querySelector(
              '.section-head-tab.active .section-head-tab-text'
            )
            const title = el?.getAttribute('title') || el?.textContent?.trim()
            return title === 'Sem atribuir'
          }, { timeout: 8000 })

          console.log('✅ Aba "Sem atribuir" ativou (via container)!')
          return
        } catch {
          console.log('⚠️ Ainda não ativou. Vou tentar novamente...')
          await this.page.waitForTimeout(800)
        }
      }
    }

    const finalActive = await this.getActiveTabTitle()
    throw new Error(
      `❌ Não consegui ativar "Sem atribuir". Aba ativa final: ${finalActive}`
    )
  }

  // Validação final
  async assertUnassignedLoaded() {
    console.log('🎯 Validando aba ativa...')

    const activeTitle = await this.getActiveTabTitle()
    console.log(`📌 Aba ativa detectada: ${activeTitle}`)

    if (activeTitle !== 'Sem atribuir') {
      throw new Error(`❌ Aba ativa NÃO é "Sem atribuir". Está em: ${activeTitle}`)
    }

    console.log('✅ Confirmado: aba "Sem atribuir" está ativa')
  }

  // =========================
  // ✅ CARDS
  // =========================

  // Container pai (bom ter, mas não vamos depender 100%)
  cardsContainer() {
    return this.page.locator(
      '#page_content > div.content-columns > div.body-left > div > div.content > div'
    )
  }

  // Cards (super robusto)
  cards() {
    // Se o container mudar, ainda assim pegamos os cards na página inteira
    return this.page.locator('[id^="card_"]')
  }

  async waitCardsArea() {
    console.log('⏳ Aguardando área de cards renderizar...')

    const container = this.cardsContainer()
    await container.waitFor({ state: 'visible', timeout: 30000 })

    await this.page.waitForFunction(() => {
      const root = document.querySelector(
        '#page_content > div.content-columns > div.body-left > div > div.content > div'
      )
      if (!root) return false

      const hasCard = root.querySelector('[id^="card_"]')
      const hasBody = root.querySelector('div.card-body')
      const hasFooter = root.querySelector('div.card-footer')
      return Boolean(hasCard || hasBody || hasFooter)
    }, { timeout: 30000 })

    console.log('✅ Área de cards pronta (tem conteúdo)')
  }

  // Scroll pra carregar todos os cards (SPA lazy load)
  async scrollAllCards() {
    console.log('⏳ Scrollando para carregar todos os cards...')

    await this.waitCardsArea()

    let lastCount = 0

    for (let i = 1; i <= 40; i++) {
      const count = await this.cards().count()
      console.log(`📦 Cards visíveis (loop ${i}): ${count}`)

      if (count === lastCount) {
        // scroll extra e encerra se não mudar
        await this.page.evaluate(() => window.scrollBy(0, 2500))
        await this.page.waitForTimeout(900)

        const count2 = await this.cards().count()
        if (count2 === lastCount) break
        lastCount = count2
      } else {
        lastCount = count
      }

      await this.page.evaluate(() => window.scrollBy(0, 3000))
      await this.page.waitForTimeout(900)
    }

    console.log(`✅ Total de cards carregados: ${await this.cards().count()}`)
  }

  // Lê todos os cards e extrai infos
  async readCards() {
    await this.waitCardsArea()

    const cards = this.cards()
    const total = await cards.count()
    console.log(`🧾 Lendo cards... Total: ${total}`)

    const items = []
    const seen = new Set()

    for (let i = 0; i < total; i++) {
      const card = cards.nth(i)

      const idAttr = await card.getAttribute('id').catch(() => null)

      const body = card.locator('div.card-body')
      const footer = card.locator('div.card-footer')

      const bodyText = (await body.innerText().catch(() => '')).trim()
      const footerText = (await footer.innerText().catch(() => '')).trim()

      // prioridade (best effort)
      const priority =
        (await card.locator('text=Urgente').count()) > 0
          ? 'Urgente'
          : (await card.locator('text=Média').count()) > 0
          ? 'Média'
          : null

      // URL (pode ter mais de um link por card)
      const link = card.locator('a[href*="requests/show"]').first()
      const href = await link.getAttribute('href').catch(() => null)
      const url = href
        ? href.startsWith('http')
          ? href
          : `https://rochalog.sd.cloud.invgate.net${href}`
        : null

      const parsed = parseCardData({
        idAttr,
        bodyText,
        footerText,
        priority,
        url,
      })

      if (!parsed.number) continue
      if (seen.has(parsed.number)) continue
      seen.add(parsed.number)

      items.push(parsed)
    }

    console.log(`✅ Cards parseados (únicos): ${items.length}`)
    return items
  }

  async debugCounts() {
    console.log('\n🧪 DEBUG DOM (página inteira):')
    console.log('div.card-body:', await this.page.locator('div.card-body').count())
    console.log('div.card-footer:', await this.page.locator('div.card-footer').count())
    console.log('qualquer requests/show:', await this.page.locator('a[href*="requests/show"]').count())
    console.log('id^=card_:', await this.page.locator('[id^="card_"]').count())
  }
}

module.exports = { MyWorkPage }

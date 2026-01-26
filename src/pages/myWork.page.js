class MyWorkPage {
  constructor(page) {
    this.page = page
  }

  // Abre MyWork (o filter ajuda, mas NÃO dependemos dele)
  async open() {
    await this.page.goto(
      'https://rochalog.sd.cloud.invgate.net/mywork?filter=toAssign',
      { waitUntil: 'networkidle' }
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

    // 1) Espera a aba existir
    const tabText = this.page
      .locator('div.section-head-tab-text[title="Sem atribuir"]')
      .first()

    await tabText.waitFor({ state: 'visible', timeout: 30000 })
    await tabText.scrollIntoViewIfNeeded()

    // 2) Tenta clicar e validar várias vezes
    for (let attempt = 1; attempt <= 5; attempt++) {
      const activeBefore = await this.getActiveTabTitle()
      console.log(`🧠 Aba ativa antes (tentativa ${attempt}): ${activeBefore}`)

      if (activeBefore === 'Sem atribuir') {
        console.log('✅ Já está em "Sem atribuir"')
        return
      }

      // 👉 Clique no TEXTO
      await tabText.click({ timeout: 10000 })
      console.log(`🖱️ Clique em "Sem atribuir" (texto) feito`)

      // 3) Espera aba virar active
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
        // fallback: clicar no CONTAINER pai (às vezes o SPA só responde nele)
        console.log('⚠️ Não ativou, tentando clique no container pai...')

        const tabContainer = this.page
          .locator('.section-head-tab-content:has(.section-head-tab-text[title="Sem atribuir"])')
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
}

module.exports = { MyWorkPage }

const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')

;(async () => {
  const { browser, page } = await launchBrowser({
    storageState: 'auth.json',
  })

  const myWork = new MyWorkPage(page)

  page.on('console', msg => {
    console.log('🌐 [BROWSER]', msg.text())
  })

  console.log('🌐 Abrindo InvGate...')
  await myWork.open()

  console.log('🔍 Indo para aba "Sem atribuir"...')
  await myWork.openUnassignedTab()

  console.log('✅ Validando aba ativa...')
  await myWork.assertUnassignedLoaded()

  console.log('📜 Carregando todos os cards (scroll)...')
  await myWork.scrollAllCards()

  console.log('🧾 Lendo cards e extraindo informações...')
  const cards = await myWork.readCards()

  console.log('\n==========================')
  console.log(`✅ TOTAL DE CARDS LIDOS: ${cards.length}`)
  console.log('==========================\n')

  // ✅ mostra os primeiros 5 para validar rápido
  console.log('🔎 Preview dos 5 primeiros:')
  cards.slice(0, 5).forEach((c, i) => {
    console.log(`\n📌 Card ${i + 1}`)
    console.log(`🆔 #${c.number}`)
    console.log(`📌 Título: ${c.title}`)
    console.log(`🧭 Categoria: ${c.category}`)
    console.log(`👤 Solicitante: ${c.requester}`)
    console.log(`⚠️ Prioridade: ${c.priority}`)
    console.log(`🔗 URL: ${c.url}`)
  })

  console.log('🧪 DEBUG: links de tickets na página...')
const linkCount = await page.locator('a[href*="/requests/show"][href*="/id/"]').count()
console.log(`🔗 Links encontrados: ${linkCount}`)

console.log('🧪 DEBUG: cards por id^=card_ ...')
const cardCount = await page.locator('div[id^="card_"]').count()
console.log(`🧾 Cards encontrados: ${cardCount}`)


  // ✅ lista tudo (se quiser)
  console.log('\n📄 LISTA COMPLETA:')
  for (const c of cards) {
    console.log(
      `#${c.number} | ${c.priority ?? '-'} | ${c.title ?? '-'} | ${c.category ?? '-'} | ${c.requester ?? '-'}`
    )
  }

  await myWork.waitCardsArea()

  console.log('\n🧪 DEBUG DOM (página inteira):')
console.log('div.card-body:', await page.locator('div.card-body').count())
console.log('div.card-footer:', await page.locator('div.card-footer').count())
console.log('texto #12345 (regex):', await page.locator('text=/#\\d{4,}/').count())
console.log('qualquer requests/show:', await page.locator('a[href*="requests/show"]').count())
console.log('id^=card_:', await page.locator('[id^="card_"]').count())

// Mostra um pedacinho do texto do container onde você acha que tá a lista
const container = page.locator('#page_content > div.content-columns > div.body-left > div > div.content > div')
console.log('container existe?', await container.count())

if (await container.count()) {
  const txt = await container.innerText().catch(() => '')
  console.log('\n📌 Primeiros 500 chars do texto do container:')
  console.log(txt.slice(0, 500))
}



  // deixa 1 minuto aberto só pra ver
  await page.waitForTimeout(60000)
  await browser.close()
})()


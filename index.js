// index.js
const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')
const { isCameraTicket } = require('./src/rules/isCameraTicket')

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

  // ✅ espera render + debug opcional
  await myWork.waitCardsArea()
  await myWork.debugCounts()

  console.log('📜 Carregando todos os cards (scroll)...')
  await myWork.scrollAllCards()

  console.log('🧾 Lendo cards e extraindo informações...')
  const cards = await myWork.readCards()

  const cameraTickets = cards.filter(isCameraTicket)

  console.log(`\n📷 TOTAL CÂMERAS: ${cameraTickets.length}`)
  console.log(`🔵 OUTROS: ${cards.length - cameraTickets.length}\n`)

  for (const c of cameraTickets) {
    console.log(`#${c.number} | ${c.priority ?? '-'} | ${c.title ?? '-'} | ${c.requester ?? '-'}`)
  }

  console.log('\n==========================')
  console.log(`✅ TOTAL DE CARDS LIDOS: ${cards.length}`)
  console.log('==========================\n')

  console.log('🔎 Preview dos 5 primeiros:')
  cards.slice(0, 5).forEach((c, i) => {
    console.log(`\n📌 Card ${i + 1}`)
    console.log(`🆔 #${c.number}`)
    console.log(`📌 Título: ${c.title ?? 'N/D'}`)
    console.log(`🧭 Categoria: ${c.category ?? 'N/D'}`)
    console.log(`👤 Solicitante: ${c.requester ?? 'N/D'}`)
    console.log(`⚠️ Prioridade: ${c.priority ?? 'N/D'}`)
    console.log(`🔗 URL: ${c.url ?? 'N/D'}`)
  })

  console.log('\n📄 LISTA COMPLETA:')
  for (const c of cards) {
    console.log(
      `#${c.number} | ${c.priority ?? '-'} | ${c.title ?? '-'} | ${c.category ?? '-'} | ${c.requester ?? '-'}`
    )
  }

  // deixa 30s aberto só pra ver
  await page.waitForTimeout(30000)
  await browser.close()
})()

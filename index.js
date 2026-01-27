// index.js
const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')

const { isCftvTicket } = require('./src/rules/isCftvTicket')

const { TicketPage } = require('./src/pages/ticket.page')
const { selectTicketsToOpen } = require('./src/services/ticket.service')

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

  // ✅ instancia UMA vez
  const ticketPage = new TicketPage(page)

  // 🔥 seleção automática: só CFTV (depende do que está no ticket.service)
  const ticketsToOpen = selectTicketsToOpen(cards, 5)

  console.log(`🧪 DEBUG filtro: cards=${cards.length} | CFTV selecionados=${ticketsToOpen.length}`)

  console.log(`\n🎯 Entrando em ${ticketsToOpen.length} chamados CFTV\n`)

  // ✅ abre e coleta INSIGHTS (atividade real + descrição)
  for (const t of ticketsToOpen) {
    console.log(`➡️ Abrindo chamado #${t.number}`)

    const full = await ticketPage.getTicketInsights(t)

    // mantém seus campos antigos (pra não quebrar prints)
    t.hasActivity = full.hasAnyFollowUp
    t.requesterFull = full.requesterFull ?? null
    t.descriptionText = full.descriptionText

    console.log(
      `🆔 #${t.number} | Atividade: ${t.hasActivity ? 'SIM' : 'NÃO'} | Solicitante: ${t.requesterFull ?? 'N/D'}`
    )

    console.log(
      `📝 Descrição: ${(t.descriptionText || '').slice(0, 160)}${(t.descriptionText || '').length > 160 ? '…' : ''}`
    )

    console.log(
      `📷 Cams: ${full.extractedCameraRefs.join(', ') || '-'} | 📍 Loc: ${full.extractedLocations.join(', ') || '-'}`
    )

    console.log(
      `🧠 agente: ${full.hasAgentReply ? 'SIM' : 'NÃO'} | followup: ${full.hasAnyFollowUp ? 'SIM' : 'NÃO'}`
    )
  }

  // =========================
  // LISTA CFTV (cards)
  // =========================
  const cftvTickets = cards.filter(isCftvTicket)

  console.log(`\n📷 TOTAL CFTV (cards): ${cftvTickets.length}`)
  console.log(`🔵 OUTROS: ${cards.length - cftvTickets.length}\n`)

  for (const c of cftvTickets) {
    console.log(
      `#${c.number} | ${c.priority ?? '-'} | ${c.title ?? '-'} | ${c.requester ?? '-'}`
    )
  }

  // =========================
  // LOGS GERAIS (mantidos)
  // =========================
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

  // =========================
  // INSIGHTS SEPARADO (opcional, mas mantendo)
  // =========================
  const cftvTicketsTop10 = cftvTickets.slice(0, 10)

  for (const t of cftvTicketsTop10) {
    console.log(`➡️ Entrando no ticket #${t.number}`)
    const full = await ticketPage.getTicketInsights(t)

    console.log(
      `#${full.number} | followup: ${full.hasAnyFollowUp ? 'SIM' : 'NÃO'} | agente: ${full.hasAgentReply ? 'SIM' : 'NÃO'} | cams: ${full.extractedCameraRefs.join(', ') || '-'} | loc: ${full.extractedLocations.join(', ') || '-'}`
    )
  }

  // deixa 30s aberto só pra ver
  await page.waitForTimeout(30000)
  await browser.close()
})()

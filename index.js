// index.js
process.on('unhandledRejection', err => {
  console.error('🔥 UNHANDLED REJECTION:', err)
})
process.on('uncaughtException', err => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err)
})

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

  await myWork.waitCardsArea()
  await myWork.debugCounts()

  console.log('📜 Carregando todos os cards (scroll)...')
  await myWork.scrollAllCards()

  console.log('🧾 Lendo cards e extraindo informações...')
  const cards = await myWork.readCards()

  const ticketPage = new TicketPage(page)

  const ticketsToOpen = selectTicketsToOpen(cards, 5)

  console.log(`🧪 DEBUG filtro: cards=${cards.length} | CFTV selecionados=${ticketsToOpen.length}`)
  console.log(`\n🎯 Entrando em ${ticketsToOpen.length} chamados CFTV\n`)

  for (const t of ticketsToOpen) {
    console.log(`➡️ Abrindo chamado #${t.number}`)

    const full = await ticketPage.getTicketInsights(t)

    // mantém seus campos antigos
    t.hasActivity = Boolean(full.hasAnyFollowUp) // aqui = atividade do COLABORADOR
    t.requesterFull = full.requesterFull ?? null
    t.descriptionText = full.descriptionText

    console.log(
      `🆔 #${t.number} | Atividade: ${t.hasActivity ? 'SIM' : 'NÃO'} | Solicitante: ${t.requesterFull ?? 'N/D'}`
    )

    console.log(
      `📝 Descrição: ${(t.descriptionText || '').slice(0, 160)}${(t.descriptionText || '').length > 160 ? '…' : ''}`
    )

    // agora loga o local LITERAL
    console.log(`📍 Local (RAW): ${full.locationRaw ?? 'N/D'}`)

    // atividade (última do COLABORADOR)
    console.log(
      `🧑‍💼 Atividade (última): ${(full.activityText || 'N/D').slice(0, 160)}${(full.activityText || '').length > 160 ? '…' : ''}`
    )

    console.log(`🧠 agente: ${full.hasAgentReply ? 'SIM' : 'NÃO'}`)

    if (full.timeline?.preview?.length) {
      console.log('🧪 timeline preview:', full.timeline.preview)
    }

    console.log(`🔎 URL atual: ${page.url()}`)
  }

  const cftvTickets = cards.filter(isCftvTicket)

  console.log(`\n📷 TOTAL CFTV (cards): ${cftvTickets.length}`)
  console.log(`🔵 OUTROS: ${cards.length - cftvTickets.length}\n`)

  for (const c of cftvTickets) {
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

  await page.waitForTimeout(30000)
  await browser.close()
})()

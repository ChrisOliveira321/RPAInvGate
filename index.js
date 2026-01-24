const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')
const { extractTicketData } = require('./src/services/ticket.service')
const { isCftv } = require('./src/rules/cftv.rule')
const { logTicket } = require('./src/utils/logger')

;(async () => {
  // 1️⃣ Lança o navegador
  const { browser, page } = await launchBrowser()
  const myWork = new MyWorkPage(page)

  // 2️⃣ Abre a página MyWork
  console.log('🌐 Abrindo InvGate...')
  await myWork.open()

  // 3️⃣ Aguarda login manual
  console.log('➡️ Faça o login manualmente...')
  await myWork.waitLogin()

  // 4️⃣ Abre a aba "Sem atribuir" e espera pelo primeiro card
  await myWork.openUnassignedTab()

  // 5️⃣ Scroll até carregar todos os chamados (lazy load)
  await myWork.scrollToLoadAllCards()

  // 6️⃣ Captura todos os tickets visíveis
  const tickets = await myWork.getTickets()
  console.log(`🎫 Chamados encontrados: ${tickets.length}`)

  // 7️⃣ Processa cada ticket
  let cameras = 0
  let outros = 0

  for (const ticketEl of tickets) {
    const ticket = await extractTicketData(ticketEl)
    const camera = isCftv(ticket.breadcrumb)

    if (camera) {
      cameras++
    } else {
      outros++
    }

    logTicket(ticket, camera)
  }

  // 8️⃣ Logs finais
  console.log('==========================')
  console.log(`📷 Total CÂMERAS: ${cameras}`)
  console.log(`🔵 Outros chamados: ${outros}`)
  console.log('==========================')

  // 9️⃣ Mantém navegador aberto por 60s para conferência
  console.log('🛑 Script finalizado. Navegador aberto por 60s.')
  await page.waitForTimeout(60000)

  // 10️⃣ Fecha navegador
  await browser.close()
})()

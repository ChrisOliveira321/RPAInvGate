const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')
const { extractTicketData } = require('./src/services/ticket.service')
const { isCftv } = require('./src/rules/cftv.rule')
const { logTicket } = require('./src/utils/logger')

;(async () => {
  // 1️⃣ Lança navegador (UM SÓ)
  const { browser, page } = await launchBrowser()

  const myWork = new MyWorkPage(page)

  // 2️⃣ Abre MyWork
  console.log('🌐 Abrindo InvGate...')
  await myWork.open()

  // 3️⃣ Login manual
  console.log('➡️ Faça o login manualmente...')
  await myWork.waitLogin()

  // 4️⃣ Abre aba "Sem atribuir"
  await myWork.openUnassignedTab()

  // 5️⃣ Scroll para carregar todos os cards
  await myWork.scrollToLoadAllCards()

  // 6️⃣ Captura tickets
  const tickets = await myWork.getTickets()
  console.log(`🎫 Chamados encontrados: ${tickets.length}`)

  let totalChamados = 0
  let cameras = 0
  let outros = 0

  // 7️⃣ Processa chamados
  for (const ticketEl of tickets) {
    totalChamados++

    const ticket = await extractTicketData(ticketEl)
    const camera = isCftv(ticket.breadcrumb)

    camera ? cameras++ : outros++

    logTicket(ticket, camera)
  }

  // 8️⃣ Logs finais
  console.log('==========================')
  console.log(`📊 Total de chamados lidos: ${totalChamados}`)
  console.log(`📷 Total CÂMERAS: ${cameras}`)
  console.log(`🔵 Outros chamados: ${outros}`)
  console.log('==========================')

  // 9️⃣ Espera para conferência
  console.log('🛑 Script finalizado. Navegador aberto por 60s.')
  await page.waitForTimeout(60000)

  await browser.close()
})()

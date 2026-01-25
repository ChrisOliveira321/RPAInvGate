const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')
const { TicketPage } = require('./src/pages/ticketPage')
const { isCftv } = require('./src/rules/cftv.rule')
const { logTicket } = require('./src/utils/logger')

;(async () => {
  const { browser, page } = await launchBrowser()
  const myWork = new MyWorkPage(page)

  console.log('🌐 Abrindo InvGate...')
  await myWork.open()

  console.log('➡️ Faça o login manualmente...')
  await myWork.waitLogin()

  await myWork.openUnassignedTab()
  await myWork.scrollToLoadAllCards()

  const ticketsCount = await myWork.getTicketsCount()
  console.log(`🎫 Chamados encontrados: ${ticketsCount}`)

  let cameras = 0
  let outros = 0
  let totalLidos = 0

  for (let i = 0; i < ticketsCount; i++) {
    totalLidos++
    console.log(`\n➡️ Processando ticket ${totalLidos}/${ticketsCount}`)

    // 🔹 1. LÊ DO CARD (FORMA ESTÁVEL)
    const ticketResumo = await myWork.readTicketByIndex(i)

    const camera = isCftv(ticketResumo.breadcrumb)
    camera ? cameras++ : outros++
    logTicket(ticketResumo, camera)

    // 🔮 FUTURO: só entra se precisar
    if (camera) {
      await myWork.openTicketByIndex(i)

      const ticketPage = new TicketPage(page)
      await ticketPage.waitLoaded()

      // futuramente:
      // await ticketPage.readLastActivity()

      await ticketPage.goBack()
    }
  }

  console.log('\n==========================')
  console.log(`📊 Total de chamados lidos: ${totalLidos}`)
  console.log(`📷 Total CÂMERAS: ${cameras}`)
  console.log(`🔵 Outros chamados: ${outros}`)
  console.log('==========================')

  await page.waitForTimeout(60000)
  await browser.close()
})()

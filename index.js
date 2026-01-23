const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  console.log('🌐 Abrindo InvGate...')
  await page.goto('https://rochalog.sd.cloud.invgate.net/mywork', {
    waitUntil: 'domcontentloaded',
  })

  console.log('➡️ Faça o login manualmente...')
  console.log('⏳ Aguardando login...')

  await page.waitForSelector('div.section-head-tab-content', { timeout: 0 })
  console.log('✅ Login detectado')

  await page.waitForTimeout(1500)

  console.log('🔍 Procurando aba "Sem atribuir"...')

  const abaSemAtribuir = page.locator(
    'div.section-head-tab-content:has-text("Sem atribuir")'
  )

  if ((await abaSemAtribuir.count()) === 0) {
    console.log('❌ Aba "Sem atribuir" não encontrada.')
    await browser.close()
    return
  }

  await abaSemAtribuir.first().click({ force: true })
  console.log('🟡 Clique realizado em "Sem atribuir"')

  console.log('⏳ Aguardando tela estabilizar...')
  await page.waitForTimeout(3000)

  // ✅ CAPTURA O CARD INTEIRO (BODY + FOOTER)
  const tickets = await page.$$('.card')
  console.log(`🎫 Chamados encontrados: ${tickets.length}`)

  let totalChamados = 0
  let cameras = 0
  let outros = 0

  for (const ticket of tickets) {
    totalChamados++

    // 🔹 NÚMERO DO CHAMADO (FORMA CORRETA)
    let numeroChamado = 'Número não encontrado'
    let urlChamado = ''

    const linkChamado = await ticket.$(
      'a[href*="/requests/show/index/id/"]'
    )

    if (linkChamado) {
      const href = await linkChamado.getAttribute('href')
      const match = href.match(/id\/(\d+)/)

      if (match) {
        numeroChamado = `#${match[1]}`
        urlChamado = `https://rochalog.sd.cloud.invgate.net${href}`
      }
    }

    // 🔹 TÍTULO
    const tituloEl = await ticket.$('.item-title')
    const tituloTexto = tituloEl
      ? (await tituloEl.innerText()).trim()
      : 'Sem título'

    // 🔹 CATEGORIA
    const breadcrumbEl = await ticket.$('.card-breadcrumb-text')
    const breadcrumbTexto = breadcrumbEl
      ? (await breadcrumbEl.innerText())
          .toUpperCase()
          .replace(/\s+/g, '')
      : ''

    // 🔹 REGRA CFTV
    const isCamera = breadcrumbTexto.includes(
      'CONTROLEDEACESSO&CFTV»CFTV»CAMERAS'
    )

    if (isCamera) {
      cameras++
    } else {
      outros++
    }

    // 🔹 LOG
    console.log('==========================')
    console.log('🆔 Chamado:', numeroChamado)
    console.log('🔗 URL:', urlChamado)
    console.log('📌 Título:', tituloTexto)
    console.log('🧭 Categoria:', breadcrumbTexto || 'Sem categoria')
    console.log('📂 Tipo:', isCamera ? 'CÂMERA (CFTV)' : 'OUTROS')
  }

  console.log('==========================')
  console.log(`📊 Total de chamados lidos: ${totalChamados}`)
  console.log(`📷 Total CÂMERAS: ${cameras}`)
  console.log(`🔵 Outros chamados: ${outros}`)
  console.log('==========================')

  console.log('🛑 Script finalizado. Navegador aberto por 60s.')
  await page.waitForTimeout(60000)

  await browser.close()
})()

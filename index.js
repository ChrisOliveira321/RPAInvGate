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

  // 🔥 ESPERA INTELIGENTE (loader sumir)
  console.log('⏳ Aguardando tela estabilizar...')
  await page.waitForTimeout(3000)

  // Agora apenas LEMOS o que existir
  const tickets = await page.$$('.card-body')
  console.log(`🎫 Chamados encontrados: ${tickets.length}`)

  let cameras = 0
  let outros = 0

  for (const ticket of tickets) {
    const titulo = await ticket.$('.item-title')
    const breadcrumb = await ticket.$('.card-breadcrumb-text')

    const tituloTexto = titulo
      ? (await titulo.innerText()).trim()
      : 'Sem título'

    const breadcrumbTexto = breadcrumb
      ? (await breadcrumb.innerText())
          .toUpperCase()
          .replace(/\s+/g, '')
      : ''

    const isCamera = breadcrumbTexto.includes(
      'CONTROLEDEACESSO&CFTV»CFTV»CAMERAS'
    )

    if (!isCamera) {
      outros++
      continue
    }

    cameras++

    console.log('🟢 CÂMERA')
    console.log('📌 Título:', tituloTexto)
    console.log('🧭 Categoria:', breadcrumbTexto)
    console.log('--------------------------')
  }

  console.log('==========================')
  console.log(`📷 Total CÂMERAS: ${cameras}`)
  console.log(`🔵 Outros ignorados: ${outros}`)
  console.log('==========================')

  console.log('🛑 Script finalizado. Navegador aberto por 60s.')
  await page.waitForTimeout(60000)

  await browser.close()
})()

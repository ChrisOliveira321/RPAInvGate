const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('https://rochalog.sd.cloud.invgate.net')

  console.log('➡️ Faça o login MANUALMENTE no InvGate')
  console.log('⏳ Após logar, espere a página carregar sozinha...')

  // espera o MyWork carregar de verdade
  await page.waitForURL('**/mywork', { timeout: 0 })

  // salva a sessão
  await context.storageState({ path: 'auth.json' })

  console.log('✅ Sessão salva em auth.json')
  await browser.close()
})()

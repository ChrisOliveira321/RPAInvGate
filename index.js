const { launchBrowser } = require('./src/browser/launchBrowser')
const { MyWorkPage } = require('./src/pages/myWork.page')

;(async () => {
  const { browser, page } = await launchBrowser({
    storageState: 'auth.json'
  })

  const myWork = new MyWorkPage(page)

  page.on('console', msg => {
    console.log('🌐 [BROWSER]', msg.text())
  })

  console.log('🌐 Abrindo InvGate...')
  await myWork.open()

  // ✅ em vez de forceUnassignedTab:
  await myWork.openUnassignedTab()

  // ✅ valida
  await myWork.assertUnassignedLoaded()

  console.log('✅ MyWork carregado corretamente e "Sem atribuir" ativo')

  await page.waitForTimeout(60000)
  await browser.close()
})()

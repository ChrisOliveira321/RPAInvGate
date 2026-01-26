const { chromium } = require('playwright')

async function launchBrowser(options = {}) {
  const browser = await chromium.launch({ headless: false })

  const context = await browser.newContext({
    storageState: options.storageState
  })

  const page = await context.newPage()

  return { browser, page }
}

module.exports = { launchBrowser }

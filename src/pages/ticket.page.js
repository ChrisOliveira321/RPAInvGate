// src/pages/ticket.page.js

class TicketPage {
  constructor(page) {
    this.page = page
  }

  async open(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    await this.page.waitForTimeout(800)
  }

  async getDescriptionText() {
    const text = await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()

      const candidates = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = normalize(el.textContent).toUpperCase()
          return t === 'DESCRIÇÃO' || t === 'DESCRICAO'
        })
        .slice(0, 5)

      if (!candidates.length) return null

      function findMessageContainer(labelEl) {
        let el = labelEl
        for (let i = 0; i < 10 && el; i++) {
          el = el.parentElement
          if (!el) break
          const t = normalize(el.innerText)
          if (t.length >= 30) return el
        }
        return null
      }

      const container = findMessageContainer(candidates[0])
      if (!container) return null

      let raw = normalize(container.innerText)
      raw = raw.replace(/\bDESCRIÇÃO\b/gi, '').replace(/\bDESCRICAO\b/gi, '')
      raw = normalize(raw)

      return raw || null
    })

    return text
  }

  async openFullActivityIfExists() {
    const btn = this.page
      .locator('button, a', { hasText: /mostrar atividade completa/i })
      .first()

    if ((await btn.count()) > 0) {
      await btn.click().catch(() => {})
      await this.page.waitForTimeout(800)
      return true
    }
    return false
  }

  async hasAgentReply() {
    await this.openFullActivityIfExists()

    const result = await this.page.evaluate(() => {
      const bodyText = (document.body?.innerText || '').toLowerCase()

      const agentSignals = [
        'agente',
        'interno',
        'nota interna',
        'infraestrutura',
        'helpdesk',
        'suporte',
        'nível 1',
        'nivel 1',
        'nível 2',
        'nivel 2',
        'atribuído',
        'atribuido',
      ]

      return agentSignals.some(s => bodyText.includes(s))
    })

    return result
  }

  async hasAnyFollowUp() {
    await this.openFullActivityIfExists()

    const result = await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()

      const all = Array.from(document.querySelectorAll('div, li, article, section'))
      const blocks = all
        .map(el => normalize(el.innerText))
        .filter(t => t.length >= 20 && t.length <= 2000)

      const isDescriptionBlock = t => {
        const u = t.toUpperCase()
        return u.includes('DESCRIÇÃO') || u.includes('DESCRICAO')
      }

      const nonDescriptionBlocks = blocks.filter(t => !isDescriptionBlock(t))

      return nonDescriptionBlocks.length > 0
    })

    return result
  }

  extractCameraRefsFromDescription(descriptionText) {
    const text = descriptionText || ''
    const refs = new Set()

    for (const m of text.matchAll(/\bCF\s*[-:]?\s*(\d{1,4})\b/gi)) {
      refs.add(`CF ${m[1]}`)
    }

    for (const m of text.matchAll(/\bCFS\s*[-:]?\s*(\d{1,4})\b/gi)) {
      refs.add(`CFS ${m[1]}`)
    }

    for (const m of text.matchAll(
      /\bCFS?\s*[-:]?\s*((\d{1,4}\s*[,;/eE]\s*)+\d{1,4})\b/g
    )) {
      const nums = m[1]
        .split(/[,;/eE]\s*/i)
        .map(x => x.trim())
        .filter(Boolean)

      for (const n of nums) {
        if (/^\d{1,4}$/.test(n)) refs.add(`CFS ${n}`)
      }
    }

    return Array.from(refs)
  }

  extractLocationsFromDescription(descriptionText) {
    const text = descriptionText || ''
    const locations = new Set()

    for (const m of text.matchAll(/\bAZ\s*([0-9]{1,2}[A-Z]?)\b/gi)) {
      locations.add(`AZ ${m[1].toUpperCase()}`)
    }

    const known = ['FIDELIDADE', 'PPS', 'ELDORADO', 'GIMPO', 'GEXPO', 'MATRIZ', 'RIO GRANDE']
    const upper = text.toUpperCase()
    for (const k of known) {
      if (upper.includes(k)) locations.add(k)
    }

    return Array.from(locations)
  }

  // ✅ O MÉTODO QUE ESTÁ FALTANDO NO SEU PROJETO
  async getTicketInsights(ticketFromList) {
    await this.open(ticketFromList.url)

    const descriptionText = await this.getDescriptionText()
    const hasAgentReply = await this.hasAgentReply()
    const hasAnyFollowUp = hasAgentReply ? true : await this.hasAnyFollowUp()

    const extractedCameraRefs = this.extractCameraRefsFromDescription(descriptionText)
    const extractedLocations = this.extractLocationsFromDescription(descriptionText)

    return {
      ...ticketFromList,
      descriptionText,
      hasAgentReply,
      hasAnyFollowUp,
      extractedCameraRefs,
      extractedLocations,
    }
  }
}

module.exports = { TicketPage }

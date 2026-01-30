// src/pages/ticket.page.js
class TicketPage {
  constructor(page) {
    this.page = page
  }

  async open(url) {
    if (!url) throw new Error('URL do ticket está vazia')

    await this.page.goto(url, { waitUntil: 'domcontentloaded' })

    // ✅ garante que realmente estamos no ticket
    await this.page.waitForURL(/\/requests\/show\/index\/id\/\d+/, {
      timeout: 30000,
    })

    // ✅ espera render do ticket (SPA)
    await this.page.waitForFunction(() => {
      const body = (document.body?.innerText || '').toUpperCase()
      return body.includes('DESCRIÇÃO') || body.includes('CLIENTE') || body.includes('COLABORADOR')
    }, { timeout: 30000 })

    await this.page.waitForTimeout(400)
  }

  // =========================
  // HELPERS
  // =========================
  async _getPageText() {
    return await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()
      return normalize(document.body?.innerText || '')
    })
  }

  async getRequesterLocation() {
    const raw = await this._getPageText()
    const text = (raw || '').toUpperCase()

    const direct = ['GIMPO', 'GEXPO', 'MATRIZ', 'PPS', 'FIDELIDADE', 'ELDORADO', 'SERTANEJA']
    for (const d of direct) {
      if (text.includes(d)) return d
    }

    const azMatch =
      text.match(/\bAZ\s*[-]?\s*(\d{1,2}[A-Z]?)\b/) || // AZ 04 / AZ10 / AZ 9A
      text.match(/\bAZ\s+([A-ZÀ-Ú][A-ZÀ-Ú0-9 ]{2,20})\b/) // AZ MARGARIDA (best effort)

    if (azMatch) return azMatch[0].replace(/\s+/g, ' ').trim()

    return null
  }

  // =========================
  // DESCRIÇÃO (CLIENTE)
  // =========================
  async getDescriptionText() {
    const txt = await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()

      const candidates = Array.from(document.querySelectorAll('div'))
        .map(el => normalize(el.innerText))
        .filter(t => {
          const u = (t || '').toUpperCase()
          if (u.length < 30) return false
          return u.includes('DESCRIÇÃO') && u.includes('CLIENTE')
        })

      if (candidates.length) {
        candidates.sort((a, b) => b.length - a.length)
        return candidates[0]
      }

      // fallback: se não achar o bloco certinho, não pega o body inteiro (pra não vir "MyWork")
      return ''
    })

    return (txt || '').trim()
  }

  // =========================
  // ATIVIDADE (COLABORADOR)
  // =========================
  async getTimelineSummary() {
    return await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()

      const blocks = Array.from(document.querySelectorAll('div'))
        .map(el => normalize(el.innerText))
        .filter(t => {
          const u = (t || '').toUpperCase()
          if (u.length < 20) return false
          return u.includes('CLIENTE') || u.includes('COLABORADOR')
        })

      const uniq = []
      const seen = new Set()
      for (const t of blocks) {
        const key = t.slice(0, 180)
        if (seen.has(key)) continue
        seen.add(key)
        uniq.push(t)
      }

      const events = uniq.map(text => {
        const upper = text.toUpperCase()
        const kind = upper.includes('COLABORADOR')
          ? 'collaborator'
          : upper.includes('CLIENTE')
          ? 'client'
          : 'unknown'
        return { kind, text }
      })

      const collaboratorEvents = events.filter(e => e.kind === 'collaborator')
      const hasAgentReply = collaboratorEvents.length > 0

      const lastActivityText = hasAgentReply
        ? collaboratorEvents[collaboratorEvents.length - 1].text
        : null

      return {
        totalEvents: events.length,
        hasAgentReply,
        lastActivityText,
        allActivityTexts: collaboratorEvents.map(e => e.text),
        preview: events.slice(0, 6).map(e => ({
          kind: e.kind,
          text: (e.text || '').slice(0, 120),
        })),
      }
    })
  }

  // =========================
  // INSIGHTS
  // =========================
  async getTicketInsights(ticketFromList) {
    if (ticketFromList?.url) {
      await this.open(ticketFromList.url)
    }

    const descriptionText = await this.getDescriptionText()
    const timeline = await this.getTimelineSummary()
    const location = await this.getRequesterLocation()

    return {
      ...ticketFromList,

      // ✅ o que você quer
      hasAgentReply: timeline.hasAgentReply,
      hasAnyFollowUp: timeline.hasAgentReply, // pra manter compat com seu index (Atividade SIM/NÃO)
      activityText: timeline.lastActivityText,
      activityTexts: timeline.allActivityTexts,
      descriptionText,
      location,

      // ✅ compat com logs antigos (não quebra join)
      extractedCameraRefs: [],
      extractedLocations: location ? [location] : [],

      // ✅ debug
      timeline,
    }
  }
}

module.exports = { TicketPage }

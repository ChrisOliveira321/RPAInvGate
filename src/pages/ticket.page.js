class TicketPage {
  constructor(page) {
    this.page = page
  }

  async open(url) {
    if (!url) throw new Error('URL do ticket está vazia')
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    // pequena folga pro SPA renderizar
    await this.page.waitForTimeout(800)
  }

  async getDescriptionText() {
    // pega um texto grande do ticket (best effort)
    // se depois quisermos, refinamos pro bloco "DESCRIÇÃO"
    const txt = await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()
      // tenta achar o badge "DESCRIÇÃO"
      const badge = Array.from(document.querySelectorAll('*')).find(el => {
        const t = normalize(el.textContent).toUpperCase()
        return t === 'DESCRIÇÃO'
      })

      if (badge) {
        // pega um container grande perto do badge
        const box = badge.closest('div')?.parentElement?.parentElement
        if (box) return normalize(box.innerText)
      }

      // fallback: pega um trecho grande do body
      return normalize(document.body?.innerText || '')
    })

    // corta pra não explodir log (mas você pode aumentar)
    return (txt || '').trim()
  }

  async getTimelineSummary() {
    return await this.page.evaluate(() => {
      const normalize = s => (s || '').replace(/\s+/g, ' ').trim()

      const candidates = Array.from(document.querySelectorAll('div'))
        .filter(el => {
          const r = el.getBoundingClientRect()
          if (r.width < 300 || r.height < 60) return false
          const t = normalize(el.innerText)
          if (t.length < 10) return false
          const u = t.toUpperCase()
          return (
            u.includes('CLIENTE') ||
            u.includes('COLABORADOR') ||
            u.includes('SISTEMA MUDOU O STATUS') ||
            u.includes('ALTEROU O STATUS') ||
            u.includes('DESATRIBUIU') ||
            u.includes('ATRIBUIU') ||
            u.includes('REATRIBUIU')
          )
        })
        .map(el => ({ text: normalize(el.innerText) }))

      const uniq = []
      const seen = new Set()
      for (const c of candidates) {
        const key = c.text.slice(0, 160)
        if (seen.has(key)) continue
        seen.add(key)
        uniq.push(c)
      }

      const events = uniq.map(({ text }) => {
        const upper = text.toUpperCase()

        const isClient = upper.includes('CLIENTE')
        const isCollaborator = upper.includes('COLABORADOR')

        const isSystem =
          upper.includes('SISTEMA MUDOU O STATUS') ||
          upper.includes('ALTEROU O STATUS') ||
          upper.includes('DESATRIBUIU') ||
          upper.includes('ATRIBUIU') ||
          upper.includes('REATRIBUIU')

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        const author = lines[0] || null

        return {
          kind: isSystem
            ? 'system'
            : isCollaborator
            ? 'collaborator'
            : isClient
            ? 'client'
            : 'unknown',
          author,
          text,
        }
      })

      const hasAgentReply = events.some(e => e.kind === 'collaborator')

      const messageEvents = events.filter(
        e => e.kind === 'client' || e.kind === 'collaborator'
      )
      const systemEvents = events.filter(e => e.kind === 'system')

      const hasAnyFollowUp =
        messageEvents.length >= 2 ||
        (messageEvents.length >= 1 && systemEvents.length >= 1)

      return {
        totalEvents: events.length,
        messageCount: messageEvents.length,
        systemCount: systemEvents.length,
        hasAgentReply,
        hasAnyFollowUp,
        preview: events.slice(0, 6).map(e => ({
          kind: e.kind,
          author: e.author,
          text: e.text.slice(0, 120),
        })),
      }
    })
  }

  // ✅ ESTE MÉTODO ESTAVA FALTANDO
  async getTicketInsights(ticketFromList) {
    // garante que abriu a página do ticket
    if (ticketFromList?.url) {
      await this.open(ticketFromList.url)
    }

    const descriptionText = await this.getDescriptionText()
    const timeline = await this.getTimelineSummary()

    return {
      ...ticketFromList,
      descriptionText,
      hasAgentReply: timeline.hasAgentReply,
      hasAnyFollowUp: timeline.hasAnyFollowUp,
      timeline,
      extractedCameraRefs: [], // deixa vazio por enquanto (você disse pra focar em atividade)
      extractedLocations: [],
    }
  }
}

module.exports = { TicketPage }

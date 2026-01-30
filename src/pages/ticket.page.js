// ./src/pages/ticket.page.js
class TicketPage {
  constructor(page) {
    this.page = page
  }

  async open(url) {
    if (!url) throw new Error('URL do ticket está vazia')
    await this.page.goto(url, { waitUntil: 'domcontentloaded' })

    // folga pro SPA renderizar
    await this.page.waitForTimeout(800)

    // tenta garantir que carregou algo do ticket (sem travar caso mude)
    await this._waitTicketHydrated()
  }

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  _norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim()
  }

  // remove acentos pra comparar labels com/sem acento
  _fold(s) {
    return this._norm(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
  }

  async _waitTicketHydrated() {
    // Não pode ser algo muito específico, então usamos sinais comuns:
    // - URL /requests/show/index/id/
    // - algum texto "SOLICITAÇÃO #" ou "#12345"
    // - ou a presença de "DESCRIÇÃO"
    try {
      await this.page.waitForFunction(
        () => {
          const txt = (document.body?.innerText || '').toUpperCase()
          return (
            location.href.includes('/requests/show/index/id/') &&
            (txt.includes('DESCRIÇÃO') || txt.includes('SOLICITAÇÃO') || txt.includes('#'))
          )
        },
        { timeout: 8000 }
      )
    } catch {
      // best effort, não quebra
    }
  }

  async _getMainTicketRootHandle() {
    // tenta achar um "root" da timeline, pra não varrer o dashboard inteiro
    // âncoras comuns: botões/headers tipo "MOSTRAR ATIVIDADE COMPLETA" / "MOSTRAR APENAS DESTAQUES"
    const anchors = [
      'MOSTRAR ATIVIDADE COMPLETA',
      'MOSTRAR APENAS DESTAQUES',
      'ATIVIDADE COMPLETA',
      'DESTAQUES',
    ]

    for (const a of anchors) {
      const locator = this.page.locator(`text=${a}`).first()
      if (await locator.count()) {
        // sobe um pouco pra pegar um container “grande”
        const handle = await locator.elementHandle()
        if (handle) return handle
      }
    }
    return null
  }

  async _getFieldValueByLabel(labelText) {
    // Procura label por texto (ignorando acentos) e retorna o valor próximo
    return await this.page.evaluate(labelText => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim()
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()

      const target = fold(labelText)

      // procura em elementos típicos de label
      const nodes = Array.from(document.querySelectorAll('label, small, span, div, p'))
      const labelEl = nodes.find(el => fold(el.textContent) === target)

      if (!labelEl) return null

      // 1) tenta achar um "row" (pai) e dentro dele pegar o texto todo e subtrair o label
      const row = labelEl.closest('div')
      if (row) {
        const rowText = norm(row.innerText || '')
        const labelNorm = norm(labelEl.textContent || '')
        if (rowText && labelNorm) {
          // remove o label do começo se estiver junto
          let v = rowText
          if (fold(v).startsWith(fold(labelNorm))) {
            v = norm(v.slice(labelNorm.length))
          }
          // se ainda ficou grande demais, tenta pegar a última “parte”
          // (isso ajuda quando o row tem "Label  Valor")
          if (v && v.length <= 120) return v
        }

        // 2) tenta pegar o próximo irmão dentro do row
        const kids = Array.from(row.querySelectorAll('*'))
          .map(x => norm(x.textContent))
          .filter(Boolean)

        // tenta achar um texto diferente do label que pareça "valor"
        const candidate = kids.find(t => fold(t) !== target && t.length >= 2 && t.length <= 120)
        if (candidate) return candidate
      }

      // 3) fallback: próximo elemento direto
      const next = labelEl.nextElementSibling
      if (next) {
        const t = norm(next.textContent)
        if (t) return t
      }

      return null
    }, labelText)
  }

  // -----------------------------
  // 1) DESCRIÇÃO (mensagem inicial)
  // -----------------------------
  async getDescriptionText() {
    return await this.page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim()
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()

      // tenta achar um badge/label "DESCRIÇÃO"
      const candidates = Array.from(document.querySelectorAll('div, span, small, label'))
      const badge = candidates.find(el => fold(el.textContent) === 'DESCRICAO')

      if (badge) {
        // sobe alguns níveis e pega um container maior
        let box = badge.closest('section') || badge.closest('article') || badge.closest('div')
        for (let i = 0; i < 4 && box; i++) {
          // tenta subir pra pegar o bloco inteiro da descrição
          box = box.parentElement || box
        }
        if (box) {
          const t = norm(box.innerText || '')
          // evita retornar a página inteira
          if (t && t.length >= 40 && t.length <= 4000) return t
        }
      }

      // fallback: pega o maior bloco que contenha "DESCRIÇÃO" mas não seja gigantesco
      const blocks = Array.from(document.querySelectorAll('section, article, div'))
        .map(el => norm(el.innerText || ''))
        .filter(t => t.length >= 40 && t.length <= 5000)
        .filter(t => fold(t).includes('DESCRICAO'))

      if (blocks.length) return blocks[0]

      return norm(document.body?.innerText || '')
    })
  }

  // -----------------------------
  // 2) TIMELINE (CLIENTE / COLABORADOR)
  // regra: atividade = existe pelo menos 1 "COLABORADOR"
  // e pega a ÚLTIMA mensagem do colaborador (activityText)
  // -----------------------------
  async getTimelineSummary() {
    const anchored = await this._getMainTicketRootHandle()

    return await this.page.evaluate(anchoredEl => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim()
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()

      // define o root de busca:
      // - se achou âncora, usa um container acima dela
      // - senão, usa document.body (fallback)
      let root = document.body
      if (anchoredEl) {
        // sobe alguns níveis pra pegar o “miolo” do ticket
        root = anchoredEl
        for (let i = 0; i < 6 && root?.parentElement; i++) root = root.parentElement
      }

      // pega blocos que contenham CLIENTE ou COLABORADOR
      // e filtra por ter “cara de mensagem” (tamanho, etc)
      const rawBlocks = Array.from(root.querySelectorAll('div, li, article, section'))
        .map(el => norm(el.innerText || ''))
        .filter(t => t.length >= 20 && t.length <= 2000)
        .filter(t => {
          const u = fold(t)
          return u.includes('CLIENTE') || u.includes('COLABORADOR')
        })

      // remove duplicados
      const uniq = []
      const seen = new Set()
      for (const t of rawBlocks) {
        const key = t.slice(0, 220)
        if (seen.has(key)) continue
        seen.add(key)
        uniq.push(t)
      }

      // transforma em events
      const events = uniq.map(text => {
        const u = fold(text)
        const kind = u.includes('COLABORADOR')
          ? 'collaborator'
          : u.includes('CLIENTE')
          ? 'client'
          : 'unknown'

        return { kind, text }
      })

      const hasAgentReply = events.some(e => e.kind === 'collaborator')
      const hasActivity = hasAgentReply

      const lastCollaborator =
        [...events].reverse().find(e => e.kind === 'collaborator') || null

      return {
        total: events.length,
        hasAgentReply,
        hasActivity,
        lastCollaboratorText: lastCollaborator?.text || null,
        preview: events.slice(0, 6).map(e => e.text.slice(0, 220)),
      }
    }, anchored)
  }

  // -----------------------------
  // 3) LOCAL (RAW)
  // - PRIORIDADE: valor de campos (label)
  // - fallback: texto com ">>"
  // -----------------------------
  async getLocationRaw() {
    // 1) tenta pelos labels mais prováveis (adicione mais se quiser)
    const labelCandidates = [
      'Indique o Armazém/Gate',
      'Indique o Armazem/Gate',
      'Armazém/Gate',
      'Armazem/Gate',
      'Unidade',
      'Local',
      'Localização',
      'Localizacao',
    ]

    for (const label of labelCandidates) {
      const v = await this._getFieldValueByLabel(label)
      if (v) {
        // evita retornar IP por engano
        // (se algum label estiver trazendo IP, a gente bloqueia)
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) continue
        return v
      }
    }

    // 2) fallback: algo com ">>"
    return await this.page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim()
      const nodes = Array.from(document.querySelectorAll('div, span, p, small, label'))
        .map(el => norm(el.textContent))
        .filter(Boolean)

      const withArrow = nodes.find(t => t.includes('>>') && t.length <= 120)
      return withArrow || null
    })
  }

  // -----------------------------
  // API PRINCIPAL
  // -----------------------------
  async getTicketInsights(ticketFromList) {
    if (ticketFromList?.url) {
      await this.open(ticketFromList.url)
    }

    const descriptionText = await this.getDescriptionText()
    const timeline = await this.getTimelineSummary()
    const locationRaw = await this.getLocationRaw()

    return {
      ...ticketFromList,

      descriptionText,

      // você disse que "atividade" = tem COLABORADOR
      hasAgentReply: Boolean(timeline.hasAgentReply),
      hasAnyFollowUp: Boolean(timeline.hasActivity),

      // “descrição da atividade” (última msg do colaborador)
      activityText: timeline.lastCollaboratorText || null,

      // local literal (RAW)
      locationRaw: locationRaw || null,

      timeline,

      // deixa reservado pra depois
      extractedCameraRefs: [],
      extractedLocations: [],
    }
  }
}

module.exports = { TicketPage }


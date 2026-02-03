// ./src/pages/ticket.page.js
class TicketPage {
  constructor(page) {
    this.page = page;
  }

  async open(url) {
    if (!url) throw new Error('URL do ticket está vazia');
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    // folga pro SPA renderizar
    await this.page.waitForTimeout(800);

    // best effort pra garantir que carregou
    await this._waitTicketHydrated();
  }

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  _norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  _fold(s) {
    return this._norm(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  async _waitTicketHydrated() {
    try {
      await this.page.waitForFunction(
        () => {
          const txt = (document.body?.innerText || '').toUpperCase();
          return (
            location.href.includes('/requests/show/index/id/') &&
            (txt.includes('DESCRIÇÃO') ||
              txt.includes('DESCRICAO') ||
              txt.includes('SOLICITAÇÃO') ||
              txt.includes('SOLICITACAO') ||
              txt.includes('#'))
          );
        },
        { timeout: 8000 }
      );
    } catch {
      // best effort
    }
  }

  async _getMainTicketRootHandle() {
    const anchors = [
      'MOSTRAR ATIVIDADE COMPLETA',
      'MOSTRAR APENAS DESTAQUES',
      'ATIVIDADE COMPLETA',
      'DESTAQUES',
    ];

    for (const a of anchors) {
      const locator = this.page.locator(`text=${a}`).first();
      if (await locator.count()) {
        const handle = await locator.elementHandle();
        if (handle) return handle;
      }
    }
    return null;
  }

  async _getFieldValueByLabel(labelText) {
    return await this.page.evaluate(labelText => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase();

      const target = fold(labelText);

      const nodes = Array.from(document.querySelectorAll('label, small, span, div, p'));
      const labelEl = nodes.find(el => fold(el.textContent) === target);

      if (!labelEl) return null;

      const row = labelEl.closest('div');
      if (row) {
        const rowText = norm(row.innerText || '');
        const labelNorm = norm(labelEl.textContent || '');
        if (rowText && labelNorm) {
          let v = rowText;
          if (fold(v).startsWith(fold(labelNorm))) {
            v = norm(v.slice(labelNorm.length));
          }
          if (v && v.length <= 120) return v;
        }

        const kids = Array.from(row.querySelectorAll('*'))
          .map(x => norm(x.textContent))
          .filter(Boolean);

        const candidate = kids.find(t => fold(t) !== target && t.length >= 2 && t.length <= 120);
        if (candidate) return candidate;
      }

      const next = labelEl.nextElementSibling;
      if (next) {
        const t = norm(next.textContent);
        if (t) return t;
      }

      return null;
    }, labelText);
  }

  // -----------------------------
  // 0) TÍTULO (best effort)
  // -----------------------------
  async getTitleBestEffort() {
    return await this.page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();

      const h = document.querySelector('h1, h2');
      const ht = norm(h?.textContent);
      if (ht && ht.length >= 3 && ht.length <= 180) return ht;

      const candidates = Array.from(document.querySelectorAll('div, span, p'))
        .map(el => norm(el.textContent))
        .filter(t => t.length >= 3 && t.length <= 180);

      const maybe = candidates.find(t => t.includes('#') || /SOLICITA(C|Ç)A(O|Õ)/i.test(t));
      return maybe || null;
    });
  }

  // -----------------------------
  // 1) DESCRIÇÃO
  // -----------------------------
  async getDescriptionText() {
    return await this.page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase();

      const candidates = Array.from(document.querySelectorAll('div, span, small, label'));
      const badge = candidates.find(el => fold(el.textContent) === 'DESCRICAO');

      if (badge) {
        let box = badge.closest('section') || badge.closest('article') || badge.closest('div');
        for (let i = 0; i < 4 && box; i++) {
          box = box.parentElement || box;
        }
        if (box) {
          const t = norm(box.innerText || '');
          if (t && t.length >= 40 && t.length <= 4000) return t;
        }
      }

      const blocks = Array.from(document.querySelectorAll('section, article, div'))
        .map(el => norm(el.innerText || ''))
        .filter(t => t.length >= 40 && t.length <= 5000)
        .filter(t => fold(t).includes('DESCRICAO'));

      if (blocks.length) return blocks[0];

      return norm(document.body?.innerText || '');
    });
  }

  // -----------------------------
  // 2) TIMELINE
  // -----------------------------
  async getTimelineSummary() {
    const anchored = await this._getMainTicketRootHandle();

    return await this.page.evaluate(anchoredEl => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const fold = s =>
        norm(s)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase();

      let root = document.body;
      if (anchoredEl) {
        root = anchoredEl;
        for (let i = 0; i < 6 && root?.parentElement; i++) root = root.parentElement;
      }

      const rawBlocks = Array.from(root.querySelectorAll('div, li, article, section'))
        .map(el => norm(el.innerText || ''))
        .filter(t => t.length >= 20 && t.length <= 2000)
        .filter(t => {
          const u = fold(t);
          return u.includes('CLIENTE') || u.includes('COLABORADOR');
        });

      const uniq = [];
      const seen = new Set();
      for (const t of rawBlocks) {
        const key = t.slice(0, 220);
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(t);
      }

      const events = uniq.map(text => {
        const u = fold(text);
        const kind = u.includes('COLABORADOR')
          ? 'collaborator'
          : u.includes('CLIENTE')
          ? 'client'
          : 'unknown';
        return { kind, text };
      });

      const hasAgentReply = events.some(e => e.kind === 'collaborator');
      const lastCollaborator = [...events].reverse().find(e => e.kind === 'collaborator') || null;

      return {
        total: events.length,
        hasAgentReply,
        hasActivity: hasAgentReply,
        lastCollaboratorText: lastCollaborator?.text || null,
        preview: events.slice(0, 6).map(e => e.text.slice(0, 220)),
      };
    }, anchored);
  }

  // -----------------------------
  // 3) LOCAL (RAW)
  // -----------------------------
  async getLocationRaw() {
    const labelCandidates = [
      'Indique o Armazém/Gate',
      'Indique o Armazem/Gate',
      'Armazém/Gate',
      'Armazem/Gate',
      'Unidade',
      'Local',
      'Localização',
      'Localizacao',
    ];

    for (const label of labelCandidates) {
      const v = await this._getFieldValueByLabel(label);
      if (v) {
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) continue;
        return v;
      }
    }

    return await this.page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const nodes = Array.from(document.querySelectorAll('div, span, p, small, label'))
        .map(el => norm(el.textContent))
        .filter(Boolean);

      const withArrow = nodes.find(t => t.includes('>>') && t.length <= 120);
      return withArrow || null;
    });
  }

  // -----------------------------
  // API PRINCIPAL
  // - devolve insights + campos prontos pra DB
  // -----------------------------
  async getTicketInsights(ticketFromList = {}) {
    if (ticketFromList?.url) {
      await this.open(ticketFromList.url);
    }

    const nowIso = new Date().toISOString();

    const descriptionText = await this.getDescriptionText();
    const timeline = await this.getTimelineSummary();
    const locationRaw = await this.getLocationRaw();
    const titleFromDetail = await this.getTitleBestEffort();

    // regra: atividade = tem COLABORADOR
    const has_activity = timeline?.hasAgentReply ? 1 : 0;

    // normaliza ticket_id vindo da listagem (#123) ou já limpo (123)
    const ticket_id = ticketFromList.ticket_id
      ? String(ticketFromList.ticket_id).replace('#', '')
      : ticketFromList.number
      ? String(ticketFromList.number).replace('#', '')
      : null;

    // "local" pra DB: por enquanto vamos usar o RAW (melhor que null)
    const localForDb = locationRaw || ticketFromList.local || null;

    return {
      // mantém tudo que veio da listagem (categoria, prioridade, etc)
      ...ticketFromList,

      // -----------------------
      // INSIGHTS RICOS
      // -----------------------
      descriptionText,
      timeline,

      // sua semântica atual
      hasAgentReply: Boolean(timeline?.hasAgentReply),
      hasAnyFollowUp: Boolean(timeline?.hasActivity),

      // última msg do colaborador
      activityText: timeline?.lastCollaboratorText || null,

      // local literal
      locationRaw: locationRaw || null,

      // reservado
      extractedCameraRefs: [],
      extractedLocations: [],

      // -----------------------
      // CAMPOS "DB-FRIENDLY"
      // -----------------------
      // ✅ NOVO: descrição completa para persistir no SQLite
      description_text: this._norm(descriptionText) || null,

      ticket_id,
      titulo: titleFromDetail || ticketFromList.titulo || ticketFromList.title || null,
      local: localForDb,
      url: ticketFromList.url || null,
      collected_at: nowIso,
      has_activity,
    };
  }
}

module.exports = { TicketPage };

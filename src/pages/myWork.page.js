// src/pages/myWork.page.js
const { parseCardData } = require('../utils/cardParser');
const { saveTicketTriage } = require('../db/ticketRepo');

class MyWorkPage {
  constructor(page) {
    this.page = page;
  }

  async open() {
    await this.page.goto(
      'https://rochalog.sd.cloud.invgate.net/mywork?filter=toAssign',
      { waitUntil: 'domcontentloaded' }
    );
    console.log('🌐 MyWork aberto');
  }

  async getActiveTabTitle() {
    return await this.page.evaluate(() => {
      const el = document.querySelector(
        '.section-head-tab.active .section-head-tab-text'
      );
      return el?.getAttribute('title') || el?.textContent?.trim() || null;
    });
  }

  async openUnassignedTab() {
    console.log('🎯 Indo para aba "Sem atribuir" (clique DOM + validação)...');

    const tabText = this.page
      .locator('div.section-head-tab-text[title="Sem atribuir"]')
      .first();

    await tabText.waitFor({ state: 'visible', timeout: 30000 });
    await tabText.scrollIntoViewIfNeeded();

    for (let attempt = 1; attempt <= 5; attempt++) {
      const activeBefore = await this.getActiveTabTitle();
      console.log(`🧠 Aba ativa antes (tentativa ${attempt}): ${activeBefore}`);

      if (activeBefore === 'Sem atribuir') {
        console.log('✅ Já está em "Sem atribuir"');
        return;
      }

      await tabText.click({ timeout: 10000 });
      console.log(`🖱️ Clique em "Sem atribuir" (texto) feito`);

      try {
        await this.page.waitForFunction(() => {
          const el = document.querySelector(
            '.section-head-tab.active .section-head-tab-text'
          );
          const title = el?.getAttribute('title') || el?.textContent?.trim();
          return title === 'Sem atribuir';
        }, { timeout: 8000 });

        console.log('✅ Aba "Sem atribuir" ativou!');
        return;
      } catch (e) {
        console.log('⚠️ Não ativou, tentando clique no container pai...');

        const tabContainer = this.page
          .locator(
            '.section-head-tab-content:has(.section-head-tab-text[title="Sem atribuir"])'
          )
          .first();

        await tabContainer.scrollIntoViewIfNeeded();
        await tabContainer.click({ timeout: 10000 });

        try {
          await this.page.waitForFunction(() => {
            const el = document.querySelector(
              '.section-head-tab.active .section-head-tab-text'
            );
            const title = el?.getAttribute('title') || el?.textContent?.trim();
            return title === 'Sem atribuir';
          }, { timeout: 8000 });

          console.log('✅ Aba "Sem atribuir" ativou (via container)!');
          return;
        } catch {
          console.log('⚠️ Ainda não ativou. Vou tentar novamente...');
          await this.page.waitForTimeout(800);
        }
      }
    }

    const finalActive = await this.getActiveTabTitle();
    throw new Error(
      `❌ Não consegui ativar "Sem atribuir". Aba ativa final: ${finalActive}`
    );
  }

  async assertUnassignedLoaded() {
    console.log('🎯 Validando aba ativa...');

    const activeTitle = await this.getActiveTabTitle();
    console.log(`📌 Aba ativa detectada: ${activeTitle}`);

    if (activeTitle !== 'Sem atribuir') {
      throw new Error(`❌ Aba ativa NÃO é "Sem atribuir". Está em: ${activeTitle}`);
    }

    console.log('✅ Confirmado: aba "Sem atribuir" está ativa');
  }

  cardsContainer() {
    return this.page.locator(
      '#page_content > div.content-columns > div.body-left > div > div.content > div'
    );
  }

  cards() {
    return this.page.locator('[id^="card_"]');
  }

  async waitCardsArea() {
    console.log('⏳ Aguardando área de cards renderizar...');

    const container = this.cardsContainer();
    await container.waitFor({ state: 'visible', timeout: 30000 });

    await this.page.waitForFunction(() => {
      const root = document.querySelector(
        '#page_content > div.content-columns > div.body-left > div > div.content > div'
      );
      if (!root) return false;

      const hasCard = root.querySelector('[id^="card_"]');
      const hasBody = root.querySelector('div.card-body');
      const hasFooter = root.querySelector('div.card-footer');
      return Boolean(hasCard || hasBody || hasFooter);
    }, { timeout: 30000 });

    console.log('✅ Área de cards pronta (tem conteúdo)');
  }

  async scrollAllCards() {
    console.log('⏳ Scrollando para carregar todos os cards...');

    await this.waitCardsArea();

    let lastCount = 0;

    for (let i = 1; i <= 40; i++) {
      const count = await this.cards().count();
      console.log(`📦 Cards visíveis (loop ${i}): ${count}`);

      if (count === lastCount) {
        await this.page.evaluate(() => window.scrollBy(0, 2500));
        await this.page.waitForTimeout(900);

        const count2 = await this.cards().count();
        if (count2 === lastCount) break;
        lastCount = count2;
      } else {
        lastCount = count;
      }

      await this.page.evaluate(() => window.scrollBy(0, 3000));
      await this.page.waitForTimeout(900);
    }

    console.log(`✅ Total de cards carregados: ${await this.cards().count()}`);
  }

  /**
   * Converte diferentes formatos de "atividade" para 0/1.
   * - parsed.has_activity (boolean/number)
   * - parsed.hasActivity (boolean/number)
   * - parsed.activityCount (number)
   */
  normalizeHasActivity(parsed) {
    const v =
      parsed?.has_activity ??
      parsed?.hasActivity ??
      (typeof parsed?.activityCount === 'number' ? parsed.activityCount > 0 : null);

    if (v === null || v === undefined) return 0;
    return v ? 1 : 0;
  }

  async readCards() {
    await this.waitCardsArea();

    const cards = this.cards();
    const total = await cards.count();
    console.log(`🧾 Lendo cards... Total: ${total}`);

    const items = [];
    const seen = new Set();
    const nowIso = new Date().toISOString();

    for (let i = 0; i < total; i++) {
      const card = cards.nth(i);

      const idAttr = await card.getAttribute('id').catch(() => null);

      const body = card.locator('div.card-body');
      const footer = card.locator('div.card-footer');

      const bodyText = (await body.innerText().catch(() => '')).trim();
      const footerText = (await footer.innerText().catch(() => '')).trim();

      // prioridade (best effort)
      const priority =
        (await card.locator('text=Urgente').count()) > 0
          ? 'Urgente'
          : (await card.locator('text=Média').count()) > 0
          ? 'Média'
          : null;

      // URL (pode ter mais de um link por card)
      const link = card.locator('a[href*="requests/show"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      const url = href
        ? href.startsWith('http')
          ? href
          : `https://rochalog.sd.cloud.invgate.net${href}`
        : null;

      // ✅ PARSE do card (triagem)
      const parsed = parseCardData({
        idAttr,
        bodyText,
        footerText,
        priority,
        url,
      });

      if (!parsed?.number) continue;

      // normaliza ticket_id (sem #)
      const ticketId = String(parsed.number).replace('#', '');

      // evita duplicado na mesma varredura
      if (seen.has(ticketId)) continue;
      seen.add(ticketId);

      // ✅ Atividade (0/1)
      const has_activity = this.normalizeHasActivity(parsed);

      // ✅ Salvar triagem (não deve sobrescrever detalhes bons — isso é tratado no upsert)
      try {
        saveTicketTriage({
          ticket_id: ticketId,
          titulo: parsed.title || parsed.titulo || null,
          local: parsed.local || null, // se vier do card, ótimo; se não, fica null
          url: parsed.url || url || null,
          collected_at: nowIso,
          has_activity,
        });
      } catch (e) {
        console.log('⚠️ Falha ao salvar triagem no DB:', e.message);
      }

      // devolve um objeto pronto pro index.js decidir abrir ticket.page.js
      items.push({
        ...parsed,
        ticket_id: ticketId,
        url: parsed.url || url || null,
        has_activity,
        collected_at: nowIso,
      });
    }

    console.log(`✅ Cards parseados (únicos): ${items.length}`);
    return items;
  }

  async debugCounts() {
    console.log('\n🧪 DEBUG DOM (página inteira):');
    console.log('div.card-body:', await this.page.locator('div.card-body').count());
    console.log('div.card-footer:', await this.page.locator('div.card-footer').count());
    console.log(
      'qualquer requests/show:',
      await this.page.locator('a[href*="requests/show"]').count()
    );
    console.log('id^=card_:', await this.page.locator('[id^="card_"]').count());
  }
}

module.exports = { MyWorkPage };

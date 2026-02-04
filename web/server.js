    // web/server.js
    const path = require('path');
    const express = require('express');
    const db = require('../src/db/db'); // usa seu db.js já configurado

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.static(path.join(__dirname, 'public')));

    function norm(s) {
    return String(s || '').trim();
    }

    // API: lista tickets com filtros simples
    app.get('/api/tickets', (req, res) => {
    const q = norm(req.query.q).toLowerCase();
    const onlyCftv = norm(req.query.onlyCftv); // "1" ou ""
    const status = norm(req.query.status); // ex: "Enviado para WorkSystem"

    // 🔎 query base
    let sql = `
        SELECT
        ticket_id, local, url,
        collected_at, has_activity, status,
        issue_type, camera_id
        FROM tickets
        WHERE 1=1
    `;
    const params = [];

    // filtro CFTV real: issue_type começa com "CF_"
    if (onlyCftv === '1') {
        sql += ` AND issue_type LIKE 'CF_%' `;
    }

    // filtro status
    if (status) {
        sql += ` AND status = ? `;
        params.push(status);
    }

    // busca textual (local / issue / camera / ticket_id)
    if (q) {
    sql += `
        AND (
        lower(coalesce(local, '')) LIKE ?
        OR lower(coalesce(issue_type, '')) LIKE ?
        OR lower(coalesce(camera_id, '')) LIKE ?
        OR cast(ticket_id as text) LIKE ?
        )
    `;
    const like = `%${q}%`;
    params.push(like, like, like, like);
    }

    sql += ` ORDER BY datetime(collected_at) DESC LIMIT 200 `;

    const rows = db.prepare(sql).all(...params);
    res.json({ ok: true, rows });
    });

    // API: lista valores de status pra dropdown
        app.get('/api/statuses', (req, res) => {
        const rows = db
            .prepare(`SELECT DISTINCT status FROM tickets WHERE status IS NOT NULL ORDER BY status`)
            .all();
        res.json({ ok: true, statuses: rows.map(r => r.status) });
    });

        app.listen(PORT, () => {
        console.log(`✅ Front: http://localhost:${PORT}`);
    });

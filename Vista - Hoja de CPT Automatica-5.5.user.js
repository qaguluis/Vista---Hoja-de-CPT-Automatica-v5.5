// ==UserScript==
// @name         Vista - Hoja de CPT Automatica
// @namespace    https://trans-logistics-eu.amazon.com/
// @version      5.5
// @description  Recoge todo los contenedores de cada CPT automaticamente y los añade en una hoja para ser imprimidos (Si notais algun fallo o teneis alguna mejora avisarnos).
// @author       @andgimen @qaguluis
// @match        https://trans-logistics-eu.amazon.com/sortcenter/vista/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/qaguluis/Vista---Hoja-de-CPT-Automatica-v5.5/raw/refs/heads/main/Vista%20-%20Hoja%20de%20CPT%20Automatica-5.5.user.js
// @downloadURL  https://github.com/qaguluis/Vista---Hoja-de-CPT-Automatica-v5.5/raw/refs/heads/main/Vista%20-%20Hoja%20de%20CPT%20Automatica-5.5.user.js
// ==/UserScript==

(function () {
    'use strict';

    const LINES = ['Box-A', 'Box-B', 'Box-D', 'Flat-A', 'Flat-C', 'Flat-D'];
    const BOX_D_COLORS = ['MARRON', 'VERDE', 'AZUL', 'ROJO', 'AMARILLO', 'NEGRO', 'BLANCO', 'NARANJA'];

    const OVERLAY_SHOW = 'display:flex !important; position:fixed !important; top:0 !important; left:0 !important; width:100vw !important; height:100vh !important; z-index:2147483647 !important; background:rgba(0,0,0,.7) !important; justify-content:center !important; align-items:center !important; backdrop-filter:blur(2px) !important;';
    const OVERLAY_HIDE = 'display:none !important;';

    // Inline styles for modal buttons — immune to VISTA CSS overrides
    const BTN_BASE    = 'display:inline-flex !important; align-items:center !important; justify-content:center !important; padding:9px 18px !important; border:none !important; border-radius:50px !important; cursor:pointer !important; font-weight:700 !important; font-size:13px !important; font-family:Arial,sans-serif !important; line-height:1 !important; white-space:nowrap !important; text-decoration:none !important; box-sizing:border-box !important; pointer-events:all !important;';
    const BTN_PRINT   = BTN_BASE + 'background:#1a2332 !important; color:#fff !important; box-shadow:0 2px 8px rgba(0,0,0,.2) !important;';
    const BTN_REFRESH = BTN_BASE + 'background:linear-gradient(135deg,#ff9900,#e07800) !important; color:#111 !important; box-shadow:0 2px 8px rgba(255,153,0,.35) !important;';
    const BTN_CLOSE   = BTN_BASE + 'background:#eee !important; color:#444 !important;';

    let justOpened = false;

    const style = document.createElement('style');
    style.textContent = `
        #tm-btn {
            position: fixed !important;
            bottom: 28px !important; right: 28px !important;
            z-index: 2147483640 !important;
            padding: 13px 22px !important;
            background: linear-gradient(135deg, #ff9900, #e07800) !important;
            color: #111 !important;
            font-weight: 700 !important; font-size: 14px !important;
            border: none !important; border-radius: 50px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 18px rgba(255,153,0,.55) !important;
            font-family: Arial, sans-serif !important;
            pointer-events: all !important;
            transition: transform .15s, box-shadow .15s !important;
            display: flex !important; align-items: center !important; gap: 8px !important;
        }
        #tm-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 7px 24px rgba(255,153,0,.65) !important; }
        #tm-btn:active { transform: translateY(0) !important; }
        #tm-btn:disabled { background: linear-gradient(135deg,#bbb,#999) !important; box-shadow: none !important; cursor: wait !important; transform: none !important; }

        #tm-modal {
            background: #fff !important;
            border-radius: 14px !important; padding: 24px !important;
            max-width: 99vw !important; max-height: 96vh !important;
            overflow: auto !important;
            box-shadow: 0 8px 40px rgba(0,0,0,.35) !important;
            font-family: Arial, sans-serif !important;
            width: 99vw !important;
            pointer-events: all !important;
            box-sizing: border-box !important;
        }

        #tm-cpt-grid {
            display: grid !important;
            align-items: start !important;
        }

        .tm-cpt-table {
            border-collapse: collapse !important;
            width: 100% !important;
            border-radius: 6px !important; overflow: hidden !important;
            box-shadow: 0 1px 5px rgba(0,0,0,.10) !important;
        }
        .tm-cpt-table th, .tm-cpt-table td {
            border: 1px solid #e8e8e8 !important;
            text-align: center !important;
            vertical-align: middle !important;
        }
        .tm-cpt-table th {
            background: #1a2332 !important; color: #fff !important;
            text-transform: uppercase !important; letter-spacing: 0.4px !important;
        }
        .tm-cpt-header td {
            background: linear-gradient(135deg,#ff9900,#e07800) !important;
            color: #111 !important; font-weight: 700 !important;
            text-align: center !important;
        }
        .tm-line-name {
            font-weight: 700 !important; text-align: left !important;
            background: #f9f9f9 !important; color: #222 !important;
            white-space: nowrap !important;
        }
        .tm-nums {
            text-align: left !important;
            color: #1a2332 !important;
            font-weight: 600 !important;
            word-break: break-word !important;
            line-height: 1.6 !important;
        }
        .tm-zero { color: #ccc !important; text-align: center !important; }
        .tm-cpt-table tr:hover td { background: #fffbf2 !important; }
        .tm-cpt-header:hover td { background: linear-gradient(135deg,#ff9900,#e07800) !important; }

        #tm-progress-wrap {
            width: 100% !important; background: #eee !important;
            border-radius: 50px !important; height: 8px !important;
            margin-bottom: 12px !important; overflow: hidden !important;
        }
        #tm-progress {
            height: 8px !important;
            background: linear-gradient(90deg,#ff9900,#e07800) !important;
            border-radius: 50px !important; width: 0%;
            transition: width .35s ease !important;
        }
        #tm-status {
            font-size: 12px !important; color: #888 !important;
            margin-bottom: 8px !important; min-height: 16px !important;
        }

        @media print {
            body > *:not(#tm-overlay) { display: none !important; }
            #tm-overlay { display: block !important; position: static !important; background: #fff !important; }
            #tm-modal {
                box-shadow: none !important; max-height: none !important;
                overflow: visible !important; padding: 4px !important;
                border-radius: 0 !important; width: 100% !important;
            }
            #tm-btnbar-wrap, #tm-progress-wrap, #tm-status, #tm-btn { display: none !important; }
            .tm-cpt-table { box-shadow: none !important; }
            #tm-cpt-grid { gap: 3px !important; }
        }
    `;
    document.head.appendChild(style);

    // ── DOM ──────────────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.id = 'tm-btn';
    btn.innerHTML = '<span>📦</span><span>Hoja de CPT</span>';
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'tm-overlay';
    overlay.style.cssText = OVERLAY_HIDE;
    const modal = document.createElement('div');
    modal.id = 'tm-modal';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function showOverlay() {
        justOpened = true;
        overlay.style.cssText = OVERLAY_SHOW;
        setTimeout(() => { justOpened = false; }, 600);
    }
    function hideOverlay() { overlay.style.cssText = OVERLAY_HIDE; }

    btn.addEventListener('mousedown', function (e) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        setTimeout(() => startCollect(), 50);
    }, true);

    overlay.addEventListener('click', function (e) {
        if (justOpened) { e.stopImmediatePropagation(); return; }
        if (e.target === overlay) hideOverlay();
    }, true);

    modal.addEventListener('mousedown', function (e) {
        const id = e.target?.id;
        if (id === 'tm-print')   { e.stopPropagation(); window.print(); return; }
        if (id === 'tm-refresh') { e.stopPropagation(); setTimeout(() => startCollect(), 50); return; }
        if (id === 'tm-close')   { e.stopPropagation(); hideOverlay(); return; }
    }, true);

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function setStatus(msg) {
        const el = document.getElementById('tm-status');
        if (el) el.textContent = msg;
    }
    function setProgress(done, total) {
        const bar = document.getElementById('tm-progress');
        if (bar) bar.style.width = total > 0 ? `${Math.round(done / total * 100)}%` : '0%';
    }

    function calcLayout(n) {
        if      (n <= 1)  return { cols: 1, gap: 14, fs: 14, p: '8px 10px', hs: 15 };
        else if (n <= 2)  return { cols: 2, gap: 12, fs: 13, p: '7px 9px',  hs: 14 };
        else if (n <= 3)  return { cols: 3, gap: 10, fs: 12, p: '6px 8px',  hs: 13 };
        else if (n <= 4)  return { cols: 4, gap: 8,  fs: 12, p: '6px 7px',  hs: 13 };
        else if (n <= 5)  return { cols: 5, gap: 7,  fs: 11, p: '5px 6px',  hs: 12 };
        else if (n <= 6)  return { cols: 6, gap: 6,  fs: 11, p: '5px 6px',  hs: 12 };
        else if (n <= 8)  return { cols: 4, gap: 6,  fs: 10, p: '4px 5px',  hs: 11 };
        else if (n <= 10) return { cols: 5, gap: 5,  fs: 10, p: '4px 5px',  hs: 11 };
        else if (n <= 12) return { cols: 6, gap: 5,  fs: 9,  p: '3px 4px',  hs: 10 };
        else if (n <= 15) return { cols: 5, gap: 4,  fs: 9,  p: '3px 4px',  hs: 10 };
        else              return { cols: 6, gap: 3,  fs: 8,  p: '2px 3px',  hs: 9  };
    }

    function locToNum(location) {
        const matches = location.match(/\d+/g);
        return matches ? matches[matches.length - 1] : location;
    }

    function locToBoxD(location) {
        const num = locToNum(location);
        const upper = location.toUpperCase();
        for (const color of BOX_D_COLORS) {
            if (upper.includes(color)) return `${num}-${color}`;
        }
        return num;
    }

    function getCPTRows() {
        return [...document.querySelectorAll('.rt-tr-group')].filter(g => {
            const first = g.querySelector('.rt-td');
            return first && /^\d{1,2}:\d{2}/.test(first.textContent.trim());
        });
    }

    async function waitForDrilldown(maxMs = 5000) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const found = [...document.querySelectorAll('.rt-tr-group')].some(r => {
                const first = r.querySelector('.rt-td');
                return first && /^(GAYLORD|CART|PALLET)/i.test(first.textContent.trim());
            });
            if (found) return true;
            await sleep(150);
        }
        return false;
    }

    async function waitForDrilldownGone(maxMs = 4000) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const still = [...document.querySelectorAll('.rt-tr-group')].some(r => {
                const first = r.querySelector('.rt-td');
                return first && /^(GAYLORD|CART|PALLET)/i.test(first.textContent.trim());
            });
            if (!still) return true;
            await sleep(150);
        }
        return false;
    }

    function readDrilldown() {
        const lineData = {};
        LINES.forEach(l => { lineData[l] = []; });
        lineData['Other'] = [];

        [...document.querySelectorAll('.rt-tr-group')].forEach(row => {
            const cells = [...row.querySelectorAll('.rt-td')];
            if (cells.length < 3) return;
            const containerId = cells[0].textContent.trim();
            const location    = cells[2].textContent.trim();
            if (!/^(GAYLORD|CART|PALLET)/i.test(containerId)) return;
            classifyByLocation(location, lineData);
        });

        return lineData;
    }

    function classifyByLocation(location, lineData) {
        const upper = location.toUpperCase();
        for (const line of LINES) {
            if (upper.startsWith(line.toUpperCase())) {
                lineData[line].push(location);
                return;
            }
        }
        lineData['Other'].push(location);
    }

    async function closeDrilldown() {
        const candidates = [...document.querySelectorAll('button, a, span')].filter(el => {
            const txt = (el.textContent || '').trim().toLowerCase();
            const cls = (el.className || '').toLowerCase();
            return /back|volver|return|←|‹/.test(txt) ||
                   /back|breadcrumb|drilldown.?back/i.test(cls);
        });
        if (candidates.length > 0) { candidates[0].click(); return; }
        history.back();
    }

    async function collectAll() {
        const snapshot = getCPTRows().map(row => {
            const cells = [...row.querySelectorAll('.rt-td')];
            return {
                time:    cells[0]?.textContent.trim() || '',
                stacked: cells[2]?.textContent.trim() || '0',
            };
        });

        if (snapshot.length === 0) return null;
        const results = [];

        for (let i = 0; i < snapshot.length; i++) {
            const cpt = snapshot[i];
            setStatus(`CPT ${i + 1}/${snapshot.length}: ${cpt.time} — Stacked: ${cpt.stacked}`);
            setProgress(i, snapshot.length);

            let lineData = null;
            const stackedNum = parseInt(cpt.stacked, 10);

            if (!isNaN(stackedNum) && stackedNum > 0) {
                const freshRows = getCPTRows();
                const freshRow  = freshRows[i];
                if (freshRow) {
                    const cells = [...freshRow.querySelectorAll('.rt-td')];
                    const link  = cells[2]?.querySelector('a.PbCptDrilldown');
                    if (link) {
                        link.click();
                        const appeared = await waitForDrilldown(5000);
                        if (appeared) {
                            await sleep(600);
                            lineData = readDrilldown();
                            await closeDrilldown();
                            await waitForDrilldownGone(4000);
                            await sleep(500);
                        }
                    }
                }
            }

            results.push({ ...cpt, lineData });
        }

        setProgress(snapshot.length, snapshot.length);
        setStatus('✅ Listo.');
        return results;
    }

    function buildCptTable(cpt, layout) {
        const { fs, p, hs } = layout;

        let html = `
            <table class="tm-cpt-table" style="font-size:${fs}px !important;">
                <tr class="tm-cpt-header">
                    <td colspan="2" style="font-size:${hs}px !important; padding:${p} !important;">
                        🕐 ${cpt.time}
                    </td>
                </tr>
                <tr>
                    <th style="padding:${p} !important; font-size:${Math.max(fs-1,7)}px !important; width:38%;">Línea</th>
                    <th style="padding:${p} !important; font-size:${Math.max(fs-1,7)}px !important;">Ubicaciones</th>
                </tr>
        `;

        if (cpt.lineData) {
            LINES.forEach(line => {
                const items = cpt.lineData[line] || [];
                let cellContent;
                if (items.length === 0) {
                    cellContent = `<span style="color:#ccc;">—</span>`;
                } else if (line === 'Box-D') {
                    cellContent = items.map(locToBoxD).join(', ');
                } else {
                    cellContent = items.map(locToNum).join(', ');
                }
                html += `
                    <tr>
                        <td class="tm-line-name" style="padding:${p} !important; font-size:${fs}px !important;">${line}</td>
                        <td class="${items.length > 0 ? 'tm-nums' : 'tm-zero'}" style="padding:${p} !important; font-size:${fs}px !important;">${cellContent}</td>
                    </tr>
                `;
            });
            const others = cpt.lineData['Other'] || [];
            if (others.length > 0) {
                html += `
                    <tr>
                        <td class="tm-line-name" style="padding:${p} !important;">Otros</td>
                        <td class="tm-nums" style="padding:${p} !important;">${others.map(locToNum).join(', ')}</td>
                    </tr>
                `;
            }
        } else {
            LINES.forEach(line => {
                html += `
                    <tr>
                        <td class="tm-line-name" style="padding:${p} !important;">${line}</td>
                        <td class="tm-zero" style="padding:${p} !important;">—</td>
                    </tr>
                `;
            });
        }

        html += `</table>`;
        return html;
    }

    // ── RENDER — buttons fully inline, no CSS classes ─────────────────
    function renderReport(data) {
        let html = `
            <div id="tm-btnbar-wrap" style="margin-bottom:16px !important; display:flex !important; gap:10px !important; flex-wrap:wrap !important;">
                <button id="tm-print"   style="${BTN_PRINT}">🖨️ Imprimir</button>
                <button id="tm-refresh" style="${BTN_REFRESH}">🔄 Recopilar de nuevo</button>
                <button id="tm-close"   style="${BTN_CLOSE}">✕ Cerrar</button>
            </div>
        `;

        if (!data || data.length === 0) {
            html += `<p style="color:red;font-family:Arial,sans-serif;">⚠️ No se encontraron CPTs. Asegúrate de estar en la vista <b>Containers by CPT</b>.</p>`;
        } else {
            const layout = calcLayout(data.length);
            html += `<div id="tm-cpt-grid" style="grid-template-columns: repeat(${layout.cols}, 1fr) !important; gap: ${layout.gap}px !important;">`;
            data.forEach(cpt => {
                html += `<div>${buildCptTable(cpt, layout)}</div>`;
            });
            html += `</div>`;
        }

        modal.innerHTML = html;
    }

    function showLoading() {
        modal.innerHTML = `
            <p style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;margin:0 0 10px 0;color:#1a2332;">
                📦 Recopilando datos...
            </p>
            <div id="tm-status">Iniciando...</div>
            <div id="tm-progress-wrap"><div id="tm-progress"></div></div>
            <p style="color:#aaa;font-size:12px;margin-top:10px;">
                Abriendo cada CPT automáticamente. No hagas clic en nada.
            </p>
        `;
        showOverlay();
    }

    async function startCollect() {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span><span>Recopilando...</span>';
        showLoading();
        try {
            const data = await collectAll();
            renderReport(data);
        } catch (err) {
            console.error('[TM]', err);
            modal.innerHTML = `<p style="color:red;font-family:Arial,sans-serif;">❌ Error: ${err.message}</p>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>📦</span><span>Hoja de CPT</span>';
        }
    }

    console.log('[TM] VISTA Stacked by Line v5.4 loaded ✅');
})();

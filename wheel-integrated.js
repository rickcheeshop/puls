'use strict';

(function () {
    const CODE_STORAGE_KEY = 'wheel_codes';
    const CODE_HISTORY_KEY = 'wheel_code_history';
    const SPIN_HISTORY_KEY = 'wheel_spin_history';

    const DEFAULT_ITEMS = [
        { id: 'netflix7', name: 'Netflix 7 Day', rate: 0 },
        { id: 'netflix1', name: 'Netflix 1 Day', rate: 5.45 },
        { id: 'netflix3', name: 'Netflix 3 Day', rate: 1.82 },
        { id: 'discount10', name: 'ส่วนลด 10%', rate: 1.82 },
        { id: 'discount5', name: 'ส่วนลด 5%', rate: 5.45 },
        { id: 'discount20', name: 'ส่วนลด 20%', rate: 0 },
        { id: 'miss', name: 'MISS', rate: 85.46 }
    ];

    const SEGMENT_PALETTE = [
        ['#c99a35', '#6f4711'],
        ['#8f0912', '#3c0508'],
        ['#e0bf67', '#8b641f'],
        ['#b20b15', '#52070b'],
        ['#9e772c', '#44300d'],
        ['#d9ad4d', '#735019'],
        ['#26282d', '#0f1013'],
        ['#7f0710', '#350408'],
        ['#b98b2e', '#59400f']
    ];

    const state = {
        initialized: false,
        isSpinning: false,
        resultOpen: false,
        currentRotation: 0,
        currentCode: null,
        spinsLeft: 0,
        items: DEFAULT_ITEMS.map(item => ({ ...item })),
        canvas: null,
        ctx: null,
        animationTimer: null
    };

    const $ = (id) => document.getElementById(id);

    function safeJsonParse(value, fallback) {
        try { return JSON.parse(value); } catch (_) { return fallback; }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getConfig() {
        return window.RickCheeConfig && typeof window.RickCheeConfig === 'object' ? window.RickCheeConfig : {};
    }

    function getApiBase() {
        if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') return 'firebase-direct';
        const cfg = getConfig();
        return String(cfg.apiBaseUrl || '').trim().replace(/\/+$/, '');
    }

    async function callWheelApi(action, payload = {}) {
        if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
            return await window.RickCheeDirectApi.call(action, payload || {});
        }
        const base = getApiBase();
        if (!base) throw new Error('api_not_configured');

        const url = new URL(base, window.location.href);
        url.searchParams.set('action', action);
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
                signal: controller.signal
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `http_${response.status}`);
            return data;
        } finally {
            clearTimeout(timeout);
        }
    }

    function getLocalCodes() {
        return safeJsonParse(localStorage.getItem(CODE_STORAGE_KEY) || '[]', []);
    }

    function saveLocalCodes(codes) {
        localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(Array.isArray(codes) ? codes : []));
    }

    function getHistory(key) {
        const value = safeJsonParse(localStorage.getItem(key) || '[]', []);
        return Array.isArray(value) ? value : [];
    }

    function setHistory(key, list) {
        localStorage.setItem(key, JSON.stringify(list.slice(-500)));
    }

    function addCodeHistory(code, valid, message) {
        const list = getHistory(CODE_HISTORY_KEY);
        list.push({ code, valid, message, time: new Date().toISOString() });
        setHistory(CODE_HISTORY_KEY, list);
        renderCodeHistory();
    }

    function addSpinHistory(code, prize) {
        const list = getHistory(SPIN_HISTORY_KEY);
        list.push({ code, prize, time: new Date().toISOString() });
        setHistory(SPIN_HISTORY_KEY, list);
        renderSpinHistory();
    }

    function normalizeSettings(payload) {
        const source = Array.isArray(payload)
            ? payload
            : payload && Array.isArray(payload.wheelRates)
                ? payload.wheelRates
                : [];

        return source.map((item, index) => ({
            id: String(item?.id || `prize-${index + 1}`),
            name: String(item?.label || item?.name || `รางวัล ${index + 1}`).trim(),
            rate: Math.max(0, Number(item?.rate) || 0)
        })).filter(item => item.name);
    }

    function applySettings(payload) {
        const next = normalizeSettings(payload);
        if (!next.length || state.isSpinning) return false;
        state.items = next;
        drawWheel();
        renderPrizes();
        return true;
    }

    function getFriendlyWheelLabel(value) {
        const text = String(value == null ? '-' : value).trim();
        if (text.toUpperCase().includes('MISS')) return 'ยังไม่ได้รับรางวัล';
        return text || '-';
    }

    function formatHistoryTime(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('th-TH', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }

    function renderCodeHistory() {
        const container = $('rcwCodeHistoryList');
        if (!container) return;
        const list = getHistory(CODE_HISTORY_KEY).slice().reverse();
        if (!list.length) {
            container.innerHTML = '<div class="rcw-empty-state"><i class="fas fa-clock-rotate-left"></i><span>ยังไม่มีประวัติ</span></div>';
            return;
        }
        container.innerHTML = list.map(item => `
            <div class="rcw-log-row ${item.valid === false || item.isValid === false ? 'is-invalid' : ''}">
                <span class="rcw-log-icon"><i class="fas ${item.valid === false || item.isValid === false ? 'fa-xmark' : 'fa-check'}"></i></span>
                <div class="rcw-log-copy"><strong>${escapeHtml(item.code || '-')}</strong><small>${escapeHtml(item.message || '')} • ${escapeHtml(formatHistoryTime(item.time))}</small></div>
                <span class="rcw-log-badge">${item.valid === false || item.isValid === false ? 'ไม่สำเร็จ' : 'สำเร็จ'}</span>
            </div>
        `).join('');
    }

    function renderSpinHistory() {
        const container = $('rcwSpinHistoryList');
        if (!container) return;
        const list = getHistory(SPIN_HISTORY_KEY).slice().reverse();
        if (!list.length) {
            container.innerHTML = '<div class="rcw-empty-state"><i class="fas fa-clock-rotate-left"></i><span>ยังไม่มีประวัติ</span></div>';
            return;
        }
        container.innerHTML = list.map(item => {
            const miss = String(item.prize || '').toUpperCase().includes('MISS');
            return `
                <div class="rcw-log-row ${miss ? 'is-miss' : 'is-prize'}">
                    <span class="rcw-log-icon"><i class="fas ${miss ? 'fa-minus' : 'fa-gift'}"></i></span>
                    <div class="rcw-log-copy"><strong>${escapeHtml(getFriendlyWheelLabel(item.prize))}</strong><small>${escapeHtml(item.code || '-')} • ${escapeHtml(formatHistoryTime(item.time))}</small></div>
                    <span class="rcw-log-badge">${miss ? 'ไว้ลุ้นครั้งหน้า' : 'ได้รับรางวัล'}</span>
                </div>`;
        }).join('');
    }

    function renderPrizes() {
        const container = $('rcwPrizesGrid');
        if (!container) return;
        container.innerHTML = state.items.map((item, index) => {
            const pair = SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
            return `
                <div class="rcw-prize-card">
                    <span class="rcw-prize-swatch" style="--rcw-swatch-a:${pair[0]};--rcw-swatch-b:${pair[1]}"></span>
                    <div><small>รางวัล ${String(index + 1).padStart(2, '0')}</small><strong>${escapeHtml(getFriendlyWheelLabel(item.name))}</strong></div>
                </div>`;
        }).join('');
    }

    function fitCanvasForDpr() {
        const canvas = state.canvas;
        if (!canvas) return;
        // Keep a deterministic internal resolution for animation and crisp text.
        if (canvas.width !== 620 || canvas.height !== 620) {
            canvas.width = 620;
            canvas.height = 620;
        }
    }

    function drawTextInSegment(ctx, text, angle, radius, slice) {
        const words = String(text).split(/\s+/).filter(Boolean);
        const maxChars = slice < 0.7 ? 12 : 16;
        const lines = [];
        let current = '';
        words.forEach(word => {
            const candidate = current ? `${current} ${word}` : word;
            if (candidate.length > maxChars && current) {
                lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        });
        if (current) lines.push(current);
        const finalLines = lines.slice(0, 2);
        if (lines.length > 2) finalLines[1] = `${finalLines[1].slice(0, Math.max(4, maxChars - 1))}…`;

        const textRadius = radius * 0.66;
        const x = Math.cos(angle) * textRadius;
        const y = Math.sin(angle) * textRadius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.font = `700 ${slice < 0.7 ? 16 : 18}px Kanit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff4d4';
        ctx.shadowColor = 'rgba(0,0,0,.8)';
        ctx.shadowBlur = 6;
        const lineHeight = 21;
        finalLines.forEach((line, index) => {
            const offset = (index - (finalLines.length - 1) / 2) * lineHeight;
            ctx.fillText(line, 0, offset);
        });
        ctx.restore();
    }

    function drawWheel() {
        if (!state.canvas || !state.ctx || !state.items.length) return;
        fitCanvasForDpr();
        const canvas = state.canvas;
        const ctx = state.ctx;
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 18;
        const slice = Math.PI * 2 / state.items.length;

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(center, center);

        state.items.forEach((item, index) => {
            const start = -Math.PI / 2 + index * slice;
            const end = start + slice;
            const pair = SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
            const gx = Math.cos(start + slice / 2) * radius;
            const gy = Math.sin(start + slice / 2) * radius;
            const grad = ctx.createLinearGradient(0, 0, gx, gy);
            grad.addColorStop(0, pair[1]);
            grad.addColorStop(0.58, pair[0]);
            grad.addColorStop(1, pair[1]);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, start, end);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(247,212,128,.58)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Fine metallic highlight near the outer rim.
            ctx.beginPath();
            ctx.arc(0, 0, radius - 8, start + 0.015, end - 0.015);
            ctx.strokeStyle = 'rgba(255,239,190,.12)';
            ctx.lineWidth = 3;
            ctx.stroke();

            drawTextInSegment(ctx, getFriendlyWheelLabel(item.name), start + slice / 2, radius, slice);
        });

        // Static-looking concentric detailing painted into the wheel.
        ctx.beginPath();
        ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#f1cf75';
        ctx.lineWidth = 7;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, radius - 13, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(35,22,4,.9)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,226,145,.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    function setStatus(type, message) {
        const el = $('rcwCodeStatus');
        if (!el) return;
        el.className = `rcw-code-status${type ? ` is-${type}` : ''}`;
        el.innerHTML = message ? `<i class="fas ${type === 'success' ? 'fa-circle-check' : type === 'loading' ? 'fa-spinner fa-spin' : 'fa-circle-exclamation'}"></i><span>${escapeHtml(message)}</span>` : '';
    }

    function setSpins(left) {
        state.spinsLeft = Math.max(0, Number(left) || 0);
        const info = $('rcwSpinsInfo');
        const value = $('rcwSpinsValue');
        if (value) value.textContent = String(state.spinsLeft);
        if (info) info.hidden = state.currentCode === null;
    }

    function setSpinButton(mode) {
        const btn = $('rcwSpinBtn');
        if (!btn) return;
        const label = btn.querySelector('.rcw-spin-button-copy b');
        const small = btn.querySelector('.rcw-spin-button-copy small');
        const icon = btn.querySelector('.rcw-spin-button-icon i');

        const presets = {
            locked: ['กรุณาใส่โค้ด', 'VERIFY CODE TO UNLOCK', true, 'fa-dharmachakra'],
            ready: ['หมุนวงล้อ', `${state.spinsLeft} SPINS AVAILABLE`, false, 'fa-gem'],
            spinning: ['กำลังสุ่มรางวัล...', 'GOOD LUCK', true, 'fa-dharmachakra fa-spin'],
            empty: ['สิทธิ์ถูกใช้ครบแล้ว', 'NO SPINS LEFT', true, 'fa-lock']
        };
        const preset = presets[mode] || presets.locked;
        if (label) label.textContent = preset[0];
        if (small) small.textContent = preset[1];
        btn.disabled = preset[2];
        if (icon) icon.className = `fas ${preset[3]}`;
        btn.dataset.mode = mode;
    }

    async function verifyCode() {
        if (state.isSpinning) return;
        const inputEl = $('rcwCodeInput');
        const verifyBtn = $('rcwVerifyBtn');
        const code = String(inputEl?.value || '').trim().toUpperCase();
        if (inputEl) inputEl.value = code;

        if (!code) {
            state.currentCode = null;
            setSpins(0);
            setSpinButton('locked');
            setStatus('error', 'กรุณากรอกรหัสสิทธิ์ก่อนตรวจสอบ');
            inputEl?.focus();
            return;
        }

        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.classList.add('is-loading');
        }
        setStatus('loading', 'กำลังตรวจสอบสิทธิ์กับระบบ Rick Chee Shop...');
        setSpinButton('locked');

        try {
            const api = getApiBase();
            let valid = false;
            let spins = 0;
            let error = '';

            if (api) {
                const result = await callWheelApi('validate', { code });
                valid = result.valid === true;
                spins = Math.max(0, Number(result.spins) || 0);
                error = String(result.error || '');
            } else {
                const data = getLocalCodes().find(item => String(item.code || '').toUpperCase() === code);
                valid = !!data && Number(data.spins) > 0;
                spins = data ? Math.max(0, Number(data.spins) || 0) : 0;
                error = !data ? 'not_found' : spins <= 0 ? 'no_spins' : '';
            }

            if (valid && spins > 0) {
                state.currentCode = code;
                setSpins(spins);
                setStatus('success', `โค้ดถูกต้อง พร้อมใช้งาน ${spins} สิทธิ์`);
                setSpinButton('ready');
                addCodeHistory(code, true, `สิทธิ์ ${spins} ครั้ง`);
                if (typeof window.RickCheeClientWebhook === 'function') void window.RickCheeClientWebhook('wheelVerify', {
                    'โค้ด': code,
                    'ผลตรวจ': 'ผ่าน',
                    'สิทธิ์คงเหลือ': spins,
                    'เวลา': new Date().toLocaleString('th-TH'),
                });
            } else {
                state.currentCode = null;
                setSpins(0);
                const message = error === 'expired' ? 'โค้ดนี้หมดอายุแล้ว'
                    : error === 'no_spins' ? 'โค้ดนี้ใช้สิทธิ์ครบแล้ว'
                    : 'ไม่พบโค้ดนี้หรือโค้ดไม่ถูกต้อง';
                setStatus('error', message);
                setSpinButton('locked');
                addCodeHistory(code, false, message);
                if (typeof window.RickCheeClientWebhook === 'function') void window.RickCheeClientWebhook('wheelVerify', {
                    'โค้ด': code,
                    'ผลตรวจ': 'ไม่ผ่าน',
                    'รายละเอียด': message,
                    'เวลา': new Date().toLocaleString('th-TH'),
                });
            }
        } catch (error) {
            console.warn('Rick Chee wheel verify failed:', error);
            state.currentCode = null;
            setSpins(0);
            setSpinButton('locked');
            setStatus('error', 'เชื่อมต่อระบบตรวจโค้ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            addCodeHistory(code, false, 'เชื่อมต่อระบบไม่สำเร็จ');
            if (typeof window.RickCheeClientWebhook === 'function') void window.RickCheeClientWebhook('wheelVerify', {
                'โค้ด': code,
                'ผลตรวจ': 'ผิดพลาด',
                'รายละเอียด': 'เชื่อมต่อระบบไม่สำเร็จ',
                'เวลา': new Date().toLocaleString('th-TH'),
            });
        } finally {
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.classList.remove('is-loading');
            }
        }
    }

    async function consumeSpin() {
        if (!state.currentCode) return null;
        const api = getApiBase();
        if (api) {
            // Firebase V5: prize selection + spin consumption happen on the server.
            const result = await callWheelApi('spin', { code: state.currentCode });
            if (result.ok !== true) return null;
            setSpins(result.spinsLeft ?? Math.max(0, state.spinsLeft - 1));
            return result;
        }

        const codes = getLocalCodes();
        const index = codes.findIndex(item => String(item.code || '').toUpperCase() === state.currentCode);
        if (index < 0 || Number(codes[index].spins) <= 0) return null;
        codes[index].spins = Math.max(0, Number(codes[index].spins) - 1);
        saveLocalCodes(codes);
        setSpins(codes[index].spins);
        return { ok: true, serverRecorded: false };
    }

    function chooseWinnerIndex() {
        const rates = state.items.map(item => Math.max(0, Number(item.rate) || 0));
        const total = rates.reduce((sum, rate) => sum + rate, 0);
        const missIndex = state.items.findIndex(item => String(item.name).toUpperCase() === 'MISS');
        if (total <= 0) return missIndex >= 0 ? missIndex : 0;
        let ticket = Math.random() * total;
        for (let i = 0; i < rates.length; i += 1) {
            ticket -= rates[i];
            if (ticket < 0) return i;
        }
        return state.items.length - 1;
    }

    async function recordResult(prize) {
        const code = state.currentCode;
        addSpinHistory(code, prize);
        const api = getApiBase();
        if (!api) {
            const codes = getLocalCodes();
            const index = codes.findIndex(item => String(item.code || '').toUpperCase() === code);
            if (index >= 0) {
                codes[index].history = Array.isArray(codes[index].history) ? codes[index].history : [];
                codes[index].history.push({ prize, time: new Date().toISOString() });
                saveLocalCodes(codes);
            }
            return;
        }
        try { await callWheelApi('record', { code, prize }); } catch (error) { console.warn('Rick Chee wheel record failed:', error); }
    }

    function openResult(prize) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if ($('rcwResultPrize')) $('rcwResultPrize').textContent = getFriendlyWheelLabel(prize);
        if ($('rcwResultCode')) $('rcwResultCode').textContent = state.currentCode || '-';
        if ($('rcwResultDate')) $('rcwResultDate').textContent = dateStr;
        if ($('rcwResultTime')) $('rcwResultTime').textContent = timeStr;
        const modal = $('rcwResultModal');
        if (modal) {
            // V7.3: move the result overlay to <body> so position:fixed is viewport-based
            // even when the wheel page is inside a transformed/scrolling container.
            if (modal.parentElement !== document.body) document.body.appendChild(modal);
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            modal.scrollTop = 0;
            document.body.classList.add('rcw-result-open');
            requestAnimationFrame(() => modal.querySelector('.rcw-result-card')?.scrollTo?.({ top: 0, behavior: 'auto' }));
        }
        state.resultOpen = true;
        createConfetti();
    }

    function closeResult() {
        const modal = $('rcwResultModal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('rcw-result-open');
        state.resultOpen = false;
        if (state.spinsLeft > 0 && state.currentCode) setSpinButton('ready');
        else if (state.currentCode) setSpinButton('empty');
        else setSpinButton('locked');
    }

    function createConfetti() {
        const palette = ['#d8aa45', '#f2d37e', '#a80914', '#fff2c0'];
        const count = window.innerWidth > 900 ? 34 : 22;
        for (let i = 0; i < count; i += 1) {
            const node = document.createElement('i');
            node.className = 'rcw-confetti';
            node.style.left = `${Math.random() * 100}vw`;
            node.style.setProperty('--rcw-confetti-x', `${Math.random() * 180 - 90}px`);
            node.style.setProperty('--rcw-confetti-rot', `${Math.random() * 960 - 480}deg`);
            node.style.setProperty('--rcw-confetti-color', palette[Math.floor(Math.random() * palette.length)]);
            node.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
            document.body.appendChild(node);
            node.addEventListener('animationend', () => node.remove(), { once: true });
        }
    }

    async function spin() {
        if (state.isSpinning || state.resultOpen || !state.currentCode || state.spinsLeft <= 0) return;
        state.isSpinning = true;
        setSpinButton('spinning');
        setStatus('success', 'ยืนยันสิทธิ์แล้ว กำลังสุ่มรางวัลให้คุณ...');

        try {
            const consumed = await consumeSpin();
            if (!consumed) {
                setStatus('error', 'ไม่สามารถใช้สิทธิ์นี้ได้ กรุณาตรวจสอบโค้ดใหม่');
                state.currentCode = null;
                setSpins(0);
                setSpinButton('locked');
                return;
            }

            let winnerIndex = -1;
            if (consumed.prizeId) winnerIndex = state.items.findIndex(item => String(item.id) === String(consumed.prizeId));
            if (winnerIndex < 0 && consumed.prize) winnerIndex = state.items.findIndex(item => String(item.name) === String(consumed.prize));
            if (winnerIndex < 0) winnerIndex = consumed.serverRecorded ? Math.max(0, state.items.findIndex(item => String(item.name).toUpperCase() === 'MISS')) : chooseWinnerIndex();
            const sliceDeg = 360 / state.items.length;
            const winnerCenter = winnerIndex * sliceDeg + sliceDeg / 2;
            const desired = 360 - winnerCenter;
            const rounds = 6 + Math.floor(Math.random() * 3);
            const currentMod = ((state.currentRotation % 360) + 360) % 360;
            const delta = rounds * 360 + ((desired - currentMod + 360) % 360);
            state.currentRotation += delta;

            state.canvas.style.transition = 'transform 4.8s cubic-bezier(.12,.72,.08,1)';
            state.canvas.style.transform = `rotate(${state.currentRotation}deg)`;

            await new Promise(resolve => {
                clearTimeout(state.animationTimer);
                state.animationTimer = setTimeout(resolve, 4900);
            });

            const prize = consumed.prize || state.items[winnerIndex]?.name || 'MISS';
            if (!consumed.serverRecorded) await recordResult(prize);
            else addSpinHistory(state.currentCode, prize);
            openResult(prize);
            if (typeof window.RickCheeClientWebhook === 'function') void window.RickCheeClientWebhook('wheelSpin', {
                'โค้ด': state.currentCode || '-',
                'รางวัล': prize,
                'สิทธิ์คงเหลือ': state.spinsLeft,
                'เวลา': new Date().toLocaleString('th-TH'),
            });
            if (state.spinsLeft <= 0) {
                setStatus('error', 'โค้ดนี้ใช้สิทธิ์ครบแล้ว');
            } else {
                setStatus('success', `เหลือสิทธิ์อีก ${state.spinsLeft} ครั้ง`);
            }
        } catch (error) {
            console.error('Rick Chee wheel spin failed:', error);
            setStatus('error', 'การสุ่มไม่สำเร็จ กรุณาลองใหม่หรือติดต่อแอดมิน');
            if (state.spinsLeft > 0) setSpinButton('ready');
        } finally {
            state.isSpinning = false;
            if (!state.resultOpen) {
                if (state.spinsLeft > 0 && state.currentCode) setSpinButton('ready');
                else if (state.currentCode) setSpinButton('empty');
                else setSpinButton('locked');
            }
        }
    }

    function clearCurrentCode() {
        if (state.isSpinning) return;
        const input = $('rcwCodeInput');
        if (input) {
            input.value = '';
            input.focus();
        }
        state.currentCode = null;
        setSpins(0);
        setStatus('', '');
        setSpinButton('locked');
    }

    function bindEvents() {
        $('rcwVerifyBtn')?.addEventListener('click', verifyCode);
        $('rcwSpinBtn')?.addEventListener('click', spin);
        $('rcwClearCode')?.addEventListener('click', clearCurrentCode);
        $('rcwCloseResult')?.addEventListener('click', closeResult);
        $('rcwCodeInput')?.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                verifyCode();
            }
        });
        $('rcwCodeInput')?.addEventListener('input', event => {
            event.target.value = String(event.target.value || '').toUpperCase().replace(/\s+/g, '');
            if (state.currentCode && event.target.value !== state.currentCode) {
                state.currentCode = null;
                setSpins(0);
                setSpinButton('locked');
                setStatus('', '');
            }
        });
        $('rcwResultModal')?.addEventListener('click', event => {
            if (event.target === $('rcwResultModal')) closeResult();
        });
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape' && state.resultOpen) closeResult();
        });
        window.addEventListener('resize', () => {
            if (state.canvas) requestAnimationFrame(drawWheel);
        }, { passive: true });
    }

    function initialize() {
        if (state.initialized) return true;
        state.canvas = $('rcwWheelCanvas');
        if (!state.canvas) return false;
        state.ctx = state.canvas.getContext('2d');
        if (!state.ctx) return false;

        state.initialized = true;
        bindEvents();
        renderCodeHistory();
        renderSpinHistory();
        renderPrizes();
        setSpinButton('locked');
        drawWheel();

        try {
            if (typeof window.getWheelSettingsPayload === 'function') {
                applySettings(window.getWheelSettingsPayload());
            }
        } catch (_) {}
        return true;
    }

    function activate(payload) {
        initialize();
        if (payload) applySettings(payload);
        requestAnimationFrame(drawWheel);
    }

    window.RickCheeIntegratedWheel = {
        init: initialize,
        activate,
        applySettings,
        verifyCode,
        spin
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();

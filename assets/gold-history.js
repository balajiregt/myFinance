/* 22K gold history graph.
 *
 * The VPS bot stores one raw price per day (INR per ounce) in the bot-owned
 * Supabase key `bot_gold_history`; the app only reads it. Duty, 22K and the
 * Chennai adjustment are applied here, with the same rules as gold_history.py.
 * Everything from the cloud is validated as dates and numbers and drawn with
 * DOM/SVG nodes, never as HTML.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GoldHistory = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const KEY = 'bot_gold_history', ADJ_KEY = 'mypf_gold_local_adj', CACHE_KEY = 'mypf_bot_gold_cache';
  const DUTY = [['2024-07-24', 6], ['2026-05-13', 15]]; // keep identical to gold_history.py
  const DEFAULT_ADJ = 3.6, MIN_ADJ = -10, MAX_ADJ = 25, MIN_OZ = 50000, MAX_OZ = 3000000, TROY = 31.1035;
  const RANGES = [['30d', '30 days', 30], ['3m', '3 months', 91], ['6m', '6 months', 182], ['1y', '1 year', 365]];
  const DAY = 86400000, ms = d => Date.parse(d + 'T00:00:00Z');
  const validDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(ms(d)) && new Date(ms(d)).toISOString().slice(0, 10) === d;
  const price = v => typeof v === 'number' && isFinite(v) && v >= MIN_OZ && v <= MAX_OZ;
  const parse = (s, d) => { try { return JSON.parse(s) ?? d; } catch (e) { return d; } };
  const store = () => (typeof localStorage !== 'undefined' ? localStorage : null);

  const dutyOn = d => DUTY.reduce((p, [from, v]) => (d >= from ? v : p), DUTY[0][1]);
  const rate22 = (oz, d, adj = 0) => oz / TROY * (1 + dutyOn(d) / 100) * 22 / 24 * (1 + adj / 100);
  const validAdj = p => typeof p === 'number' && isFinite(p) && p >= MIN_ADJ && p <= MAX_ADJ;
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  function clean(value) {
    const v = typeof value === 'string' ? parse(value, null) : value;
    if (!v || v.version !== 1 || typeof v.days !== 'object' || !v.days) return {};
    return Object.fromEntries(Object.entries(v.days).filter(([d, p]) => validDay(d) && price(p)));
  }
  /** Today's point is the bot's 10:00 price, so the graph ends at the rate in the Telegram headline. */
  function withQuote(days, value, now) {
    const v = typeof value === 'string' ? parse(value, null) : value, q = v?.quotes?.[now];
    return price(q) ? { ...days, [now]: q } : days;
  }
  function series(days, count, now, adj) {
    const from = new Date(ms(now) - count * DAY).toISOString().slice(0, 10);
    return Object.keys(days).filter(d => d >= from && d <= now).sort().map(d => ({ date: d, rate: rate22(days[d], d, adj) }));
  }
  /** Consecutive days only: a missing day breaks the line. */
  function segments(points) {
    const out = [];
    points.forEach((p, i) => { if (i && ms(p.date) - ms(points[i - 1].date) <= DAY) out[out.length - 1].push(p); else out.push([p]); });
    return out;
  }
  function stats(points) {
    const by = f => points.reduce((a, b) => (f(b.rate, a.rate) ? b : a));
    return { first: points[0], last: points[points.length - 1], high: by((x, y) => x > y), low: by((x, y) => x < y),
      pct: (points[points.length - 1].rate / points[0].rate - 1) * 100 };
  }
  function ticks(lo, hi) {
    const raw = Math.max(hi - lo, 1) / 5, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw);
    const out = [Math.floor(lo / step) * step];
    while (out[out.length - 1] < hi || out.length < 2) out.push(out[out.length - 1] + step);
    return out;
  }
  /** "My local 22K rate today is X" -> adjustment %, or null when it can't be right. */
  function calibrate(days, localRate, now) {
    const d = Object.keys(days).filter(x => x <= now).sort().pop();
    if (!d || ms(now) - ms(d) > 2 * DAY || !(localRate > 0)) return null;
    const pct = Math.round((localRate / rate22(days[d], d) - 1) * 1000) / 10;
    return validAdj(pct) ? pct : null;
  }
  const adj = () => { const p = parse(store()?.getItem(ADJ_KEY), {})?.pct; return validAdj(p) ? p : DEFAULT_ADJ; };
  const setAdj = pct => { if (!validAdj(pct)) return false; store().setItem(ADJ_KEY, JSON.stringify({ version: 1, pct })); return true; };
  const days = () => { const c = parse(store()?.getItem(CACHE_KEY), null); return withQuote(clean(c), c, today()); };
  async function refresh(request, userKey) {
    const rows = await request('GET', `/portfolio?user_key=eq.${encodeURIComponent(userKey)}&data_key=eq.${KEY}&select=data_key,value`);
    const raw = rows?.find(r => r.data_key === KEY)?.value, d = clean(raw), q = withQuote({}, raw, today());
    if (Object.keys(d).length) store()?.setItem(CACHE_KEY, JSON.stringify({ version: 1, days: d, quotes: q }));
    return d;
  }

  // ── view ──
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (t, a = {}, text) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (text != null) n.textContent = text; return n; };
  const el = (t, cls, text) => { const n = document.createElement(t); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const nice = (d, y) => new Date(ms(d)).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}) });
  const revalue = () => { for (const f of ['renderPhysicalGold', 'updateDonut']) if (typeof window[f] === 'function') window[f](); const v = Number(document.getElementById('sgbCurrentPrice')?.value); if (v && typeof updatePurityRates === 'function') updatePurityRates(v, ''); };
  let range = '30d', view = 'graph', message = '', focusId = null;

  function chart(points, s) {
    const width = Math.max(300, Math.min(1100, document.getElementById('goldHistoryMount').clientWidth - 44)), H = 320, L = 58, R = 18, T = 26, B = 34;
    const pad = (s.high.rate - s.low.rate) * 0.08, ty = ticks(s.low.rate - pad, s.high.rate + pad), y0 = ty[0], y1 = ty[ty.length - 1];
    const x0 = ms(s.first.date), span = Math.max(ms(s.last.date) - x0, DAY);
    const X = d => L + (ms(d) - x0) / span * (width - L - R), Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
    const wrap = el('div', 'gh-plot');
    const g = svg('svg', { viewBox: `0 0 ${width} ${H}`, width: '100%', height: H, role: 'img', tabindex: '0',
      'aria-label': `Estimated Chennai 22K gold, ${nice(s.first.date, 1)} to ${nice(s.last.date, 1)}: ${inr(s.first.rate)} to ${inr(s.last.rate)} per gram. Use arrow keys to read each day.` });
    ty.forEach(v => { g.append(svg('line', { x1: L, x2: width - R, y1: Y(v), y2: Y(v), class: 'gh-grid' }), svg('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'gh-axis' }, v.toLocaleString('en-IN'))); });
    const n = width < 520 ? 3 : 5;
    for (let i = 0; i <= n; i++) {
      const d = new Date(x0 + Math.round(span / DAY * i / n) * DAY).toISOString().slice(0, 10);
      g.append(svg('text', { x: X(d), y: H - 10, 'text-anchor': i === 0 ? 'start' : i === n ? 'end' : 'middle', class: 'gh-axis' }, nice(d)));
    }
    DUTY.forEach(([from, v], i) => {
      if (!i || from <= s.first.date || from > s.last.date) return;
      g.append(svg('line', { x1: X(from), x2: X(from), y1: T, y2: H - B, class: 'gh-event' }), svg('text', { x: X(from) + 5, y: T + 10, class: 'gh-axis' }, `Duty ${DUTY[i - 1][1]}% → ${v}%`));
    });
    segments(points).forEach(seg => {
      if (seg.length > 1) g.append(svg('path', { d: seg.map((p, i) => (i ? 'L' : 'M') + X(p.date).toFixed(1) + ' ' + Y(p.rate).toFixed(1)).join(''), class: 'gh-line' }));
      else g.append(svg('circle', { cx: X(seg[0].date), cy: Y(seg[0].rate), r: 2.5, class: 'gh-dot' }));
    });
    [[s.high, -10], [s.low, 20]].forEach(([p, dy]) => {
      const x = X(p.date), anchor = x > width - R - 50 ? 'end' : x < L + 50 ? 'start' : 'middle';
      g.append(svg('circle', { cx: x, cy: Y(p.rate), r: 4, class: 'gh-dot gh-ring' }), svg('text', { x, y: Y(p.rate) + dy, 'text-anchor': anchor, class: 'gh-label' }, inr(p.rate)));
    });
    const cross = svg('line', { y1: T, y2: H - B, class: 'gh-cross', visibility: 'hidden' }), dot = svg('circle', { r: 5, class: 'gh-dot gh-ring', visibility: 'hidden' });
    g.append(cross, dot);
    const tip = el('div', 'gh-tip'); tip.hidden = true; tip.setAttribute('role', 'status');
    const strong = el('strong'), small = el('span'); tip.append(strong, small);
    let at = points.length - 1;
    const show = i => {
      at = Math.max(0, Math.min(points.length - 1, i)); const p = points[at], x = X(p.date);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', Y(p.rate));
      [cross, dot].forEach(m => m.setAttribute('visibility', 'visible'));
      strong.textContent = inr(p.rate) + '/g'; small.textContent = nice(p.date, 1); tip.hidden = false;
      const pct = x / width * 100; tip.style.left = pct + '%'; tip.style.transform = `translateX(${pct > 75 ? '-100%' : pct < 25 ? '0' : '-50%'})`;
    };
    const hide = () => { tip.hidden = true; [cross, dot].forEach(m => m.setAttribute('visibility', 'hidden')); };
    g.addEventListener('pointermove', e => {
      const b = g.getBoundingClientRect(), t = x0 + ((e.clientX - b.left) / b.width * width - L) / (width - L - R) * span;
      show(points.reduce((best, p, i) => (Math.abs(ms(p.date) - t) < Math.abs(ms(points[best].date) - t) ? i : best), 0));
    });
    g.addEventListener('pointerleave', hide); g.addEventListener('blur', hide); g.addEventListener('focus', () => show(at));
    g.addEventListener('keydown', e => { const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (k) { e.preventDefault(); show(at + k); } });
    wrap.append(g, tip);
    return wrap;
  }
  function table(points) {
    const wrap = el('div', 'table-wrap gh-table'), t = el('table'), h = t.createTHead().insertRow(), b = t.createTBody();
    ['Date', '22K per gram', 'Change'].forEach((x, i) => { const th = el('th', i ? 'num' : '', x); th.scope = 'col'; h.append(th); });
    points.map((p, i) => [p, points[i - 1]]).reverse().forEach(([p, prev]) => {
      const r = b.insertRow(), c = prev ? (p.rate / prev.rate - 1) * 100 : null;
      r.append(el('td', '', nice(p.date, 1)), el('td', 'num', inr(p.rate)), el('td', 'num', c == null ? '—' : `${c > 0 ? '+' : ''}${c.toFixed(2)}%`));
    });
    wrap.append(t); wrap.tabIndex = 0; return wrap;
  }
  function render() {
    const mount = typeof document !== 'undefined' && document.getElementById('goldHistoryMount');
    if (!mount) return;
    const a = adj(), all = days(), points = series(all, RANGES.find(r => r[0] === range)[2], today(), a);
    const box = el('section', 'panel'), head = el('div', 'toolbar'), title = el('div');
    title.append(el('div', 'eyebrow', 'Gold 22K · estimated Chennai base rate'));
    const group = (items, current, set, name) => {
      const g = el('div', 'gh-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', name);
      items.forEach(([id, label]) => { const b = el('button', current === id ? 'primary' : '', label); b.type = 'button'; b.id = 'gh-' + id; b.setAttribute('aria-pressed', String(current === id)); b.onclick = () => { set(id); focusId = b.id; render(); }; g.append(b); });
      return g;
    };
    const controls = el('div', 'gh-controls');
    controls.append(group(RANGES, range, v => { range = v; }, 'Period'), group([['graph', 'Graph'], ['table', 'Table']], view, v => { view = v; }, 'View'));
    if (points.length < 2) {
      title.append(el('h3', '', 'No history yet'), el('p', 'muted', 'The FinFolio bot adds one price a day. This needs Cloud Backup set up in Settings.'));
      head.append(title); box.append(head);
    } else {
      const s = stats(points);
      const crossed = DUTY.some(([from], i) => i && from > s.first.date && from <= s.last.date);
      title.append(el('h2', '', inr(s.last.rate) + '/g'), el('p', 'muted', `${s.pct >= 0 ? '▲' : '▼'} ${Math.abs(s.pct).toFixed(1)}% since ${nice(s.first.date, 1)}${crossed ? ' (includes the duty change)' : ''} · High ${inr(s.high.rate)} on ${nice(s.high.date)} · Low ${inr(s.low.rate)} on ${nice(s.low.date)} · as of ${nice(s.last.date)}`));
      head.append(title); box.append(head, controls);
      if (ms(today()) - ms(s.last.date) > 2 * DAY) box.append(el('p', 'gh-warn', `⚠ No new price since ${nice(s.last.date, 1)}.`));
      box.append(view === 'graph' ? chart(points, s) : table(points));
    }
    const form = el('form', 'gh-adjust'), label = el('label', '', 'Local 22K rate now (₹/g)'), input = el('input');
    input.type = 'number'; input.id = 'gh-local'; input.min = '1'; input.step = 'any'; input.required = true; input.inputMode = 'decimal'; label.htmlFor = input.id;
    const save = el('button', '', 'Match graph'); save.type = 'submit';
    const reset = el('button', '', `Reset to ${DEFAULT_ADJ}%`); reset.type = 'button'; reset.onclick = () => { setAdj(DEFAULT_ADJ); message = ''; revalue(); render(); };
    form.onsubmit = e => {
      e.preventDefault(); const pct = calibrate(days(), Number(input.value), today());
      message = pct == null ? 'That rate is too far from today’s estimate, or there is no recent price to compare with.' : (setAdj(pct), revalue(), `Saved: ${pct > 0 ? '+' : ''}${pct}%.`); render();
    };
    const msg = el('span', 'muted', message); msg.setAttribute('role', 'status');
    form.append(label, input, save, reset, msg);
    if (points.length > 1) box.append(form);
    box.append(el('small', 'muted', `World gold price + import duty (${dutyOn(today())}% now) ${a >= 0 ? '+' : '−'} ${Math.abs(a)}% local adjustment. Before GST and making. An estimate, not a shop quote. Jewellery and coins are valued at this rate (metal value, before any buyback deduction); SGBs at the bullion price without the local adjustment.`));
    mount.className = 'ff'; mount.replaceChildren(box);
    if (focusId) { document.getElementById(focusId)?.focus(); focusId = null; }
  }
  async function open() {
    render();
    const c = typeof getSupaConfig === 'function' ? getSupaConfig() : null;
    if (!c?.url || !c?.key || !c?.userKey) return;
    try { await refresh(supaRequest, c.userKey); render(); } catch (e) { console.warn('[gold-history] refresh failed'); }
  }
  if (typeof window !== 'undefined') { let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (document.getElementById('page-gold')?.classList.contains('active') && document.activeElement?.id !== 'gh-local') render(); }, 200); }); }
  return { KEY, ADJ_KEY, CACHE_KEY, DUTY, DEFAULT_ADJ, MIN_ADJ, MAX_ADJ, MIN_OZ, MAX_OZ, dutyOn, rate22, clean, series, segments, stats, ticks, withQuote, calibrate, adj, setAdj, days, refresh, render, open };
});

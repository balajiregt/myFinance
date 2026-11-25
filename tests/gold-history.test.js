const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const G = require('../assets/gold-history'), RAW = 325330, T = '2026-11-25';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const storage = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };

test('worked example and dated duty', () => {
  assert.equal(Math.round(G.rate22(RAW, T)), 11026);
  assert.ok(Math.abs(G.rate22(RAW, T, G.DEFAULT_ADJ) - 11420) < 5); // the rate it was matched to
  assert.deepEqual(['2025-01-01', '2026-05-12', '2026-05-13', T].map(G.dutyOn), [6, 6, 15, 15]);
});
test('hostile or damaged cloud data is dropped', () => {
  const days = { [T]: RAW, '<img src=x onerror=1>': RAW, '2026-13-01': RAW, '2026-02-30': RAW, '2026-11-24': '1', '2026-11-23': NaN, '2026-11-22': 1, '2026-11-21': 9e9, __proto__x: RAW };
  assert.deepEqual(G.clean({ version: 1, days }), { [T]: RAW });
  for (const bad of [null, 'x', '{', [], {}, { version: 2, days }, { version: 1 }]) assert.deepEqual(G.clean(bad), {});
});
test('window, gaps and stats', () => {
  const d = { '2026-10-25': RAW, '2026-10-26': RAW, '2026-11-23': RAW * 1.1, '2026-11-24': RAW * 0.9, [T]: RAW };
  const s = G.series(d, 30, T, 0);
  assert.deepEqual(s.map(p => p.date), ['2026-10-26', '2026-11-23', '2026-11-24', T]);
  assert.deepEqual(G.segments(s).map(x => x.length), [1, 3]);
  assert.deepEqual(G.segments([{ date: '2026-11-20' }, { date: '2026-11-21' }, { date: '2026-11-23' }]).map(x => x.length), [2, 1]); // one missing day
  assert.deepEqual([G.stats(s).high.date, G.stats(s).low.date, Math.round(G.stats(s).pct)], ['2026-11-23', '2026-11-24', 0]);
});
test('ticks cover the range and never collapse', () => { for (const [a, b] of [[11566, 13834], [100, 100], [9000, 9001]]) { const t = G.ticks(a, b); assert.ok(t.length >= 2 && t.length < 12 && t[0] <= a && t.at(-1) >= b, String(t)); } });
test('adjustment: calibrate, limits, bad stored values', () => {
  assert.equal(G.calibrate({ [T]: RAW }, 11640, T), 5.6);
  for (const [days, rate] of [[{ [T]: RAW }, 1164], [{ [T]: RAW }, 116400], [{ [T]: RAW }, NaN], [{}, 11640], [{ '2026-11-20': RAW }, 11640]]) assert.equal(G.calibrate(days, rate, T), null);
  global.localStorage = storage();
  try {
    assert.equal(G.adj(), 3.6); assert.equal(G.setAdj(99), false); assert.equal(G.setAdj(3), true); assert.equal(G.adj(), 3);
    for (const bad of ['{"pct":"9"}', '{"pct":1e9}', 'x', 'null', '[]']) { localStorage.setItem(G.ADJ_KEY, bad); assert.equal(G.adj(), 3.6); }
  } finally { delete global.localStorage; }
});
test('refresh is one read-only GET; an empty answer keeps the last copy', async () => {
  global.localStorage = storage();
  try {
    const calls = [];
    await G.refresh(async (m, u) => { calls.push([m, u]); return [{ data_key: G.KEY, value: JSON.stringify({ version: 1, days: { [T]: RAW } }) }]; }, 'a b&c');
    assert.deepEqual(calls, [['GET', '/portfolio?user_key=eq.a%20b%26c&data_key=eq.bot_gold_history&select=data_key,value']]);
    await G.refresh(async () => [], 'x');
    assert.deepEqual(G.days(), { [T]: RAW });
  } finally { delete global.localStorage; }
});
test('adjustment syncs; bot history and cache never do', () => {
  const keys = require('node:vm').runInNewContext(html.match(/const SYNC_KEYS = (\[[\s\S]*?\]);/)[1]);
  assert.ok(keys.includes(G.ADJ_KEY) && !keys.includes(G.KEY) && !keys.includes(G.CACHE_KEY));
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML|eval\(/.test(fs.readFileSync(path.join(__dirname, '../assets/gold-history.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//, '')));
});
test('app duty default follows the schedule and a saved value wins', () => {
  const fn = html.match(/function goldDutyPct\(\) \{[\s\S]*?\n\}/)[0];
  const run = saved => new Function('localStorage', 'GoldHistory', 'FinanceCore', fn + ';return goldDutyPct();')({ getItem: () => saved }, G, { day: () => T });
  assert.deepEqual([null, '0', '12.5', 'x', '99'].map(run), [15, 0, 12.5, 15, 15]);
});
const py = path.join(__dirname, '../outputs/finfolio-vps/scripts/gold_history.py');
test('app and bot share duty, limits and default', { skip: !fs.existsSync(py) }, () => {
  const s = fs.readFileSync(py, 'utf8');
  assert.deepEqual([...s.match(/DUTY = \[(.*)\]/)[1].matchAll(/"([\d-]+)", ([\d.]+)/g)].map(m => [m[1], +m[2]]), G.DUTY);
  const [, d, lo, hi] = s.match(/DEFAULT_ADJ, MIN_ADJ, MAX_ADJ = ([\d.-]+), ([\d.-]+), ([\d.-]+)/);
  assert.deepEqual([+d, +lo, +hi], [G.DEFAULT_ADJ, G.MIN_ADJ, G.MAX_ADJ]);
  const [, a, b] = s.match(/MIN_OZ, MAX_OZ = ([\d_]+), ([\d_]+)/);
  assert.deepEqual([a, b].map(x => +x.replace(/_/g, '')), [G.MIN_OZ, G.MAX_OZ]);
});
test('graph ends at the quote of the day; odd quotes are ignored', () => {
  const d = { '2026-11-24': RAW, [T]: RAW };
  assert.equal(G.withQuote(d, { quotes: { [T]: RAW * 0.98, '2026-11-24': RAW * 2 } }, T)[T], RAW * 0.98);
  for (const q of [null, 'x', {}, { quotes: { [T]: '1' } }, { quotes: { [T]: 9e9 } }, { quotes: null }]) assert.deepEqual(G.withQuote(d, q, T), d);
});
test('jewellery uses the local rate, SGB bullion does not; GST defaults to 0', () => {
  const body = n => { const i = html.indexOf('function ' + n + '('); return html.slice(i, html.indexOf('\n}', i) + 2); };
  const rate = new Function('GoldHistory', body('jewelleryRate') + ';return jewelleryRate(22, 12000);');
  assert.equal(rate({ adj: () => 3.6 }), 11396);
  const gst = saved => new Function('localStorage', body('goldGstPct') + ';return goldGstPct();')({ getItem: () => saved });
  assert.deepEqual([null, '3', '0', 'x'].map(gst), [0, 3, 0, 0]);
  assert.ok(!html.includes('mypf_physical_gold_rates'));
  assert.ok(!/jewelleryRate|GoldHistory/.test(body('applyGoldRate')) && !/jewelleryRate|GoldHistory\.adj/.test(body('fetchSpotGoldPrice')));
});
test('a saved gold rate without a comparable time counts as stale', () => {
  const line = html.match(/const stale  = (.*);/)[1], stale = cached => new Function('cached', 'return ' + line)(cached);
  assert.deepEqual([null, { ts: '25 Nov, 09:40 pm', pricePerGram: 1 }, { v: 2, at: Date.now() - 5 * 3600e3 }, { v: 2, at: Date.now() }].map(stale), [true, true, true, false]);
});

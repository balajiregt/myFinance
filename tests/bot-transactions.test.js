const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../assets/bot-transactions'), C = require('../assets/finance-core');

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const tx = (id, date, amount, merchant, category, type = 'debit') => ({ id, date, amount, merchant, category, type });

test('bot rows from Supabase: only bot keys, de-duplicated, status kept', () => {
  const rows = [
    { data_key: 'bot_txns_2026-11', value: JSON.stringify({ txns: [tx('a', '2026-11-22', 385, 'Swiggy Ltd', 'Dining')] }) },
    { data_key: 'bot_txns_2026-10', value: { txns: [tx('a', '2026-11-22', 385, 'Swiggy Ltd', 'Dining'), tx('b', '2026-10-30', 50, 'X', 'Other')] } },
    { data_key: 'bot_txn_status', value: '{"version":1,"unparsed":2}' },
    { data_key: 'mypf_budget', value: '{"fixed":[]}' },
    { data_key: 'bot_txns_bad', value: '{"txns":[{"id":"z"}]}' },
  ];
  const { txns, status } = B.fromRows(rows);
  assert.deepEqual(txns.map(t => t.id), ['a', 'b']);
  assert.equal(status.unparsed, 2);
});

test('edits: per-transaction beats per-merchant; hidden rows disappear', () => {
  const rows = [tx('a', '2026-11-01', 10, 'Mr A SAMPLE', 'Other'), tx('b', '2026-11-02', 20, 'Mr A  Sample', 'Other'), tx('c', '2026-11-03', 30, 'Swiggy', 'Dining')];
  const out = B.applyOverrides(rows, { byId: { a: { category: 'Groceries' }, c: { hidden: true } }, byMerchant: { 'mr a sample': 'Dining' } });
  assert.deepEqual(out.map(t => [t.id, t.category, t.edited]), [['a', 'Groceries', true], ['b', 'Dining', true]]);
});

test('legacy Gmail rows stay visible; the bot wins on the same id', () => {
  const merged = B.merge([tx('old', '2026-05-01', 99, 'Old', 'Other'), tx('a', '2026-11-22', 1, 'stale', 'Other')], [tx('a', '2026-11-22', 385, 'Swiggy Ltd', 'Dining')]);
  assert.deepEqual(merged.map(t => [t.id, t.amount, t.source]), [['a', 385, undefined], ['old', 99, 'gmail-legacy']]);
});

test('setCategory / hide write the synced overrides key; all() applies them', () => {
  const s = fakeStorage({ [B.CACHE_KEY]: JSON.stringify({ txns: [tx('a', '2026-11-22', 385, 'Swiggy Ltd', 'Other'), tx('b', '2026-11-21', 82, 'Swiggy Ltd', 'Other')] }) });
  global.localStorage = s;
  try {
    B.setCategory('a', 'Groceries', null);
    assert.deepEqual(B.all().map(t => t.category), ['Groceries', 'Other']);
    B.setCategory('b', 'Dining', 'Swiggy Ltd');
    assert.deepEqual(B.all().map(t => t.category), ['Groceries', 'Dining']);
    B.hide('a');
    assert.deepEqual(B.all().map(t => t.id), ['b']);
    assert.deepEqual(JSON.parse(s.getItem('mypf_txn_overrides')).byMerchant, { 'swiggy ltd': 'Dining' });
  } finally { delete global.localStorage; }
});

test('refresh is one read-only GET for bot keys of this user, cached locally', async () => {
  const s = fakeStorage(); global.localStorage = s;
  try {
    const calls = [];
    await B.refresh(async (method, url) => { calls.push([method, url]); return [{ data_key: 'bot_txns_2026-11', value: '{"txns":[{"id":"a","date":"2026-11-22","type":"debit","amount":1}]}' }]; }, 'pass phrase');
    assert.deepEqual(calls, [['GET', '/portfolio?user_key=eq.pass%20phrase&data_key=like.bot_txn*&select=data_key,value']]);
    assert.equal(JSON.parse(s.getItem(B.CACHE_KEY)).txns[0].id, 'a');
  } finally { delete global.localStorage; }
});

test('card-bill payments, transfers and investments are not counted as expenses', () => {
  const input = { savings: C.emptySavings(), transactions: [
    tx('s', '2026-11-22', 385, 'Swiggy', 'Dining'), tx('t', '2026-11-18', 18250, 'HDFC Credit Card bill', 'Card Bill Payment', 'transfer'),
    tx('i', '2026-11-05', 5000, 'Zerodha', 'Investment'), tx('c', '2026-11-01', 90000, 'Employer', 'Salary', 'credit')] };
  assert.deepEqual(C.expenseTransactions(input, '2026-11').map(t => t.id), ['s']);
});

test('the overrides key syncs; bot keys and the local cache never do', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const keys = require('node:vm').runInNewContext(html.match(/const SYNC_KEYS = (\[[\s\S]*?\]);/)[1]);
  assert.ok(keys.includes('mypf_txn_overrides'));
  assert.ok(!keys.some(k => k.startsWith('bot_') || k === B.CACHE_KEY));
  assert.ok(!html.includes('accounts.google.com/gsi'));
});

test('app and VPS bot share one definition of "not spending"', { skip: !fs.existsSync(path.join(__dirname, '..', 'outputs/finfolio-vps/scripts/spending.py')) }, () => {
  const py = fs.readFileSync(path.join(__dirname, '..', 'outputs/finfolio-vps/scripts/spending.py'), 'utf8');
  const set = py.match(/NOT_SPENDING = \{([^}]*)\}/)[1].split(',').map(x => x.trim().replace(/"/g, '')).filter(Boolean).sort();
  assert.deepEqual(set, [...B.NOT_SPENDING].sort());
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'assets/finance-core.js'), 'utf8'), new RegExp(B.NOT_SPENDING.map(c => `'${c}'`).join(',')));
});

/* Bank transactions synced by the FinFolio VPS bot.
 *
 * The bot reads HDFC alert emails every 15 min (07:00–23:00 IST) and writes
 * bot-owned Supabase rows: `bot_txns_YYYY-MM` (one per month) and `bot_txn_status`.
 * The app never writes those keys, so neither side can overwrite the other.
 * Your edits live in `mypf_txn_overrides` (a normal synced key) and the bot's
 * Telegram digests apply the same edits. Rules mirror the VPS `spending.py`.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BotTxns = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const OVERRIDES_KEY = 'mypf_txn_overrides';
  const CACHE_KEY = 'mypf_bot_txns_cache';   // local only; not in SYNC_KEYS
  const LEGACY_KEY = 'mypf_gmail_transactions';
  const NOT_SPENDING = ['Investment', 'Mutual Fund', 'Transfer', 'Card Bill Payment', 'Savings'];
  const CATEGORIES = ['Groceries', 'Dining', 'Shopping', 'Transport', 'Fuel', 'Travel', 'Bills & Utilities', 'Rent', 'EMI',
    'Insurance', 'Healthcare', 'Education', 'Entertainment', 'Subscriptions', 'Personal Care', 'Gifts', 'Cash', 'Other',
    'Investment', 'Transfer', 'Card Bill Payment', 'Income', 'Salary', 'Refund', 'FD Interest'];

  const merchantKey = m => String(m || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isSpending = t => t.type === 'debit' && !NOT_SPENDING.includes(t.category);
  const parse = (s, d) => { try { const v = JSON.parse(s); return v ?? d; } catch (e) { return d; } };

  function emptyOverrides() { return { version: 1, byId: {}, byMerchant: {} }; }

  function applyOverrides(txns, overrides) {
    const o = overrides && typeof overrides === 'object' ? overrides : emptyOverrides();
    const byId = o.byId || {}, byMerchant = o.byMerchant || {};
    return txns.filter(t => !(byId[String(t.id)] || {}).hidden).map(t => {
      const cat = (byId[String(t.id)] || {}).category || byMerchant[merchantKey(t.merchant)] || t.category || 'Other';
      return { ...t, category: cat, edited: cat !== t.category };
    });
  }

  /** Rows from Supabase -> {txns, status}. Ignores anything that is not a bot key. */
  function fromRows(rows) {
    const txns = [], seen = new Set();
    let status = null;
    (rows || []).forEach(r => {
      const v = typeof r.value === 'string' ? parse(r.value, null) : r.value;
      if (!v) return;
      if (r.data_key === 'bot_txn_status') status = v;
      else if (/^bot_txns_\d{4}-\d{2}$/.test(r.data_key)) (v.txns || []).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); txns.push(t); } });
    });
    return { txns, status };
  }

  /** Old browser-synced Gmail rows (until May 2026) + bot rows; the bot wins on the same id. */
  function merge(legacy, bot) {
    const ids = new Set(bot.map(t => String(t.id)));
    return [...bot, ...legacy.filter(t => !ids.has(String(t.id))).map(t => ({ ...t, source: t.source || 'gmail-legacy' }))]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function storage() { return typeof localStorage !== 'undefined' ? localStorage : null; }
  function cached() { const s = storage(); return s ? parse(s.getItem(CACHE_KEY), { txns: [], status: null }) : { txns: [], status: null }; }
  function overrides() { const s = storage(); return s ? parse(s.getItem(OVERRIDES_KEY), emptyOverrides()) : emptyOverrides(); }

  function all() {
    const s = storage();
    const legacy = s ? parse(s.getItem(LEGACY_KEY), []) : [];
    return applyOverrides(merge(Array.isArray(legacy) ? legacy : [], cached().txns || []), overrides());
  }

  function status() { return cached().status; }

  /** Fetch the bot keys with the app's existing Supabase helper. One GET, read-only. */
  async function refresh(request, userKey) {
    const rows = await request('GET', `/portfolio?user_key=eq.${encodeURIComponent(userKey)}&data_key=like.bot_txn*&select=data_key,value`);
    const data = fromRows(rows);
    const s = storage();
    if (s) s.setItem(CACHE_KEY, JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }));
    return data;
  }

  function saveOverrides(o) { const s = storage(); if (s) s.setItem(OVERRIDES_KEY, JSON.stringify(o)); }

  /** Change one transaction's category; optionally remember it for every payment to that merchant. */
  function setCategory(id, category, merchant) {
    const o = overrides();
    o.byId = o.byId || {}; o.byMerchant = o.byMerchant || {};
    if (merchant) {
      o.byMerchant[merchantKey(merchant)] = category;
      if (o.byId[id]) delete o.byId[id].category;
    } else {
      o.byId[id] = { ...(o.byId[id] || {}), category };
    }
    saveOverrides(o);
  }

  function hide(id) {
    const o = overrides();
    o.byId = o.byId || {};
    o.byId[id] = { ...(o.byId[id] || {}), hidden: true };
    saveOverrides(o);
  }

  return { OVERRIDES_KEY, CACHE_KEY, NOT_SPENDING, CATEGORIES, merchantKey, isSpending, applyOverrides, fromRows, merge,
    all, status, refresh, setCategory, hide, emptyOverrides };
});

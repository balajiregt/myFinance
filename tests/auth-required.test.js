const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const code = cut('function saveAuthSession(data)', 'function showSignIn()') + cut('async function supaRequest', 'async function supaUpsertAll');
const ANON = 'anon-key', HOUR = 3600000;
function setup(session, reply) {
  const store = new Map(session ? [['mypf_supa_session', JSON.stringify(session)]] : []), calls = [];
  const ctx = vm.createContext({ console, Date, JSON, Error, setTimeout: () => 0, navigator: {}, enterApp() {}, _supaSession: null,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    getSupaAuthConfig: () => ({ url: 'https://x.invalid', key: ANON }), getSupaConfig: () => ({ url: 'https://x.invalid', key: ANON, userKey: 'u1' }),
    fetch: async (url, o) => { calls.push({ url, auth: o.headers.Authorization, body: o.body }); return reply(url, o, calls); } });
  vm.runInContext(code, ctx);
  return { ctx, store, calls, rest: () => calls.filter(c => c.url.includes('/rest/')), renewals: () => calls.filter(c => c.url.includes('refresh_token')) };
}
const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => '', headers: { get: () => 'application/json' } });
const fresh = n => ({ access_token: 'new' + n, refresh_token: 'r' + n, expires_in: 3600, user: { id: 'u1' } });
const good = (url) => (url.includes('/auth/') ? res(200, fresh(1)) : res(200, []));

test('valid login is used as it is', async () => {
  const x = setup({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() + HOUR }, good);
  await x.ctx.supaRequest('GET', '/portfolio'); assert.deepEqual(x.calls.map(c => c.auth), ['Bearer a']);
});
test('expired login renews first; many requests renew once', async () => {
  const x = setup({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() - 1 }, good);
  await Promise.all([1, 2, 3].map(() => x.ctx.supaRequest('GET', '/portfolio')));
  assert.equal(x.renewals().length, 1); assert.deepEqual([...new Set(x.rest().map(c => c.auth))], ['Bearer new1']);
});
test('no login or a dead login sends nothing to the data API, and keeps local data', async () => {
  for (const [s, reply] of [[null, good], [{ access_token: 'a', expires_at: 1 }, good], [{ access_token: 'a', refresh_token: 'r', expires_at: 1 }, u => (u.includes('/auth/') ? res(400, {}) : res(200, []))]]) {
    const x = setup(s, reply); x.store.set('mypf_v3', 'mine');
    await assert.rejects(x.ctx.supaRequest('POST', '/portfolio', [{}]), { name: 'SignInRequired' });
    assert.equal(x.rest().length, 0); assert.equal(x.store.get('mypf_v3'), 'mine');
  }
});
test('a login-service outage does not sign you out', async () => {
  for (const status of [429, 503]) {
    const x = setup({ access_token: 'a', refresh_token: 'r', expires_at: 1 }, () => res(status, {}));
    await assert.rejects(x.ctx.supaRequest('GET', '/p'), /unavailable/); assert.ok(x.store.has('mypf_supa_session')); assert.equal(x.rest().length, 0);
  }
});
test('early revocation renews once, then gives up', async () => {
  const x = setup({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() + HOUR }, (u) => (u.includes('/auth/') ? res(200, fresh(1)) : res(401, {})));
  await assert.rejects(x.ctx.supaRequest('GET', '/p'), /401/); assert.equal(x.renewals().length, 1); assert.equal(x.rest().length, 2);
});
test('another tab already renewed: its login is used instead of a spent refresh token', async () => {
  const x = setup({ access_token: 'a', refresh_token: 'r', expires_at: 1 }, good);
  x.ctx.navigator.locks = { request: async (n, f) => { x.store.set('mypf_supa_session', JSON.stringify({ access_token: 'tab2', refresh_token: 'r9', expires_at: Date.now() + HOUR })); return f(); } };
  await x.ctx.supaRequest('GET', '/p'); assert.equal(x.renewals().length, 0); assert.equal(x.rest()[0].auth, 'Bearer tab2');
});
test('the anon key is never a login, and passphrase sync is gone', () => {
  assert.ok(!/Bearer \$\{config\.key\}|: config\.key;/.test(html)); assert.ok(!html.includes('supaUserKeyInput'));
});

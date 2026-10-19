// 0.28: the Æ Games achievements service, with a fake HTTP transport and a fake clock (nothing reaches Supabase).
// Run: node --test test/achievements.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, createAchievementService, requestOf, cleanMeta, BACKOFF_MS, LIMIT_WAIT_MS, RPC_PATH } from '../lib/achievements.mjs';

const TOKEN = '0123456789abcdef'.repeat(4);
const KEY = 'sb_publishable_TestKey1234567890';
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJlLXRlc3Q';
const ENV = { AE_GAMES_GAME_ID: 'hype', AE_GAMES_SUPABASE_URL: 'https://proj-test.supabase.co', AE_GAMES_SUPABASE_KEY: KEY, AE_GAMES_ACHIEVEMENT_TOKEN: TOKEN, AE_GAMES_ACHIEVEMENT_EXPIRES_AT: '2099-01-01T00:00:00Z' };

const settle = () => new Promise((r) => setImmediate(r));
function clock() {
  let t = Date.parse('2026-10-19T10:00:00Z');
  const timers = [];
  return {
    now: () => t,
    setTimer: (fn, ms) => { const h = { fn, at: t + ms, done: false }; timers.push(h); return h; },
    clearTimer: (h) => { if (h) h.done = true; },
    next: () => timers.filter((h) => !h.done).sort((a, b) => a.at - b.at)[0] || null,
    async advance(ms) {
      t += ms;
      for (;;) {
        await settle();
        const due = timers.filter((h) => !h.done && h.at <= t).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        due.done = true;
        due.fn();
        await settle();
      }
    },
  };
}
function fake(script = []) {
  const calls = [];
  const fn = async (req) => {
    calls.push(req);
    const next = script.length ? script.shift() : { status: 200, ok: true };
    if (next instanceof Error) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
}
const make = (over = {}) => {
  const c = clock(), logs = [];
  const transport = over.transport || fake(over.script);
  const svc = createAchievementService({ config: 'config' in over ? over.config : readConfig(over.env || ENV), transport, now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, log: (x) => logs.push(x), random: () => 0, meta: { gameVersion: '0.28.0' } });
  return { c, logs, transport, svc };
};
const body = (req) => JSON.parse(req.body);

test('1. off without the launcher’s variables: nothing queued, nothing sent, nothing breaks', async () => {
  assert.equal(readConfig({}), null);
  const { c, svc, transport } = make({ config: null });
  assert.equal(svc.enabled, false);
  assert.equal(svc.unlock('first-crush'), false);
  assert.equal(svc.setProgress('gaining-traction', 10), false);
  await c.advance(60000);
  assert.equal(transport.calls.length, 0);
});

test('2. the contract is checked, and the secrets never show in a log', async () => {
  assert.equal(readConfig({ ...ENV, AE_GAMES_GAME_ID: 'other' }), null);
  assert.equal(readConfig({ ...ENV, AE_GAMES_SUPABASE_URL: 'http://proj-test.supabase.co' }), null);
  assert.equal(readConfig({ ...ENV, AE_GAMES_ACHIEVEMENT_TOKEN: TOKEN.slice(1) }), null);
  assert.equal(readConfig({ ...ENV, AE_GAMES_ACHIEVEMENT_TOKEN: 'z'.repeat(64) }), null);
  assert.equal(readConfig({ ...ENV, AE_GAMES_SUPABASE_KEY: '' }), null);
  const cfg = readConfig(ENV);
  assert.equal(cfg.endpoint, 'https://proj-test.supabase.co' + RPC_PATH);
  assert.equal(cfg.jwt, false);
  assert.equal(readConfig({ ...ENV, AE_GAMES_SUPABASE_KEY: JWT }).jwt, true);
  assert.equal(readConfig({ ...ENV, AE_GAMES_SUPABASE_URL: 'https://proj-test.supabase.co/some/path/' }).endpoint, 'https://proj-test.supabase.co' + RPC_PATH);
  const { c, svc, logs } = make({ script: [{ status: 400, code: '22023', message: 'unknown achievement' }, { status: 401 }] });
  svc.unlock('no-such-thing');
  svc.unlock('first-crush');
  await c.advance(1000);
  assert.ok(logs.length >= 2);
  for (const l of logs) { assert.ok(!l.includes(TOKEN)); assert.ok(!l.includes(KEY)); }
});

test('3. the three operations, serialized exactly', async () => {
  const { c, svc, transport } = make();
  svc.unlock('first-crush', { saveId: 'g42' });
  svc.setProgress('gaining-traction', 620);
  svc.incrementProgress('example-counter', 1);
  await c.advance(10);
  assert.equal(transport.calls.length, 3);
  const [a, b, d] = transport.calls;
  assert.equal(a.url, 'https://proj-test.supabase.co' + RPC_PATH);
  assert.equal(a.method, 'POST');
  assert.deepEqual(a.headers, { apikey: KEY, 'Content-Type': 'application/json' });
  const ba = body(a);
  assert.deepEqual(Object.keys(ba).sort(), ['p_achievement_key', 'p_client_occurred_at', 'p_event_id', 'p_metadata', 'p_operation', 'p_session_token', 'p_value']);
  assert.equal(ba.p_session_token, TOKEN);
  assert.match(ba.p_event_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(ba.p_achievement_key, 'first-crush');
  assert.equal(ba.p_operation, 'unlock');
  assert.equal(ba.p_value, null);
  assert.equal(ba.p_client_occurred_at, '2026-10-19T10:00:00.000Z');
  assert.deepEqual(ba.p_metadata, { gameVersion: '0.28.0', saveId: 'g42' });
  assert.equal(body(b).p_operation, 'set');
  assert.equal(body(b).p_value, 620);
  assert.equal(body(d).p_operation, 'increment');
  assert.equal(body(d).p_value, 1);
  const j = requestOf(readConfig({ ...ENV, AE_GAMES_SUPABASE_KEY: JWT }), { id: 'x', key: 'k', op: 'unlock', value: null, at: 'now', md: {} });
  assert.equal(j.headers.Authorization, 'Bearer ' + JWT);
  assert.ok(JSON.stringify(cleanMeta({ big: 'x'.repeat(9000), ok: 1, nested: { a: 1 } })).length < 4000);
});

test('4. after a network failure, the same event id again', async () => {
  const { c, svc, transport } = make({ script: [new Error('ECONNRESET'), { status: 200, ok: true }] });
  svc.unlock('first-crush');
  await c.advance(10);
  assert.equal(transport.calls.length, 1);
  assert.equal(svc.pending, 1);
  await c.advance(BACKOFF_MS[0] + 1000);
  assert.equal(transport.calls.length, 2);
  assert.equal(body(transport.calls[0]).p_event_id, body(transport.calls[1]).p_event_id);
  assert.equal(transport.calls[0].body, transport.calls[1].body);
  assert.equal(svc.pending, 0);
});

test('5. an « idempotent » answer: done, out of the queue', async () => {
  const { c, svc, transport } = make({ script: [{ status: 200, ok: true, idempotent: true }] });
  svc.unlock('first-crush');
  await c.advance(10);
  assert.equal(svc.pending, 0);
  await c.advance(120000);
  assert.equal(transport.calls.length, 1);
});

test('6. backoff: 2 s, 5 s… on a 5xx or the network; a minute at least on 429 or a P0001 limit', async () => {
  const { c, svc, transport } = make({ script: [{ status: 503 }, { status: 502 }, { status: 429 }, { status: 400, code: 'P0001', message: 'rate limit' }, { status: 200, ok: true }] });
  svc.setProgress('gaining-traction', 900);
  await c.advance(10);
  assert.equal(transport.calls.length, 1);
  await c.advance(BACKOFF_MS[0] - 100);
  assert.equal(transport.calls.length, 1);
  await c.advance(200);
  assert.equal(transport.calls.length, 2);
  await c.advance(BACKOFF_MS[1] - 100);
  assert.equal(transport.calls.length, 2);
  await c.advance(200);
  assert.equal(transport.calls.length, 3); // (this one answers 429)
  await c.advance(LIMIT_WAIT_MS - 100);
  assert.equal(transport.calls.length, 3);
  await c.advance(200);
  assert.equal(transport.calls.length, 4); // (P0001: a limit too)
  await c.advance(LIMIT_WAIT_MS + 100);
  assert.equal(transport.calls.length, 5);
  assert.equal(svc.pending, 0);
  assert.equal(new Set(transport.calls.map((r) => body(r).p_event_id)).size, 1);
});

test('7. 401 or 403: the ticket is over, nothing more is sent this session', async () => {
  for (const st of [401, 403]) {
    const { c, svc, transport } = make({ script: [{ status: st }] });
    svc.unlock('first-crush');
    svc.setProgress('gaining-traction', 5);
    await c.advance(10);
    assert.equal(svc.enabled, false);
    assert.equal(svc.pending, 0);
    assert.equal(svc.unlock('worldwide-trend'), false);
    await c.advance(120000);
    assert.equal(transport.calls.length, 1);
  }
});

test('8. two identical progress values waiting: sent once', async () => {
  const { c, svc, transport } = make();
  assert.equal(svc.setProgress('gaining-traction', 620), true);
  assert.equal(svc.setProgress('gaining-traction', 620), true);
  assert.equal(svc.pending, 1);
  svc.setProgress('gaining-traction', 640);
  assert.equal(svc.pending, 2);
  await c.advance(10);
  assert.deepEqual(transport.calls.map((r) => body(r).p_value), [620, 640]);
});

test('9. Supabase down: the game never waits (each call returns at once, the queue stays in memory)', async () => {
  const never = () => new Promise(() => {});
  const { c, svc } = make({ transport: never });
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 200; k++) assert.equal(svc.setProgress('gaining-traction', k + 1), true);
  const r = svc.unlock('first-crush');
  assert.equal(typeof r, 'boolean');
  assert.ok(Number(process.hrtime.bigint() - t0) / 1e6 < 200);
  await c.advance(10);
  assert.equal(svc.pending, 201);
  // and the way out never takes longer than asked
  const t1 = Date.now();
  const done = svc.flush(50);
  await c.advance(60);
  await done;
  assert.ok(Date.now() - t1 < 1000);
});

test('any other refusal of the contract (409, 422): logged without a secret, out of the queue, no loop', async () => {
  const { c, svc, transport, logs } = make({ script: [{ status: 409, code: '23505', message: 'event_id déjà utilisé' }, { status: 422 }] });
  svc.unlock('first-crush');
  svc.setProgress('gaining-traction', 5);
  await c.advance(10);
  assert.equal(svc.pending, 0);
  assert.equal(svc.enabled, true);
  await c.advance(120000);
  assert.equal(transport.calls.length, 2);
  assert.equal(logs.length, 2);
  for (const l of logs) { assert.ok(!l.includes(TOKEN)); assert.ok(!l.includes(KEY)); }
});

test('an expired ticket: off, silently', async () => {
  const { c, svc, transport } = make({ env: { ...ENV, AE_GAMES_ACHIEVEMENT_EXPIRES_AT: '2026-10-19T09:00:00Z' } });
  assert.equal(svc.unlock('first-crush'), false);
  assert.equal(svc.enabled, false);
  await c.advance(60000);
  assert.equal(transport.calls.length, 0);
});

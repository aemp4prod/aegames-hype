// 0.28: the achievements of an Æ Games Launcher session. The launcher starts Hype.exe with a temporary ticket in its
// environment (AE_GAMES_*); the game's achievements become events, queued in memory and sent one by one to the
// launcher's backend (a Supabase RPC), which keeps the progress, the unlocks and their history.
// - The ticket and the key stay in this process's memory: never in a log, a file, a save, a crash report, the
//   preferences or the game page (the page only names an achievement: « unlock this », « this many »).
// - Without them (Hype launched on its own, or a value that does not check out), the service is off and silent.
// - Nothing waits for the network: an event is queued and the call returns at once. An event keeps its id through
//   every new try, so a retry never counts twice; it leaves the queue on a valid 2xx answer (« idempotent » too).
import { randomUUID } from 'node:crypto';

export const RPC_PATH = '/rest/v1/rpc/record_hype_achievement_event';
export const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000]; // network errors, 5xx: then 60 s at most
export const LIMIT_WAIT_MS = 60000; // 429, or a P0001 limit: at least a minute
const LIMIT_TRIES = 6; // (a P0001 that keeps coming back is not a limit any more: dropped)
const HEX64 = /^[0-9a-f]{64}$/i;
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
const OPS = new Set(['unlock', 'set', 'increment']);
const META_MAX = 4000;

// The launch contract: GAME_ID exactly « hype », an https URL, a ticket of 64 hexadecimal characters, a key.
// Anything else: null (off). Never says why with the values themselves.
export function readConfig(env = process.env) {
  const token = env.AE_GAMES_ACHIEVEMENT_TOKEN;
  if (!token) return null;
  if (env.AE_GAMES_GAME_ID !== 'hype') return null;
  let u = null;
  try { u = new URL(String(env.AE_GAMES_SUPABASE_URL || '')); } catch (e) { return null; }
  if (u.protocol !== 'https:' || !u.hostname) return null;
  if (!HEX64.test(String(token))) return null;
  const key = String(env.AE_GAMES_SUPABASE_KEY || '');
  if (key.length < 16 || /\s/.test(key)) return null;
  const exp = env.AE_GAMES_ACHIEVEMENT_EXPIRES_AT ? Date.parse(env.AE_GAMES_ACHIEVEMENT_EXPIRES_AT) : NaN;
  return {
    endpoint: new URL(RPC_PATH, u.origin).toString(),
    key,
    token: String(token),
    expiresAt: Number.isFinite(exp) ? exp : null,
    jwt: /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(key), // (an older « anon » key: also as a bearer token)
  };
}

// Technical, non-sensitive, small: primitive values only, under 4 KB.
export function cleanMeta(m) {
  const out = {};
  for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  while (JSON.stringify(out).length > META_MAX) delete out[Object.keys(out).pop()];
  return out;
}

// The HTTP request of an event: what is sent, exactly.
export function requestOf(config, ev) {
  const headers = { apikey: config.key, 'Content-Type': 'application/json' };
  if (config.jwt) headers.Authorization = `Bearer ${config.key}`;
  return {
    url: config.endpoint,
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_session_token: config.token,
      p_event_id: ev.id,
      p_achievement_key: ev.key,
      p_operation: ev.op,
      p_value: ev.op === 'unlock' ? null : ev.value,
      p_client_occurred_at: ev.at,
      p_metadata: ev.md,
    }),
  };
}

// The real transport (the app's own network stack): { status, ok (a JSON array, on 2xx), code, message }.
export function httpTransport(fetchFn, timeoutMs = 15000) {
  return async (req) => {
    const res = await fetchFn(req.url, { method: req.method, headers: req.headers, body: req.body, signal: AbortSignal.timeout(timeoutMs) });
    let json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    return { status: res.status, ok: res.status >= 200 && res.status < 300 && Array.isArray(json), code: json && !Array.isArray(json) ? json.code || null : null, message: json && !Array.isArray(json) ? String(json.message || '') : '' };
  };
}

/* The service. Everything that touches time is injected (tests drive the clock). log(text) gets plain words, never a
   value of the configuration. */
export function createAchievementService({ config, transport, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, log = () => {}, random = Math.random, meta = {} } = {}) {
  let on = !!(config && transport);
  let queue = [], timer = null, wakeAt = 0, sending = null;
  const jitter = (ms) => Math.round(random() * ms);
  const expired = () => !!(config && config.expiresAt && now() >= config.expiresAt);
  function stop(why) {
    if (why) log(why);
    on = false;
    queue = [];
    if (timer) { clearTimer(timer); timer = null; }
  }
  function schedule(ms) {
    if (!on || sending || !queue.length) return;
    const at = now() + ms;
    if (timer && wakeAt <= at) return; // (woken earlier already)
    if (timer) clearTimer(timer);
    wakeAt = at;
    timer = setTimer(() => { timer = null; pump(); }, ms);
  }
  async function pump() {
    if (!on || sending || !queue.length) return;
    if (expired()) { stop('succès Æ Games : ticket expiré, envoi arrêté pour cette session'); return; }
    const ev = queue[0];
    let res = null;
    sending = (async () => { try { res = await transport(requestOf(config, ev)); } catch (e) { res = null; } })();
    await sending;
    sending = null;
    if (!on) return;
    const st = res ? res.status : 0;
    if (st >= 200 && st < 300 && res.ok !== false) { queue.shift(); schedule(0); return; } // (idempotent: also done)
    if (st === 401 || st === 403) { stop('succès Æ Games : ticket refusé (expiré ou révoqué), envoi arrêté pour cette session'); return; }
    ev.tries += 1;
    if (st === 429 || res && res.code === 'P0001') {
      if (st !== 429 && ev.tries >= LIMIT_TRIES) { log(`succès Æ Games : « ${ev.key} » refusé (limite répétée), retiré de la file`); queue.shift(); schedule(0); return; }
      schedule(LIMIT_WAIT_MS + jitter(5000));
      return;
    }
    if (st >= 400 && st < 500 && st !== 408) { log(`succès Æ Games : « ${ev.key} » refusé (${st}), retiré de la file`); queue.shift(); schedule(0); return; } // (400, 404: the contract, an unknown key; 409…: no loop either)
    // the network, a 5xx, a 2xx that is not an answer: again later, the same event
    schedule(BACKOFF_MS[Math.min(ev.tries - 1, BACKOFF_MS.length - 1)] + jitter(1000));
  }
  function add(key, op, value, metadata) {
    if (!on) return false;
    if (expired()) { stop('succès Æ Games : ticket expiré, envoi arrêté pour cette session'); return false; }
    key = String(key || '');
    if (!KEY_RE.test(key) || !OPS.has(op)) return false;
    if (op !== 'unlock') { value = Number(value); if (!Number.isFinite(value) || value < 0) return false; value = Math.round(value); }
    else value = null;
    if (op === 'increment' && !(value > 0)) return false;
    if (op !== 'increment' && queue.some((e) => e.key === key && e.op === op && e.value === value)) return true; // (the same, still waiting: once)
    queue.push({ id: randomUUID(), key, op, value, at: new Date(now()).toISOString(), md: cleanMeta(Object.assign({}, meta, metadata)), tries: 0 });
    if (queue.length > 500) queue.splice(0, queue.length - 500); // (memory only, and bounded)
    schedule(0);
    return true;
  }
  return {
    get enabled() { return on; },
    get pending() { return queue.length; },
    unlock: (key, metadata) => add(key, 'unlock', null, metadata),
    setProgress: (key, value, metadata) => add(key, 'set', value, metadata),
    incrementProgress: (key, delta, metadata) => add(key, 'increment', delta, metadata),
    // At a normal exit: a short time to send what waits (ms at most), never longer.
    async flush(ms = 2000) {
      const end = now() + ms, within = (p) => Promise.race([p, new Promise((r) => setTimer(r, Math.max(0, end - now())))]);
      while (on && queue.length && now() < end) {
        if (sending) { await within(sending); await Promise.resolve(); continue; } // (the one on its way, first)
        if (timer) { clearTimer(timer); timer = null; }
        const head = queue[0];
        await within(pump());
        if (queue[0] === head) break; // (it did not go: no hammering on the way out)
      }
    },
    stop: () => stop(null),
  };
}

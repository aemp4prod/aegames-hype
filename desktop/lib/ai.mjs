// Turns a game request (one prompt, a speed tier) into a streamed Responses API call on the player's
// ChatGPT plan, and the SDK's errors into the short codes the game knows.

// The game's « intelligence des personnages » setting → reasoning effort (models that do not take it are asked without).
export const EFFORT = { quick: 'minimal', default: 'low', complex: 'medium' };

const REAUTH = ['sign_in_required', 'invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated',
  'refresh_token_reused', 'invalid_token', 'invalid_api_key', 'invalid_id_token', 'account_mismatch', 'subscription_sharing_invalid_user', 'reauth_required'];

export function gameError(e) {
  const code = e && typeof e.code === 'string' ? e.code : '';
  if (code === 'cancelled') return { code: 'cancelled' };
  if (code === 'subscription_sharing_usage_limit_exceeded') return { code: 'usage_limit' };
  if (code === 'subscription_sharing_user_not_eligible' || code === 'subscription_sharing_v2_client_not_enabled') return { code: 'not_eligible' };
  if (code === 'sharing_not_enabled' || code === 'chatpass_v2_scope_not_authorized') return { code: 'sharing_not_enabled' };
  if (REAUTH.includes(code)) return { code: 'sign_in_required' };
  if (code === 'model_not_found' || code === 'subscription_sharing_unsupported_capability' || code === 'no_model') return { code: 'model_unavailable' };
  if (['subscription_sharing_usage_unavailable', 'subscription_sharing_user_unavailable', 'identity_verification_unavailable', 'refresh_not_ready'].includes(code)) return { code: 'usage_unavailable' };
  if (['network_error', 'connection_error', 'stream_interrupted', 'invalid_stream', 'discovery_failed'].includes(code)) return { code: 'network_error' };
  if (code === 'response_incomplete') return { code: 'empty_completion' };
  if (e && e.status === 429) return { code: 'rate_limited' };
  if (e && e.status >= 500) return { code: 'usage_unavailable' };
  return { code: 'unexpected', message: e && e.message ? String(e.message).slice(0, 200) : '' };
}

// A model that does not take the reasoning option answers 400 naming it: then it is asked again without.
const reasoningRefused = (e) => !!e && (e.status === 400 || e.code === 'subscription_sharing_unsupported_capability' || e.code === 'invalid_request')
  && typeof e.param === 'string' && e.param.startsWith('reasoning');

export class AiRunner {
  constructor(getClient, getModel) {
    this.getClient = getClient;
    this.getModel = getModel;
    this.running = new Map();
    this.noReasoning = new Set();
  }

  cancel(id) { const c = this.running.get(id); if (c) c.abort(); }

  // images: data URLs of the player's images, when the characters see them (sent at low detail: a few dozen tokens each)
  async stream({ id, prompt, tier, images }, onDelta) {
    const ctl = new AbortController();
    this.running.set(id, ctl);
    let sent = 0;
    const delta = (d) => { sent += d.length; onDelta(d); };
    try {
      const client = await this.getClient();
      const model = await this.getModel(client);
      const effort = EFFORT[tier] || EFFORT.default;
      const imgs = Array.isArray(images) ? images : [];
      const input = imgs.length ? [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...imgs.map((u) => ({ type: 'input_image', image_url: u, detail: 'low' }))] }] : prompt;
      const ask = (withEffort) => client.streamResponse({ model, input, ...(withEffort ? { reasoning: { effort } } : {}), signal: ctl.signal, onDelta: delta });
      let res;
      try { res = await ask(!this.noReasoning.has(model)); }
      catch (e) {
        if (!sent && reasoningRefused(e)) { this.noReasoning.add(model); res = await ask(false); }
        else throw e;
      }
      const text = res && typeof res.text === 'string' ? res.text : '';
      // a completed answer without any text: the model declined (its refusal is not output text)
      if (!text.trim()) return { ok: false, error: { code: 'refused' } };
      return { ok: true, text };
    } catch (e) {
      // a request with images refused before any answer: the game asks again from the description
      if (Array.isArray(images) && images.length && !sent && e && e.code !== 'cancelled' && (e.status === 400 || e.code === 'invalid_request' || /image/i.test(`${e.param || ''} ${e.message || ''}`))) return { ok: false, error: { code: 'image_rejected' } };
      return { ok: false, error: gameError(e) };
    } finally {
      this.running.delete(id);
    }
  }

  // An image (a thumbnail the player drew, finished by the model): { ok, dataUrl } or { ok: false, error }.
  // Not every ChatGPT connection may create images: 'image_unsupported' then, and the game keeps the sketch.
  async image({ id, prompt, sketch }) {
    const ctl = new AbortController();
    this.running.set(id, ctl);
    try {
      const client = await this.getClient();
      if (typeof client.generateImage !== 'function') return { ok: false, error: { code: 'image_unsupported' } };
      const model = await this.getModel(client);
      const res = await client.generateImage({ model, prompt: String(prompt || '').slice(0, 4000), image: typeof sketch === 'string' ? sketch : undefined, timeoutMs: 45000, signal: ctl.signal });
      if (!res || typeof res.b64 !== 'string' || !res.b64) return { ok: false, error: { code: 'no_image' } };
      return { ok: true, dataUrl: `data:image/${res.format === 'png' ? 'png' : 'jpeg'};base64,${res.b64}` };
    } catch (e) {
      const code = e && typeof e.code === 'string' ? e.code : '';
      if (code === 'subscription_sharing_unsupported_capability' || code === 'subscription_sharing_route_not_supported' || (e && e.status === 400 && /image|tool/i.test(`${e.param || ''} ${e.message || ''}`))) return { ok: false, error: { code: 'image_unsupported' } };
      return { ok: false, error: gameError(e) };
    } finally {
      this.running.delete(id);
    }
  }
}

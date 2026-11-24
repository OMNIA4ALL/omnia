/**
 * OMNIA 2.0 — Secure Cloudflare Workers AI Proxy
 * Deploy with Wrangler (`wrangler deploy`).
 *
 * Security design:
 * - Authenticates with Cloudflare Workers AI server-side via the native `[ai]` binding (`env.AI.run`).
 * - No API token or secret is ever sent to or stored in the browser.
 * - Enforces CORS allowlist (`env.ALLOWED_ORIGIN`, default: https://omnia4all.github.io).
 * - Validates HTTP method, payload shape, prompt length, and verified model allowlist.
 * - Returns structured JSON errors without exposing internal details or logging user prompts.
 */

const ALLOWED_MODELS = new Set([
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
]);

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_PROMPT_CHARS = 4000;
const MAX_MESSAGES = 6;

function buildCorsHeaders(request, env) {
  const allowedOrigin = (env.ALLOWED_ORIGIN || 'https://omnia4all.github.io').trim();
  const origin = request.headers.get('Origin') || '';
  const isLocalDev = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allow = (origin === allowedOrigin || allowedOrigin === '*' || isLocalDev) ? origin : allowedOrigin;

  return {
    'Access-Control-Allow-Origin': allow || allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    }
  });
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, corsHeaders);
    }

    if (!env.AI || typeof env.AI.run !== 'function') {
      return jsonResponse(
        { error: 'Workers AI binding is not configured on this Worker. Add [ai] binding = "AI" in wrangler.toml.' },
        503,
        corsHeaders
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body.' }, 400, corsHeaders);
    }

    const requestedModel = typeof payload.model === 'string' && payload.model.trim()
      ? payload.model.trim()
      : DEFAULT_MODEL;

    if (!ALLOWED_MODELS.has(requestedModel)) {
      return jsonResponse(
        { error: `Unsupported model ID. Allowed models: ${Array.from(ALLOWED_MODELS).join(', ')}` },
        400,
        corsHeaders
      );
    }

    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
    if (rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
      return jsonResponse(
        { error: `Messages array must contain between 1 and ${MAX_MESSAGES} entries.` },
        400,
        corsHeaders
      );
    }

    let totalChars = 0;
    const cleanMessages = [];
    for (const msg of rawMessages) {
      if (!msg || typeof msg.content !== 'string' || !['system', 'user', 'assistant'].includes(msg.role)) {
        return jsonResponse({ error: 'Each message must include a valid role and string content.' }, 400, corsHeaders);
      }
      totalChars += msg.content.length;
      if (totalChars > MAX_PROMPT_CHARS) {
        return jsonResponse({ error: `Request exceeds maximum length of ${MAX_PROMPT_CHARS} characters.` }, 413, corsHeaders);
      }
      cleanMessages.push({ role: msg.role, content: msg.content });
    }

    try {
      const aiResult = await env.AI.run(requestedModel, {
        messages: cleanMessages,
        max_tokens: 1024
      });

      const responseText = (aiResult?.response || '').trim();
      if (!responseText) {
        return jsonResponse({ error: 'Cloudflare Workers AI returned an empty response.' }, 502, corsHeaders);
      }

      return jsonResponse({
        model: requestedModel,
        response: responseText
      }, 200, corsHeaders);
    } catch (err) {
      const status = err?.status === 429 ? 429 : 502;
      const message = status === 429
        ? 'Cloudflare Workers AI rate limit reached. Please retry shortly.'
        : 'Cloudflare Workers AI request failed. Please try again later.';
      return jsonResponse({ error: message }, status, corsHeaders);
    }
  }
};

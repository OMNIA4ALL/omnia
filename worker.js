/**
 * OMNIA 2.0 — Personal User-Owned Cloudflare Workers AI Backend (v2)
 * Deploy this Worker to YOUR OWN Cloudflare account so your AI usage counts
 * only against your own Cloudflare Workers AI allowance.
 *
 * Endpoints:
 *   GET  /health        - Non-secret capability & binding status check
 *   POST /auth/signin   - Verifies ACCESS_PASSCODE (+ optional Turnstile), issues HMAC-SHA256 session token
 *   GET  /auth/verify   - Verifies Bearer session token server-side & returns current quota status
 *   POST /auth/signout  - Acknowledges client sign-out
 *   POST /ai/chat       - Authenticated text & vision inference via env.AI.run() with persistent KV quota
 *
 * Security:
 * - Zero API tokens or account secrets are ever returned to the browser.
 * - All authentication and daily quota enforcement happen server-side.
 * - User prompts and images are never logged.
 */

const TEXT_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
];

const VISION_MODELS = [
  '@cf/meta/llama-3.2-11b-vision-instruct',
  '@cf/meta/llama-4-scout-17b-16e-instruct'
];

const ALLOWED_MODELS = new Set([...TEXT_MODELS, ...VISION_MODELS]);
const DEFAULT_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const DEFAULT_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

const MAX_PROMPT_CHARS = 4000;
const MAX_MESSAGES = 8;
const MAX_IMAGE_BASE64_CHARS = 4_200_000; // ~3 MB image
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const textEncoder = new TextEncoder();

function buildCorsHeaders(request, env) {
  const allowedOrigin = (env.ALLOWED_ORIGIN || 'https://omnia4all.github.io').trim();
  const origin = request.headers.get('Origin') || '';
  const isLocalDev = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allow = (origin === allowedOrigin || allowedOrigin === '*' || isLocalDev) ? origin : allowedOrigin;

  return {
    'Access-Control-Allow-Origin': allow || allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders
    }
  });
}

function base64UrlEncode(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToString(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  return atob(padded);
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = textEncoder.encode(a);
  const bb = textEncoder.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function getSigningSecret(env) {
  return (env.SESSION_SECRET || env.ACCESS_PASSCODE || '').trim();
}

async function createSessionToken(userId, env) {
  const secret = getSigningSecret(env);
  if (!secret) throw new Error('Server signing secret not configured');
  const payload = {
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS
  };
  const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(secret, encodedPayload);
  return { token: `${encodedPayload}.${sig}`, expiresAt: payload.exp };
}

async function verifySessionToken(request, env) {
  const secret = getSigningSecret(env);
  if (!secret) return { valid: false, reason: 'Worker ACCESS_PASSCODE secret is not configured.' };

  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, reason: 'Missing authentication token. Please sign in.' };
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Malformed session token.' };

  const [encodedPayload, providedSig] = parts;
  const expectedSig = await hmacSign(secret, encodedPayload);
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { valid: false, reason: 'Invalid session signature.' };
  }

  try {
    const payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
    if (!payload || !payload.sub || typeof payload.exp !== 'number') {
      return { valid: false, reason: 'Invalid session payload.' };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, reason: 'Session expired. Please sign in again.' };
    }
    return { valid: true, userId: payload.sub, expiresAt: payload.exp };
  } catch {
    return { valid: false, reason: 'Corrupted session payload.' };
  }
}

async function verifyTurnstile(token, request, env) {
  const secret = (env.TURNSTILE_SECRET || '').trim();
  if (!secret) return { ok: true }; // Turnstile optional unless configured
  if (!token || typeof token !== 'string' || token.length > 2048) {
    return { ok: false, error: 'Bot verification required. Please complete the Cloudflare Turnstile check.' };
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: request.headers.get('CF-Connecting-IP') || ''
      })
    });
    if (!res.ok) return { ok: false, error: 'Turnstile verification service error.' };
    const data = await res.json();
    if (!data.success) {
      return { ok: false, error: 'Bot verification failed or expired. Please retry.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to reach Turnstile verification service.' };
  }
}

function getUtcDateKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function getDailyLimit(env) {
  const raw = Number(env.DAILY_MESSAGE_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/**
 * Persistent server-side daily quota via Cloudflare KV (QUOTA_KV).
 * Cannot be reset by closing/reopening the website or clearing browser storage.
 */
async function readQuotaStatus(userId, env) {
  const limit = getDailyLimit(env);
  const date = getUtcDateKey();
  if (!limit || !env.QUOTA_KV) {
    return {
      enforced: false,
      used: null,
      limit: limit || null,
      remaining: null,
      date,
      exhausted: false,
      source: 'cloudflare_dashboard'
    };
  }
  const key = `quota:${userId}:${date}`;
  const rawUsed = await env.QUOTA_KV.get(key);
  const used = rawUsed ? parseInt(rawUsed, 10) || 0 : 0;
  const remaining = Math.max(0, limit - used);
  return {
    enforced: true,
    used,
    limit,
    remaining,
    date,
    exhausted: used >= limit,
    source: 'worker_kv'
  };
}

async function incrementQuota(userId, env) {
  const limit = getDailyLimit(env);
  const date = getUtcDateKey();
  if (!limit || !env.QUOTA_KV) {
    return readQuotaStatus(userId, env);
  }
  const key = `quota:${userId}:${date}`;
  const rawUsed = await env.QUOTA_KV.get(key);
  const nextUsed = (rawUsed ? parseInt(rawUsed, 10) || 0 : 0) + 1;
  await env.QUOTA_KV.put(key, String(nextUsed), { expirationTtl: 172800 }); // 48h TTL
  const remaining = Math.max(0, limit - nextUsed);
  return {
    enforced: true,
    used: nextUsed,
    limit,
    remaining,
    date,
    exhausted: nextUsed >= limit,
    source: 'worker_kv'
  };
}

function base64ToUint8Array(base64Str) {
  const clean = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 1. Health & capability discovery (non-secret)
    if (request.method === 'GET' && (path === '/health' || path === '/')) {
      return jsonResponse({
        ok: true,
        service: 'omnia-personal-ai-worker',
        aiBindingReady: !!(env.AI && typeof env.AI.run === 'function'),
        authConfigured: !!getSigningSecret(env),
        turnstileEnabled: !!(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY),
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
        quotaEnforced: !!(getDailyLimit(env) > 0 && env.QUOTA_KV),
        dailyLimit: getDailyLimit(env) || null,
        textModels: TEXT_MODELS,
        visionModels: VISION_MODELS
      }, 200, corsHeaders);
    }

    // 2. Sign-In (verifies server-side ACCESS_PASSCODE + optional Turnstile)
    if (request.method === 'POST' && path === '/auth/signin') {
      const configuredPasscode = (env.ACCESS_PASSCODE || '').trim();
      if (!configuredPasscode) {
        return jsonResponse({
          error: 'Worker ACCESS_PASSCODE secret is not set yet. Run `npx wrangler secret put ACCESS_PASSCODE` in your Worker folder.'
        }, 503, corsHeaders);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body.' }, 400, corsHeaders);
      }

      const turnstileCheck = await verifyTurnstile(body.turnstileToken, request, env);
      if (!turnstileCheck.ok) {
        return jsonResponse({ error: turnstileCheck.error }, 403, corsHeaders);
      }

      const providedPasscode = typeof body.passcode === 'string' ? body.passcode.trim() : '';
      if (!providedPasscode || !timingSafeEqual(providedPasscode, configuredPasscode)) {
        return jsonResponse({ error: 'Incorrect Worker access passcode.' }, 401, corsHeaders);
      }

      // Derive a stable server-side user identifier (never trust browser-supplied IDs)
      const label = (typeof body.label === 'string' ? body.label.trim().slice(0, 32) : '') || 'owner';
      const safeUserId = label.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'owner';
      const { token, expiresAt } = await createSessionToken(safeUserId, env);
      const quota = await readQuotaStatus(safeUserId, env);

      return jsonResponse({
        authenticated: true,
        userId: safeUserId,
        sessionToken: token,
        expiresAt,
        quota
      }, 200, corsHeaders);
    }

    // 3. Verify existing session token server-side
    if (request.method === 'GET' && path === '/auth/verify') {
      const auth = await verifySessionToken(request, env);
      if (!auth.valid) {
        return jsonResponse({ authenticated: false, error: auth.reason }, 401, corsHeaders);
      }
      const quota = await readQuotaStatus(auth.userId, env);
      return jsonResponse({
        authenticated: true,
        userId: auth.userId,
        expiresAt: auth.expiresAt,
        quota
      }, 200, corsHeaders);
    }

    // 4. Sign out
    if (request.method === 'POST' && path === '/auth/signout') {
      return jsonResponse({ signedOut: true }, 200, corsHeaders);
    }

    // 5. Authenticated AI Chat & Vision Inference (/ai/chat or legacy POST /)
    if (request.method === 'POST' && (path === '/ai/chat' || path === '/')) {
      const auth = await verifySessionToken(request, env);
      if (!auth.valid) {
        return jsonResponse({ error: auth.reason || 'Authentication required.' }, 401, corsHeaders);
      }

      if (!env.AI || typeof env.AI.run !== 'function') {
        return jsonResponse({
          error: 'Workers AI binding is not configured on this Worker. Add [ai] binding = "AI" in wrangler.toml.'
        }, 503, corsHeaders);
      }

      // Check persistent server-side daily quota BEFORE running AI
      const currentQuota = await readQuotaStatus(auth.userId, env);
      if (currentQuota.enforced && currentQuota.exhausted) {
        return jsonResponse({
          error: `Daily quota finished (${currentQuota.used}/${currentQuota.limit} messages used for ${currentQuota.date} UTC). Quota resets at 00:00 UTC.`,
          quota: currentQuota
        }, 429, corsHeaders);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body.' }, 400, corsHeaders);
      }

      const hasImage = typeof payload.imageBase64 === 'string' && payload.imageBase64.trim().length > 0;
      const requestedModel = typeof payload.model === 'string' && payload.model.trim()
        ? payload.model.trim()
        : (hasImage ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL);

      if (!ALLOWED_MODELS.has(requestedModel)) {
        return jsonResponse({
          error: `Unsupported model ID "${requestedModel}".`
        }, 400, corsHeaders);
      }

      if (hasImage && !VISION_MODELS.includes(requestedModel)) {
        return jsonResponse({
          error: `Model "${requestedModel}" does not support image analysis. Select a vision model such as ${DEFAULT_VISION_MODEL}.`
        }, 400, corsHeaders);
      }

      if (hasImage && payload.imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
        return jsonResponse({
          error: 'Attached image exceeds the 3 MB size limit. Please use a smaller image.'
        }, 413, corsHeaders);
      }

      const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
      if (rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
        return jsonResponse({
          error: `Messages array must contain between 1 and ${MAX_MESSAGES} entries.`
        }, 400, corsHeaders);
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
        let aiResult;
        if (hasImage) {
          const userPrompt = cleanMessages.filter(m => m.role === 'user').map(m => m.content).join('\n') || 'Describe this image clearly.';
          const imageBytes = Array.from(base64ToUint8Array(payload.imageBase64));
          aiResult = await env.AI.run(requestedModel, {
            prompt: userPrompt,
            image: imageBytes,
            max_tokens: 1024
          });
        } else {
          aiResult = await env.AI.run(requestedModel, {
            messages: cleanMessages,
            max_tokens: 1024
          });
        }

        const responseText = (aiResult?.response || aiResult?.description || '').trim();
        if (!responseText) {
          return jsonResponse({ error: 'Cloudflare Workers AI returned an empty response.' }, 502, corsHeaders);
        }

        const updatedQuota = await incrementQuota(auth.userId, env);

        return jsonResponse({
          model: requestedModel,
          response: responseText,
          quota: updatedQuota
        }, 200, corsHeaders);
      } catch (err) {
        const status = err?.status === 429 ? 429 : 502;
        const message = status === 429
          ? 'Cloudflare Workers AI rate limit reached on your account. Please retry shortly.'
          : 'Cloudflare Workers AI request failed. Check your Worker AI binding and model availability.';
        return jsonResponse({ error: message }, status, corsHeaders);
      }
    }

    return jsonResponse({ error: 'Route not found.' }, 404, corsHeaders);
  }
};

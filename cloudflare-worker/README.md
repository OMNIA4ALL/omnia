# OMNIA 2.0 — Personal Cloudflare Workers AI Backend Setup

Each user of **OMNIA Intelligence** deploys this lightweight Worker to **their own Cloudflare account**. That way, your AI prompts, image analyses, and voice/camera/screen queries use **your own Cloudflare Workers AI allowance** — never the OMNIA site owner's account.

## 1. Deploy to Your Cloudflare Account
From inside `cloudflare-worker/`:

```bash
npx wrangler login
npx wrangler deploy
```

## 2. Set Your Personal Access Passcode (Required)
This passcode protects your Worker so strangers cannot use your Cloudflare AI quota even if they know your Worker URL:

```bash
npx wrangler secret put ACCESS_PASSCODE
```

*(Optional)* Set a separate signing key for session tokens:
```bash
npx wrangler secret put SESSION_SECRET
```

## 3. Enable Persistent Daily Quota (Recommended)
To enforce a strict daily message limit (e.g. `10` messages/day) that **cannot** be reset by closing/reopening the site or clearing browser storage:

```bash
npx wrangler kv namespace create QUOTA_KV
```
Uncomment `[[kv_namespaces]]` in `wrangler.toml`, paste the returned namespace ID, set `DAILY_MESSAGE_LIMIT = "10"`, and redeploy with `npx wrangler deploy`.

## 4. Enable Cloudflare Turnstile Bot Protection (Optional)
1. Create a free Turnstile widget at [dash.cloudflare.com](https://dash.cloudflare.com/) (add `omnia4all.github.io` as a hostname).
2. Set `TURNSTILE_SITE_KEY` in `wrangler.toml`.
3. Store the secret server-side:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```
4. Redeploy with `npx wrangler deploy`.

## 5. Connect in OMNIA Intelligence
1. Open OMNIA → **OMNIA Intelligence** (`#assistant`).
2. Follow the guided 3-step setup: paste your `https://omnia-ai-worker.<your-subdomain>.workers.dev` URL, test `/health`, and sign in with your `ACCESS_PASSCODE`.

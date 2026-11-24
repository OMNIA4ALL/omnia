# OMNIA 2.0 — Cloudflare Workers AI Proxy Setup

OMNIA is hosted as a static GitHub Pages site (`https://omnia4all.github.io/omnia`). To keep your Cloudflare credentials completely off the frontend, OMNIA Intelligence sends prompts to this small Cloudflare Worker, which invokes Cloudflare Workers AI server-side via the native `[ai]` binding (`env.AI.run`).

## 1. Prerequisites
- A free [Cloudflare account](https://dash.cloudflare.com/)
- Node.js 18+ and Wrangler CLI (`npm install -g wrangler` or `npx wrangler`)

## 2. Deploy the Worker
From inside this `cloudflare-worker/` folder:

```bash
npx wrangler login
npx wrangler deploy
```

Wrangler will output your non-secret Worker URL, for example:
```text
https://omnia-ai-worker.<your-subdomain>.workers.dev
```

*(Optional)* If you host OMNIA on a custom domain, update `ALLOWED_ORIGIN` in `wrangler.toml` before deploying.

## 3. Connect OMNIA Intelligence
1. Open OMNIA 2.0 and navigate to **OMNIA Intelligence** (`#assistant`).
2. Click **⚡ Configure Cloudflare AI**.
3. Paste your deployed Worker URL (`https://omnia-ai-worker.<your-subdomain>.workers.dev`) into the **Cloudflare Worker Endpoint URL** field.
4. Select your preferred verified model (default: `@cf/meta/llama-3.1-8b-instruct-fast`).
5. Click **⚡ Test Connection**, then **Save & Activate**.

## Security Notes
- No Cloudflare API tokens or Account IDs are ever stored in OMNIA's browser storage or repository.
- User prompts are not logged by the Worker.
- Only prompts explicitly submitted in OMNIA Intelligence are sent to the Worker.

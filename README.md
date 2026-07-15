# Story Spark

Story Spark is a full-stack prototype that turns a short idea into an original, illustrated children's storybook. A parent (or child) enters an idea, picks an age range, a story style, an illustration style, and a length; the app writes an original story with the OpenAI API, generates matching illustrations, and presents the result as a page-by-page digital picture book.

Every story and every illustration is generated live from the OpenAI API at request time. There are no hard-coded stories, sample responses, or placeholder images anywhere in this codebase.

## How it works

1. **Homepage form** (`app/page.tsx`, `components/StoryForm`) collects: idea, optional child's name, age range, story style, illustration style, and story length.
2. **`POST /api/story`** (`app/api/story/route.ts`) validates the input, moderates it, and calls the OpenAI **Responses API** with a strict JSON Schema (Structured Outputs) to generate a title, subtitle, character bible, visual direction, cover prompt, and 4 story pages. The full story — including the character bible and every illustration prompt — is saved to **Redis** (`lib/storyStore.ts`, via the standard `redis` npm package and `REDIS_URL`), keyed by a generated `storyId`, with a ~1 hour expiry. Only the title, subtitle, and page text are sent back to the browser.
3. **`POST /api/image`** (`app/api/image/route.ts`) takes a `storyId` and a target (`"cover"` or a page number), looks up the corresponding prompt **on the server**, combines it with the character bible and visual direction for consistency, and calls the OpenAI **image generation API** (`gpt-image-1.5`). The resulting image is returned to the browser as a base64 data URL. The browser never sees the underlying illustration prompt.
4. **Storybook reader** (`components/StorybookReader`) presents the cover and each page one at a time, with Previous/Next buttons, a page indicator, arrow-key navigation, swipe support on touch devices, a print stylesheet, and a per-image "Regenerate this illustration" control.

> **Why Redis, specifically?** On Vercel, `/api/story` and `/api/image` can each run in a different serverless function instance (or the same instance after a cold start), and every instance has its own process memory. An in-memory `Map` is never guaranteed to be shared between them, so a story saved by one instance can be invisible to another — which is exactly what caused `/api/image` to return `404` for a story that had just been created. Redis is a store every instance can reach over the network, which fixes this reliably. This project connects to Redis Cloud (via the Vercel Marketplace) using the standard `redis` client and a single `REDIS_URL` connection string, rather than a REST-based provider — so it works with any standard Redis-compatible service, not just one specific vendor.

## Tech stack

- Next.js 14 (App Router) + TypeScript + React
- Server-side Next.js Route Handlers (no API keys ever reach the browser)
- Official `openai` JavaScript SDK
- `redis` (the official Node Redis client) for persistent, cross-instance story storage
- `zod` for server-side request/response validation
- CSS Modules + a small global stylesheet (no CSS framework)

## 1. Install dependencies

You'll need [Node.js](https://nodejs.org) 18.18 or later.

```bash
cd story-spark
npm install
```

## 2. Get and configure an OpenAI API key

1. Create or sign in to an account at [platform.openai.com](https://platform.openai.com).
2. Go to **API keys** and create a new secret key.
3. In the project root, copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

4. Open `.env.local` and paste your key:

   ```
   OPENAI_API_KEY=sk-your-real-key-here
   ```

`.env.local` is already listed in `.gitignore` — it will never be committed.

## 3. Set up Redis (required for story storage)

Stories are saved to Redis between the `/api/story` call and the `/api/image` calls that follow it, so this is required, not optional — without it, `/api/image` will return a "storage unavailable" error.

**For local development**, any standard Redis instance works. The easiest options:

- **Redis Cloud free tier**: create a free database at [cloud.redis.io](https://cloud.redis.io/), then copy its connection string (shown under the database's **Connect** / **Quickstart** section — it looks like `redis://default:<password>@<host>:<port>`).
- **Docker, if you'd rather run it locally**: `docker run -p 6379:6379 -d redis` — then your connection string is simply `redis://localhost:6379`.

Either way, paste the connection string into `.env.local`:

```
REDIS_URL=redis://default:your-password@your-redis-host:6379
```

(For production on Vercel, you don't need to do this manually — see **Connecting Redis Cloud through the Vercel Marketplace** below, which sets this same variable for you.)

## 4. Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

To check that everything is production-ready before deploying, also run:

```bash
npm run lint        # ESLint — should report no warnings or errors
npm run typecheck   # tsc --noEmit — should report no errors
npm run build        # production build — should complete with all routes listed
npm run start        # serves the production build at http://localhost:3000
```

## 5. Create a GitHub repository

From inside the `story-spark` folder:

```bash
git init
git add .
git commit -m "Initial commit: Story Spark prototype"
```

Then, on [github.com](https://github.com/new), create a new **empty** repository (no README/license/gitignore — you already have those). GitHub will show you commands like these; run them with your own repo URL:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/story-spark.git
git push -u origin main
```

(If you'd rather use the GitHub CLI: `gh repo create story-spark --public --source=. --remote=origin --push`.)

## 6. Deploy to Vercel

**Option A — Vercel dashboard**

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repository you just pushed.
2. Vercel auto-detects Next.js — leave the default build settings (`next build`).
3. Before the first deploy, add `OPENAI_API_KEY` (see step 7 below), then connect Redis Cloud (see the Marketplace steps below) — connecting it adds the `REDIS_URL` variable for you automatically.
4. Click **Deploy**.

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel        # first deploy / preview
vercel --prod # promote to production
```

The CLI will prompt you to link the project and (on first run) to add environment variables.

### Connecting Redis Cloud through the Vercel Marketplace

This is the recommended way to set up Redis for your deployed app — it creates the database and wires up the environment variable in one step, for every environment (Production, Preview, Development).

1. Open your project in the Vercel dashboard and go to the **Storage** tab.
2. Under **Marketplace Database Providers**, find **Redis** and select **Create**.
3. Choose your region and high-availability settings, then choose a plan and select **Continue**.
4. Enter a database name (or keep the generated one) and select **Create**. Wait for the status to change from `Initializing` to `Available` (refresh if needed).
5. Back on the **Storage** tab, find your new database and select **Connect Project**.
6. Choose this project and the environments you want (Production/Preview/Development are all recommended), then select **Connect** — this is the step that actually writes `REDIS_URL` into your project's environment variables.
7. Go to your Vercel project's **Settings → Environment Variables** and confirm `REDIS_URL` is now listed (it's added automatically by the integration — you don't type it in yourself).
8. **Redeploy** your project (Deployments → ⋯ → Redeploy) so the new environment variable takes effect — Vercel doesn't retroactively apply new env vars to a build that already ran.

(If you'd rather bring your own existing Redis Cloud, Upstash, or other Redis-compatible database instead of creating one through the Marketplace, just add its connection string as `REDIS_URL` manually in **Settings → Environment Variables** — the app doesn't care which provider issued the connection string, only that it's a standard `redis://` or `rediss://` URL.)

## 7. Configure environment variables in Vercel

In your Vercel project: **Settings → Environment Variables**, confirm the following are set (Production, Preview, and Development):

| Name | Value | Set by |
|---|---|---|
| `OPENAI_API_KEY` | your real OpenAI secret key | you, manually |
| `REDIS_URL` | your Redis database's connection string | the Redis Cloud Marketplace integration (step 6) |

Optional overrides (leave unset to use the built-in defaults — the browser can never set or override these, so this is purely a server-side convenience):

| Name | Default |
|---|---|
| `OPENAI_TEXT_MODEL` | `gpt-4.1-mini` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` |

After adding or changing variables, redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new values take effect.

## Expected API costs and usage limits

Pricing changes over time — always check the current numbers at [platform.openai.com/pricing](https://platform.openai.com/docs/pricing) before relying on these. As a rough guide (mid-2026 pricing):

- **Story text** (`gpt-4.1-mini`, Responses API): a single story generation call is a small number of input/output tokens — typically well under a cent per story.
- **Illustrations** (`gpt-image-1.5`, medium quality, 1024×1024, fixed in code for predictable cost): roughly **$0.03–$0.04 per image**. A full book (1 cover + 4 pages) is about **$0.15–$0.20**, plus a little more for any regenerated illustrations.
- **Moderation** (`omni-moderation-latest`): free.
- **Redis**: this app does a handful of small read/write commands per story (one write on generation, one read + one write per illustration). A free-tier Redis Cloud database comfortably covers prototype-level traffic — check [redis.io/pricing](https://redis.io/pricing/) (or your chosen provider's pricing page) for current limits before relying on this for real production volume.

So a complete story with all illustrations costs roughly **15–25 US cents** in API usage at today's prices. This adds up quickly with real traffic, so before sharing this prototype publicly:

- Set a **hard usage limit** on your OpenAI account (Settings → Limits) so a traffic spike or abuse can't run up an unexpected bill.
- Consider adding authentication or an invite code so the app isn't wide open to anonymous internet traffic.
- Keep an eye on the in-memory rate limiting described below — it is not a substitute for account-level spending limits.

## Current prototype limitations

This is a prototype, not a production-hardened app. Known limitations:

- **In-memory rate limiting.** `lib/rateLimit.ts` still lives entirely in the Node process's memory (this wasn't in scope for the Redis migration). This means limits reset on every restart/redeploy and are **not shared** across multiple serverless instances (Vercel may run your traffic across several lambdas, each with its own memory) — a determined user could exceed the intended limits. For production, replace this with a persistent, shared limiter such as `@upstash/ratelimit`, `rate-limit-redis`, or a similar package backed by the same Redis database already used for story storage.
- **Story storage is persistent, but still short-lived by design.** `lib/storyStore.ts` now saves stories to Redis (see "Why Redis, specifically?" above), which fixed a real bug where `/api/image` returned 404 for stories saved by a different serverless instance. Stories still expire after about an hour (`EX` on the Redis key) so prototype data doesn't accumulate — there is intentionally no long-term archive or "my stories" list. The image-generation counter (`incrementImageCount`) is a read-modify-write, not an atomic Redis operation, so it's a soft, best-effort cap rather than a hard guarantee under heavy concurrent regeneration of the same story — fine at prototype scale, but a production version with meaningful concurrent load should track that counter in its own key using Redis `INCR`.
- **One Redis client per warm serverless instance.** `lib/storyStore.ts` caches a single connected client (and a single in-flight connection attempt) on `globalThis` so requests handled by the same warm Vercel function instance reuse one TCP connection instead of opening a new one each time. A cold start still creates a fresh client. This is the standard approach for `node-redis` on serverless platforms, but it does mean your Redis plan's connection limit is consumed per warm instance, not per request — worth watching if traffic scales up. The client's `reconnectStrategy` is capped at a few quick retries (rather than `node-redis`'s default of retrying forever), so if Redis is genuinely unreachable, requests fail fast with a clear "storage unavailable" error instead of hanging until Vercel's function timeout.
- **Image consistency is prompt-based, not model-guaranteed.** Character consistency across the cover and four pages relies entirely on repeating a detailed character description and visual direction in every image prompt. `gpt-image-1.5` (like all current text-to-image models) does not guarantee pixel-perfect consistency between separately generated images — expect close family resemblance, not perfect identical rendering, especially for smaller or background details.
- **No accounts, history, or saved books.** By design, this prototype has no login and no way to revisit a story after it expires from Redis (~1 hour). Add a real database table (in addition to, or instead of, the Redis cache) and auth if you want long-term persistence.
- **Basic moderation only.** The OpenAI moderation endpoint is a coarse first-pass filter on the submitted idea and name. It will not catch every edge case; review real traffic and add stricter server-side rules if this goes further than a prototype.
- **Single OpenAI provider, single region.** There's no retry/backoff strategy beyond the per-image retry button, and no fallback if OpenAI's API has an outage.

## Development quality checklist (already verified)

- `npm run lint` (ESLint via `next lint`) passes with no warnings or errors.
- `npm run typecheck` (`tsc --noEmit`) passes with no errors.
- `npm run build` completes successfully — the production build compiles, prerenders the homepage as a static page, and correctly marks `/api/story` and `/api/image` as dynamic server routes.
- `next` and `eslint-config-next` are pinned to `14.2.35`, which patches the security advisory present in earlier 14.2.x releases ([Next.js security update, Dec 2025](https://nextjs.org/blog/security-update-2025-12-11)).
- The UI intentionally uses a system font stack (see `app/globals.css`) rather than `next/font/google`, so the production build never depends on reaching an external font host — it builds the same way in any environment, including locked-down CI/sandbox networks. Swap in `next/font/google` if you'd like custom webfonts.
- No `.env.local` or API key is committed — verify with `git status` and `git log -p -- .env.local` (should show nothing tracked).
- Story storage was migrated from an in-memory `Map` to Redis (standard `redis` client + `REDIS_URL`) specifically to fix cross-instance 404s on Vercel — see "Why Redis, specifically?" above.

## Project structure

```
story-spark/
├── app/
│   ├── api/
│   │   ├── story/route.ts     # generates the structured story (Responses API)
│   │   └── image/route.ts     # generates one illustration (Images API)
│   ├── layout.tsx
│   ├── page.tsx                # client orchestrator: form → progress → reader
│   ├── page.module.css
│   └── globals.css
├── components/
│   ├── StoryForm/               # the homepage form
│   ├── OptionGroup/              # reusable accessible radio-card group
│   ├── ProgressExperience/       # 4-step generation progress UI
│   └── StorybookReader/          # cover + pages, nav, swipe, print styles
├── lib/
│   ├── openai.ts                 # server-only OpenAI client + model constants
│   ├── prompts.ts                # all prompt construction (server-side only)
│   ├── validation.ts             # zod schemas for input + model output
│   ├── moderation.ts              # moderation gate before generation
│   ├── rateLimit.ts               # in-memory rate limiter (see limitations)
│   ├── storyStore.ts              # Redis story storage via REDIS_URL (~1hr expiry)
│   ├── api.ts                     # small client-side fetch helper
│   └── types.ts                   # shared TypeScript types
├── .env.example
└── README.md
```

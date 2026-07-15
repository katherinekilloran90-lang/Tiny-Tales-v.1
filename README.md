# Story Spark

Story Spark is a full-stack prototype that turns a short idea into an original, illustrated children's storybook. A parent (or child) enters an idea, picks an age range, a story style, an illustration style, and a length; the app writes an original story with the OpenAI API, generates matching illustrations, and presents the result as a page-by-page digital picture book.

Every story and every illustration is generated live from the OpenAI API at request time. There are no hard-coded stories, sample responses, or placeholder images anywhere in this codebase.

## How it works

1. **Homepage form** (`app/page.tsx`, `components/StoryForm`) collects: idea, optional child's name, age range, story style, illustration style, and story length.
2. **`POST /api/story`** (`app/api/story/route.ts`) validates the input, moderates it, and calls the OpenAI **Responses API** with a strict JSON Schema (Structured Outputs) to generate a title, subtitle, character bible, visual direction, cover prompt, and 4 story pages. The full story — including the character bible and every illustration prompt — is kept in a server-side in-memory store, keyed by a generated `storyId`. Only the title, subtitle, and page text are sent back to the browser.
3. **`POST /api/image`** (`app/api/image/route.ts`) takes a `storyId` and a target (`"cover"` or a page number), looks up the corresponding prompt **on the server**, combines it with the character bible and visual direction for consistency, and calls the OpenAI **image generation API** (`gpt-image-1.5`). The resulting image is returned to the browser as a base64 data URL. The browser never sees the underlying illustration prompt.
4. **Storybook reader** (`components/StorybookReader`) presents the cover and each page one at a time, with Previous/Next buttons, a page indicator, arrow-key navigation, swipe support on touch devices, a print stylesheet, and a per-image "Regenerate this illustration" control.

## Tech stack

- Next.js 14 (App Router) + TypeScript + React
- Server-side Next.js Route Handlers (no API keys ever reach the browser)
- Official `openai` JavaScript SDK
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

## 3. Run locally

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

## 4. Create a GitHub repository

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

## 5. Deploy to Vercel

**Option A — Vercel dashboard**

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repository you just pushed.
2. Vercel auto-detects Next.js — leave the default build settings (`next build`).
3. Before the first deploy, add the environment variable (see step 6 below).
4. Click **Deploy**.

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel        # first deploy / preview
vercel --prod # promote to production
```

The CLI will prompt you to link the project and (on first run) to add environment variables.

## 6. Configure the environment variable in Vercel

In your Vercel project: **Settings → Environment Variables**, add:

| Name | Value | Environments |
|---|---|---|
| `OPENAI_API_KEY` | your real OpenAI secret key | Production, Preview, Development |

Optional overrides (leave unset to use the built-in defaults — the browser can never set or override these, so this is purely a server-side convenience):

| Name | Default |
|---|---|
| `OPENAI_TEXT_MODEL` | `gpt-4.1-mini` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` |

After adding variables, redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new values take effect.

## Expected API costs and usage limits

Pricing changes over time — always check the current numbers at [platform.openai.com/pricing](https://platform.openai.com/docs/pricing) before relying on these. As a rough guide (mid-2026 pricing):

- **Story text** (`gpt-4.1-mini`, Responses API): a single story generation call is a small number of input/output tokens — typically well under a cent per story.
- **Illustrations** (`gpt-image-1.5`, medium quality, 1024×1024, fixed in code for predictable cost): roughly **$0.03–$0.04 per image**. A full book (1 cover + 4 pages) is about **$0.15–$0.20**, plus a little more for any regenerated illustrations.
- **Moderation** (`omni-moderation-latest`): free.

So a complete story with all illustrations costs roughly **15–25 US cents** in API usage at today's prices. This adds up quickly with real traffic, so before sharing this prototype publicly:

- Set a **hard usage limit** on your OpenAI account (Settings → Limits) so a traffic spike or abuse can't run up an unexpected bill.
- Consider adding authentication or an invite code so the app isn't wide open to anonymous internet traffic.
- Keep an eye on the in-memory rate limiting described below — it is not a substitute for account-level spending limits.

## Current prototype limitations

This is a prototype, not a production-hardened app. Known limitations:

- **In-memory rate limiting.** `lib/rateLimit.ts` and the per-story cap in `lib/storyStore.ts` live entirely in the Node process's memory. This means limits reset on every restart/redeploy and are **not shared** across multiple serverless instances (Vercel may run your traffic across several lambdas, each with its own memory) — a determined user could exceed the intended limits. For production, replace this with a persistent, shared limiter such as [Upstash Redis](https://upstash.com/) + `@upstash/ratelimit`, or a database-backed counter.
- **Temporary story storage.** Generated stories (including character bible and illustration prompts) are kept in the same in-memory store for 30 minutes, then discarded. If the server restarts, all in-flight stories are lost, and a story that's still open in a browser tab may fail to load new illustrations if it has expired. There is no database and no persistence between server restarts — refreshing the browser after closing the tab loses the story.
- **Image consistency is prompt-based, not model-guaranteed.** Character consistency across the cover and four pages relies entirely on repeating a detailed character description and visual direction in every image prompt. `gpt-image-1.5` (like all current text-to-image models) does not guarantee pixel-perfect consistency between separately generated images — expect close family resemblance, not perfect identical rendering, especially for smaller or background details.
- **No accounts, history, or saved books.** By design, this prototype has no login and no way to revisit a story after the 30-minute window or a server restart. Add a database and auth if you want persistence.
- **Basic moderation only.** The OpenAI moderation endpoint is a coarse first-pass filter on the submitted idea and name. It will not catch every edge case; review real traffic and add stricter server-side rules if this goes further than a prototype.
- **Single OpenAI provider, single region.** There's no retry/backoff strategy beyond the per-image retry button, and no fallback if OpenAI's API has an outage.

## Development quality checklist (already verified)

- `npm run lint` (ESLint via `next lint`) passes with no warnings or errors.
- `npm run typecheck` (`tsc --noEmit`) passes with no errors.
- `npm run build` completes successfully — the production build compiles, prerenders the homepage as a static page, and correctly marks `/api/story` and `/api/image` as dynamic server routes.
- `next` and `eslint-config-next` are pinned to `14.2.35`, which patches the security advisory present in earlier 14.2.x releases ([Next.js security update, Dec 2025](https://nextjs.org/blog/security-update-2025-12-11)).
- The UI intentionally uses a system font stack (see `app/globals.css`) rather than `next/font/google`, so the production build never depends on reaching an external font host — it builds the same way in any environment, including locked-down CI/sandbox networks. Swap in `next/font/google` if you'd like custom webfonts.
- No `.env.local` or API key is committed — verify with `git status` and `git log -p -- .env.local` (should show nothing tracked).

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
│   ├── storyStore.ts              # in-memory story storage (see limitations)
│   ├── api.ts                     # small client-side fetch helper
│   └── types.ts                   # shared TypeScript types
├── .env.example
└── README.md
```

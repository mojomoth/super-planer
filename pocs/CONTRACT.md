# Super Planer PoC contract

Three Next.js 16 (App Router, TypeScript) apps in one npm workspace (`pocs/`). Dependencies are already installed at `pocs/node_modules`. **Do not run `npm install` or add dependencies** — if something is truly missing, say so in your report.

| App | Dir | Path (basePath) | Internal port | Job |
|---|---|---|---|---|
| Step1 | `pocs/step1` | `/` (none) | PORT+1 (3101) | vibe prompt → Socratic Q/A → game title + concept (ELI5) |
| Workflow view | `pocs/workflow-view` | `/workflow` | PORT+2 (3102) | n8n-style canvas, cards = agent chat sessions, URL previews |
| Plan doc | `pocs/plan-doc` | `/plan` | PORT+3 (3103) | decision docs + images → Markdown plan doc with preview |

One origin: `cd pocs && npm run dev` (or `npm run build && npm start`) runs `serve.mjs`, which starts the three Next servers on `127.0.0.1:PORT+1..3` and a reverse proxy on `0.0.0.0:PORT` (default 3100) routing `/workflow`, `/workflow/…` → workflow-view, `/plan`, `/plan/…` → plan-doc, everything else → step1. Browse http://localhost:3100 only. Optional HTTP Basic auth on every path but `/healthz`: `BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD`. The proxy answers 403 to any non-GET/HEAD request whose `Sec-Fetch-Site` is not `same-origin`/`none` (CSRF), so app routes need no CSRF checks of their own. Deployed the same way as one Render web service (README "배포 (Render)").

basePath rule: Next prefixes `basePath` only for `next/link`, `useRouter()` and `redirect()`. Raw `fetch('/api/…')`, `<img src>`, `<a href>` and metadata icons to an app's own paths go through that app's `lib/base.ts` `BASE` (workflow-view `api()` and plan-doc `api()` prefix it). Route handlers redirect with a relative `Location` (their `req.url` is the internal `127.0.0.1` port).

## Shared pieces (already written, identical in each app — do not rename)

- `lib/db.ts` — `db()` returns a `node:sqlite` `DatabaseSync` on `pocs/.data/super-planer.db` (WAL; `SUPER_PLANER_DB` overrides). `tableExists(name)`. `UPLOAD_DIR` = `uploads/` next to the DB file. Every app creates **only its own tables** (`CREATE TABLE IF NOT EXISTS`) in its own `lib/schema.ts`, and reads other apps' tables only after `tableExists`.
- `lib/llm.ts` — `completeJSON(system, user, fallback)` → `{ data, provider, error? }`. Provider: `ANTHROPIC_API_KEY` (default model `claude-opus-5-5`, `LLM_MODEL` overrides; server-side refusal fallback; one retry, 5 min timeout per attempt; a refusal or empty answer counts as a failure) → local `claude` CLI → `mock`. `LLM_PROVIDER=mock` forces the deterministic path. **Every LLM feature must have a good deterministic fallback**, so each PoC is fully usable with `LLM_PROVIDER=mock`. Show the active provider in the UI as a quiet text label (not a badge with a dot).
- OpenAI images: `OPENAI_API_KEY` (+ optional `OPENAI_IMAGE_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_BASE_URL`). plan-doc's `lib/imagegen.ts` holds the request body, model default and Korean error messages; workflow-view's `lib/imagegen.ts` copies those helpers (and `sniffImage`/`MAX_UPLOAD` from plan-doc `lib/images.ts`) — keep the copies identical, `workflow-view/lib/imagegen.test.ts` checks. Generated files go in `UPLOAD_DIR`, owned by a row in the generating app's table. No mock: without a key nothing is generated.
- `node:sqlite` only works in server code (route handlers, server components, server actions). Add `export const runtime = 'nodejs'` to route handlers that touch it.
- Shared visual system: `pocs/shared/tokens.css` + `pocs/DESIGN.md`. Each app's `app/globals.css` starts with `@import "../../shared/tokens.css";`. Logo files: `super-planer/assets/super-planer-logo.svg`, `super-planer-icon.svg` (copy into the app's `public/`).

## Tables (prefix = owner)

```sql
-- step1 (owner: step1)
step1_sessions(id TEXT PRIMARY KEY, prompt TEXT NOT NULL, status TEXT NOT NULL,  -- 'interviewing' | 'done'
               ambiguity REAL, created_at TEXT NOT NULL)
step1_turns(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, idx INTEGER NOT NULL,
            track TEXT,            -- ambiguity track, e.g. 'core_loop'
            question TEXT NOT NULL, -- ELI5 question text
            hint TEXT,              -- one-line analogy/help
            options TEXT NOT NULL,  -- JSON string[] of choices
            allow_free INTEGER NOT NULL DEFAULT 1,
            answer TEXT,            -- JSON {choices: string[], text: string} or NULL while open
            created_at TEXT NOT NULL)
step1_results(session_id TEXT PRIMARY KEY, title TEXT NOT NULL, one_liner TEXT NOT NULL,
              concept TEXT NOT NULL, -- JSON {what, analogy, details: string[], so_what, decisions: {track, decision}[]}
              created_at TEXT NOT NULL)

-- workflow-view (owner: workflow-view)
wf_workflows(id TEXT PRIMARY KEY, title TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL) -- source e.g. 'step1:<session_id>' or 'seed'
wf_cards(id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
         status TEXT NOT NULL,     -- 'active' (진행중) | 'frozen' (동결) | 'cancelled' (취소)
         decision TEXT,            -- summary written when frozen
         x REAL NOT NULL, y REAL NOT NULL, expanded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)
wf_edges(id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, source TEXT NOT NULL, target TEXT NOT NULL)
wf_messages(id TEXT PRIMARY KEY, card_id TEXT NOT NULL, role TEXT NOT NULL, -- 'user' | 'agent'
            content TEXT NOT NULL, created_at TEXT NOT NULL)
wf_link_previews(url TEXT PRIMARY KEY, kind TEXT NOT NULL, -- 'image' | 'page'
                 title TEXT, description TEXT, image TEXT, site TEXT, fetched_at TEXT NOT NULL)
wf_images(id TEXT PRIMARY KEY,     -- uuid; file UPLOAD_DIR/<id>, served at /workflow/api/images/<id>
          card_id TEXT NOT NULL, prompt TEXT NOT NULL, -- the OpenAI prompt behind one agent answer's example image
          mime TEXT NOT NULL, created_at TEXT NOT NULL)

-- plan-doc (owner: plan-doc)
plan_inputs(id TEXT PRIMARY KEY, kind TEXT NOT NULL,  -- 'decision' | 'image'
            title TEXT NOT NULL, body TEXT,            -- decision markdown/text
            url TEXT,                                  -- image URL: /plan/samples/... (seed), /plan/api/images/<id> (upload, openai; file in UPLOAD_DIR), /workflow/... (imported own image: samples or api/images), or http(s)
            source TEXT, created_at TEXT NOT NULL)      -- 'seed' | 'upload' | 'openai' | 'manual' | 'wf:<workflow_id>' | 'step1:<session_id>'
plan_docs(id TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, provider TEXT, created_at TEXT NOT NULL)
```

## Hand-offs between apps (plain links, root-relative same-origin paths)

Own-origin URLs are always written root-relative with the target app's basePath, in links and in stored data alike (chat text, `plan_inputs.url`, plan doc Markdown): `/`, `/workflow…`, `/plan…`. Both image recognizers (workflow-view `lib/urls.ts`, plan-doc `extractImageUrls`) accept them when they start a word: `/workflow/…` or `/plan/…` ending in an image extension, or `/(workflow|plan)/api/images/<id>`. Exported .md files turn root-relative URLs into absolute ones with `window.location.origin`.

- step1 result screen → "워크플로우로 열기" → `/workflow?from=step1:<session_id>`. workflow-view imports that session (one card per answered Q/A turn plus a concept card, chained by edges, cards for answered turns start `frozen` with `decision` = the answer) if `step1_*` tables exist; idempotent per source.
- workflow-view toolbar → "기획서 만들기" → `/plan?workflow=<workflow_id>`. plan-doc imports every `frozen` card's `decision` (+ the card's title) as `decision` inputs, and every image URL found in that card's messages as `image` inputs; idempotent per source.
- Each app also works standalone with seed data (a sample game) so it can be reviewed alone.
- A small shared header in each app: logo (this app's home), the three PoC names as links to `/`, `/workflow`, `/plan`, current one marked.

## Code rules (ponytail)

Follow `.claude/skills/ponytail/SKILL.md` (level: full): smallest complete change, platform features before code, no speculative abstractions/config, no new deps. Never cut: input validation at trust boundaries, SSRF guard on server-side URL fetching, error handling, accessibility. Non-trivial pure logic (question engine, URL extraction, markdown assembly) gets one small `node --test` / assert self-check file (`lib/*.test.ts` run with `node --test --experimental-strip-types`, or `.mjs`).

## UI rules (hallmark)

Follow `.claude/skills/hallmark/SKILL.md` **The Floor** and `pocs/DESIGN.md`. These are product tool UIs (not landing pages): Floor items about the hero/80-word limit apply to each app's first screen loosely; everything else applies strictly. Korean UI copy, plain and specific — no marketing voice, no emoji icons, no invented numbers. Lint before hand-back: `node ../.claude/skills/hallmark/scripts/sloplint.mjs <app>/app` (static checks; `--render` needs puppeteer which is not installed — skip it).

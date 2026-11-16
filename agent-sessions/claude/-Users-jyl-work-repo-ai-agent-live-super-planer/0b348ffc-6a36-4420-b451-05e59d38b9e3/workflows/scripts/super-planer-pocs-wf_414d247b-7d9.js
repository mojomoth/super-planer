export const meta = {
  name: 'super-planer-pocs',
  description: 'Design system → build 3 Next.js PoCs in parallel → verify/fix loops → integration → visual QA → spec audit',
  phases: [
    { title: 'Design', detail: 'hallmark: DESIGN.md + shared tokens.css' },
    { title: 'Build', detail: 'step1 / workflow-view / plan-doc in parallel (ponytail)' },
    { title: 'Verify', detail: 'independent verifier + fixer per app, up to 3 rounds' },
    { title: 'Integrate', detail: 'cross-app hand-offs step1 → workflow-view → plan-doc' },
    { title: 'Visual QA', detail: 'chrome-devtools screenshots, hallmark floor, fixes' },
    { title: 'Audit', detail: 'spec completeness critic + README/HIL checklist' },
  ],
}

const ROOT = '/Users/jyl/work/repo/ai-agent-live/super-planer'
const POCS = ROOT + '/pocs'
const REFS = '/private/tmp/claude-501/-Users-jyl-work-repo-ai-agent-live-super-planer/0b348ffc-6a36-4420-b451-05e59d38b9e3/scratchpad/refs'

const COMMON = `
Project root: ${ROOT}. PoCs live in ${POCS} (npm workspace, deps already installed — do NOT npm install / add deps).
READ FIRST: ${POCS}/CONTRACT.md (ports, shared lib/db.ts + lib/llm.ts, SQLite tables, hand-off URLs, code+UI rules).
Original product brief (Korean): ${ROOT}/docs/SUPER_PLANER_CONTEXT.md.
Code style: follow ${ROOT}/.claude/skills/ponytail/SKILL.md (full level) — smallest complete code, no speculative abstraction, but never cut validation/security/error handling/accessibility.
UI: follow ${POCS}/DESIGN.md and ${POCS}/shared/tokens.css (hallmark Floor in ${ROOT}/.claude/skills/hallmark/SKILL.md). Plain CSS (CSS modules or globals.css) using the tokens — no Tailwind, no UI kits.
All UI copy in Korean, plain and specific. No emoji icons; use inline SVG icons when needed.
This environment runs inside Claude Code: the shell env has CLAUDECODE set; lib/llm.ts already strips it for the claude CLI. Use LLM_PROVIDER=mock for all routine testing.
If you start a server, use the app's own port, run it in the background, and KILL it before you finish (lsof -ti tcp:<port> | xargs kill).
`

const SPECS = {
  step1: `
APP: ${POCS}/step1 (port 3101) — "바이브 프롬프트 → 소크라테스식 질문"
Brief: input = text prompt; output = question workflow (질문 워크플로우), game title (가제), short description. First prompt → { question → answer (choice + free text mixed) } × N → result.
Method references (read them): ouroboros socratic interviewer ${ROOT}/docs/references/ouroboros-socratic-interviewer.md and ${ROOT}/docs/references/ouroboros-interview-skill.md (more in ${REFS}/Q00_ouroboros, e.g. src/ouroboros/bigbang/interview.py, interview_calibration.py, docs/auto-interview-convergence-contract.md — skim for ambiguity scoring/tracks/closure). ELI5: ${ROOT}/docs/references/eli5-skill.md.
Required behaviour:
1. Home: one large textarea ("어떤 게임을 만들고 싶나요? 대충 적어도 돼요" style), a few example prompts to click, start button. Creates a step1_sessions row.
2. Interview engine (lib/interview.ts), ouroboros-style:
   - At start infer ambiguity TRACKS from the prompt (e.g. 핵심 재미/장르, 플레이어 역할, 코어 루프, 이기고 지는 조건, 플랫폼·한 판 길이, 분위기·아트, 누가 할 게임인지, 다른 게임과 다른 점). Keep a per-track ambiguity score 0..1 and an overall ambiguity.
   - Each turn: pick the most ambiguous track (breadth control: after 2 consecutive turns on one track, zoom out to another), ask ONE Socratic question that builds on previous answers. Rules from ouroboros: 1–2 sentences, always ends with a question, no preamble ("좋은 질문이에요" banned), target the biggest ambiguity, ontological where useful ("이 게임은 결국 무엇을 하는 게임인가요?").
   - ELI5 for ages 15–20 (Age 15 + Senior High/College styles): casual but not cringey, game/phone/social analogies, one idea per sentence, any jargon defined inline (e.g. "코어 루프(게임에서 계속 반복하는 행동)"). Each question has a one-line 'hint' analogy.
   - Answers mix selection and input: 3–5 options (single or multi select — add a 'multi' column if needed; owners may add columns) PLUS a free-text field, both usable together; plus a "잘 모르겠어요, 추천해 줘" choice.
   - Stop: overall ambiguity ≤ 0.2, or 8 questions max, or the user presses "여기까지로 정리하기". Before generating the result run ouroboros' Restate gate: show the decisions as a short summary and ask "이대로 정리할까요?" (confirm / one more question).
   - Provider: completeJSON() from lib/llm.ts with a system prompt combining the socratic + ELI5 rules, returning strict JSON {track, question, hint, options, multi, allow_free, ambiguity:{[track]:number}, done}. Deterministic fallback (mock): a question bank per track whose wording and options adapt to keywords from the prompt and previous answers, with deterministic ambiguity updates (answered track drops). The mock must feel like a real interview.
3. Q/A UX: one current question card at a time with smooth step transition; answered turns appear as a vertical "질문 워크플로우" (connected nodes: Q → A) beside/above it; ambiguity ledger visible (track list with 명확/애매 state and the overall number). Keyboard usable (Enter submits, number keys pick options is a nice-to-have).
4. Result screen in ELI5 format: 게임 이름(가제), 한 줄 설명, "이게 뭐냐면"(what, one sentence), "비유하자면"(analogy), "조금 더 자세히"(details bullets), "그래서 왜 재밌냐면"(so what), decisions list per track, and the full 질문 워크플로우. Generated by completeJSON with ELI5 rules + deterministic fallback. Stored in step1_results. Buttons: "워크플로우로 열기" → http://localhost:3102/?from=step1:<session_id>, "새로 시작".
5. Session list (recent sessions) so the human can revisit. Sessions persist across reloads (state in SQLite, URL /s/<id>).
6. Self-check: lib/interview.test.* covering mock track selection, breadth control, stop condition.
`,
  'workflow-view': `
APP: ${POCS}/workflow-view (port 3102) — "n8n 같은 워크플로우 시각화"
Brief: full-canvas n8n-like visualizer of cards + connectors. Card = '타이틀', '설명', expand/collapse button, 동결(complete)/취소(undo) buttons, status (진행중/동결/취소). Expanded card shows an agent chat session. URLs in agent answers render previews as a gallery (slide or grid).
Use @xyflow/react 12 (installed). Required behaviour:
1. Full-viewport canvas: dotted background, pan/zoom, Controls, MiniMap, fit view. Nodes draggable (positions persisted to wf_cards on drag stop), edges as smooth/bezier connectors with visible handles; user can connect two cards by dragging handle → handle (persist to wf_edges) and delete an edge. Toolbar: workflow title + selector (all wf_workflows), "카드 추가" (creates an active card near viewport center with title/description inputs), "기획서 만들기" link → http://localhost:3103/?workflow=<id> (enabled only when ≥1 frozen card), provider label.
2. Card (custom node): title, description, status text (진행중/동결/취소) styled distinctly (cancelled dimmed + struck title, frozen with a locked look), expand/collapse button, 동결 button, 취소 button. Semantics: 동결 = complete: active → frozen, writes 'decision' (summary of the chat via completeJSON, deterministic fallback = last agent message condensed), chat becomes read-only, decision shown at top. 취소 = undo: on an active card → cancelled; on a frozen or cancelled card the same button reads "되돌리기" and returns it to active. Buttons need nodrag/nopan classes so they work on the canvas.
3. Expanded card = agent chat session (larger node, e.g. ~440×560, scrollable messages with class 'nowheel'): agent messages left with agent icon/name, user messages right, timestamps, simple markdown-ish rendering (paragraphs, lists, bold, links). Input at bottom; sending stores a user message and gets an agent reply via completeJSON (the agent role: a game-planning sub-agent for that card's topic that answers with concrete suggestions and 1–4 reference URLs: images and pages). Deterministic fallback reply includes reference URLs too.
4. URL previews: extract http(s) URLs from agent messages (lib/urls.ts, with test). Under the message render a gallery with a toggle 슬라이드 / 격자: slide = horizontal scroll-snap carousel with prev/next buttons + position text; grid = 2-col grid. Image URLs (by extension or picsum.photos/images.unsplash.com hosts) render as <img> directly (lazy, with alt, fallback on error). Page URLs call GET /api/preview?url= which fetches og:title/og:description/og:image/site name server-side and caches in wf_link_previews. SSRF guard is mandatory: only http/https, resolve DNS and reject loopback/private/link-local/CGNAT/metadata IPs (v4+v6), manual redirect following (max 3) re-checking each hop, 5s timeout, cap body at ~1MB, only parse text/html. Failure → simple card with host + URL. Clicking an image opens a larger lightbox (Esc closes, focus managed).
5. Seed (when no workflows exist): one sample game workflow (Korean, e.g. a cozy roguelike) with 6–7 cards in a left→right DAG (컨셉, 코어 루프, 캐릭터, 레벨 디자인, 아트 방향, 수익 모델 …), mixed statuses, each with 2–4 seeded chat messages; agent messages include real URLs: images from https://picsum.photos/id/<n>/800/500 and local sample SVG concept images you create in public/samples/*.svg (referenced as absolute http://localhost:3102/samples/...; treat as image by extension, never server-fetched), plus page URLs like https://en.wikipedia.org/wiki/Roguelike and https://github.com/xyflow/xyflow.
6. Import: /?from=step1:<session_id> creates (idempotently, source='step1:<id>') a workflow from step1 tables if they exist: a concept card (from step1_results) then one frozen card per answered turn (title = track/question short, description = question, decision = answer, messages = the Q as agent + answer as user), chained by edges, laid out left→right in rows. Unknown id → friendly message.
7. API: route handlers under app/api (runtime nodejs). Validate inputs. Self-checks: lib/urls.test.* and an SSRF-guard test (private IPs rejected).
`,
  'plan-doc': `
APP: ${POCS}/plan-doc (port 3103) — "기획서 생성 도구"
Brief: input = vibe-generated agent decision documents + vibe-generated example images; output = a Markdown plan document shown in a Markdown Preview, with images rendered inside the Markdown.
Use react-markdown 10 + remark-gfm 4 (installed). Required behaviour:
1. Layout: left = inputs, right = document. Inputs panel: (a) 결정 문서 list with checkboxes (title + body preview), add/edit/delete a decision (title + markdown body); (b) 이미지 예시 gallery with checkboxes + caption, add by upload (png/jpg/webp/gif only — validate MIME by magic bytes, ≤5MB, NO svg uploads; stored under ${POCS}/.data/uploads and served via GET /api/images/<id>) or by https URL. Seed sample inputs when empty: 5 decision docs for a sample game (Korean, consistent with a cozy roguelike) and 4 sample concept images you create as SVG in public/samples/*.svg (character, level, UI mock, mood) — make them look like simple flat concept sketches, not placeholders.
2. "기획서 만들기" → POST /api/generate with selected decision + image ids → completeJSON with a planner system prompt producing Markdown; deterministic fallback lib/assemble.ts builds the doc from inputs. Required doc structure: # <게임 가제> 기획서, 개요 (한 줄 소개, 장르, 플랫폼, 타깃), 핵심 재미, 코어 루프 (numbered), 주요 시스템, 아트·분위기 (embed selected images as ![caption](url) with captions), 결정 로그 (GFM table: 항목 | 결정 | 출처), 열린 질문/리스크, 다음 단계. Every selected image must appear in the Markdown. Save to plan_docs.
3. Document panel: tabs 미리보기 / 마크다운 / 나란히; the markdown tab is an editable textarea with live preview; edits saved (debounced or explicit 저장). Preview styled as a readable document (good typography for headings, tables, lists, blockquotes, code, images max-width 100% with figure-like caption from alt). Buttons: .md 다운로드, 마크다운 복사. Saved docs list to reopen previous versions.
4. Imports: /?workflow=<id> imports (idempotent, source='wf:<id>') every frozen wf_cards row (title + decision → decision input) and every image URL found in that card's wf_messages (image extensions or picsum.photos) → image input, if the wf_* tables exist, then preselects them. Also a small "Step1 결과 가져오기" picker listing step1_results (if table exists) → one decision input with the ELI5 concept (source='step1:<id>').
5. Security: react-markdown default (no raw HTML). Validate API input. Self-check lib/assemble.test.* (all sections present, every image embedded, table escapes '|').
`,
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean', description: 'true only if no blocker/major issues remain' },
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      area: { type: 'string' },
      description: { type: 'string' },
      evidence: { type: 'string' },
    }, required: ['severity', 'description'] } },
    checks_run: { type: 'array', items: { type: 'string' } },
  },
  required: ['passed', 'issues', 'checks_run'],
}

// ---------- Design ----------
phase('Design')
await agent(`${COMMON}
You are the design lead. Produce the shared visual system for three Korean product-tool PoCs of "Super Planer" (게임 기획자를 위한 워크플로우 시각화 서비스): step1 (Socratic Q/A interview), workflow-view (n8n-like canvas with chat cards), plan-doc (markdown plan document editor/preview).
Use the hallmark skill as your method: read ${ROOT}/.claude/skills/hallmark/SKILL.md, references/design-md.md, references/gates.md, references/fonts.md, and pick a theme from references/themes/ (look at the .md files; you may view the .jpg previews) that suits a calm, precise planning tool. Brand constraints: primary indigo #4F46E5 (logo symbol), ink #151923, logo ${ROOT}/assets/super-planer-logo.svg / super-planer-icon.svg. Do not ask the user anything; audience = game planners/designers, use = daily work tool, tone = calm, precise, slightly playful.
Write:
1. ${POCS}/DESIGN.md (hallmark design.md format): direction, tokens table, type scale, spacing, radii, elevation, motion (durations/easings, reduced-motion), component recipes needed by all three apps: app header (logo + 3 PoC links: 질문하기 :3101 / 워크플로우 :3102 / 기획서 :3103, current marked), buttons (primary/secondary/ghost/danger), text inputs/textarea, chips/options (selectable), panel, status labels (진행중/동결/취소 without decorative dots), chat bubbles, gallery, tabs, markdown document typography. Give the exact CSS class names + minimal markup for each recipe so three independent builders produce consistent UIs.
2. ${POCS}/shared/tokens.css: the hallmark stamp + critique line first, then :root tokens (colors, fonts with system/Korean-friendly stacks — Pretendard is NOT installed; if you want a webfont, load from Google Fonts via @import in tokens.css e.g. 'IBM Plex Sans KR' or 'Noto Sans KR'), light + dark (prefers-color-scheme), plus the base element styles and the shared component classes from DESIGN.md (header, buttons, inputs, chips, status labels, tabs, panel). Respect every Floor rule (focus-visible, no transition: all, reduced-motion, overflow-x: clip on html/body, tokens only).
3. Run: node ${ROOT}/.claude/skills/hallmark/scripts/sloplint.mjs ${POCS}/shared --scope app — fix FAILs.
Return a short summary of the direction and the class names.`, { label: 'design-system', phase: 'Design' })

// ---------- Build → Verify/Fix ----------
const APPS = ['step1', 'workflow-view', 'plan-doc']

const buildPrompt = (app) => `${COMMON}
You are the builder for ONE app. ${SPECS[app]}
Do it completely: pages, route handlers, lib/schema.ts (own tables only, per CONTRACT), seed, styles (app/globals.css starting with @import "../../shared/tokens.css"; use DESIGN.md class recipes), shared header, self-check tests. Copy logo SVGs from ${ROOT}/assets into public/.
Work only inside ${POCS}/${app} (never edit other apps, shared/, CONTRACT.md or DESIGN.md — if you need a shared change, report it).
Before finishing: (1) cd ${POCS}/${app} && npx tsc --noEmit; (2) npx next build; (3) run your self-check tests; (4) start the app with LLM_PROVIDER=mock on its port, exercise the main flow end-to-end with curl (pages return 200, APIs do the right thing, DB rows written), then kill the server; (5) node ${ROOT}/.claude/skills/hallmark/scripts/sloplint.mjs ${POCS}/shared ${POCS}/${app}/app --scope app and fix FAILs.
${app === 'step1' ? 'Also make ONE real call with LLM_PROVIDER=claude-cli (e.g. a small script or a curl to your API with the server started with that env) to confirm the prompt yields parseable JSON in Korean ELI5 style; tune the prompt if not. It may take ~30s.' : ''}
Return: files created, how to use, known limits.`

const verifyPrompt = (app, round) => `${COMMON}
You are an independent, skeptical verifier (round ${round}) for ${POCS}/${app}. Do NOT edit any files. ${SPECS[app]}
Check everything with evidence:
- npx tsc --noEmit and npx next build in ${POCS}/${app} succeed.
- Self-check tests exist and pass.
- Start with LLM_PROVIDER=mock on its port (background), then drive the whole flow with curl/node fetch: every required behaviour in the spec above — e.g. full interview to result for step1; card CRUD, status transitions (동결/취소/되돌리기), chat send, preview API incl. SSRF rejection of http://127.0.0.1, http://169.254.169.254, http://[::1] for workflow-view; inputs, upload validation (reject svg/oversize), generate, every selected image embedded, save/reopen for plan-doc. Inspect the SQLite rows (node -e with node:sqlite on ${POCS}/.data/super-planer.db) and confirm they match CONTRACT.md columns.
- Read the UI code: does it actually implement every UI requirement (e.g. expand shows chat, gallery slide/grid toggle, Q/A shows mixed choice+free text, markdown preview shows images, tabs, Restate gate)? Missing or stubbed = major.
- Security/robustness at trust boundaries; crashes on bad input = major.
- sloplint: node ${ROOT}/.claude/skills/hallmark/scripts/sloplint.mjs ${POCS}/shared ${POCS}/${app}/app --scope app — any FAIL = minor (major if many).
Kill the server when done. Be concrete: each issue with file:line or the failing command output. passed=true only when no blocker/major issues.`

const fixPrompt = (app, issues) => `${COMMON}
You are fixing ${POCS}/${app} after an independent verification. ${SPECS[app]}
Fix every blocker and major issue, and minor ones when cheap. Work only inside ${POCS}/${app}. Issues:
${JSON.stringify(issues, null, 2)}
After fixing, re-run tsc, next build, the self-checks and the relevant curl flows (LLM_PROVIDER=mock, kill the server after). Return what you changed.`

const results = await pipeline(
  APPS,
  (app) => agent(buildPrompt(app), { label: `build:${app}`, phase: 'Build' }),
  async (_built, app) => {
    let v = null
    for (let round = 1; round <= 3; round++) {
      v = await agent(verifyPrompt(app, round), { label: `verify:${app}:r${round}`, phase: 'Verify', schema: VERIFY_SCHEMA })
      if (!v) break
      const serious = v.issues.filter((i) => i.severity !== 'minor')
      log(`${app} round ${round}: ${serious.length} blocker/major, ${v.issues.length - serious.length} minor`)
      if (v.passed && serious.length === 0) {
        if (v.issues.length) await agent(fixPrompt(app, v.issues), { label: `polish:${app}`, phase: 'Verify' })
        break
      }
      if (round === 3) { log(`${app}: still has issues after 3 rounds`); break }
      await agent(fixPrompt(app, v.issues), { label: `fix:${app}:r${round}`, phase: 'Verify' })
    }
    return { app, verdict: v }
  },
)

// ---------- Integrate (needs all three apps) ----------
phase('Integrate')
const integration = await agent(`${COMMON}
You own cross-app integration. All three apps are built. Test the full hand-off chain with LLM_PROVIDER=mock, starting all three servers (cd ${POCS}; start each with LLM_PROVIDER=mock npm run dev -w <app> in background on 3101/3102/3103):
1. step1: create a session via its API, answer questions until done, confirm through the Restate gate, generate the result.
2. Open http://localhost:3102/?from=step1:<id> — confirm a workflow is created from that session (cards, frozen answered turns with decision, edges), idempotent on reload.
3. In that workflow, send a chat message on an active card, freeze a card, then open http://localhost:3103/?workflow=<id> — confirm decisions + image URLs are imported (idempotent) and a generated doc contains them and embeds the images.
4. Check the shared header links on all three apps and that every hand-off link/button points at the right URL.
5. Also check the fresh-DB path: move ${POCS}/.data aside (rename to .data.bak-int), start apps, confirm each app seeds itself and works standalone, then restore the original .data.
Fix any integration bug in whichever app owns it (smallest change; keep CONTRACT.md the source of truth, update it only if the contract was ambiguous). Re-run tsc for apps you edit. Kill all servers when done.
Return: chain result per step (pass/fail + evidence) and changes made.`, { label: 'integration', phase: 'Integrate' })

// ---------- Visual QA ----------
phase('Visual QA')
const visual = await agent(`${COMMON}
You are the visual QA + hallmark slop-removal pass. Start all three apps (LLM_PROVIDER=mock, ports 3101/3102/3103, background). Use the chrome-devtools MCP tools (load them via ToolSearch, e.g. "select:mcp__chrome-devtools__new_page,mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__take_screenshot,mcp__chrome-devtools__take_snapshot,mcp__chrome-devtools__click,mcp__chrome-devtools__fill,mcp__chrome-devtools__resize_page,mcp__chrome-devtools__list_console_messages,mcp__chrome-devtools__press_key,mcp__chrome-devtools__type_text") to open each app at 1440×900 and 390×844, walk the main flows (step1: prompt → 2-3 answers → stop → restate → result; workflow-view: expand a card, see chat + gallery in both slide and grid modes, freeze/undo; plan-doc: generate a doc, see images in preview, switch tabs), take screenshots, and check console errors.
Judge against ${POCS}/DESIGN.md and the hallmark Floor + review-finish (${ROOT}/.claude/skills/hallmark/references/review-finish.md): consistency across the three apps, hierarchy, spacing rhythm, contrast, focus states, overflow at mobile width, no generic AI-slop patterns (gradient blobs, card-in-card, eyebrow labels, emoji icons, dot status, invented metrics, filler copy). Fix what you find directly in the app code (smallest changes, tokens only). Re-screenshot after fixes to confirm. Run sloplint for each app at the end. Close pages and kill servers when done.
Return: per app what you fixed and anything left.`, { label: 'visual-qa', phase: 'Visual QA' })

// ---------- Audit ----------
phase('Audit')
const audit = await agent(`${COMMON}
You are the completeness critic. Compare the implementation in ${POCS} line-by-line against EVERY bullet of the brief in ${ROOT}/docs/SUPER_PLANER_CONTEXT.md (PoC section 1, 2, 3 and the top-level bullets) and CONTRACT.md. For each bullet: implemented? where (file:line)? how a human verifies it in the browser. Run tsc + self-check tests for all three apps one final time (no servers needed unless to confirm a doubt; kill any you start).
If you find a gap that is small, fix it. Then write ${POCS}/README.md (Korean): what each PoC is, how to run (npm run dev in pocs → URLs; LLM provider options: ANTHROPIC_API_KEY / local claude CLI / LLM_PROVIDER=mock; DB location; reset by deleting pocs/.data), and a HIL checklist per PoC (checkbox list of concrete things the human should try and what they should see), plus known limits.
Return JSON-ish text: per-bullet status table, gaps fixed, gaps remaining.`, { label: 'spec-audit', phase: 'Audit' })

return { results, integration, visual, audit }

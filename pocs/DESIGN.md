# Design: Super Planer PoCs

The locked system for `step1` (`/`), `workflow-view` (`/workflow`) and `plan-doc` (`/plan`), served from one origin. Every screen reads this first and the three apps share it. Change it on purpose; the file is the rule. Source of truth for values: `pocs/shared/tokens.css` (each app's `app/globals.css` starts with `@import "../../shared/tokens.css";`, which also loads the fonts and every shared class below). Write app-specific CSS only for what this file does not cover, and only with tokens.

## System

- Genre: modern-minimal. Shape: app screen (tools people work in, not landing pages). Lint with `--scope app`.
- Theme: Cobalt, re-tuned to the brand: cool near-white paper, blue-grey hairlines, one indigo signal (`#4F46E5`, the logo fill), keycap buttons with a real bottom edge, panels cut on two opposite corners.
- Direction: calm, precise, a little playful. Calm = one accent, hairlines instead of boxes, nothing moves unless the state changed. Precise = tabular figures, fixed control heights, every state named. Playful = keys that sink when pressed, a frozen card that visibly locks.
- Axes: light/grotesk-sans/cool, posture restrained, modes light + dark (`prefers-color-scheme`).
- Signature: the workflow card that is a chat session and gets frozen into a decision. Step1 and plan-doc feed it and read from it, so they reuse its pieces (chat, status, gallery).

## Tokens

| Role | Token | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| Page | `--color-paper` | oklch(98.7% 0.004 272) | oklch(16.5% 0.014 272) | body, header |
| Sunken | `--color-paper-2` | 96.4% | 13.5% | workflow canvas, side rails |
| Well | `--color-paper-3` | 93.6% | 25% | hover fill, inline code, image wells, seg tray |
| Raised | `--color-surface` | 99.4% | 20.5% | panels, cards, inputs |
| Text | `--color-ink` / `--color-ink-2` / `--color-muted` | 21.4% (`#151923`) / 38% / 50% | 94% / 82% / 71% | body / secondary / meta, placeholders, field edges |
| Lines | `--color-rule` / `--color-rule-2` | 90.5% / 84% | 30% / 39% | hairlines / key and chip borders |
| Accent | `--color-accent` (+ `-hover`, `-edge`) | oklch(51.1% 0.23 277) = `#4F46E5` | oklch(70% 0.15 277) | primary fill, focus, selection, current tab |
| Accent text | `--color-accent-text` on `--color-accent-wash` | 46% on 95.4% | 80% on 28% | links, selected chip, current nav, user bubble wash |
| On accent | `--color-accent-ink` | 98.8% | 16% | text on the primary fill |
| States | `--color-frozen` (+`-wash`), `--color-error` (+`-wash`) | teal 46% h222, red 51% h27 | 78%, 72% | 동결, errors |
| Canvas | `--color-canvas-dot`, `--color-edge`, `--color-edge-active` | | | dot grid, connectors (3:1 on paper-2) |
| Code | `--color-graphite`, `--color-graphite-ink`, `--color-graphite-accent` | | | `<pre>` blocks only |

All text pairs above are checked at 4.5:1 or better in both modes; focus ring and connectors at 3:1. Never write a colour or `font-family` literal outside `tokens.css`.

**Fonts.** `--font-body` = `--font-display` = IBM Plex Sans KR (400/500/600/700, Google Fonts, falls back to Apple SD Gothic Neo / Malgun Gothic). `--font-mono` = JetBrains Mono, only for code, URLs and machine values, never for labels. One family carries the UI; hierarchy comes from size and weight. Korean wrapping is `word-break: keep-all` on body.

**Type scale** (ratio 1.2, fixed, no fluid heads): `--text-xs` 12px (who-labels, URLs) · `--text-sm` 14px (controls, labels, meta, chat) · `--text-md` 16px (body, inputs) · `--text-lg` 19px (h3, card title when expanded) · `--text-xl` 23px (h2, current question) · `--text-2xl` 28px (h1 page title) · `--text-3xl` 33px (game title, document h1). Heads 600, line-height 1.3, tracking -0.012em; body 1.6; long-form doc 1.75.

**Spacing** `--space-3xs` 2 · `-2xs` 4 · `-xs` 8 · `-sm` 12 · `-md` 16 · `-lg` 24 · `-xl` 40 · `-2xl` 64 · `-3xl` 96. Every padding, margin and gap is a token. Gutter `--gutter` 24px (16px under 40rem), container 1440px, header 56px.

**Radii** one per nesting level: `--radius-card` 12px (panel, workflow card; cut corners `--cut-l` where `corner-shape` is supported) · `--radius-inner` 8px (bubble, image, notice) · `--radius-input` 6px (buttons, inputs, chips) · `--radius-mark` 4px (inline code, seg buttons). No pills.

**Elevation.** Paper steps and hairlines first. `--shadow-card` (1px) on panels, `--shadow-raised` only on a dragged or selected workflow card and popovers, `--shadow-key` (2px hard edge) on keys. Dark mode drops soft shadows: elevation is lightness plus a ring.

## Motion

- Character: calm. Motion only reports a state change. Durations `--dur-micro` 120ms (press, hover, colour), `--dur-short` 220ms (tab underline, card expand content fade), `--dur-long` 420ms (a connector drawing in once). Easing `--ease-out`; no bounce, no parallax, no reveal on load.
- Animate only `transform` and `opacity` (never `width`/`height`/`top`/`left`, never `transition: all`). Card expand: switch layout instantly, fade the body in with opacity.
- `prefers-reduced-motion: reduce` collapses every duration (handled in `tokens.css`); keys stop sinking and the skeleton stops pulsing.

## Copy

Korean, plain and specific: the verb and its object (`동결`, `되돌리기`, `기획서 만들기`, `다음 질문`). No emoji, no marketing voice, no invented numbers. No `A · B · C` meta strings (use line breaks or separate elements), no arrows glued to labels (`열기 →`), no uppercase or letter-spaced labels, no small line above a heading announcing it. Provider shows as quiet text in the header aside: `LLM: mock`.

## Components (classes live in `tokens.css`)

Icons are inline SVG, 24 viewBox, `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`. One set, these paths:

| Icon | Paths |
| --- | --- |
| 진행중 (clock) | `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>` |
| 동결 (lock) | `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>` |
| 취소 (slash) | `<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>` |
| 되돌리기 (undo) | `<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>` |
| check | `<path d="m5 12 5 5 9-10"/>` |
| expand / collapse | `<path d="m6 9 6 6 6-6"/>` / `<path d="m6 15 6-6 6 6"/>` |
| prev / next | `<path d="m15 6-6 6 6 6"/>` / `<path d="m9 6 6 6-6 6"/>` |
| agent | `<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M9 11v2M15 11v2"/>` |
| link | `<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>` |
| alert | `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>` |

### App shell and header

Copy `assets/super-planer-icon.svg` into `public/`. The wordmark is live text so it works in dark mode. Mark the current app with `aria-current="page"`.

```html
<body><div class="app-shell">
  <header class="app-header">
    <a class="app-brand" href="/"><img src="/super-planer-icon.svg" alt="" width="28" height="28"><span class="app-brand__name">Super Planer</span></a>  <!-- this app's home: BASE, BASE + icon -->
    <nav class="app-nav" aria-label="PoC 이동"><ul>
      <li><a href="/" aria-current="page">질문하기</a></li>
      <li><a href="/workflow">워크플로우</a></li>
      <li><a href="/plan">기획서</a></li>
    </ul></nav>
    <p class="app-header__aside">LLM: mock</p>
  </header>
  <main class="app-main">            <!-- workflow-view: class="app-main app-main--full" -->
    <div class="page-head"><div class="page-head__text"><h1>…</h1><p class="page-head__desc">…</p></div><div class="btn-row">…</div></div>
    …
  </main>
</div></body>
```

### Buttons

`.btn` is the secondary keycap. Modifiers: `.btn--primary` (one per screen: the screen's main action), `.btn--ghost` (toolbar and card-level quiet actions), `.btn--danger` (red text keycap, destructive), `.btn--sm` (32px, hit area padded to 44px), `.btn--icon` (square; needs `aria-label`). Group with `.btn-row`. Always `type="button"` or `type="submit"`. Loading: keep the label, set `aria-busy="true"` and `disabled`.

```html
<button type="submit" class="btn btn--primary">다음 질문</button>
<button type="button" class="btn">건너뛰기</button>
<button type="button" class="btn btn--ghost btn--sm"><svg …undo/>되돌리기</button>
<button type="button" class="btn btn--danger btn--sm">삭제</button>
<button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="카드 펼치기" aria-expanded="false"><svg …expand/></button>
```

### Text fields

Visible label above every field; placeholder shows an example, never the instruction. Error: `aria-invalid="true"` + `aria-describedby` to `.field__error`. `.input` and `.btn` share 40px.

```html
<div class="field">
  <label class="field__label" for="prompt">어떤 게임을 만들고 싶나요?</label>
  <textarea class="textarea" id="prompt" name="prompt" rows="4" placeholder="예: 고양이가 우주 농장을 운영하는 느긋한 게임" aria-describedby="prompt-help"></textarea>
  <p class="field__help" id="prompt-help">한두 문장이면 충분해요.</p>
</div>
```

### Choices (selectable chips)

A `<fieldset class="choices">` of `<label class="chip">` around a real radio (one answer) or checkbox (several). `.choices--stack` puts long options one per row. The check icon appears when chosen, so selection is not colour alone. Mixed answer = choices plus a `.field` textarea under them (`직접 쓰기`).

```html
<fieldset class="choices choices--stack">
  <legend>플레이어가 가장 많이 하는 행동은?</legend>
  <label class="chip"><input type="radio" name="q3" value="a"><svg class="chip__check" …check/>밭을 가꾸고 수확하기</label>
  <label class="chip"><input type="radio" name="q3" value="b"><svg class="chip__check" …check/>다른 행성과 거래하기</label>
</fieldset>
```

### Segmented toggle and tabs

`.seg` switches a view of the same content (gallery 슬라이드/격자): `<div class="seg" role="group" aria-label="보기 방식"><button type="button" aria-pressed="true">슬라이드</button><button type="button" aria-pressed="false">격자</button></div>`.

`.tabs` switches panels (plan-doc 미리보기/마크다운/나란히). Arrow keys move between tabs; only the selected tab has `tabindex="0"`.

```html
<div class="tabs" role="tablist" aria-label="기획서 보기">
  <button type="button" role="tab" class="tab" id="t-prev" aria-selected="true" aria-controls="p-prev">미리보기</button>
  <button type="button" role="tab" class="tab" id="t-md" aria-selected="false" aria-controls="p-md" tabindex="-1">마크다운</button>
</div>
<div class="tab-panel" role="tabpanel" id="p-prev" aria-labelledby="t-prev">…</div>
```

### Panel

The one container. Never a panel inside a panel (or inside a workflow card): inside, use hairlines (`.panel__head`, `.panel__foot`) and spacing.

```html
<section class="panel" aria-labelledby="dec-h">
  <header class="panel__head"><h2 class="panel__title" id="dec-h">결정 문서</h2><div class="panel__actions">…</div></header>
  <div class="panel__body">…</div>
  <footer class="panel__foot">…</footer>
</section>
```

### Status label

Text plus one icon, coloured by state. No dots, no filled pill. Card state values map `active` → 진행중, `frozen` → 동결, `cancelled` → 취소.

```html
<span class="status status--active"><svg …clock/>진행중</span>
<span class="status status--frozen"><svg …lock/>동결</span>
<span class="status status--cancelled"><svg …slash/>취소</span>
```

### Chat session

Agent turns are plain text with a who-label; user turns are an indigo-wash bubble on the right. URLs in a message render as links (`.url` for a bare long URL) and their previews follow as a `.gallery` inside the same `<li>`. Composer send is `.btn` (the screen's primary stays the toolbar action).

```html
<ol class="chat" aria-label="대화">
  <li class="msg msg--agent">
    <p class="msg__who"><svg …agent/>에이전트</p>
    <div class="msg__body"><p>참고 화면을 모았어요. <a class="url" href="https://example.com/a">https://example.com/a</a></p></div>
    <!-- .gallery here when the message has URLs -->
  </li>
  <li class="msg msg--user"><p class="msg__who visually-hidden">나</p><div class="msg__body"><p>두 번째 느낌이 좋아요.</p></div></li>
</ol>
<form class="composer"><label class="visually-hidden" for="c1">메시지</label><textarea class="textarea" id="c1" name="message" rows="1"></textarea><button type="submit" class="btn">보내기</button></form>
```

### Gallery (link and image previews)

Slide view scrolls with snap (prev/next buttons call `scrollBy` on the track; no autoplay); grid view is 3 columns, 2 in narrow containers. Tiles are not cards: an image well plus two text lines. A page without an image shows the link icon in the well; the site line is the hostname. Links open with `target="_blank" rel="noopener noreferrer"`. Images: `loading="lazy"`, `alt` = page title or `""` when the title is right below.

```html
<section class="gallery" aria-label="링크 미리보기">
  <div class="gallery__bar">
    <p class="meta">미리보기 3개</p>
    <div class="seg" role="group" aria-label="보기 방식">…</div>
  </div>
  <ul class="gallery__track" data-view="slide">   <!-- or data-view="grid" -->
    <li class="preview"><a class="preview__link" href="…" target="_blank" rel="noopener noreferrer">
      <span class="preview__media"><img src="…" alt="" loading="lazy" width="640" height="400"></span>
      <span class="preview__title">우주 농장 콘셉트 아트</span>
      <span class="preview__site">example.com</span>
    </a></li>
  </ul>
  <div class="btn-row"><button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="이전">…prev</button><button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="다음">…next</button></div>
</section>
```

### Markdown document

Wrap rendered markdown in `<article class="md-doc">`. Measure 72ch, h2 with a hairline under it, images inline with a hairline outline, tables with horizontal rules only, code blocks on graphite. Markdown images `![alt](url)` must render as real `<img>` with the alt.

### Notices and states

Every region that loads has four states. Loading: `<span class="skeleton" style="width: 60%"></span>` lines in the shape of what comes (plus `aria-busy="true"` on the region). Empty: `<div class="empty"><p>아직 카드가 없어요.</p><button class="btn">예시 불러오기</button></div>`. Error: `<div class="notice notice--error" role="alert"><svg …alert/><p>질문을 만들지 못했어요. 다시 시도해 주세요.</p></div>`. Info: `.notice`. Secondary text: `.meta`. Success is the result itself, never a toast.

## Screens (per app, layout only)

- **step1** (`.app-main`, one column capped at 720px): first screen is a `.field` textarea + `.btn--primary` `질문 시작`. Interview: answered turns as `.chat` (agent question, user answer), current question below as `h2` at `--text-xl` + hint as `.meta` + `.choices` + optional textarea + `.btn-row` (`다음 질문` primary, `이전` ghost). Progress is a quiet `.meta` line (`질문 3 / 7`), no bar of dots. Result: game title `h1` at `--text-3xl`, one-liner at `--text-lg`, the ELI5 parts in an `.md-doc` (이게 뭐냐면, 비유하자면, 조금 더 자세히, 그래서 왜 재밌냐면, 결정한 것들 as a table), then `워크플로우로 열기` as `.btn--primary` link.
- **workflow-view** (`.app-main--full`): a toolbar row (workflow title, `.btn--primary` `기획서 만들기`, ghost actions) over the canvas. Canvas: `--color-paper-2` with a 16px dot grid in `--color-canvas-dot` (`radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1.5px) 0 0 / 16px 16px`). Card `<article class="panel node" data-status="active">`: 280px wide collapsed, 440px expanded, absolutely positioned by `transform: translate(x, y)`. Head: `.status` + `h3` title (`--text-md`, 600) + description (`.meta`, 2-line clamp) + actions (`btn--icon` expand with `aria-expanded`, `.btn--sm` `동결`, ghost `.btn--sm` `되돌리기`/`취소`). Expanded body: `.chat` capped at 360px with its own scroll, then `.composer`; a frozen card shows its decision on top as a `.notice` and hides the composer. `data-status="frozen"` sets the border to `--color-frozen`; `cancelled` sets `--color-paper-2` fill and a line-through on the title; the title, message text and preview titles drop to `--color-muted` (still 4.5:1 or more), never opacity. Ports: 10px squares, `--color-surface` fill, `--color-rule-2` border, at the vertical centre of the left and right edges. Edges: SVG cubic paths, 1.5px `--color-edge`, an edge into an active card `--color-edge-active`, into a cancelled card dashed; a closed arrowhead at the target end in the line's colour; draw-in once with `stroke-dashoffset` at `--dur-long`, none under reduced motion. Dragged card: `--shadow-raised`, `cursor: grabbing`. Keyboard: cards are focusable; Enter or Space selects, then arrow keys nudge by 5px (Shift: 20px), React Flow's default.
- **plan-doc** (`.app-main`): two columns `minmax(0, 360px) minmax(0, 1fr)` at 60rem and up, stacked below. Left: inputs as `.panel`s (결정 문서 list with title + `.meta` source, 이미지 as `.gallery` grid, add/upload controls) and `.btn--primary` `기획서 만들기`. Right: `.tabs` 미리보기 / 마크다운 / 나란히; preview is `<article class="md-doc">`, markdown is `<textarea class="textarea textarea--code">` with `min-height: 60dvh`; saved versions as a `.meta` list.

## Exports

`pocs/shared/tokens.css` only. Lint: `node .claude/skills/hallmark/scripts/sloplint.mjs <app>/app --scope app` (static tier; `--render` needs puppeteer, not installed). A screen that needs something new amends this file under `## Variants` instead of overriding locally.

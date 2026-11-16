<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Super Planer frontend rules
Visual truth: `../../docs/drafts/*.png` only. Ignore other apps in `pocs/` (different design system). UI only: static mock data, links between screens, hover/focus states.

| id | route | screen code |
| --- | --- | --- |
| 01-prompt-entry | `/` | `components/screens/01-prompt-entry/` |
| 02-guided-questions | `/questions` | `components/screens/02-guided-questions/` |
| 03-workflow-canvas | `/workflow` | `components/screens/03-workflow-canvas/` |
| 04-expanded-node-chat | `/workflow/node` | `components/screens/04-expanded-node-chat/` |
| 05-plan-document-preview | `/document` | `components/screens/05-plan-document-preview/` |

- A screen agent owns only `app/<route>/page.tsx` (renders its screen component, nothing else), `components/screens/<id>/**` and `public/screens/<id>/**` (raster images cropped from its draft).
- Do not edit shared files: `components/ui/**`, `components/logo.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/`, `package.json`, `next.config.ts`, `scripts/`. Need a change? Ask the lead.
- Logo: `import { Logo } from "@/components/logo"` -> `<Logo size={40} />` (size = S square height px, padding already cancelled; `iconOnly` for the square alone). Never redraw it.
- Tokens: `bg-background` zinc-50, `bg-card` white, `border-border` zinc-200, `text-muted-foreground` zinc-500, `bg-primary` #4F46E5, `bg-accent`/`text-accent-foreground` indigo-50/indigo tint. Icons: lucide-react. Font: Pretendard (default). No gradients, heavy shadows, animations or emoji not in the draft.
- Screenshot: `node scripts/shot.mjs <id-or-prefix...> [--tag t]` -> `.shots/<id>[-t].png` and `.shots/<id>[-t]-compare.png` (draft left, build right). Starts `next dev -p 3200` if needed; safe to run in parallel.
- Before handing off: `npx tsc --noEmit`.

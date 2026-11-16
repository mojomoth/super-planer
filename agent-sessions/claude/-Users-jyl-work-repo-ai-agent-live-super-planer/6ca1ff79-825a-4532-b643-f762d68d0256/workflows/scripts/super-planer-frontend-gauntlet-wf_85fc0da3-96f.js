export const meta = {
  name: 'super-planer-frontend-gauntlet',
  description: 'docs/drafts 시안 5장을 pocs/frontend Next.js UI로 구현하고 gauntlet loop(검증·수정 반복)로 시안과 맞춘다',
  phases: [
    { title: 'Plan', detail: '스캐폴드 + gauntlet 규칙 조사 + 화면별 시안 스펙' },
    { title: 'Implement', detail: '화면별 병렬 구현' },
    { title: 'Verify', detail: '독립 검증 (레이아웃 / 디테일 두 관점)' },
    { title: 'Fix', detail: '검증 이슈 수정' },
    { title: 'Simplify', detail: 'ponytail 정리 + build/lint' },
    { title: 'Final', detail: '정리 후 회귀 검증 및 최종 수정' },
  ],
}

const ROOT = '/Users/jyl/work/repo/ai-agent-live/super-planer'
const FE = `${ROOT}/pocs/frontend`
const DRAFTS = `${ROOT}/docs/drafts`
const PORT = 3200
const MAX_ROUNDS = 5

const SCREENS = [
  { id: '01', file: '01-prompt-entry.png', route: '/', w: 1586, h: 992, name: '아이디어 입력' },
  { id: '02', file: '02-guided-questions.png', route: '/questions', w: 1586, h: 992, name: '질문과 답변' },
  { id: '03', file: '03-workflow-canvas.png', route: '/workflow', w: 1586, h: 992, name: '워크플로우 캔버스' },
  { id: '04', file: '04-expanded-node-chat.png', route: '/workflow/node', w: 1717, h: 916, name: '확장 노드 대화' },
  { id: '05', file: '05-plan-document-preview.png', route: '/document', w: 1586, h: 992, name: '기획서 미리보기' },
]
const screenTable = SCREENS.map(s => `- ${s.id} ${s.name}: 시안 ${DRAFTS}/${s.file} (${s.w}x${s.h}) → 라우트 ${s.route}`).join('\n')

const CONTEXT = `
프로젝트: Super Planer (한국어 AI 게임 기획 도구) 데스크톱 웹 UI. 예시 프로젝트 "달빛 우체국".
시안(정답 기준): ${DRAFTS}/*.png, 설명 ${DRAFTS}/README.md, 생성 프롬프트 ${DRAFTS}/design-prompts.json.
원본 로고(캐릭터 원본): ${ROOT}/assets/super-planer-logo.svg, 아이콘 ${ROOT}/assets/super-planer-icon.svg. 로고는 래스터 시안을 따라 그리지 말고 원본 SVG를 그대로 사용한다.
구현 위치: ${FE} (Next.js App Router + TypeScript + Tailwind + shadcn/ui + lucide-react). 개발 서버 포트 ${PORT}.
화면/라우트:
${screenTable}
범위: UI/UX만. 실제 기능(AI 호출, 업로드, 저장)은 구현하지 않는다. 정적 목 데이터와 화면 간 이동 링크, 호버/포커스 같은 가벼운 상호작용 상태만.
주의: ${ROOT}/pocs 의 다른 앱(step1, workflow-view, plan-doc, shared, DESIGN.md, package.json)은 다른 디자인 시스템이다. 읽지도 수정하지도 말고 따르지도 않는다. 시안 PNG가 유일한 시각 기준이다.
ponytail 원칙: 불필요한 추상화·래퍼·설정·주석·의존성을 만들지 않는다. 시안에 없는 장식(그라데이션, 과한 그림자, 애니메이션, 이모지)을 추가하지 않는다. 시작 전 Skill 도구로 "ponytail" 스킬을 로드해 따른다.
`

const SHOT = `스크린샷 도구: cd ${FE} && node scripts/shot.mjs <id...> [--tag <tag>] → .shots/<id>[-tag].png (구현 캡처, 시안과 같은 뷰포트) 와 .shots/<id>[-tag]-compare.png (왼쪽 시안 | 오른쪽 구현) 생성. 서버가 꺼져 있으면 스크립트가 알아서 띄운다. Read 도구로 PNG를 직접 보고, 세부 비교가 필요하면 python3(PIL)로 같은 영역을 잘라 확대해서 비교하라 (작업 파일은 ${FE}/.shots/ 아래에).`

// ---------- Plan phase ----------
phase('Plan')

const rulesP = agent(`
다음 두 GitHub 저장소의 README/핵심 문서를 읽고(web-fetch 에이전트 또는 gh CLI 사용: gh api repos/<owner>/<repo>/readme 등), UI 시안 일치 작업에 적용할 실행 규칙만 간결하게 뽑아라.
1) https://github.com/robonuggets/gauntlet-loop — 계획·구현·독립 검증·수정 루프. 특히 검증자의 독립성, 증거 요구, 통과 기준, 수정 루프 종료 조건.
2) https://github.com/DietrichGebert/ponytail — 불필요한 복잡성과 AI slop 제거 규칙.
출력: "GAUNTLET 규칙" 과 "PONYTAIL 규칙" 두 섹션, 각각 6~10개의 짧은 명령형 불릿. 저장소를 못 읽으면 그 사실을 첫 줄에 쓰고 이름과 설명으로 추론한 규칙을 적어라. 파일을 만들지 마라.`,
  { label: 'rules:gauntlet+ponytail', phase: 'Plan', effort: 'low' })

const scaffoldP = agent(`
너는 프론트엔드 리드다. ${CONTEXT}

임무: ${FE} 에 Next.js 앱 기반을 만든다. 화면 본문은 다른 에이전트들이 병렬로 구현하므로 너는 기반과 공용 부품만 만든다.
1. 먼저 시안 PNG 5장을 모두 Read 로 보고 공통 시각 언어(배경/표면 색, 테두리, 반경, 폰트, 상단 바, 로고 크기)를 파악한다.
2. ${FE} 가 없으면 create-next-app 으로 생성 (TypeScript, Tailwind, App Router, ESLint, src 디렉터리 없이, npm, --yes). ${ROOT}/pocs/package.json 의 workspaces 에 추가하지 말고 독립 앱으로 둔다.
3. shadcn/ui 초기화(neutral/zinc 베이스) 후, 화면 에이전트들이 package.json 을 건드리지 않도록 필요한 컴포넌트를 미리 넉넉히 추가: button card input textarea badge tabs progress avatar separator scroll-area tooltip dropdown-menu radio-group toggle-group label switch. lucide-react 설치.
4. 폰트: Pretendard (시안의 한글 타이포). npm 패키지 또는 next/font/local 로 로컬 로드. word-break: keep-all.
5. 테마 토큰: globals.css 의 shadcn 변수에 primary = #4F46E5 (인디고), 배경 zinc-50, 텍스트 zinc-900 등 시안 값을 넣는다. 다크모드는 만들지 않는다.
6. 로고: 원본 SVG 를 public/ 에 복사하고 components/logo.tsx 로 노출 (크기 prop 정도만).
7. 라우트 자리만 만든다: ${SCREENS.map(s => s.route).join(', ')}. 각 page.tsx 는 "TODO <id>" 수준의 최소 자리표시자로 두고, 실제 화면 코드는 components/screens/<id>/ 아래에 들어간다는 규칙을 남긴다 (page.tsx 는 해당 화면 컴포넌트를 렌더만 함). 여러 화면에 똑같이 반복되는 상단 바가 시안에 명확히 있으면 components/app-header.tsx 로 하나 만들되, 화면마다 내용이 다르면 만들지 말고 각 화면이 직접 그리게 둔다.
8. 스크린샷 스크립트 scripts/shot.mjs (playwright 를 devDependency 로 설치; ~/Library/Caches/ms-playwright 에 브라우저가 이미 있음):
   - 사용: node scripts/shot.mjs <id...> [--tag <tag>]   (id 생략 시 전부)
   - 화면 정의는 위 표와 동일 (id, 라우트, 시안 파일, 뷰포트 w×h). deviceScaleFactor 1.
   - http://localhost:${PORT} 가 응답하지 않으면 "next dev -p ${PORT}" 를 detached + unref 로 띄우고(로그 .shots/dev.log) 응답할 때까지 대기. 여러 에이전트가 동시에 실행해도 깨지지 않게: 포트가 이미 사용 중이면 띄우기를 포기하고 응답을 기다리기만 한다.
   - document.fonts.ready 와 networkidle 대기 후 캡처 → .shots/<id>[-tag].png
   - sharp 로 시안과 구현을 같은 높이로 나란히 붙인 .shots/<id>[-tag]-compare.png 생성.
   - .shots/ 는 .gitignore 에 추가.
9. 마지막으로 dev 서버를 띄워 둔 채로(스크립트로) node scripts/shot.mjs 를 한 번 실행해 5개 라우트가 모두 캡처되는지 확인하고, npx tsc --noEmit 이 통과하는지 확인.
10. ${FE}/AGENTS.md 에 짧게(20줄 이내) 규칙을 적는다: 디렉터리 구조, 화면 에이전트 소유 범위(app/<route>/page.tsx 와 components/screens/<id>/** 만), 공용 파일(components/ui, layout, globals.css, logo, app-header, package.json)은 수정 금지, 스크린샷 명령.

반환: 만든 구조, 공용 부품 목록과 사용법(import 경로, props), 테마 토큰 요약, shot.mjs 사용법, 알려진 문제. 간결하게.`,
  { label: 'scaffold', phase: 'Plan' })

function planPrompt(s) {
  return `
너는 UI 시안을 개발 스펙으로 옮기는 디자인 엔지니어다. 코드를 쓰거나 파일을 만들지 마라.
${CONTEXT}
대상 시안: ${DRAFTS}/${s.file} (${s.w}x${s.h}px, 화면 ${s.id} ${s.name}). 맥락용으로 다른 시안도 볼 수 있다.
Read 로 시안을 보고, 필요하면 python3(PIL)로 영역을 잘라 확대해 (임시 파일은 스크래치나 /tmp 가 아닌 ${FE}/.shots/plan-${s.id}/ 에) 정밀하게 측정하라. 픽셀 색은 PIL 로 샘플링하라.
스펙에 포함할 것 (시안 좌표계 px 기준):
- 전체 레이아웃 그리드: 각 영역(상단 바, 사이드바, 본문, 패널 등)의 x/y/폭/높이, 여백
- 위에서 아래, 왼쪽에서 오른쪽 순서로 모든 요소: 종류(shadcn 컴포넌트 후보), 정확한 한국어 텍스트(한 글자도 빠짐없이), 폰트 크기/굵기/색, 아이콘(lucide 이름 추정), 테두리/반경/그림자/배경색(hex), 상태(선택/활성/비활성)
- 캔버스·노드·연결선·이미지 썸네일처럼 특수한 그림은 구현 방법 제안(SVG 경로, CSS 등)
- 시안에서 알아보기 어려운 부분은 "추정" 표시
반환: 위 내용을 담은 마크다운 스펙 텍스트 하나.`
}

const IMPL_RULES = `
소유 범위: ${FE}/app<route>/page.tsx 와 ${FE}/components/screens/<id>/** 만 만들고 수정한다. components/ui/*, app/layout.tsx, app/globals.css, components/logo.tsx, components/app-header.tsx, package.json, scripts/* 는 수정 금지(다른 에이전트와 동시 작업 중). 새 의존성 설치 금지. 공용 부품이 부족하면 화면 폴더 안에서 해결한다. 다른 화면 폴더는 수정하지 마라.
목 데이터는 화면 폴더 안의 상수로 둔다. 화면 간 이동은 next/link 로 (01 기획 시작 → /questions, 02 완료 → /workflow, 03 노드 확장 → /workflow/node, 03/04 기획서 생성 → /document 등 시안에 있는 버튼에 맞게).
시안과 같은 뷰포트에서 픽셀 수준으로 같게 보이는 것이 목표다. 텍스트는 시안과 정확히 일치. 레이아웃은 고정 px 남발보다 flex/grid 로 짜되 시안 뷰포트에서 치수가 맞아야 한다.`

function implPrompt(s, spec, scaffold) {
  return `
너는 프론트엔드 개발자다. 화면 ${s.id} (${s.name}, 라우트 ${s.route}) 를 구현한다.
${CONTEXT}
${IMPL_RULES.replace('<route>', s.route === '/' ? '' : s.route).replace('<id>', s.id)}
스캐폴드 리드 보고:
${scaffold}

디자인 엔지니어의 시안 스펙 (참고용, 시안 PNG 와 다르면 PNG 가 우선):
${spec}

${SHOT}
절차: 구현 → npx tsc --noEmit (자기 파일 오류 없게) → node scripts/shot.mjs ${s.id} --tag impl 로 compare 이미지를 보고 눈에 띄는 차이를 최소 2회 이상 반복 수정.
반환: 만든 파일 목록, 남은 차이점, 알려진 한계. 간결하게.`
}

// ---------- Gauntlet ----------
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '0-100 시안 일치도' },
    pass: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          region: { type: 'string' },
          expected: { type: 'string', description: '시안에서 본 것 (치수/색/텍스트 등 구체적으로)' },
          actual: { type: 'string', description: '구현에서 본 것' },
          evidence: { type: 'string', description: '근거: 비교한 이미지/잘라낸 영역 경로와 측정값' },
          fixHint: { type: 'string' },
        },
        required: ['severity', 'region', 'expected', 'actual', 'evidence'],
      },
    },
  },
  required: ['score', 'pass', 'issues'],
}

const LENSES = [
  { key: 'layout', focus: '레이아웃과 기하: 영역 위치/크기, 정렬, 여백/간격, 요소 개수와 순서, 반경, 테두리 유무, 캔버스 노드/연결선 위치, 스크롤/잘림, 전체 구도' },
  { key: 'detail', focus: '시각 디테일과 내용: 모든 텍스트가 글자 단위로 같은지, 폰트 크기/굵기/색, 아이콘 종류와 크기, 배경·테두리·강조색 hex, 배지/칩/버튼 상태, 로고가 원본 SVG 인지, 시안에 없는 AI slop(장식, 그라데이션, 이모지, 여분 요소)' },
]

function verifyPrompt(s, lens, round, rules) {
  return `
너는 독립 검증자(gauntlet)다. 구현자와 다른 사람이며 구현자의 주장을 믿지 않는다. 소스 코드를 수정하지 마라 (쓰기는 ${FE}/.shots/ 아래만 허용).
${CONTEXT}
대상: 화면 ${s.id} ${s.name}, 시안 ${DRAFTS}/${s.file}, 구현 http://localhost:${PORT}${s.route}, 뷰포트 ${s.w}x${s.h}.
검증 관점: ${lens.focus}
${SHOT}
반드시 직접 node scripts/shot.mjs ${s.id} --tag v${round}-${lens.key} 를 실행해 새로 캡처하고, 시안과 구현을 영역별로 잘라 나란히 비교하라. 기억이나 코드 추측으로 판정하지 말고 이미지 증거로만 판정한다.
gauntlet 규칙:
${rules}
판정 기준: 이 관점에서 시안과 구현을 나란히 놓았을 때 사람이 차이를 바로 알아챌 만한 것은 high/medium. 서브픽셀 렌더링 차이, 안티앨리어싱, 시안의 생성 이미지 특유의 흐릿한/깨진 글자는 이슈가 아니다 (깨진 글자는 의도된 한국어로 해석). score 는 이 관점의 일치도. pass 는 high 0개이고 medium 2개 이하이며 score >= 90 일 때만 true. 확신이 없으면 pass=false.
이슈는 구체적으로: 어느 영역, 시안 값, 구현 값, 증거 이미지 경로, 고칠 방법.`
}

function fixPrompt(s, issues, round, rules) {
  return `
너는 프론트엔드 개발자다. 독립 검증자들이 화면 ${s.id} (${s.name}, ${s.route}) 에서 찾은 이슈를 고친다. (gauntlet 수정 라운드 ${round})
${CONTEXT}
${IMPL_RULES.replace('<route>', s.route === '/' ? '' : s.route).replace('<id>', s.id)}
${SHOT}
gauntlet / ponytail 규칙:
${rules}
검증 이슈 (JSON):
${JSON.stringify(issues, null, 1)}
절차: high → medium → low 순으로 처리. 각 이슈를 시안 영역을 직접 확대해 다시 확인한 뒤 고친다 (검증자가 틀렸다고 판단되면 고치지 말고 이유를 남긴다). 수정 후 npx tsc --noEmit, node scripts/shot.mjs ${s.id} --tag fix${round} 로 확인. 고치면서 새 차이를 만들지 마라. 복잡도를 늘리지 말고 가장 작은 변경으로.
반환: 이슈별 처리 결과 (고침 / 반박+이유), 간결하게.`
}

async function gauntlet(s, rules, roundsLabel, maxRounds) {
  const history = []
  let lastIssues = []
  for (let round = 1; round <= maxRounds; round++) {
    const vs = (await parallel(LENSES.map(l => () =>
      agent(verifyPrompt(s, l, `${roundsLabel}${round}`, rules), {
        label: `verify:${s.id}:${l.key}:${roundsLabel}${round}`, phase: roundsLabel === 'f' ? 'Final' : 'Verify', schema: VERIFY_SCHEMA, effort: 'high',
      })))).filter(Boolean)
    const issues = vs.flatMap(v => v.issues || [])
    const pass = vs.length === LENSES.length && vs.every(v => v.pass)
    const scores = vs.map(v => v.score)
    history.push({ round, scores, pass, high: issues.filter(i => i.severity === 'high').length, total: issues.length })
    log(`[${s.id}] ${roundsLabel}${round}: scores ${scores.join('/')} ${pass ? 'PASS' : `FAIL (${issues.length} issues)`}`)
    lastIssues = issues
    if (pass) return { id: s.id, pass: true, history, remaining: issues }
    if (round === maxRounds) break
    await agent(fixPrompt(s, issues, `${roundsLabel}${round}`, rules), {
      label: `fix:${s.id}:${roundsLabel}${round}`, phase: roundsLabel === 'f' ? 'Final' : 'Fix',
    })
  }
  return { id: s.id, pass: false, history, remaining: lastIssues }
}

// ---------- Pipeline per screen ----------
const results = await pipeline(
  SCREENS,
  s => agent(planPrompt(s), { label: `spec:${s.id}`, phase: 'Plan' }),
  async (spec, s) => {
    const scaffold = await scaffoldP
    if (!scaffold) throw new Error('scaffold failed')
    return agent(implPrompt(s, spec, scaffold), { label: `impl:${s.id}`, phase: 'Implement' })
  },
  async (impl, s) => {
    const rules = (await rulesP) || '(규칙 조회 실패: 독립 검증, 이미지 증거 기반 판정, 최소 수정)'
    return gauntlet(s, rules, 'r', MAX_ROUNDS)
  },
)

// ---------- Simplify ----------
phase('Simplify')
const rules = (await rulesP) || ''
const simplify = await agent(`
너는 시니어 프론트엔드 리뷰어다. Skill 도구로 "ponytail" 스킬을 로드하고 ${FE} 전체를 정리한다.
${CONTEXT}
참고 규칙:
${rules}
할 일:
- 화면들 사이 중복 코드 중 명백한 것만 공용화 (예: 03과 04가 같은 캔버스/노드를 따로 그렸다면). 억지 추상화 금지.
- 쓰이지 않는 파일, shadcn 컴포넌트, 의존성, 죽은 코드, 불필요한 주석, 과한 래퍼/props, AI slop(시안에 없는 장식) 제거. create-next-app 기본 잔재(public 의 기본 svg 등) 제거.
- 시각 결과는 바꾸지 마라. 정리 전후로 node scripts/shot.mjs --tag pre / --tag post 를 실행하고, python3(PIL)로 pre/post 픽셀 차이를 화면별로 확인해 차이가 생기면 되돌려라.
- npx tsc --noEmit, npm run lint, npm run build 를 통과시켜라. (build 는 .next 를 덮어쓰므로 끝난 뒤 dev 서버가 정상 응답하는지 확인하고, 이상하면 dev 서버를 재시작하라.)
반환: 삭제/통합한 것, 줄어든 코드 규모, build/lint 결과, 화면별 pre/post 픽셀 차이.`,
  { label: 'ponytail:cleanup', phase: 'Simplify' })

// ---------- Final regression gauntlet ----------
phase('Final')
const finals = await pipeline(SCREENS, s => gauntlet(s, rules, 'f', 2))

const finalCheck = await agent(`
${FE} 에서 npx tsc --noEmit, npm run lint, npm run build 를 실행하고 결과를 보고하라. 실패하면 가장 작은 수정으로 고친 뒤 다시 확인하라 (시각 결과를 바꾸지 말 것). 끝나면 dev 서버(포트 ${PORT})가 응답하는지 확인하고 node scripts/shot.mjs --tag final 을 실행해 캡처 경로를 알려라.
반환: 각 명령 결과 한 줄씩, 고친 것, 최종 캡처 경로.`, { label: 'final:build', phase: 'Final', effort: 'low' })

return {
  gauntlet: results.map(r => r && { id: r.id, pass: r.pass, history: r.history, remaining: r.remaining.filter(i => i.severity !== 'low') }),
  simplify,
  final: finals.map(r => r && { id: r.id, pass: r.pass, history: r.history, remaining: r.remaining }),
  finalCheck,
}

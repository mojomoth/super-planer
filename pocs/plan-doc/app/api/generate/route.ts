import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { assemble, ensureImages, missingSections, sourceLabel, type Decision, type ImageInput } from '@/lib/assemble';
import { workflowTitle } from '@/lib/imports';
import { completeJSON } from '@/lib/llm';
import { now, store, type InputRow } from '@/lib/schema';

export const runtime = 'nodejs';

const SYSTEM = `너는 게임 기획 리드다. 팀이 내린 결정 문서와 참고 이미지를 받아 한국어 기획서를 Markdown으로 쓴다.
규칙:
- 가제가 결정 문서에 없으면 workflow_title을 가제로 쓴다.
- 결정 문서에 있는 내용만 쓴다. 없는 수치, 일정, 인원, 매출은 지어내지 않는다. 정해지지 않은 것은 '아직 정하지 않았어요'라고 쓰고 열린 질문에 넣는다.
- 15~20세도 한 번에 이해할 쉬운 문장. 마케팅 말투, 이모지 금지. HTML 태그 금지.
- 구조는 정확히 이 순서:
  # <게임 가제> 기획서
  ## 개요  (불릿: 한 줄 소개, 장르, 플랫폼, 타깃)
  ## 핵심 재미
  ## 코어 루프  (번호 목록 1. 2. 3.)
  ## 주요 시스템  (시스템마다 ### 소제목)
  ## 아트·분위기  (주어진 이미지를 모두 ![캡션](url) 형태로, url은 받은 그대로, 이미지마다 빈 줄로 구분)
  ## 결정 로그  (GFM 표: | 항목 | 결정 | 출처 |, 셀 안의 | 는 \\| 로 이스케이프)
  ## 열린 질문/리스크
  ## 다음 단계  (번호 목록)
출력은 JSON 하나만: {"title": "<게임 가제>", "markdown": "<문서 전체>"}`;

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { decisionIds?: unknown; imageIds?: unknown } | null;
  const ids = (v: unknown) => (Array.isArray(v) && v.length <= 200 && v.every((x) => typeof x === 'string' && x.length <= 200) ? (v as string[]) : null);
  const decisionIds = ids(b?.decisionIds);
  const imageIds = ids(b?.imageIds);
  if (!decisionIds || !imageIds) return NextResponse.json({ error: 'decisionIds와 imageIds는 문자열 배열이어야 해요.' }, { status: 400 });
  if (!decisionIds.length) return NextResponse.json({ error: '결정 문서를 하나 이상 골라 주세요.' }, { status: 400 });

  const d = store();
  const rows = d.prepare('SELECT * FROM plan_inputs ORDER BY created_at, id').all() as InputRow[];
  const decisions: Decision[] = rows
    .filter((r) => r.kind === 'decision' && decisionIds.includes(r.id))
    .map((r) => ({ id: r.id, title: r.title, body: r.body ?? '', source: r.source }));
  const images: ImageInput[] = rows
    .filter((r) => r.kind === 'image' && r.url && imageIds.includes(r.id))
    .map((r) => ({ id: r.id, title: r.title, url: r.url!, source: r.source }));
  if (!decisions.length) return NextResponse.json({ error: '고른 결정 문서를 찾지 못했어요. 목록을 새로 불러와 주세요.' }, { status: 404 });

  // A workflow hand-off rarely has a `가제:` line, so its workflow title stands in for the game title.
  const wfTitle = decisions.map((x) => workflowTitle(x.source)).find(Boolean);
  const fallback = () => assemble(decisions, images, wfTitle);
  const user = JSON.stringify({
    ...(wfTitle ? { workflow_title: wfTitle } : {}),
    decisions: decisions.map((x) => ({ title: x.title, body: x.body, source: sourceLabel(x.source) })),
    images: images.map((x) => ({ caption: x.title, url: x.url })),
  });
  const r = await completeJSON<{ title?: unknown; markdown?: unknown }>(SYSTEM, user, fallback);
  let { title, markdown } = r.data;
  let provider: string = r.provider;
  let error = r.error;
  if (typeof markdown !== 'string' || typeof title !== 'string' || missingSections(markdown).length) {
    if (provider !== 'mock') error = `${provider} 결과에 빠진 섹션이 있어 기본 조립 문서로 대신했어요.`;
    ({ title, markdown } = fallback());
    provider = 'mock';
  }
  const doc = {
    id: randomUUID(),
    title: String(title).replace(/\s*기획서\s*$/, '').trim().slice(0, 200) || '제목 없음',
    markdown: ensureImages(String(markdown), images),
    provider,
    created_at: now(),
  };
  d.prepare('INSERT INTO plan_docs (id, title, markdown, provider, created_at) VALUES (?, ?, ?, ?, ?)').run(doc.id, doc.title, doc.markdown, doc.provider, doc.created_at);
  return NextResponse.json({ doc, error });
}

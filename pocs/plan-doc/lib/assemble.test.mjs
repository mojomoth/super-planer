// Self-check: npm test -w plan-doc  (node --test lib/assemble.test.mjs; Node 22.6+ strips the .ts types)
import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, cell, ensureImages, imageMd, loopSteps, missingSections, SECTIONS } from './assemble.ts';
import { extractImageUrls, isHttpsUrl, sniffImage } from './images.ts';

const decisions = [
  { id: 'a', title: '가제', body: '- 가제: 버섯굴 수프집\n- 장르: 코지 로그라이트\n- 플랫폼: PC\n- 타깃: 15~25세\n- 한 줄 소개: 수프를 판다', source: 'seed' },
  { id: 'b', title: '코어 루프', body: '1. 탐험\n2. 채집\n3. 장사', source: 'wf:w1' },
  { id: 'c', title: '전투 | 실패', body: '결정: 피하기 | 숨기 중심\n- 열린 질문: 보스가 필요할까?', source: 'step1:s1' },
  { id: 'd', title: '아트 방향', body: '둥근 실루엣', source: null },
];
const images = [
  { id: 'i1', title: '캐릭터 [초안]', url: '/samples/character.svg', source: 'seed' },
  { id: 'i2', title: '굴 (원격)', url: 'https://cdn.example.com/cave.webp', source: 'wf:w1' },
];

test('assemble: every section, title, numbered loop', () => {
  const { title, markdown } = assemble(decisions, images);
  assert.equal(title, '버섯굴 수프집');
  assert.match(markdown, /^# 버섯굴 수프집 기획서$/m);
  assert.deepEqual(missingSections(markdown), []);
  for (const s of SECTIONS) assert.match(markdown, new RegExp(`^## ${s}$`, 'm'));
  assert.match(markdown, /^1\. 탐험\n2\. 채집\n3\. 장사$/m);
  assert.match(markdown, /장르: 코지 로그라이트/);
  assert.match(markdown, /질문: 보스가 필요할까\?/);
});

test('assemble: every image embedded as ![caption](url) in the art section', () => {
  const { markdown } = assemble(decisions, images);
  const art = markdown.slice(markdown.indexOf('## 아트·분위기'), markdown.indexOf('## 결정 로그'));
  for (const img of images) assert.ok(art.includes(imageMd(img)), img.url);
  assert.ok(art.includes('![캐릭터 \\[초안\\]](/samples/character.svg)'));
});

test('decision table escapes pipes and stays one row per decision', () => {
  const { markdown } = assemble(decisions, images);
  assert.ok(markdown.includes('| 전투 \\| 실패 | 피하기 \\| 숨기 중심 | Step1 |'));
  const rows = markdown.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| 항목') && !l.startsWith('| ---'));
  assert.equal(rows.length, decisions.length);
  assert.equal(cell('a\nb|c'), 'a b\\|c');
});

test('assemble with no inputs still has every section', () => {
  assert.deepEqual(missingSections(assemble([], []).markdown), []);
});

test('ensureImages adds missing images into the art section only', () => {
  const md = '# X 기획서\n\n## 아트·분위기\n\n글\n\n## 결정 로그\n\n표\n';
  const out = ensureImages(md, images);
  const art = out.slice(out.indexOf('## 아트'), out.indexOf('## 결정 로그'));
  for (const img of images) assert.ok(art.includes(imageMd(img)));
  assert.equal(ensureImages(out, images), out);
  assert.ok(ensureImages('# X 기획서\n', images).includes('## 아트·분위기'));
});

test('missingSections reports what is absent', () => {
  assert.deepEqual(missingSections('## 개요\n'), ['title', ...SECTIONS.slice(1)]);
});

test('sniffImage accepts png/jpeg/gif/webp by magic bytes, rejects svg and lies', () => {
  const b = (...xs) => new Uint8Array(xs);
  const s = (str) => new TextEncoder().encode(str);
  assert.equal(sniffImage(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), 'image/png');
  assert.equal(sniffImage(b(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(sniffImage(s('GIF89a....')), 'image/gif');
  assert.equal(sniffImage(s('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffImage(s('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(sniffImage(s('<?xml version="1.0"?><svg/>')), null);
  assert.equal(sniffImage(b()), null);
});

test('extractImageUrls finds image links by extension, ignores pages', () => {
  const text = '참고: https://example.com/a.png, ![x](https://cdn.example.com/b.webp) https://cdn.example.com/c.JPG. https://example.com/page 그리고 https://example.com/a.png';
  assert.deepEqual(extractImageUrls(text), ['https://example.com/a.png', 'https://cdn.example.com/b.webp', 'https://cdn.example.com/c.JPG']);
  assert.ok(isHttpsUrl('https://example.com/x.png'));
  assert.ok(!isHttpsUrl('http://example.com/x.png'));
  // http stays: the browser (not the server) loads them
  assert.deepEqual(extractImageUrls('http://localhost:3102/samples/core-loop.svg http://example.com/b.jpg http://example.com/page'), ['http://localhost:3102/samples/core-loop.svg', 'http://example.com/b.jpg']);
  // same rule as workflow-view's isImageUrl: no host list, so an extension-less link is not an image
  assert.deepEqual(extractImageUrls('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800'), []);
  assert.deepEqual(extractImageUrls('ftp://example.com/a.png javascript:alert(1).png http://u:p@example.com/a.png'), []);
  assert.ok(!isHttpsUrl('javascript:alert(1)'));
  assert.ok(!isHttpsUrl('https://user:pw@example.com/x.png'));
});

test('extractImageUrls takes root-relative own images (/workflow/…, /plan/…) at a word start', () => {
  const text = [
    '흐름도 시안: /workflow/samples/core-loop.svg.',
    '- /plan/api/images/1f0e2c3a-0000-4000-8000-000000000001',
    '[지도](/workflow/samples/garden-map.svg) 생성 /workflow/api/images/abc-123',
    // workflow-view agent answers: a generated image, then the reference pages
    '예시 이미지: /workflow/api/images/0b7d4f2e-1c3a-4e5f-8a9b-0c1d2e3f4a5b\n\n참고:\n- https://en.wikipedia.org/wiki/Roguelike',
    // pages, other roots, mid-word, inside another URL, protocol-relative, escaping the app prefix
    '/plan?workflow=1 /plan/api/docs/1 /samples/a.svg 하루/workflow/a.png https://example.com/page/plan/x.txt //evil.example/plan/a.png /plan/../etc/a.png',
  ].join('\n');
  assert.deepEqual(extractImageUrls(text), [
    '/workflow/samples/core-loop.svg',
    '/plan/api/images/1f0e2c3a-0000-4000-8000-000000000001',
    '/workflow/samples/garden-map.svg',
    '/workflow/api/images/abc-123',
    '/workflow/api/images/0b7d4f2e-1c3a-4e5f-8a9b-0c1d2e3f4a5b',
  ]);
});

test('overview-only decision stays out of 핵심 재미 and 주요 시스템', () => {
  const { markdown } = assemble(decisions, images);
  const body = markdown.slice(markdown.indexOf('## 핵심 재미'), markdown.indexOf('## 아트·분위기'));
  assert.ok(!body.includes('### 가제'));
  assert.ok(!/^- 결정:/m.test(markdown));
});

test('workflow-view hand-off: arrow-joined loop, workflow title, empty and art decisions', () => {
  const wf = [
    { id: 'c', title: '컨셉', body: '결정: 고양이 정원사가 지하 정원을 탐험하는 포근한 로그라이크.', source: 'wf:w3' },
    { id: 'l', title: '코어 루프', body: '결정: 등불을 켜고 탐험 → 씨앗 모으기 → 귀환 → 다시 탐험.', source: 'wf:w3' },
    { id: 'e', title: '전투', body: '', source: 'wf:w3' },
    { id: 'u', title: '아트 참고', body: '미정: 그림체 정하기', source: 'wf:w3' },
    { id: 'a', title: '아트 방향', body: '결정: 둥근 실루엣과 따뜻한 등불 색', source: 'wf:w3' },
  ];
  assert.deepEqual(loopSteps(wf), ['등불을 켜고 탐험', '씨앗 모으기', '귀환', '다시 탐험']);
  const { title, markdown } = assemble(wf, [], '포근한 던전 정원');
  assert.equal(title, '포근한 던전 정원');
  assert.match(markdown, /^## 코어 루프\n\n1\. 등불을 켜고 탐험\n2\. 씨앗 모으기\n3\. 귀환\n4\. 다시 탐험$/m);
  assert.ok(!markdown.includes('결정 요약 없음'));
  const art = markdown.slice(markdown.indexOf('## 아트·분위기'), markdown.indexOf('## 결정 로그'));
  assert.ok(art.includes('둥근 실루엣과 따뜻한 등불 색') && !art.includes('결정:'));
  assert.ok(markdown.includes('| 전투 | 전투 | 워크플로우 |'));
  assert.match(markdown, /^- 질문: 그림체 정하기 \(아트 참고\)$/m);
  assert.ok(!art.includes('미정:'));
  assert.deepEqual(missingSections(markdown), []);
});

test('no loop decision: 코어 루프 says so instead of listing titles', () => {
  const { markdown } = assemble([{ id: 'x', title: '컨셉', body: '결정: 정원 게임', source: null }], []);
  const loop = markdown.slice(markdown.indexOf('## 코어 루프'), markdown.indexOf('## 주요 시스템'));
  assert.ok(!/^1\. 컨셉$/m.test(loop));
  assert.match(loop, /^1\. 아직 정하지 않았어요/m);
});

test('workflow hand-off with Step1 track titles: single-step loop, platform and target are decided', () => {
  const wf = [
    { id: 'c', title: '컨셉: 편의점 좀비 키우기', body: '결정: 좀비가 되어 편의점을 키우는 게임', source: 'wf:w' },
    { id: 'l', title: '코어 루프', body: '결정: 심고 기다렸다가 수확하기', source: 'wf:w' },
    { id: 'p', title: '플랫폼과 한 판 길이', body: '결정: 폰으로 쉬는 시간에 3~5분', source: 'wf:w' },
    { id: 't', title: '누가 할 게임인지', body: '결정: 게임을 잘 안 하는 친구', source: 'wf:w' },
    { id: 'q', title: '장르', body: '미정: 방치형인지 경영인지', source: 'wf:w' },
  ];
  assert.deepEqual(loopSteps(wf), ['심고 기다렸다가 수확하기']);
  const { markdown } = assemble(wf, []);
  assert.match(markdown, /^## 코어 루프\n\n1\. 심고 기다렸다가 수확하기$/m);
  assert.match(markdown, /^- 플랫폼: 폰으로 쉬는 시간에 3~5분$/m);
  assert.match(markdown, /^- 타깃: 게임을 잘 안 하는 친구$/m);
  assert.match(markdown, /^- 한 줄 소개: 좀비가 되어 편의점을 키우는 게임$/m);
  // an open-only decision is not a decision: 장르 stays undecided and shows up as an open question
  assert.match(markdown, /^- 장르: 아직 정하지 않았어요$/m);
  assert.match(markdown, /^- 질문: 장르를 아직 정하지 않았어요 \(개요\)$/m);
  assert.ok(!markdown.includes('코어 루프를 정한 결정 문서'));
});

test('Step1 concept import: 결정한 것들 lines fill overview and loop', () => {
  const s1 = [{
    id: 's', title: '편의점 좀비 키우기 콘셉트', source: 'step1:x',
    body: '결정: 좀비 편의점 키우기\n\n- 가제: 편의점 좀비 키우기\n- 한 줄 소개: 좀비 편의점 키우기\n\n#### 결정한 것들\n\n- 코어 루프: 심고 기다렸다가 수확하기\n- 플랫폼과 한 판 길이: 폰으로 쉬는 시간에 3~5분\n- 누가 할 게임인지: 게임을 잘 안 하는 친구\n- 분위기와 그림체: 말랑하고 귀여운 파스텔',
  }];
  const { title, markdown } = assemble(s1, []);
  assert.equal(title, '편의점 좀비 키우기');
  assert.match(markdown, /^## 코어 루프\n\n1\. 심고 기다렸다가 수확하기$/m);
  assert.match(markdown, /^- 플랫폼: 폰으로 쉬는 시간에 3~5분$/m);
  assert.match(markdown, /^- 타깃: 게임을 잘 안 하는 친구$/m);
  const art = markdown.slice(markdown.indexOf('## 아트·분위기'), markdown.indexOf('## 결정 로그'));
  assert.ok(art.includes('말랑하고 귀여운 파스텔') && !art.includes('아직 없어요'));
});

test('no fun-titled decision: 핵심 재미 leaves the art decision to 아트·분위기', () => {
  const { markdown } = assemble(decisions, images);
  const fun = markdown.slice(markdown.indexOf('## 핵심 재미'), markdown.indexOf('## 코어 루프'));
  assert.ok(fun.includes('피하기') && !fun.includes('둥근 실루엣'));
});

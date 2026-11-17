// node --test --experimental-strip-types lib/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractUrls, isImageUrl, isOwnPath, hostOf } from './urls.ts';
import { parseBlocks, parseInline, condense } from './md.ts';

test('extractUrls finds, trims and dedupes http(s) URLs', () => {
  const text = [
    '참고: https://en.wikipedia.org/wiki/Roguelike, 그리고 (https://github.com/xyflow/xyflow).',
    '마크다운 [링크](https://example.com/a?b=1&c=2) 와 https://en.wikipedia.org/wiki/Rogue_(video_game)!',
    '중복 https://en.wikipedia.org/wiki/Roguelike 와 ftp://nope.example 와 javascript:alert(1)',
    '**https://cdn.example.com/mood.webp**',
  ].join('\n');
  assert.deepEqual(extractUrls(text), [
    'https://en.wikipedia.org/wiki/Roguelike',
    'https://github.com/xyflow/xyflow',
    'https://example.com/a?b=1&c=2',
    'https://en.wikipedia.org/wiki/Rogue_(video_game)',
    'https://cdn.example.com/mood.webp',
  ]);
  assert.deepEqual(extractUrls('URL 없음'), []);
});

test('isImageUrl by extension', () => {
  assert.equal(isImageUrl('https://x.com/a.PNG?v=2'), true);
  // no host list: an extension-less image link is a page, and /api/preview finds its image
  assert.equal(isImageUrl('https://images.unsplash.com/photo-1?w=800'), false);
  assert.equal(isImageUrl('https://en.wikipedia.org/wiki/Roguelike'), false);
  assert.equal(isImageUrl('not a url'), false);
  assert.equal(hostOf('https://www.github.com/x'), 'github.com');
});

test('root-relative own-origin paths (/workflow/…, /plan/…) are links and images too', () => {
  const text = [
    '지도 시안: /workflow/samples/garden-map.svg, 업로드 (/plan/api/images/1f0e2c3a-0000-4000-8000-000000000001).',
    '마크다운 [시안](/workflow/samples/core-loop.svg) 과 /plan/samples/mood.svg',
    // not own paths: inside another URL, mid-word, another root path, protocol-relative
    'https://example.com/plan/x.png 하루/workflow/a.png /step1/a.png //evil.example/workflow/a.png',
  ].join('\n');
  assert.deepEqual(extractUrls(text), [
    '/workflow/samples/garden-map.svg',
    '/plan/api/images/1f0e2c3a-0000-4000-8000-000000000001',
    '/workflow/samples/core-loop.svg',
    '/plan/samples/mood.svg',
    'https://example.com/plan/x.png',
  ]);
  assert.equal(isImageUrl('/workflow/samples/garden-map.svg'), true);
  assert.equal(isImageUrl('/plan/api/images/1f0e2c3a-0000-4000-8000-000000000001'), true);
  assert.equal(isImageUrl('/workflow/api/images/abc-123'), true);
  // the line the agent appends after generating an image (lib/agent.ts)
  const gen = '/workflow/api/images/0b7d4f2e-1c3a-4e5f-8a9b-0c1d2e3f4a5b';
  assert.deepEqual(extractUrls(`답이에요.\n\n예시 이미지: ${gen}\n\n참고:\n- https://en.wikipedia.org/wiki/Roguelike`), [gen, 'https://en.wikipedia.org/wiki/Roguelike']);
  assert.equal(isImageUrl(gen), true);
  assert.equal(isImageUrl('/plan?workflow=1'), false);
  assert.equal(isImageUrl('/plan/api/docs/1'), false);
  assert.equal(isImageUrl('/samples/a.svg'), false);
  assert.equal(isOwnPath('/workflow/samples/a.svg'), true);
  assert.equal(isOwnPath('//evil.example/workflow/a.svg'), false);
  assert.equal(hostOf('/workflow/samples/a.svg'), 'Super Planer');
});

test('parseBlocks splits paragraphs and lists', () => {
  const blocks = parseBlocks('첫 줄\n둘째 줄\n\n- 하나\n- 둘\n1. 가\n2. 나\n끝');
  assert.deepEqual(blocks, [
    { t: 'p', lines: ['첫 줄', '둘째 줄'] },
    { t: 'ul', items: ['하나', '둘'] },
    { t: 'ol', items: ['가', '나'] },
    { t: 'p', lines: ['끝'] },
  ]);
});

test('parseInline handles bold, links and bare URLs with trailing punctuation', () => {
  assert.deepEqual(parseInline('**굵게** 보기 [위키](https://en.wikipedia.org/wiki/X) https://a.com/b.'), [
    { t: 'bold', v: '굵게' },
    { t: 'text', v: ' 보기 ' },
    { t: 'link', v: '위키', href: 'https://en.wikipedia.org/wiki/X' },
    { t: 'text', v: ' ' },
    { t: 'url', href: 'https://a.com/b' },
    { t: 'text', v: '.' },
  ]);
});

test('parseInline links root-relative own paths', () => {
  assert.deepEqual(parseInline('시안 [지도](/workflow/samples/a.svg) 와 (/plan/api/images/x).'), [
    { t: 'text', v: '시안 ' },
    { t: 'link', v: '지도', href: '/workflow/samples/a.svg' },
    { t: 'text', v: ' 와 (' },
    { t: 'url', href: '/plan/api/images/x' },
    { t: 'text', v: ').' },
  ]);
});

test('condense strips URLs, markdown and reference labels', () => {
  const msg = '그럼 위협을 **시간**으로 둬요.\n\n- 등불이 꺼지면 귀환 [지도](/workflow/samples/a.svg)\n\n참고:\n- https://en.wikipedia.org/wiki/Cozy_game\n지도 시안: /workflow/samples/a.svg';
  assert.equal(condense(msg), '그럼 위협을 시간으로 둬요. 등불이 꺼지면 귀환 지도');
  const long = '가나다라마바사. '.repeat(40);
  const out = condense(long, 100);
  assert.ok(out.length <= 100 && out.endsWith('.'), out);
  // the mock agent quotes the user with condense(…, 40): a long link must not be cut into a broken URL
  const quote = condense('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG 이 영상처럼 숨는 루프로 가고 싶어요', 40);
  assert.equal(quote, '이 영상처럼 숨는 루프로 가고 싶어요');
  // a "참고" label in front of a link leaves with the link
  assert.equal(condense('비 오는 밤 퍼즐을 주세요. 참고 https://en.wikipedia.org/wiki/Puzzle'), '비 오는 밤 퍼즐을 주세요.');
  assert.equal(condense('이 장면을 참고해요'), '이 장면을 참고해요');
});

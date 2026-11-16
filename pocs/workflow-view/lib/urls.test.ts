// node --test --experimental-strip-types lib/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractUrls, isImageUrl, hostOf } from './urls.ts';
import { parseBlocks, parseInline, condense } from './md.ts';

test('extractUrls finds, trims and dedupes http(s) URLs', () => {
  const text = [
    '참고: https://en.wikipedia.org/wiki/Roguelike, 그리고 (https://github.com/xyflow/xyflow).',
    '마크다운 [링크](https://example.com/a?b=1&c=2) 와 https://en.wikipedia.org/wiki/Rogue_(video_game)!',
    '중복 https://en.wikipedia.org/wiki/Roguelike 와 ftp://nope.example 와 javascript:alert(1)',
    '**https://picsum.photos/id/10/800/500**',
  ].join('\n');
  assert.deepEqual(extractUrls(text), [
    'https://en.wikipedia.org/wiki/Roguelike',
    'https://github.com/xyflow/xyflow',
    'https://example.com/a?b=1&c=2',
    'https://en.wikipedia.org/wiki/Rogue_(video_game)',
    'https://picsum.photos/id/10/800/500',
  ]);
  assert.deepEqual(extractUrls('URL 없음'), []);
});

test('isImageUrl by extension or image host', () => {
  assert.equal(isImageUrl('https://picsum.photos/id/1/800/500'), true);
  assert.equal(isImageUrl('https://images.unsplash.com/photo-1?w=800'), true);
  assert.equal(isImageUrl('http://localhost:3102/samples/garden-map.svg'), true);
  assert.equal(isImageUrl('https://x.com/a.PNG?v=2'), true);
  assert.equal(isImageUrl('https://en.wikipedia.org/wiki/Roguelike'), false);
  assert.equal(isImageUrl('not a url'), false);
  assert.equal(hostOf('https://www.github.com/x'), 'github.com');
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

test('condense strips URLs, markdown and reference labels', () => {
  const msg = '그럼 위협을 **시간**으로 둬요.\n\n- 등불이 꺼지면 귀환\n\n참고:\n- https://en.wikipedia.org/wiki/Cozy_game\n지도 시안: http://localhost:3102/samples/a.svg';
  assert.equal(condense(msg), '그럼 위협을 시간으로 둬요. 등불이 꺼지면 귀환');
  const long = '가나다라마바사. '.repeat(40);
  const out = condense(long, 100);
  assert.ok(out.length <= 100 && out.endsWith('.'), out);
});

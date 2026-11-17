// Self-check for the interview engine: node --test --experimental-strip-types lib/interview.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACK_KEYS, RECOMMEND, MAX_QUESTIONS, HARD_CAP, applyAnswer, blockedTrack, decisions, initialLedger, josa, mockConcept,
  mockQuestion, overall, parseConcept, parseQuestion, pickTrack, shouldStop, isOneQuestion, resolveAnswer, decisionOf, goalLine,
  short, mergeLedger,
} from './interview.ts';

const PROMPT = '고양이가 우주 농장을 운영하는 느긋한 게임';

test('prompt words lower matching tracks; the most ambiguous unanswered track is picked', () => {
  const l = initialLedger(PROMPT);
  assert.equal(l.fun, 0.55); // 농장, 운영
  assert.equal(l.mood, 0.55); // 느긋
  assert.equal(l.win, 1);
  assert.equal(pickTrack(l, []), 'fun'); // ontological opener
  assert.equal(pickTrack(l, ['fun']), 'loop'); // then the heaviest track still at 1
});

test('answering drops the track; recommend and vague answers stay fuzzier', () => {
  const l = initialLedger(PROMPT);
  assert.equal(applyAnswer(l, 'win', { choices: ['목표를 달성하면 승리'], text: '' }).win, 0.15);
  assert.equal(applyAnswer(l, 'win', { choices: ['목표를 달성하면 승리'], text: '주간 목표' }).win, 0.05);
  assert.equal(applyAnswer(l, 'win', { choices: [RECOMMEND], text: '' }).win, 0.3);
  assert.equal(applyAnswer(l, 'win', { choices: [], text: '음' }).win, 0.45);
  assert.equal(applyAnswer(l, 'win', { choices: [], text: '친구랑 같이 해요' }).audience, 0.5); // spill-over from typed text
  assert.equal(applyAnswer(l, 'fun', { choices: ['차곡차곡 키우고 꾸미는 재미'], text: '' }).loop, 1); // preset labels do not spill over
  const once = applyAnswer(l, 'win', { choices: [RECOMMEND], text: '' });
  assert.equal(applyAnswer(once, 'win', { choices: [RECOMMEND], text: '' }).win, 0.15); // a second answer keeps lowering it
});

test('ties go to the track asked fewer times', () => {
  const l = Object.fromEntries(TRACK_KEYS.map((k) => [k, 0.15]));
  assert.equal(pickTrack(l, ['fun', 'loop', 'win', 'role', 'unique', 'mood', 'audience', 'platform', 'fun']), 'loop');
});

test('breadth control: after 2 turns on one track, zoom out', () => {
  const l = Object.fromEntries(TRACK_KEYS.map((k) => [k, 0.1]));
  l.loop = 0.9; l.mood = 0.4;
  assert.equal(pickTrack(l, ['fun', 'loop']), 'loop');
  assert.equal(blockedTrack(['fun', 'loop', 'loop']), 'loop');
  assert.equal(pickTrack(l, ['fun', 'loop', 'loop']), 'mood');
  assert.equal(blockedTrack(['loop', 'fun']), null);
});

test('stop condition: ambiguity <= 0.2 or the question cap', () => {
  const clear = Object.fromEntries(TRACK_KEYS.map((k) => [k, 0.15]));
  assert.ok(overall(clear) <= 0.2);
  assert.equal(shouldStop(clear, 3), true);
  assert.equal(shouldStop(initialLedger(PROMPT), 3), false);
  assert.equal(shouldStop(initialLedger(PROMPT), MAX_QUESTIONS), true);
  assert.equal(shouldStop({ ...clear, win: 0.55, mood: 0 }, 3), false); // a core track left fuzzy keeps the interview going
});

test('a full mock interview asks each track once, builds on answers and ends', () => {
  let l = initialLedger(PROMPT);
  const turns = [];
  while (!shouldStop(l, turns.length)) {
    const track = pickTrack(l, turns.map((t) => t.track));
    const q = mockQuestion(PROMPT, turns, track);
    assert.equal(q.track, track);
    assert.match(q.question, /\?$/);
    assert.doesNotMatch(q.question, /좋은 질문/);
    assert.ok(q.options.length >= 3 && q.options.length <= 5, `${track} options`);
    const a = { choices: [q.options[0]], text: '' };
    turns.push({ track, question: q.question, options: q.options, answer: a });
    l = applyAnswer(l, track, a);
  }
  assert.equal(new Set(turns.map((t) => t.track)).size, turns.length);
  assert.ok(turns.length <= MAX_QUESTIONS);
  const loop = turns.find((t) => t.track === 'loop');
  const funIdx = turns.findIndex((t) => t.track === 'fun');
  if (funIdx >= 0 && funIdx < turns.indexOf(loop)) assert.match(loop.question, /재미/); // builds on the fun answer
  assert.match(turns.find((t) => t.track === 'role').options[0], /고양이/);
  const c = mockConcept(PROMPT, turns);
  assert.ok(c.title && c.what && c.analogy && c.so_what);
  const table = decisions(turns).map((d) => `${d.track}: ${d.decision}`);
  assert.ok(c.details.length >= 3 && c.details.every((d) => !table.includes(d))); // details add to the decisions table
});

/** Drive a whole mock interview, always taking the recommendation, then press "질문 하나 더" up to HARD_CAP. */
function run(prompt, answer = (q) => ({ choices: [RECOMMEND], text: '' })) {
  let l = initialLedger(prompt);
  const turns = [];
  while (turns.length < HARD_CAP) {
    const track = pickTrack(l, turns.map((t) => t.track));
    const q = mockQuestion(prompt, turns, track);
    const a = answer(q);
    turns.push({ track, question: q.question, options: q.options, answer: a });
    l = applyAnswer(l, track, a);
  }
  return turns;
}

test('"질문 하나 더" never repeats a question', () => {
  for (const pick of [(q) => ({ choices: [q.options[0]], text: '' }), () => ({ choices: [RECOMMEND], text: '' })]) {
    const qs = run(PROMPT, pick).map((t) => t.question);
    assert.equal(new Set(qs).size, qs.length, qs.join('\n'));
  }
});

test('the recommendation follows the prompt for every home example', () => {
  const cases = [
    ['고양이가 우주 농장을 운영하는 느긋한 게임', /키우/, /고양이 본인/],
    ['좀비가 나오는 편의점에서 하룻밤 버티기', /버티|살아남/, /좀비와 맞서는/],
    ['친구랑 폰 하나로 번갈아 하는 짧은 퍼즐 대결', /퍼즐|머리|겨루/, null],
    ['꿈속을 돌아다니며 잃어버린 기억을 모으는 이야기', /이야기/, null],
  ];
  for (const [prompt, fun, role] of cases) {
    const turns = run(prompt).slice(0, MAX_QUESTIONS);
    const t = (k) => turns.find((x) => x.track === k);
    assert.match(t('fun').options[0], fun, prompt);
    if (role) assert.match(t('role').options[0], role, prompt);
    assert.doesNotMatch(t('role').options[0], /좀비 본인/);
    const c = mockConcept(prompt, turns);
    if (!prompt.includes('농장')) assert.doesNotMatch(`${c.title} ${c.one_liner} ${c.analogy}`, /키우기|수확|다마고치/, prompt);
  }
});

test('the first question does not say "pick one" while allowing many', () => {
  const q = mockQuestion(PROMPT, [], 'fun');
  assert.equal(q.multi, true);
  assert.doesNotMatch(q.question, /하나만/);
});

test('a repeated track gets a deeper follow-up question', () => {
  const first = mockQuestion(PROMPT, [], 'win');
  const again = mockQuestion(PROMPT, [{ track: 'win', question: first.question, options: first.options, answer: { choices: [RECOMMEND], text: '' } }], 'win');
  assert.notEqual(first.question, again.question);
});

test('LLM output validation rejects blocked tracks and non-questions', () => {
  const good = { track: 'mood', question: '어떤 분위기인가요?', hint: 'h', options: ['a', 'b', 'c'], multi: true, ambiguity: { mood: 0.4, fun: 2 } };
  const p = parseQuestion(good, null);
  assert.equal(p.q.track, 'mood');
  assert.deepEqual(p.ledger, { mood: 0.4, fun: 1 });
  assert.equal(parseQuestion(good, 'mood').q, null);
  assert.equal(parseQuestion({ ...good, question: '좋은 질문이에요! 뭘 할까요? 그리고 왜요?' }, null).q, null);
  assert.equal(parseQuestion({ ...good, question: '알겠어요. 어떤 분위기인가요?' }, null).q, null);
  assert.equal(parseQuestion({ ...good, question: '뭘 할까요? 그리고 왜요?' }, null).q, null);
  assert.equal(parseQuestion({ ...good, question: '색을 정해요. 빛을 정해요. 어떤 분위기인가요?' }, null).q, null);
  assert.equal(parseQuestion({ ...good, options: ['a', 'b'] }, null).q, null);
  assert.ok(parseQuestion({ ...good, question: '그림체를 정해 볼게요. 어떤 분위기인가요?' }, null).q);
  assert.equal(parseQuestion({ ...good, question: '분위기를 정해요.' }, null).q, null);
  assert.equal(parseQuestion('nope', null).q, null);
  const fb = mockConcept(PROMPT, []);
  assert.equal(parseConcept({ title: '' }, fb).title, fb.title);
});

test('josa follows the final consonant', () => {
  assert.equal(josa('고양이', '과', '와'), '와');
  assert.equal(josa('농장', '과', '와'), '과');
  assert.equal(josa('걸', '으로', '로'), '로'); // ㄹ takes 로 …
  assert.equal(josa('집', '으로', '로'), '으로');
  assert.equal(josa('걸', '을', '를'), '을'); // … only in the 으로/로 pair
  assert.equal(josa('물', '이', '가'), '이');
  const win = { track: 'win', question: 'q?', options: ['a'], answer: { choices: ['물건을 다 모을'], text: '' } };
  assert.match(mockQuestion('좀비 게임', [win], 'win').question, /^‘물건을 다 모을’로 정했다면/);
  const fun = { track: 'fun', question: 'q?', options: ['a'], answer: { choices: ['밤새 버틸'], text: '' } };
  const loop = { track: 'loop', question: 'q?', options: ['a'], answer: { choices: ['숨기'], text: '' } };
  assert.match(mockConcept('좀비 게임', [fun, loop]).what, /버틸로 숨기를/);
});

test('every mock question follows the one-question rule', () => {
  for (const prompt of [PROMPT, '좀비가 나오는 편의점에서 하룻밤 버티기', '테스트']) {
    for (const t of run(prompt)) assert.ok(isOneQuestion(t.question), t.question);
  }
});

test('"추천해 줘" is stored as the recommended option, scored as fuzzy and shown as (추천)', () => {
  const a = resolveAnswer({ choices: [RECOMMEND], text: '' }, ['A안', 'B안']);
  assert.deepEqual(a, { choices: ['A안'], text: '', recommended: true });
  assert.equal(applyAnswer(initialLedger(PROMPT), 'win', a).win, 0.3);
  assert.equal(decisionOf({ track: 'win', question: 'q?', options: ['A안', 'B안'], answer: a }), 'A안(추천)');
  assert.deepEqual(resolveAnswer({ choices: ['B안'], text: 'x' }, ['A안', 'B안']), { choices: ['B안'], text: 'x' });
});

test('the prompt quote takes the right josa', () => {
  assert.equal(goalLine('테스트 게임', []), '“테스트 게임”을 바탕으로 한 게임이에요.');
  assert.equal(goalLine('고양이 키우기', []), '“고양이 키우기”를 바탕으로 한 게임이에요.');
  assert.match(mockConcept('느긋한 게임', []).what, /”을 직접/);
});

test('an early stop waits for the core tracks (zombie example asks 이기고 지는 조건)', () => {
  const prompt = '좀비가 나오는 편의점에서 하룻밤 버티기';
  let l = initialLedger(prompt);
  const tracks = [];
  while (!shouldStop(l, tracks.length)) {
    const track = pickTrack(l, tracks);
    const q = mockQuestion(prompt, [], track);
    tracks.push(track);
    l = applyAnswer(l, track, { choices: [q.options[0]], text: '' });
  }
  assert.ok(tracks.includes('win'), tracks.join(','));
  assert.ok(tracks.length <= MAX_QUESTIONS);
});

test('summaries never cut a link in the middle', () => {
  const url = 'https://www.youtube.com/watch?v=abc123';
  const loop = { track: 'loop', question: 'q?', options: ['a'], answer: { choices: [], text: `좀비를 피해 다니는 느낌 ${url} 참고` } };
  assert.equal(goalLine('좀비 게임', [loop]), '좀비를 피해 다니는 느낌 참고를 반복하는 게임이에요.');
  assert.equal(short(`${url} 이런 느낌으로 계속 숨어 다니면서 물건을 모으기`), '이런 느낌으로 계속 숨어 다니면서 물건을 모…');
  // links without a scheme are links too; ordinary words with dots or slashes are not
  assert.equal(short('www.youtube.com/watch?v=abc123def 이런 느낌으로'), '이런 느낌으로');
  assert.equal(short('이런 느낌 youtube.com/watch?v=abcdefghijk 참고하세요 진짜로'), '이런 느낌 참고하세요 진짜로');
  assert.equal(short('3.5초 안에 A/B 중 1/2 고르기 v1.2', 60), '3.5초 안에 A/B 중 1/2 고르기 v1.2');
  // a word glued to a link stays; dots before a slash are not a link
  assert.ok(short('데드바이데이라이트(https://store.steampowered.com/app/381210) 같은 숨바꼭질', 60).startsWith('데드바이데이라이트'));
  assert.equal(short('폰..PC/콘솔'), '폰..PC/콘솔');
  assert.equal(short('음...PC/모바일 둘 다'), '음...PC/모바일 둘 다');
  assert.equal(short('좋아요.PC/모바일'), '좋아요.PC/모바일');
});

test('a link-only answer reads as 참고 링크 in summaries and keeps its URL in the decisions table', () => {
  const url = 'https://www.youtube.com/watch?v=abc123def&t=42s';
  const loop = { track: 'loop', question: 'q?', options: ['a'], answer: { choices: [], text: url } };
  const prompt = '좀비가 나오는 편의점에서 하룻밤 버티기';
  assert.equal(short(url), '참고 링크');
  assert.equal(short('youtu.be/abc123'), '참고 링크');
  assert.equal(short('  '), '');
  for (const track of ['win', 'loop']) {
    const q = mockQuestion(prompt, [loop], track).question; // the win question quotes the loop answer; loop gets a follow-up
    assert.ok(isOneQuestion(q) && q.includes('‘참고 링크’'), q);
  }
  assert.equal(goalLine(prompt, [loop]), '참고 링크를 반복하는 게임이에요.');
  assert.equal(decisions([loop])[0].decision, url);
});

test('the model cannot close a core track nobody asked about', () => {
  const l = initialLedger('좀비가 나오는 편의점에서 하룻밤 버티기');
  const zero = Object.fromEntries(TRACK_KEYS.map((k) => [k, 0]));
  const m = mergeLedger(l, zero, ['fun', 'loop', 'role']);
  assert.equal(m.fun, 0);
  assert.equal(m.mood, 0);
  assert.equal(m.win, l.win); // never asked: keeps its own score
  assert.ok(overall(m) <= 0.2);
  assert.equal(shouldStop(m, 3), false); // so the interview goes on to ask 이기고 지는 조건
  assert.equal(shouldStop(mergeLedger(l, zero, ['fun', 'loop', 'win']), 3), true);
});

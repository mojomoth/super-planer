// Self-check: npm test -w plan-doc  (node --test; Node 22.6+ strips the .ts types)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_IMAGE_MODEL, IMAGE_PROMPT_MAX, imageFromResponse, imageRequestBody, nameFromPrompt, openaiError, promptDraft } from './imagegen.ts';
import { sourceLabel } from './assemble.ts';
import { sniffImage } from './images.ts';

test('request body: model, landscape size, webp; no response_format/style/user', () => {
  const body = imageRequestBody('버섯굴 입구', DEFAULT_IMAGE_MODEL);
  assert.deepEqual(body, { model: 'gpt-image-2.5-flare', prompt: '버섯굴 입구', size: '1536x1024', output_format: 'webp' });
  for (const k of ['response_format', 'style', 'user', 'n']) assert.ok(!(k in body), k);
  assert.equal(imageRequestBody('x', 'gpt-image-2').model, 'gpt-image-2');
});

test('imageFromResponse decodes data[0].b64_json, null otherwise', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
  const bytes = imageFromResponse({ created: 1, data: [{ b64_json: Buffer.from(png).toString('base64') }] });
  assert.deepEqual(new Uint8Array(bytes), png);
  assert.equal(sniffImage(bytes), 'image/png');
  for (const bad of [null, {}, { data: [] }, { data: [{}] }, { data: [{ b64_json: '' }] }, { data: [{ url: 'https://x/a.png' }] }, { data: [{ b64_json: 5 }] }]) assert.equal(imageFromResponse(bad), null);
  // decodes, but is not an image: the route's sniffImage check refuses it
  assert.equal(sniffImage(imageFromResponse({ data: [{ b64_json: Buffer.from('<svg/>').toString('base64') }] })), null);
});

test('openaiError: Korean head per status, short OpenAI message, never the key', () => {
  const key = 'sk-proj-SECRET123';
  const m401 = openaiError(401, { error: { message: `Incorrect API key provided: ${key}. You can find your API key at https://platform.openai.com/account/api-keys.` } }, key);
  assert.match(m401, /^OpenAI API 키가 맞지 않아요/);
  assert.ok(!m401.includes('SECRET123'), m401);
  assert.ok(!openaiError(401, { error: { message: 'Incorrect API key provided: sk-abc*****wxyz.' } }, 'other').includes('abc'));
  assert.match(openaiError(400, { error: { message: 'Your request was rejected by the safety system.', code: 'moderation_blocked' } }, key), /^안전 정책에 걸려/);
  assert.match(openaiError(429, { error: { message: 'Rate limit reached' } }, key), /^OpenAI 사용 한도에 걸렸어요\. .*\(OpenAI: Rate limit reached\)$/);
  assert.match(openaiError(500, null, key), /^OpenAI 쪽 오류로/);
  assert.equal(openaiError(404, { error: { message: 'x'.repeat(500) } }, key).length < 260, true);
});

test('promptDraft: decision titles and body starts plus the art instruction; empty with no decisions', () => {
  assert.equal(promptDraft([]), '');
  const draft = promptDraft([
    { title: '코어 루프', body: '결정: 하루는 **밤 탐험 → 아침 장사** 두 단계로 나눈다.\n\n1. 밤: 버섯굴에 내려간다' },
    { title: '아트와 분위기', body: null },
  ]);
  assert.match(draft, /^코어 루프: 하루는 밤 탐험 → 아침 장사 두 단계로 나눈다\. 1\. 밤: 버섯굴에 내려간다\n아트와 분위기\n\n/);
  assert.match(draft, /콘셉트 아트/);
  assert.match(draft, /글자나 UI 없이/);
  // '- ' list items become one comma-separated sentence, no stray markers
  assert.match(promptDraft([{ title: '아트', body: '결정: 둥근 실루엣으로 간다.\n\n- 2~3등신\n- 굴은 남색\n* 등불은 주황, **따뜻하게**' }]), /^아트: 둥근 실루엣으로 간다, 2~3등신, 굴은 남색, 등불은 주황, 따뜻하게\n/);
  assert.match(promptDraft([{ title: 'x', body: '- a\n- b' }]), /^x: a, b\n/);
  const long = promptDraft(Array.from({ length: 100 }, (_, i) => ({ title: `결정 ${i}`, body: '가'.repeat(500) })));
  assert.ok(long.length <= IMAGE_PROMPT_MAX && long.endsWith('그림만.'));
});

test('nameFromPrompt and source label', () => {
  assert.equal(nameFromPrompt('  버섯굴\n입구  '), '버섯굴 입구');
  assert.equal(nameFromPrompt('가'.repeat(100)).length, 60);
  assert.equal(nameFromPrompt(`${'가'.repeat(59)} 나다`), '가'.repeat(59)); // cut lands on a space: no trailing space
  assert.equal(sourceLabel('openai'), 'OpenAI');
});

// The card's sub-agent: replies in the chat and condenses the chat into a decision when the card is frozen.
import { completeJSON, type Provider } from './llm';
import { isHttpUrl, extractUrls } from './urls';
import { condense, parseBlocks } from './md';
import { generateImage, IMAGE_PROMPT_MAX } from './imagegen';
import type { Card, Message } from './store';

type Topic = { tips: string[]; page: string };
const TOPICS: [RegExp, Topic][] = [
  [/컨셉|개념|concept/i, { page: 'https://en.wikipedia.org/wiki/Game_design', tips: [
    '한 문장 소개를 먼저 정해요. "누가, 어디서, 무엇을 하는 게임"이면 충분해요.',
    '비슷한 게임 두 개를 고르고 둘과 다른 점 하나를 적어 봐요.',
    '플레이어가 처음 5분 동안 느낄 감정을 한 단어로 정해요.',
    '이 게임을 하지 않을 사람도 적어 보면 범위가 선명해져요.',
  ] }],
  [/루프|loop|반복/i, { page: 'https://en.wikipedia.org/wiki/Game_mechanics', tips: [
    '한 판을 행동 네 개로 쪼개고, 각 행동이 다음 행동의 재료가 되게 이어요.',
    '실패해도 남는 것 하나를 정해 두면 다시 하고 싶어져요.',
    '한 판 길이를 먼저 정하고 그 안에 들어갈 행동 수를 맞춰요.',
    '보상은 바로 쓰는 것과 모아 두는 것 두 종류로 나눠요.',
  ] }],
  [/캐릭터|인물|주인공|character/i, { page: 'https://en.wikipedia.org/wiki/Player_character', tips: [
    '주인공의 약점 하나가 플레이 방식이 되게 해요. 겁이 많으면 숨기 능력이 생기는 식이에요.',
    '이웃마다 원하는 것을 하나씩 정하면 부탁 퀘스트가 자연스럽게 생겨요.',
    '실루엣만 봐도 누구인지 알 수 있게 형태를 다르게 잡아요.',
    '말투 예시 문장을 캐릭터마다 두 줄씩 써 두면 대사 작업이 빨라져요.',
  ] }],
  [/레벨|맵|지도|스테이지|level/i, { page: 'https://en.wikipedia.org/wiki/Level_design', tips: [
    '방을 손으로 만든 조각으로 준비하고 순서만 섞으면 품질을 지키기 쉬워요.',
    '첫 방은 항상 안전하게 두고 규칙을 하나만 보여 줘요.',
    '돌아오는 길이 보이게 만들면 길을 잃는 스트레스가 줄어요.',
    '비밀 장소는 눈에 띄는 단서 하나로만 안내해요.',
  ] }],
  [/아트|그림|색|비주얼|art/i, { page: 'https://en.wikipedia.org/wiki/Concept_art', tips: [
    '색은 주인공용 강조색 하나와 배경색 셋으로 시작해요.',
    '같은 장면을 두 가지 스타일로 그려 비교한 뒤 고르는 게 빨라요.',
    '중요한 물건은 밝기 차이로 구분되게 해요. 색이 안 보이는 사람도 알아볼 수 있어요.',
    '참고 이미지를 세 장만 골라 팀 기준으로 삼아요.',
  ] }],
  [/수익|가격|돈|과금|monet/i, { page: 'https://en.wikipedia.org/wiki/Free-to-play', tips: [
    '처음엔 한 번 사는 가격 하나로 시작하고 추가 판매는 나중에 정해요.',
    '돈을 내면 빨라지는 것과 꾸밈만 바뀌는 것을 구분해요.',
    '비슷한 게임의 가격대를 세 개 찾아 비교해 봐요.',
  ] }],
  [/출시|범위|일정|release|scope/i, { page: 'https://en.wikipedia.org/wiki/Early_access', tips: [
    '첫 출시에 꼭 넣을 것 세 가지만 남기고 나머지는 업데이트로 미뤄요.',
    '플랫폼은 하나로 시작하면 테스트가 훨씬 쉬워요.',
    '친구 다섯 명에게 먼저 보여 줄 데모 범위를 정해요.',
  ] }],
  [/소리|사운드|음악|sound|music/i, { page: 'https://en.wikipedia.org/wiki/Video_game_music', tips: [
    '장소마다 음악 분위기를 한 단어로 정해요.',
    '중요한 행동에는 짧은 효과음을 붙여 손맛을 줘요.',
  ] }],
];
const DEFAULT_TOPIC: Topic = { page: 'https://en.wikipedia.org/wiki/Roguelike', tips: [
  '지금 정할 것 하나와 나중에 정할 것 하나를 나눠 적어요.',
  '비슷한 게임에서 좋았던 장면 하나를 골라 이유를 적어 봐요.',
  '플레이어가 이 부분에서 무엇을 느끼면 좋을지 한 단어로 정해요.',
] };

/** Deterministic reply used for LLM_PROVIDER=mock and whenever the model fails: text, a reference page and a picture brief. */
export function fallbackReply(card: Pick<Card, 'title' | 'description'>, userText: string, turn: number) {
  const topic = TOPICS.find(([re]) => re.test(`${card.title} ${card.description}`))?.[1] ?? DEFAULT_TOPIC;
  const tips = [0, 1, 2].map((k) => topic.tips[(turn + k) % topic.tips.length]);
  // condense drops URLs first, so the cut never leaves a broken link for the gallery to preview;
  // it also drops label lines ("참고", "…:"), so an empty quote does not mean the user sent only a link
  const quote = condense(userText, 40) || '보내 준 내용';
  const reply = `**${card.title}** 기준으로 "${quote}"에 맞춰 정리해 봤어요.

${[...new Set(tips)].map((t) => `- ${t}`).join('\n')}

마음에 드는 쪽을 골라 주면 그 방향으로 더 좁혀 볼게요.`;
  // an imported step1 card's description is its question, which is no scene to draw
  const about = card.description.trim().endsWith('?') ? '' : card.description;
  const imagePrompt = [card.title, about, condense(userText, 300)].map((s) => s.trim()).filter(Boolean).join(' / ');
  return { reply, references: [topic.page], imagePrompt };
}

/** The agent's next message for a card, given the stored history (which already ends with the user's message). */
export async function agentReply(
  workflowTitle: string,
  card: Card,
  history: Message[],
): Promise<{ content: string; provider: Provider; error?: string }> {
  const userText = history.at(-1)?.content ?? '';
  const turn = history.filter((m) => m.role === 'user').length;
  const fallback = () => fallbackReply(card, userText, turn);
  const system = `너는 게임 기획 팀의 하위 에이전트다. 게임 "${workflowTitle}"의 "${card.title}" 카드를 맡았다 (${card.description}).
15~20세도 바로 이해할 쉬운 한국어로, 구체적인 제안 2~4개를 짧게 답한다. 과장된 표현과 지어낸 수치는 쓰지 않는다.
참고 URL을 1~3개 고른다: 실제로 있는 위키백과나 공식 문서 페이지 주소만. 이미지 주소는 넣지 않는다.
예시 그림 한 장이 제안을 이해하는 데 도움이 되면 imagePrompt에 그릴 장면을 한두 문장으로 묘사한다(글자, 로고, 실존 인물 없이). 필요 없으면 빈 문자열.
JSON만 출력한다: {"reply": "마크다운(문단, - 목록, **굵게**) 답변. URL은 넣지 않는다", "references": ["https://..."], "imagePrompt": "..."}`;
  const transcript = history.slice(-12).map((m) => `${m.role === 'user' ? '사용자' : '에이전트'}: ${m.content}`).join('\n\n');
  const r = await completeJSON<{ reply?: unknown; references?: unknown; imagePrompt?: unknown }>(system, transcript, fallback);

  let data = r.data;
  let meta = { provider: r.provider, error: r.error };
  if (typeof data?.reply !== 'string' || !data.reply.trim()) {
    data = fallback();
    meta = { provider: 'mock', error: r.error ?? 'model returned no reply' };
  }
  const reply = String(data.reply).trim().slice(0, 4000);
  const refs = (Array.isArray(data.references) ? data.references : [])
    .filter((u): u is string => typeof u === 'string' && u.length <= 500 && isHttpUrl(u) && !extractUrls(reply).includes(u))
    .slice(0, 4);

  // At most one image per answer; a failure (or no key) leaves an honest line instead, never a stand-in picture.
  const brief = typeof data.imagePrompt === 'string' ? data.imagePrompt.trim().slice(0, 1000) : '';
  const parts = [reply];
  if (brief) {
    const tail = `\n\n게임 "${workflowTitle}" 기획 회의에 붙일 예시 콘셉트 아트 한 장. 화면에 글자나 UI 없이 그림만.`;
    const img = await generateImage((brief + tail).slice(0, IMAGE_PROMPT_MAX), card.id);
    parts.push('url' in img ? `예시 이미지: ${img.url}` : `예시 이미지: ${condense(img.error, 300)}`);
  }
  if (refs.length) parts.push(`참고:\n${refs.map((u) => `- ${u}`).join('\n')}`);
  return { content: parts.join('\n\n'), ...meta };
}

/** One to three sentences of what the chat settled on. Fallback: the user's answer if they had the last word, else the last agent message, condensed. */
export async function decisionFor(card: Card, history: Message[]): Promise<{ decision: string; provider: Provider; error?: string }> {
  // only imported step1 cards end on the user (agent question, user answer): that answer is the decision, as on import
  const last = history.at(-1);
  const lastAgent = [...history].reverse().find((m) => m.role === 'agent');
  // prefer the suggestions (list items) over the reply's framing sentences
  const gist = (text: string) => {
    const items = parseBlocks(text).flatMap((b) => (b.t === 'p' ? [] : b.items)).filter((i) => condense(i));
    return condense(items.length ? items.join('\n') : text);
  };
  const fallback = () => ({ decision: (last?.role === 'user' && last.content.trim()) || (lastAgent && gist(lastAgent.content)) || card.description || card.title });
  if (!history.length) return { decision: fallback().decision, provider: 'mock' };
  const system = `게임 기획 카드 "${card.title}" (${card.description})의 대화를 읽고, 합의된 결정을 한국어 1~3문장으로 요약한다.
결정이 분명하지 않으면 가장 최근 제안을 결정으로 적는다. URL과 지어낸 수치는 넣지 않는다. JSON만 출력한다: {"decision": "..."}`;
  const transcript = history.slice(-20).map((m) => `${m.role === 'user' ? '사용자' : '에이전트'}: ${m.content}`).join('\n\n');
  const r = await completeJSON<{ decision?: unknown }>(system, transcript, fallback);
  const decision = typeof r.data?.decision === 'string' ? r.data.decision.trim().slice(0, 800) : '';
  return decision ? { decision, provider: r.provider, error: r.error } : { ...fallback(), provider: 'mock', error: r.error ?? 'model returned no decision' };
}

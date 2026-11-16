import path from 'node:path';
import { db } from './db';

// plan-doc owns only plan_inputs and plan_docs (see pocs/CONTRACT.md).
export const UPLOAD_DIR = path.join(process.cwd(), '..', '.data', 'uploads');

export type InputRow = { id: string; kind: 'decision' | 'image'; title: string; body: string | null; url: string | null; source: string | null; created_at: string };
export type DocRow = { id: string; title: string; markdown: string; provider: string | null; created_at: string };

const g = globalThis as unknown as { __planDocInit?: boolean };

export function store() {
  const d = db();
  if (!g.__planDocInit) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS plan_inputs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT, url TEXT, source TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plan_docs (id TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, provider TEXT, created_at TEXT NOT NULL);
    `);
    const { n } = d.prepare('SELECT COUNT(*) AS n FROM plan_inputs').get() as { n: number };
    g.__planDocInit = true;
    if (n === 0) seed();
  }
  return d;
}

export const now = () => new Date().toISOString();

export function listInputs(): InputRow[] {
  return store().prepare('SELECT * FROM plan_inputs ORDER BY created_at, id').all() as InputRow[];
}

export function listDocs(): Omit<DocRow, 'markdown'>[] {
  return store().prepare('SELECT id, title, provider, created_at FROM plan_docs ORDER BY created_at DESC LIMIT 50').all() as Omit<DocRow, 'markdown'>[];
}

const SEED_DECISIONS: [string, string][] = [
  [
    '게임 가제와 한 줄 소개',
    `결정: 가제는 '버섯굴 수프집'으로 간다.

- 가제: 버섯굴 수프집
- 한 줄 소개: 고슴도치 요리사가 밤마다 버섯굴에 내려가 재료를 모으고, 아침에는 그 재료로 수프를 파는 느긋한 로그라이트
- 장르: 코지 로그라이트
- 플랫폼: PC(Steam) 먼저, 반응을 보고 Switch 검토
- 타깃: 하루 20분 정도 짧게 끊어 하는 15~25세 플레이어`,
  ],
  [
    '코어 루프',
    `결정: 하루는 '밤 탐험 → 아침 장사' 두 단계로 나눈다.

1. 밤: 등불을 들고 버섯굴에 내려간다 (방 3~5개, 매번 새로 생성)
2. 재료를 캐고, 길을 막는 벌레는 피하거나 가볍게 쫓아낸다
3. 등불 기름이 떨어지기 전에 돌아온다. 쓰러지면 재료의 절반만 챙긴다
4. 아침: 모은 재료로 수프를 끓여 손님에게 판다
5. 번 돈으로 등불, 가방, 냄비를 고쳐 다음 밤을 준비한다`,
  ],
  [
    '전투와 실패 규칙',
    `결정: 전투는 '피하기'가 중심이고, 실패해도 크게 잃지 않는다.

- 공격 버튼은 하나(국자 휘두르기), 대신 구르기와 숨기가 더 강하다
- 쓰러져도 배운 레시피와 단골 손님은 그대로 남는다
- 열린 질문: 보스를 넣을지, 넣는다면 주마다 한 번이 적당한가?
- 리스크: 긴장감이 너무 낮으면 로그라이트 팬이 금방 지루해할 수 있다`,
  ],
  [
    '아트와 분위기',
    `결정: 둥근 실루엣과 따뜻한 등불 빛, 차가운 굴 배경의 대비로 간다.

- 캐릭터는 2~3등신, 굵은 외곽선 없는 평면 채색
- 굴은 남색과 청록, 등불이 닿는 곳만 주황빛
- 수프 가게는 나무와 크림색으로, 굴과 정반대의 아늑함
- 소리는 물방울, 보글보글 끓는 소리 위주로 조용하게`,
  ],
  [
    '수프 가게 운영',
    `결정: 장사는 계산 게임이 아니라 손님 취향을 맞히는 퍼즐로 만든다.

- 아침마다 손님 3명이 오고, 각자 취향 힌트를 한 줄 남긴다
- 취향을 맞히면 '단골도'가 오르고, 단골이 다음 밤에 쓸 도구를 준다
- 레시피는 재료 3칸 조합, 새 조합을 찾으면 도감에 기록된다
- 열린 질문: 가격 흥정을 넣으면 느긋한 분위기가 깨지지 않을까?`,
  ],
];

const SEED_IMAGES: [string, string][] = [
  ['캐릭터 콘셉트: 등불을 든 고슴도치 요리사', '/samples/character.svg'],
  ['레벨 콘셉트: 등불이 닿는 버섯굴 방', '/samples/level.svg'],
  ['UI 시안: 수프 레시피 3칸 조합 화면', '/samples/ui.svg'],
  ['분위기: 새벽의 수프 가게', '/samples/mood.svg'],
];

/** Insert the sample game inputs. Fixed ids, so running it twice changes nothing. */
export function seed() {
  const d = db();
  const ins = d.prepare('INSERT OR IGNORE INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const t = Date.now();
  SEED_DECISIONS.forEach(([title, body], i) => ins.run(`seed-d${i + 1}`, 'decision', title, body, null, 'seed', new Date(t + i).toISOString()));
  SEED_IMAGES.forEach(([title, url], i) => ins.run(`seed-i${i + 1}`, 'image', title, null, url, 'seed', new Date(t + 10 + i).toISOString()));
}

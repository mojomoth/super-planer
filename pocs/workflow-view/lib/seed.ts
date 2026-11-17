// Sample game workflow, inserted once when wf_workflows is empty so the PoC can be reviewed alone.
// Local sample images are root-relative with this app's basePath (/workflow/samples/...), so plan-doc on the same origin can show them too.
// The .jpg ones were made once with the OpenAI Images API (the same request as lib/imagegen.ts) and committed.
const S = '/workflow/samples';

type SeedCard = {
  key: string;
  title: string;
  description: string;
  status: 'active' | 'frozen' | 'cancelled';
  decision?: string;
  x: number;
  y: number;
  messages: ['agent' | 'user', string][];
};

export const SEED: { title: string; cards: SeedCard[]; edges: [string, string][] } = {
  title: '포근한 던전 정원 (예시)',
  cards: [
    {
      key: 'concept', title: '컨셉', description: '어떤 게임인지 한 문장으로 정하기', status: 'frozen', x: 0, y: 160,
      decision: '고양이 정원사가 매일 모양이 바뀌는 지하 정원을 짧게 탐험해 씨앗을 모으고, 지상의 오두막 정원을 키우는 포근한 로그라이크.',
      messages: [
        ['agent', `로그라이크의 **매번 달라지는 탐험**과 포근한 게임의 **돌아올 집**을 묶는 방향을 제안해요.

- 지하: 매일 바뀌는 정원 던전, 실패해도 씨앗 일부는 남아요
- 지상: 계속 자라는 오두막 정원
- 분위기: 싸움보다 모으기와 피하기

예시 이미지: ${S}/concept-garden.jpg

참고:
- https://en.wikipedia.org/wiki/Roguelike`],
        ['user', '좋아요. 싸움은 최소로 하고 싶어요.'],
        ['agent', `그럼 위협을 **시간**으로 두는 걸 추천해요. 등불이 꺼지기 전에 지상으로 돌아와야 하니 긴장감은 남고 싸움은 줄어요.

참고: https://en.wikipedia.org/wiki/Cozy_game`],
      ],
    },
    {
      key: 'loop', title: '코어 루프', description: '한 판 동안 플레이어가 반복하는 행동', status: 'frozen', x: 380, y: 0,
      decision: '등불을 켜고 지하 정원 탐험 → 씨앗과 재료 모으기 → 등불이 꺼지기 전 귀환 → 오두막 정원에 심기 → 수확물로 도구 해금 → 다시 탐험.',
      messages: [
        ['agent', `한 판의 흐름을 이렇게 잡아 봤어요.

1. 등불을 켜고 지하 정원에 들어가요
2. 방마다 씨앗, 이슬, 버섯을 모아요
3. 등불이 꺼지기 전에 돌아와요
4. 지상에 심고 다음 날 수확해요

흐름도 시안: ${S}/core-loop.svg
비슷한 구조: https://en.wikipedia.org/wiki/Hades_(video_game)`],
        ['user', '수확물로는 뭘 할 수 있어요?'],
        ['agent', `두 갈래로 써요.

- **도구 해금**: 덩굴 갈고리, 반딧불 병
- **이웃 부탁**: 마을 동물에게 요리를 전하면 이야기가 진행돼요

루프는 이 캔버스처럼 노드로 그려 두면 고치기 쉬워요: https://github.com/xyflow/xyflow`],
      ],
    },
    {
      key: 'character', title: '캐릭터', description: '주인공과 이웃의 성격, 역할', status: 'active', x: 380, y: 340,
      messages: [
        ['agent', `주인공 후보는 둘이에요.

- **모모**: 겁 많지만 냄새로 씨앗을 찾는 고양이
- **보리**: 느긋한 두더지, 땅굴로 지름길을 내요

캐릭터 시트 초안: ${S}/character-sheet.svg
예시 이미지: ${S}/character-candidates.jpg`],
        ['user', '모모로 갈게요. 이웃은 몇 명이 좋을까요?'],
        ['agent', `첫 출시 범위라면 이웃 네 명이 알맞아요. 좋아하는 작물이 서로 달라서 무엇을 심을지 고를 이유가 생겨요.

- 고슴도치 우체부
- 부엉이 도서관지기
- 개구리 요리사
- 거북이 할머니

참고: https://en.wikipedia.org/wiki/Player_character`],
      ],
    },
    {
      key: 'level', title: '레벨 디자인', description: '지하 정원의 방 구성과 매일 바뀌는 규칙', status: 'active', x: 760, y: 0,
      messages: [
        ['agent', `손으로 만든 방 조각을 매일 섞어 이어 붙이는 방식을 제안해요. 완전한 무작위보다 품질을 지키기 쉬워요.

- 방 종류: 입구방, 수집방, 쉼터, 비밀방
- 날씨에 따라 물길과 덩굴 위치가 바뀌어요

지도 시안: ${S}/garden-map.svg
참고:
- https://en.wikipedia.org/wiki/Procedural_generation
- https://en.wikipedia.org/wiki/Level_design`],
        ['user', '비밀방은 어떻게 찾아요?'],
        ['agent', `벽에 핀 빛나는 꽃을 따라가면 열리게 해요. 냄새로 찾는 모모의 능력과도 잘 맞아요.

예시 이미지: ${S}/level-secret-room.jpg`],
      ],
    },
    {
      key: 'art', title: '아트 방향', description: '색감, 형태, 화면 분위기', status: 'active', x: 760, y: 340,
      messages: [
        ['agent', `따뜻하고 차분한 색에 둥근 형태를 추천해요. 지하는 푸른 그림자, 지상은 노을빛으로 대비를 줘요.

팔레트 시안: ${S}/palette.svg
분위기 참고:
- ${S}/art-underground.jpg
- ${S}/art-surface.jpg
- https://en.wikipedia.org/wiki/Concept_art`],
        ['user', '픽셀 아트도 괜찮을까요?'],
        ['agent', `괜찮아요. 다만 작은 화면에서도 씨앗 종류가 구분돼야 해요. 픽셀 버전과 손그림 버전으로 방 하나씩 그려 보고 고르는 걸 추천해요.

참고: https://en.wikipedia.org/wiki/Pixel_art`],
      ],
    },
    {
      key: 'money', title: '수익 모델', description: '가격과 추가 판매 방식', status: 'cancelled', x: 1140, y: 0,
      messages: [
        ['agent', `부분 유료화보다 한 번 사는 유료 게임을 추천해요. 포근한 게임을 찾는 사람은 광고와 뽑기를 싫어하는 편이에요.

참고:
- https://en.wikipedia.org/wiki/Free-to-play
- https://en.wikipedia.org/wiki/Downloadable_content`],
        ['user', '이건 출시 범위를 정한 다음에 다시 볼게요.'],
      ],
    },
    {
      key: 'release', title: '출시 범위', description: '첫 출시에 넣을 것과 뺄 것', status: 'active', x: 1140, y: 340,
      messages: [
        ['agent', `첫 출시는 작게 잡는 걸 제안해요.

- 넣을 것: PC 한 플랫폼, 지하 정원 한 지역, 이웃 네 명
- 뺄 것: 계절 이벤트, 협동 플레이

예시 이미지: ${S}/release-slice.jpg

참고:
- https://en.wikipedia.org/wiki/Early_access`],
      ],
    },
  ],
  edges: [
    ['concept', 'loop'], ['concept', 'character'], ['loop', 'level'], ['character', 'art'],
    ['level', 'money'], ['level', 'release'], ['art', 'release'],
  ],
};

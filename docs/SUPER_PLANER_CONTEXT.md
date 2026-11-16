# Supler Planer

게임 기획자를 위한 워크플로우 시각화 서비스

## 개발 스택
- Next.JS
- Sqlite

## 필요 도구
- https://github.com/dietrichgebert/ponytail 개발 코드를 간략하게 구현
- https://github.com/nutlope/hallmark AI Slop 제거 

## PoC

pocs 폴더에 아래 PoC들을 구현한다. 구현된 내용은 간단하게 web 으로 확인하도록 해야한다.

- 바이브하게 기획 프롬프트 입력하면 소크라테스식 질문하기
- 워크플로우(like, n8n) 시각화도구 구현하기
- 시각화도구의 카드는 에이전트 채팅세션처럼 보여주기
- 카드 내부에 링크와 이미지 프리뷰가 보여주기 
- 카드에서 결정 사항 정리되면 '기획서'로 만들기

### 1. 바이브하게 프롬프트 입력 소크라테스식 질문하기 
- pocs/step1 에 구현한다
- input: 텍스트 프롬프트, output: 질문 워크플로우, 게임 이름, 간단한 설명
- https://github.com/Q00/ouroboros 우로보로스 에이전트 하네스의 소크라테스식 질문 과 답변 방법을 참고해서 가져온다.
- 첫번째 질문을 하면 순차적으로 답변을 하는 Q/A UX를 구현한다.
- 첫번째프롬프트 -> { 질문 -> 답변(선택/입력 혼합) }x반복 -> 
- https://github.com/dreambigou/eli5 의 방식을 가져와서 15~20세의 인지로 이해가 가능한 질문을 만들어야한다. 
- 답변이 모두 완성되면 게임 이름(가제)와 컨셉등을 https://github.com/dreambigou/eli5 형식으로 보여준다.

### 2. n8n과 같은 워크플로우 시각화 도구
- pocs/workflow-view
- 전체 캔버스에 n8n과 같이 카드와 연결 커넥터로 이루어져있는 시각화 도구를 구현한다.
- 워크플로우의 카드는 '타이틀', '설명', 확장/축소 버튼, 동결(complete)/취소(undo)버튼, 상태(진행중/동결/취소)
- 카드의 확장 상태에서는 에이전트 대화 세션처럼 보여져야한다.
- 대화세션에서 답변 부분에서 url 로 표시되는 부분은 preview가 보여져야한다. preview는 gallery 형태로 슬라이드 또는 격자로 보여준다.

### 3. 기획서 생성 도구 
- pocs/plan-doc 구현한다. 
- input: 바이브하게 생성된 에이전트 결정 문서들, 바이브하게 생성된 이미지 예시들, output: Markdown Preview로 구현된 기획 문서
- 구현된 doc는 Markdown형식이며 Markdown Preview로 보여진다. 
- Markdown 내부의 이미지가 보여져야한다. 

## Design
# Super Planer 디자인 예시

`docs/design`의 스케치와 `assets/super-planer-logo.svg`를 참고해 만든 데스크톱 UI 목업입니다. shadcn/ui의 밝은 중립색 표면, 얇은 테두리, 카드, 버튼, 입력 필드, 배지, 탭을 바탕으로 로고의 인디고(`#4F46E5`)를 주요 동작에 사용했습니다.

예시 프로젝트 **달빛 우체국**이 아이디어 입력부터 기획서 생성까지 이어집니다. 프로젝트명과 게임 내용은 화면 설명을 위한 가상 예시입니다.

| 이미지 | 화면 | 스케치 요소 |
| --- | --- | --- |
| [01-prompt-entry.png](01-prompt-entry.png) | 로고와 프롬프트 입력, 참고 자료 첨부, 기획 시작 | 1, 2 |
| [02-guided-questions.png](02-guided-questions.png) | 질문 진행률, 답변 선택, 직접 입력 | 3 |
| [03-workflow-canvas.png](03-workflow-canvas.png) | 프로젝트명과 설명, 노드 연결, 상태, 확장, 기획서 생성 | 4, 5, 6, 8 |
| [04-expanded-node-chat.png](04-expanded-node-chat.png) | 확장된 노드의 에이전트 대화, 이미지·링크 참고 자료, 결정 확정 | 7, 8 |
| [05-plan-document-preview.png](05-plan-document-preview.png) | 기획서 목차, 문서 미리보기, Markdown 탭, 내보내기 | 8, 9 |

## 생성 기록

내장 `image_gen` 도구로 생성했습니다. 공통 시각 규칙과 화면별 최종 프롬프트는 [design-prompts.json](design-prompts.json)에 저장했습니다. 첫 화면 생성 이후 나머지 화면에는 첫 화면을 스타일 참고 이미지로 추가했습니다. 원본 SVG는 수정하지 않았으며 `.references/super-planer-logo.png`는 생성 도구에 전달하기 위한 PNG 변환본입니다.

이 이미지는 디자인 검토용 래스터 목업입니다. 실제 shadcn/ui 컴포넌트로 구현한 실행 화면이나 편집 가능한 Figma 파일은 아닙니다. 구현 시 원본 SVG 로고와 실제 텍스트를 사용하면 됩니다.

## 참고

- [shadcn/ui Card](https://ui.shadcn.com/docs/components/base/card)
- [v0](https://v0.app/)
- [Lovable](https://lovable.dev/)
- [Replit](https://replit.com/)

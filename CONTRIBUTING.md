# 협업 규칙

## 브랜치

| 브랜치 | 용도 | 규칙 |
|---|---|---|
| `main` | 배포·제출용 | 직접 푸시 금지. `develop`에서 PR로만 병합 |
| `develop` | 개발 통합 (기본 브랜치) | 직접 푸시 금지. 작업 브랜치에서 PR로 병합 |
| `feat/기능명` | 새 기능 | `develop`에서 분기 |
| `fix/내용` | 버그 수정 | `develop`에서 분기 |
| `docs/내용` | 문서 | `develop`에서 분기 |
| `chore/내용` | 설정·빌드·기타 | `develop`에서 분기 |

브랜치 이름은 영어 소문자와 하이픈으로 씁니다. 예: `feat/quest-map`, `fix/login-token`

## 작업 순서

```bash
git switch develop
git pull
git switch -c feat/quest-map
# 작업 후
git push -u origin feat/quest-map
```

그다음 GitHub에서 `develop`으로 PR을 열고, 팀원 1명의 확인을 받아 병합합니다.

## 커밋 메시지

`타입: 내용` 형식으로 씁니다.

| 타입 | 용도 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 |
| `refactor` | 동작 변화 없는 코드 개선 |
| `style` | 코드 동작에 영향을 주지 않는 포맷 변경 |
| `docs` | 문서 추가 또는 수정 |
| `test` | 테스트 |
| `chore` | 설정·빌드·기타 |
| `revert` | 이전 커밋 되돌리기 |
| `merge`| 브랜치 병합 |

예: `feat: 퀘스트 지도 핀 표시`

## 주의

- API 키, 비밀번호, `.env` 파일은 커밋하지 않습니다.
- 값이 필요한 환경 변수는 `.env.example`에 이름만 적어 둡니다.

## API 통신 분리

페이지에서 직접 HTTP 요청을 처리하기보다 API 계층과 Hooks를 분리합니다.

- **Axios:** HTTP 요청 처리
- **TanStack Query:** 서버 상태 조회, 캐싱, 갱신
- **React Hook Form:** 입력 폼 상태 관리
- **Zod:** 입력값 검증 및 타입 정의

AI 모델 호출, 이미지 임베딩 비교, 최종 위치 검증은 서버에서 처리합니다. 프론트엔드는 입력 수집, 요청 및 결과 표시를 담당합니다.

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 파일 | PascalCase | `QuestCard.tsx` |
| 페이지 파일 | PascalCase | `QuestDetailPage.tsx` |
| Hooks | camelCase, use 접두사 | `useQuestDetail.ts` |
| 유틸리티 | camelCase | `formatDate.ts` |
| 타입 | PascalCase | `QuestDetail` |
| 폴더 | 소문자 | `components/`, `hooks/` |

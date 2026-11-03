# 그리움 퀘스트 — Frontend

떠난 사람이 그리워하는 대구·경북의 장소를, 남아 있는 사람과 여행자가 퀘스트로 대신 다녀와 안부를 전하는 서비스입니다.

## 👥 TEAM

| 👑 BE / Leader | ⚙️ BE | 💻 FE | 💻 FE | 🤖 AI | 🎨 DESIGN |
| :---: | :---: | :---: | :---: | :---: | :---: |
| <img src="https://github.com/psj-1228.png" width="100" height="100" alt="박성준" /> | <img src="https://github.com/kyj5311.png" width="100" height="100" alt="김영재" /> | <img src="https://github.com/Hengjju.png" width="100" height="100" alt="정형주" /> | <img src="https://github.com/njm0927.png" width="100" height="100" alt="남재민" /> | <img src="https://github.com/YounghanKang.png" width="100" height="100" alt="강영한" /> |<img src="https://github.com/oseun33.png" width="100" height="100" alt="오세은" /> |
| [박성준](https://github.com/psj-1228) | [김영재](https://github.com/kyj5311) | [정형주](https://github.com/Hengjju) | [남재민](https://github.com/njm0927) | [강영한](https://github.com/YounghanKang) | [오세은](https://github.com/oseun33) |

<br>

## 1. 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 용도 |
|---|---|---|
| Framework | React 19 + TypeScript 6.0.3 | 프론트엔드 개발 |
| Build Tool | Vite 8| 개발 서버 및 프로덕션 빌드 |
| Styling | Tailwind CSS  | UI 스타일링 및 Vite 연동 |
| UI Components | shadcn/ui | 재사용 가능한 UI 컴포넌트 |
| Routing | React Router | 페이지 라우팅 |
| Server State | TanStack Query | 서버 데이터 조회 및 캐싱 |
| HTTP Client | Axios | 백엔드 API 통신 |
| Form | React Hook Form | 입력 폼 및 상태 관리 |
| Validation | Zod | 입력 데이터 검증 및 타입 추론 |
| Animation | Motion (Framer Motion) | UI 애니메이션 |
| Icons | Lucide React | 아이콘 |
| Package Manager | npm | 패키지 관리 |

<br>

## 2. 📁 프로젝트 폴더 구조 (Project Structure)

Feature-based Architecture를 기반으로 기능별 코드를 분리합니다.

```text
src/
├── app/                       # 애플리케이션 전역 설정
│   ├── layouts/               # 공통 레이아웃
│   ├── providers/             # 전역 Provider
│   ├── router.tsx             # 라우팅 설정
│   └── App.tsx                # 앱 진입 컴포넌트
│
├── features/                  # 기능별 코드
│   ├── auth/                  # 로그인 및 회원가입
│   ├── quests/                # 지도, 등록, 상세, 수행 및 인증
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── components/        # 퀘스트 전용 UI
│   │   ├── forms/             # 폼 및 Zod 스키마
│   │   ├── api/               # 퀘스트 API
│   │   ├── hooks/             # 퀘스트 전용 Hooks
│   │   └── types/             # 퀘스트 타입
│   ├── memories/              # 내 그리움 및 도착한 안부
│   └── history/               # 수행 기록 및 스탬프 지도
│
├── shared/                    # 공통으로 사용하는 코드
│   ├── api/                   # Axios 공통 클라이언트
│   ├── components/            # 공통 UI 및 Motion 컴포넌트
│   ├── constants/             # 공통 상수
│   ├── hooks/                 # 공통 Custom Hooks
│   ├── lib/                   # 유틸리티 함수
│   ├── styles/                # 전역 스타일 및 디자인 토큰
│   └── types/                 # 공통 TypeScript 타입
│
└── main.tsx                   # React 진입점
```

<br>

## 3. 🚀 개발환경 실행 방법 (Getting Started)

### 요구 환경

- Node.js: 프로젝트 의존성과 호환되는 버전 사용
- npm: 패키지 매니저 통일

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 파일 생성
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev
```

기본 개발 서버 주소:

`http://localhost:5173`

### 코드 검사 및 빌드

```bash
# TypeScript 타입 검사
npm run typecheck

# ESLint 검사
npm run lint

# 프로덕션 빌드
npm run build
```

<br>

## 4. 📝 커밋 메시지

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

추가적인 브랜치와 커밋 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다.


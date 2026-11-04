# 수행 인증·마이페이지 와이어프레임 구현

첨부한 회색 와이어프레임의 레이아웃과 문구를 기준으로 구현했습니다.

## 실행

```sh
npm ci
npm run dev
```

## 화면

- `/me`, `/me/memories`: 프로필, 내 그리움/내 기록 숫자 카드, 그리움 목록, 하단 내비게이션
- `/me/memories?message=0`: 도착한 안부 편지, 좋아요, 다음 안부
- `/me/history`: 스탬프 지도 자리 및 수행 기록 카드
- `/me/logout`: 하단 로그아웃 확인 패널
- `/quests/demo/verify`: 이미지 퀘스트, 사진 선택, 안부 입력, 과거/지금 비교
- `/quests/demo/verify?type=general`: 사진 선택이 선택 사항인 일반 퀘스트
- `/quests/demo/verify?screen=checking`: 검증 중 화면 (데모 타이머 후 결과로 이동)
- `/quests/demo/verify?screen=success`: 84% 성공 예시
- `/quests/demo/verify?screen=failure`: 41% 실패 예시 및 재선택

인증 화면 아래의 미리보기 설정에서 일반/이미지와 성공/실패 데모를 선택할 수 있습니다. 실패 후에도 입력한 안부는 같은 페이지 상태에서 유지합니다.

## 데이터 및 연동 범위

실제 API 명세는 아직 없습니다. 프로필, 거리 32m, 그리움 3건, 기본 기록 2건, 안부, 지도 자리, 성공/실패 및 유사도는 모두 와이어프레임 예시입니다. 실제 위치 수집, 서버 검증, 사진 전송, 메시지 전송은 수행하지 않습니다. 선택한 사진은 브라우저 메모리에만 유지합니다. AI 검증 화면은 데모이며 실제 판정이 아닙니다. 기록 저장 버튼은 localStorage의 `geurium.demo.history`에 데모 기록을 추가합니다.

로그아웃은 로컬 accessToken/refreshToken 및 sessionStorage accessToken을 제거하고 기존 로그인 페이지로 이동합니다. 서버 세션 종료 및 인증 보호는 실제 인증 연동 시 구현해야 합니다. 좋아요 상태는 화면 내 데모 상태입니다.

파란 테두리는 원본 편집 도구의 선택 표시로 보고 화면 스타일에는 포함하지 않았습니다.

## 검증

npm run build, npm run lint 통과. 브라우저에서 마이페이지 목록 → 안부 편지 이동, 일반 퀘스트 메시지 입력 → 검증 중 → 성공 전환 및 실패 화면 표시를 확인했습니다.

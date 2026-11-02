# Ubuntu EC2 배포 연결

현재 상태: 로컬 설정 준비. EC2 접속 및 GitHub Secrets 등록, 실제 배포는 미완료.

`ci.yml`의 기존 검사 뒤에 deploy job을 추가하는 구성입니다. main push(또는 PR 병합)에서 검사 성공 시 배포하며, PR과 develop push는 기존 검사만 실행합니다. production용으로 다시 빌드합니다.

## 1. Ubuntu 서버 준비

먼저 기존 실행 방식과 Nginx 설정을 확인하세요. 아래는 새 Nginx 프론트 사이트를 만드는 예시이며 기존 사이트 설정을 자동으로 덮어쓰지 않습니다.

```bash
sudo apt-get update
sudo apt-get install -y nginx rsync curl
sudo nginx -T
sudo install -d -o ubuntu -g ubuntu -m 755 /var/www/frontend /var/www/frontend/releases
```

SSH 계정이 ubuntu가 아니면 위 소유자와 GitHub EC2_USER를 실제 계정으로 바꿉니다.
첨부 frontend.nginx.conf를 서버의 /tmp/frontend.nginx.conf로 전송하고 검토한 후:

```bash
sudo install -m 644 /tmp/frontend.nginx.conf /etc/nginx/sites-available/frontend
sudo ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/frontend
sudo nginx -t && sudo systemctl reload nginx
```

설정의 server_name에 실제 도메인 또는 EC2 공개 IP를 추가하세요. 배포 점검용 frontend.local 이름은 유지합니다. IP로 접속할 경우 기존 default 사이트와 우선순위 충돌이 없는지 확인합니다. HTTPS를 이미 사용한다면 기존 TLS 설정에 맞춰 통합하세요.

EC2 보안 그룹에서 웹 접속용 TCP 80(HTTPS 설정 후 443), 배포 실행기에서 접속 가능한 SSH 포트를 허용해야 합니다. GitHub 호스팅 실행기의 IP는 고정되어 있지 않습니다. SSH를 고정 IP로 제한한 서버라면 해당 네트워크에 접근 가능한 self-hosted runner 등으로 실행 환경을 조정해야 합니다.

## 2. 배포용 SSH 키

신뢰할 수 있는 본인 PC에서 전용 키를 생성합니다(기존 EC2 키를 덮어쓰지 마세요).

```bash
ssh-keygen -t ed25519 -f frontend-deploy -C github-frontend-deploy -N ""
```

공개키(frontend-deploy.pub) 한 줄을 EC2 배포 계정의 ~/.ssh/authorized_keys에 추가합니다. ~/.ssh 권한은 700, authorized_keys는 600으로 설정합니다. 개인키 frontend-deploy는 저장소나 채팅에 올리지 않고 GitHub Secret에만 넣습니다.

호스트 키는 EC2 콘솔 또는 기존의 검증된 접속에서 fingerprint를 확인합니다.

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

본인 PC에서 `ssh-keyscan -t ed25519 -p 22 EC2_HOST` 결과의 fingerprint를 대조한 뒤 검증된 known_hosts 한 줄 전체를 EC2_KNOWN_HOSTS에 등록합니다. 비표준 포트면 해당 포트로 조회하세요.

## 3. GitHub 설정

저장소 Settings → Environments에 production을 만들고 아래 값을 등록합니다. 환경을 main에서만 배포 가능하도록 제한하는 것을 권장합니다.

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | EC2_HOST | EC2 공개 IP 또는 DNS, 프로토콜 없이 |
| Secret | EC2_USER | 보통 ubuntu |
| Secret | EC2_SSH_KEY | 배포용 개인키 전체(시작/끝 줄 포함) |
| Secret | EC2_KNOWN_HOSTS | 검증한 SSH known_hosts 한 줄 |
| Variable | EC2_PORT | 기본 22, 생략 가능 |
| Variable | VITE_API_BASE_URL | 실제 브라우저에서 접근할 백엔드 URL, 예: https://api.example.com |

VITE_*는 브라우저에 공개되는 빌드 설정입니다. 비밀키를 넣지 마세요. 값이 없으면 앱은 /api를 사용합니다. 첨부 Nginx 설정은 백엔드 주소를 알 수 없어 /api/에 503을 반환하므로 실제 API 주소를 설정하거나 해당 location을 백엔드 reverse proxy로 바꿔야 합니다. API가 다른 출처라면 백엔드 CORS 설정도 필요합니다.

## 4. 변경 반영과 확인

팀 규칙대로 작업 브랜치 → develop PR → main PR 순서로 반영합니다. main 직접 push는 하지 않습니다.

GitHub Actions의 Frontend CI에서 check 및 deploy 성공을 확인한 후 실제 웹 주소에서 라우트 새로고침과 API 요청을 확인합니다. 서버 연결 정보가 없어서 이 단계는 아직 수행하지 않았습니다.

이 구성은 /var/www/frontend/releases 아래에 빌드를 저장하고 current 심볼릭 링크를 전환합니다. 로컬 HTTP 검사 실패 시 이전 링크로 복구합니다. 과거 releases는 자동 삭제하지 않으므로 운영 중 디스크 사용량을 확인하고 보관 정책을 정하세요.

## 참고

- https://vite.dev/guide/static-deploy.html
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

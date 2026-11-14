# AGENTS.md — AI 코딩 도우미 공통 규칙

이 저장소는 4명이 4시간 해커톤에서 동시에 작업한다. AI(ChatGPT·Codex·Claude 등)는 아래 규칙을 지킨다.

## 1. 수정 범위

작업 요청에 담당자(A/B/C/D)가 적혀 있으면 **그 담당 파일만 수정**한다. 범위 밖 수정이 필요하면 코드를 고치지 말고 "어느 파일을 왜 바꿔야 하는지"만 알려준다.

| 담당 | 수정 가능한 경로 |
|---|---|
| A 통합 | `index.html`, `js/main.js`, `manifest.webmanifest`, `README.md`, `AGENTS.md` |
| B 화면 | `style.css`, `js/certificate.js` |
| C 도구 | `js/tools/**`, `js/rope.js` |
| D 이펙트 | `js/fx.js`, `js/camera.js`, `js/score.js` |

## 2. 기술 규칙

- 빌드 도구·패키지 매니저 없음. 바닐라 JS ES modules + Canvas 2D. npm 패키지·프레임워크·`package.json` 추가 금지.
- 외부 이미지·사운드 파일 대신 Canvas 그리기와 WebAudio 합성을 쓴다.
- 좌표는 CSS 픽셀 기준(`main.js`가 devicePixelRatio 처리). 크기는 `Math.min(W, H)` 비율로 잡아 폰 화면에 맞춘다.
- 카메라 화면 위에 그려지므로 그래픽은 흰 테두리 + 진한 색처럼 어떤 배경에서도 보이게.
- 화면 문구는 한국어.

## 3. 바꾸면 안 되는 약속 (바꾸려면 팀 공지 먼저)

- 장비 인터페이스: `layout, reset, pointerDown, pointerMove, pointerUp, update, live, result, draw` (README 참고)
- `js/tools/index.js`의 `TOOL_DEFS` 형식: `{ name, emoji, create, hint }`
- `fx` 공개 함수 이름과 인자: `hit, popup, burst, shake, sound, vibrate, unlock, clear, offset, update, draw`, `theme.accent`
- `score.js` 내보내기: `SHOTS, BLOCK_THRESHOLD, shotPoints, summarize, grade, GRADES`
- `index.html`의 요소 id (`main.js`가 사용)

## 4. 작업 방식

- 변경은 작게. 한 번에 한 기능.
- 끝나면 `python3 -m http.server 5173`으로 열어 콘솔 오류가 없는지 확인.
- 커밋 메시지는 `[담당] 무엇을 했는지` 형식. 예: `[C] 스펀지 흔들기 판정 완화`

## 5. Git 규칙 (git 명령을 대신 실행하거나 안내할 때)

- 브랜치 이름: `아이디/번호/기능` (예: `yuni/3/sponge-squash`). main에서 직접 작업하지 않는다.
- 머지 전 최신화는 **rebase**: `git fetch origin && git rebase origin/main`. `git merge main`으로 최신화하지 않는다.
- rebase 충돌은 담당 파일 기준으로 해결한다. 다른 담당자 파일에서 충돌이 나면 임의로 고르지 말고 사람에게 알린다.
- main 반영은 fast-forward만: `git switch main && git pull origin main && git merge --ff-only <브랜치> && git push origin main`.
- `--ff-only`나 push가 실패하면 rebase부터 다시 한다.
- main에 force push 금지. 개인 브랜치는 rebase 후 `--force-with-lease`만 허용.

# AGENTS.md — 허공수비대 AI 협업 지침

이 저장소는 4명이 4시간 해커톤에서 동시에 작업한다. AI(ChatGPT·Codex·Claude 등)는 아래 지침을 따른다.
ChatGPT 공유 프로젝트의 지침과 같은 내용이다. 한쪽을 바꾸면 다른 쪽도 맞춘다.

## 1. 프로젝트

- 이름: 허공수비대 — 국가공인(가상) 허공 수비 자격시험
- 한 줄: 폰 후면 카메라로 실제 농구 경기를 비추고, 화면 위에 응원 도구(👆 손가락 팅, ☂️ 회전 우산, 🧽 스펀지)를 띄워 상대 자유투를 "허공 수비"하는 웹앱.
- 저장소: github.com/yuni450/heogong-defense (main 기준)
- 제한: 4명, 4시간. 완성도보다 "실제로 작동하는 시연"이 우선.

## 2. 사용 흐름

시험 접수(이름) → 응원팀 선택 → 카메라 화면 + 하단 툴바 → 선수가 서면 **[자유투!]** 버튼 → 3.5초 동안 도구로 방해 → 5회 후 성적표 → 가상 자격증 발급·저장·공유.

- 도구는 손가락에 붙어 출렁이고(OpenWhip식 로프 물리), 탭하거나 세게 휘두를 때마다 "딱!" 이펙트.
- 점수: "딱!" 1회 = 방해력 1/6, 60% 이상이면 BLOCK, 회당 20점(총 100점).
- 등급: 90+ 관중석 국가대표 / 70+ 프로 허공 수비수 / 50+ 응원단 연습생 / 그 외 자격 미달.
- 게이지 맞추기·속도 유지 같은 요구는 넣지 않는다. 휘두르면 바로 터지는 재미가 핵심.

## 3. 기술 규칙

- 빌드 도구 없음. 바닐라 HTML/CSS/JS(ES modules) + Canvas 2D.
- npm 패키지, 프레임워크, `package.json` 추가 금지.
- 이미지·사운드 파일 대신 Canvas 그리기와 WebAudio 합성 사용.
- 좌표는 CSS 픽셀 기준(`main.js`가 devicePixelRatio 처리). 크기는 `Math.min(W, H)` 비율로 잡아 폰 세로 화면에 맞춘다.
- 카메라 위에 그려지므로 그래픽은 흰 테두리 + 진한 색으로 어떤 배경에서도 보이게.
- 화면 문구는 한국어. 실제 구단명·로고 사용 금지(가상 팀만).
- 실행: `python3 -m http.server 5173`. 폰 카메라는 HTTPS에서만 동작.

## 4. 담당과 파일 소유권

작업 요청에 담당자(A/B/C/D)가 있으면 **그 담당 파일만 수정**한다. 범위 밖 수정이 필요하면 코드를 고치지 말고 "어느 파일을 왜, 누구에게 요청할지"만 알려준다.

| 담당 | 역할 | 수정 가능한 경로 |
|---|---|---|
| A | 통합·흐름·배포 | `index.html`, `js/main.js`, `manifest.webmanifest`, `README.md`, `AGENTS.md` |
| B | 화면 디자인·자격증 | `style.css`, `js/certificate.js` |
| C | 응원 도구 | `js/tools/**`, `js/rope.js` |
| D | 이펙트·사운드·카메라·점수 | `js/fx.js`, `js/camera.js`, `js/score.js` |

## 5. 바꾸면 안 되는 약속 (바꾸려면 팀 공지 먼저)

- 장비 인터페이스: `layout(W,H)`, `reset()`, `pointerDown(x,y,attempt)`, `pointerMove(x,y,attempt)`, `pointerUp()`, `update(dt,attempt)`, `live()→0..1`, `result()→0..1`, `draw(ctx)`
- 새 장비는 `js/tools/index.js`의 `TOOL_DEFS`에 `{ name, emoji, create, hint }`로 등록만 하면 툴바·점수에 자동 연결된다(`main.js` 수정 불필요).
- `fx`: `hit(x,y,word,{sound})`, `popup`, `burst`, `shake`, `sound`, `vibrate`, `unlock`, `clear`, `offset`, `update`, `draw` / `theme.accent`(응원팀 색)
- `score.js`: `SHOTS`, `BLOCK_THRESHOLD`, `shotPoints`, `summarize`, `grade`, `GRADES`
- `index.html`의 요소 id (`main.js`가 사용)

## 6. Git 규칙

- 브랜치: `아이디/번호/기능` (예: `yuni/3/sponge-squash`). main에서 직접 작업 금지.
- 머지 전 최신화는 **rebase**: `git fetch origin` → `git rebase origin/main`. `git merge main`으로 최신화하지 않는다. 충돌은 본인이 해결.
- 다른 담당자 파일에서 충돌이 나면 임의로 고르지 말고 그 담당자와 확인.
- main 반영은 fast-forward만: `git switch main` → `git pull origin main` → `git merge --ff-only <브랜치>` → `git push origin main`
- `--ff-only`나 push가 실패하면 rebase부터 다시. main에 force push 금지. 개인 브랜치는 rebase 후 `--force-with-lease`만 허용.
- 커밋 메시지: `[담당] 무엇을 했는지` (예: `[C] 스펀지 흔들기 판정 완화`)
- 20~30분 단위로 작게 자주 머지.

## 7. AI 응답 방식

- 질문자가 담당(A/B/C/D)을 밝히면 그 담당 파일 안에서만 코드를 제안한다.
- 코드는 파일 전체 또는 바꿀 부분을 정확한 위치와 함께 준다. 새 의존성은 제안하지 않는다.
- 해커톤이므로 가장 단순하게 동작하는 방법을 먼저 제안한다.
- 변경 후 `python3 -m http.server 5173`으로 열어 콘솔 오류가 없는지 확인하도록 안내한다.
- 마지막 45분(기능 동결)부터는 새 기능을 제안하지 말고 버그 수정·시연 준비만 돕는다.

## 8. 타임라인

| 시간 | 할 일 |
|---|---|
| 00:00–00:20 | 세팅·역할 확인 |
| 00:20–02:20 | 각자 개발, 작게 자주 머지 |
| 02:20–03:15 | 통합·버그 수정 |
| 03:15–04:00 | 기능 동결, 배포·시연 준비 |

# heogong-defense
2026젝커톤-허공수비대

> “선수들은 코트에서 수비하고, 우리는 관중석에서 수비한다!”

휴대폰 후면 카메라로 실제 농구 경기(또는 TV)를 비추고, 그 위에 응원 도구(👆 손가락 팅 · ☂️ 회전 우산 · 🧽 스펀지)를 띄워 상대 자유투를 "허공 수비"하는 웹앱.
우산·스펀지는 손가락에 붙어 움직이고(OpenWhip 방식의 로프 물리), 도구별 동작으로 방해 이펙트를 만든다. 손가락 팅은 인식된 튕김마다 방해력을 올린다. 농구에서는 구단별 짝짝이, 야구에서는 구단별 응원배트를 쓸 수 있다.
스펀지 막대는 기공 질감, 둥근 단면, 손잡이 띠가 있는 노란 폼 응원봉으로 표시하며, 하단 선택 버튼에도 같은 그림을 사용한다. 별도 이미지 파일 없이 Canvas로 그린다.

## 실행

빌드 도구 없음. 바닐라 HTML/CSS/JS(ES modules).

```bash
python3 -m http.server 5173
```

→ http://localhost:5173 (PC에서는 카메라 대신 체육관 배경으로 동작)

**폰 카메라는 HTTPS에서만 열린다.** 같은 Wi‑Fi에서 `http://<맥IP>:5173`으로 열면 화면·터치는 되지만 카메라는 막힘.
시연용 HTTPS 주소는 아래 중 하나:
- GitHub Pages: 저장소가 **비공개면 유료 플랜에서만** 가능. 공개로 바꾸면 Settings → Pages → `main` / root.
- 임시 터널: `brew install cloudflared && cloudflared tunnel --url http://localhost:5173`

## 사용 흐름

시험 접수(이름) → KBL/KBO 구단 선택 → 카메라 화면 + 하단 툴바
→ 선택한 도구로 바로 응원
→ 실제 자유투·투구 결과에 따라 **성공** 또는 **실패**를 눌러 기록하고 다음 회차 응원
→ 5회 후 성적표 → 총점 61점 이상이면 국가공인(가상) 허공 수비 자격증 발급·저장·공유

성공·실패 버튼을 누르면 해당 회차의 점수가 확정되고, 선택한 도구로 다음 회차를 바로 이어갈 수 있습니다. 성적표에는 실제 자유투·투구 성공/실패 횟수와 회차별 결과·점수가 표시됩니다.

손가락 팅을 선택하면 카메라에서 엄지와 검지를 모았다가 튕기는 동작을 인식한다. 영상이나 인식 모델을 사용할 수 없으면 화면 탭으로 전환한다. [손가락 카메라 연결 안내](js/tools/FINGER_CAMERA_INTEGRATION.md)

도구별 방해력:

- **손가락 팅·짝짝이·응원배트:** 인식된 튕김이나 탭 1회마다 방해력이 1/6 오른다. 회차 결과를 기록하면 방해력이 초기화된다.
- **우산·스펀지:** 기존 도구별 동작 판정을 유지하며, "딱!" 1회 = 방해력 1/6이다.

방해력 60% 이상이고 실제 슛을 놓쳤을 때 BLOCK. 실제 슛이 들어갔다고 선택하면 해당 시도는 0점. 놓쳤다고 선택하면 방해력에 따라 최대 20점(총 100점). 도중에 도구를 바꿔도 가장 높은 도구 방해력으로 채점한다. **총점 60점 이하 불합격으로 자격증 발급 불가**.

| 점수 | 등급 |
|---|---|
| 90~100 | 관중석 국가대표 |
| 70~89 | 프로 허공 수비수 |
| 61~69 | 응원단 연습생 (합격) |
| 0~60 | 자격 미달 (불합격·발급 불가) |

손가락 입력 회귀 검사는 Node.js가 설치된 환경에서 `node --test tests/*.test.mjs js/tools/tests/*.test.mjs`로 실행한다. 앱 실행에는 Node.js나 빌드 과정이 필요 없다.

구단 전용 도구(수원 KT 소용돌이·고양 소노 응원판·롯데 봉다리)는 해당 구단을 선택했을 때만 표시하며 기존 판정을 유지한다.

## 파일 구조와 담당 (충돌 방지용 파일 소유권)

**자기 담당 파일만 수정한다.** 다른 사람 파일을 고쳐야 하면 담당자에게 요청.

| 담당 | 역할 | 소유 파일 |
|---|---|---|
| **A** | 통합·흐름·배포 | `index.html`, `js/main.js`, `manifest.webmanifest`, `README.md`, `AGENTS.md` |
| **B** | 화면 디자인·자격증 | `style.css`, `js/certificate.js` |
| **C** | 응원 도구(미니게임) | `js/tools/**`, `js/rope.js` |
| **D** | 이펙트·사운드·카메라·점수 | `js/fx.js`, `js/camera.js`, `js/score.js` |

```
index.html            화면(접수/팀/HUD/성적표/자격증) 마크업           A
style.css             전체 스타일                                       B
manifest.webmanifest  PWA 설정                                          A
js/main.js            화면 전환, 자유투 시간창, 채점 흐름, 입력 전달    A
js/camera.js          후면 카메라 연결, 실패 시 배경 폴백               D
js/fx.js              파티클·팝업·충격 별·흔들림·효과음·진동            D
js/score.js           점수 환산·등급                                    D
js/certificate.js     자격증 이미지 생성                                B
js/rope.js            손에 쥔 막대의 로프 물리                          C
js/tools/index.js     장비 목록 (새 장비는 여기에 등록)                 C
js/tools/held.js      손에 쥐는 도구 공통(손가락 추적, '딱' 판정)       C
js/tools/finger.js    👆 손가락 팅                                      C
js/tools/umbrella.js  ☂️ 회전 우산                                      C
js/tools/sponge.js    🧽 스펀지 응원                                    C
```

## 모듈 간 약속 (바꾸려면 팀에 먼저 공유)

**장비 인터페이스** (`js/tools/*` → `main.js`가 호출)

```js
layout(W, H)                     // 화면 크기 바뀔 때
reset()                          // 자유투 시작 시 점수 초기화
pointerDown(x, y, attempt)       // attempt.active === true 일 때만 점수 반영
pointerMove(x, y, attempt)
pointerUp()
update(dt, attempt)
live()   -> 0..1                 // 현재 방해력 (HUD 바)
result() -> 0..1                 // 이번 자유투 최종 방해력
draw(ctx)
```

새 장비 추가: `js/tools/새장비.js` 작성 → `js/tools/index.js`의 `TOOL_DEFS`에 한 줄 등록. `main.js`는 안 건드려도 툴바·점수에 자동 연결됨.

**이펙트 API** (`js/fx.js`)

```js
fx.hit(x, y, '팅!', { sound: 'ting' })   // 도구 명중 공통 이펙트
fx.popup(text, x, y, { color, size, life })
fx.burst(x, y, color, n)
fx.shake(amount); fx.sound(name); fx.vibrate(ms)
theme.accent                               // 응원팀 색
```

**점수 API** (`js/score.js`): `SHOTS`, `BLOCK_THRESHOLD`, `shotPoints(r)`, `summarize(results)`, `grade(score)`

## 협업 규칙

1. 작업마다 **자기 브랜치**를 만든다. 이름은 `아이디/번호/기능` (예: `yuni/3/sponge-squash`).
   번호는 각자 작업 순번(또는 이슈 번호), 기능은 영어 소문자-하이픈.
2. 머지 전에 **main을 rebase해서 내 브랜치를 최신화**하고, 겹치는 부분은 내가 고친다.
3. 최신화가 끝나면 **main에 바로 머지**한다(fast-forward만, 머지 커밋 없이 일직선 히스토리).
4. 다른 사람 파일 수정 금지. 필요하면 담당자에게 요청.
5. 공통 약속(위 인터페이스)을 바꿀 때만 팀 공지.
6. 브랜치는 작게, 자주(20~30분 단위) 머지. 오래 들고 있을수록 충돌이 커진다.
7. **종료 45분 전부터 기능 추가 금지**. 버그 수정·배포·시연 준비만.

### 작업 순서 (명령어)

```bash
# 1) 최신 main에서 브랜치 생성
git switch main
git pull origin main
git switch -c yuni/3/sponge-squash

# 2) 작업 · 커밋
git add js/tools/sponge.js
git commit -m "[C] 스펀지 흔들 때 찌그러짐 추가"

# 3) main 기준으로 rebase (내 브랜치 최신화)
git fetch origin
git rebase origin/main
#   충돌 나면: 파일 고치기 → git add <파일> → git rebase --continue
#   되돌리고 싶으면: git rebase --abort

# 4) 동작 확인 (python3 -m http.server 5173, 콘솔 오류 없는지)

# 5) main에 바로 머지 후 푸시
git switch main
git pull origin main
git merge --ff-only yuni/3/sponge-squash
git push origin main

# 6) 다 쓴 브랜치 정리
git branch -d yuni/3/sponge-squash
```

- 5)에서 `--ff-only`가 실패하거나 `push`가 거절되면, 그 사이 누가 먼저 머지한 것. 내 브랜치로 돌아가 3)부터 다시.
- 브랜치를 원격에 백업해 뒀다면 rebase 후에는 `git push --force-with-lease origin <브랜치>` (main에는 절대 force push 금지).

AI(ChatGPT/Codex/Claude)로 작업할 때는 [AGENTS.md](AGENTS.md)를 함께 주고, 수정 가능한 경로를 명시할 것.

---

*국가공인은 유머를 위한 가상 설정이며 실제 공인 자격증이 아님.*

# heogong-defense
2026젝커톤-허공수비대

> “선수들은 코트에서 수비하고, 우리는 관중석에서 수비한다!”

휴대폰 후면 카메라로 실제 농구 경기(또는 TV)를 비추고, 그 위에 응원 도구(👆 손가락 팅 · ☂️ 회전 우산 · 🧽 스펀지)를 띄워 상대 자유투를 "허공 수비"하는 웹앱.
도구는 손가락에 붙어 출렁이고(OpenWhip 방식의 로프 물리), 세게 휘두르거나 탭할 때마다 방해 이펙트가 터진다.

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

시험 접수(이름) → 응원팀 선택 → 카메라 화면 + 하단 툴바
→ 선수가 자유투 라인에 서면 **🏀 자유투!** 버튼 → 3.5초 동안 도구로 방해
→ 5회 후 성적표 → 국가공인(가상) 허공 수비 자격증 발급·저장·공유

점수: 시간창 동안 "딱!"(탭/세게 휘두르기) 1회 = 방해력 1/6. 60% 이상이면 BLOCK. 회당 20점, 총 100점.

| 점수 | 등급 |
|---|---|
| 90~100 | 관중석 국가대표 |
| 70~89 | 프로 허공 수비수 |
| 50~69 | 응원단 연습생 |
| 0~49 | 자격 미달 |

## 파일 구조와 담당 (충돌 방지용 파일 소유권)

**자기 담당 파일만 수정한다.** 다른 사람 파일을 고쳐야 하면 담당자에게 요청.

| 담당 | 역할 | 소유 파일 | 브랜치 |
|---|---|---|---|
| **A** | 통합·흐름·배포 | `index.html`, `js/main.js`, `manifest.webmanifest`, `README.md`, `AGENTS.md` | `main` (머지 담당) |
| **B** | 화면 디자인·자격증 | `style.css`, `js/certificate.js` | `feat/ui` |
| **C** | 응원 도구(미니게임) | `js/tools/**`, `js/rope.js` | `feat/tools` |
| **D** | 이펙트·사운드·카메라·점수 | `js/fx.js`, `js/camera.js`, `js/score.js` | `feat/fx` |

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

1. 시작 전 `git pull origin main`, 작업은 자기 브랜치에서.
2. 20~30분마다 작은 PR → A가 바로 머지. 머지 후 각자 `git pull origin main`.
3. 다른 사람 파일 수정 금지. 필요하면 담당자에게 요청하거나 A와 상의.
4. 공통 약속(위 인터페이스)을 바꿀 때만 팀 공지.
5. **종료 45분 전부터 기능 추가 금지**. 버그 수정·배포·시연 준비만.

AI(ChatGPT/Codex/Claude)로 작업할 때는 [AGENTS.md](AGENTS.md)를 함께 주고, 수정 가능한 경로를 명시할 것.

---

*국가공인은 유머를 위한 가상 설정이며 실제 공인 자격증이 아님.*

# 손가락 팅: A/D 연결 안내

손가락 도구는 터치와 카메라 제스처에 같은 단발 타이밍 판정을 사용한다.
기존 구단 선택·전용 장비와 카메라 연결 어댑터를 유지한다.
**아래 연결 전에는 게임이 터치 모드로 동작한다. 실제 카메라 입력이 이미 연결된 상태가 아니다.**

## C 구현 계약

기존 장비 인터페이스는 유지한다. 손가락 도구에만 아래 선택적 메서드를 추가했다.

- `setInputMode('camera' | 'touch')`: 모드 변경 시 준비 동작만 초기화하며 첫 입력 판정과 점수는 유지. camera에서는 pointerDown 효과·점수 모두 차단.
- `getInputMode()`, `getHint()`: 현재 모드와 안내. 모델 성공 전에는 카메라 안내를 표시하지 않는다.
- `acceptHandFrame(frame, attempt)`: 연습에서는 팅 효과만 발생. 시험에서는 `attempt.time`(시도 시작 후 초)을 기준으로 첫 팅 한 번만 채점한다. 신호(시작 1.5~2.3초) 후 0.18초까지 100%, 0.65초까지 점차 감소하고 신호 전·시간 초과는 0점이다. 첫 입력을 처리하면 true, 중복/비팅이면 false. frame=null이면 손 유실.
- `clearHandGesture()`: 점수를 유지하며 준비 동작만 취소. `reset()`은 점수와 준비 동작 모두 초기화.

직접 키포인트를 전달할 때 frame 형식:

```js
{
  landmarks,              // MediaPipe 순서 21개 {x,y,z?}, x/y는 0~1
  timestampMs,            // performance.now()와 같은 단조 증가하는 ms
  width: video.videoWidth,
  height: video.videoHeight,
  handId: 'Right',         // handedness categoryName. 바뀌면 준비 동작 취소
  // confidence: 0.9,      // 선택 사항. 별도 검출 신뢰도가 있을 때만 사용
  // mirrored: false,      // 현재 #cam은 좌우 반전 없음
}
```

손바닥 크기로 보정한 손끝 거리, PIP/DIP 각도, 손목 대비 검지 끝의 뻗은 정도를 함께 사용한다.
35ms 이상·2프레임 이상 모은 뒤, 마지막 모음에서 280ms 안에 검지가 펴지고 손끝 거리가 빠르게 증가해야 한다.
계속 편 손은 재발사하지 않는다. 손 유실, 180ms 초과 프레임 공백, 다른 손, 큰 위치/크기 불연속은 준비 상태를 지운다.
이 수치는 합성 좌표 기준이며 휴대폰에서 조정할 수 있다. 카메라 모드에서 손만 안 보일 때는 터치를 허용하지 않는다.

## D 담당: 기존 #cam과 MediaPipe 모델 제공

`js/camera.js`의 기존 `initCamera(video)`는 유지한다. 추가로 아래 팩토리를 export한다.
어댑터나 팩토리에서 getUserMedia, video.srcObject 대입, video.play를 다시 호출하지 않는다.

```js
// js/camera.js: 기존 initCamera 아래에 추가할 export
export async function createHandLandmarker({ moduleURL, wasmRoot, modelURL }) {
  const { FilesetResolver, HandLandmarker } = await import(moduleURL);
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelURL, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.65,
    minHandPresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });
}
```

새 의존성은 MediaPipe JavaScript 번들, 같은 버전의 WASM 파일, Hand Landmarker 모델이다.
npm/package.json/빌드 도구는 필요 없지만, 외부 라이브러리·모델 사용에 관한 팀 합의가 필요하다.
D가 검증한 한 버전을 고정하고, 실제 제공 URL 세 개를 A에게 전달한다. 아래 A 예시는 같은 출처의
`/hand-tracking/` 경로에 파일을 제공하기로 정했을 때의 코드다. 현재 저장소에는 그 파일들이 없다.
CDN을 쓰기로 정하면 해당 경로 세 개를 같은 버전의 CDN 주소로 교체한다. 영상 업로드 API는 사용하지 않는다.

기존 접수 버튼은 참가자가 다시 접수할 때마다 initCamera를 호출한다. D는 함수 시작 부분에 다음
가드를 넣어 **이미 살아 있는 카메라 스트림을 재사용**한다. 기존 stream을 중복 획득하지 않는다.

```js
// initCamera(video) 함수 맨 앞, getUserMedia 호출 전에 추가
if (video.srcObject?.getVideoTracks?.().some(track => track.readyState === 'live')) {
  try {
    await video.play();
    document.body.classList.add('cam-on');
    document.body.classList.remove('no-cam');
    return true;
  } catch {
    document.body.classList.add('no-cam');
    return false;
  }
}
```

공식 API: [Hand Landmarker Web 가이드](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js),
[detectForVideo(videoFrame, timestampMs)](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarker).
처리는 기존 video에서 로컬 추론한다. detectForVideo는 동기 호출이라 어댑터는 새 영상 프레임만 약 30fps 이하로 처리한다.

## A 담당: js/main.js의 삽입 위치

### 1. 맨 위 import

기존 camera import를 확장하고 다음 import를 추가한다.

```js
import { initCamera, createHandLandmarker } from './camera.js';
import { createFingerCameraController } from './tools/finger-camera.js';
```

### 2. `const onHud = ...` 바로 아래, pointerdown 이벤트 등록 전

```js
const fingerCamera = createFingerCameraController({
  video, // 이미 위에서 선택한 $('#cam') 그대로
  createLandmarker: () => createHandLandmarker({
    moduleURL: '/hand-tracking/vision_bundle.mjs',
    wasmRoot: '/hand-tracking/wasm',
    modelURL: '/hand-tracking/hand_landmarker.task',
  }),
  getFinger: () => tools.finger, // 구단 변경 시 새 인스턴스를 매번 조회
  getAttempt: () => state.attempt, // 로딩 전에 캡처한 예전 attempt를 재사용하지 않음
  isEnabled: () => onHud() && state.inExam && state.toolId === 'finger' && !document.hidden,
  onMode: () => {
    if (onHud() && state.toolId === 'finger') {
      $('#hud-hint').textContent = tools.finger.getHint();
    }
  },
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) fingerCamera.suspend();
});
window.addEventListener('pagehide', (e) => {
  if (e.persisted) fingerCamera.suspend();
  else fingerCamera.dispose();
});
```

이 시점 이후 사용자 이벤트에서만 selectTool/leaveExam이 호출되므로 아래 함수에서 컨트롤러를 참조할 수 있다.
컨트롤러는 손가락이 선택되고 영상이 재생될 때만 모델 로딩을 시작한다.
로딩 제한시간은 8초이며 실패 시 자동 반복 다운로드하지 않는다. 복구 후 명시적 재시도가 필요하면 `fingerCamera.retry()`를 호출한다.

### 3. `selectTool(id)`와 `leaveExam()`

selectTool의 `if (!tools[id]) return;` 다음, leaveExam의 첫 줄에 각각 다음을 넣는다.

```js
fingerCamera.suspend();
```

selectTool의 기존 안내 대입 한 줄은 다음으로 교체한다. 다른 장비 안내는 그대로 유지한다.

```js
$('#hud-hint').textContent = tools[id].getHint?.() ?? TOOL_DEFS[id].hint;
```

### 4. `frame(now)`의 `step(dt)` 바로 다음, `render()` 전

```js
step(dt);
fingerCamera.update();
render();
```

새 rAF 루프는 만들지 않는다. step이 3.5초 종료를 먼저 처리한 뒤 현재 attempt로 판정하므로 시험 밖 점수가 붙지 않는다.
다음 투구 시작 시 기존 `for (const t of Object.values(tools)) t.reset()`가 키포인트 준비 상태도 지운다.
기존 포인터 이벤트는 그대로 둔다. camera 모드의 finger.pointerDown이 중복 효과·점수를 차단한다.

## 실행한 테스트 / 실기기 확인

저장소 루트에서 (새 npm 패키지 없이 Node 내장 테스트 러너):

```sh
node --test tests/finger-timing.test.mjs js/tools/tests/finger-gesture.test.mjs js/tools/tests/finger-camera.test.mjs
```

합성 키포인트와 가짜 MediaPipe/video로 판정·선택/해제·실패 폴백·중복 차단을 확인한다.
이 테스트는 모델이 실제 사람 손을 검출한다는 검증이 아니다.

A/D 연결 뒤 `python3 -m http.server 5173`으로 PC 화면과 콘솔 오류를 확인한다. 휴대폰 후면 카메라는 HTTPS 주소에서 검사한다.

1. 손가락 선택 후 모델 성공 시 카메라 모드·카메라 안내로 변경. 다른 장비 선택 시 추론 중지.
2. 연습에서 손끝 모음 → 검지 튕기기: 팅 효과 1회, 점수 0. 편 채 유지·손 전체 흔들기: 추가 0회.
3. 손을 모은 뒤 화면 밖으로 뺐다가 편 채 돌아오기: 추가 0회. 다시 모은 뒤 튕기면 1회.
4. 자유투/투구 시작 후 ‘지금!’에 맞춘 첫 팅 한 번으로 채점한다. 빠른 입력·연속 팅·터치/카메라 전환으로 재시도할 수 없다. 카메라 모드에서 화면 탭은 효과·점수 모두 0회.
5. 다음 투구 시작 직전에 손을 모았더라도 초기화 후 다시 모으기 전에는 점수 0회. 3.5초 종료 후 점수 미적립.
6. 카메라 권한 거절, 모델 URL 실패, 영상 정지 시 터치 모드 표시 및 탭 플레이 가능.
7. KBL/KBO 구단 전환, 우산·스펀지·전용 장비 조작과 기존 툴바 구성이 유지되는지 확인.

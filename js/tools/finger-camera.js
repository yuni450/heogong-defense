// A/D 연결용: 이미 재생 중인 #cam만 읽는다. 카메라 획득·영상 전송·외부 라이브러리 로드는 하지 않는다.
// createLandmarker는 D가 준비한 MediaPipe HandLandmarker 인스턴스를 반환하는 비동기 팩토리.
export function createFingerCameraController({
  video, createLandmarker, getFinger, getAttempt, isEnabled, onMode = () => {},
  clock = () => performance.now(), intervalMs = 33, initTimeoutMs = 8000,
}) {
  let model = null, loading = false, failed = false, disposed = false;
  let loadId = 0, timer = null, finger = null;
  let source = null, seenVideoTime = -1, processedVideoTime = -1, freshAt = -Infinity, processedAt = -Infinity;
  let notified = '';
  const clear = () => {
    finger?.clearHandGesture();
    seenVideoTime = processedVideoTime = -1;
    freshAt = processedAt = -Infinity;
  };
  const close = (value) => { try { value?.close(); } catch { /* 해제 실패는 게임에 영향 없음 */ } };
  const mode = (value, reason) => {
    finger?.setInputMode(value);
    const key = `${value}:${reason}`;
    if (key !== notified) { notified = key; onMode(value, reason); }
  };
  function load() {
    loading = true;
    const id = ++loadId;
    timer = setTimeout(() => {
      if (id !== loadId || disposed) return;
      loadId++; loading = false; failed = true; timer = null;
    }, initTimeoutMs);
    Promise.resolve().then(createLandmarker).then((value) => {
      if (id !== loadId || disposed) { close(value); return; }
      clearTimeout(timer); timer = null; loading = false;
      if (typeof value?.detectForVideo !== 'function') { close(value); failed = true; return; }
      model = value;
    }, () => {
      if (id !== loadId || disposed) return;
      clearTimeout(timer); timer = null; loading = false; failed = true;
    });
  }
  const controller = {
    // main.js의 기존 frame에서 step(dt) 다음에 한 번 호출. 별도의 rAF 루프는 만들지 않는다.
    update() {
      if (disposed) return;
      if (!isEnabled()) { controller.suspend(); return; }
      const current = getFinger();
      if (current !== finger) {
        clear(); finger?.setInputMode('touch'); finger = current; notified = '';
      }
      if (!finger) return;
      if (!video) { clear(); mode('touch', 'camera-unavailable'); return; }
      const now = clock();
      if (video.srcObject !== source) { clear(); source = video.srcObject; }
      const tracks = video.srcObject?.getVideoTracks?.();
      if (video.readyState < 2 || video.paused || video.ended || !video.videoWidth || !video.videoHeight ||
          (tracks?.length && !tracks.some((track) => track.readyState === 'live'))) {
        clear(); mode('touch', 'camera-unavailable'); return;
      }
      if (video.currentTime !== seenVideoTime) {
        seenVideoTime = video.currentTime; freshAt = now;
      }
      if (now - freshAt > 180) { finger.clearHandGesture(); mode('touch', 'stalled'); return; }
      if (failed) { mode('touch', 'model-unavailable'); return; }
      if (!model) {
        if (!loading) load();
        mode('touch', 'loading'); return;
      }
      if (processedVideoTime === video.currentTime || now - processedAt < intervalMs) return;
      processedVideoTime = video.currentTime; processedAt = now;
      try {
        const result = model.detectForVideo(video, now);
        mode('camera', 'ready');
        // 둘 이상의 손이나 손 유실은 준비 상태를 지운다. 다음 팅은 다시 모으기부터.
        const landmarks = result?.landmarks?.length === 1 ? result.landmarks[0] : null;
        const category = (result?.handedness ?? result?.handednesses)?.[0]?.[0];
        finger.acceptHandFrame(landmarks ? {
          landmarks, timestampMs: now, width: video.videoWidth, height: video.videoHeight,
          handId: category?.categoryName ?? 'single',
        } : null, getAttempt());
      } catch {
        close(model); model = null; failed = true;
        finger.clearHandGesture(); mode('touch', 'model-unavailable');
      }
    },
    // 장비/구단/화면 전환 시 호출해 같은 프레임 내 왕복 전환도 준비 상태를 남기지 않는다.
    suspend() {
      clear(); finger?.setInputMode('touch'); finger = null; notified = '';
    },
    // D가 모델/네트워크 복구 후 재시도를 제공할 경우 사용. 매 프레임 자동 재다운로드하지 않는다.
    retry() {
      if (disposed || loading) return;
      failed = false; clear();
    },
    dispose() {
      if (disposed) return;
      controller.suspend(); disposed = true; loadId++;
      clearTimeout(timer); close(model); model = null;
    },
  };
  return controller;
}

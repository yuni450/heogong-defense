import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as flush, setTimeout as wait } from 'node:timers/promises';
import { createFingerCameraController } from '../finger-camera.js';
import { createFinger } from '../finger.js';
import { fx } from '../../fx.js';
import { handFrame } from './finger-fixture.mjs';

function harness(options = {}) {
  let now = 0, enabled = true, result = { landmarks: [], handedness: [] }, attempt = { active: false };
  let loads = 0, detections = 0, closes = 0, modes = [];
  const video = { readyState: 4, paused: false, ended: false, videoWidth: 1280, videoHeight: 720,
    currentTime: 0, srcObject: { getVideoTracks: () => [{ readyState: 'live' }] } };
  const finger = createFinger(); finger.layout(390, 844);
  const model = { detectForVideo(v, t) { assert.equal(v, video); assert.equal(t, now); detections++; return result; }, close() { closes++; } };
  const controller = createFingerCameraController({ video, getFinger: () => finger,
    getAttempt: () => attempt, isEnabled: () => enabled, clock: () => now,
    createLandmarker: async () => { loads++; return model; },
    onMode: (...args) => modes.push(args), ...options });
  return { video, finger, model, controller, modes,
    setEnabled: v => { enabled = v; }, setAttempt: v => { attempt = v; },
    setResult: v => { result = v; }, setTime: v => { now = v; },
    get loads() { return loads; }, get detections() { return detections; }, get closes() { return closes; },
    async ready() { controller.update(); await flush(); controller.update(); },
    send(frame) {
      now = frame.timestampMs; video.currentTime = now / 1000;
      result = { landmarks: [frame.landmarks], handedness: [[{ categoryName: frame.handId }]] };
      controller.update();
    },
    lose(t) { now = t; video.currentTime = t / 1000; result = { landmarks: [] }; controller.update(); },
  };
}

test('선택한 장비에서만 기존 video를 추론, 준비되면 탭 차단, 현재 시험 상태로 채점', async () => {
  const old = fx.hit, effects = []; fx.hit = (...a) => effects.push(a);
  const h = harness();
  try {
    h.setEnabled(false); h.controller.update(); await flush(); assert.equal(h.loads, 0);
    h.setEnabled(true); await h.ready(); assert.equal(h.loads, 1); assert.equal(h.finger.getInputMode(), 'camera');
    h.send(handFrame(40)); h.send(handFrame(80)); h.send(handFrame(140, { open: 1 }));
    assert.equal(effects.length, 1); assert.equal(h.finger.result(), 0);
    h.setAttempt({ active: true });
    h.send(handFrame(180)); h.send(handFrame(220)); h.send(handFrame(280, { open: 1 }));
    assert.equal(h.finger.result(), 1 / 6);
    h.finger.pointerDown(100, 100, { active: true }); assert.equal(h.finger.result(), 1 / 6); assert.equal(effects.length, 2);
    h.setAttempt({ active: false });
    h.send(handFrame(320)); h.send(handFrame(360)); h.send(handFrame(420, { open: 1 }));
    assert.equal(h.finger.result(), 1 / 6); assert.equal(effects.length, 3);
    const n = h.detections; h.controller.update(); assert.equal(h.detections, n, 'same video frame skipped');
    h.setEnabled(false); h.controller.update(); assert.equal(h.detections, n);
  } finally { h.controller.dispose(); fx.hit = old; }
});

test('손 유실·장비 전환·영상 소스 교체 뒤 열린 손으로 재진입하면 0회', async () => {
  const old = fx.hit; fx.hit = () => {};
  try {
    for (const transition of ['loss', 'selection', 'source', 'multiple']) {
      const h = harness(); await h.ready(); h.setAttempt({ active: true });
      h.send(handFrame(40)); h.send(handFrame(80));
      if (transition === 'loss') h.lose(120);
      if (transition === 'selection') { h.setEnabled(false); h.controller.update(); h.setEnabled(true); }
      if (transition === 'source') h.video.srcObject = { getVideoTracks: () => [{ readyState: 'live' }] };
      if (transition === 'multiple') {
        h.setTime(120); h.video.currentTime = 0.12;
        h.setResult({ landmarks: [handFrame(120).landmarks, handFrame(120).landmarks] }); h.controller.update();
      }
      h.send(handFrame(160, { open: 1 })); assert.equal(h.finger.result(), 0, transition);
      h.send(handFrame(200)); h.send(handFrame(240)); h.send(handFrame(300, { open: 1 }));
      assert.equal(h.finger.result(), 1 / 6, transition); assert.equal(h.loads, 1);
      h.controller.dispose();
    }
  } finally { fx.hit = old; }
});

test('영상 정지/프레임 멈춤은 터치 모드, 재개 시 다시 모아야 한다', async () => {
  const old = fx.hit; fx.hit = () => {};
  try {
    for (const reason of ['paused', 'stalled', 'ended-track']) {
      const h = harness(); await h.ready(); h.setAttempt({ active: true });
      h.send(handFrame(40)); h.send(handFrame(80));
      if (reason === 'paused') h.video.paused = true;
      if (reason === 'ended-track') h.video.srcObject = { getVideoTracks: () => [{ readyState: 'ended' }] };
      h.setTime(300); h.controller.update(); assert.equal(h.finger.getInputMode(), 'touch', reason);
      h.video.paused = false; h.video.srcObject = { getVideoTracks: () => [{ readyState: 'live' }] };
      h.send(handFrame(340, { open: 1 })); assert.equal(h.finger.result(), 0);
      h.controller.dispose();
    }
  } finally { fx.hit = old; }
});

test('카메라 준비 전 모델을 열지 않고, 모델 실패/추론 예외에는 터치 복구', async () => {
  let called = 0;
  const h = harness({ createLandmarker: async () => { called++; throw Error('offline'); } });
  h.video.readyState = 0; h.controller.update(); await flush(); assert.equal(called, 0);
  assert.equal(h.finger.getInputMode(), 'touch'); assert(h.finger.getHint().includes('터치 모드'));
  h.video.readyState = 4; await h.ready(); assert.equal(called, 1); assert.equal(h.finger.getInputMode(), 'touch');
  h.controller.update(); await flush(); assert.equal(called, 1, 'no automatic repeated downloads'); h.controller.dispose();
  const h2 = harness(); await h2.ready(); h2.model.detectForVideo = () => { throw Error('WASM failed'); };
  h2.send(handFrame(40)); assert.equal(h2.finger.getInputMode(), 'touch'); assert.equal(h2.closes, 1);
  h2.controller.dispose();
});

test('모델 로딩 제한시간/해제 뒤 늦게 도착한 모델은 닫고 카메라 모드로 전환하지 않는다', async () => {
  for (const action of ['timeout', 'dispose']) {
    let resolve, closes = 0;
    const h = harness({ initTimeoutMs: 5, createLandmarker: () => new Promise(r => { resolve = r; }) });
    h.controller.update(); await flush();
    if (action === 'dispose') h.controller.dispose(); else await wait(15);
    resolve({ detectForVideo() { return { landmarks: [] }; }, close() { closes++; } });
    await flush(); h.controller.update();
    assert.equal(h.finger.getInputMode(), 'touch'); assert.equal(closes, 1); h.controller.dispose();
  }
});

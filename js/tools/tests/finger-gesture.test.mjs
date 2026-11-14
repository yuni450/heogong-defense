import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFingerGesture } from '../finger-gesture.js';
import { createFinger } from '../finger.js';
import { fx } from '../../fx.js';
import { handFrame } from './finger-fixture.mjs';

function resetTiming(tool) {
  const random = Math.random;
  try { Math.random = () => 0.5; tool.reset(); } finally { Math.random = random; }
}

function arm(detector, start = 0, options = {}) {
  assert.equal(detector.update(handFrame(start, options)), null);
  assert.equal(detector.update(handFrame(start + 40, options)), null);
}

test('모았다 빠르게 펴기 1회, 편 채 유지 추가 0회, 다시 모은 뒤 재발사', () => {
  const d = createFingerGesture(); arm(d);
  assert(d.update(handFrame(100, { open: 1 })));
  for (let t = 140; t <= 500; t += 40) assert.equal(d.update(handFrame(t, { open: 1 })), null);
  arm(d, 540); assert(d.update(handFrame(640, { open: 1 })));
});

test('손 크기·영상 종횡비·손 방향을 보정한다', () => {
  for (const [width, height] of [[1280, 720], [720, 1280], [390, 844]]) {
    for (const size of [30, 60, 120]) for (const angle of [-1.2, 0, 1.2]) {
      const d = createFingerGesture(), options = { width, height, size, angle };
      arm(d, 0, options); assert(d.update(handFrame(100, { ...options, open: 1 })));
    }
  }
});

test('손 전체의 평행 이동·회전은 팅이 아니다', () => {
  for (const open of [0, 1]) {
    const d = createFingerGesture();
    for (let i = 0; i < 30; i++) assert.equal(d.update(handFrame(i * 40,
      { open, offsetX: Math.sin(i * 0.3) * 60, offsetY: Math.cos(i * 0.3) * 20, angle: Math.sin(i * 0.3) * 0.5 })), null);
  }
});

test('엄지만 이동·천천히 펴기·한 프레임 손끝 접촉·작은 떨림 제외', () => {
  let d = createFingerGesture(); arm(d);
  assert.equal(d.update(handFrame(100, { thumbOnly: true })), null);
  d = createFingerGesture(); arm(d);
  for (let i = 1; i <= 15; i++) assert.equal(d.update(handFrame(40 + i * 40, { open: i / 15 })), null);
  d = createFingerGesture(); d.update(handFrame(0));
  assert.equal(d.update(handFrame(50, { open: 1 })), null);
  d = createFingerGesture(); arm(d);
  for (let i = 1; i <= 20; i++) assert.equal(d.update(handFrame(40 + i * 40, { open: (i % 2) * 0.04 })), null);
});

test('손 유실·프레임 공백·다른 손·갑작스러운 크기/위치 변화 후 열린 손은 추가 0회', () => {
  for (const lose of [d => d.update(null), d => d.update(handFrame(250, { open: 1 })),
    d => d.update(handFrame(80, { handId: 'Left', open: 1 })),
    d => d.update(handFrame(80, { size: 160, open: 1 })),
    d => d.update(handFrame(80, { offsetX: 180, open: 1 }))]) {
    const d = createFingerGesture(); arm(d); assert.equal(lose(d), null);
    assert.equal(d.update(handFrame(300, { open: 1 })), null);
    arm(d, 340); assert(d.update(handFrame(440, { open: 1 })));
  }
});

test('잘못된 좌표·낮은 신뢰도·역순/중복 시각을 배제한다', () => {
  const invalid = [null, { landmarks: [] }, { ...handFrame(80), confidence: 0.2 }];
  const bad = handFrame(80); bad.landmarks[8].x = NaN; invalid.push(bad);
  const outside = handFrame(80); outside.landmarks[8].x = 1.1; invalid.push(outside);
  for (const frame of invalid) { const d = createFingerGesture(); arm(d); assert.equal(d.update(frame), null); assert.equal(d.update(handFrame(100, { open: 1 })), null); }
  let d = createFingerGesture(); arm(d); assert.equal(d.update(handFrame(20, { open: 1 })), null);
  assert.equal(d.update(handFrame(100, { open: 1 })), null);
  d = createFingerGesture(); arm(d); assert(d.update(handFrame(100, { open: 1 })));
  assert.equal(d.update(handFrame(100, { open: 1 })), null);
});

test('게임 도구: 연습 효과/시험 점수/탭 중복 차단/터치 복구/다음 투구 초기화', () => {
  const old = fx.hit, effects = [];
  fx.hit = (...args) => effects.push(args);
  try {
    const t = createFinger(); t.layout(390, 844); resetTiming(t);
    const active = { active: true, time: 2.0 }, practice = { active: false };
    assert.equal(t.getInputMode(), 'touch'); assert(t.getHint().includes('터치 모드'));
    t.pointerDown(100, 100, practice); assert.equal(t.result(), 0);
    t.pointerDown(100, 100, active); assert.equal(t.result(), 1);
    resetTiming(t); t.setInputMode('camera'); assert(t.getHint().includes('카메라'));
    const gesture = (start, att) => {
      t.acceptHandFrame(handFrame(start), att); t.acceptHandFrame(handFrame(start + 40), att);
      return t.acceptHandFrame(handFrame(start + 100, { open: 1 }), att);
    };
    assert(gesture(0, practice)); assert.equal(t.live(), 0);
    const cameraHit = effects.at(-1);
    let before = effects.length;
    t.pointerDown(100, 100, active); assert.equal(effects.length, before); assert.equal(t.result(), 0);
    assert(gesture(200, active)); assert.equal(t.result(), 1);
    t.acceptHandFrame(handFrame(340), active); t.acceptHandFrame(handFrame(380), active);
    resetTiming(t); assert.equal(t.result(), 0);
    assert.equal(t.acceptHandFrame(handFrame(440, { open: 1 }), active), false);
    assert(gesture(500, active)); assert.equal(t.result(), 1);
    assert(gesture(700, practice)); assert.equal(t.result(), 1);
    t.clearHandGesture(); assert.equal(t.acceptHandFrame(handFrame(900, { open: 1 }), active), false);
    for (let i = 0; i < 10; i++) gesture(1000 + i * 200, active);
    assert.equal(t.live(), 1); assert.equal(t.result(), 1);
    const hit = cameraHit;
    const point = handFrame(100, { open: 1 }).landmarks[8], scale = 844 / 720;
    assert(Math.abs(hit[0] - (point.x * 1280 * scale - (1280 * scale - 390) / 2)) < 1e-6);
    assert(Math.abs(hit[1] - point.y * 844) < 1e-6);
    t.setInputMode('touch'); assert.equal(t.acceptHandFrame(handFrame(4000), active), false);
    resetTiming(t); t.pointerDown(100, 100, active); assert.equal(t.result(), 1);
  } finally { fx.hit = old; }
});

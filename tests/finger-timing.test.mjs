import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinger } from '../js/tools/finger.js';
import { handFrame } from '../js/tools/tests/finger-fixture.mjs';

// 신호를 1.9초로 고정하고 실제 도구 인터페이스로 동작을 검증한다.
const CUE = 1.9;
function reset(tool) {
  const random = Math.random;
  try {
    Math.random = () => 0.5;
    tool.reset();
  } finally {
    Math.random = random;
  }
}
function finger() {
  const tool = createFinger();
  tool.layout(390, 844);
  reset(tool);
  return tool;
}
const tap = (tool, time, active = true) => tool.pointerDown(195, 360, { active, time });

test('신호 직후 한 번 탭하면 연타 없이 최대 방해력을 얻는다', () => {
  const tool = finger();
  tap(tool, CUE + 0.1);
  assert.equal(tool.live(), 1);
  assert.equal(tool.result(), 1);
});

test('일찍 탭하면 이후 정확하게 연타해도 0점이다', () => {
  const tool = finger();
  tap(tool, CUE - 0.01);
  for (let i = 0; i < 10; i++) tap(tool, CUE + 0.1);
  assert.equal(tool.result(), 0);
});

test('늦을수록 방해력이 감소하고 첫 탭 결과는 바뀌지 않는다', () => {
  const good = finger(), late = finger();
  tap(good, CUE + 0.3);
  tap(late, CUE + 0.5);
  assert.ok(good.result() >= 0.6 && good.result() < 1);
  assert.ok(late.result() > 0 && late.result() < 0.6);
  const first = late.result();
  tap(late, CUE + 0.1);
  assert.equal(late.result(), first);
});

test('시간 초과와 미입력은 0점이며 뒤늦은 탭도 무시한다', () => {
  const expired = finger(), noInput = finger();
  expired.update(0.05, { active: true, time: CUE + 0.7 });
  tap(expired, CUE + 0.75);
  noInput.update(0.05, { active: false, time: 3.5 });
  assert.equal(expired.result(), 0);
  assert.equal(noInput.result(), 0);
});

test('연습 탭은 점수를 주거나 실전 기회를 소비하지 않는다', () => {
  const tool = finger();
  tap(tool, 0, false);
  assert.equal(tool.result(), 0);
  tap(tool, CUE + 0.1);
  assert.equal(tool.result(), 1);
});

test('초기화하면 다음 자유투에서 새 기회를 얻는다', () => {
  const tool = finger();
  tap(tool, 0.2);
  reset(tool);
  assert.equal(tool.result(), 0);
  tap(tool, CUE + 0.1);
  assert.equal(tool.result(), 1);
});

test('화면 크기 변경으로 첫 탭 판정이 초기화되지 않는다', () => {
  const tool = finger();
  tap(tool, 0.2);
  tool.layout(844, 390);
  tap(tool, CUE + 0.1);
  assert.equal(tool.result(), 0);
});

function flick(tool, time, start = 0) {
  const att = { active: true, time };
  tool.acceptHandFrame(handFrame(start), att);
  tool.acceptHandFrame(handFrame(start + 40), att);
  return tool.acceptHandFrame(handFrame(start + 100, { open: 1 }), att);
}

test('터치와 카메라는 이른/정확한/늦은 입력에 같은 타이밍 점수를 준다', () => {
  for (const delay of [-0.1, 0, 0.1, 0.3, 0.5, 0.7]) {
    const touch = finger(), camera = finger();
    camera.setInputMode('camera');
    tap(touch, CUE + delay);
    assert.equal(flick(camera, CUE + delay), true);
    assert.equal(camera.result(), touch.result(), `delay=${delay}`);
    assert.equal(flick(camera, CUE + 0.1, 200), false);
    assert.equal(camera.result(), touch.result(), '두 번째 제스처로 점수가 바뀌지 않음');
  }
});

test('입력 모드 변경과 손 유실은 소비한 기회를 되살리지 않는다', () => {
  for (const firstMode of ['touch', 'camera']) {
    const tool = finger();
    tool.setInputMode(firstMode);
    if (firstMode === 'touch') tap(tool, 0.2);
    else flick(tool, 0.2);
    tool.clearHandGesture();
    tool.setInputMode(firstMode === 'touch' ? 'camera' : 'touch');
    if (firstMode === 'touch') flick(tool, CUE + 0.1, 200);
    else tap(tool, CUE + 0.1);
    assert.equal(tool.result(), 0);
    reset(tool);
    if (firstMode === 'touch') flick(tool, CUE + 0.1, 400);
    else tap(tool, CUE + 0.1);
    assert.equal(tool.result(), 1, '다음 시도에서 새 기회');
  }
});

test('카메라 준비 중 화면 회전은 제스처만 지우며 입력 제한은 유지한다', () => {
  const tool = finger(), att = { active: true, time: CUE + 0.1 };
  tool.setInputMode('camera');
  tool.acceptHandFrame(handFrame(0), att);
  tool.acceptHandFrame(handFrame(40), att);
  tool.layout(844, 390);
  assert.equal(tool.acceptHandFrame(handFrame(100, { open: 1 }), att), false);
  assert.equal(tool.result(), 0);
  assert.equal(flick(tool, CUE + 0.1, 200), true);
  assert.equal(tool.result(), 1);
});

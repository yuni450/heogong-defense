import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinger } from '../js/tools/finger.js';
import { handFrame } from '../js/tools/tests/finger-fixture.mjs';

const active = { active: true };
const tap = (tool, attempt = active) => tool.pointerDown(195, 360, attempt);

function flick(tool, start) {
  tool.acceptHandFrame(handFrame(start), active);
  tool.acceptHandFrame(handFrame(start + 40), active);
  return tool.acceptHandFrame(handFrame(start + 100, { open: 1 }), active);
}

test('터치 입력은 신호나 대기 시간 없이 매번 채점한다', () => {
  const tool = createFinger();
  tap(tool, { active: false });
  assert.equal(tool.live(), 0);
  tap(tool);
  assert.equal(tool.result(), 1 / 6);
  for (let i = 0; i < 10; i++) tap(tool);
  assert.equal(tool.live(), 1);
  tool.reset();
  assert.equal(tool.result(), 0);
});

test('독립된 카메라 튕김만 반복해서 집계하고 터치 모드 전환 뒤에도 점수를 유지한다', () => {
  const tool = createFinger();
  tool.layout(390, 844);
  tool.setInputMode('camera');
  assert.equal(flick(tool, 0), true);
  assert.equal(tool.acceptHandFrame(handFrame(150, { open: 1 }), active), false);
  tap(tool);
  assert.equal(tool.result(), 1 / 6);
  assert.equal(flick(tool, 200), true);
  assert.equal(tool.result(), 2 / 6);
  tool.setInputMode('touch');
  tap(tool);
  assert.equal(tool.result(), 3 / 6);
});

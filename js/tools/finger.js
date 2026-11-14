// 화면을 탭하거나 검지를 튕길 때마다 방해력을 올린다.
import { fx, clamp } from '../fx.js';
import { createFingerGesture } from './finger-gesture.js';

import { HIT_GAIN } from './held.js';

export function createFinger() {
  let W = 0, H = 0;
  let hits = 0;
  let x = 0, y = 0, pulse = 0;
  let inputMode = 'touch';
  const gesture = createFingerGesture();

  function flick(px, py, att) {
    x = px;
    y = py;
    pulse = 1;
    fx.hit(x, y, '팅!', { sound: 'ting' });
    if (att?.active) hits++;
    return true;
  }

  return {
    layout(w, h) {
      W = w; H = h;
      gesture.reset();
    },
    reset() {
      hits = 0;
      pulse = 0;
      gesture.reset();
    },

    setInputMode(mode) {
      const next = mode === 'camera' ? 'camera' : 'touch';
      if (inputMode !== next) gesture.reset();
      inputMode = next;
    },
    getInputMode: () => inputMode,
    getHint: () => inputMode === 'camera'
      ? '엄지와 검지를 모았다가 튕겨요.'
      : '터치 모드 · 화면을 탭해요.',
    clearHandGesture() { gesture.reset(); },
    acceptHandFrame(frame, att) {
      if (inputMode !== 'camera') return false;
      const point = gesture.update(frame);
      if (!point) return false;
      // #cam의 object-fit: cover에 맞춰 영상 좌표를 CSS 픽셀로 변환한다.
      const scale = Math.max(W / frame.width, H / frame.height);
      const nx = frame.mirrored ? 1 - point.x : point.x;
      const x = Math.max(0, Math.min(W, nx * frame.width * scale - (frame.width * scale - W) / 2));
      const y = Math.max(0, Math.min(H, point.y * frame.height * scale - (frame.height * scale - H) / 2));
      return flick(x, y, att);
    },

    // 카메라 모드에서는 터치를 막아 같은 동작의 중복 입력을 방지한다.
    pointerDown(px, py, att) {
      if (inputMode === 'camera') return;
      flick(px, py, att);
    },
    pointerMove() {},
    pointerUp() {},

    update(dt) { pulse = Math.max(0, pulse - dt * 5); },
    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),

    draw(ctx) {
      if (!pulse) return;
      const size = Math.min(W, H) * 0.17;
      ctx.save();
      ctx.globalAlpha *= pulse;
      ctx.font = `${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('👆', x, y);
      ctx.restore();
    },
  };
}

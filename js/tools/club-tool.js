// 구단 전용 장비의 포인터·점수·짧은 시각 반응. 공통 장비 구현과는 독립적이다.
import { fx, clamp } from '../fx.js';
import { HIT_GAIN } from './held.js';

export function createClubTool(cfg) {
  const view = { W: 0, H: 0, u: 0, x: 0, y: 0, down: false, pulse: 0, phase: 0, boost: 0, tilt: 0, sway: 0 };
  let hits = 0;
  let gesture;
  const tool = {
    layout(W, H) {
      Object.assign(view, { W, H, u: Math.min(W, H), x: W * 0.5, y: H * 0.54, down: false, tilt: 0, sway: 0 });
      gesture = cfg.gesture(view.u);
      gesture.reset(view.x, view.y);
    },
    reset() {
      hits = 0;
      Object.assign(view, { down: false, pulse: 0, boost: 0, sway: 0, tilt: 0 });
      gesture.reset(view.x, view.y);
    },
    pointerDown(x, y) {
      view.down = true;
      view.x = x; view.y = y;
      gesture.reset(x, y);
    },
    pointerMove(x, y, attempt) {
      if (!view.down) return;
      view.sway = Math.max(-0.4, Math.min(0.4, (x - view.x) / view.u * 5));
      view.x = x; view.y = y;
      if (!gesture.move(x, y)) return;
      view.pulse = 1;
      view.boost = Math.min(22, view.boost + 9);
      fx.hit(x, y, cfg.word, { sound: cfg.sound ?? 'pop' });
      if (attempt?.active) hits++;
    },
    pointerUp() {
      view.down = false;
      gesture.reset(view.x, view.y);
    },
    update(dt) {
      view.phase += dt * (0.5 + view.boost);
      view.boost *= Math.exp(-dt * 3.5);
      view.pulse *= Math.exp(-dt * 4);
      view.tilt += (view.sway - view.tilt) * Math.min(1, dt * 20);
      view.sway *= Math.exp(-dt * 12);
      if (!view.down) {
        const k = Math.min(1, dt * 5);
        view.x += (view.W * 0.5 - view.x) * k;
        view.y += (view.H * 0.54 - view.y) * k;
      }
    },
    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),
    draw(ctx) { cfg.draw(ctx, view); },
  };
  return tool;
}

// 약 1/6바퀴부터 반응. 직선 왕복의 급반전과 작은 떨림은 제외한다.
export function circleGesture(u) {
  let x, y, vx = 0, vy = 0, turn = 0, distance = 0;
  let minX, maxX, minY, maxY;
  const reset = (px, py) => {
    x = minX = maxX = px; y = minY = maxY = py;
    vx = vy = turn = distance = 0;
  };
  return {
    reset,
    move(px, py) {
      const dx = px - x, dy = py - y;
      const length = Math.hypot(dx, dy);
      if (length < u * 0.008) return false;
      if (vx || vy) {
        const angle = Math.atan2(vx * dy - vy * dx, vx * dx + vy * dy);
        if (Math.abs(angle) > 2 || (turn * angle < 0 && Math.abs(angle) > 0.35)) reset(x, y);
        else turn += angle;
      }
      distance += length;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      x = px; y = py; vx = dx; vy = dy;
      if (Math.abs(turn) < 1 || distance < u * 0.04 ||
          maxX - minX < u * 0.018 || maxY - minY < u * 0.018) return false;
      turn = distance = 0;
      minX = maxX = x; minY = maxY = y;
      return true;
    },
  };
}

export function horizontalGesture(u) {
  let anchorX, anchorY, extremeX, extremeY, direction = 0;
  const threshold = u * 0.04;
  return {
    reset(x, y) { anchorX = extremeX = x; anchorY = extremeY = y; direction = 0; },
    move(x, y) {
      if (!direction) {
        if (Math.abs(x - anchorX) < threshold || Math.abs(x - anchorX) < Math.abs(y - anchorY)) return false;
        direction = Math.sign(x - anchorX);
        extremeX = x; extremeY = y;
        return false;
      }
      if ((x - extremeX) * direction >= 0) {
        extremeX = x; extremeY = y;
        return false;
      }
      const back = (extremeX - x) * direction;
      if (back < threshold || back < Math.abs(y - extremeY)) return false;
      direction *= -1;
      extremeX = x; extremeY = y;
      return true;
    },
  };
}

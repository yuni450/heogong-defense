// 👆 손가락 팅: 손가락이 터치 지점에 붙어 따라다니고, 탭할 때마다 그 자리에 "팅!".
import { fx, clamp } from '../fx.js';
import { HIT_GAIN } from './held.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const WORDS = ['팅!', '팅!!', '티잉!', 'TING!'];

export function createFinger() {
  let W = 0, H = 0;
  let home = { x: 0, y: 0 };
  let x = 0, y = 0, tilt = 0, flick = 0, vx = 0;
  let down = false;
  let hits = 0;

  return {
    layout(w, h) {
      W = w; H = h;
      home = { x: W * 0.72, y: H * 0.66 };
      x = home.x; y = home.y;
    },
    reset() { hits = 0; },

    pointerDown(px, py, att) {
      down = true;
      vx = 0;
      x = px; y = py;
      flick = 1;
      fx.hit(px, py, WORDS[(Math.random() * WORDS.length) | 0], { sound: 'ting' });
      if (att.active) hits++;
    },
    pointerMove(px, py) {
      if (!down) return;
      vx = px - x;
      x = px; y = py;
    },
    pointerUp() { down = false; },

    update(dt) {
      if (!down) {
        const k = Math.min(1, dt * 4);
        x += (home.x - x) * k;
        y += (home.y - y) * k;
      }
      tilt += (Math.max(-0.6, Math.min(0.6, vx * 0.02)) - tilt) * Math.min(1, dt * 12);
      vx *= Math.exp(-dt * 10);
      flick = Math.max(0, flick - dt * 6);
    },

    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),

    draw(ctx) {
      const size = Math.min(W, H) * 0.3;
      ctx.save();
      // 손가락 끝이 터치 지점에 오도록 이모지를 아래로 내림
      ctx.translate(x, y + size * 0.42);
      ctx.rotate(tilt - 0.35 * flick);
      ctx.scale(1 + flick * 0.2, 1 + flick * 0.2);
      ctx.font = `${size}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 16;
      ctx.fillText('👆', 0, 0);
      ctx.restore();
    },
  };
}

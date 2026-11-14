// 🧽 스펀지 응원: 낭창한 막대 끝 스펀지를 마구 흔들면 '와아아!'. 빠를수록 스펀지가 늘어남.
import { createHeld } from './held.js';
import { theme } from '../fx.js';

export function createSponge() {
  return createHeld({
    homeY: 0.78,
    crackSpeed: 0.05,
    sound: 'pop',
    words: ['와아아!', '우우우!', 'NO!', '흔들흔들!', '안 들어가!'],
    stickWidth: 0.022,
    stickColor: '#5b4636',
    rope: (u) => ({
      segments: 7, len: u * 0.05, taper: 0.85,
      gravity: 0.7, damping: 0.94,
      aimX: 0.04, aimY: 0.01, aimClamp: 1.3,
      bendStart: 6, bendEnd: 45, rigidStart: 0.8, rigidEnd: 0.25,
    }),
    drawHead(ctx, rope, { u, speed }) {
      const tip = rope.tip();
      const sw = u * 0.22, sh = u * 0.28;
      const stretch = 1 + Math.min(0.35, speed * 0.25);
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(rope.tipAngle() + Math.PI / 2);
      ctx.scale(1 / Math.sqrt(stretch), stretch);
      const r = sw * 0.22;
      const body = () => {
        ctx.beginPath();
        ctx.roundRect(-sw / 2, -sh, sw, sh, r);
      };
      body();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 9;
      ctx.stroke();
      body();
      ctx.fillStyle = '#ffd43b';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(199,154,0,0.55)';
      const holes = [[-0.25, -0.82], [0.22, -0.72], [-0.05, -0.58], [0.28, -0.36], [-0.3, -0.3], [0.06, -0.16], [-0.15, -0.92]];
      for (const [x, y] of holes) {
        ctx.beginPath();
        ctx.arc(x * sw, y * sh, sw * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = theme.accent;
      ctx.font = `900 ${sw * 0.24}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO!', 0, -sh * 0.5);
      ctx.restore();
    },
  });
}

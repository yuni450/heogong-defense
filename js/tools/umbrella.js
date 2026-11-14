// ☂️ 회전 우산: 손잡이를 잡고 휙휙 휘두르면 '휘릭!'. 우산은 늘 빙글빙글 돌고, 세게 휘두를수록 더 빨리 돈다.
import { createHeld } from './held.js';
import { theme } from '../fx.js';

const PANELS = 8;

export function createUmbrella() {
  return createHeld({
    homeY: 0.74,
    crackSpeed: 0.05,
    sound: 'crack',
    words: ['휘릭!', '휘리릭!', '빙글!', '촤악!', '휙!'],
    stickWidth: 0.018,
    stickColor: '#222',
    rope: (u) => ({
      segments: 5, len: u * 0.075, taper: 1,
      gravity: 0.35, damping: 0.95,
      aimX: 0.03, aimY: 0.008, aimClamp: 1.2,
      bendStart: 3, bendEnd: 16, rigidStart: 0.9, rigidEnd: 0.5,
    }),
    drawHead(ctx, rope, { u, spin, hx, hy }) {
      // 손잡이 갈고리
      ctx.save();
      ctx.lineCap = 'round';
      const hook = () => {
        ctx.beginPath();
        ctx.arc(hx - u * 0.035, hy, u * 0.035, 0, Math.PI);
      };
      hook();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.018 + 6;
      ctx.stroke();
      hook();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = u * 0.018;
      ctx.stroke();
      ctx.restore();

      // 캐노피: 막대 끝이 꼭지, 막대 방향으로 펼쳐진 돔
      const tip = rope.tip();
      const R = u * 0.2, h = u * 0.1;
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(rope.tipAngle() + Math.PI / 2);
      const dome = () => {
        ctx.beginPath();
        ctx.ellipse(0, h, R, h, 0, Math.PI, Math.PI * 2);
        // 아래쪽 물결 테두리
        const n = PANELS;
        for (let i = 0; i < n; i++) {
          const x0 = R - (i * 2 * R) / n;
          const x1 = R - ((i + 1) * 2 * R) / n;
          ctx.quadraticCurveTo((x0 + x1) / 2, h - h * 0.22, x1, h);
        }
        ctx.closePath();
      };
      dome();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 회전하는 줄무늬 (앞면만 보이게)
      ctx.save();
      dome();
      ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-R, 0, R * 2, h * 1.2);
      for (let i = 0; i < PANELS; i++) {
        if (i % 2) continue;
        const a0 = spin + (i * Math.PI * 2) / PANELS;
        const a1 = a0 + (Math.PI * 2) / PANELS;
        if (Math.cos((a0 + a1) / 2) < -0.2) continue;
        const x0 = Math.sin(a0) * R, x1 = Math.sin(a1) * R;
        ctx.fillStyle = theme.accent;
        ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), h * 1.2);
      }
      // 살대
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < PANELS; i++) {
        const a = spin + (i * Math.PI * 2) / PANELS;
        if (Math.cos(a) < 0) continue;
        const x = Math.sin(a) * R;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(x * 0.8, h * 0.2, x, h);
        ctx.stroke();
      }
      ctx.restore();

      dome();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.stroke();
      // 꼭지
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, -3, u * 0.012, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  });
}

// ☂️ 회전 우산: 원형 궤적을 따라 돌리면 회전 가속과 효과.
import { createHeld } from './held.js';
import { theme } from '../fx.js';

const SPIRAL_COLORS = ['#ff405d', '#ff9f1c', '#ffe347', '#31c98b', '#28b9ed', '#7657ed'];

export function createUmbrella() {
  return createHeld({
    homeY: 0.74,
    createGesture(u) {
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
          // 작은 포인터 떨림은 모아서 처리한다 (CSS 픽셀).
          if (length < u * 0.008) return false;
          if (vx || vy) {
            const angle = Math.atan2(vx * dy - vy * dx, vx * dx + vy * dy);
            // 직선 왕복의 급반전은 회전으로 세지 않는다.
            if (Math.abs(angle) > 2 || (turn * angle < 0 && Math.abs(angle) > 0.35)) {
              reset(x, y);
            } else {
              turn += angle;
            }
          }
          distance += length;
          minX = Math.min(minX, px); maxX = Math.max(maxX, px);
          minY = Math.min(minY, py); maxY = Math.max(maxY, py);
          x = px; y = py; vx = dx; vy = dy;
          // 약 1/6바퀴부터 반응. 양 축 이동이 있어야 원형 입력이다.
          if (Math.abs(turn) < 1 || distance < u * 0.04 ||
              maxX - minX < u * 0.018 || maxY - minY < u * 0.018) return false;
          turn = distance = 0;
          minX = maxX = x; minY = maxY = y;
          return true;
        },
      };
    },
    crackSpeed: 0.05,
    sound: 'crack',
    words: ['휘릭!'],
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

      // 정면 우산: 막대 끝을 면의 중심으로 삼아 나선 전체를 회전한다.
      const tip = rope.tip();
      const R = u * 0.24;
      const sector = Math.PI * 2 / SPIRAL_COLORS.length;
      const steps = 36;
      const twist = 2.5;
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(spin);
      const rim = () => {
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.closePath();
      };
      rim();
      ctx.fillStyle = '#fff';
      ctx.fill();

      // 휘어진 두 경계 사이를 채워 굵고 끊김 없는 다색 나선을 만든다.
      for (let i = 0; i < SPIRAL_COLORS.length; i++) {
        const phase = i * sector;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let j = 1; j <= steps; j++) {
          const t = j / steps, r = R * t;
          const a = phase + twist * t;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.arc(0, 0, R, phase + twist, phase + sector + twist);
        for (let j = steps - 1; j >= 0; j--) {
          const t = j / steps, r = R * t;
          const a = phase + sector + twist * t;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = SPIRAL_COLORS[i];
        ctx.fill();
      }

      // 어떤 카메라 배경 위에서도 읽히는 흰 테두리와 진한 외곽선.
      rim();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.025;
      ctx.stroke();
      rim();
      ctx.strokeStyle = '#20202b';
      ctx.lineWidth = u * 0.007;
      ctx.stroke();

      // 우산 꼭지: 회전축을 명확하게 표시한다.
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.022, 0, Math.PI * 2);
      ctx.fillStyle = theme.accent;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.008;
      ctx.stroke();
      ctx.restore();
    },
  });
}

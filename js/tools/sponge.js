// 스펀지 막대: 곧은 폼 원통 전체가 손잡이를 축으로 기울고, 좌우 방향 전환마다 휙!
import { createHeld } from './held.js';

export function createSponge() {
  return createHeld({
    homeY: 0.78,
    createGesture(u) {
      let anchorX, anchorY, extremeX, extremeY, direction = 0;
      const threshold = u * 0.035;
      return {
        reset(x, y) { anchorX = extremeX = x; anchorY = extremeY = y; direction = 0; },
        move(x, y) {
          if (!direction) {
            if (Math.abs(x - anchorX) < threshold ||
                Math.abs(x - anchorX) < Math.abs(y - anchorY)) return false;
            direction = Math.sign(x - anchorX);
            extremeX = x; extremeY = y;
            return false;
          }
          if ((x - extremeX) * direction >= 0) {
            extremeX = x; extremeY = y;
            return false;
          }
          // 극점에서 충분히 되돌아왔을 때만 반전: 정지·잔떨림은 제외.
          const back = (extremeX - x) * direction;
          if (back < threshold || back < Math.abs(y - extremeY)) return false;
          direction *= -1;
          extremeX = x; extremeY = y;
          return true;
        },
      };
    },
    crackSpeed: 0.05,
    sound: 'pop',
    words: ['휙!'],
    stickWidth: 0.044,
    stickColor: '#ffe347',
    rope: (u) => ({
      // 중심선 0.396u + 둥근 양끝 0.044u = 전체 길이 0.44u (굵기의 10배)
      segments: 9, len: u * 0.0495, taper: 1,
      // 모든 마디를 같은 축에 고정: 중간 굽힘이나 끝부분 출렁임 없이 통째로 회전.
      guided: 8, guideStiff: 1,
      gravity: 0, damping: 0,
      aimX: 0.045, aimY: 0, aimClamp: 0.65,
      // 각도에만 짧은 관성을 주고, 멈추면 빠르게 수직으로 복귀한다.
      spring: 1, angDamp: 0.35,
      bendStart: 0, bendEnd: 0, rigidStart: 1, rigidEnd: 1,
    }),
    drawHead(ctx, rope, { u }) {
      const base = rope.pts[0];
      const tip = rope.tip();
      drawSpongeStick(ctx, {
        x: base.x, y: base.y,
        angle: Math.atan2(tip.y - base.y, tip.x - base.x),
        length: Math.hypot(tip.x - base.x, tip.y - base.y),
        width: u * 0.044,
      });
    },
  });
}

// 게임 화면과 툴바에서 같은 스펀지 막대 그림을 사용한다.
export function drawSpongeStick(ctx, { x, y, angle, length, width }) {
  const half = width / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  const fill = ctx.createLinearGradient(-half, 0, half, 0);
  fill.addColorStop(0, '#c97a0b');
  fill.addColorStop(0.22, '#ffc92e');
  fill.addColorStop(0.42, '#fff28b');
  fill.addColorStop(0.7, '#ffdc39');
  fill.addColorStop(1, '#df9410');
  ctx.beginPath();
  ctx.roundRect(-half, -length - half, width, length + width, half);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.clip();

  // 고정된 무늬를 사용해 매 프레임 구멍 위치가 바뀌거나 깜빡이지 않는다.
  for (let i = 0; i < 64; i++) {
    const x = (((i * 37) % 97) / 96 - 0.5) * width * 0.88;
    const y = -length + ((i * 53) % 101) / 100 * (length + half);
    const radius = width * (0.025 + (i % 3) * 0.012);
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.72, i, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(139, 84, 7, 0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.7, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 210, 0.6)';
    ctx.fill();
  }

  // 손잡이 쪽 두 줄의 인쇄 띠도 본체에 붙어 움직인다.
  ctx.fillStyle = '#b85a14';
  ctx.fillRect(-half, -length * 0.17, width, width * 0.2);
  ctx.fillRect(-half, -length * 0.12, width, width * 0.1);
  ctx.restore();

  // 위쪽 단면은 밝은 폼 색과 작은 기공으로 원통 형태를 드러낸다.
  ctx.beginPath();
  ctx.ellipse(0, -length, half * 0.86, width * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3a1';
  ctx.fill();
  ctx.strokeStyle = '#d49a21';
  ctx.lineWidth = Math.max(0.6, width * 0.045);
  ctx.stroke();
  ctx.fillStyle = '#cf9b32';
  for (const [x, y] of [[-0.2, -0.07], [0.16, -0.09], [0.03, 0.11]]) {
    ctx.beginPath();
    ctx.ellipse(x * width, -length + y * width, width * 0.045, width * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

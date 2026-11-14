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
      // 별도 머리 대신 로프 전체를 양끝이 둥근 폼 막대로 그린다.
      const width = u * 0.044;
      const xs = rope.pts.map((p) => p.x);
      const left = Math.min(...xs) - width / 2;
      const right = Math.max(...xs) + width / 2;
      const fill = ctx.createLinearGradient(left, 0, right, 0);
      fill.addColorStop(0, '#ffb51b');
      fill.addColorStop(0.3, '#ffe347');
      fill.addColorStop(0.5, '#fff7a3');
      fill.addColorStop(0.75, '#ffe347');
      fill.addColorStop(1, '#ffc329');
      // Rope.draw의 둥근 캡과 흰 외곽선을 그대로 사용한다.
      rope.draw(ctx, width, fill);
    },
  });
}

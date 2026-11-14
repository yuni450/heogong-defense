// 골대 뒤 단체 응원을 모티브로 한 가상의 관중석 연출. 로고·영상 사용 없음.
import { createClubTool, circleGesture } from './club-tool.js';

const COLORS = ['#f04452', '#ffad2f', '#ffe85c', '#34d5b6', '#459bff', '#a679ff'];

function disk(ctx, x, y, radius, phase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase);
  const sector = Math.PI * 2 / COLORS.length;
  for (let i = 0; i < COLORS.length; i++) {
    const a = i * sector;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let j = 1; j <= 24; j++) {
      const t = j / 24, angle = a + 2.5 * t;
      ctx.lineTo(Math.cos(angle) * radius * t, Math.sin(angle) * radius * t);
    }
    ctx.arc(0, 0, radius, a + 2.5, a + sector + 2.5);
    for (let j = 23; j >= 0; j--) {
      const t = j / 24, angle = a + sector + 2.5 * t;
      ctx.lineTo(Math.cos(angle) * radius * t, Math.sin(angle) * radius * t);
    }
    ctx.closePath();
    ctx.fillStyle = COLORS[i];
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = radius * 0.11;
  ctx.stroke();
  ctx.strokeStyle = '#20202b';
  ctx.lineWidth = radius * 0.035;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

export function createVortex() {
  return createClubTool({
    gesture: circleGesture,
    word: '휘릭!', sound: 'crack',
    draw(ctx, { W, H, u, phase, pulse, x, y, down }) {
      const radius = u * (0.115 + pulse * 0.012);
      for (const row of [0.28, 0.46, 0.64]) {
        disk(ctx, radius * 0.7, H * row, radius, phase);
        disk(ctx, W - radius * 0.7, H * row, radius, phase);
      }
      // 중앙은 카메라를 가리지 않고, 누른 위치에 작은 원형 동작 가이드만 표시.
      ctx.save();
      ctx.translate(down ? x : W * 0.5, down ? y : H * 0.48);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.008;
      ctx.setLineDash([u * 0.018, u * 0.014]);
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.065, -0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  });
}

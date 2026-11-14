import { createClubTool } from './club-tool.js';

function upwardGesture(u) {
  let x, y, started, spent = false, lowY;
  const reset = (px, py) => {
    x = px; y = lowY = py; started = performance.now(); spent = false;
  };
  return {
    reset,
    move(px, py) {
      const now = performance.now();
      if (spent) {
        lowY = Math.min(lowY, py);
        // 아래로 다시 내려 새 올려치기를 준비하거나, 손을 떼고 다시 시작.
        if (py - lowY >= u * 0.045) reset(px, py);
        return false;
      }
      if (now - started > 350 || py > y + u * 0.02) {
        x = px; y = py; started = now;
        return false;
      }
      const up = y - py;
      if (up < u * 0.055 || up < Math.abs(px - x) * 1.2) return false;
      spent = true; lowY = py;
      return true;
    },
  };
}

export function createBag() {
  return createClubTool({
    gesture: upwardGesture,
    word: '마!', sound: 'pop',
    draw(ctx, { u, x, y, tilt, pulse }) {
      const w = u * (0.24 + pulse * 0.13);
      const h = u * (0.3 + pulse * 0.08);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.35);
      // 양쪽 손잡이와 펼쳐지는 주황 봉다리. 실제 구단 마크는 그리지 않는다.
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, -h * 0.58);
      ctx.bezierCurveTo(-w * 0.5, -h * 1.02, -w * 0.13, -h * 1.05, -w * 0.12, -h * 0.65);
      ctx.moveTo(w * 0.34, -h * 0.58);
      ctx.bezierCurveTo(w * 0.5, -h * 1.02, w * 0.13, -h * 1.05, w * 0.12, -h * 0.65);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.032;
      ctx.stroke();
      ctx.strokeStyle = '#ff9b22';
      ctx.lineWidth = u * 0.017;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w * 0.4, -h * 0.69);
      ctx.quadraticCurveTo(0, -h * (0.53 - pulse * 0.12), w * 0.4, -h * 0.69);
      ctx.quadraticCurveTo(w * 0.65, -h * 0.35, w * 0.45, 0);
      ctx.quadraticCurveTo(0, h * 0.12, -w * 0.45, 0);
      ctx.quadraticCurveTo(-w * 0.65, -h * 0.35, -w * 0.4, -h * 0.69);
      ctx.closePath();
      ctx.fillStyle = '#ff851b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.02;
      ctx.stroke();
      ctx.strokeStyle = '#7c3412';
      ctx.lineWidth = u * 0.005;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w * 0.26, -h * 0.52);
      ctx.quadraticCurveTo(-w * 0.36, -h * 0.21, -w * 0.22, -h * 0.06);
      ctx.moveTo(w * 0.26, -h * 0.52);
      ctx.quadraticCurveTo(w * 0.36, -h * 0.21, w * 0.22, -h * 0.06);
      ctx.strokeStyle = '#ffcb73';
      ctx.lineWidth = u * 0.009;
      ctx.stroke();
      ctx.font = `900 ${u * (0.09 + pulse * 0.025)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = u * 0.01;
      ctx.strokeStyle = '#fff';
      ctx.strokeText('마!', 0, -h * 0.3);
      ctx.fillStyle = '#602c13';
      ctx.fillText('마!', 0, -h * 0.3);
      ctx.restore();
    },
  });
}

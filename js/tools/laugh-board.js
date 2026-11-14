import { createClubTool, horizontalGesture } from './club-tool.js';

export function createLaughBoard() {
  return createClubTool({
    gesture: horizontalGesture,
    word: 'ㅋㅋㅋ', sound: 'pop',
    draw(ctx, { u, x, y, tilt, pulse }) {
      const w = u * 0.43, h = u * 0.28;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, u * 0.06);
      ctx.lineTo(0, -u * 0.13);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.045;
      ctx.stroke();
      ctx.strokeStyle = '#263860';
      ctx.lineWidth = u * 0.025;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h - u * 0.07, w, h, u * 0.035);
      ctx.fillStyle = '#65caff';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = u * 0.022;
      ctx.stroke();
      ctx.strokeStyle = '#203259';
      ctx.lineWidth = u * 0.006;
      ctx.stroke();
      ctx.font = `900 ${u * 0.2}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#142849';
      ctx.fillText('ㅋ', 0, -h * 0.5 - u * 0.07);
      ctx.restore();
      if (pulse < 0.05) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${u * 0.075}px system-ui, sans-serif`;
      ctx.globalAlpha = pulse;
      ctx.lineJoin = 'round';
      ctx.lineWidth = u * 0.014;
      for (let i = -1; i <= 1; i++) {
        const spread = 1 - pulse;
        const px = x + i * u * (0.11 + spread * 0.2);
        const py = y - u * (0.39 + spread * 0.15) + Math.abs(i) * u * 0.035;
        ctx.strokeStyle = '#fff';
        ctx.strokeText('ㅋㅋㅋ', px, py);
        ctx.fillStyle = '#164981';
        ctx.fillText('ㅋㅋㅋ', px, py);
      }
      ctx.restore();
    },
  });
}

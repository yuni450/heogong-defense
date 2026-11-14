import { fx, clamp } from '../fx.js';
import { HIT_GAIN } from './held.js';

const PALETTES = {
  'kbo-lg': ['#a50034', '#fff', 'TWINS'],
  'kbo-hanwha': ['#ef681e', '#202126', 'EAGLES'],
  'kbo-ssg': ['#c8102e', '#fff', 'LANDERS'],
  'kbo-samsung': ['#1459b4', '#fff', 'LIONS'],
  'kbo-nc': ['#81deca', '#20385a', 'DINOS'],
  'kbo-kt': ['#222229', '#e52839', 'WIZ'],
  'kbo-lotte': ['#12264c', '#e43844', 'GIANTS'],
  'kbo-kia': ['#d61732', '#fff', 'TIGERS'],
  'kbo-doosan': ['#16254d', '#fff', 'BEARS'],
  'kbo-kiwoom': ['#f187af', '#741c42', 'HEROES'],
};

const CLOSE_SEC = 0.075;
const HOLD_SEC = 0.045;
const OPEN_SEC = 0.145;
const REST_SEC = CLOSE_SEC + HOLD_SEC + OPEN_SEC;

function drawBat(ctx, x, angle, [body, grip, label]) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-12, -97);
  ctx.quadraticCurveTo(0, -103, 12, -97);
  ctx.bezierCurveTo(15, -95, 14, -87, 13, -76);
  ctx.lineTo(6, -14);
  ctx.quadraticCurveTo(5, -8, 8, -6);
  ctx.quadraticCurveTo(12, -1, 7, 1);
  ctx.quadraticCurveTo(0, 4, -7, 1);
  ctx.quadraticCurveTo(-12, -1, -8, -6);
  ctx.quadraticCurveTo(-5, -8, -6, -14);
  ctx.lineTo(-13, -76);
  ctx.bezierCurveTo(-14, -87, -15, -95, -12, -97);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = body;
  ctx.fillRect(-16, -104, 32, 110);
  ctx.fillStyle = grip;
  ctx.fillRect(-16, -41, 32, 47);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-16, -46, 32, 1.5);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  ctx.translate(0, -72);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = (body === '#81deca' || body === '#f187af') ? grip : '#fff';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0, 45);
  ctx.restore();
}

export function createCheerBat(team) {
  const palette = PALETTES[team.id] || [team.color, '#fff', ''];
  let size = 1;
  let homeX = 0, homeY = 0, x = 0, y = 0;
  let activePointer = false;
  let elapsed = REST_SEC;
  let hits = 0;

  return {
    layout(w, h) {
      size = Math.min(w, h) / 275;
      homeX = x = w * 0.72;
      homeY = y = h * 0.68;
    },
    reset() {
      hits = 0;
      activePointer = false;
      elapsed = REST_SEC;
      x = homeX;
      y = homeY;
    },
    pointerDown(px, py, attempt) {
      activePointer = true;
      x = px;
      y = py;
      elapsed = 0;
      if (attempt.active) hits++;
      fx.hit(px, py, '딱!', { sound: 'crack' });
    },
    pointerMove(px, py) {
      if (!activePointer) return;
      x = px;
      y = py;
    },
    pointerUp() { activePointer = false; },
    update(dt) {
      elapsed = Math.min(REST_SEC, elapsed + dt);
      if (!activePointer && elapsed >= REST_SEC) {
        const ease = Math.min(1, dt * 6);
        x += (homeX - x) * ease;
        y += (homeY - y) * ease;
      }
    },
    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),
    draw(ctx) {
      const spread = elapsed < CLOSE_SEC
        ? (1 - elapsed / CLOSE_SEC) ** 2
        : clamp((elapsed - CLOSE_SEC - HOLD_SEC) / OPEN_SEC) ** 2;
      const angle = 0.34 * spread;
      const offset = 14 + 2 * spread;

      ctx.save();
      ctx.translate(x, y + size * 74);
      ctx.scale(size, size);
      drawBat(ctx, -offset, -angle, palette);
      drawBat(ctx, offset, angle, palette);
      ctx.restore();
    },
  };
}

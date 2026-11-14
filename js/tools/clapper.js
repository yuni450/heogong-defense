import { fx, clamp } from '../fx.js';
import { HIT_GAIN } from './held.js';

const COLORS = {
  'kbl-samsung': ['#f3a21d', '#20232a', 'THUNDERS'],
  'kbl-sk': ['#d91b24', '#12439c', 'KNIGHTS'],
  'kbl-kt': ['#17181d', '#415664', 'SONICBOOM'],
  'kbl-jungkwanjang': ['#cf0028', '#fff', 'RED BOOSTERS'],
  'kbl-db': ['#54a735', '#fff', 'PROMY'],
  'kbl-kogas': ['#123ab1', '#fff', 'PEGASUS'],
  'kbl-lg': ['#f8d527', '#661a2a', 'SAKERS'],
  'kbl-kcc': ['#164698', '#101f51', 'EGIS'],
  'kbl-sono': ['#779cb7', '#1b2e49', 'SKYGUNNERS'],
  'kbl-mobis': ['#16171b', '#d9232c', 'PHOEBUS'],
};

// 안양 시안의 손바닥, 연결부, 손잡이 비율을 공통으로 사용한다.
function outline() {
  return new Path2D(
    'M 78 171 C 59 167 51 151 43 136 C 34 120 19 114 9 102 C -3 88 2 75 14 70 C 27 64 36 73 48 85 C 58 96 62 91 57 79 C 51 65 33 43 29 31 C 25 17 32 10 43 10 C 57 10 62 22 65 35 L 73 62 C 78 76 84 72 81 59 L 75 27 C 71 8 77 0 90 0 C 103 0 109 10 108 22 L 106 58 C 105 71 112 72 115 58 L 121 31 C 125 12 136 7 148 11 C 161 16 161 28 154 41 L 139 70 C 133 83 139 87 147 76 L 164 51 C 174 36 186 36 194 44 C 205 56 196 66 186 78 C 175 91 164 101 164 117 C 164 145 154 166 126 171 L 126 194 Q 134 195 134 205 L 134 218 Q 134 224 129 226 L 134 365 C 135 385 125 397 109 397 C 93 397 83 385 84 365 L 89 226 Q 84 225 84 218 L 84 205 Q 84 196 92 194 L 92 173 Z',
  );
}

export function createClapper(team) {
  const [palm, grip, label] = COLORS[team.id] || [team.color, '#fff', ''];
  let shape;
  let x = 0, y = 0, homeX = 0, homeY = 0, size = 1;
  let hits = 0, pulse = 0, held = false;

  return {
    layout(w, h) {
      size = Math.min(w, h) / 1050;
      homeX = x = w * 0.72;
      homeY = y = h * 0.52;
    },
    reset() {
      hits = 0;
      pulse = 0;
      held = false;
      x = homeX;
      y = homeY;
    },
    pointerDown(px, py, attempt) {
      x = px;
      y = py;
      pulse = 1;
      held = true;
      if (attempt.active) hits++;
      fx.hit(px, py, '짝!', { sound: 'crack' });
    },
    pointerMove(px, py) { if (held) { x = px; y = py; } },
    pointerUp() { held = false; },
    update(dt) {
      pulse = Math.max(0, pulse - dt * 7);
      if (!held && !pulse) {
        const ease = Math.min(1, dt * 6);
        x += (homeX - x) * ease;
        y += (homeY - y) * ease;
      }
    },
    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),
    draw(ctx) {
      shape ??= outline();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-pulse * 0.24);
      ctx.scale(size, size);
      ctx.translate(-108, -115);
      ctx.save();
      ctx.clip(shape);
      ctx.fillStyle = palm;
      ctx.fillRect(0, 0, 202, 400);
      ctx.fillStyle = grip;
      ctx.fillRect(72, 198, 69, 204);
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.stroke(shape);
      ctx.lineWidth = 2;
      ctx.strokeStyle = grip === '#fff' ? '#a2a2a8' : '#fff';
      ctx.beginPath();
      ctx.roundRect(88, 198, 42, 24, 5);
      ctx.stroke();
      ctx.fillStyle = palm === '#f8d527' || palm === '#779cb7' ? grip : '#fff';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 108, 126, 100);
      ctx.restore();
    },
  };
}

// 손에 쥐는 도구 공통: 손가락을 대면 도구 손잡이가 손가락에 붙고(OpenWhip처럼),
// 장비별 포인터 궤적 판정으로 효과를 내며, 자유투 중에만 점수를 쌓는다.
import { Rope } from '../rope.js';
import { fx, clamp } from '../fx.js';

export const HIT_GAIN = 1 / 6; // 6번 '딱'이면 방해력 100%

export function createHeld(cfg) {
  let W = 0, H = 0, u = 0;
  let rope = null;
  let home = { x: 0, y: 0 };
  let hx = 0, hy = 0, tx = 0, ty = 0;
  let down = false;
  let hits = 0, spin = 0, crackSpeed = 0, pulse = 0, spinBoost = 0;
  let gesture = null;
  const trail = [];

  return {
    layout(w, h) {
      W = w; H = h; u = Math.min(W, H);
      rope = new Rope(cfg.rope(u));
      gesture = cfg.createGesture(u);
      crackSpeed = cfg.crackSpeed * u;
      home = { x: W / 2, y: H * cfg.homeY };
      hx = tx = home.x;
      hy = ty = home.y;
      rope.reset(hx, hy);
    },
    reset() {
      hits = 0; pulse = 0; spinBoost = 0;
      gesture.reset(tx, ty);
    },

    pointerDown(x, y) {
      down = true; tx = hx = x; ty = hy = y;
      gesture.reset(x, y);
    },
    pointerMove(x, y, att) {
      if (!down) return;
      tx = x; ty = y;
      if (!gesture.move(x, y)) return;
      pulse = 1;
      spinBoost = Math.min(24, spinBoost + 8);
      const tip = rope.tip();
      fx.hit(tip.x, tip.y, cfg.words[(Math.random() * cfg.words.length) | 0], { sound: cfg.sound });
      if (att?.active) hits++;
    },
    pointerUp() { down = false; gesture.reset(tx, ty); },

    update(dt, att) {
      const px = hx, py = hy;
      if (down) { hx = tx; hy = ty; } else {
        const k = Math.min(1, dt * 4);
        hx += (home.x - hx) * k;
        hy += (home.y - hy) * k;
      }
      // 화면 주사율과 무관하게 60fps 기준으로 물리 진행
      const n = Math.max(1, Math.min(3, Math.round(dt * 60)));
      let top = 0;
      for (let s = 1; s <= n; s++) {
        top = Math.max(top, rope.step(px + ((hx - px) * s) / n, py + ((hy - py) * s) / n));
      }
      spin += dt * (2 + spinBoost);
      spinBoost *= Math.exp(-dt * 3);
      pulse *= Math.exp(-dt * 12);

      const tip = rope.tip();
      trail.push({ x: tip.x, y: tip.y, fast: top > crackSpeed * 0.55 });
      if (trail.length > 9) trail.shift();
    },

    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),

    draw(ctx) {
      // 휘두를 때 끝에 남는 흰 잔상
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        if (!trail[i].fast) continue;
        ctx.globalAlpha = (i / trail.length) * 0.6;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = (i / trail.length) * u * 0.05;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
      rope.draw(ctx, cfg.stickWidth * u, cfg.stickColor);
      cfg.drawHead(ctx, rope, { u, spin, pulse, speed: rope.tipSpeed / crackSpeed, hx, hy });
    },
  };
}

// 손에 쥐는 도구 공통: 손가락을 대면 도구 손잡이가 손가락에 붙고(OpenWhip처럼),
// 막대 끝이 빠르게 휘둘리는 순간마다 '딱!' 이펙트. 속도 목표·게이지 없음.
import { Rope } from '../rope.js';
import { fx, clamp } from '../fx.js';

export const HIT_GAIN = 1 / 6; // 6번 '딱'이면 방해력 100%

export function createHeld(cfg) {
  let W = 0, H = 0, u = 0;
  let rope = null;
  let home = { x: 0, y: 0 };
  let hx = 0, hy = 0, tx = 0, ty = 0;
  let down = false;
  let hits = 0, cool = 0, spin = 0, crackSpeed = 0;
  const trail = [];

  return {
    layout(w, h) {
      W = w; H = h; u = Math.min(W, H);
      rope = new Rope(cfg.rope(u));
      crackSpeed = cfg.crackSpeed * u;
      home = { x: W / 2, y: H * cfg.homeY };
      hx = tx = home.x;
      hy = ty = home.y;
      rope.reset(hx, hy);
    },
    reset() { hits = 0; },

    pointerDown(x, y) { down = true; tx = x; ty = y; hx = x; hy = y; },
    pointerMove(x, y) { if (down) { tx = x; ty = y; } },
    pointerUp() { down = false; },

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
      spin += dt * 2 + top * 0.012;
      cool -= dt;

      const tip = rope.tip();
      trail.push({ x: tip.x, y: tip.y, fast: top > crackSpeed * 0.55 });
      if (trail.length > 9) trail.shift();

      if (down && top > crackSpeed && cool <= 0) {
        cool = cfg.cooldown ?? 0.22;
        fx.hit(tip.x, tip.y, cfg.words[(Math.random() * cfg.words.length) | 0], { sound: cfg.sound });
        if (att.active) hits++;
      }
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
      cfg.drawHead(ctx, rope, { u, spin, speed: rope.tipSpeed / crackSpeed, hx, hy });
    },
  };
}

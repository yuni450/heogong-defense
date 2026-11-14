// 손에 쥔 도구의 '막대' 물리 (Verlet 로프). OpenWhip의 채찍 느낌을 참고:
// 손잡이는 손가락에 고정, 손 움직임에 따라 기울고, 끝이 빠르게 휘둘리면 '팡' 판정.
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const DEFAULTS = {
  segments: 6,
  len: 24,           // 마디 길이(px)
  taper: 0.8,        // 끝마디 길이 비율
  gravity: 0.6,
  damping: 0.95,
  iters: 10,
  baseAngle: -Math.PI / 2, // 기본: 위쪽
  aimX: 0.035,       // 손의 가로 움직임이 기울기에 주는 영향
  aimY: 0.01,
  aimClamp: 1.3,
  spring: 0.5,
  angDamp: 0.12,
  guided: 2,         // 손잡이 쪽 몇 마디를 기울기에 맞춰 세울지
  guideStiff: 0.85,
  bendStart: 8,      // 손잡이 쪽 최대 굽힘(도)
  bendEnd: 50,       // 끝 쪽 최대 굽힘(도)
  rigidStart: 0.8,
  rigidEnd: 0.2,
};

export class Rope {
  constructor(opts = {}) {
    Object.assign(this, DEFAULTS, opts);
    this.pts = [];
    this.angle = this.baseAngle;
    this.angVel = 0;
    this.prevH = { x: 0, y: 0 };
    this.tipSpeed = 0;
  }

  segLen(i) {
    const t = i / Math.max(1, this.segments - 1);
    return this.len * (1 - t * (1 - this.taper));
  }

  reset(x, y) {
    this.pts = [];
    let px = x, py = y;
    for (let i = 0; i < this.segments; i++) {
      this.pts.push({ x: px, y: py, px, py });
      px += Math.cos(this.baseAngle) * this.segLen(i);
      py += Math.sin(this.baseAngle) * this.segLen(i);
    }
    this.angle = this.baseAngle;
    this.angVel = 0;
    this.prevH = { x, y };
  }

  // 한 프레임(1/60초) 진행. 끝의 속도(px/frame)를 돌려줌.
  step(hx, hy) {
    const P = this.pts;
    const mvx = hx - this.prevH.x;
    const mvy = hy - this.prevH.y;
    this.prevH = { x: hx, y: hy };

    // 손 움직임 → 막대 기울기 (스프링)
    const target = this.baseAngle + clamp(mvx * this.aimX + mvy * this.aimY, -this.aimClamp, this.aimClamp);
    this.angVel += wrap(target - this.angle) * this.spring;
    this.angVel *= this.angDamp;
    this.angle = wrap(this.angle + this.angVel);

    for (let i = 1; i < P.length; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * this.damping;
      const vy = (p.y - p.py) * this.damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + this.gravity;
    }
    P[0].x = P[0].px = hx;
    P[0].y = P[0].py = hy;

    for (let k = 0; k < this.iters; k++) {
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - this.segLen(i)) / d;
        if (i === 0) {
          b.x -= dx * diff;
          b.y -= dy * diff;
        } else {
          a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
          b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
        }
      }
      this.guide();
      this.limitBend();
    }

    const tip = P[P.length - 1];
    this.tipSpeed = Math.hypot(tip.x - tip.px, tip.y - tip.py);
    return this.tipSpeed;
  }

  guide() {
    const P = this.pts;
    const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const n = Math.min(this.guided, P.length - 1);
    for (let i = 1; i <= n; i++) {
      const prev = P[i - 1];
      const L = this.segLen(i - 1);
      P[i].x = lerp(P[i].x, prev.x + dx * L, this.guideStiff);
      P[i].y = lerp(P[i].y, prev.y + dy * L, this.guideStiff);
    }
  }

  limitBend() {
    const P = this.pts;
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const v1x = a.x - b.x, v1y = a.y - b.y;
      const v2x = c.x - b.x, v2y = c.y - b.y;
      const l1 = Math.hypot(v1x, v1y) || 0.0001;
      const l2 = Math.hypot(v2x, v2y) || 0.0001;
      const n1x = v1x / l1, n1y = v1y / l1;
      const dot = clamp((n1x * v2x + n1y * v2y) / l2, -1, 1);
      const t = i / (P.length - 2);
      const maxBend = (lerp(this.bendStart, this.bendEnd, t) * Math.PI) / 180;
      const bend = Math.PI - Math.acos(dot);
      if (bend <= maxBend) continue;
      const sign = n1x * v2y - n1y * v2x >= 0 ? 1 : -1;
      const ta = Math.atan2(n1y, n1x) + sign * (Math.PI - maxBend);
      const r = lerp(this.rigidStart, this.rigidEnd, t);
      c.x = lerp(c.x, b.x + Math.cos(ta) * l2, r);
      c.y = lerp(c.y, b.y + Math.sin(ta) * l2, r);
    }
  }

  tip() { return this.pts[this.pts.length - 1]; }

  // 끝마디 방향(라디안): 손잡이 → 끝
  tipAngle() {
    const P = this.pts;
    const a = P[P.length - 2], b = P[P.length - 1];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  // 흰 테두리 + 검은 심(스티커 느낌)으로 막대 그리기
  draw(ctx, width, color = '#111') {
    const P = this.pts;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(P[0].x, P[0].y);
      for (let i = 1; i < P.length - 1; i++) {
        const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2;
        ctx.quadraticCurveTo(P[i].x, P[i].y, mx, my);
      }
      const l = P[P.length - 1];
      ctx.lineTo(l.x, l.y);
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    path();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = width + 6;
    ctx.stroke();
    path();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }
}

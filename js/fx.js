// 공통 이펙트: 파티클, 텍스트 팝업, 화면 흔들림, 합성 효과음, 진동.
export const theme = { accent: '#ff4d5e' };

const parts = [];
const pops = [];
let shakeAmp = 0;
let shakeT = 0;

// ---------- 사운드 (WebAudio 합성, 에셋 없음) ----------
let ac = null;
function audio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur);
}

function noise(dur, vol, freq) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

const SOUNDS = {
  ting: () => { tone(2300, 0.28, 'sine', 0.22); tone(3450, 0.16, 'sine', 0.08); },
  swish: () => noise(0.12, 0.25, 1800),
  block: () => { tone(160, 0.25, 'square', 0.15, 60); noise(0.15, 0.35, 900); },
  goal: () => tone(420, 0.55, 'sawtooth', 0.08, 170),
  whoosh: () => noise(0.35, 0.12, 700),
  tick: () => tone(1200, 0.05, 'square', 0.04),
  // 채찍 '딱!' 느낌: 아주 짧은 고음 노이즈 + 클릭
  crack: () => { noise(0.07, 0.5, 3200); tone(1800, 0.04, 'square', 0.08, 600); },
  pop: () => { tone(520, 0.12, 'triangle', 0.18, 220); noise(0.08, 0.2, 1200); },
};

const impacts = [];

// ---------- 그리기 ----------
export const fx = {
  unlock() { audio(); },

  sound(name) {
    try { SOUNDS[name]?.(); } catch { /* 사운드 실패는 무시 */ }
  },

  vibrate(ms) {
    try { navigator.vibrate?.(ms); } catch { /* 미지원 */ }
  },

  burst(x, y, color = '#fff', n = 18, speed = 320) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.3,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  },

  popup(text, x, y, { color = '#fff', size = 34, life = 1.1, rise = 60 } = {}) {
    pops.push({ text, x, y, color, size, life: 0, max: life, rise });
  },

  // 도구가 '딱' 맞았을 때 공통 이펙트: 만화 충격 별 + 글자 + 파편 + 진동
  hit(x, y, word, { color = theme.accent, sound = 'crack' } = {}) {
    impacts.push({ x, y, life: 0, max: 0.35, rot: Math.random() * Math.PI, color });
    this.popup(word, x + (Math.random() - 0.5) * 30, y - 30, { color, size: 30 + Math.random() * 10, life: 0.75, rise: 50 });
    this.burst(x, y, '#ffffff', 10, 280);
    this.shake(5);
    this.sound(sound);
    this.vibrate(18);
  },

  shake(amount = 10) {
    shakeAmp = Math.max(shakeAmp, amount);
    shakeT = 0;
  },

  offset() {
    if (shakeAmp < 0.3) return [0, 0];
    return [Math.sin(shakeT * 70) * shakeAmp, Math.cos(shakeT * 53) * shakeAmp];
  },

  update(dt) {
    shakeT += dt;
    shakeAmp *= Math.exp(-dt * 9);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.max) parts.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life += dt;
      if (pops[i].life >= pops[i].max) pops.splice(i, 1);
    }
    for (let i = impacts.length - 1; i >= 0; i--) {
      impacts[i].life += dt;
      if (impacts[i].life >= impacts[i].max) impacts.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const s of impacts) {
      const k = s.life / s.max;
      const r = 26 + k * 46;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i / 20) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const p of parts) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of pops) {
      const k = p.life / p.max;
      const pop = Math.min(1, p.life / 0.12);
      const scale = 0.6 + 0.4 * pop + (p.life < 0.2 ? 0.15 * Math.sin((p.life / 0.2) * Math.PI) : 0);
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.translate(p.x, p.y - p.rise * k);
      ctx.scale(scale, scale);
      ctx.font = `900 ${p.size}px -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif`;
      ctx.lineWidth = Math.max(4, p.size * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineJoin = 'round';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
  },

  clear() {
    parts.length = 0;
    pops.length = 0;
    impacts.length = 0;
    shakeAmp = 0;
  },
};

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

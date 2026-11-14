// 손가락 팅: 터치와 카메라 모두 '지금!' 신호에 대한 첫 입력으로 채점한다.
import { fx, clamp } from '../fx.js';
import { createFingerGesture } from './finger-gesture.js';

const WORDS = ['팅!', '팅!!', '티잉!', 'TING!'];

export function createFinger() {
  let W = 0, H = 0;
  let guideTime = 0;
  let power = 0, tapped = false, active = false, elapsed = 0;
  let cueAt = 2, feedback = '', feedbackColor = '#fff';

  let inputMode = 'touch';
  const gesture = createFingerGesture();

  function flick(px, py, att) {
    if (!att?.active) {
      fx.hit(px, py, WORDS[(Math.random() * WORDS.length) | 0], { sound: 'ting' });
      return true;
    }
    if (tapped || !Number.isFinite(att.time)) return false;
    tapped = true;
    const delay = att.time - cueAt;
    // 신호 전에는 0점. 반응 시간 0.18초까지 만점, 0.65초까지 점차 감소.
    power = delay < 0 ? 0 : clamp(1 - Math.max(0, delay - 0.18) / 0.47);
    feedback = delay < 0 ? '너무 빨라요!' : delay <= 0.18 ? '완벽한 타이밍!' : power >= 0.6 ? '좋은 타이밍!' : power > 0 ? '조금 늦었어요' : '너무 늦었어요';
    feedbackColor = power >= 0.6 ? '#83e6b0' : '#ffd166';
    if (power > 0) fx.hit(px, py, '팅!', { color: feedbackColor, sound: 'ting' });
    else fx.sound('tick');
    return true;
  }

  return {
    layout(w, h) {
      W = w; H = h;
      gesture.reset();
    },
    reset() {
      power = 0; tapped = false; active = false; elapsed = 0;
      cueAt = 1.5 + Math.random() * 0.8;
      feedback = ''; feedbackColor = '#fff';
      gesture.reset();
    },

    // 모드 변경·손 유실은 준비 동작만 초기화하고 첫 입력 판정은 유지한다.
    setInputMode(mode) {
      const next = mode === 'camera' ? 'camera' : 'touch';
      if (inputMode !== next) gesture.reset();
      inputMode = next;
    },
    getInputMode: () => inputMode,
    getHint: () => inputMode === 'camera'
      ? '카메라 모드 · 손을 모으고 ‘지금!’에 한 번 팅!'
      : '터치 모드 · ‘지금!’에 한 번 탭! 첫 입력으로 채점해요.',
    clearHandGesture() { gesture.reset(); },
    acceptHandFrame(frame, att) {
      if (inputMode !== 'camera') return false;
      const point = gesture.update(frame);
      if (!point) return false;
      // #cam의 object-fit: cover에 맞춰 영상 좌표를 CSS 픽셀로 변환한다.
      const scale = Math.max(W / frame.width, H / frame.height);
      const nx = frame.mirrored ? 1 - point.x : point.x;
      const x = Math.max(0, Math.min(W, nx * frame.width * scale - (frame.width * scale - W) / 2));
      const y = Math.max(0, Math.min(H, point.y * frame.height * scale - (frame.height * scale - H) / 2));
      return flick(x, y, att);
    },

    // 카메라 모드에서는 터치를 막아 같은 동작의 중복 입력을 방지한다.
    pointerDown(px, py, att) {
      if (inputMode === 'camera') return;
      flick(px, py, att);
    },
    pointerMove() {},
    pointerUp() {},

    update(dt, att) {
      guideTime = (guideTime + dt) % 2.2;
      active = !!att?.active;
      elapsed = att?.time || 0;
      if (active && !tapped && elapsed > cueAt + 0.65) {
        tapped = true;
        feedback = '타이밍을 놓쳤어요';
        feedbackColor = '#ffd166';
      }
    },

    live: () => power,
    result: () => power,

    draw(ctx) {
      const u = Math.min(W, H);
      const cue = active && !tapped && elapsed >= cueAt;
      const title = tapped ? feedback : cue ? '지금!' : active ? '준비…' : '신호에 맞춰 한 번!';
      const detail = tapped ? '첫 입력 판정 완료 · 다음 시도에서 다시!' : cue ? (inputMode === 'camera' ? '검지를 한 번 튕기세요' : '화면을 한 번 탭하세요') : active ? '‘지금!’이 뜰 때까지 기다려요' : '시작 버튼을 누르면 도전해요';
      const color = tapped ? feedbackColor : cue ? '#83e6b0' : '#fff';
      const cardW = Math.min(W - 32, 320);
      const compact = H < 500;
      const cardH = compact ? 58 : 104;
      const cx = W / 2;
      const cy = compact ? H * 0.46 : H * 0.36;
      ctx.save();
      ctx.fillStyle = cue ? 'rgba(9, 75, 59, 0.94)' : 'rgba(14, 22, 38, 0.9)';
      ctx.strokeStyle = color;
      ctx.lineWidth = cue ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = `900 ${cue ? (compact ? 30 : 38) : (compact ? 20 : 24)}px system-ui, sans-serif`;
      ctx.fillText(title, cx, cy - (compact ? 10 : 13), cardW - 24);
      ctx.fillStyle = '#fff';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(detail, cx, cy + (compact ? 16 : 24), cardW - 24);
      ctx.restore();
      // 가로 화면에서는 신호와 조작 버튼이 겹치지 않게 손 동작 예시를 생략한다.
      if (compact) return;

      // 시험 중에는 준비 자세를 유지하다 신호 또는 첫 입력에 맞춰 검지를 편다.
      let open;
      if (active || tapped) open = tapped || elapsed >= cueAt ? 1 : 0;
      else if (guideTime < 0.6) open = 1 - guideTime / 0.6;
      else if (guideTime < 1.1) open = 0;
      else if (guideTime < 1.24) open = (guideTime - 1.1) / 0.14;
      else open = 1;
      open = open * open * (3 - 2 * open);
      const tipX = 6 - open * 24;
      const tipY = -22 - open * 58;
      const size = u * 0.36;
      ctx.save();
      // 안내는 고정 위치에 두어 카메라 동작을 따라가는 인식 결과와 구별한다.
      ctx.translate(W * 0.72, H * 0.57);
      ctx.scale(size / 140, size / 140);
      ctx.fillStyle = 'rgba(14, 22, 38, 0.78)';
      ctx.beginPath();
      ctx.roundRect(-70, -110, 140, 212, 18);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 손바닥과 접힌 나머지 손가락.
      ctx.beginPath();
      ctx.moveTo(-27, 51);
      ctx.lineTo(-30, 10);
      ctx.quadraticCurveTo(-31, -1, -19, -2);
      ctx.lineTo(18, -2);
      ctx.quadraticCurveTo(35, -3, 37, 13);
      ctx.lineTo(34, 40);
      ctx.quadraticCurveTo(32, 52, 24, 57);
      ctx.lineTo(24, 66);
      ctx.lineTo(-24, 66);
      ctx.closePath();
      ctx.fillStyle = '#ffcc91';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fill();
      ctx.strokeStyle = '#302336';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 굵은 곡선의 흰 외곽선 + 진한 선 + 살색으로 손가락을 그린다.
      const digit = (path, width) => {
        for (const [color, extra] of [['#fff', 8], ['#302336', 3], ['#ffcc91', 0]]) {
          ctx.beginPath();
          path();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = color;
          ctx.lineWidth = width + extra;
          ctx.stroke();
        }
      };
      for (let i = 0; i < 3; i++) {
        digit(() => {
          ctx.moveTo(27, 8 + i * 12);
          ctx.quadraticCurveTo(15, 2 + i * 12, 4, 9 + i * 12);
        }, 10);
      }
      // 검지: 엄지 끝에서 위로 빠르게 펴진다.
      digit(() => {
        ctx.moveTo(-22, 15);
        ctx.bezierCurveTo(-30, -17, -33 + open * 12, -33 - open * 24, tipX, tipY);
      }, 14);
      // 엄지: 검지가 접힐 때 두 끝이 정확히 만난다.
      digit(() => {
        ctx.moveTo(28, 38);
        ctx.bezierCurveTo(43, 16, 31, -11, 6, -22);
      }, 16);

      if (open < 0.12) {
        ctx.beginPath();
        ctx.arc(6, -22, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if ((active && open > 0) || (!active && !tapped && guideTime >= 1.1 && guideTime < 1.52)) {
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a = -2.4 + i * 0.8;
          ctx.beginPath();
          ctx.moveTo(tipX + Math.cos(a) * 17, tipY + Math.sin(a) * 17);
          ctx.lineTo(tipX + Math.cos(a) * 26, tipY + Math.sin(a) * 26);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!active && !tapped) ctx.fillText('동작 예시', 0, -96);
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(active || tapped ? (open < 0.5 ? '신호를 기다려요' : '한 번만 팅!') : open < 0.5 ? '엄지와 검지를 모아요' : '검지를 빠르게 펴요', 0, 85);
      ctx.restore();
    },
  };
}

// 손가락 팅: 키포인트 판정 + 터치 폴백. 기존 #cam 연결은 finger-camera.js 어댑터를 사용한다.
import { fx, clamp } from '../fx.js';
import { HIT_GAIN } from './held.js';
import { createFingerGesture } from './finger-gesture.js';

const WORDS = ['팅!', '팅!!', '티잉!', 'TING!'];

export function createFinger() {
  let W = 0, H = 0;
  let guideTime = 0;
  let hits = 0;
  let inputMode = 'touch';
  const gesture = createFingerGesture();

  return {
    layout(w, h) {
      W = w; H = h;
      gesture.reset();
    },
    reset() { hits = 0; gesture.reset(); },

    // 기존 장비 인터페이스에 영향을 주지 않는 선택적 카메라 연결 메서드.
    setInputMode(mode) {
      const next = mode === 'camera' ? 'camera' : 'touch';
      if (inputMode !== next) gesture.reset();
      inputMode = next;
    },
    getInputMode: () => inputMode,
    getHint: () => inputMode === 'camera'
      ? '카메라에 손을 비추고, 엄지와 검지를 모았다가 팅!'
      : '터치 모드 · 화면을 톡톡 탭해요!',
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
      fx.hit(x, y, '팅!', { sound: 'ting' });
      if (att?.active) hits++;
      return true;
    },

    pointerDown(px, py, att) {
      if (inputMode === 'camera') return;
      fx.hit(px, py, WORDS[(Math.random() * WORDS.length) | 0], { sound: 'ting' });
      if (att?.active) hits++;
    },
    pointerMove() {},
    pointerUp() {},

    update(dt) {
      guideTime = (guideTime + dt) % 2.2;
    },

    live: () => clamp(hits * HIT_GAIN),
    result: () => clamp(hits * HIT_GAIN),

    draw(ctx) {
      const u = Math.min(W, H);
      // 모으기 → 짧게 유지 → 빠르게 펴기 → 유지. 예시는 채점과 분리한다.
      let open;
      if (guideTime < 0.6) open = 1 - guideTime / 0.6;
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
      ctx.roundRect(-70, -110, 140, 190, 18);
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
      if (guideTime >= 1.1 && guideTime < 1.52) {
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
      ctx.fillText('동작 예시', 0, -96);
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(open < 0.5 ? '엄지와 검지를 모아요' : '검지를 빠르게 펴요', 0, 48);
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillStyle = '#ffe066';
      ctx.fillText(inputMode === 'camera' ? '카메라 모드' : '터치 모드 · 화면 탭', 0, 70);
      ctx.restore();
    },
  };
}

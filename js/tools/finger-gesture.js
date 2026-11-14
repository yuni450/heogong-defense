// MediaPipe 순서의 21개 정규화 손 좌표를 받는 순수 판정기. 카메라·DOM·시간 전역에 의존하지 않는다.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const jointAngle = (a, b, c) => {
  const ab = distance(a, b), cb = distance(c, b);
  if (ab < 0.001 || cb < 0.001) return 0;
  const dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y) + (a.z - b.z) * (c.z - b.z);
  return Math.acos(Math.max(-1, Math.min(1, dot / (ab * cb)))) * 180 / Math.PI;
};
const REQUIRED = [0, 4, 5, 6, 7, 8, 9, 17];

function measure(frame) {
  if (!frame || !Number.isFinite(frame.timestampMs) || !Number.isFinite(frame.width) ||
      !Number.isFinite(frame.height) || frame.width <= 0 || frame.height <= 0 ||
      !Array.isArray(frame.landmarks) || frame.landmarks.length !== 21 ||
      (frame.confidence !== undefined && (!Number.isFinite(frame.confidence) || frame.confidence < 0.6))) return null;
  const p = [];
  for (const i of REQUIRED) {
    const v = frame.landmarks[i];
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) ||
        (v.z !== undefined && !Number.isFinite(v.z)) || v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1) return null;
    // x/y를 영상 픽셀로 복원해 세로·가로 영상의 종횡비에 관계없이 같은 거리/각도를 사용.
    p[i] = { x: v.x * frame.width, y: v.y * frame.height, z: (v.z ?? 0) * frame.width };
  }
  const scale = (distance(p[0], p[9]) + distance(p[5], p[17])) / 2;
  if (scale < 8) return null;
  const pip = jointAngle(p[5], p[6], p[7]);
  const dip = jointAngle(p[6], p[7], p[8]);
  return {
    time: frame.timestampMs, id: frame.handId ?? 'single', scale,
    center: { x: (p[0].x + p[9].x) / 2, y: (p[0].y + p[9].y) / 2, z: (p[0].z + p[9].z) / 2 },
    gap: distance(p[4], p[8]) / scale,
    extension: (pip + dip) / 2, extended: pip >= 155 && dip >= 150,
    reach: distance(p[0], p[8]) / scale,
    point: { x: frame.landmarks[8].x, y: frame.landmarks[8].y },
  };
}

export function createFingerGesture() {
  let previous = null, closing = null, armed = null;
  const reset = () => { previous = closing = armed = null; };
  return {
    reset,
    // frame=null은 손 유실. 팅일 때만 검지 끝의 정규화 좌표를 반환한다.
    update(frame) {
      const s = measure(frame);
      if (!s) { reset(); return null; }
      if (previous && s.time === previous.time) return null;
      if (previous && (s.time < previous.time || s.time - previous.time > 180 || s.id !== previous.id ||
          s.scale / previous.scale > 1.5 || s.scale / previous.scale < 1 / 1.5 ||
          distance(s.center, previous.center) / Math.max(s.scale, previous.scale) > 0.9)) reset();
      previous = s;
      // 두 프레임 이상, 35ms 이상 손끝을 모으고 검지를 굽혀야 준비 완료.
      if (s.gap <= 0.3 && !s.extended && s.extension < 155) {
        closing ??= { time: s.time, frames: 0 };
        closing.frames++;
        if (closing.frames >= 2 && s.time - closing.time >= 35) {
          armed = { time: s.time, gap: s.gap, extension: s.extension, reach: s.reach };
        }
        return null;
      }
      closing = null;
      if (!armed) return null;
      const elapsed = s.time - armed.time;
      if (elapsed <= 0 || elapsed > 280) { armed = null; return null; }
      const openingSpeed = (s.gap - armed.gap) * 1000 / elapsed;
      if (s.gap < 0.7 || !s.extended || s.extension - armed.extension < 25 ||
          s.reach - armed.reach < 0.12 || openingSpeed < 2.5) return null;
      // 발사 후 다시 모으기 전에는 절대로 재발사하지 않는다.
      armed = null;
      return s.point;
    },
  };
}

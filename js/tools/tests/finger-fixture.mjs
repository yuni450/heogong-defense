// 결정론적 관절 좌표: 엄지·검지 모음과 검지를 곧게 편 상태 사이를 보간한다.
export function handFrame(timestampMs, { open = 0, width = 1280, height = 720, size = 80,
  angle = 0, offsetX = 0, offsetY = 0, handId = 'Right', thumbOnly = false } = {}) {
  const points = Array.from({ length: 21 }, () => [0, 0]);
  points[0] = [0, 1]; points[4] = [0.12, -0.1]; points[5] = [-0.35, 0];
  points[9] = [0, -0.05]; points[17] = [0.55, 0];
  const closed = [[-0.38, -0.38], [-0.04, -0.32], [0.13, -0.12]];
  const extended = [[-0.35, -0.4], [-0.35, -0.75], [-0.35, -1.1]];
  for (let j = 0; j < 3; j++) points[6 + j] = closed[j].map((v, i) => v + (extended[j][i] - v) * open);
  if (thumbOnly) points[4] = [-0.9, -0.3];
  const landmarks = points.map(([x, y]) => ({
    x: (width / 2 + offsetX + (x * Math.cos(angle) - y * Math.sin(angle)) * size) / width,
    y: (height / 2 + offsetY + (x * Math.sin(angle) + y * Math.cos(angle)) * size) / height,
    z: 0,
  }));
  return { landmarks, timestampMs, width, height, handId };
}

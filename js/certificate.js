// 국가공인(가상) 허공 수비 자격증 이미지 생성.
const SANS = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const SERIF = '"AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", serif';

export function renderCertificate(d) {
  const W = 1080, H = 1440;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // 바탕
  g.fillStyle = '#fbf6e9';
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = 0.06;
  g.font = `620px ${SANS}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('🏀', W / 2, H * 0.55);
  g.restore();

  // 테두리
  g.strokeStyle = '#8a6d2f';
  g.lineWidth = 14;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.lineWidth = 3;
  g.strokeRect(68, 68, W - 136, H - 136);
  g.strokeStyle = d.accent;
  g.lineWidth = 6;
  g.strokeRect(84, 84, W - 168, H - 168);

  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#5a4a2a';
  g.font = `600 30px ${SANS}`;
  g.fillText(`제 ${d.certNo} 호`, W / 2, 160);

  g.fillStyle = '#2b2416';
  g.font = `700 40px ${SERIF}`;
  g.fillText('국가공인*', W / 2, 240);
  g.font = `900 92px ${SERIF}`;
  g.fillText('허공 수비 자격증', W / 2, 340);

  // 등급
  g.font = `120px ${SANS}`;
  g.fillText(d.grade.emoji, W / 2, 500);
  g.fillStyle = d.accent;
  g.font = `900 64px ${SANS}`;
  g.fillText(d.grade.name, W / 2, 600);

  // 항목 표
  const rows = [
    ['성       명', d.name],
    ['소속 응원팀', d.team],
    ['수비 장비', d.tool],
    ['최종 수비 점수', `${d.score}점 / 100점`],
    ['방어 성공률', `${d.rate}% (${d.blocks}/${d.attempts})`],
    ['실제 경기 기여도', '0%'],
  ];
  const x0 = 170, x1 = W - 170;
  let y = 670;
  g.textBaseline = 'middle';
  for (const [k, v] of rows) {
    g.strokeStyle = 'rgba(138,109,47,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x0, y + 38);
    g.lineTo(x1, y + 38);
    g.stroke();
    g.textAlign = 'left';
    g.fillStyle = '#6b5a35';
    g.font = `600 34px ${SANS}`;
    g.fillText(k, x0, y);
    g.textAlign = 'right';
    g.fillStyle = '#1f1a10';
    g.font = `800 38px ${SANS}`;
    g.fillText(v, x1, y);
    y += 72;
  }

  // 본문
  g.textAlign = 'center';
  g.fillStyle = '#2b2416';
  g.font = `500 32px ${SERIF}`;
  const body = '위 사람은 관중석에서 실시한 허공 수비 실기시험에서 위와 같은 성적을 거두었으므로, 실제 경기에 아무런 영향을 주지 못함을 확인하고 이 자격증을 수여합니다.';
  wrap(g, body, W / 2, 1150, 760, 46);

  // 날짜 · 발급기관 · 직인
  g.font = `600 32px ${SANS}`;
  g.fillText(d.date, W / 2, 1272);
  g.font = `800 38px ${SERIF}`;
  g.fillText('허공수비대 시험위원장', W / 2 - 40, 1335);
  stamp(g, W / 2 + 230, 1318);

  g.fillStyle = '#8a7a5a';
  g.font = `500 20px ${SANS}`;
  g.fillText('* 유머를 위한 가상 자격증이며 실제 공인 자격이 아닙니다.', W / 2, H - 52);

  return c.toDataURL('image/png');
}

function stamp(g, x, y) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.18);
  g.strokeStyle = 'rgba(200,30,30,0.85)';
  g.fillStyle = 'rgba(200,30,30,0.85)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(0, 0, 58, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 49, 0, Math.PI * 2);
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 26px ${SERIF}`;
  g.fillText('허공', 0, -16);
  g.fillText('수비대', 0, 16);
  g.restore();
}

function wrap(g, text, cx, y, maxW, lh) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  const top = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, cx, top + i * lh));
}

const SANS = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const WIDTH = 1080;
const HEIGHT = 1440;

export function renderCertificate(d) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const center = WIDTH / 2;

  function text(value, x, y, size, { weight = 600, color = '#171d2b', align = 'left', max = 900 } = {}) {
    ctx.font = `${weight} ${size}px ${SANS}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y, max);
  }

  ctx.fillStyle = '#f8f5ed';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#d9d2c4';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, WIDTH - 84, HEIGHT - 84);
  ctx.fillStyle = d.accent;
  ctx.fillRect(42, 42, WIDTH - 84, 10);

  text('허공 수비 자격증', 94, 180, 66, { weight: 850 });
  text(d.certNo, 986, 227, 25, { align: 'right', color: '#615f5a' });
  text(d.name, 94, 350, 98, { weight: 850 });
  text(d.team, 98, 420, 38, { color: '#615f5a' });

  ctx.fillStyle = '#171d2b';
  ctx.beginPath();
  ctx.roundRect(94, 483, 892, 370, 32);
  ctx.fill();
  ctx.fillStyle = d.accent;
  ctx.fillRect(144, 545, 60, 8);
  text(d.grade.name, 144, 620, 54, { color: '#f8f5ed', weight: 800, max: 785 });
  text(String(d.score), 137, 796, 180, { color: '#f8f5ed', weight: 850, max: 445 });
  text('/ 100', 932, 785, 42, { color: '#cccdd2', align: 'right' });

  function rule(y) {
    ctx.fillStyle = '#d9d2c4';
    ctx.fillRect(94, y, 892, 2);
  }

  text('방어 성공률', 96, 945, 33, { color: '#615f5a' });
  text(`${d.rate}% · ${d.blocks}/${d.attempts}`, 984, 945, 40, { align: 'right', weight: 750 });
  rule(978);
  text('응원도구', 96, 1043, 33, { color: '#615f5a' });
  text(d.tool, 984, 1043, 40, { align: 'right', weight: 750, max: 570 });
  rule(1076);

  text('허공수비대', 96, 1245, 47, { weight: 850 });
  text(d.date, 984, 1245, 32, { align: 'right', color: '#615f5a' });
  text('게임용 자격증', center, 1344, 25, { align: 'center', color: '#615f5a' });
  return canvas.toDataURL('image/png');
}

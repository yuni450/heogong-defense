import { initCamera } from './camera.js';
import { fx, theme, clamp } from './fx.js';
import { TOOL_DEFS } from './tools/index.js';
import { drawSpongeStick } from './tools/sponge.js';
import { SHOTS, BLOCK_THRESHOLD, shotPoints, summarize } from './score.js';
import { renderCertificate } from './certificate.js';

// 이번 구단 선택 확장에서는 실제 구단명을 텍스트로 사용한다. 공식 로고는 사용하지 않는다.
const LEAGUES = {
  kbl: { name: '농구 KBL', emoji: '🏀', action: '자유투!' },
  kbo: { name: '야구 KBO', emoji: '⚾', action: '투구!' },
};
const TEAMS = [
  { id: 'kbl-samsung', league: 'kbl', name: '서울 삼성', color: '#2575d8' },
  { id: 'kbl-sk', league: 'kbl', name: '서울 SK', color: '#ee3346' },
  { id: 'kbl-kt', league: 'kbl', name: '수원 KT', color: '#e33d45' },
  { id: 'kbl-jungkwanjang', league: 'kbl', name: '안양 정관장', color: '#dc3846' },
  { id: 'kbl-db', league: 'kbl', name: '원주 DB', color: '#159d73' },
  { id: 'kbl-kogas', league: 'kbl', name: '대구 한국가스공사', color: '#2879bf' },
  { id: 'kbl-lg', league: 'kbl', name: '창원 LG', color: '#d93657' },
  { id: 'kbl-kcc', league: 'kbl', name: '부산 KCC', color: '#3874d7' },
  { id: 'kbl-sono', league: 'kbl', name: '고양 소노', color: '#40a9cf' },
  { id: 'kbl-mobis', league: 'kbl', name: '울산 현대모비스', color: '#e7414d' },
  { id: 'kbo-lg', league: 'kbo', name: 'LG 트윈스', color: '#d93670' },
  { id: 'kbo-hanwha', league: 'kbo', name: '한화 이글스', color: '#f07828' },
  { id: 'kbo-ssg', league: 'kbo', name: 'SSG 랜더스', color: '#dc3d49' },
  { id: 'kbo-samsung', league: 'kbo', name: '삼성 라이온즈', color: '#3584df' },
  { id: 'kbo-nc', league: 'kbo', name: 'NC 다이노스', color: '#6297c5' },
  { id: 'kbo-kt', league: 'kbo', name: 'KT 위즈', color: '#dd4149' },
  { id: 'kbo-lotte', league: 'kbo', name: '롯데 자이언츠', color: '#e75345' },
  { id: 'kbo-kia', league: 'kbo', name: 'KIA 타이거즈', color: '#e43b47' },
  { id: 'kbo-doosan', league: 'kbo', name: '두산 베어스', color: '#657bc5' },
  { id: 'kbo-kiwoom', league: 'kbo', name: '키움 히어로즈', color: '#bf456c' },
];

const ATTEMPT_SEC = 3.5; // '자유투!' 버튼 후 방해 시간

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
const video = $('#cam');

let tools = Object.fromEntries(Object.entries(TOOL_DEFS).filter(([, d]) => !d.teamId).map(([id, d]) => [id, d.create()]));

const state = {
  name: '',
  team: TEAMS[0],
  league: 'kbl',
  toolId: Object.keys(TOOL_DEFS)[0],
  inExam: false,
  attempt: { active: false, time: 0 }, // 현재 자유투 시간창
  results: [],
  usage: {}, // 시간창 동안 장비별 사용 시간
  summary: null,
  pendingResult: null, // 측정 후 실제 슛 결과 입력 대기
};

let W = 0, H = 0, dpr = 1;
let finishTimer = null;
let activePointerId = null;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  for (const t of Object.values(tools)) t.layout(W, H);
}
window.addEventListener('resize', resize);
resize();

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

function setAccent(color) {
  theme.accent = color;
  document.documentElement.style.setProperty('--accent', color);
}

// ---------- 최고 기록 (저장 실패해도 무시) ----------
const BEST_KEY = 'heogong-best';
function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch { return null; }
}
function saveBest(rec) {
  try {
    const best = loadBest();
    if (!best || rec.score > best.score) {
      localStorage.setItem(BEST_KEY, JSON.stringify(rec));
      return true;
    }
  } catch { /* 저장 불가 */ }
  return false;
}
function renderBest() {
  const b = loadBest();
  $('#best').textContent = b ? `🏆 이 기기 최고 기록: ${b.name} · ${b.score}점 (${b.tool})` : '';
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 접수 / 종목 · 구단 선택 ----------
$('#btn-apply').addEventListener('click', () => {
  fx.unlock();
  state.name = $('#name').value.trim() || '무명 관중';
  initCamera(video);
  openTeamSelection();
});

function drawClubBall(c, league, color) {
  const g = c.getContext('2d');
  const scale = Math.min(2, window.devicePixelRatio || 1);
  c.width = 28 * scale; c.height = 28 * scale;
  g.scale(scale, scale);
  g.beginPath(); g.arc(14, 14, 11, 0, Math.PI * 2);
  g.fillStyle = league === 'kbl' ? color : '#fff8ee'; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  g.save(); g.clip();
  g.strokeStyle = league === 'kbl' ? '#182039' : color; g.lineWidth = 1.5;
  if (league === 'kbl') {
    g.beginPath(); g.moveTo(3, 14); g.lineTo(25, 14); g.moveTo(14, 3); g.lineTo(14, 25); g.stroke();
    g.beginPath(); g.ellipse(14, 14, 5, 11, 0, 0, Math.PI * 2); g.stroke();
  } else {
    for (const x of [4, 24]) {
      g.beginPath(); g.ellipse(x, 14, 6, 13, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  g.restore();
}

function renderTeams() {
  document.querySelectorAll('[data-league]').forEach((b) => {
    const selected = b.dataset.league === state.league;
    b.classList.toggle('on', selected);
    b.setAttribute('aria-selected', String(selected));
  });
  $('#teams').setAttribute('aria-labelledby', `tab-${state.league}`);
  $('#teams').innerHTML = TEAMS.filter((t) => t.league === state.league).map(
    (t) => `<button class="opt" data-team="${t.id}" style="border-color:${t.color}">
      <canvas class="club-ball" aria-hidden="true"></canvas><span class="nm">${t.name}</span></button>`
  ).join('');
  $('#teams').querySelectorAll('[data-team]').forEach((b) => {
    const t = TEAMS.find((item) => item.id === b.dataset.team);
    drawClubBall(b.querySelector('canvas'), t.league, t.color);
  });
}

function releaseInput() {
  tools[state.toolId]?.pointerUp();
  if (activePointerId !== null && canvas.hasPointerCapture?.(activePointerId)) {
    canvas.releasePointerCapture(activePointerId);
  }
  activePointerId = null;
}

function leaveExam() {
  releaseInput();
  clearTimeout(finishTimer); finishTimer = null;
  state.inExam = false;
  state.attempt = { active: false, time: 0 };
  state.pendingResult = null;
  $('#shot-outcome').hidden = true;
  fx.clear();
}

function openTeamSelection() {
  leaveExam();
  renderTeams();
  show('s-team');
}

$('#league-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-league]');
  if (!b || !LEAGUES[b.dataset.league]) return;
  state.league = b.dataset.league;
  renderTeams();
});
$('#teams').addEventListener('click', (e) => {
  const b = e.target.closest('[data-team]');
  if (!b) return;
  const team = TEAMS.find((t) => t.id === b.dataset.team && t.league === state.league);
  if (!team) return;
  state.team = team;
  setAccent(team.color);
  startExam();
});
$('#btn-change-team').addEventListener('click', openTeamSelection);
$('#btn-result-team').addEventListener('click', openTeamSelection);
$('#btn-team-back').addEventListener('click', () => { leaveExam(); show('s-intro'); });

// ---------- 하단 툴바: 선택 구단이 쓸 수 있는 장비만 생성 · 채점 ----------
function rebuildTools() {
  releaseInput();
  // 이전 구단의 전용 장비 인스턴스와 점수는 새 시험으로 가져오지 않는다.
  tools = Object.fromEntries(Object.entries(TOOL_DEFS)
    .filter(([, d]) => !d.teamId || d.teamId === state.team.id)
    .map(([id, d]) => [id, d.create()]));
  for (const tool of Object.values(tools)) { tool.layout(W, H); tool.reset(); }
  if (!tools[state.toolId]) state.toolId = Object.keys(tools)[0];
  $('#toolbar').innerHTML = Object.keys(tools).map((id) => {
    const d = TOOL_DEFS[id];
    return `<button data-tool="${id}">${d.emoji || id === 'sponge' ? `<span class="emo">${d.emoji}</span>` : ''}${d.name}</button>`;
  }).join('');
  // 구단 변경으로 툴바를 재생성할 때도 같은 스펀지 그림을 사용한다.
  const spongeIcon = document.createElement('canvas');
  spongeIcon.width = 96;
  spongeIcon.height = 72;
  spongeIcon.className = 'tool-icon';
  spongeIcon.setAttribute('aria-hidden', 'true');
  const iconCtx = spongeIcon.getContext('2d');
  drawSpongeStick(iconCtx, { x: 56, y: 62, angle: -Math.PI / 2 - 0.3, length: 49, width: 10 });
  drawSpongeStick(iconCtx, { x: 40, y: 62, angle: -Math.PI / 2 + 0.3, length: 49, width: 10 });
  $('#toolbar [data-tool="sponge"] .emo').replaceChildren(spongeIcon);
}
$('#toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (b) selectTool(b.dataset.tool);
});
function selectTool(id) {
  if (!tools[id]) return;
  releaseInput();
  state.toolId = id;
  document.querySelectorAll('#toolbar [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === id));
  $('#hud-hint').textContent = TOOL_DEFS[id].hint;
  fx.sound('tick');
}
renderTeams();

// ---------- 실기시험 ----------
function startExam() {
  leaveExam();
  rebuildTools();
  fx.clear();
  state.inExam = true;
  state.results = [];
  state.usage = Object.fromEntries(Object.keys(tools).map((id) => [id, 0]));
  state.summary = null;
  state.attempt = { active: false, time: 0 };
  state.pendingResult = null;
  $('#shot-outcome').hidden = true;
  selectTool(state.toolId);
  updateHud();
  show('s-hud');
}

$('#btn-shot').addEventListener('click', () => {
  if (!state.inExam || state.attempt.active || state.pendingResult) return;
  releaseInput();
  for (const t of Object.values(tools)) t.reset();
  state.attempt = { active: true, time: 0 };
  fx.sound('whoosh');
  fx.popup('막아라!!', W / 2, H * 0.4, { size: 44, color: theme.accent, life: 0.9 });
  updateHud();
});

function endAttempt() {
  state.attempt.active = false;
  releaseInput();
  // 카메라로 실제 득점 결과를 판별하지 못하므로 사용자 선택을 기다린다.
  const r = clamp(Math.max(...Object.values(tools).map((t) => t.result())));
  state.pendingResult = { r };
  $('#shot-outcome').hidden = false;
  fx.sound('tick');
  updateHud();
}

// 사용자 선택을 완료한 뒤에만 자유투 점수와 다음 라운드를 확정
$('#shot-outcome').addEventListener('click', (e) => {
  const button = e.target.closest('[data-made]');
  if (!button || !state.pendingResult) return;

  const made = button.dataset.made === 'yes';
  const { r } = state.pendingResult;
  state.pendingResult = null;
  $('#shot-outcome').hidden = true;

  // 슛이 들어간 경우 0점. 빗나간 경우에만 측정한 방해력을 반영한다.
  const blocked = !made && r >= BLOCK_THRESHOLD;
  const pts = made ? 0 : shotPoints(r);
  state.results.push({ r, pts, blocked, made });

  const cx = W / 2, cy = H * 0.38;
  if (blocked) {
    fx.popup('BLOCK!', cx, cy, { color: theme.accent, size: 64, life: 1.4 });
    fx.popup('(기분상)', cx, cy + 46, { color: '#fff', size: 18, life: 1.4 });
    fx.burst(cx, cy, theme.accent, 30, 460);
    fx.burst(cx, cy, '#ffffff', 14, 320);
    fx.shake(14);
    fx.sound('block');
    fx.vibrate([60, 40, 60]);
  } else {
    const action = state.team.league === 'kbo' ? '투구' : '슛';
    fx.popup(made ? `${action} 성공 · 수비 실패` : `${action} 실패 · 방해력 부족`, cx, cy, {
      color: '#ffffff', size: 28, life: 1.3,
    });
    fx.sound('goal');
  }
  fx.popup(`+${pts}점`, cx, cy + 80, { color: '#ffd166', size: 28, life: 1.2 });

  if (state.results.length >= SHOTS) {
    state.inExam = false;
    finishTimer = setTimeout(() => { finishTimer = null; finishExam(); }, 1400);
  }
  updateHud();
});

function updateHud() {
  const n = state.results.length;
  const dots = Array.from({ length: SHOTS }, (_, i) => {
    const r = state.results[i];
    if (r) return r.blocked ? '●' : '✕';
    return i === n ? '◉' : '○';
  }).join(' ');
  $('#hud-round').textContent = dots;
  $('#hud-team').textContent = `${LEAGUES[state.team.league].name} · ${state.team.name}`;
  $('#hud-score').textContent = `${state.results.reduce((s, r) => s + r.pts, 0)}점`;
  const btn = $('#btn-shot');
  btn.disabled = state.attempt.active || !!state.pendingResult || !state.inExam;
  const league = LEAGUES[state.team.league];
  const baseball = state.team.league === 'kbo';
  btn.textContent = state.pendingResult ? `실제 ${baseball ? '투구' : '슛'} 결과를 선택하세요` : state.attempt.active ? '방해 중!' : state.inExam ? `${league.emoji} ${n + 1}번째 ${league.action}` : '채점 중…';
  $('#shot-outcome .step').textContent = `실제 ${baseball ? '투구' : '자유투'} 결과 확인`;
  $('#outcome-title').textContent = baseball ? '실제 투구 결과는 어떤가요?' : '공이 들어갔나요?';
  $('#shot-outcome .outcome-detail').textContent = `방해력 측정이 완료되었습니다. 실제 ${baseball ? '투구' : '슛'} 결과를 선택해주세요.`;
  $('#shot-outcome [data-made="yes"]').textContent = baseball ? '⚾ 성공' : '🏀 들어갔다';
  $('#shot-outcome [data-made="no"]').textContent = baseball ? '🛡️ 실패' : '🛡️ 안 들어갔다';
  $('#meter').classList.toggle('on', state.attempt.active);
}

function updateMeter() {
  const att = state.attempt;
  const live = tools[state.toolId].live();
  const fill = $('#meter-fill');
  fill.style.width = `${Math.round(live * 100)}%`;
  fill.classList.toggle('hot', live >= BLOCK_THRESHOLD);
  $('#time-fill').style.width = att.active ? `${(1 - att.time / ATTEMPT_SEC) * 100}%` : '0%';
  $('#meter-time').textContent = att.active ? `${Math.max(0, ATTEMPT_SEC - att.time).toFixed(1)}초` : `선수가 서면 ${LEAGUES[state.team.league].action} 버튼`;
  $('#meter-text').textContent = att.active ? '방해력' : '연습 중 (점수 없음)';
}

function mostUsedTool() {
  const [id] = Object.entries(state.usage).sort((a, b) => b[1] - a[1])[0];
  return TOOL_DEFS[id];
}

function finishExam() {
  const s = summarize(state.results);
  const t = mostUsedTool();
  state.summary = { ...s, name: state.name, team: state.team.name, teamId: state.team.id, league: state.team.league, tool: `${t.emoji} ${t.name}`.trim(), accent: state.team.color };
  const isBest = saveBest({ name: state.name, score: s.score, tool: t.name });
  const passed = s.score > 60;
  const madeCount = state.results.filter((r) => r.made).length;
  const status = $('#cert-status');
  status.textContent = passed
    ? '합격! 자격증을 발급받을 수 있습니다.'
    : '불합격: 60점 이하는 자격증을 발급받을 수 없습니다.';
  status.className = `cert-status ${passed ? 'pass' : 'fail'}`;
  $('#btn-cert').disabled = !passed;
  $('#btn-cert').textContent = passed ? '자격증 발급받기' : '자격증 발급 불가';

  $('#res-grade').innerHTML = `${s.grade.emoji} ${s.grade.name}<small>${s.grade.line}</small>`;
  $('#stats').innerHTML = [
    ['응시자', state.name],
    ['종목', LEAGUES[state.team.league].name],
    ['응원 구단', state.team.name],
    ['총 수비 시도', `${s.attempts}회`],
    ['허공 방어 성공', `${s.blocks}회`],
    [state.team.league === 'kbo' ? '실제 투구 결과' : '실제 슛 결과', `성공 ${madeCount}회 · 실패 ${s.attempts - madeCount}회`],
    ['방어 성공률', `${s.rate}%`],
    ['최종 수비 점수', `${s.score}점${isBest ? ' 🏆 최고기록' : ''}`],
    ['주력 장비', `${t.emoji} ${t.name}`.trim()],
    ['실제 경기 기여도', '0%'],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');
  $('#rounds').innerHTML = state.results
    .map((r, i) => `<li class="${r.blocked ? 'ok' : ''}">${i + 1}구<b>${state.team.league === 'kbo' ? '투구' : '슛'} ${r.made ? '성공' : '실패'}</b>${r.pts}점</li>`)
    .join('');
  show('s-result');
}

// ---------- 성적표 / 자격증 ----------
$('#btn-cert').addEventListener('click', () => {
  if (!state.summary || state.summary.score <= 60) return;
  const now = new Date();
  const url = renderCertificate({
    ...state.summary,
    date: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
    certNo: `${now.getFullYear()}-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
  });
  $('#cert-img').src = url;
  $('#btn-save').href = url;
  show('s-cert');
});

$('#btn-share').addEventListener('click', async () => {
  const s = state.summary;
  const text = `[허공수비대] ${s.team} · ${s.name} · ${s.grade.name} ${s.score}점 (방어 성공률 ${s.rate}%) — 실제 경기 기여도 0%`;
  try {
    const blob = await (await fetch($('#cert-img').src)).blob();
    const file = new File([blob], '허공수비_자격증.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
    else if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      alert('결과 문구를 복사했어요!');
    }
  } catch { /* 공유 취소 */ }
});

$('#btn-retry').addEventListener('click', startExam);
function newParticipant() { leaveExam(); renderBest(); show('s-intro'); }
$('#btn-home').addEventListener('click', newParticipant);
$('#btn-new-player').addEventListener('click', newParticipant);

// ---------- 입력: 시험 화면에서만 현재 장비와 한 포인터로 전달 ----------
const onHud = () => $('#s-hud').classList.contains('active');
canvas.addEventListener('pointerdown', (e) => {
  if (!onHud() || !state.inExam || state.pendingResult || activePointerId !== null || e.isPrimary === false) return;
  activePointerId = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  tools[state.toolId].pointerDown(e.clientX, e.clientY, state.attempt);
});
canvas.addEventListener('pointermove', (e) => {
  if (onHud() && state.inExam && !state.pendingResult && e.pointerId === activePointerId) {
    tools[state.toolId].pointerMove(e.clientX, e.clientY, state.attempt);
  }
});
const up = (e) => { if (e.pointerId === activePointerId) releaseInput(); };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('lostpointercapture', up);
window.addEventListener('blur', releaseInput);

// ---------- 루프 ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  render();
  requestAnimationFrame(frame);
}

function step(dt) {
  const att = state.attempt;
  if (att.active) {
    att.time += dt;
    state.usage[state.toolId] += dt;
    if (att.time >= ATTEMPT_SEC) endAttempt();
  }
  for (const t of Object.values(tools)) t.update(dt, att);
  if (onHud()) updateMeter();
  fx.update(dt);
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const [ox, oy] = fx.offset();
  ctx.translate(ox, oy);
  if (onHud()) tools[state.toolId].draw(ctx);
  fx.draw(ctx);
}

renderBest();
requestAnimationFrame(frame);

// 테스트용 훅
window.__heogong = { state, get tools() { return tools; }, ATTEMPT_SEC };

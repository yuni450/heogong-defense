import { initCamera } from './camera.js';
import { fx, theme, clamp } from './fx.js';
import { TOOL_DEFS } from './tools/index.js';
import { SHOTS, BLOCK_THRESHOLD, shotPoints, summarize } from './score.js';
import { renderCertificate } from './certificate.js';

// 가상 팀 (실제 구단명·로고 사용 안 함)
const TEAMS = [
  { id: 'thunders', name: '허공 썬더스', color: '#ff4d5e', emoji: '⚡' },
  { id: 'phoenix', name: '관중석 피닉스', color: '#ff9f1c', emoji: '🔥' },
  { id: 'dragons', name: '응원봉 드래곤즈', color: '#2ec4b6', emoji: '🐉' },
  { id: 'wings', name: '에어디펜스 윙즈', color: '#4d8dff', emoji: '🦅' },
];

const ATTEMPT_SEC = 3.5; // '자유투!' 버튼 후 방해 시간

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
const video = $('#cam');

const tools = Object.fromEntries(Object.entries(TOOL_DEFS).map(([id, d]) => [id, d.create()]));

const state = {
  name: '',
  team: TEAMS[0],
  toolId: Object.keys(TOOL_DEFS)[0],
  inExam: false,
  attempt: { active: false, time: 0 }, // 현재 자유투 시간창
  results: [],
  usage: {}, // 시간창 동안 장비별 사용 시간
  summary: null,
  pendingResult: null, // 측정 후 실제 슛 결과 입력 대기
};

let W = 0, H = 0, dpr = 1;
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

// ---------- 접수 / 팀 선택 ----------
$('#btn-apply').addEventListener('click', () => {
  fx.unlock();
  state.name = $('#name').value.trim() || '무명 관중';
  initCamera(video);
  show('s-team');
});

$('#teams').innerHTML = TEAMS.map(
  (t) => `<button class="opt" data-team="${t.id}" style="border-color:${t.color}">
    <span class="emo">${t.emoji}</span><span class="nm">${t.name}</span></button>`
).join('');
$('#teams').addEventListener('click', (e) => {
  const b = e.target.closest('[data-team]');
  if (!b) return;
  state.team = TEAMS.find((t) => t.id === b.dataset.team);
  setAccent(state.team.color);
  startExam();
});

// ---------- 하단 툴바: 언제든 장비 전환 ----------
$('#toolbar').innerHTML = Object.entries(TOOL_DEFS).map(
  ([id, d]) => `<button data-tool="${id}"><span class="emo">${d.emoji}</span>${d.name}</button>`
).join('');
$('#toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (b) selectTool(b.dataset.tool);
});
function selectTool(id) {
  state.toolId = id;
  document.querySelectorAll('#toolbar [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === id));
  $('#hud-hint').textContent = TOOL_DEFS[id].hint;
  fx.sound('tick');
}

// ---------- 실기시험 ----------
function startExam() {
  fx.clear();
  state.inExam = true;
  state.results = [];
  state.usage = Object.fromEntries(Object.keys(TOOL_DEFS).map((id) => [id, 0]));
  state.attempt = { active: false, time: 0 };
  state.pendingResult = null;
  $('#shot-outcome').hidden = true;
  selectTool(state.toolId);
  updateHud();
  show('s-hud');
}

$('#btn-shot').addEventListener('click', () => {
  if (!state.inExam || state.attempt.active || state.pendingResult) return;
  for (const t of Object.values(tools)) t.reset();
  state.attempt = { active: true, time: 0 };
  fx.sound('whoosh');
  fx.popup('막아라!!', W / 2, H * 0.4, { size: 44, color: theme.accent, life: 0.9 });
  updateHud();
});

function endAttempt() {
  state.attempt.active = false;
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
    fx.popup(made ? '슛 성공 · 수비 실패' : '슛 실패 · 방해력 부족', cx, cy, {
      color: '#ffffff', size: 28, life: 1.3,
    });
    fx.sound('goal');
  }
  fx.popup(`+${pts}점`, cx, cy + 80, { color: '#ffd166', size: 28, life: 1.2 });

  if (state.results.length >= SHOTS) {
    state.inExam = false;
    updateHud();
    setTimeout(finishExam, 1400);
  } else {
    updateHud();
  }
});

function updateHud() {
  const n = state.results.length;
  const dots = Array.from({ length: SHOTS }, (_, i) => {
    const r = state.results[i];
    if (r) return r.blocked ? '●' : '✕';
    return i === n ? '◉' : '○';
  }).join(' ');
  $('#hud-round').textContent = dots;
  $('#hud-score').textContent = `${state.results.reduce((s, r) => s + r.pts, 0)}점`;
  const btn = $('#btn-shot');
  btn.disabled = state.attempt.active || !!state.pendingResult || !state.inExam;
  btn.textContent = state.pendingResult ? '실제 슛 결과를 선택하세요' : state.attempt.active ? '방해 중!' : state.inExam ? `🏀 ${n + 1}번째 자유투!` : '채점 중…';
  $('#meter').classList.toggle('on', state.attempt.active);
}

function updateMeter() {
  const att = state.attempt;
  const live = tools[state.toolId].live();
  const fill = $('#meter-fill');
  fill.style.width = `${Math.round(live * 100)}%`;
  fill.classList.toggle('hot', live >= BLOCK_THRESHOLD);
  $('#time-fill').style.width = att.active ? `${(1 - att.time / ATTEMPT_SEC) * 100}%` : '0%';
  $('#meter-time').textContent = att.active ? `${Math.max(0, ATTEMPT_SEC - att.time).toFixed(1)}초` : '선수가 서면 자유투! 버튼';
  $('#meter-text').textContent = att.active ? '방해력' : '연습 중 (점수 없음)';
}

function mostUsedTool() {
  const [id] = Object.entries(state.usage).sort((a, b) => b[1] - a[1])[0];
  return TOOL_DEFS[id];
}

function finishExam() {
  const s = summarize(state.results);
  const t = mostUsedTool();
  state.summary = { ...s, name: state.name, team: state.team.name, tool: `${t.emoji} ${t.name}`, accent: state.team.color };
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
    ['총 수비 시도', `${s.attempts}회`],
    ['허공 방어 성공', `${s.blocks}회`],
    ['실제 슛 결과', `성공 ${madeCount}회 · 실패 ${s.attempts - madeCount}회`],
    ['방어 성공률', `${s.rate}%`],
    ['최종 수비 점수', `${s.score}점${isBest ? ' 🏆 최고기록' : ''}`],
    ['주력 장비', `${t.emoji} ${t.name}`],
    ['실제 경기 기여도', '0%'],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');
  $('#rounds').innerHTML = state.results
    .map((r, i) => `<li class="${r.blocked ? 'ok' : ''}">${i + 1}구<b>${r.made ? '슛 성공' : '슛 실패'}</b>${r.pts}점</li>`)
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
  const text = `[허공수비대] ${s.name} · ${s.grade.name} ${s.score}점 (방어 성공률 ${s.rate}%) — 실제 경기 기여도 0%`;
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
$('#btn-home').addEventListener('click', () => { renderBest(); show('s-intro'); });

// ---------- 입력: 시험 화면에서만 현재 장비로 전달 ----------
const onHud = () => $('#s-hud').classList.contains('active');
canvas.addEventListener('pointerdown', (e) => {
  if (!onHud()) return;
  canvas.setPointerCapture?.(e.pointerId);
  tools[state.toolId].pointerDown(e.clientX, e.clientY, state.attempt);
});
canvas.addEventListener('pointermove', (e) => {
  if (onHud()) tools[state.toolId].pointerMove(e.clientX, e.clientY, state.attempt);
});
const up = () => tools[state.toolId].pointerUp();
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

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
window.__heogong = { state, tools, ATTEMPT_SEC };

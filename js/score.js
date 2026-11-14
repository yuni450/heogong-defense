// 장비별 원점수(0~1)를 공통 기준으로 환산.
export const SHOTS = 5;
export const BLOCK_THRESHOLD = 0.6;

export const shotPoints = (r) => Math.round(Math.max(0, Math.min(1, r)) * (100 / SHOTS));

export const GRADES = [
  { min: 90, name: '관중석 국가대표', emoji: '🥇', line: '태극마크급 허공 수비. 상대 슈터가 꿈에 나올 정도.' },
  { min: 70, name: '프로 허공 수비수', emoji: '🥈', line: '관중석 주전 확정. 팅! 소리에 슈터가 흔들립니다(기분상).' },
  { min: 50, name: '응원단 연습생', emoji: '🥉', line: '가능성은 보입니다. 응원 열정만큼은 국가대표.' },
  { min: 0, name: '자격 미달', emoji: '🙈', line: '허공조차 막지 못했습니다. 재응시를 권합니다.' },
];

export const grade = (score) => GRADES.find((g) => score >= g.min);

export function summarize(results) {
  const total = results.reduce((s, r) => s + r.pts, 0);
  const blocks = results.filter((r) => r.blocked).length;
  return {
    attempts: results.length,
    blocks,
    rate: results.length ? Math.round((blocks / results.length) * 100) : 0,
    score: total,
    grade: grade(total),
  };
}

// 장비 목록 (C 담당). 새 장비는 여기에만 등록하면 툴바·점수에 자동 연결됨.
// 장비 인터페이스: layout(W,H), reset(), pointerDown/Move/Up(x,y,attempt), update(dt,attempt), live(), result(), draw(ctx)
import { createFinger } from './finger.js';
import { createUmbrella } from './umbrella.js';
import { createSponge } from './sponge.js';

export const TOOL_DEFS = {
  finger: { name: '손가락 팅', emoji: '👆', create: createFinger, hint: '화면 속 공이나 슈터를 톡톡 탭! 팅!' },
  umbrella: { name: '회전 우산', emoji: '☂️', create: createUmbrella, hint: '누른 채 원을 그려요' },
  sponge: { name: '스펀지 막대', emoji: '', create: createSponge, hint: '화면을 누른 채 스펀지 막대를 좌우로 흔들어요.' },
};

// 장비 목록 (C 담당). 새 장비는 여기에만 등록하면 툴바·점수에 자동 연결됨.
// 장비 인터페이스: layout(W,H), reset(), pointerDown/Move/Up(x,y,attempt), update(dt,attempt), live(), result(), draw(ctx)
import { createFinger } from './finger.js';
import { createCheerBat } from './cheer-bat.js';
import { createUmbrella } from './umbrella.js';
import { createSponge } from './sponge.js';
import { createVortex } from './vortex.js';
import { createLaughBoard } from './laugh-board.js';
import { createBag } from './bag.js';

export const TOOL_DEFS = {
  finger: { name: '손가락 팅', emoji: '👆', create: createFinger, hint: '‘지금!’ 신호에 한 번 탭! 첫 탭의 타이밍으로 채점해요.', league: 'kbl' },
  cheerBat: { name: '응원배트', emoji: '', create: createCheerBat, hint: '화면을 톡톡 누르면 배트가 딱!', league: 'kbo' },
  umbrella: { name: '회전 우산', emoji: '☂️', create: createUmbrella, hint: '누른 채 원을 그려요' },
  sponge: { name: '스펀지 막대', emoji: '', create: createSponge, hint: '화면을 누른 채 스펀지 막대를 좌우로 흔들어요.' },
  vortex: { name: '관중석 소용돌이', emoji: '', create: createVortex, hint: '누른 채 원을 그려 관중석을 함께 돌려요!', teamId: 'kbl-kt' },
  laughBoard: { name: 'ㅋㅋ 응원판', emoji: '', create: createLaughBoard, hint: '누른 채 좌우로 흔들면 ㅋㅋㅋ!', teamId: 'kbl-sono' },
  bag: { name: '마! 봉다리', emoji: '', create: createBag, hint: '화면을 짧게 위로 쓸어 올리면 마!', teamId: 'kbo-lotte' },
};

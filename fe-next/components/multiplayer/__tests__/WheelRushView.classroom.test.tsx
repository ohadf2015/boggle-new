import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/components/multiplayer/round/MpRoundMute', () => ({ MpRoundMute: () => null }));

import { WheelRushView } from '../WheelRushView';

type Handler = (...args: unknown[]) => void;
function makeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on: (e: string, cb: Handler) => { (handlers.get(e) ?? handlers.set(e, new Set()).get(e)!).add(cb); return socket; },
    off: (e: string, cb: Handler) => { handlers.get(e)?.delete(cb); return socket; },
    emit: vi.fn(),
    fire: (e: string, ...a: unknown[]) => handlers.get(e)?.forEach((cb) => cb(...a)),
  };
  return socket as unknown as Socket & { fire: (e: string, ...a: unknown[]) => void };
}

const puzzle = { centerLetter: 'A', outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'], allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'] };
const leaderboard = [{ username: 'alice', score: 10 }, { username: 'bob', score: 14 }];
const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|border-neo-cream|text-neo-cyan(\s|$)/;

const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');

function mount(classroom: boolean, state: 'loading' | 'failed' | 'fog' | 'played' | 'typed') {
  vi.useFakeTimers();
  const socket = makeSocket();
  const view = render(
    <ClassroomBoardProvider value={classroom}>
      <WheelRushView socket={socket} username="alice" leaderboard={leaderboard} onQuit={vi.fn()} t={(k) => k} remainingTime={60} totalTime={90} />
    </ClassroomBoardProvider>,
  );
  if (state === 'failed') act(() => { vi.advanceTimersByTime(9500); });
  if (state === 'fog') act(() => socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() }));
  if (state === 'played' || state === 'typed') act(() => socket.fire('wheelRushInit', { puzzle, startedAt: Date.now() - 120_000, myWords: ['cat', 'rat'] }));
  if (state === 'typed') ['C', 'A', 'T'].forEach((l) => fireEvent.click(screen.getAllByText(l)[0]));
  return view.container.firstElementChild!;
}

describe('WheelRushView classroom skin', () => {
  afterEach(() => vi.useRealTimers());

  it.each(['loading', 'failed', 'fog', 'played', 'typed'] as const)('arcade %s: the main game keeps its exact classes', (state) => {
    expect(classesOf(mount(false, state))).toMatchSnapshot();
  });

  it.each(['loading', 'failed', 'fog', 'played', 'typed'] as const)('classroom %s: sky page, cream chrome, no navy or white ink', (state) => {
    const root = mount(true, state);
    expect(root.className).toContain('bg-edu-page');
    // White ink on a solid red badge is the contract's allowed exception.
    const dark = classesOf(root).filter((c) => DARK.test(c) && !c.includes('bg-neo-red'));
    expect(dark).toEqual([]);
  });
});

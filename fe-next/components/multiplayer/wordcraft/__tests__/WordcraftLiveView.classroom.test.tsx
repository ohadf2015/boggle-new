import { describe, it, expect } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';
import { WordcraftLiveView } from '../WordcraftLiveView';
import type { WordcraftLiveSocket } from '../useWordcraftLive';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';

const t = (k: string) => k;
const SNAP: WordcraftLiveSnapshot = {
  gameCode: 'CRAFT1',
  boardSize: 9,
  rack: [
    { id: 't-1', letter: 'C', value: 3, isBlank: false },
    { id: 't-2', letter: 'A', value: 1, isBlank: false },
    { id: 't-3', letter: 'T', value: 1, isBlank: false },
  ],
  cells: [
    { row: 4, col: 3, letter: 'D', value: 2, isBlank: false, by: 'player' },
    { row: 4, col: 4, letter: 'O', value: 1, isBlank: false, by: 'bot' },
  ],
  botScore: 9,
  myScore: 12,
  moves: 2,
  bagCount: 38,
  targets: [{ word: 'CAT', built: true }, { word: 'DOG', built: false }],
};
const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|border-neo-cream|text-neo-cyan(\s|$)|text-neo-lime(\s|$)|text-neo-yellow(\s|$)/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');

function mount(classroom: boolean, state: 'waiting' | 'playing') {
  const handlers: Record<string, (p: unknown) => void> = {};
  const socket: WordcraftLiveSocket = { emit: () => {}, on: (e, fn) => { handlers[e] = fn; }, off: (e) => { delete handlers[e]; } };
  const { container } = render(
    <ClassroomBoardProvider value={classroom}>
      <WordcraftLiveView socket={socket} username="me" t={t} remainingTime={240} />
    </ClassroomBoardProvider>,
  );
  if (state === 'playing') {
    act(() => handlers['wordcraft:state']?.(SNAP));
    act(() => handlers['wordcraft:activity']?.({ username: 'Leo', words: [{ word: 'DOG', score: 5 }], score: 5, bingo: true }));
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-1' }));
  }
  return container.firstElementChild!;
}

describe('WordcraftLiveView classroom skin', () => {
  it.each(['waiting', 'playing'] as const)('arcade %s keeps its exact classes', (state) => {
    expect(classesOf(mount(false, state))).toMatchSnapshot();
  });

  it.each(['waiting', 'playing'] as const)('classroom %s: sky page, cream surfaces, no navy or light ink', (state) => {
    const root = mount(true, state);
    expect(root.className).toContain('bg-edu-page');
    expect(classesOf(root).filter((c) => DARK.test(c))).toEqual([]);
  });
});

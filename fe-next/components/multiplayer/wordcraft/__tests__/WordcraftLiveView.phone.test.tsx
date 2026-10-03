import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { WordcraftLiveView } from '../WordcraftLiveView';
import type { WordcraftLiveSocket } from '../useWordcraftLive';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const socket: WordcraftLiveSocket = {
    emit: () => {},
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
  };
  return { socket, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const t = (k: string, vars?: Record<string, string | number>) => (vars ? `${k} ${Object.values(vars).join(' ')}` : k);

const SNAP: WordcraftLiveSnapshot = {
  gameCode: 'CRAFT1',
  boardSize: 9,
  rack: [
    { id: 't-1', letter: 'C', value: 3, isBlank: false },
    { id: 't-2', letter: 'A', value: 1, isBlank: false },
    { id: 't-3', letter: 'T', value: 1, isBlank: false },
  ],
  cells: [],
  botScore: 0,
  myScore: 0,
  moves: 0,
  bagCount: 38,
  targets: Array.from({ length: 30 }, (_, i) => ({ word: `WORD${i}`, built: i === 3 })),
};

function renderLive() {
  const m = mockSocket();
  const view = render(<WordcraftLiveView socket={m.socket} username="me" t={t} remainingTime={240} />);
  m.trigger('wordcraft:state', SNAP);
  return { ...m, ...view };
}

describe('WordcraftLiveView on a phone', () => {
  it('fills its slot instead of forcing a full viewport of its own', () => {
    const { container } = renderLive();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('min-h-[100dvh]');
    expect(root.className).toContain('overflow-hidden');
  });

  it('squeezes thirty lesson words into one swipeable row with a progress count', () => {
    renderLive();
    const row = screen.getByTestId('race-targets');
    expect(row.className).toContain('flex-nowrap');
    expect(row.className).toContain('overflow-x-auto');
    expect(screen.getByTestId('race-targets-progress')).toHaveTextContent('eduStudent.wordcraft.targetsProgress 1 30');
  });

  it('marks the middle square on an empty board and tells the student what to do first', () => {
    renderLive();
    expect(screen.getByRole('button', { name: 'cell-4-4' })).toHaveTextContent('★');
    expect(screen.getByTestId('race-hint')).toHaveTextContent('eduStudent.wordcraft.hintFirst');
  });

  it('When two letters are tapped, Then the word previews in the middle and PLACE lights up', () => {
    renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-2' }));
    expect(screen.getByRole('button', { name: 'cell-4-4' })).toHaveTextContent('C');
    expect(screen.getByRole('button', { name: 'cell-4-5' })).toHaveTextContent('A');
    expect(screen.getByRole('button', { name: 'education.wordcraftLive.place' })).toBeEnabled();
    expect(screen.getByTestId('race-hint')).toHaveTextContent('eduStudent.wordcraft.hintReady');
  });

  it('When a word lands, Then a +score pops over the board', () => {
    const { trigger } = renderLive();
    trigger('wordcraft:placeResult', { accepted: true, score: 14, words: [{ word: 'CAT', score: 14 }] });
    const pop = screen.getByTestId('race-score-pop');
    expect(within(pop).getByText('+14')).toBeTruthy();
  });

  it('keeps the rack on a single row', () => {
    renderLive();
    expect(screen.getByTestId('race-rack').className).toContain('flex-nowrap');
  });
});

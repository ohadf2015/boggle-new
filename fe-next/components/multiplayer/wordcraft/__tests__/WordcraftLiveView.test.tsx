/**
 * WordcraftLiveView — the student's race surface, render glue over the tested
 * useWordcraftLive. The socket is the same structural mock the hook suite uses;
 * here we assert the UI mapping: waiting gate, 9×9 board with premiums, rack →
 * stage → anchor → PLACE emission, error surface, targets checklist, HUD.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordcraftLiveView } from '../WordcraftLiveView';
import type { WordcraftLiveSocket } from '../useWordcraftLive';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';
import type { RackTile } from '@/lib/word-craft/types';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const emits: { event: string; payload: unknown }[] = [];
  const socket: WordcraftLiveSocket = {
    emit: (event, payload) => emits.push({ event, payload }),
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
  };
  return { socket, emits, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const t = (k: string, vars?: Record<string, string | number>) =>
  vars ? `${k} ${Object.values(vars).join(' ')}` : k;

const RACK: RackTile[] = [
  { id: 't-1', letter: 'C', value: 3, isBlank: false },
  { id: 't-2', letter: 'A', value: 1, isBlank: false },
  { id: 't-3', letter: 'T', value: 1, isBlank: false },
];

const SNAP: WordcraftLiveSnapshot = {
  gameCode: 'CRAFT1',
  boardSize: 9,
  rack: RACK,
  cells: [],
  botScore: 12,
  myScore: 9,
  moves: 2,
  bagCount: 38,
  targets: [
    { word: 'CAT', built: false },
    { word: 'DOG', built: true },
  ],
};

function renderLive() {
  const m = mockSocket();
  render(<WordcraftLiveView socket={m.socket} username="me" t={t} remainingTime={240} />);
  return m;
}

describe('WordcraftLiveView — classroom pressure dials', () => {
  afterEach(() => useClassroomPressureStore.getState().setClassroomPressure(null));

  it('timer=off hides the race clock — the dial means NO student countdown', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'full', timer: 'off', speedScoring: true });
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.queryByTestId('race-clock')).toBeNull();
  });

  it('a full-pressure classroom keeps the clock — null pressure (public room) does too', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'full', timer: 'full', speedScoring: true });
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.getByTestId('race-clock')).toBeInTheDocument();
  });
});

describe('WordcraftLiveView', () => {
  it('waits for the personal board before dealing the UI', () => {
    renderLive();
    expect(screen.getByText('education.wordcraftLive.waitingBoard')).toBeInTheDocument();
  });

  it('deals a 9×9 board with premium squares once the snapshot lands', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.getAllByRole('button', { name: /^cell-/ })).toHaveLength(81);
    expect(screen.getAllByText(/^(DL|TL|DW|TW)$/).length).toBeGreaterThan(0);
  });

  it('shows the rack tiles with their values', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.getByRole('button', { name: 'tile-t-1' })).toHaveTextContent('C');
    expect(screen.getByRole('button', { name: 'tile-t-1' })).toHaveTextContent('3');
  });

  it('tap tiles → tap a cell → PLACE sends the server the placement', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-2' }));
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-3' }));
    fireEvent.click(screen.getByRole('button', { name: 'cell-4-2' }));
    fireEvent.click(screen.getByRole('button', { name: 'education.wordcraftLive.place' }));
    const place = m.emits.find((e) => e.event === 'wordcraft:place');
    expect(place?.payload).toEqual({
      placements: [
        { row: 4, col: 2, letter: 'C', value: 3, isBlank: false, rackTileId: 't-1' },
        { row: 4, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 't-2' },
        { row: 4, col: 4, letter: 'T', value: 1, isBlank: false, rackTileId: 't-3' },
      ],
    });
  });

  it('PLACE stays disabled until tiles are staged AND anchored', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.getByRole('button', { name: 'education.wordcraftLive.place' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-1' }));
    expect(screen.getByRole('button', { name: 'education.wordcraftLive.place' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cell-4-4' }));
    expect(screen.getByRole('button', { name: 'education.wordcraftLive.place' })).toBeEnabled();
  });

  it('a rejected word surfaces the mapped error and keeps the stage', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    fireEvent.click(screen.getByRole('button', { name: 'tile-t-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'cell-4-4' }));
    m.trigger('wordcraft:placeResult', { accepted: false, error: 'INVALID_WORD', invalidWord: 'C' });
    expect(screen.getByText('education.wordcraftLive.errors.invalidWord')).toBeInTheDocument();
    // Tile still staged — the student adjusts instead of re-tapping.
    expect(screen.getByTestId('staged-word')).toHaveTextContent('C');
  });

  it('lists the lesson targets and marks the built ones', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.getByTestId('target-DOG')).toHaveAttribute('data-built', 'true');
    expect(screen.getByTestId('target-CAT')).toHaveAttribute('data-built', 'false');
  });

  it('shows the you-vs-Baron score in the HUD', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    const hud = screen.getByTestId('race-hud');
    expect(hud).toHaveTextContent('9');
    expect(hud).toHaveTextContent('12');
  });

  it('runs the class activity ticker under the board', () => {
    const m = renderLive();
    m.trigger('wordcraft:state', SNAP);
    m.trigger('wordcraft:activity', {
      username: 'Ben',
      words: [{ word: 'DOG', score: 5 }],
      score: 5,
      bingo: false,
      lessonWord: 'DOG',
    });
    expect(screen.getByTestId('race-activity')).toHaveTextContent('Ben');
    expect(screen.getByTestId('race-activity')).toHaveTextContent('DOG');
  });
});

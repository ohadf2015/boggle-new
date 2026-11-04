import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { buildLessonCrossword } from '@/lib/crossword/lessonCrossword';
import { ProjectorCrosswordStage } from '../ProjectorCrosswordStage';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const emits: Array<{ event: string; data: unknown }> = [];
  const socket = {
    emit: (event: string, data: unknown) => { emits.push({ event, data }); },
    on: (event: string, fn: (p: unknown) => void) => { handlers[event] = fn; },
    off: (event: string) => { delete handlers[event]; },
  };
  return { socket, emits, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const t = (k: string, vars?: Record<string, string | number>) => (vars ? `${k} ${Object.values(vars).join(' ')}` : k);

const built = buildLessonCrossword({
  entries: [
    { word: 'planet', clue: 'A world that circles a star' },
    { word: 'orbit', clue: 'The path around a star' },
    { word: 'comet', clue: 'An icy visitor with a tail' },
    { word: 'moon', clue: 'It circles the Earth' },
  ],
  locale: 'en', seed: 1, id: 'lesson-1',
});
if (!built.ok) throw new Error('fixture grid did not build');
const PUZZLE = built.puzzle;

const standings = (rows: Array<[string, number, boolean]>) =>
  rows.map(([username, percent, solved], i) => ({ username, percent, solved, elapsedMs: 0, score: 0, rank: i + 1 }));

function renderStage() {
  const m = mockSocket();
  render(<ProjectorCrosswordStage socket={m.socket} remainingTime={400} t={t} />);
  m.trigger('crosswordMpInit', { puzzle: PUZZLE, players: ['Maya', 'Noah'], standings: standings([['Maya', 0, false], ['Noah', 0, false]]), startedAt: 1 });
  return m;
}

describe('ProjectorCrosswordStage', () => {
  afterEach(() => useClassroomPressureStore.getState().setClassroomPressure(null));

  it('asks the server for the live grid when it mounts and never submits progress of its own', () => {
    const m = renderStage();
    expect(m.emits.map((e) => e.event)).toEqual(['requestCrosswordMpState']);
  });

  it('shows the grid shape and clue numbers but never an answer letter', () => {
    renderStage();
    const grid = screen.getByTestId('crossword-silhouette');
    const answers = PUZZLE.slots.map((s) => s.answer);
    for (const answer of answers) expect(grid.textContent).not.toContain(answer);
    expect(grid.textContent).toMatch(/^[0-9]+$/);
  });

  it('ranks the race live and counts who has finished', () => {
    const m = renderStage();
    m.trigger('crosswordStandings', { standings: standings([['Noah', 100, true], ['Maya', 40, false]]) });
    const rows = within(screen.getByTestId('crossword-standings')).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Noah');
    expect(rows[0]).toHaveTextContent('eduCrossword.done');
    expect(rows[1]).toHaveTextContent('eduCrossword.percent 40');
    expect(screen.getByTestId('crossword-finished')).toHaveTextContent('eduCrossword.finished 1 2');
  });

  it('respects the calm dials: hidden standings and no clock', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'hidden', timer: 'off', speedScoring: false });
    renderStage();
    expect(screen.queryByTestId('crossword-standings')).not.toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-reveal-note')).toBeInTheDocument();
    expect(screen.queryByTestId('race-clock')).not.toBeInTheDocument();
  });

  it('shows a Hebrew grid right to left', () => {
    const he = buildLessonCrossword({
      entries: [{ word: 'שלום', clue: 'ברכה' }, { word: 'מלך', clue: 'שליט' }, { word: 'לחם', clue: 'מאפה' }],
      locale: 'he', seed: 2, id: 'he-1',
    });
    if (!he.ok) throw new Error('he grid did not build');
    const m = mockSocket();
    render(<ProjectorCrosswordStage socket={m.socket} remainingTime={10} t={t} />);
    m.trigger('crosswordMpInit', { puzzle: he.puzzle, players: [], standings: [], startedAt: 1 });
    expect(screen.getByTestId('crossword-silhouette')).toHaveAttribute('dir', 'rtl');
  });
});

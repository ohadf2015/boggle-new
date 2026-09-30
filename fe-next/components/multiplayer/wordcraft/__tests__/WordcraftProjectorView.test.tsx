/**
 * WordcraftProjectorView — the classroom screen. Standings come from the
 * shared leaderboard prop (same source every other mode's projector reads);
 * this view adds ONLY the wordcraft layer: the race ticker from
 * wordcraft:activity and the lesson-target checklist from wordcraft:init.
 * Critically it never emits requestState — the host must not be dealt a seat.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { render, screen, act } from '@testing-library/react';
import { WordcraftProjectorView } from '../WordcraftProjectorView';
import type { WordcraftLiveSocket } from '../useWordcraftLive';

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

const LEADERBOARD = [
  { username: 'Ben', score: 12 },
  { username: 'Ada', score: 30 },
  { username: 'Cid', score: 5 },
];

function renderProjector() {
  const m = mockSocket();
  render(
    <WordcraftProjectorView
      socket={m.socket}
      leaderboard={LEADERBOARD}
      t={t}
      remainingTime={240}
      onQuit={() => {}}
    />,
  );
  return m;
}

describe('WordcraftProjectorView — classroom pressure dials', () => {
  afterEach(() => useClassroomPressureStore.getState().setClassroomPressure(null));

  it('leaderboard=hidden swaps the standings for the reveal beat', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'hidden', timer: 'full', speedScoring: true });
    renderProjector();
    expect(screen.queryAllByTestId(/^standing-/)).toHaveLength(0);
    expect(screen.getByTestId('leaderboard-reveal-note')).toBeInTheDocument();
  });

  it('top3 trims the standings to the podium', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'top3', timer: 'full', speedScoring: true });
    const m = mockSocket();
    render(
      <WordcraftProjectorView
        socket={m.socket}
        leaderboard={[...LEADERBOARD, { username: 'Dee', score: 2 }]}
        t={t}
        remainingTime={240}
        onQuit={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^standing-/);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('data-testid'))).not.toContain('standing-Dee');
  });

  it('timer=off hides the projector clock — the class screen is a student clock too', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'full', timer: 'off', speedScoring: true });
    renderProjector();
    expect(screen.queryByTestId('race-clock')).toBeNull();
  });

  it('a full-pressure classroom keeps standings and clock', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'full', timer: 'full', speedScoring: true });
    renderProjector();
    expect(screen.getAllByTestId(/^standing-/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('race-clock')).toBeInTheDocument();
  });
});

describe('WordcraftProjectorView — spectator pull (projector reload mid-race)', () => {
  it('pulls the projector state on mount — a reload must not wait for the next round', () => {
    const m = renderProjector();
    expect(m.emits.some((e) => e.event === 'wordcraft:projectorState')).toBe(true);
    expect(m.emits.some((e) => e.event === 'wordcraft:requestState')).toBe(false);
  });

  it('renders the checklist from the pull response even when init never arrives', () => {
    const m = renderProjector();
    m.trigger('wordcraft:projectorState', {
      gameCode: 'CRAFT1',
      boardSize: 9,
      targets: [
        { word: 'CAT', built: true },
        { word: 'JUXTAPOSE', built: false },
      ],
    });
    expect(screen.getByTestId('target-CAT')).toHaveAttribute('data-built', 'true');
    expect(screen.getByTestId('target-JUXTAPOSE')).toHaveAttribute('data-built', 'false');
  });
});

describe('WordcraftProjectorView', () => {
  it('ranks the class by score, leader first', () => {
    renderProjector();
    const rows = screen.getAllByTestId(/^standing-/);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'standing-Ada',
      'standing-Ben',
      'standing-Cid',
    ]);
    expect(rows[0]).toHaveTextContent('30');
  });

  it('never asks for a player seat — no requestState emission', () => {
    const m = renderProjector();
    expect(m.emits.some((e) => e.event === 'wordcraft:requestState')).toBe(false);
  });

  it('runs the race ticker from activity broadcasts', () => {
    const m = renderProjector();
    m.trigger('wordcraft:activity', {
      username: 'Ada',
      words: [{ word: 'QUIZ', score: 38 }],
      score: 38,
      bingo: false,
      lessonWord: 'QUIZ',
    });
    expect(screen.getByTestId('race-activity')).toHaveTextContent('Ada');
    expect(screen.getByTestId('race-activity')).toHaveTextContent('QUIZ');
  });

  it('lists lesson targets from the init broadcast and checks off built ones', () => {
    const m = renderProjector();
    m.trigger('wordcraft:init', { gameCode: 'CRAFT1', boardSize: 9, targets: ['CAT', 'QUIZ'] });
    expect(screen.getByTestId('target-CAT')).toHaveAttribute('data-built', 'false');
    m.trigger('wordcraft:activity', {
      username: 'Ben',
      words: [{ word: 'QUIZ', score: 38 }],
      score: 38,
      bingo: false,
      lessonWord: 'QUIZ',
    });
    expect(screen.getByTestId('target-QUIZ')).toHaveAttribute('data-built', 'true');
  });

  it('flags a bingo in the ticker — the room should erupt', () => {
    const m = renderProjector();
    m.trigger('wordcraft:activity', {
      username: 'Cid',
      words: [{ word: 'JUMBLE', score: 80 }],
      score: 130,
      bingo: true,
      lessonWord: null,
    });
    expect(screen.getByTestId('race-activity')).toHaveTextContent('BINGO');
  });

  it('shows the round clock', () => {
    renderProjector();
    expect(screen.getByTestId('race-clock')).toHaveTextContent('4:00');
  });
});

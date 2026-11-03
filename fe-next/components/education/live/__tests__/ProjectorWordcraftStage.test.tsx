import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { sv } from '@/translations/sv';
import { ProjectorWordcraftStage } from '../ProjectorWordcraftStage';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const emits: string[] = [];
  const socket = {
    emit: (event: string) => { emits.push(event); },
    on: (event: string, fn: (p: unknown) => void) => { handlers[event] = fn; },
    off: (event: string) => { delete handlers[event]; },
  };
  return { socket, emits, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const t = (k: string, vars?: Record<string, string | number>) => (vars ? `${k} ${Object.values(vars).join(' ')}` : k);
const svT = (k: string) => {
  const v = k.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), sv);
  return typeof v === 'string' ? v : k;
};
const PLAYERS = [
  { username: 'Maya', score: 38, wordCount: 1 },
  { username: 'Noah', score: 12, wordCount: 1 },
  { username: 'Zoe', score: 0, wordCount: 0 },
  { username: 'Liam', score: 4, wordCount: 1 },
];

function renderStage() {
  const m = mockSocket();
  render(<ProjectorWordcraftStage socket={m.socket} players={PLAYERS} remainingTime={170} language="en" t={t} />);
  m.trigger('wordcraft:init', { gameCode: 'X', boardSize: 11, targets: ['RAIN', 'QUIZ', 'CLOUD'] });
  return m;
}

describe('ProjectorWordcraftStage', () => {
  afterEach(() => useClassroomPressureStore.getState().setClassroomPressure(null));

  it('Given the round just started, Then the wall is never blank: it shows the lesson words to build and every student', () => {
    renderStage();
    expect(screen.getByTestId('wordcraft-stage-waiting')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^wordcraft-target-/)).toHaveLength(3);
    expect(screen.getByTestId('tv-classroom-standings')).toHaveTextContent('Zoe');
  });

  it('Given a student builds a lesson word, Then the wall shows that word as tiles, who built it, the points and ticks the lesson word', () => {
    const m = renderStage();
    m.trigger('wordcraft:activity', { username: 'Maya', words: [{ word: 'QUIZ', score: 38 }], score: 38, bingo: false, lessonWord: 'QUIZ' });
    const hero = screen.getByTestId('wordcraft-latest-play');
    expect(within(hero).getAllByTestId('wordcraft-hero-tile').map((n) => n.textContent?.[0])).toEqual(['Q', 'U', 'I', 'Z']);
    expect(hero).toHaveTextContent('Maya');
    expect(hero).toHaveTextContent('+38');
    expect(screen.getByTestId('wordcraft-target-QUIZ')).toHaveAttribute('data-built', 'true');
    expect(screen.getByTestId('wordcraft-target-QUIZ')).toHaveTextContent('Maya');
    expect(screen.getByTestId('wordcraft-lesson-meter')).toHaveTextContent('1/3');
  });

  it('Given older plays, Then they stay visible in the ticker under the newest one', () => {
    const m = renderStage();
    m.trigger('wordcraft:activity', { username: 'Noah', words: [{ word: 'RAIN', score: 4 }], score: 4, bingo: false, lessonWord: 'RAIN' });
    m.trigger('wordcraft:activity', { username: 'Maya', words: [{ word: 'QUIZ', score: 38 }], score: 38, bingo: true, lessonWord: 'QUIZ' });
    expect(screen.getByTestId('wordcraft-ticker')).toHaveTextContent('Noah');
    expect(screen.getByTestId('wordcraft-latest-play')).toHaveTextContent('BINGO!');
  });

  it('Given the host is a spectator, Then it pulls the projector checklist and is never dealt a seat', () => {
    const m = renderStage();
    expect(m.emits).toContain('wordcraft:projectorState');
    expect(m.emits).not.toContain('wordcraft:requestState');
  });

  it('Given the teacher hides the leaderboard, Then the standings become the reveal note', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'hidden', timer: 'full', speedScoring: true });
    renderStage();
    expect(screen.queryByTestId('tv-classroom-standings')).toBeNull();
    expect(screen.getByTestId('leaderboard-reveal-note')).toBeInTheDocument();
  });

  it('Given the teacher shows only the top three, Then the wall never names the fourth student', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'top3', timer: 'full', speedScoring: true });
    renderStage();
    const standings = screen.getByTestId('tv-classroom-standings');
    expect(standings).not.toHaveTextContent('Zoe');
  });

  it('Given a Swedish class, Then every wall label is Swedish copy, never an English fallback', () => {
    const m = mockSocket();
    render(<ProjectorWordcraftStage socket={m.socket} players={PLAYERS} remainingTime={170} language="sv" t={svT} />);
    m.trigger('wordcraft:init', { gameCode: 'X', boardSize: 11, targets: ['REGN'] });
    const waiting = screen.getByTestId('wordcraft-stage-waiting');
    expect(waiting).toHaveTextContent(svT('education.wordcraftLive.tapLetters'));
    m.trigger('wordcraft:activity', { username: 'Maja', words: [{ word: 'REGN', score: 8 }], score: 8, bingo: false, lessonWord: 'REGN' });
    const hero = screen.getByTestId('wordcraft-latest-play');
    expect(hero).toHaveTextContent(svT('wordcraft.encouragement.0'));
    expect(hero).toHaveTextContent(svT('academy.modes.workshop.lessonWord'));
    expect(hero).not.toHaveTextContent(/Latest word|Lesson word!/);
  });

  it('Given the student timer is off, Then the wall drops its clock', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ leaderboard: 'full', timer: 'off', speedScoring: true });
    renderStage();
    expect(screen.queryByTestId('race-clock')).toBeNull();
  });
});

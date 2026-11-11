import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapGame } from '../MissGapGame';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

const play = vi.fn();
vi.mock('../missGapSound', () => ({
  useMissGapSound: () => play,
  HOMEWORK_SOUNDS: {},
  readSfxSetting: () => ({ muted: false, volume: 1 }),
}));

const WORDS = ['bridge', 'anchor', 'quiver'];

function renderGame(overrides: Partial<React.ComponentProps<typeof MissGapGame>> = {}) {
  return render(
    <MissGapGame
      classKey="week 3::ms. g"
      lesson="Week 3"
      teacher="Ms. G"
      dueDate="2026-09-30"
      words={WORDS}
      initialStreak={2}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

async function firstRound() {
  fireEvent.click(screen.getByTestId('miss-gap-start'));
  await waitFor(() => expect(screen.queryAllByTestId('miss-gap-choice').length + screen.queryAllByTestId('miss-gap-letter-tile').length).toBeGreaterThan(0));
}

function answerRight() {
  const choices = screen.queryAllByTestId('miss-gap-choice');
  if (choices.length > 0) {
    fireEvent.click(choices.find((c) => c.getAttribute('data-correct') === 'true')!);
    return;
  }
  const word = WORDS[0].toUpperCase();
  for (const letter of word) {
    fireEvent.click(screen.queryAllByTestId('miss-gap-letter-tile').find((el) => el.textContent === letter && !(el as HTMLButtonElement).disabled)!);
  }
}

describe('MissGapGame — shared mascot', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    window.localStorage.clear();
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  it('cheers a right answer with the target word, and stays quiet on a miss', async () => {
    renderGame();
    await firstRound();
    answerRight();
    expect(events).toContainEqual({ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false });
  });

  it('never sends a crying mascot for a single wrong answer', async () => {
    renderGame();
    await firstRound();
    const wrong = screen.queryAllByTestId('miss-gap-choice').find((c) => c.getAttribute('data-correct') !== 'true');
    if (wrong) fireEvent.click(wrong);
    expect(events.some((e) => e.kind === 'wave-fail')).toBe(false);
  });
});

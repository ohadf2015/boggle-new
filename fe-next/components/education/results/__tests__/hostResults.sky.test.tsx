import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));

import { PodiumStage } from '../PodiumStage';
import { WinnerSpotlight } from '../WinnerSpotlight';
import { ClassPulse } from '../ClassPulse';
import { MissedWordsList } from '../MissedWordsList';
import { TvRecapHeader } from '../TvRecapHeader';
import { FINAL_STAGE } from '@/lib/education/roundEndStage';

const t = (key: string) => key;
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
const entries = [
  { username: 'Maya', score: 148, rank: 1 },
  { username: 'Leo', score: 112, rank: 2 },
  { username: 'Noa', score: 87, rank: 3 },
];

describe('host results on the sky wall', () => {
  afterEach(cleanup);

  it('Given a winner, Then the podium stands on the static yellow rays', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    const stage = tokens(screen.getByTestId('podium-stage'));
    expect(stage).toEqual(expect.arrayContaining(['edu-rays-gold', 'shadow-edu-lip']));
  });

  it('Given nobody scored (muted), Then there are no rays: the party does not happen', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} muted />);
    expect(tokens(screen.getByTestId('podium-stage'))).not.toContain('edu-rays-gold');
  });

  it('the winner bar is a white card with the trophy in a pink square, not a pink slab', () => {
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 148 }} outcome="win" active size="projector" tone="calm" t={t} />);
    const bar = tokens(screen.getByTestId('winner-spotlight'));
    expect(bar).toContain('bg-edu-surface');
    expect(bar).not.toContain('bg-neo-pink');
    expect(tokens(screen.getByTestId('winner-mascot-frame'))).toContain('bg-neo-pink');
  });

  it('each class number carries its icon on its own colour square', () => {
    render(<ClassPulse stats={{ students: 12, words: 40, avgScore: 61 }} active={false} t={t} />);
    const fills = ['edu-stat-students', 'edu-stat-words', 'edu-stat-avg'].map((id) =>
      tokens(screen.getByTestId(id).querySelector('[data-testid="edu-stat-icon"]')!).find((c) => c.startsWith('bg-neo-'))
    );
    expect(fills).toEqual(['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow']);
  });

  it('missed words are lipped word cards, not round pills', () => {
    render(<MissedWordsList words={[{ word: 'crystal', found: 1, of: 12 }]} title="Missed" t={t} />);
    const chip = tokens(screen.getByTestId('edu-most-missed-word'));
    expect(chip).toEqual(expect.arrayContaining(['rounded-neo', 'border-[3px]', 'shadow-edu-lip-sm']));
    expect(chip).not.toContain('rounded-full');
  });

  it('the lesson chip in the header stands straight', () => {
    render(<TvRecapHeader title="Top scorers" lessonNames={['Weekly Vocabulary']} />);
    const chip = screen.getByText('Weekly Vocabulary').parentElement!;
    expect(tokens(chip).some((c) => /rotate/.test(c))).toBe(false);
  });
});

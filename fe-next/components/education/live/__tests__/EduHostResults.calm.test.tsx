import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EduHostResults from '@/components/education/live/EduHostResults';
import { TvRecapHeader } from '@/components/education/results/TvRecapHeader';
import { ZeroRoundNote } from '@/components/education/results/ZeroRoundNote';
import { ClassPulse } from '@/components/education/results/ClassPulse';
import { EmptyRoundCard } from '@/components/education/results/EmptyRoundCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const t = (key: string) => key;
const summary = {
  teacherName: 'T', lessonNames: [], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {}, podium: [],
} as unknown as ClassroomSummary;
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

describe('EduHostResults: calm round-end wall', () => {
  it('names the screen in plain cream, not shouted yellow capitals', () => {
    render(<TvRecapHeader title="eduLive.results.lineupTitle" lessonNames={['Autumn']} />);
    const title = screen.getByRole('heading');
    expect(tokens(title)).not.toContain('uppercase');
    expect(tokens(title)).not.toContain('text-neo-yellow');
    expect(tokens(title)).toContain('text-neo-cream');
  });

  it('labels every action in normal case', () => {
    render(<EduHostResults summary={summary} players={[{ username: 'Noa', score: 30, wordsFoundCount: 6 }]} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
    for (const id of ['edu-results-play-again', 'edu-results-next-mode', 'edu-results-end']) {
      expect(tokens(screen.getByTestId(id))).toContain('normal-case');
    }
  });

  it('puts the zero-round tip on a solid card so the podium art never shows through the text', () => {
    render(<ZeroRoundNote t={t} />);
    const note = screen.getByTestId('podium-zero-note');
    expect(tokens(note).filter((c) => /^bg-neo-navy[\w-]*\/\d+$/.test(c))).toEqual([]);
    expect(tokens(note)).toContain('bg-neo-navy');
  });

  it('reads the class numbers in cream, with no lime or cyan accents competing with Play again', () => {
    const { container } = render(<ClassPulse stats={{ students: 3, words: 12, avgScore: 40 }} active={false} t={t} />);
    expect(container.innerHTML).not.toMatch(/text-neo-(lime|cyan)/);
  });

  it('says an empty round in a calm heading, not cyan capitals', () => {
    render(<EmptyRoundCard t={t} />);
    expect(screen.getByTestId('empty-round-card').innerHTML).not.toMatch(/uppercase|text-neo-cyan/);
  });
});

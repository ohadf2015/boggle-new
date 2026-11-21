import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const HE: Record<string, string> = { 'eduLiveRoom.hostResults.streakKept': '{count} ימים ברצף' };
// The real context translator: t(key, fallback, params), answering in Hebrew.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'he',
    t: (key: string, fallback?: unknown, params?: Record<string, string | number>) =>
      HE[key] ? HE[key].replace('{count}', String(params?.count)) : typeof fallback === 'string' ? fallback : key,
  }),
}));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/education/results/useRoundEndReveal', () => ({ useRoundEndReveal: () => 'done', default: () => 'done' }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));

// The projector's narrow prop: a second argument is params, never a fallback.
const t = (key: string, params?: Record<string, string | number>) => (params && 'count' in params ? `${key}:${params.count}` : key);
const base = {
  teacherName: 'T', lessonNames: [], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {}, podium: [],
};
const players = [{ username: 'Noa', score: 30, wordsFoundCount: 6 }];

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ streak: 4, playedToday: true }) }) as unknown as typeof fetch;
});

describe('EduHostResults: class streak cue', () => {
  it('Given a known classroom and a settled reveal, Then the wall shows the class streak', async () => {
    render(<EduHostResults summary={{ ...base, classroomId: 'c1' } as unknown as ClassroomSummary} players={players} t={t} onRematch={vi.fn()} />);
    expect(await screen.findByTestId('class-streak-cue')).toHaveTextContent('4 ימים ברצף');
    expect(global.fetch).toHaveBeenCalledWith('/api/education/classroom/c1/streak');
  });

  it('Given no classroom id (guest host or practice), Then no cue and no request', async () => {
    render(<EduHostResults summary={base as unknown as ClassroomSummary} players={players} t={t} onRematch={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('edu-host-results')).toBeInTheDocument());
    expect(screen.queryByTestId('class-streak-cue')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Given the streak read fails, Then the results still render without the cue', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    render(<EduHostResults summary={{ ...base, classroomId: 'c1' } as unknown as ClassroomSummary} players={players} t={t} onRematch={vi.fn()} />);
    expect(screen.getByTestId('edu-results-play-again')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId('class-streak-cue')).toBeNull();
  });
});

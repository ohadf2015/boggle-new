/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapPracticeCard } from '../MissGapPracticeCard';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('MissGapPracticeCard', () => {
  beforeEach(() => {
    vi.mocked(openMissedWordsPracticeSheet).mockClear();
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('lists class-level missed words for take-home practice', () => {
    render(<MissGapPracticeCard payload={payload} />);
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-practice-words')).toHaveTextContent('neutron');
    expect(screen.getByTestId('miss-gap-practice-words')).toHaveTextContent('quark');
    expect(screen.queryByText('Maya')).not.toBeInTheDocument();
  });

  it('prints / saves PDF via the #957 practice sheet builder', () => {
    render(<MissGapPracticeCard payload={payload} />);
    fireEvent.click(screen.getByTestId('miss-gap-practice-print-pdf'));
    expect(openMissedWordsPracticeSheet).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(openMissedWordsPracticeSheet).mock.calls[0][0];
    expect(arg.missedWords).toEqual(['neutron', 'quark']);
    expect(arg.lesson).toBe('Physics 101');
  });

  it('shares the miss-gap practice card URL on lexiclash.live', async () => {
    render(<MissGapPracticeCard payload={payload} />);
    fireEvent.click(screen.getByTestId('miss-gap-practice-share'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('https://www.lexiclash.live/en/education/miss-gap-practice');
    expect(arg.url).toContain('neutron');
  });
});

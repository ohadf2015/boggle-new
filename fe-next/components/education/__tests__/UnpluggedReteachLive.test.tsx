import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpluggedReteachLive } from '../UnpluggedReteachLive';
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
  found: 1,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('UnpluggedReteachLive', () => {
  beforeEach(() => {
    vi.mocked(openMissedWordsPracticeSheet).mockClear();
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('renders the projector shell with the first word hidden until reveal', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    expect(screen.getByTestId('unplugged-reteach-live')).toBeInTheDocument();
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'false');
    expect(screen.queryByText('neutron')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'true');
    expect(screen.getByText('neutron')).toBeInTheDocument();
  });

  it('advances to the next word and resets reveal', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
    fireEvent.click(screen.getByTestId('unplugged-reteach-next'));
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'false');
    fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
    expect(screen.getByText('quark')).toBeInTheDocument();
  });

  it('prints the #957 practice sheet with missed words only', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('print-missed-words-practice-sheet'));
    expect(openMissedWordsPracticeSheet).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(openMissedWordsPracticeSheet).mock.calls[0][0];
    expect(arg.missedWords).toEqual(['neutron', 'quark']);
    expect(JSON.stringify(arg)).not.toContain('Maya');
  });

  it('shows allFound empty state when there are no missed words', () => {
    render(
      <UnpluggedReteachLive
        payload={{ ...payload, missedWords: [] }}
        educationHref="/en/education"
      />,
    );
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
    expect(screen.queryByTestId('unplugged-reteach-reveal')).not.toBeInTheDocument();
  });

  it('shares a miss-gap practice card URL for take-home PDF after Unplugged', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('share-miss-gap-practice'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('https://www.lexiclash.live/en/education/miss-gap-practice');
    expect(arg.url).toContain('neutron');
    expect(arg.url).not.toContain('Maya');
  });
});

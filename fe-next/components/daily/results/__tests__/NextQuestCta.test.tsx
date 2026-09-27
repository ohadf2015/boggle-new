import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextQuestCta } from '../NextQuestCta';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/daily/word-hunt',
  useSearchParams: () => new URLSearchParams(),
}));

const playedStatus = {
  today: { wordHunt: true, wordWheel: false, wordTower: false, connections: false },
  streak: { current: 1, longest: 1 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined,
  refresh: vi.fn(),
};

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => playedStatus,
}));

/**
 * Rendered through the REAL LanguageProvider on purpose. Most component suites
 * here mock `t` as an identity function, which makes a wrong key path — the
 * classic trap in this codebase — pass while the screen shows the literal key.
 */
function renderCta(justFinished: 'word-hunt' | 'word-wheel' = 'word-hunt') {
  return render(
    <LanguageProvider initialLanguage="en">
      <NextQuestCta justFinished={justFinished} currentLanguage="en" source="word_hunt_results" />
    </LanguageProvider>,
  );
}

describe('NextQuestCta', () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(trackGrowthEvent).mockClear();
    playedStatus.today = { wordHunt: true, wordWheel: false, wordTower: false, connections: false };
    playedStatus.loading = false;
  });

  it('offers the next unplayed mode, not the one just finished', () => {
    renderCta('word-hunt');
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta).toHaveAttribute('data-next-mode', 'word-wheel');
  });

  it('links to that mode, locale-prefixed', () => {
    renderCta('word-hunt');
    expect(screen.getByTestId('next-quest-cta')).toHaveAttribute('href', '/en/daily/word-wheel');
  });

  it('reports the handoff so the cross-promo stays measurable', async () => {
    renderCta('word-hunt');
    await userEvent.click(screen.getByTestId('next-quest-cta'));
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cross_promo_click',
      expect.objectContaining({ target: 'word-wheel', source: 'word_hunt_results' }),
    );
  });

  it('shows the all-clear state instead of a link once every mode is done', () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    renderCta('word-hunt');
    expect(screen.queryByTestId('next-quest-cta')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-quest-all-clear')).toBeInTheDocument();
  });

  it('renders nothing until the server play state has landed', () => {
    playedStatus.loading = true;
    renderCta('word-hunt');
    expect(screen.queryByTestId('next-quest-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('next-quest-all-clear')).not.toBeInTheDocument();
  });

  it('resolves its translation keys — no raw key or unfilled placeholder on screen', () => {
    const { container } = renderCta('word-hunt');
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/daily\.[a-zA-Z]/); // a raw key leaked through
    expect(text).not.toMatch(/[{}]/); // an unresolved {placeholder}
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it('labels the next mode with its real name, not its id', () => {
    renderCta('word-hunt');
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta.textContent).not.toContain('word-wheel');
    expect(cta.textContent).toMatch(/next up/i);
  });
});

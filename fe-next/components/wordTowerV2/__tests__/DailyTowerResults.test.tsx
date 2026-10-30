import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/word-tower/daily',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: { wordHunt: true, wordWheel: false, wordTower: true, connections: false },
    streak: { current: 3, longest: 5 },
    allCompletedDates: [],
    freezeCount: 0,
    loading: false,
    fromServer: true,
    refresh: vi.fn(),
  }),
}));

import { V2Results } from '../V2Results';

afterEach(cleanup);
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

type P = Parameters<typeof V2Results>[0];
const daily = (over: Partial<P> = {}) =>
  render(
    <LanguageProvider initialLanguage="en">
      <V2Results
        t={t}
        peakM={18}
        score={2400}
        bestM={30}
        isBest={false}
        run={{ ...createRun(1), floors: 6, bestCombo: 4, tenants: 23, crates: 3 }}
        badges={[]}
        unlocked={new Set<string>()}
        onRestart={() => {}}
        onHome={() => {}}
        onClose={() => {}}
        daily={{ growthM: 12, targetM: 15, totalM: 96, rank: 4 }}
        dateLabel="27 Oct"
        bestWord="tower"
        recapSrc="/api/word-tower/share?h=18"
        nextSlot={<div data-testid="next-quest" />}
        boardSlot={<div data-testid="tower-board" />}
        {...over}
      />
    </LanguageProvider>,
  );

describe('V2Results — daily tower', () => {
  it('given a daily run, when results show, then it is the dark shared daily sheet with the hero on top', () => {
    const { container } = daily();
    const sheet = screen.getByTestId('wt2-daily-results');
    expect(sheet.className).toContain('bg-neo-navy');
    expect(sheet.className).not.toContain('bg-neo-cream');
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.getAttribute('data-mode')).toBe('word-tower');
    expect(hero.textContent).toContain('27 Oct');
    // The day's score is growth, so the hero leads with it (not the run's points).
    expect(within(hero).getByTestId('daily-results-score').textContent).toBe('12');
    expect(hero.textContent).toContain('wordTowerV2.dailyTower.grewToday');
    expect(container.textContent).not.toContain('wordTowerV2.collapsed');
  });

  it('given a daily run, then the stats are floors, height and best word', () => {
    daily();
    const stats = screen.getAllByTestId('daily-results-stat').map((s) => s.textContent);
    expect(stats).toEqual([
      '6wordTowerV2.dailyResults.floors',
      '18.0wordTowerV2.unitMwordTowerV2.dailyResults.height',
      'TOWERwordTowerV2.dailyResults.bestWord',
    ]);
  });

  it('given a new daily best, then the headline says so and the outcome is a win', () => {
    daily({ isBest: true });
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.getAttribute('data-outcome')).toBe('win');
    expect(within(hero).getByRole('heading').textContent).toBe('wordTower.daily.newBest');
  });

  it('given no best and no goal, then the headline is the floor reached and the outcome is done', () => {
    daily();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.getAttribute('data-outcome')).toBe('done');
    expect(within(hero).getByRole('heading').textContent).toBe('wordTowerV2.dailyResults.headline:6');
  });

  it('given the goal is reached, then the goal meter says so', () => {
    daily({ daily: { growthM: 20, targetM: 15, totalM: 96, rank: null } });
    expect(screen.getByTestId('wt2-daily-meter').textContent).toContain('wordTowerV2.dailyTower.goalHit');
    expect(screen.getByTestId('daily-results-hero').getAttribute('data-outcome')).toBe('win');
  });

  it('given a rank, then the goal and rank show in the meter, and growth only once on the sheet', () => {
    daily();
    const meter = screen.getByTestId('wt2-daily-meter');
    expect(meter.textContent).not.toContain('+12wordTowerV2.unitM');
    expect(meter.textContent).toContain('12/15wordTowerV2.unitM');
    expect(meter.textContent).toContain('#4');
  });

  it('given the payout is still in flight (or not started), then coins show as incoming — never a dash', () => {
    for (const status of ['idle', 'pending'] as const) {
      daily({ payoutStatus: { status, coins: 0 } });
      expect(screen.getByTestId('wt2-daily-coins').textContent).toContain('wordTowerV2.results.coinsLoading');
      cleanup();
    }
  });

  it('given the payout landed, then the coins fill in', () => {
    daily({ payoutStatus: { status: 'paid', coins: 140 } });
    expect(screen.getByTestId('wt2-daily-coins').textContent).toContain('+140');
  });

  it('given the payout is in flight, then a sealed chest placeholder shows (no tier yet)', () => {
    daily({ payoutStatus: { status: 'pending', coins: 0 } });
    const row = screen.getByTestId('wt2-daily-chest');
    expect(row.getAttribute('data-state')).toBe('pending');
    expect(row.textContent).toContain('wordTowerV2.dailyResults.chestIncoming');
    expect(row.textContent).not.toContain('wordTowerV2.chest.tier');
  });

  it('given the payout landed with a chest, then the tier, chest coins and each item show — without a second modal', () => {
    daily({
      payoutStatus: { status: 'paid', coins: 140, chest: { tier: 'rare', coins: 180, shields: 0, bricks: 1, blueprints: 2 } },
    });
    const row = screen.getByTestId('wt2-daily-chest');
    expect(row.getAttribute('data-state')).toBe('paid');
    expect(row.getAttribute('data-tier')).toBe('rare');
    expect(row.textContent).toContain('wordTowerV2.chest.tier.rare');
    expect(row.textContent).toContain('+180');
    expect(row.textContent).toContain('wordTowerV2.chest.item.brick:1');
    expect(row.textContent).toContain('wordTowerV2.chest.item.blueprint:2');
    expect(row.textContent).not.toContain('wordTowerV2.chest.item.shield');
    expect(within(row).getByRole('img', { hidden: true }).getAttribute('src')).toContain('chest-rare-open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('given no payout (guest offline / failed report), then no chest row', () => {
    daily({ payoutStatus: { status: 'none', coins: 0 } });
    expect(screen.queryByTestId('wt2-daily-chest')).toBeNull();
  });

  it('given a chest row, then it sits under the hero and before the next quest', () => {
    daily({ payoutStatus: { status: 'paid', coins: 1, chest: { tier: 'common', coins: 45, shields: 0, bricks: 0, blueprints: 0 } } });
    const row = screen.getByTestId('wt2-daily-chest');
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.compareDocumentPosition(screen.getByTestId('next-quest')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given the order of the sheet, then next quest comes before the leaderboard', () => {
    daily();
    const next = screen.getByTestId('next-quest');
    const board = screen.getByTestId('tower-board');
    expect(next.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a share action, then the recap PNG and share button live in the hero footer', () => {
    const onShare = vi.fn();
    daily({ onShare });
    const hero = screen.getByTestId('daily-results-hero');
    expect(within(hero).getByRole('img').getAttribute('src')).toContain('/api/word-tower/share');
    fireEvent.click(within(hero).getByRole('button', { name: 'wordTowerV2.wreck.share' }));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('given a daily run, then no second streak (best-streak cell) is shown', () => {
    const { container } = daily();
    expect(container.textContent).not.toContain('wordTowerV2.results.combo');
  });

  it('given daily, then keep building and home are in the pinned actions bar', () => {
    const onRestart = vi.fn();
    const { container } = daily({ onRestart });
    const bar = container.querySelector('[data-wt2-results-actions]');
    const keep = screen.getByText('wordTowerV2.dailyTower.keepBuilding');
    expect(bar?.contains(keep)).toBe(true);
    expect(bar?.contains(screen.getByLabelText('wordTowerV2.results.home'))).toBe(true);
    fireEvent.click(keep);
    expect(onRestart).toHaveBeenCalledOnce();
  });
});

/**
 * DrillPageShell — one page shell for every drill (replaces 5 copy-pasted
 * PageClients) and the Brain Check entry point.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const saveDrillResult = vi.fn();
const drillProps: Record<string, unknown>[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useNavigation: () => ({ setIsInGame: vi.fn() }) }));
vi.mock('@/hooks/useDrillGrid', () => ({
  useDrillGrid: () => ({ grid: [['A']], availableWords: [], isLoading: false, regenerate: vi.fn() }),
}));
vi.mock('@/hooks/useSaveDrillResult', () => ({ useSaveDrillResult: () => ({ saveDrillResult }) }));
vi.mock('@/hooks/useDrillRewards', () => ({ useDrillRewards: () => ({ awardDrillRewards: vi.fn().mockResolvedValue({ xpAwarded: 10, goldAwarded: 5 }) }) }));
vi.mock('@/hooks/useDrillSignupNudge', () => ({ useDrillSignupNudge: () => ({ promptSignup: vi.fn(), signupNudge: null }) }));
vi.mock('@/hooks/useDrillLevel', () => ({ useDrillLevel: () => 4 }));
vi.mock('@/lib/drills/telemetry', () => ({ trackDrillStart: vi.fn() }));
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => <div data-testid="boost" /> }));
vi.mock('@/components/brain/DrillProgressionOverlay', () => ({
  default: (p: { brainCheck?: unknown }) => <div data-testid="overlay">{p.brainCheck ? 'check' : 'train'}</div>,
}));

import DrillPageShell from '../DrillPageShell';

const FakeDrill = (p: Record<string, unknown>) => { drillProps.push(p); return <div data-testid="drill" />; };

beforeEach(() => {
  drillProps.length = 0;
  saveDrillResult.mockReset();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checks: { 'lightning-round': { analysis: { verdict: 'need-more', runs: 1, runsNeeded: 4, daysNeeded: 0, baseline: null, current: null, changePct: null, rci: null, points: [] } } } }) }) as never;
});

const result = { score: 90, wordsFound: 9, timeSpent: 60, level: 1, wordsPerMinute: 9 };
const complete = () => (drillProps[drillProps.length - 1].onComplete as (r: typeof result) => Promise<void>)(result);

describe('DrillPageShell', () => {
  it('Given training mode, Then the drill runs at the player level with boosts available', () => {
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" />);
    expect(drillProps[0].level).toBe(4);
    expect(drillProps[0].assists).toBe(true);
    expect(screen.getByTestId('boost')).toBeInTheDocument();
  });

  it('Given check mode, Then the drill runs at the fixed protocol level, no boosts', async () => {
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" isCheck />);
    await screen.findByTestId('drill');
    expect(drillProps[0].level).toBe(1);
    expect(drillProps[0].assists).toBe(false);
    expect(screen.queryByTestId('boost')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'brain.check.title' })).toBeInTheDocument();
  });

  it('Given a check completes, Then it is submitted flagged and the verdict overlay opens', async () => {
    saveDrillResult.mockResolvedValue({ success: true, brainCheck: 'recorded', xpAwarded: 10, newLevel: 4, previousLevel: 4 });
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" isCheck />);
    await screen.findByTestId('drill');
    await act(async () => { await complete(); });
    expect(saveDrillResult.mock.calls[0][0]).toMatchObject({ drillType: 'lightning-round', level: 1, extraData: { benchmark: true, wordsPerMinute: 9 } });
    await waitFor(() => expect(screen.getByTestId('overlay')).toHaveTextContent('check'));
  });

  it('Given a training run saves without a brainScore, Then the overlay still opens', async () => {
    saveDrillResult.mockResolvedValue({ success: true, xpAwarded: 10, newLevel: 3, previousLevel: 4 });
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" />);
    await act(async () => { await complete(); });
    expect(saveDrillResult.mock.calls[0][0].extraData.benchmark).toBeUndefined();
    await waitFor(() => expect(screen.getByTestId('overlay')).toHaveTextContent('train'));
  });
});

describe('DrillPageShell cooldown gate', () => {
  it('Given a check link during cooldown, Then it shows the gate (no drill) with a train-instead link', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checks: { 'lightning-round': { available: false, nextAvailableAt: new Date(Date.now() + 5 * 3600_000).toISOString(), analysis: null } } }),
    }) as never;
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" isCheck />);
    expect(await screen.findByTestId('brain-check-cooldown')).toBeInTheDocument();
    expect(screen.queryByTestId('drill')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'brain.check.trainInstead' })).toHaveAttribute('href', '/en/brain/drills/lightning-round');
  });

  it('Given a guest (401), Then the check still plays (the save step nudges sign-up)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as never;
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" isCheck />);
    expect(await screen.findByTestId('drill')).toBeInTheDocument();
  });

  it('Given a check, Then the board size is recorded with the submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checks: { 'lightning-round': { available: true, nextAvailableAt: null, analysis: null } } }) }) as never;
    saveDrillResult.mockResolvedValue({ success: true, brainCheck: 'recorded', newLevel: 1, previousLevel: 1 });
    render(<DrillPageShell Drill={FakeDrill as never} drillType="lightning-round" isCheck />);
    await screen.findByTestId('drill');
    await act(async () => { await complete(); });
    expect(saveDrillResult.mock.calls[0][0].extraData.boardWords).toBe(0);
  });
});

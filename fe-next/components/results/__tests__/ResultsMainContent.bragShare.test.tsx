/**
 * The brag card must carry a LIVE join link when the room is still open —
 * the room persists through results for the rematch, so a shared link lands
 * the friend inside the next round, not on the homepage. Also guards the
 * native-share wiring (share text + tracking events).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control' }) }));
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));
vi.mock('@/components/results/ResultsHeroSection', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsPodium', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ConsolationRows', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/HighlightsBar', () => ({ __esModule: true, default: () => null }));
// Capture the brag card's wiring instead of rendering the poster.
const bragProps = vi.fn();
vi.mock('@/components/results/MpBragCard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    bragProps(props);
    return (
      <button data-testid="fake-native-share" onClick={() => (props.onNativeShare as () => void)?.()} />
    );
  },
}));
vi.mock('@/components/results/ImprovementPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/feedback/GameFeedback', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/NearRankTeaser', () => ({ NearRankTeaser: () => null }));
vi.mock('@/components/results/ResultsRevengeSection', () => ({ ResultsRevengeSection: () => null }));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsWordsSection', () => ({ ResultsWordsSection: () => null }));
vi.mock('@/components/results/RewardsSummary', () => ({ __esModule: true, default: () => null }));
vi.mock('@/utils/consolationCrowns', () => ({ assignConsolationCrowns: () => [] }));

import { ResultsMainContent } from '../ResultsMainContent';

/** The card sits behind a one-line "brag" strip now (it used to re-print the
 *  whole verdict inline). Open it before asserting on its wiring. */
const openBrag = () => fireEvent.click(screen.getByRole('button', { name: /brag.strip/i }));

const mk = (username: string, score: number) => ({ username, score, allWords: [] });
const baseProps = {
  nearMisses: [], isHost: false, onStartGame: vi.fn(), onMarkReady: vi.fn(), onExit: vi.fn(),
  winStreakData: null, isAuthenticated: true,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  normalizeUsername: (n: string) => n || '', isBotsOnlyGame: false, isCurrentPlayerReady: false,
  readyUsernames: [], duplicateRuleDisabled: false, t: (k: string) => k,
  sortedScores: [mk('bob', 500), mk('alice', 400)],
  currentPlayerData: mk('bob', 500),
  currentPlayerRank: 1,
  isCurrentUserWinner: true,
  username: 'bob',
  gameMode: 'classic',
} as any;  

beforeEach(() => {
  bragProps.mockClear();
  trackGrowthEvent.mockClear();
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://lexiclash.live', pathname: '/en/multiplayer', search: '' },
    writable: true,
  });
});

describe('ResultsMainContent — brag card share wiring', () => {
  it('shares a brag URL that carries the result, so the link unfurls the image', () => {
    // Was the bare room link (/{locale}?room=CODE). og:image comes from the
    // metadata of whatever URL is pasted, and the homepage cannot carry a
    // per-result image without going dynamic — so the link now points at the
    // brag page, which renders the image and passes the room code onward.
    render(<ResultsMainContent {...baseProps} gameCode="ABC123" />);
    openBrag();
    const props = bragProps.mock.calls.at(-1)?.[0];
    const parsed = new URL(props.shareUrl);
    expect(parsed.pathname).toMatch(/\/brag\/ABC123$/);
    expect(parsed.searchParams.get('score')).toBeTruthy();
    expect(parsed.searchParams.get('utm_source')).toBe('brag_card');
  });

  it('falls back to the homepage URL without a room code', () => {
    render(<ResultsMainContent {...baseProps} gameCode={undefined} />);
    openBrag();
    const props = bragProps.mock.calls.at(-1)?.[0];
    expect(props.shareUrl).toBe('https://lexiclash.live');
  });

  it('passes localized boast share text derived from the face-off', () => {
    render(<ResultsMainContent {...baseProps} gameCode="ABC123" />);
    openBrag();
    const props = bragProps.mock.calls.at(-1)?.[0];
    // The artifact is the OG image on the link; the text is only its caption,
    // so this is the localized boast and nothing else. No emoji, by product
    // decision. t() echoes the key in this harness.
    expect(props.shareText).toBe('brag.shareTextVs');
    expect(props.shareText).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
    );
  });

  it('tracks the native share as a growth event + unified share funnel', () => {
    render(<ResultsMainContent {...baseProps} gameCode="ABC123" />);
    openBrag();
    fireEvent.click(screen.getByTestId('fake-native-share'));
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'mp_brag_card_native_share',
      expect.objectContaining({ gameMode: 'classic', hasRoomLink: true })
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'share_completed',
      expect.objectContaining({ method: 'web_share_api', surface: 'mp_brag_card' })
    );
  });

  it('copies from the strip itself, with no expand step', () => {
    // Production 90d: 8,728 strip impressions produced 3 expands and 5 copies,
    // so gating copy behind the chevron cost essentially every share.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<ResultsMainContent {...baseProps} gameCode="ABC123" />);
    // deliberately NOT calling openBrag()
    fireEvent.click(screen.getByText('brag.share'));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('brag.shareTextVs');
    expect(copied).toMatch(/\/brag\/ABC123/);
    expect(copied).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
    );
  });

  it('shows the scoreline on the strip, and no emoji anywhere', () => {
    render(<ResultsMainContent {...baseProps} gameCode="ABC123" />);
    const text = document.body.textContent ?? '';
    // The strip previews what gets shared rather than saying "Brag" alone.
    expect(text).toMatch(/\d+\s*-\s*\d+|\d+/);
    expect(text).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
    );
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TvResultsView from '../TvResultsView';
import type { PlayerResult } from '@/types/components';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'variants']);
  const make = (tag: string) => {
    const C = React.forwardRef<HTMLElement, Record<string, unknown>>(({ children, ...props }, ref) => {
      const dom = Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)));
      return React.createElement(tag, { ref, ...dom }, children as React.ReactNode);
    });
    C.displayName = `m.${tag}`;
    return C;
  };
  return {
    m: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    MotionConfig: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  };
});

vi.mock('../TvResultsWinnersPodium', () => ({ default: () => <div data-testid="podium" /> }));
vi.mock('../TvResultsStatsGrid', () => ({ default: () => <div data-testid="stats" /> }));
vi.mock('../TvResultsAwards', () => ({ default: () => <div data-testid="awards" /> }));
vi.mock('../TvResultsPlayerSpotlight', () => ({ default: () => <div data-testid="spotlight" /> }));
vi.mock('../TvResultsLeaderboard', () => ({ default: () => <div data-testid="leaderboard" /> }));
vi.mock('../TvInstallQr', () => ({ default: () => <div data-testid="install-qr" /> }));
vi.mock('../../../../components/Avatar', () => ({ default: () => null }));
vi.mock('../../../../components/TournamentStandings', () => ({ default: () => null }));
vi.mock('../../../../components/results/PlayersReadyIndicator', () => ({
  default: () => <div data-testid="generic-ready-indicator" />,
}));
vi.mock('../../../../components/multiplayer/HostWordSelector', () => ({ HostWordSelector: () => null }));
vi.mock('../../../../components/blast/legacy/BlastMpResults', () => ({ default: () => null }));
vi.mock('../../../../components/multiplayer/MpModeBreakdown', () => ({ default: () => null }));
vi.mock('../../../../components/ui/DJMascot', () => ({ DJMascotWithEntrance: () => <div data-testid="dj-mascot" /> }));
vi.mock('../useTvResultsAnimation', () => ({
  useTvResultsAnimation: () => ({
    currentPhase: 'complete',
    getPhaseVisibility: () => true,
    isAnimating: false,
    skipToEnd: vi.fn(),
  }),
}));
vi.mock('../../../hooks/useTvFullscreen', () => ({
  useTvFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn(), isSupported: true }),
}));
vi.mock('@/hooks/gameState/store', () => ({ useGameMode: () => 'classic' }));
vi.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('../../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ sfxMuted: true, sfxVolume: 0 }),
}));
vi.mock('../../../../contexts/MusicContext', () => ({
  useMusic: () => ({ isMuted: true, audioUnlocked: false }),
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const scores = [
  { username: 'Maya', score: 90, wordsFoundCount: 2 },
  { username: 'Noa', score: 70, wordsFoundCount: 1 },
  { username: 'Bot', score: 50, wordsFoundCount: 1, isBot: true },
  { username: 'Lior', score: 40, wordsFoundCount: 1 },
] as unknown as PlayerResult[];

const props = {
  finalScores: scores,
  tournamentData: null,
  username: 'Host',
  playersReady: { readyCount: 1, totalPlayers: 4, readyUsernames: ['Maya'] },
  onStartNewGame: vi.fn(),
  onNextRound: vi.fn(),
  onShowQR: vi.fn(),
  t,
};

describe('TvResultsView — arcade wall composition', () => {
  it('paints one solid navy surface, no gradient ground', () => {
    render(<TvResultsView {...props} />);
    const root = screen.getByTestId('tv-results-root');
    expect(root.className).toMatch(/\bbg-neo-navy\b/);
    expect(root.className).not.toMatch(/bg-linear|from-/);
  });

  it('stacks top bar, stage and dock in flow so nothing sits under the dock', () => {
    render(<TvResultsView {...props} />);
    const root = screen.getByTestId('tv-results-root');
    const topBar = screen.getByTestId('tv-results-topbar');
    const stage = screen.getByTestId('tv-results-stage');
    const dock = screen.getByTestId('tv-results-dock');
    expect(dock.className).not.toMatch(/\bfixed\b|\babsolute\b/);
    expect(topBar.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stage.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root).toContainElement(dock);
  });

  it('keeps the install card and the mascot inside the top bar', () => {
    render(<TvResultsView {...props} />);
    const topBar = screen.getByTestId('tv-results-topbar');
    expect(topBar).toContainElement(screen.getByTestId('install-qr'));
    expect(topBar).toContainElement(screen.getByTestId('dj-mascot'));
  });

  it('puts podium, stats, awards, spotlight and the 4th+ standings on the one stage', () => {
    render(<TvResultsView {...props} />);
    const stage = screen.getByTestId('tv-results-stage');
    for (const id of ['podium', 'stats', 'awards', 'spotlight', 'leaderboard']) {
      expect(stage).toContainElement(screen.getByTestId(id));
    }
  });

  it('shows readiness in its own dock strip instead of the phone ready bar', () => {
    render(<TvResultsView {...props} />);
    expect(screen.queryByTestId('generic-ready-indicator')).not.toBeInTheDocument();
    expect(screen.getByTestId('tv-results-dock')).toContainElement(screen.getByTestId('tv-results-ready-strip'));
    expect(screen.getByTestId('ready-count')).toHaveTextContent('2/4');
  });

  it('prints the tournament round through a translation key', () => {
    render(<TvResultsView {...props} tournamentData={{ currentRound: 2, totalRounds: 5, isComplete: false }} />);
    expect(screen.getByText('tvResults.roundOf:{"current":2,"total":5}')).toBeInTheDocument();
  });
});

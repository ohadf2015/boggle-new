import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Socket } from 'socket.io-client';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/NeoToast', () => ({ neoInfoToast: vi.fn() }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/lib/overlayQuietZone', () => ({ useOverlayQuietZone: () => false }));
vi.mock('@/components/voting/WordFeedbackModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/engagement/ReferralMilestonePopup', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/auth/FirstWinSignupModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/GameFeedbackCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/modals/UnifiedShareModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/animations/LevelUpCelebration', () => ({
  LevelUpCelebration: (p: { level: number; title?: string | null; onDismiss?: () => void }) => (
    <button type="button" data-testid="level-up-celebration" data-level={p.level} data-title={p.title ?? ''} onClick={p.onDismiss} />
  ),
}));
vi.mock('@/components/avatar/reveal/ConnectedUnlockReveal', async () => {
  const { markRevealShown } = await import('@/lib/avatar/revealTrigger');
  function MockReveal({ reveal, onClose }: { reveal: Parameters<typeof markRevealShown>[0]; onClose: () => void }) {
    React.useEffect(() => { markRevealShown(reveal); }, [reveal]);
    return (
      <div data-testid="unlock-reveal">
        {reveal.unlocks.map(u => u.partId).join(',')}
        <button type="button" onClick={onClose}>close-reveal</button>
      </div>
    );
  }
  return { __esModule: true, default: MockReveal };
});

import { useResultsSocketEvents } from '../useResultsSocketEvents';
import { ResultsModals } from '../ResultsModals';
import { LevelUpWatcher } from '@/components/progression/LevelUpWatcher';
import { useRevealHost } from '@/lib/levelUp/useRevealHost';
import { __resetLevelUpBusForTests } from '@/lib/levelUp/levelUpBus';
import { __resetRevealSessionForTests, getPublishedReveal } from '@/lib/avatar/revealTrigger';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';

type Listener = (...args: unknown[]) => void;
function mockSocket() {
  const listeners: Record<string, Listener[]> = {};
  return {
    listeners,
    connected: true,
    emit: vi.fn(),
    on: vi.fn((e: string, cb: Listener) => { (listeners[e] ??= []).push(cb); }),
    off: vi.fn((e: string, cb: Listener) => { listeners[e] = (listeners[e] ?? []).filter(l => l !== cb); }),
  };
}

function MpResults({ socket }: { socket: ReturnType<typeof mockSocket> }) {
  useRevealHost();
  const s = useResultsSocketEvents({ socket: socket as unknown as Socket });
  return (
    <ResultsModals
      wordFeedback={{ showWordFeedback: false, wordToVote: null, wordQueue: [], onVote: vi.fn(), onSkip: vi.fn() }}
      referralMilestone={{ milestone: null, showReferralMilestone: false, onClose: vi.fn() }}
      levelUp={{ levelUpData: s.levelUpData, showLevelUpCelebration: s.showLevelUpCelebration, setShowLevelUpCelebration: s.setShowLevelUpCelebration, setLevelUpData: s.setLevelUpData }}
      authModal={{ showAuthModal: false, setShowAuthModal: vi.fn() }}
      firstWinModal={{ showFirstWinModal: false, setShowFirstWinModal: vi.fn() }}
    />
  );
}

function levelWithoutPart(min: number): number {
  const rungs = new Set(LEVEL_UNLOCK_LADDER.map(u => u.level));
  let l = min;
  while (rungs.has(l)) l++;
  return l;
}

const rung = LEVEL_UNLOCK_LADDER[0].level;

function levelUp(socket: ReturnType<typeof mockSocket>, oldLevel: number, newLevel: number, newTitles: string[] = []) {
  act(() => { for (const l of socket.listeners.levelUp ?? []) l({ oldLevel, newLevel, levelsGained: newLevel - oldLevel, newTitles }); });
}

beforeEach(() => {
  __resetLevelUpBusForTests();
  __resetRevealSessionForTests();
});

describe('Multiplayer level-up goes through the shared level-up bus', () => {
  it('Given a level-up that unlocks an avatar part, Then the reveal shows exactly once and no celebration', async () => {
    const socket = mockSocket();
    render(<><LevelUpWatcher /><MpResults socket={socket} /></>);
    levelUp(socket, rung - 1, rung);

    expect(await screen.findAllByTestId('unlock-reveal')).toHaveLength(1);
    expect(screen.getByTestId('unlock-reveal')).toHaveTextContent(getPublishedReveal()!.unlocks.map(u => u.partId).join(','));
    await waitFor(() => expect(screen.queryByTestId('level-up-celebration')).not.toBeInTheDocument());
  });

  it('Given a level-up with no avatar part, Then only the celebration shows, with its title', async () => {
    const socket = mockSocket();
    const lvl = levelWithoutPart(rung + 1);
    render(<><LevelUpWatcher /><MpResults socket={socket} /></>);
    levelUp(socket, lvl - 1, lvl, ['WORD_SEEKER']);

    const celebration = await screen.findByTestId('level-up-celebration');
    expect(celebration).toHaveAttribute('data-level', String(lvl));
    expect(celebration).toHaveAttribute('data-title', 'WORD_SEEKER');
    expect(screen.queryByTestId('unlock-reveal')).not.toBeInTheDocument();
  });

  it('Given the reveal was closed, When the next round mounts results again, Then it never comes back', async () => {
    const socket = mockSocket();
    const { unmount } = render(<><LevelUpWatcher /><MpResults socket={socket} /></>);
    levelUp(socket, rung - 1, rung);
    fireEvent.click(await screen.findByText('close-reveal'));
    await waitFor(() => expect(screen.queryByTestId('unlock-reveal')).not.toBeInTheDocument());
    expect(getPublishedReveal()).toBeNull();
    unmount();

    render(<><LevelUpWatcher /><MpResults socket={mockSocket()} /></>);
    await act(async () => {});
    expect(screen.queryByTestId('unlock-reveal')).not.toBeInTheDocument();
  });

  it('Given results left while the reveal was on screen, When results mount again, Then it does not show a second time', async () => {
    const socket = mockSocket();
    const { unmount } = render(<><LevelUpWatcher /><MpResults socket={socket} /></>);
    levelUp(socket, rung - 1, rung);
    await screen.findByTestId('unlock-reveal');
    unmount();

    render(<><LevelUpWatcher /><MpResults socket={mockSocket()} /></>);
    await act(async () => {});
    expect(screen.queryByTestId('unlock-reveal')).not.toBeInTheDocument();
  });
});

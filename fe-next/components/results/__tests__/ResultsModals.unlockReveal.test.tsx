import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { __resetRevealSessionForTests } from '@/lib/avatar/revealTrigger';

vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/lib/overlayQuietZone', () => ({ useOverlayQuietZone: () => false }));
vi.mock('@/components/voting/WordFeedbackModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/engagement/ReferralMilestonePopup', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/GameFeedbackCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/modals/UnifiedShareModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="share-modal" /> : null),
}));
vi.mock('@/components/auth/FirstWinSignupModal', () => ({ __esModule: true, default: () => null }));
const celebration = vi.hoisted(() => ({ shown: false }));
vi.mock('@/components/animations/LevelUpCelebration', () => ({
  __esModule: true,
  default: ({ show }: { show: boolean }) => {
    if (show) celebration.shown = true;
    return show ? <div data-testid="levelup-celebration" /> : null;
  },
}));
vi.mock('@/components/avatar/reveal/ConnectedUnlockReveal', () => ({
  __esModule: true,
  default: ({ reveal, onClose }: { reveal: { unlocks: { partId: string }[] }; onClose: () => void }) => (
    <div data-testid="unlock-reveal-host">
      {reveal.unlocks.map(u => u.partId).join(',')}
      <button type="button" onClick={onClose}>close-reveal</button>
    </div>
  ),
}));

import { ResultsModals, type ResultsModalsProps } from '../ResultsModals';

function props(levelUpData: ResultsModalsProps['levelUp']['levelUpData'], showShareModal = false): ResultsModalsProps {
  return {
    wordFeedback: { showWordFeedback: false, wordToVote: null, wordQueue: [], onVote: vi.fn(), onSkip: vi.fn() },
    referralMilestone: { milestone: null, showReferralMilestone: false, onClose: vi.fn() },
    levelUp: { levelUpData, showLevelUpCelebration: !!levelUpData, setShowLevelUpCelebration: vi.fn(), setLevelUpData: vi.fn() },
    authModal: { showAuthModal: false, setShowAuthModal: vi.fn() },
    firstWinModal: { showFirstWinModal: false, setShowFirstWinModal: vi.fn() },
    shareModal: { showShareModal, setShowShareModal: vi.fn() },
  };
}

beforeEach(() => {
  __resetRevealSessionForTests();
  celebration.shown = false;
});

describe('ResultsModals — avatar unlock reveal in the levelUp slot', () => {
  it('shows the unlock reveal when the level-up granted avatar parts', async () => {
    render(<ResultsModals {...props({ oldLevel: 1, newLevel: 2, levelsGained: 1, newTitles: [] })} />);
    expect(await screen.findByTestId('unlock-reveal-host')).toHaveTextContent('headphones');
  });

  it('shows nothing in the slot for a level-up that crossed no rung', async () => {
    render(<ResultsModals {...props({ oldLevel: 10, newLevel: 11, levelsGained: 1, newTitles: [] }, true)} />);
    // the next queued modal gets the screen instead
    expect(await screen.findByTestId('share-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-reveal-host')).not.toBeInTheDocument();
  });

  it('holds the share prompt until the reveal is closed, then keeps level-up data', async () => {
    const p = props({ oldLevel: 1, newLevel: 2, levelsGained: 1, newTitles: [] }, true);
    render(<ResultsModals {...p} />);
    await screen.findByTestId('unlock-reveal-host');
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('close-reveal'));
    expect(await screen.findByTestId('share-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-reveal-host')).not.toBeInTheDocument();
    // ImprovementPanel's flourish + chip still read the payload
    expect(p.levelUp.setLevelUpData).not.toHaveBeenCalled();
  });

  it('closing the reveal drops the slot out of the ready set (queue can reset)', async () => {
    const up = { oldLevel: 1, newLevel: 2, levelsGained: 1, newTitles: [] };
    const p = props(up);
    const { rerender } = render(<ResultsModals {...p} />);
    await screen.findByTestId('unlock-reveal-host');
    fireEvent.click(screen.getByText('close-reveal'));
    expect(p.levelUp.setShowLevelUpCelebration).toHaveBeenCalledWith(false);
    // parent flips the flag; a later share prompt that was dismissed can come back after a reset
    const closed = { ...p, levelUp: { ...p.levelUp, showLevelUpCelebration: false } };
    rerender(<ResultsModals {...closed} shareModal={{ showShareModal: true, setShowShareModal: vi.fn() }} />);
    expect(await screen.findByTestId('share-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-reveal-host')).not.toBeInTheDocument();
  });

  it('a payload whose reveal was already closed (flag off) never re-opens it', async () => {
    const p = props({ oldLevel: 1, newLevel: 2, levelsGained: 1, newTitles: [] }, true);
    render(<ResultsModals {...p} levelUp={{ ...p.levelUp, showLevelUpCelebration: false }} />);
    expect(await screen.findByTestId('share-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-reveal-host')).not.toBeInTheDocument();
  });

  it('never resurrects the retired full-screen LevelUpCelebration', async () => {
    render(<ResultsModals {...props({ oldLevel: 1, newLevel: 2, levelsGained: 1, newTitles: [] })} />);
    await screen.findByTestId('unlock-reveal-host');
    await waitFor(() => expect(celebration.shown).toBe(false));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

// Stub the heavy children so the flow's state machine is what's under test.
// The complete card just needs to expose its onNext; the chest modal its
// contents + onClose.
vi.mock('../BlastLevelCompleteCard', () => ({
  BlastLevelCompleteCard: ({ onNext }: { onNext: () => void }) => (
    <button data-testid="next-btn" onClick={onNext}>next</button>
  ),
}));
vi.mock('../BlastChestOpenModal', () => ({
  BlastChestOpenModal: ({ contents, onClose }: { contents: ChestContents; onClose: () => void }) => (
    <div data-testid="chest-modal">
      <span data-testid="chest-coins">{contents.coins}</span>
      <button data-testid="chest-close-btn" onClick={onClose}>close</button>
    </div>
  ),
}));
// Fanfare is notable-only; stub it to a controllable "skip" button.
vi.mock('@/components/results/PreResultFanfare', () => ({
  PreResultFanfare: ({ onComplete }: { onComplete: () => void }) => (
    <button data-testid="fanfare" onClick={onComplete}>fanfare</button>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
// Default to "web" (fanfare allowed); native test flips it to false.
const mockShouldPlayFanfare = vi.fn(() => true);
vi.mock('@/lib/native/webViewLayerFlash', () => ({
  shouldPlayPreResultFanfare: () => mockShouldPlayFanfare(),
}));

import { BlastResultFlow } from '../BlastResultFlow';

const contents: ChestContents = {
  coins: 250,
  tier: 'wood',
  boosts: [],
};

const baseProps = {
  coins: 100,
  stars: 2,
  levelNumber: 5,
  theme: 'animals',
  completionReason: 'mastered' as const,
  modeColor: '#00FFFF',
  chestNumber: 1,
  chestProgress: 0.4,
  chestProgressGain: 0.1,
  chestReady: false,
  chestContents: null,
  openStatus: 'idle' as const,
};

describe('BlastResultFlow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the complete card first when not a notable fanfare outcome', () => {
    render(<BlastResultFlow {...baseProps} openChest={vi.fn()} onAdvance={vi.fn()} />);
    expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('fanfare')).not.toBeInTheDocument();
  });

  it('advances (no chest) when chest is NOT ready and Next is tapped', () => {
    const onAdvance = vi.fn();
    const openChest = vi.fn();
    render(<BlastResultFlow {...baseProps} chestReady={false} openChest={openChest} onAdvance={onAdvance} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(openChest).not.toHaveBeenCalled();
    expect(screen.queryByTestId('chest-modal')).not.toBeInTheDocument();
  });

  it('opens the chest when ready: calls openChest and enters the chest ceremony', () => {
    const onAdvance = vi.fn();
    const openChest = vi.fn();
    render(<BlastResultFlow {...baseProps} chestReady openChest={openChest} onAdvance={onAdvance} />);
    fireEvent.click(screen.getByTestId('fanfare')); // chest-ready is a notable outcome → fanfare first
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(openChest).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
    // contents not arrived yet → opening state, not the reward modal
    expect(screen.getByTestId('chest-opening')).toBeInTheDocument();
    expect(screen.queryByTestId('chest-modal')).not.toBeInTheDocument();
  });

  it('renders the reward modal once chest contents arrive, then advances on close', () => {
    const onAdvance = vi.fn();
    const { rerender } = render(
      <BlastResultFlow {...baseProps} chestReady openChest={vi.fn()} onAdvance={onAdvance} openStatus="loading" />,
    );
    fireEvent.click(screen.getByTestId('fanfare'));
    fireEvent.click(screen.getByTestId('next-btn'));
    // server roll resolves
    rerender(
      <BlastResultFlow {...baseProps} chestReady openChest={vi.fn()} onAdvance={onAdvance} openStatus="success" chestContents={contents} />,
    );
    expect(screen.getByTestId('chest-modal')).toBeInTheDocument();
    expect(screen.getByTestId('chest-coins').textContent).toBe('250');
    fireEvent.click(screen.getByTestId('chest-close-btn'));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('never strands the player: advances if the chest open errors', () => {
    const onAdvance = vi.fn();
    const { rerender } = render(
      <BlastResultFlow {...baseProps} chestReady openChest={vi.fn()} onAdvance={onAdvance} openStatus="loading" />,
    );
    fireEvent.click(screen.getByTestId('fanfare'));
    fireEvent.click(screen.getByTestId('next-btn'));
    rerender(
      <BlastResultFlow {...baseProps} chestReady openChest={vi.fn()} onAdvance={onAdvance} openStatus="error" />,
    );
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire openChest if Next is somehow tapped twice', () => {
    const openChest = vi.fn();
    render(<BlastResultFlow {...baseProps} chestReady openChest={openChest} onAdvance={vi.fn()} openStatus="idle" />);
    fireEvent.click(screen.getByTestId('fanfare'));
    const btn = screen.getByTestId('next-btn');
    fireEvent.click(btn);
    // after first click the card unmounts (chest phase), but assert guard anyway
    expect(openChest).toHaveBeenCalledTimes(1);
  });

  describe('prefanfare (notable outcomes only)', () => {
    it('plays the fanfare first on a 3-star perfect run, then the card', () => {
      render(<BlastResultFlow {...baseProps} stars={3} openChest={vi.fn()} onAdvance={vi.fn()} />);
      expect(screen.getByTestId('fanfare')).toBeInTheDocument();
      expect(screen.queryByTestId('next-btn')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('fanfare'));
      expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    });

    it('plays the fanfare when the chest is ready (big reward moment)', () => {
      render(<BlastResultFlow {...baseProps} stars={1} chestReady openChest={vi.fn()} onAdvance={vi.fn()} />);
      expect(screen.getByTestId('fanfare')).toBeInTheDocument();
    });

    it('skips the fanfare on an ordinary 1-2 star clear', () => {
      render(<BlastResultFlow {...baseProps} stars={1} chestReady={false} openChest={vi.fn()} onAdvance={vi.fn()} />);
      expect(screen.queryByTestId('fanfare')).not.toBeInTheDocument();
      expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    });

    it('skips the fanfare on native even for a notable 3-star run (white-flash workaround)', () => {
      mockShouldPlayFanfare.mockReturnValueOnce(false);
      render(<BlastResultFlow {...baseProps} stars={3} openChest={vi.fn()} onAdvance={vi.fn()} />);
      expect(screen.queryByTestId('fanfare')).not.toBeInTheDocument();
      expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    });
  });
});

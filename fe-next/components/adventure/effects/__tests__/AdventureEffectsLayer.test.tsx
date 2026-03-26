/**
 * AdventureEffectsLayer Tests
 *
 * Tests for the extracted effects layer component.
 * Ensures all visual effects render correctly and callbacks work.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureEffectsLayer, {
  type AdventureEffectsLayerProps,
  type ScorePopupData,
  type PendingExplosion,
} from '../AdventureEffectsLayer';
import type { LexiReaction } from '@/hooks/useLexiReactions';
import type { BossTier } from '@/components/celebration/BossDefeatFireworks';

// Mock all effect components
vi.mock('../../juice/ScorePopup', () => ({
  ScorePopup: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="score-popup" onClick={onComplete}>Score Popup</div>
  ),
}));

vi.mock('../../LexiReaction', () => ({
  __esModule: true,
  default: ({ reaction, onDismiss }: { reaction: LexiReaction | null; onDismiss: () => void }) => (
    reaction ? <div data-testid="lexi-reaction" onClick={onDismiss}>Lexi: {reaction.type}</div> : null
  ),
}));

vi.mock('@/components/animations/ChainParticleBurst', () => ({
  ChainParticleBurst: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="chain-burst" onClick={onComplete}>Chain Burst</div>
  ),
}));

vi.mock('../../juice/AdaptiveParticles', () => ({
  AdaptiveParticles: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="adaptive-particles" onClick={onComplete}>Adaptive Particles</div>
  ),
}));

vi.mock('../../juice/ExplosionEffect', () => ({
  ExplosionEffect: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="explosion" onClick={onComplete}>Explosion</div>
  ),
}));

vi.mock('@/components/education/LevelUpCelebration', () => ({
  LevelUpCelebration: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="level-up" onClick={onClose}>Level Up!</div>
  ),
}));

vi.mock('../../ComboMilestoneOverlay', () => ({
  ComboMilestoneOverlay: () => <div data-testid="combo-milestone">Combo Milestone</div>,
}));

vi.mock('@/components/celebration/BossDefeatFireworks', () => ({
  BossDefeatFireworks: () => <div data-testid="boss-fireworks">Boss Fireworks</div>,
}));

// Helper to create a mock LexiReaction
const createMockReaction = (type: 'celebration' | 'encourage' | 'levelComplete' | 'hint' = 'celebration'): LexiReaction => ({
  id: 1,
  type,
  variant: 'happy',
  messageKey: 'test.message',
  priority: 'normal',
});

describe('AdventureEffectsLayer', () => {
  const mockScoreDisplayRef: React.RefObject<HTMLDivElement | null> = { current: null };

  const defaultProps: AdventureEffectsLayerProps = {
    currentPopup: null,
    onPopupComplete: vi.fn(),
    scoreDisplayRef: mockScoreDisplayRef,
    reaction: null,
    onDismissReaction: vi.fn(),
    chainBurstConfig: null,
    onChainBurstComplete: vi.fn(),
    world: 1,
    particleConfig: null,
    onParticleComplete: vi.fn(),
    pendingExplosions: [],
    onExplosionComplete: vi.fn(),
    levelUpData: null,
    onLevelUpClose: vi.fn(),
    currentMilestone: null,
    isBossLevel: false,
    showBossFireworks: false,
    defeatedBossTier: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Score Popups', () => {
    it('should render score popup when currentPopup is provided', () => {
      const popup: ScorePopupData = {
        id: 1,
        value: 100,
        x: 50,
        y: 100,
      };

      render(<AdventureEffectsLayer {...defaultProps} currentPopup={popup} />);

      expect(screen.getByTestId('score-popup')).toBeInTheDocument();
    });

    it('should not render score popup when currentPopup is null', () => {
      render(<AdventureEffectsLayer {...defaultProps} currentPopup={null} />);

      expect(screen.queryByTestId('score-popup')).not.toBeInTheDocument();
    });

    it('should call onPopupComplete when popup completes', () => {
      const onPopupComplete = vi.fn();
      const popup: ScorePopupData = {
        id: 1,
        value: 100,
        x: 50,
        y: 100,
      };

      render(
        <AdventureEffectsLayer
          {...defaultProps}
          currentPopup={popup}
          onPopupComplete={onPopupComplete}
        />
      );

      screen.getByTestId('score-popup').click();

      expect(onPopupComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lexi Reactions', () => {
    it('should render Lexi reaction when reaction is provided', () => {
      const mockReaction = createMockReaction('celebration');
      render(<AdventureEffectsLayer {...defaultProps} reaction={mockReaction} />);

      expect(screen.getByTestId('lexi-reaction')).toBeInTheDocument();
      expect(screen.getByText('Lexi: celebration')).toBeInTheDocument();
    });

    it('should not render Lexi reaction when reaction is null', () => {
      render(<AdventureEffectsLayer {...defaultProps} reaction={null} />);

      expect(screen.queryByTestId('lexi-reaction')).not.toBeInTheDocument();
    });

    it('should call onDismissReaction when reaction is dismissed', () => {
      const onDismissReaction = vi.fn();
      const mockReaction = createMockReaction('celebration');

      render(
        <AdventureEffectsLayer
          {...defaultProps}
          reaction={mockReaction}
          onDismissReaction={onDismissReaction}
        />
      );

      screen.getByTestId('lexi-reaction').click();

      expect(onDismissReaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chain Bursts', () => {
    it('should render chain burst when config is provided', () => {
      const config = {
        trigger: true,
        position: { x: 100, y: 100 },
      };

      render(<AdventureEffectsLayer {...defaultProps} chainBurstConfig={config} />);

      expect(screen.getByTestId('chain-burst')).toBeInTheDocument();
    });

    it('should not render chain burst when config is null', () => {
      render(<AdventureEffectsLayer {...defaultProps} chainBurstConfig={null} />);

      expect(screen.queryByTestId('chain-burst')).not.toBeInTheDocument();
    });

    it('should call onChainBurstComplete when burst completes', () => {
      const onChainBurstComplete = vi.fn();
      const config = {
        trigger: true,
        position: { x: 100, y: 100 },
      };

      render(
        <AdventureEffectsLayer
          {...defaultProps}
          chainBurstConfig={config}
          onChainBurstComplete={onChainBurstComplete}
        />
      );

      screen.getByTestId('chain-burst').click();

      expect(onChainBurstComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adaptive Particles', () => {
    it('should render adaptive particles when config is provided', () => {
      const config = {
        intensity: 3 as const,
        origin: { x: 100, y: 100 },
      };

      render(<AdventureEffectsLayer {...defaultProps} particleConfig={config} />);

      expect(screen.getByTestId('adaptive-particles')).toBeInTheDocument();
    });

    it('should not render adaptive particles when config is null', () => {
      render(<AdventureEffectsLayer {...defaultProps} particleConfig={null} />);

      expect(screen.queryByTestId('adaptive-particles')).not.toBeInTheDocument();
    });
  });

  describe('Explosions', () => {
    it('should render multiple explosion effects', () => {
      const explosions: PendingExplosion[] = [
        { id: 1, position: { x: 50, y: 50 }, intensity: 2 },
        { id: 2, position: { x: 100, y: 100 }, intensity: 3 },
      ];

      render(<AdventureEffectsLayer {...defaultProps} pendingExplosions={explosions} />);

      const explosionElements = screen.getAllByTestId('explosion');
      expect(explosionElements).toHaveLength(2);
    });

    it('should call onExplosionComplete with correct id when explosion completes', () => {
      const onExplosionComplete = vi.fn();
      const explosions: PendingExplosion[] = [
        { id: 1, position: { x: 50, y: 50 }, intensity: 2 },
      ];

      render(
        <AdventureEffectsLayer
          {...defaultProps}
          pendingExplosions={explosions}
          onExplosionComplete={onExplosionComplete}
        />
      );

      screen.getByTestId('explosion').click();

      expect(onExplosionComplete).toHaveBeenCalledWith(1);
    });
  });

  describe('Boss Effects', () => {
    it('should render boss fireworks when boss level and fireworks active', () => {
      render(
        <AdventureEffectsLayer
          {...defaultProps}
          isBossLevel={true}
          showBossFireworks={true}
          defeatedBossTier="elite"
        />
      );

      expect(screen.getByTestId('boss-fireworks')).toBeInTheDocument();
    });

    it('should not render boss fireworks when not a boss level', () => {
      render(
        <AdventureEffectsLayer
          {...defaultProps}
          isBossLevel={false}
          showBossFireworks={true}
        />
      );

      expect(screen.queryByTestId('boss-fireworks')).not.toBeInTheDocument();
    });
  });

  describe('Combo Milestone', () => {
    it('should always render combo milestone overlay', () => {
      render(<AdventureEffectsLayer {...defaultProps} />);

      expect(screen.getByTestId('combo-milestone')).toBeInTheDocument();
    });
  });
});

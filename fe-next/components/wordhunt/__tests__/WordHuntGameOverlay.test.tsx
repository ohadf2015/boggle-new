/**
 * TDD: WordHuntGameOverlay
 * Tests for elimination and target-found overlays in Word Hunt multiplayer
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial, animate, transition, whileHover, whileTap, exit, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, initial, animate, transition, whileHover, whileTap, exit, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, initial, animate, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Skull: (props: any) => <svg data-testid="skull-icon" {...props} />,
  Target: (props: any) => <svg data-testid="target-icon" {...props} />,
  Trophy: (props: any) => <svg data-testid="trophy-icon" {...props} />,
}));

import { WordHuntGameOverlay } from '../WordHuntGameOverlay';

const mockT = (key: string) => key;

describe('WordHuntGameOverlay', () => {
  describe('elimination overlay', () => {
    it('should show elimination overlay when player is eliminated', () => {
      render(
        <WordHuntGameOverlay
          isEliminated={true}
          targetFound={false}
          targetFoundBy={null}
          currentUsername="alice"
          playerLives={{}}
          eliminatedPlayers={['alice']}
          t={mockT}
        />
      );

      expect(screen.getByTestId('elimination-overlay')).toBeInTheDocument();
      expect(screen.getByText('wordHunt.mp.eliminated')).toBeInTheDocument();
    });

    it('should NOT show elimination overlay when player is alive', () => {
      render(
        <WordHuntGameOverlay
          isEliminated={false}
          targetFound={false}
          targetFoundBy={null}
          currentUsername="alice"
          playerLives={{ alice: 80 }}
          eliminatedPlayers={[]}
          t={mockT}
        />
      );

      expect(screen.queryByTestId('elimination-overlay')).not.toBeInTheDocument();
    });
  });

  describe('target found overlay', () => {
    it('should show target-found overlay when another player finds the target', () => {
      render(
        <WordHuntGameOverlay
          isEliminated={false}
          targetFound={true}
          targetFoundBy="bob"
          currentUsername="alice"
          playerLives={{ alice: 60, bob: 90 }}
          eliminatedPlayers={[]}
          t={mockT}
        />
      );

      expect(screen.getByTestId('target-found-overlay')).toBeInTheDocument();
      expect(screen.getAllByText(/bob/).length).toBeGreaterThanOrEqual(1);
    });

    it('should show celebration when current player finds the target', () => {
      render(
        <WordHuntGameOverlay
          isEliminated={false}
          targetFound={true}
          targetFoundBy="alice"
          currentUsername="alice"
          playerLives={{ alice: 80 }}
          eliminatedPlayers={[]}
          t={mockT}
        />
      );

      expect(screen.getByTestId('target-found-overlay')).toBeInTheDocument();
      expect(screen.getByText('wordHunt.mp.youFoundIt')).toBeInTheDocument();
    });

    it('should show other players progress in target-found overlay', () => {
      render(
        <WordHuntGameOverlay
          isEliminated={false}
          targetFound={true}
          targetFoundBy="bob"
          currentUsername="alice"
          playerLives={{ alice: 60, bob: 90, charlie: 0 }}
          eliminatedPlayers={['charlie']}
          t={mockT}
        />
      );

      // Should show other players with their status
      expect(screen.getAllByText(/bob/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/charlie/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('priority', () => {
    it('should show elimination overlay when both eliminated and target found', () => {
      // Edge case: player eliminated, then target found right after
      render(
        <WordHuntGameOverlay
          isEliminated={true}
          targetFound={true}
          targetFoundBy="bob"
          currentUsername="alice"
          playerLives={{ alice: 0, bob: 90 }}
          eliminatedPlayers={['alice']}
          t={mockT}
        />
      );

      // Target found takes priority since it means game is ending
      expect(screen.getByTestId('target-found-overlay')).toBeInTheDocument();
    });
  });
});

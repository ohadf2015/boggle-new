/**
 * Comprehensive test for all NextStepPrompt navigation modes
 *
 * This test ensures that ALL next step navigation paths work correctly:
 * - Practice → Challenge Bots (singleplayer?preset=bots)
 * - Solo-Bots → Try Daily Challenge (daily)
 * - Daily → Go Multiplayer (multiplayer)
 * - Multiplayer-Bots → Try Daily Challenge (daily)
 *
 * Each navigation MUST clear the session before navigating to prevent
 * players from getting stuck on the results page.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Track session clearing and navigation
const mockClearSession = vi.fn();
const mockRouterPush = vi.fn();

// Mock session utility
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: () => mockClearSession(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nextStep.challengeBots': 'Challenge the Bots!',
        'nextStep.challengeBotsDesc': 'Test your skills against AI opponents',
        'nextStep.tryDailyChallenge': 'Try Daily Challenge',
        'nextStep.tryDailyChallengeDesc': 'Same puzzle for everyone worldwide - compete globally!',
        'nextStep.goMultiplayer': 'Go Multiplayer!',
        'nextStep.goMultiplayerDesc': 'Compete with real players',
        'nextStep.goMultiplayerFromDaily': 'Why Stop at One?',
        'nextStep.goMultiplayerFromDailyDesc': 'Unlimited games, real opponents — no waiting until tomorrow',
        'nextStep.backToLobby': 'Back to Lobby',
        'nextStep.letsGo': "Let's Go!",
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

describe('NextStepPrompt - All Navigation Modes', () => {
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockClearSession.mockClear();
    mockRouterPush.mockClear();
  });

  describe('Practice Mode → Challenge Bots', () => {
    const testVariants = ['desktop', 'mobile', 'landscape'] as const;

    testVariants.forEach((variant) => {
      it(`should clear session and navigate to /en/singleplayer?preset=bots (${variant})`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode="practice"
            onBackToLobby={mockOnBackToLobby}
            variant={variant}
          />
        );

        // Find and click the navigation button
        const navButton = variant === 'desktop'
          ? screen.getByRole('button', { name: /let's go/i })
          : screen.getByText('Challenge the Bots!');

        await user.click(navButton);

        // Verify session was cleared BEFORE navigation
        expect(mockClearSession).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');

        // Verify correct order: clear session first, then navigate
        const clearCallOrder = mockClearSession.mock.invocationCallOrder[0];
        const pushCallOrder = mockRouterPush.mock.invocationCallOrder[0];
        expect(clearCallOrder).toBeLessThan(pushCallOrder);
      });
    });
  });

  describe('Solo-Bots Mode → Try Daily Challenge', () => {
    const testVariants = ['desktop', 'mobile', 'landscape'] as const;

    testVariants.forEach((variant) => {
      it(`should clear session and navigate to /en/daily (${variant})`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode="solo-bots"
            onBackToLobby={mockOnBackToLobby}
            variant={variant}
          />
        );

        // Find and click the navigation button
        const navButton = variant === 'desktop'
          ? screen.getByRole('button', { name: /let's go/i })
          : screen.getByText('Try Daily Challenge');

        await user.click(navButton);

        // Verify session was cleared BEFORE navigation
        expect(mockClearSession).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');

        // Verify correct order
        const clearCallOrder = mockClearSession.mock.invocationCallOrder[0];
        const pushCallOrder = mockRouterPush.mock.invocationCallOrder[0];
        expect(clearCallOrder).toBeLessThan(pushCallOrder);
      });
    });

    it('should call onAction instead of navigating when callback is provided', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      render(
        <NextStepPrompt
          currentMode="solo-bots"
          onBackToLobby={mockOnBackToLobby}
          onAction={mockOnAction}
          variant="mobile"
        />
      );

      const navButton = screen.getByText('Try Daily Challenge');
      await user.click(navButton);

      // Should call onAction, not clear session or navigate
      expect(mockOnAction).toHaveBeenCalledTimes(1);
      expect(mockClearSession).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('Daily Mode → Go Multiplayer', () => {
    const testVariants = ['desktop', 'mobile', 'landscape'] as const;

    testVariants.forEach((variant) => {
      it(`should clear session and navigate to /en/multiplayer (${variant})`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode="daily"
            onBackToLobby={mockOnBackToLobby}
            variant={variant}
          />
        );

        // Find and click the navigation button
        const navButton = variant === 'desktop'
          ? screen.getByRole('button', { name: /let's go/i })
          : screen.getByText('Why Stop at One?');

        await user.click(navButton);

        // Verify session was cleared BEFORE navigation
        expect(mockClearSession).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/en/multiplayer');

        // Verify correct order
        const clearCallOrder = mockClearSession.mock.invocationCallOrder[0];
        const pushCallOrder = mockRouterPush.mock.invocationCallOrder[0];
        expect(clearCallOrder).toBeLessThan(pushCallOrder);
      });
    });
  });

  describe('Multiplayer-Bots Mode → Try Daily Challenge', () => {
    const testVariants = ['desktop', 'mobile', 'landscape'] as const;

    testVariants.forEach((variant) => {
      it(`should clear session and navigate to /en/daily (${variant})`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode="multiplayer-bots"
            onBackToLobby={mockOnBackToLobby}
            variant={variant}
          />
        );

        // Find and click the navigation button
        const navButton = variant === 'desktop'
          ? screen.getByRole('button', { name: /let's go/i })
          : screen.getByText('Try Daily Challenge');

        await user.click(navButton);

        // Verify session was cleared BEFORE navigation
        expect(mockClearSession).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');

        // Verify correct order
        const clearCallOrder = mockClearSession.mock.invocationCallOrder[0];
        const pushCallOrder = mockRouterPush.mock.invocationCallOrder[0];
        expect(clearCallOrder).toBeLessThan(pushCallOrder);
      });
    });
  });

  describe('Back to Lobby button', () => {
    it('should call onBackToLobby callback without clearing session', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      const backButton = screen.getByText('Back to Lobby');
      await user.click(backButton);

      // onBackToLobby should be called
      expect(mockOnBackToLobby).toHaveBeenCalledTimes(1);

      // Session should NOT be cleared for back button (different from navigation)
      expect(mockClearSession).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});

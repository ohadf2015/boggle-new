/**
 * Test for session cleanup when navigating from NextStepPrompt
 *
 * Bug: When clicking "Try Daily Challenge" (or other navigation buttons) from the
 * results page, the component should clear the current game session before navigating.
 * Without this, players get stuck on the results page even after clicking the button.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Mock clearSessionPreservingUsername utility
const mockClearSessionPreservingUsername = vi.fn();
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: () => mockClearSessionPreservingUsername(),
}));

// Track navigation
const mockRouterPush = vi.fn();

// Mock next/navigation (for useRouter)
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
        'nextStep.letsGo': "Let's Go!",
        'nextStep.backToLobby': 'Back to Lobby',
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

describe('NextStepPrompt - Session Cleanup on Navigation', () => {
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockClearSessionPreservingUsername.mockClear();
    mockRouterPush.mockClear();
  });

  describe('Bug: Navigation from multiplayer-bots mode should clear session', () => {
    it('should clear session before navigating to daily challenge (desktop)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="desktop"
        />
      );

      // Click the "Let's Go!" button that navigates to daily challenge
      const buttonElement = screen.getByRole('button', { name: /let's go/i });
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    });

    it('should clear session before navigating to daily challenge (mobile)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // Click the mobile navigation button
      const buttonElement = screen.getByText('Try Daily Challenge');
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    });

    it('should clear session before navigating to daily challenge (landscape)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="landscape"
        />
      );

      // Click the landscape navigation button
      const buttonElement = screen.getByText('Try Daily Challenge');
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    });
  });

  describe('Session cleanup for all navigation modes', () => {
    const testCases = [
      { mode: 'practice' as const, expectedHref: '/en/singleplayer?preset=bots' },
      { mode: 'solo-bots' as const, expectedHref: '/en/daily' },
      { mode: 'daily' as const, expectedHref: '/en/multiplayer' },
      { mode: 'multiplayer-bots' as const, expectedHref: '/en/daily' },
    ];

    testCases.forEach(({ mode, expectedHref }) => {
      it(`should clear session when navigating from ${mode} mode`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode={mode}
            onBackToLobby={mockOnBackToLobby}
            variant="desktop"
          />
        );

        const buttonElement = screen.getByRole('button', { name: /let's go/i });
        await user.click(buttonElement);

        // Every navigation should clear the session
        expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith(expectedHref);
      });
    });
  });
});

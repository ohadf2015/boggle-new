/**
 * Test for session cleanup when navigating from NextStepPrompt
 *
 * Bug: When clicking "Train Your Brain" (or other navigation buttons) from the
 * results page, the component should clear the current game session before navigating.
 * Without this, players get stuck on the results page even after clicking the button.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Mock clearSessionPreservingUsername utility
const mockClearSessionPreservingUsername = jest.fn();
jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: () => mockClearSessionPreservingUsername(),
}));

// Track navigation
const mockRouterPush = jest.fn();

// Mock next/navigation (for useRouter)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nextStep.brainTraining': 'Train Your Brain',
        'nextStep.brainTrainingDesc': 'Track your cognitive growth',
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
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

describe('NextStepPrompt - Session Cleanup on Navigation', () => {
  const mockOnBackToLobby = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockClearSessionPreservingUsername.mockClear();
    mockRouterPush.mockClear();
  });

  describe('Bug: Navigation from multiplayer-bots mode should clear session', () => {
    it('should clear session before navigating to brain training (desktop)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="desktop"
        />
      );

      // Click the "Let's Go!" button that navigates to brain training
      const buttonElement = screen.getByRole('button', { name: /let's go/i });
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/brain');
    });

    it('should clear session before navigating to brain training (mobile)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // Click the mobile navigation button
      const buttonElement = screen.getByText('Train Your Brain');
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/brain');
    });

    it('should clear session before navigating to brain training (landscape)', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="landscape"
        />
      );

      // Click the landscape navigation button
      const buttonElement = screen.getByText('Train Your Brain');
      await user.click(buttonElement);

      // CRITICAL: Session should be cleared BEFORE navigation
      expect(mockClearSessionPreservingUsername).toHaveBeenCalledTimes(1);

      // Navigation should happen after session is cleared
      expect(mockRouterPush).toHaveBeenCalledWith('/en/brain');
    });
  });

  describe('Session cleanup for all navigation modes', () => {
    const testCases = [
      { mode: 'practice' as const, expectedHref: '/en/singleplayer?preset=bots' },
      { mode: 'solo-bots' as const, expectedHref: '/en/daily' },
      { mode: 'daily' as const, expectedHref: '/en/multiplayer' },
      { mode: 'multiplayer-bots' as const, expectedHref: '/en/brain' },
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

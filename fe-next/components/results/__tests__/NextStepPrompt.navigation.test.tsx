import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Track clicks on Link
const mockRouterPush = jest.fn();

// Mock next/link to track actual link clicks
jest.mock('next/link', () => {
  return function MockLink({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void }) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          mockRouterPush(href);
          onClick?.();
        }}
        {...props}
      >
        {children}
      </a>
    );
  };
});

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nextStep.challengeBots': 'Challenge the Bots!',
        'nextStep.challengeBotsDesc': 'Test your skills against AI opponents',
        'nextStep.dailyChallenge': 'Daily Challenge',
        'nextStep.dailyChallengeDesc': 'Same puzzle as everyone worldwide',
        'nextStep.goMultiplayer': 'Go Multiplayer!',
        'nextStep.goMultiplayerDesc': 'Compete with real players',
        'nextStep.brainTraining': 'Train Your Brain',
        'nextStep.brainTrainingDesc': 'Track your cognitive growth',
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

describe('NextStepPrompt Navigation', () => {
  const mockOnBackToLobby = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
  });

  describe('Mobile variant click navigation', () => {
    it('should navigate when mobile link card is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // The mobile Link is the whole card area
      const linkElement = screen.getByRole('link');
      await user.click(linkElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');
    });

    it('should navigate when clicking on title text inside mobile link', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="solo-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // Click specifically on the title text inside the link
      const titleElement = screen.getByText('Daily Challenge');
      await user.click(titleElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    });
  });

  describe('Landscape variant click navigation', () => {
    it('should navigate when landscape link is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="daily"
          onBackToLobby={mockOnBackToLobby}
          variant="landscape"
        />
      );

      const linkElement = screen.getByRole('link');
      await user.click(linkElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/multiplayer');
    });
  });

  describe('Desktop variant click navigation', () => {
    it('should navigate when desktop "Let\'s Go" button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="desktop"
        />
      );

      // In desktop, the CTA is a Link with "Let's Go!" text
      const linkElement = screen.getByRole('link', { name: /let's go/i });
      await user.click(linkElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/brain');
    });

    it('should navigate when clicking on text inside the desktop CTA button', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          variant="desktop"
        />
      );

      // Click specifically on the "Let's Go!" text
      const textSpan = screen.getByText("Let's Go!");
      await user.click(textSpan);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');
    });
  });

  describe('All modes navigate correctly', () => {
    const testCases = [
      { mode: 'practice' as const, expectedHref: '/en/singleplayer?preset=bots' },
      { mode: 'solo-bots' as const, expectedHref: '/en/daily' },
      { mode: 'daily' as const, expectedHref: '/en/multiplayer' },
      { mode: 'multiplayer-bots' as const, expectedHref: '/en/brain' },
    ];

    testCases.forEach(({ mode, expectedHref }) => {
      it(`should navigate to ${expectedHref} for ${mode} mode (mobile variant)`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode={mode}
            onBackToLobby={mockOnBackToLobby}
            variant="mobile"
          />
        );

        const linkElement = screen.getByRole('link');
        await user.click(linkElement);

        expect(mockRouterPush).toHaveBeenCalledWith(expectedHref);
      });
    });
  });
});

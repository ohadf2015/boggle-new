import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Track navigation
const mockRouterPush = vi.fn();

// Mock next/navigation (for useRouter)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock session utility
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
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

describe('NextStepPrompt Navigation', () => {
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockClear();
  });

  describe('Mobile variant click navigation', () => {
    it('should navigate when mobile button card is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // The mobile button is the whole card area
      const buttonElement = screen.getByText('Challenge the Bots!');
      await user.click(buttonElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');
    });

    it('should navigate when clicking on title text inside mobile button', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="solo-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      // Click specifically on the title text inside the button
      const titleElement = screen.getByText('Try Daily Challenge');
      await user.click(titleElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
    });

    it('should call onAction instead of navigating when provided', async () => {
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

      const titleElement = screen.getByText('Try Daily Challenge');
      await user.click(titleElement);

      // Should call onAction, not navigate
      expect(mockOnAction).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('Landscape variant click navigation', () => {
    it('should navigate when landscape button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="daily"
          onBackToLobby={mockOnBackToLobby}
          variant="landscape"
        />
      );

      const buttonElement = screen.getByText('Why Stop at One?');
      await user.click(buttonElement);

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

      // In desktop, the CTA is a button with "Let's Go!" text
      const buttonElement = screen.getByRole('button', { name: /let's go/i });
      await user.click(buttonElement);

      expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
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
      { mode: 'practice' as const, expectedHref: '/en/singleplayer?preset=bots', titleText: 'Challenge the Bots!' },
      { mode: 'solo-bots' as const, expectedHref: '/en/daily', titleText: 'Try Daily Challenge' },
      { mode: 'daily' as const, expectedHref: '/en/multiplayer', titleText: 'Why Stop at One?' },
      { mode: 'multiplayer-bots' as const, expectedHref: '/en/daily', titleText: 'Try Daily Challenge' },
    ];

    testCases.forEach(({ mode, expectedHref, titleText }) => {
      it(`should navigate to ${expectedHref} for ${mode} mode (mobile variant)`, async () => {
        const user = userEvent.setup();

        render(
          <NextStepPrompt
            currentMode={mode}
            onBackToLobby={mockOnBackToLobby}
            variant="mobile"
          />
        );

        const buttonElement = screen.getByText(titleText);
        await user.click(buttonElement);

        expect(mockRouterPush).toHaveBeenCalledWith(expectedHref);
      });
    });
  });
});

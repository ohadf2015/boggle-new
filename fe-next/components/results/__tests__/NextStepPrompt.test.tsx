import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock session utility
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => {
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
    return {
      t: (key: string) => translations[key] || key,
      language: 'en',
      dir: 'ltr',
    };
  },
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

describe('NextStepPrompt', () => {
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Practice Mode', () => {
    it('renders Challenge Bots CTA for practice mode', () => {
      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Challenge the Bots!')).toBeInTheDocument();
      expect(screen.getByText('Test your skills against AI opponents')).toBeInTheDocument();
    });
  });

  describe('Solo-Bots Mode', () => {
    it('renders Try Daily Challenge CTA for solo-bots mode', () => {
      render(
        <NextStepPrompt
          currentMode="solo-bots"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Try Daily Challenge')).toBeInTheDocument();
      expect(screen.getByText('Same puzzle for everyone worldwide - compete globally!')).toBeInTheDocument();
    });

    it('calls onAction callback when provided instead of navigating', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      render(
        <NextStepPrompt
          currentMode="solo-bots"
          onBackToLobby={mockOnBackToLobby}
          onAction={mockOnAction}
        />
      );

      // Click the "Let's Go!" button
      await user.click(screen.getByText("Let's Go!"));

      // Verify onAction callback was called
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Daily Mode', () => {
    it('renders Go Multiplayer CTA for daily mode', () => {
      render(
        <NextStepPrompt
          currentMode="daily"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Why Stop at One?')).toBeInTheDocument();
      expect(screen.getByText('Unlimited games, real opponents — no waiting until tomorrow')).toBeInTheDocument();
    });
  });

  describe('Multiplayer-Bots Mode', () => {
    it('renders Try Daily Challenge CTA for multiplayer-bots mode', () => {
      render(
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Try Daily Challenge')).toBeInTheDocument();
      expect(screen.getByText('Same puzzle for everyone worldwide - compete globally!')).toBeInTheDocument();
    });
  });

  describe('Back to Lobby Button', () => {
    it('renders back to lobby button in all modes', () => {
      const modes = ['practice', 'solo-bots', 'daily', 'multiplayer-bots'] as const;

      modes.forEach((mode) => {
        const { unmount } = render(
          <NextStepPrompt
            currentMode={mode}
            onBackToLobby={mockOnBackToLobby}
          />
        );

        expect(screen.getByText('Back to Lobby')).toBeInTheDocument();
        unmount();
      });
    });

    it('calls onBackToLobby when clicked', async () => {
      const user = userEvent.setup();

      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      await user.click(screen.getByText('Back to Lobby'));
      expect(mockOnBackToLobby).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('renders desktop variant by default', () => {
      const { container } = render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Desktop variant should have larger padding/sizing classes
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders mobile variant', () => {
      const { container } = render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders landscape variant', () => {
      const { container } = render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          variant="landscape"
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies neo-brutalist styling classes', () => {
      const { container } = render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Check for neo-brutalist classes
      const element = container.firstChild as HTMLElement;
      expect(element.className).toMatch(/border-.*neo|shadow-hard|rounded-neo/);
    });

    it('applies custom className', () => {
      const { container } = render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Translation Usage', () => {
    it('uses translation function for all text', () => {
      render(
        <NextStepPrompt
          currentMode="practice"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Verify the translated text appears in the document
      expect(screen.getByText('Challenge the Bots!')).toBeInTheDocument();
      expect(screen.getByText('Test your skills against AI opponents')).toBeInTheDocument();
      expect(screen.getByText('Back to Lobby')).toBeInTheDocument();
    });
  });
});

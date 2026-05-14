import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NextStepPrompt from '../NextStepPrompt';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
      'nextStep.challengeBotsDesc': 'Test your skills',
      'nextStep.backToLobby': 'Back to Lobby',
      'nextStep.letsGo': "Let's Go!",
      'closeLoss.soClose': 'So close!',
      'closeLoss.justPoints': 'Just {points} points away!',
      'closeLoss.rematchQuestion': 'Rematch?',
      'closeLoss.rematch': 'Rematch!',
      'closeLoss.challengeBot': 'Challenge a Bot',
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

describe('NextStepPrompt - Close Loss Mode', () => {
  const mockOnBackToLobby = vi.fn();
  const mockOnRematch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show rematch prompt when isCloseLoss is true', () => {
    render(
      <NextStepPrompt
        currentMode="practice"
        onBackToLobby={mockOnBackToLobby}
        isCloseLoss
        scoreDifference={5}
        onRematch={mockOnRematch}
      />
    );
    expect(screen.getByText('Just 5 points away!')).toBeInTheDocument();
  });

  it('should show rematch button when onRematch is provided', () => {
    render(
      <NextStepPrompt
        currentMode="practice"
        onBackToLobby={mockOnBackToLobby}
        isCloseLoss
        scoreDifference={5}
        onRematch={mockOnRematch}
      />
    );
    const rematchBtn = screen.getByText('Rematch!');
    expect(rematchBtn).toBeInTheDocument();
    fireEvent.click(rematchBtn);
    expect(mockOnRematch).toHaveBeenCalled();
  });

  it('should not show close loss UI when isCloseLoss is false', () => {
    render(
      <NextStepPrompt
        currentMode="practice"
        onBackToLobby={mockOnBackToLobby}
        isCloseLoss={false}
      />
    );
    expect(screen.queryByText(/points away/)).not.toBeInTheDocument();
  });

  it('should still show back to lobby button in close loss mode', () => {
    render(
      <NextStepPrompt
        currentMode="practice"
        onBackToLobby={mockOnBackToLobby}
        isCloseLoss
        scoreDifference={3}
        onRematch={mockOnRematch}
      />
    );
    expect(screen.getByText('Back to Lobby')).toBeInTheDocument();
  });
});

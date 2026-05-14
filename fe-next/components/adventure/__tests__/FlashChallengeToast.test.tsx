import { render, screen, fireEvent } from '@testing-library/react';
import { FlashChallengeToast } from '../FlashChallengeToast';
import type { FlashChallenge } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const challenge: FlashChallenge = {
  id: 'flash-long-word-6',
  type: 'longWord',
  descriptionKey: 'adventure.quests.flash.longWord',
  param: 6,
  durationSeconds: 30,
  rewardCoins: 50,
  rewardScore: 100,
};

describe('FlashChallengeToast', () => {
  it('renders null when no challenge', () => {
    const { container } = render(
      <FlashChallengeToast challenge={null} isComplete={false} onDismiss={vi.fn()} timeLeft={30} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows challenge description key and reward when active', () => {
    render(
      <FlashChallengeToast challenge={challenge} isComplete={false} onDismiss={vi.fn()} timeLeft={25} />
    );
    expect(screen.getByText('adventure.quests.flash.longWord')).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('shows completion state when isComplete', () => {
    render(
      <FlashChallengeToast challenge={challenge} isComplete={true} onDismiss={vi.fn()} timeLeft={10} />
    );
    expect(screen.getByTestId('challenge-complete-badge')).toBeInTheDocument();
  });

  it('calls onDismiss when X button clicked', () => {
    const onDismiss = vi.fn();
    render(
      <FlashChallengeToast challenge={challenge} isComplete={false} onDismiss={onDismiss} timeLeft={20} />
    );
    fireEvent.click(screen.getByTestId('challenge-dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

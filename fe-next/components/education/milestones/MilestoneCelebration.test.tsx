/**
 * MilestoneCelebration Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MilestoneCelebration } from './MilestoneCelebration';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireLevelUpConfetti: vi.fn(),
}));

const mockOnClose = vi.fn();

describe('MilestoneCelebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when milestone is null', () => {
    const { container } = render(
      <MilestoneCelebration milestone={null} onClose={mockOnClose} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render overlay when milestone provided', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show major milestone trophy mascot', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    const { container } = render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    // Major milestone shows trophy mascot GIF (aria-hidden, so use querySelector)
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('trophy'));
  });

  it('should show minor milestone celebration mascot', () => {
    const milestone = {
      level: 3,
      isMajor: false,
      rewards: { xpBonus: 50, coinBonus: 10, title: null },
    };

    const { container } = render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    // Minor milestone shows celebration mascot animated WebP via <img>
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('celebration'));
  });

  it('should display milestone level', () => {
    const milestone = {
      level: 10,
      isMajor: true,
      rewards: { xpBonus: 250, coinBonus: 50, title: 'LETTER_SCOUT' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should show XP bonus reward', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText('education.milestones.xpBonus')).toBeInTheDocument();
  });

  it('should show coin bonus reward', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.getByText(/25/)).toBeInTheDocument();
    expect(screen.getByText('education.milestones.coinBonus')).toBeInTheDocument();
  });

  it('should show title unlock when title provided', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.getByText('education.milestones.titleUnlocked')).toBeInTheDocument();
    expect(screen.getByText('WORD_SEEKER')).toBeInTheDocument();
  });

  it('should not show title section when title is null', () => {
    const milestone = {
      level: 3,
      isMajor: false,
      rewards: { xpBonus: 50, coinBonus: 10, title: null },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(screen.queryByText('education.milestones.titleUnlocked')).not.toBeInTheDocument();
  });

  it('should call onClose when continue button clicked', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    const continueButton = screen.getByText('education.milestones.continue');
    fireEvent.click(continueButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key pressed', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking overlay background', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should fire confetti when milestone shown', () => {


    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    expect(fireLevelUpConfetti).toHaveBeenCalledTimes(1);
  });

  it('should have accessible modal attributes', () => {
    const milestone = {
      level: 5,
      isMajor: true,
      rewards: { xpBonus: 100, coinBonus: 25, title: 'WORD_SEEKER' },
    };

    render(<MilestoneCelebration milestone={milestone} onClose={mockOnClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});

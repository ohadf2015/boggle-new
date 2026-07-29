/**
 * BossMechanicTutorial Tests
 *
 * Tests the tooltip/modal shown when a player first encounters a boss mechanic.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BossMechanicTutorial } from '../BossMechanicTutorial';

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const defaultProps = {
  twistType: 'popQuiz' as const,
  isVisible: true,
  onDismiss: vi.fn(),
};

describe('BossMechanicTutorial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders tutorial content when visible', () => {
      render(<BossMechanicTutorial {...defaultProps} />);
      expect(screen.getByTestId('boss-mechanic-tutorial')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<BossMechanicTutorial {...defaultProps} isVisible={false} />);
      expect(screen.queryByTestId('boss-mechanic-tutorial')).not.toBeInTheDocument();
    });

    it('shows the mechanic name translation key', () => {
      render(<BossMechanicTutorial {...defaultProps} />);
      expect(
        screen.getByText('adventure.bosses.twist.popQuiz.name')
      ).toBeInTheDocument();
    });

    it('shows the mechanic description translation key', () => {
      render(<BossMechanicTutorial {...defaultProps} />);
      expect(
        screen.getByText('adventure.bosses.twist.popQuiz.desc')
      ).toBeInTheDocument();
    });

    it('shows the mechanic tip translation key', () => {
      render(<BossMechanicTutorial {...defaultProps} />);
      expect(
        screen.getByText(/adventure\.bosses\.twist\.popQuiz\.tip/)
      ).toBeInTheDocument();
    });

    it('shows a dismiss button', () => {
      render(<BossMechanicTutorial {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /adventure\.bosses\.tutorialGotIt/i })
      ).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<BossMechanicTutorial {...defaultProps} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: /adventure\.bosses\.tutorialGotIt/i }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('different twist types', () => {
    const twistTypes = [
      'popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle',
      'assemblyLine', 'scrambledReality', 'mirrorMatch',
      'stellarForge', 'babelSummit', 'finalWord',
    ] as const;

    twistTypes.forEach((twistType) => {
      it(`renders correctly for twist type: ${twistType}`, () => {
        render(
          <BossMechanicTutorial {...defaultProps} twistType={twistType} />
        );
        expect(screen.getByTestId('boss-mechanic-tutorial')).toBeInTheDocument();
        expect(
          screen.getByText(`adventure.bosses.twist.${twistType}.name`)
        ).toBeInTheDocument();
      });
    });
  });
});

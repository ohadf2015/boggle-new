import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuickReactions, FloatingReaction, REACTIONS } from '../QuickReactions';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return React.createElement('div', { ref, 'data-testid': props['data-testid'], ...props }, children);
  });
  MotionDiv.displayName = 'MotionDiv';
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock AdaptiveMotion
jest.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return React.createElement('div', { ref, ...props }, children);
  });
  MotionDiv.displayName = 'AdaptiveMotionDiv';
  const MotionButton = React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
    return React.createElement('button', { ref, ...props }, children);
  });
  MotionButton.displayName = 'AdaptiveMotionButton';
  return {
    AdaptiveMotion: { div: MotionDiv, button: MotionButton },
    AdaptiveAnimatePresence: ({ children }: any) => children,
  };
});

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reactions.fire': 'Fire',
        'reactions.clap': 'Clap',
        'reactions.wow': 'Wow',
        'reactions.dead': 'Dead',
        'reactions.crown': 'Crown',
        'reactions.zap': 'Zap',
        'reactions.label': 'Quick reactions',
      };
      return translations[key] || key;
    },
  }),
}));

describe('QuickReactions', () => {
  const mockOnReaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render 6 emoji reaction buttons', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it('should call onReaction with reaction id when button is clicked', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // fire
    expect(mockOnReaction).toHaveBeenCalledWith('fire');
  });

  it('should throttle reactions to 1 per 2 seconds', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]); // fire
    fireEvent.click(buttons[1]); // clap (should be throttled)
    expect(mockOnReaction).toHaveBeenCalledTimes(1);

    // Advance past throttle window
    act(() => { jest.advanceTimersByTime(2100); });

    fireEvent.click(buttons[1]); // clap (should work now)
    expect(mockOnReaction).toHaveBeenCalledTimes(2);
  });

  it('should have accessibility labels on buttons', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    expect(screen.getByLabelText('Fire')).toBeInTheDocument();
    expect(screen.getByLabelText('Clap')).toBeInTheDocument();
  });

  it('should render with aria label on container', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    expect(screen.getByLabelText('Quick reactions')).toBeInTheDocument();
  });
});

describe('FloatingReaction', () => {
  it('should render emoji text', () => {
    render(
      <FloatingReaction
        id="r1"
        emoji="🔥"
        username="player1"
        x={50}
        y={50}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('should display username', () => {
    render(
      <FloatingReaction
        id="r1"
        emoji="🔥"
        username="player1"
        x={50}
        y={50}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('player1')).toBeInTheDocument();
  });

  it('should call onComplete after animation duration', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    render(
      <FloatingReaction
        id="r1"
        emoji="🔥"
        username="player1"
        x={50}
        y={50}
        onComplete={onComplete}
      />
    );
    act(() => { jest.advanceTimersByTime(1600); });
    expect(onComplete).toHaveBeenCalledWith('r1');
    jest.useRealTimers();
  });
});

describe('REACTIONS constant', () => {
  it('should have 6 reactions', () => {
    expect(REACTIONS).toHaveLength(6);
  });

  it('should have expected reaction ids', () => {
    const ids = REACTIONS.map(r => r.id);
    expect(ids).toEqual(['fire', 'clap', 'wow', 'dead', 'crown', 'zap']);
  });
});

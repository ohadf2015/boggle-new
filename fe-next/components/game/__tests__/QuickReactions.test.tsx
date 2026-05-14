import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuickReactions, FloatingReaction, REACTIONS } from '../QuickReactions';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return React.createElement('div', { ref, 'data-testid': props['data-testid'], ...props }, children);
  });
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => {
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
vi.mock('@/contexts/LanguageContext', () => ({
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
  const mockOnReaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render a smile trigger button in collapsed state', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const trigger = screen.getByLabelText('Quick reactions');
    expect(trigger).toBeInTheDocument();
    // Should NOT show reaction buttons yet
    expect(screen.queryByLabelText('Fire')).not.toBeInTheDocument();
  });

  it('should expand to show 6 emoji buttons when trigger is clicked', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const trigger = screen.getByRole('button', { name: 'Quick reactions' });
    fireEvent.click(trigger);

    const reactionButtons = REACTIONS.map(r =>
      screen.getByLabelText(r.labelKey.replace('reactions.', '').charAt(0).toUpperCase() + r.labelKey.replace('reactions.', '').slice(1))
    );
    expect(reactionButtons).toHaveLength(6);
  });

  it('should call onReaction and close tray when a reaction is clicked', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    // Open
    fireEvent.click(screen.getByRole('button', { name: 'Quick reactions' }));
    // Click fire
    fireEvent.click(screen.getByLabelText('Fire'));
    expect(mockOnReaction).toHaveBeenCalledWith('fire');
    // Tray should close — reaction buttons gone
    expect(screen.queryByLabelText('Fire')).not.toBeInTheDocument();
  });

  it('should throttle reactions to 1 per 2 seconds', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);

    // Open and click fire
    fireEvent.click(screen.getByRole('button', { name: 'Quick reactions' }));
    fireEvent.click(screen.getByLabelText('Fire'));
    expect(mockOnReaction).toHaveBeenCalledTimes(1);

    // Re-open and try clap immediately (should be throttled)
    fireEvent.click(screen.getByRole('button', { name: 'Quick reactions' }));
    fireEvent.click(screen.getByLabelText('Clap'));
    expect(mockOnReaction).toHaveBeenCalledTimes(1);

    // Advance past throttle window
    act(() => { vi.advanceTimersByTime(2100); });

    // Re-open and click clap (should work now)
    fireEvent.click(screen.getByRole('button', { name: 'Quick reactions' }));
    fireEvent.click(screen.getByLabelText('Clap'));
    expect(mockOnReaction).toHaveBeenCalledTimes(2);
  });

  it('should have aria-expanded on trigger button', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const trigger = screen.getByRole('button', { name: 'Quick reactions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close tray on outside click', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    // Open
    fireEvent.click(screen.getByRole('button', { name: 'Quick reactions' }));
    expect(screen.getByLabelText('Fire')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByLabelText('Fire')).not.toBeInTheDocument();
  });

  it('should toggle closed when trigger is clicked again', () => {
    render(<QuickReactions onReaction={mockOnReaction} />);
    const trigger = screen.getByRole('button', { name: 'Quick reactions' });

    fireEvent.click(trigger); // open
    expect(screen.getByLabelText('Fire')).toBeInTheDocument();

    fireEvent.click(trigger); // close
    expect(screen.queryByLabelText('Fire')).not.toBeInTheDocument();
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
        onComplete={vi.fn()}
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
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText('player1')).toBeInTheDocument();
  });

  it('should call onComplete after animation duration', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
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
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onComplete).toHaveBeenCalledWith('r1');
    vi.useRealTimers();
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

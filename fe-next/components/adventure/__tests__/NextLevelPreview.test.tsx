/**
 * NextLevelPreview Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextLevelPreview } from '../NextLevelPreview';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid={props['data-testid']} {...filterMotionProps(props)}>
      {children}
    </div>
  ));
  const MockButton = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} data-testid={props['data-testid']} onClick={props.onClick} {...filterMotionProps(props)}>
      {children}
    </button>
  ));
  const components = { div: MockDiv, button: MockButton };
  return {
    motion: components,
    m: components,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

function filterMotionProps(props: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap'].includes(k)) {
      filtered[k] = v;
    }
  }
  return filtered;
}

describe('NextLevelPreview', () => {
  const defaultProps = {
    worldId: 1,
    nextLevel: 3,
    gridSize: 5,
    objectives: ['adventure.objectives.score', 'adventure.objectives.words'],
    isVisible: true,
    onPlay: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders when visible', () => {
    render(<NextLevelPreview {...defaultProps} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(<NextLevelPreview {...defaultProps} isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows grid size badge', () => {
    render(<NextLevelPreview {...defaultProps} />);
    expect(screen.getByText('5×5')).toBeInTheDocument();
  });

  it('shows objectives', () => {
    render(<NextLevelPreview {...defaultProps} />);
    expect(screen.getByText('adventure.objectives.score')).toBeInTheDocument();
    expect(screen.getByText('adventure.objectives.words')).toBeInTheDocument();
  });

  it('calls onPlay when Play button clicked', () => {
    jest.useFakeTimers();
    render(<NextLevelPreview {...defaultProps} />);
    act(() => { jest.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByText('adventure.play'));
    expect(defaultProps.onPlay).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('calls onDismiss when Later clicked', () => {
    render(<NextLevelPreview {...defaultProps} />);
    fireEvent.click(screen.getByText('adventure.later'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});
